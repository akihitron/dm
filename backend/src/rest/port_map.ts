import express, { Express, Request, Response, NextFunction } from "express";
import { AppParams, MainContext, RejectNotLoggedIn, CheckAdmin, Node, Event, CheckJSONProperties } from "../global";
import logger from "../logger";
import { PrismaClient } from "@prisma/client";

export async function GetPortMap(user_id: string, node_id: string | null, ORM: PrismaClient): Promise<Array<any>> {
    const node_table = new Map<string, boolean>();
    const managed_compute_nodes = await ORM.managed_compute_node.findMany({ where: { user_id } });
    const managed_instances = await ORM.managed_instance.findMany({ where: { user_id } });
    const own_nodes = await ORM.compute_node.findMany({ where: { user_id } });
    for (const node of managed_compute_nodes) node_table.set(node.node_id, true);
    for (const node of managed_instances) node_table.set(node.node_id, true);
    for (const node of own_nodes) node_table.set(node.id, true);

    const node_ids = Array.from(node_table.keys());
    const ins_ids = Array.from(managed_instances.filter((ins: any) => ins.instance_id).map((ins: any) => ins.instance_id));

    if (node_ids.length == 0) return [];
    const node_table2 = new Map<string, any>();
    const ins_table2 = new Map<string, any>();
    const nodes = await ORM.compute_node.findMany({ where: { id: { in: node_ids } } });
    for (const node of nodes) node_table2.set(node.id, node);
    const instances = await ORM.instance.findMany({ where: { id: { in: ins_ids } } });
    for (const ins of instances) ins_table2.set(ins.id, ins);
    const managed_port_map = JSON.parse(JSON.stringify(await ORM.port_map.findMany({ where: { node_id: { in: node_ids } } })));
    for (const pm of managed_port_map) {
        const node = node_table2.get(pm.node_id);
        const ins = ins_table2.get(pm.instance_id);
        if (node) {
            pm.node_name = node.name;
            pm.node_local_ipv4 = node.local_ipv4;
            pm.node_local_ipv6 = node.local_ipv6;
            pm.node_global_ipv4 = node.ipv4;
            pm.node_global_ipv6 = node.ipv6;
        }
        if (ins) {
            pm.instance_name = ins.name;
        }
    }
    if (node_id) return managed_port_map.filter((port_map: any) => port_map.node_id == node_id);

    return managed_port_map;
}

export default async (context: MainContext) => {
    const app = context.app as Express;
    const ORM = context.model as PrismaClient;
    const CommonLimiter = context.limiters.CommonLimiter;
    const ApiLimiter = context.limiters.ApiLimiter;
    const SensitiveLimiter = context.limiters.SensitiveLimiter;

    app.get("/v1/port_map/list", CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, node_id } = CheckJSONProperties([{ key: "node_id", nullable: true }], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        try {
            const managed_port_map = await GetPortMap(user_id, node_id, ORM);
            return res.json({ error: null, data: managed_port_map });
        } catch (e) {
            logger.error(e);
            return res.json({ error: "Internal Server Error [Rai2gpqreR]" });
        }
    });

    app.post("/v1/port_map/create", ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, instance_id } = CheckJSONProperties(["instance_id"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        // TODO: Request to computing node
        res.json({ error: null, data: {} });
    });

    app.post("/v1/port_map/delete", ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, id } = CheckJSONProperties(["id"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;

        try {
            const port_map = await ORM.port_map.findUnique({ where: { id: id } });
            if (!port_map) return res.json({ error: "Not found port map [t5OdmA8VjH]" });

            const node = await ORM.compute_node.findUnique({ where: { id: port_map.node_id } });
            if (!node) {
                await ORM.port_map.delete({ where: { id: id } });
                return res.json({ error: "Not found node [dJimHQSLtk]" });
            }
            if (port_map.instance_id == null) {
                await ORM.port_map.delete({ where: { id: id } });
                return res.json({ error: "Instance id was null [pvTTd3UWAY]" });
            }
            const instance = await ORM.instance.findUnique({ where: { id: port_map.instance_id } });
            if (!instance) {
                await ORM.port_map.delete({ where: { id: id } });
                return res.json({ error: "Not found node [7KKqPFP85o]" });
            }

            const node_table = new Map<string, boolean>();
            const managed_compute_nodes = await ORM.managed_compute_node.findMany({ where: { user_id } });
            const managed_instances = await ORM.managed_instance.findMany({ where: { user_id } });
            const own_nodes = await ORM.compute_node.findMany({ where: { user_id } });
            for (const node of managed_compute_nodes) node_table.set(node.node_id, true);
            for (const node of managed_instances) node_table.set(node.node_id, true);
            for (const node of own_nodes) node_table.set(node.id, true);
            if (!node_table.get(node.id)) {
                return res.json({ error: "Permission denied [5iNwdxjJNC]" });
            }

            // In docker driver, nothing to do.
            if (node.manipulator_driver == "docker") {
                return res.json({ error: "Docker driver does not support port remapping [qciTB2UNai]" });
            }

            return res.json({ error: null, data: {} });
        } catch (e) {
            logger.error(e);
            return res.json({ error: "Internal Server Error [iQXl2C2q1N]" });
        }
    });
};
