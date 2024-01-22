import express, { Express, Request, Response, NextFunction } from 'express';
import { AppParams, MainContext, RejectNotLoggedIn, CheckAdmin, Node, Event, CheckJSONProperties, RejectNotLoggedInForWS, GenerateUUID, WSChannel } from "../global";
import { randomUUID } from 'crypto';
import logger from '../logger';
import { PrismaClient } from '@prisma/client';
export const NodeTable: Map<string, Node | undefined | null> = new Map();

import WebSocket from "ws";


export default async (context: MainContext) => {
    const app = context.app as Express;
    const ORM = context.model as PrismaClient;
    const CommonLimiter = context.limiters.CommonLimiter;
    const ApiLimiter = context.limiters.ApiLimiter;
    const SensitiveLimiter = context.limiters.SensitiveLimiter;

    setInterval(async () => {
        try {
            const nodes = await ORM.compute_node.findMany();
            for (const node of nodes) {
                const diff = new Date().getTime() - node.updated_at.getTime();
                if (diff > 60 * 10000 && node.status == "ACTIVATED") {
                    logger.warn("Node timeout:", node.id, node.name, node.ipv4, node.ipv6, node.updated_at, "The status will be changed as DEAD.");
                    await ORM.compute_node.update({ where: { id: node.id }, data: { status: "DEAD" } });
                    await ORM.instance.updateMany({ where: { node_id: node.id }, data: { status: "DEAD" } });
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }, 15 * 1000);

    app.post('/v1/compute_node/create', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const session = req.session as any;
        const user_id = session.user.user_id as string;
        const node_limit = session.user.node_limit;
        try {
            const nodes = await ORM.compute_node.findMany({ where: { user_id: user_id } });
            if (nodes.length >= node_limit) return res.json({ error: "Up to three nodes can be registered. Limit: " + node_limit + " [SJGIqF15P1]" });
            const node = await ORM.compute_node.create({
                data: {
                    user_id: user_id
                }
            });
            logger.log(node)
            res.json({ error: null, data: node });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [WblH1MX8Dj]" });
        }
    });

    // Relate to token
    app.post('/v1/compute_node/associate', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const {
            _error_,
            node_id, name, use_ipv4, use_ipv6, ipv4, ipv6, platform, arch, cpu, cpu_info, memory, total_storage, free_storage,
            gpu, gpu_info, gpu_driver, nvidia_docker, manipulator_driver,
            images, instances,
            ipv4_ports, ipv6_ports,
            tcp_bounded_ipv4, tcp_bounded_ipv6, udp_bounded_ipv4, udp_bounded_ipv6, memory_usages,
        } = CheckJSONProperties([
            'node_id',
            'name',
            'use_ipv4',
            'use_ipv6',
            { key: 'ipv4', nullable: true },
            { key: 'ipv6', nullable: true },
            'platform',
            'arch',
            'cpu',
            'cpu_info',
            'memory',
            'total_storage',
            'free_storage',
            'gpu',
            'gpu_info',
            'gpu_driver',
            'nvidia_docker',
            'manipulator_driver',
            'images',
            'instances',

            { key: 'ipv4_ports', nullable: true },
            { key: 'ipv6_ports', nullable: true },
            { key: 'tcp_bounded_ipv4', nullable: true },
            { key: 'tcp_bounded_ipv6', nullable: true },
            { key: 'udp_bounded_ipv4', nullable: true },
            { key: 'udp_bounded_ipv6', nullable: true },
            { key: 'memory_usages', nullable: true },
        ], req); if (_error_) return res.json({ error: _error_ });


        const session = req.session as any;
        const user_id = session.user.user_id as string;

        const native_instances = instances;
        const native_images = images;

        try {

            { // Check node_id
                const node = await ORM.compute_node.findFirst({ where: { id: node_id, user_id: user_id } });
                const n_node = await ORM.compute_node.findFirst({ where: { id: node_id } });
                if (!node) {
                    logger.error("Invalid node_id. ", "\n", n_node?.id, "\n", node_id, "\n", n_node?.user_id, "\n", user_id);
                    return res.json({ error: "Invalid node_id. [horosYBL4p]" });
                }
            }

            logger.log("Update node");
            const query = { id: node_id };
            const update01 = {
                name, use_ipv4, use_ipv6, ipv4, ipv6, platform, arch, cpu, cpu_info, memory: memory,
                total_storage: total_storage, free_storage: free_storage,
                gpu, gpu_info, gpu_driver, nvidia_docker, manipulator_driver,
                user_id: user_id, available_as_gpu_node: nvidia_docker && gpu,
                status: "ACTIVATED",
                ipv4_ports: JSON.stringify(ipv4_ports), ipv6_ports: JSON.stringify(ipv6_ports),
                updated_at: new Date(),
            };
            logger.log(update01);
            const updated_node = await ORM.compute_node.update({ where: query, data: update01 });

            logger.log("Upsert native images");
            // Native images to database
            const managed_images = await ORM.managed_image.findMany({ where: { node_id: node_id } });
            const managed_image_table = new Map<string, any>();
            for (const image of managed_images) if (image.image_id) managed_image_table.set(image.image_id, image);


            for (const native_image of native_images) {
                const img = await ORM.image.findFirst({ where: { key: native_image.key, node_id: node_id } });
                const update02 = {
                    name: native_image.name,
                    size: native_image.size,
                    node_id: node_id,
                    key: native_image.key,
                    description: native_image.description ?? "",
                    remote: native_image.remote ?? img?.remote,
                    url: img?.url ?? native_image.name,
                    published: img?.published == null ? false : img?.published,
                }
                if (img) {
                    await ORM.image.update({ where: { id: img.id }, data: update02 });
                } else {
                    await ORM.image.create({ data: update02 });
                }
            }

            const db_images = await ORM.image.findMany({ where: { node_id: node_id } });
            const image_id_to_image_table = new Map<string, any>();
            const image_key_to_id_table = new Map<string, string>();
            const image_key_to_image_table = new Map<string, any>();
            for (const db_image of db_images) {
                if (db_image.key) {
                    image_key_to_image_table.set(db_image.key, db_image);
                    image_key_to_id_table.set(db_image.key, db_image.id);
                }
                if (db_image.id) image_id_to_image_table.set(db_image.id, db_image);
            }

            // db_images - managed_images - native = delete images
            for (const m_image of managed_images) {
                if (m_image.image_id) {
                    image_id_to_image_table.delete(m_image.image_id);
                }
            }
            for (const native_image of native_images) {
                if (native_image.key) {
                    const image_id = image_key_to_id_table.get(native_image.key);
                    if (image_id) {
                        image_id_to_image_table.delete(image_id);
                    }
                }
            }
            image_id_to_image_table.forEach(async (image: any, image_id: string) => {
                logger.warn("Delete:", image.name);
                await ORM.image.delete({ where: { id: image.id } });
            });


            // Native instances to database
            logger.log("Upsert native instances");
            const db_instance_table = new Map<string, string>();
            for (const instance of native_instances) {
                let status = "";
                if (instance.status) status = instance.status;
                status = status == "INITIALIZING" ? "ACTIVATED" : status;
                const update03 = {
                    key: instance.key,
                    name: instance.name,
                    status: status,
                    status_info: instance.status_info ?? "",
                    ipv4: instance.global_ipv4,
                    ipv6: instance.global_ipv6,
                    network_mode: instance.network_mode,
                    base_image: instance.image?.name,
                    node_id: node_id,
                    image_id: image_key_to_image_table.get(instance.image?.key)?.id,
                }
                const ins = await ORM.instance.upsert({ where: { key: instance.key }, update: update03, create: update03 });
                logger.warn(updated_node.name.slice(0, 10).padEnd(10), ins.name?.slice(0, 10).padEnd(10), ins.base_image?.slice(0, 10).padEnd(10), instance.key.slice(-10), ins.id.slice(-8));
                db_instance_table.set(instance.key, ins.id);
            }

            // Garbage collection mismatched instances.
            logger.log("Clean up mismatched instances");
            const db_instances = await ORM.instance.findMany({ where: { node_id: node_id } });
            for (const ins of db_instances) {
                if (db_instance_table.get(ins.key ?? "") == null) {
                    await ORM.instance.delete({ where: { id: ins.id } });
                    logger.warn("Not exists instance:", ins.id, ins.name, ins.status, ins.key);
                }
            }
            logger.success(`Associated = ${updated_node.name}(${updated_node.ipv4}) from ${req.ip}`);
            logger.success(`Instances(${native_instances.length})`);
            logger.success(`Images(${native_images.length})`);
            logger.success(`ipv4_ports:`, ipv4_ports);
            res.json({ error: null, data: {} });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [F6tySopUSp]" });
        }
    });

    app.post('/v1/compute_node/delete', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, node_id } = CheckJSONProperties(["node_id"], req); if (_error_) return res.json({ error: _error_ });
        const is_administrator = req.session?.user?.is_administrator;
        const user_id = req.session?.user?.user_id;

        try {
            logger.log(node_id);
            const own_node = is_administrator ?
                await ORM.compute_node.findFirst({ where: { id: node_id } }) :
                await ORM.compute_node.findFirst({ where: { id: node_id, user_id: user_id } }) || await ORM.managed_compute_node.findFirst({ where: { id: node_id, user_id: user_id } });
            if (!own_node) return res.json({ error: `Does not exist or permission denied [6EQTLAGH2f]` });
            const client = NodeTable.get(node_id);
            logger.log(await ORM.managed_compute_node.deleteMany({ where: { node_id: node_id } }));
            logger.log(await ORM.port_map.deleteMany({ where: { node_id: node_id } }));

            logger.log(await ORM.managed_instance.deleteMany({ where: { node_id: node_id } }))
            logger.log(await ORM.managed_image.deleteMany({ where: { node_id: node_id } }))
            logger.log(await ORM.instance.deleteMany({ where: { node_id: node_id } }));
            logger.log(await ORM.image.deleteMany({ where: { node_id: node_id } }));
            logger.log(await ORM.compute_node.delete({ where: { id: node_id } }));

            // if (!client) return res.json({ error: `Not connected [scM0vvzx9W]` });
            // const managed_instances = await ORM.managed_instance.findMany({ where: { node_id: node_id } });
            // for (const managed_instance of managed_instances) {
            //     if (!managed_instance.instance_id) continue;
            //     const instance = await ORM.instance.findFirst({ where: { id: managed_instance.instance_id } });
            //     if (!instance) continue;
            //     logger.log(await ORM.managed_instance.deleteMany({ where: { instance_id: managed_instance.instance_id } }))
            //     const event: Event = await client.send_and_wait({ method: "delete_instance", params: { key: instance.key } });
            //     logger.warn("Delete:", event);
            // }
            // logger.log(await ORM.instance.deleteMany({ where: { node_id: node_id } }));
            res.json({ error: null, data: {} });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [xtQpaQ2EKp]" });
        }

    });



    app.get('/v1/compute_node/list', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_ } = CheckJSONProperties([], req); if (_error_) return res.json({ error: _error_ });

        const session = req.session as any;
        const user_id = session.user.user_id;
        try {
            const n_table = new Map<string, any>();
            { // Self nodes
                const nodes = await ORM.compute_node.findMany({ where: { user_id: user_id } });
                for (const node of nodes) n_table.set(node.id, node);
            }
            { // Managed nodes
                const managed_nodes = await ORM.managed_compute_node.findMany({ where: { user_id: user_id } });
                const ids = managed_nodes.map((v: any) => v.node_id);
                const nodes = await ORM.compute_node.findMany({ where: { id: { in: ids } } });
                for (const node of nodes) n_table.set(node.id, node);
            }
            const nodes = Array.from(n_table.values());
            res.json({ error: null, data: nodes });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [UTOYiaq5u6]" });
        }
    });

    { // Long polling and push to computing node

        setInterval(() => {
            NodeTable.forEach((client, k) => {
                if (client) {
                    client.update();
                }
            });
        }, 4000);
        app.post('/v1/compute_node/ping', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
            const { _error_, node_id, params } = CheckJSONProperties(["node_id", "params"], req); if (_error_) return res.json({ error: _error_ });
            if (req.session?.user?.is_administrator) { } // Force delete
            const client = NodeTable.get(node_id);
            if (client) {
                client.send({ method: "ping", params: params }, (event: Event) => {
                    const res_data = event.response_data;
                    res.json({ error: null, data: res_data.result, request_data: res_data.data });
                });
            } else {
                res.json({ error: "Internal Server Error [pGtdgS7rby]" });
            }
        });
        app.post('/v1/compute_node/subscribe', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
            const { _error_, node_id, events } = CheckJSONProperties(["node_id", "events"], req); if (_error_) return res.json({ error: _error_ });
            const session = req.session as any;
            const user_id = session.user.user_id as string;
            try {
                const node = await ORM.compute_node.findFirst({ where: { id: node_id, user_id: user_id } });
                if (node) {
                    logger.log("Subscribe:", node_id.slice(-8), node.name.slice(0, 8).padEnd(8), node.ipv4?.slice(0, 15).padEnd(15) || node.ipv6);
                    const client = NodeTable.get(node_id) ?? new Node();
                    client.connector = res;
                    NodeTable.set(node_id, client);
                    for (const k in events) client.recv(events[k]);
                    client.update();

                    await ORM.compute_node.update({ where: { id: node_id }, data: { updated_at: new Date() } });
                } else {
                    logger.error("Invalid node id " + node_id);
                    res.json({ error: "Invalid node_id. [KONUmrrv2M]" });
                }
            } catch (e) {
                logger.error("Subscribe Error: " + node_id);
                logger.error(e);
                res.json({ error: "Internal Server Error [aoTM3wxOCU]" });
            }
        });
        const app_ws = app as any;
        app_ws.ws('/ws/', RejectNotLoggedInForWS, (ws: WebSocket, req: Request, next: NextFunction) => {
            // ws.binaryType = "arraybuffer";
            try {
                const user = req.session.user;
                const email = user?.email;
                const user_id = user?.user_id;
                const is_node_ws = user?.node_id;

                if (is_node_ws) {
                    const node = NodeTable.get(is_node_ws);
                    if (node) {
                        node.server_ws = ws;
                        logger.success("WS:ServerNode:Hook", email);
                    } else {
                        logger.error("WS:Not associated node:", is_node_ws);
                        ws.close();
                    }
                } else {
                    logger.success('WS:Connected:', email, user_id);
                }

                // Validation check.
                // const obj = { event: "term", data: data };
                // ws.send(JSON.stringify(obj));
                ws.addEventListener("error", (event) => {
                    logger.log("WebSocket error: ", event);
                });

                async function client_ws_handler(message: string | ArrayBuffer) {
                    try {
                        if (typeof message === "string") {
                            const obj = JSON.parse(message);
                            const node_id = obj.node_id;
                            const instance_id = obj.instance_id;
                            const channel_id = obj.channel_id;
                            const event = obj.event;
                            // logger.log(obj);
                            // TODO: Check permission of node_id
                            function send_error(error_message: string) {
                                obj.error = error_message;
                                ws.send(JSON.stringify(obj));
                            }
                            if (node_id == null) return send_error("WS:Invalid node_id:");
                            const node = NodeTable.get(node_id);
                            // logger.log("-----------------------", event, "-----------------------");
                            if (node == null) return send_error("WS:Not connected node:");
                            // logger.log("-----------------------", event, "-----------------------");
                            if (node.server_ws == null) return send_error("WS:Not connected server:");
                            // logger.log("-----------------------", event, "-----------------------");
                            const now = Date.now();
                            for (const k in node.channel_table) {
                                const channel = node.channel_table.get(k);
                                if (channel == null) node.channel_table.delete(k);
                                if (channel) {
                                    const s = now - channel.server_timestamp;
                                    const c = now - channel.client_timestamp;
                                    if (s > 60000 || c > 60000) {
                                        node.channel_table.delete(k);
                                        logger.info(`Destroyed channel: ${k}`);
                                   }
                                }
                            }
                            // --------------------------- Client Handler ---------------------------
                            if (event == "term" || event == "resize") { // close
                                const channel_ins = node.channel_table.get(channel_id);
                                // logger.log("-------------", channel_id, "-------------");
                                // node.channel_table.forEach((v,k)=>{
                                //     logger.log(k);
                                // });
                                if (channel_ins) {
                                    channel_ins.right_queue.push(message);
                                    channel_ins.update();
                                }
                            } else if (event == "open_terminal") {
                                const channel_ins = new WSChannel(GenerateUUID());
                                channel_ins.node_id = node_id;
                                channel_ins.instance_id = instance_id;
                                channel_ins.client_ws = ws;
                                channel_ins.server_ws = node.server_ws;
                                node.channel_table.set(channel_ins.id, channel_ins);
                                logger.log("Terminals:", node.channel_table.size);

                                let has_error = false;
                                if (instance_id) {
                                    const instance = await ORM.instance.findFirst({ where: { id: instance_id } });
                                    if (instance?.key) {
                                        channel_ins.instance_key = instance.key;
                                    } else {
                                        has_error = true;
                                        logger.error("WS:Instance is not registered:", instance_id);
                                    }
                                }
                                if (has_error) {
                                    channel_ins.left_queue.push(JSON.stringify({ error: "Does not have an instance.", event: event, instance_id: instance_id, channel_id: channel_ins.id }));
                                } else {
                                    channel_ins.right_queue.push(JSON.stringify({ event: event, instance_id: instance_id, instance_key: channel_ins.instance_key, channel_id: channel_ins.id }));
                                }
                                channel_ins.update();
                                logger.success(obj);
                            } else if (event == "pong") {
                                logger.log("pong");
                            } else if (event == "ping") {
                                logger.log("ping");
                                ws.send(JSON.stringify({ event: "pong" }));
                            } else {
                                send_error("WS:Unknown message");
                            }
                        } else {
                            ws.send(JSON.stringify({ error: "WS:Unknown message type" }));
                        }
                    } catch (e) {
                        ws.send(JSON.stringify({ error: "WS:Internal server error" }));
                        logger.error(e);
                    }
                }
                async function server_ws_handler(message: string | ArrayBuffer) {
                    try {
                        if (typeof message === "string") {
                            const obj = JSON.parse(message);
                            const event = obj.event;
                            const node_id = is_node_ws;
                            const instance_id = obj.instance_id;
                            const channel_id = obj.channel_id;
                            // logger.log(obj);

                            function send_error(error_message: string) {
                                obj.error = error_message;
                                ws.send(JSON.stringify(obj));
                            }

                            // TODO: Check permission of node_id

                            if (node_id == null) return send_error("WS:Invalid node_id:");
                            const node = NodeTable.get(node_id);
                            if (node == null) return send_error("WS:Not connected node:");
                            const now = Date.now();
                            for (const k in node.channel_table) {
                                const channel = node.channel_table.get(k);
                                if (channel == null) node.channel_table.delete(k);
                                if (channel) {
                                    const s = now - channel.server_timestamp;
                                    const c = now - channel.client_timestamp;
                                    if (s > 60000 || c > 60000) {
                                        logger.info(`Destroyed channel: ${k}`);
                                   }
                                }
                            }
                            // --------------------------- Server Handler ---------------------------
                            // logger.info(event);
                            if (event == "term" || event == "resize" || event == "open_terminal") {
                                const channel_ins = node.channel_table.get(channel_id);
                                if (channel_ins) {
                                    channel_ins.left_queue.push(message);
                                    channel_ins.update();
                                }
                            } else if (event == "pong") {
                                logger.log("pong");
                            } else if (event == "ping") {
                                logger.log("ping");
                                ws.send(JSON.stringify({ event: "pong" }));
                            } else {
                                logger.error("WS:Unknown message:", obj);
                            }

                        } else {
                            ws.send(JSON.stringify({ error: "WS:Unknown message type" }));
                        }
                    } catch (e) {
                        ws.send(JSON.stringify({ error: "WS:Internal server error" }));
                        logger.error(e);
                    }
                }


                ws.on('message', is_node_ws ? server_ws_handler : client_ws_handler);

                ws.on('close', () => {
                    if (is_node_ws) {
                        const n = NodeTable.get(is_node_ws);
                        if (n == null) return logger.error("WS:Not connected node:", is_node_ws);
                        n.channel_table.forEach((channel) => {
                            if (channel.client_ws?.readyState == WebSocket.OPEN) {
                                channel.client_ws.send(JSON.stringify({ event: "close", channel: channel.id, instance_id: channel.instance_id, node_id: channel.node_id }));
                            }
                        });
                    } else {

                        // TODO: Remove channel
                        // if (channel.client_ws?.readyState == WebSocket.OPEN) {
                        //     channel.client_ws.send(JSON.stringify({ event: "close", channel: channel.channel_id, instance_id: channel.instance_id, node_id:channel.node_id }));
                        // }

                    }

                    logger.log('WS:WebSocket closed:', email, user_id);
                });
            } catch (e) {
                logger.error(e);
            }
        });


        // import * as nodePty from "node-pty";

        // const app_ws = app as any;
        // app_ws.ws('/ws', (ws: WebSocket, req: express.Request, next: express.NextFunction) => {
        //     ws.binaryType = "arraybuffer";
        //     logger.log("Start");
        //     try {

        //         let pty = nodePty.spawn(os.platform() === 'win32' ? 'powershell.exe' : 'bash', [], {
        //             name: 'xterm-color',
        //             cols: 80,
        //             rows: 30,
        //             cwd: process.env.HOME,
        //             env: process.env
        //         });


        //         logger.log("Start1");
        //         pty.onData((data) => {
        //             // logger.log('WebSocket message(S):', data);
        //             const obj = { event: "term", data: data };
        //             ws.send(JSON.stringify(obj));
        //         });

        //         console.log('WebSocket connected');
        //         ws.on('message', (message) => {
        //             try {
        //                 if (typeof message === "string") {
        //                     const obj = JSON.parse(message);
        //                     if (obj.event == "term") {
        //                         pty.write(obj.data);
        //                     } else if (obj.event == "resize") {
        //                         // pty.write(obj.data);
        //                         pty.resize(obj.cols, obj.rows);
        //                     }
        //                 } else {
        //                     logger.error("Unknown message type:", typeof message);
        //                 }
        //             } catch (e) {
        //                 logger.error(e);
        //             }
        //         });

        //         ws.on('close', () => {
        //             // WebSocket接続が閉じられたときの処理
        //             console.log('WebSocket closed');
        //         });
        //     } catch (e) {
        //         logger.error(e);
        //     }
        // });
    }

}
