import express, { Express, Request, Response, NextFunction } from 'express';
import { AppParams, MainContext, RejectNotLoggedIn, CheckAdmin, Node, Event, CheckJSONProperties } from "../global";
import { NodeTable } from './compute_node';
import logger from '../logger';
import { PrismaClient } from '@prisma/client';


export default async (context: MainContext) => {
    const app = context.app as Express;
    const ORM = context.model as PrismaClient;
    const CommonLimiter = context.limiters.CommonLimiter;
    const ApiLimiter = context.limiters.ApiLimiter;
    const SensitiveLimiter = context.limiters.SensitiveLimiter;

    const RestrictedNameChars = /^[a-zA-Z0-9_-]+$/;
    function containsInvalidChars(input: string) {
        return !RestrictedNameChars.test(input);
    }
    function BoundedPorts(port_maps: Array<any>) {
        const table = new Map<string, any>();
        for (const p of port_maps) {
            const node_id = p.node_id;
            const port = p.port;
            const protocol = p.protocol;
            if (table.has(node_id) == false) {
                const obj = {
                    ipv4: {
                        tcp: new Set<number>(),
                        udp: new Set<number>(),
                    },
                    ipv6: {
                        tcp: new Set<number>(),
                        udp: new Set<number>(),
                    },
                };
                table.set(node_id, obj);
            }
            const mp = table.get(node_id);
            if (p.is_ipv4) {
                mp.ipv4[protocol].add(port);
                // logger.warn(mp, p,mp.ipv4[protocol].has(port));
            }
            if (p.is_ipv6) {
                mp.ipv6[protocol].add(port);
                // logger.warn(mp, p,mp.ipv4[protocol].has(port));
            }

        }
        return table;
    }
    function AcceptablePortMaps(n: any) {
        const ret = {
            ipv4: {
                tcp: [] as Array<Array<number>>,
                udp: [] as Array<Array<number>>
            },
            ipv6: {
                tcp: [] as Array<Array<number>>,
                udp: [] as Array<Array<number>>
            },
        };
        if (n.use_ipv4) {
            const ip_ports = JSON.parse(n.ipv4_ports);
            const available_ranges = []; for (const k in ip_ports) available_ranges.push(ip_ports[k]);
            available_ranges.filter((u: any) => u.protocol == "tcp").forEach((u: any) => ret.ipv4.tcp.push(u.range));
            available_ranges.filter((u: any) => u.protocol == "udp").forEach((u: any) => ret.ipv4.udp.push(u.range));
        }
        if (n.use_ipv6) {
            const ip_ports = JSON.parse(n.ipv6_ports);
            const available_ranges = []; for (const k in ip_ports) available_ranges.push(ip_ports[k]);
            available_ranges.filter((u: any) => u.protocol == "tcp").forEach((u: any) => ret.ipv6.tcp.push(u.range));
            available_ranges.filter((u: any) => u.protocol == "udp").forEach((u: any) => ret.ipv6.udp.push(u.range));
        }
        return ret;
    }

    function IsAvailablePort(port: number, n: any, port_map_list: Array<any>, ipvx: string = "ipv4", protocol: string = "tcp") {
        const node_id = n.id;
        const acceptable_port_map = AcceptablePortMaps(n) as any;
        const bounded_port_map = BoundedPorts(port_map_list) as any;
        const acceptable_ports = acceptable_port_map[ipvx]?.[protocol];
        const bounded_ports_set = bounded_port_map.get(node_id)?.[ipvx]?.[protocol];
        if (bounded_ports_set && bounded_ports_set.has(port)) return false;
        if (acceptable_ports.length == 0) return false;
        for (const range of acceptable_ports) {
            if (port >= range[0] && port <= range[1]) return true;
        }
        return false;
    }


    app.post('/v1/instance/create', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_,
            instance_name,
            node_id,
            image_id,
            accelerator,
            cpu,
            memory,
            storage,
            network_mode,
            params
        } = CheckJSONProperties([
            "instance_name",
            "node_id",
            "image_id",
            "accelerator",
            { key: "cpu", nullable: true },
            { key: "memory", nullable: true },
            { key: "storage", nullable: true },
            { key: "network_mode", nullable: true },

            "params"
        ], req); if (_error_) return res.json({ error: _error_ });

        const session = req.session as any;
        const user_id = session.user.user_id;

        if (containsInvalidChars(instance_name)) return res.json({ error: "Invalid instance name. [YX6UazOrzp]" });
        if (instance_name.length <= 2) return res.json({ error: "Instance name is too short. [uCFggvuXSZ]" });
        if (instance_name.length > 32) return res.json({ error: "Instance name is too long. [1lYQNzrN8B]" });
        let instance;
        let should_delete = false;
        const reserved_ports = [];
        const reserved_port_map_records = [];
        try {

            // Check managed node or not.
            const own_node = await ORM.compute_node.findFirst({ where: { id: node_id, user_id: user_id } });
            const managed_node = await ORM.managed_compute_node.findFirst({ where: { node_id: node_id, user_id: user_id } });

            if (!(own_node || managed_node)) return res.json({ error: "Node does not exist. [Zr7ICLKRx4]" });
            const node = await ORM.compute_node.findFirst({ where: { id: node_id } });
            if (!node) return res.json({ error: "Node does not exist. [CLKRZr7Ix4]" });

            // Check ssh params.
            logger.log("SSH:", params.ssh);
            const ssh_enabled = params.ssh?.enabled ?? true;
            let ssh_key = null;
            if (!ssh_enabled) {
                params.ssh = null;
            } else {
                const ssh_port = params.ssh?.port;
                const ssh_key_id = params.ssh?.id;
                const ssh_install = params.ssh?.install;
                if (!ssh_port) return res.json({ error: "SSH port is not specified. [nWypA6iC7j]" });
                if (!ssh_key_id) return res.json({ error: "SSH key is not specified. [sGSOCEe8xr]" });
                if (!ssh_install) return res.json({ error: "SSH install flag is not specified. [vryWW3ddfJ]" });
                {
                    const ports = await ORM.port_map.findMany({ where: { node_id: node_id } });
                    if (!IsAvailablePort(ssh_port, node, ports, "ipv4", "tcp")) return res.json({ error: "SSH port is not available. [OovB3LxbZ8]" });
                    reserved_ports.push(ssh_port);
                }
                ssh_key = await ORM.ssh_key.findFirst({ where: { id: ssh_key_id, user_id: user_id } });
            }

            logger.log("Check image");
            const managed_image = await ORM.managed_image.findFirst({ where: { image_id: image_id, user_id: user_id } });
            const image = managed_image ?
                await ORM.image.findFirst({ where: { id: image_id } }) :
                (own_node ? await ORM.image.findFirst({ where: { id: image_id, node_id: node_id } }) : await ORM.image.findFirst({ where: { id: image_id, node_id: node_id, published: true } }));
            if (!image) return res.json({ error: "Image does not exist. [uxcyccq7dy]" });
            if (image.node_id != node_id) return res.json({ error: "Mismatched node id. [18u7MR3vUv]" });
            if (image.key == null) return res.json({ error: "No image key. [MR3u7vUv18]" });
            const client = NodeTable.get(node_id);
            if (!client) return res.json({ error: "Node is not connected. [vq1rLyhSr2]" });

            instance = await ORM.instance.create({
                data: {
                    image_id: image_id,
                    base_image: image.name,
                    status: "INITIALIZING",
                    network_mode: network_mode,
                    name: instance_name,
                    node_id: node_id,
                }
            });

            for (const port of reserved_ports) {
                const port_map = await ORM.port_map.create({
                    data: {
                        node_id: node_id,
                        port: port,
                        protocol: "tcp",
                        is_ipv4: true,
                        is_ipv6: false,
                        instance_id: instance.id,
                    }
                });
                reserved_port_map_records.push(port_map);
            }



            const event = await client.send_and_wait({
                method: "create_instance", params: {
                    name: instance_name,
                    image_key: image.key,
                    accelerator: accelerator, // driver name, cuda/rocm/cpu
                    cpu: cpu, // core(float)
                    memory: memory, // MB
                    storage: storage, // GB
                    network_mode: network_mode,
                    ssh: {
                        key: ssh_key?.key,
                        port: params.ssh?.port,
                        install: params.ssh?.install,
                        // os_hint: "ubuntu",
                        sudo: false,
                        mount_host_dir: false,
                    },
                    params: {
                        command: "/bin/bash",
                        args: [],
                    }
                }
            });

            const res_data = event.response_data;
            const error = res_data.error;
            const result = res_data.result;
            const request_data = res_data.data;
            if (error) {
                logger.error(error);
                res.json({ error: `Could not create a new instance [4sjGScvysR]` });
            } else {
                if (result) {
                    const update_data = {
                        key: result.key,
                        ipv4: result.global_ipv4,
                        ipv6: result.global_ipv6,
                        local_ipv4: result.local_ipv4,
                        local_ipv6: result.local_ipv6,
                        cpu: cpu,
                        memory: memory ? memory : -1,
                        storage: storage ? storage : -1,
                        image_id: image_id,
                        base_image: image.name,
                        status: "RUNNING",
                        name: result.name,
                        node_id: node_id,
                        ssh_key_name: ssh_key?.name,
                        ssh_key: ssh_key?.key,
                    };
                    logger.log(result.ipv4);
                    logger.log(update_data);
                    instance = await ORM.instance.update({
                        where: { id: instance.id },
                        data: update_data
                    });

                    const managed_instance = await ORM.managed_instance.create({
                        data: {
                            user_id: user_id,
                            node_id: node_id,
                            instance_id: instance.id,
                        }
                    });
                    logger.log(managed_instance);
                    res.json({ error: null, data: result, request_data: request_data });
                } else {
                    should_delete = true;
                    res.json({ error: `Internal Server Error [5b02TUPyAL]` });
                }
            }
        } catch (e) {
            logger.error(e);
            res.json({ error: `Internal Server Error [cvGSys4Rsj]` });
            should_delete = true;
        }

        if (should_delete) {
            if (instance) {
                try {
                    logger.warn(await ORM.instance.delete({ where: { id: instance.id } }));
                } catch (e) { logger.error(e); }
                try {
                    logger.warn(await ORM.managed_instance.deleteMany({ where: { instance_id: instance.id } }));
                } catch (e) { logger.error(e); }
            }
            for (const port_map of reserved_port_map_records) {
                try {
                    await ORM.port_map.delete({ where: { id: port_map.id } });
                } catch (e) { logger.error(e); }
            }

        }

    });

    app.post('/v1/instance/status', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, id } = CheckJSONProperties(["id"], req); if (_error_) return res.json({ error: _error_ });
        res.json({ error: "Not implemented yet." });
    });


    app.post('/v1/instance/start', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, instance_id, force } = CheckJSONProperties(["instance_id", { key: "force", nullable: true }], req); if (_error_) return res.json({ error: _error_ });
        const is_administrator = req.session?.user?.is_administrator; // Force
        const user_id = req.session?.user?.user_id;

        try {
            const instance = await ORM.instance.findUnique({ where: { id: instance_id } });
            if (instance?.key == null) return res.json({ error: `Instance is not ready. [fIgk2ShDjh]` });
            const self_node_instance = instance ? await ORM.compute_node.findFirst({ where: { id: instance.node_id, user_id: user_id } }) : null;
            const managed_instance = await ORM.managed_instance.findFirst({ where: { instance_id: instance_id, user_id: user_id } });

            if (!(instance && (managed_instance || (self_node_instance && force) || is_administrator))) {
                return res.json({ error: `Does not exist or permission denied [hskoPlD1XT]` });
            }
            const node_id = instance.node_id;
            const client = NodeTable.get(node_id);
            if (client == null) return res.json({ error: `Not connected [6O9eCbDWf8]` });

            const enabled_ssh = instance.ssh_key != null;

            client.send({ method: "start_instance", params: { key: instance.key, enabled_ssh: enabled_ssh } }, async (event: Event) => {
                try {
                    const res_data = event.response_data;
                    const result = res_data.result;
                    const request_data = res_data.data;
                    logger.log(res_data);
                    if (res_data?.error) {
                        logger.error(res_data.error);
                        return res.json({ error: `Internal Server Error [jjNGHVDw2D]` });
                    }
                    logger.log(res_data);
                    logger.warn("Started:", instance);
                    logger.log(await ORM.instance.update({ where: { id: instance.id }, data: { status: "RUNNING" } }));
                    res.json({ error: null, data: {}, request_data: request_data });
                } catch (e) {
                    logger.error(e);
                    res.json({ error: `Internal Server Error [391PQ5Z8rx]` });
                }
            });
        } catch (e) {
            logger.error(e);
            res.json({ error: `Internal Server Error [Ifdo93l0iW]` });
        }
    });

    app.post('/v1/instance/stop', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, instance_id, force } = CheckJSONProperties(["instance_id", { key: "force", nullable: true }], req); if (_error_) return res.json({ error: _error_ });
        const is_administrator = req.session?.user?.is_administrator; // Force
        const user_id = req.session?.user?.user_id;

        try {
            const instance = await ORM.instance.findUnique({ where: { id: instance_id } });
            if (instance?.key == null) return res.json({ error: `Instance is not ready. [zq5d9pBYNM]` });
            const self_node_instance = instance ? await ORM.compute_node.findFirst({ where: { id: instance.node_id, user_id: user_id } }) : null;
            const managed_instance = await ORM.managed_instance.findFirst({ where: { instance_id: instance_id, user_id: user_id } });

            if (!(instance && (managed_instance || (self_node_instance && force) || is_administrator))) {
                return res.json({ error: `Does not exist or permission denied [gmvIoPW4YT]` });
            }
            const node_id = instance.node_id;
            const client = NodeTable.get(node_id);
            if (client == null) return res.json({ error: `Not connected [0shUA4n2Ha]` });

            client.send({ method: "stop_instance", params: { key: instance.key } }, async (event: Event) => {
                try {
                    const res_data = event.response_data;
                    const result = res_data.result;
                    const request_data = res_data.data;
                    logger.log(res_data);
                    if (res_data?.error) {
                        logger.error(res_data.error);
                        return res.json({ error: `Internal Server Error [1gbLNGpmHW]` });
                    }
                    logger.log(res_data);
                    logger.warn("Stopped:", instance);
                    logger.log(await ORM.instance.update({ where: { id: instance.id }, data: { status: "STOPPED" } }));
                    res.json({ error: null, data: {}, request_data: request_data });
                } catch (e) {
                    logger.error(e);
                    res.json({ error: `Internal Server Error [HSrv6uYzuJ]` });
                }
            });
        } catch (e) {
            logger.error(e);
            res.json({ error: `Internal Server Error [RVlRKsUlYE]` });
        }
    });

    app.post('/v1/instance/delete', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, instance_id, force } = CheckJSONProperties(["instance_id", { key: "force", nullable: true }], req); if (_error_) return res.json({ error: _error_ });
        const is_administrator = req.session?.user?.is_administrator; // Force
        const user_id = req.session?.user?.user_id;

        try {
            const instance = await ORM.instance.findUnique({ where: { id: instance_id } });
            const self_node_instance = instance ? await ORM.compute_node.findFirst({ where: { id: instance.node_id, user_id: user_id } }) : null;
            const managed_instance = await ORM.managed_instance.findFirst({ where: { instance_id: instance_id, user_id: user_id } });
            if (!(instance && (managed_instance || (self_node_instance && force) || is_administrator))) {
                return res.json({ error: `Does not exist or permission denied [1Dvo3fPWBg]` });
            }

            logger.log(await ORM.port_map.deleteMany({ where: { instance_id: instance.id } }));
            const node_id = instance.node_id;
            const client = NodeTable.get(node_id);
            if (client == null) {
                if (force) {
                    logger.log(await ORM.managed_instance.deleteMany({ where: { instance_id: instance.id } }))
                    logger.log(await ORM.instance.delete({ where: { id: instance.id } }));
                    return res.json({ error: null, data: {} });
                } else {
                    return res.json({ error: `Not connected [ByyFAMcyWS]` });
                }
            }

            await ORM.instance.update({ where: { id: instance.id }, data: { status: "DELETING" } });
            logger.log(await ORM.managed_instance.deleteMany({ where: { instance_id: instance.id } }));
            client.send({ method: "delete_instance", params: { key: instance.key } }, async (event: Event) => {
                try {
                    const res_data = event.response_data;
                    const result = res_data.result;
                    const request_data = res_data.data;
                    logger.log(res_data);
                    logger.warn("Delete:", instance);
                    // TODO: How to delete records when node is already disappeared.
                    logger.log(await ORM.instance.delete({ where: { id: instance.id } }));

                    if (res_data?.error) {
                        logger.error(res_data?.error);
                        // const statusCode = res_data?.error?.statusCode;
                        // if (statusCode == 404) {
                        //     res.json({ error: `Internal Server Error [SLYOTe3hve]` });
                        // } else {
                        //     res.json({ error: `Internal Server Error [SLYOTe3hve]` });
                        // }
                    }
                    res.json({ error: null, data: null, request_data: request_data });
                } catch (e) {
                    logger.error(e);
                    res.json({ error: `Internal Server Error [WfDfBjYxhI]` });
                }
            });
        } catch (e) {
            logger.error(e);
            res.json({ error: `Internal Server Error [uByMqIaaFJ]` });
        }
    });

    app.get('/v1/instance/list', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_ } = CheckJSONProperties([], req); if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        const is_administrator = session.user.is_administrator; //// Force fetch
        try {
            // Managed Instances
            const instance_table: Map<string, any> = new Map();

            // Find nodes by owner.
            {
                const n_table: Map<string, any> = new Map();
                {
                    const nodes = await ORM.compute_node.findMany(is_administrator ? undefined : { where: { user_id: user_id } });
                    if (nodes.length > 0) for (const node of nodes) n_table.set(node.id, node);
                    const m_nodes = await ORM.managed_compute_node.findMany(is_administrator ? undefined : { where: { user_id: user_id } });
                    if (m_nodes.length > 0) for (const node of m_nodes) n_table.set(node.node_id, node);
                }
                {
                    const instance_list = await ORM.instance.findMany({ where: { node_id: { in: Array.from(n_table.keys()) } } });
                    const cloned = JSON.parse(JSON.stringify(instance_list));
                    for (const instance of cloned) {
                        instance.node_name = n_table.get(instance.node_id).name;
                        instance_table.set(instance.id, instance);
                    }
                }
            }
            // Find managed instances.
            {
                const managed_instance_list = await ORM.managed_instance.findMany({ where: { user_id: user_id } });
                const i_ids = managed_instance_list.filter((n: any) => n.instance_id).map((n: any) => n.instance_id);
                const instance_list = await ORM.instance.findMany({ where: { id: { in: i_ids } } });
                const cloned = JSON.parse(JSON.stringify(instance_list));

                // Merge
                for (const instance of cloned) {
                    instance.managed = true;
                    const prev = instance_table.get(instance.id);
                    instance_table.set(instance.id, Object.assign(prev ?? {}, instance));
                }
            }

            const records = JSON.parse(JSON.stringify(Array.from(instance_table, ([id, obj]) => obj)));
            { // Find images and specify image name.
                const image_ids = records.map((n: any) => n.image_id);
                const images = await ORM.image.findMany({ where: { id: { in: image_ids } } });
                const image_table = new Map<string, any>();
                for (const image of images) image_table.set(image.id, image);
                for (const record of records) {
                    record.base_image = image_table.get(record.image_id)?.name;
                }
            }

            res.json({ error: null, data: records });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [tySopUSF6p]" });
        }
    });
}