import express, { Express, Request, Response, NextFunction } from "express";
import { AppParams, MainContext, RejectNotLoggedIn, CheckAdmin, Node, Event, CheckJSONProperties } from "../global";
import { NodeTable } from "./compute_node";
import logger from "../logger";
import { PrismaClient } from "@prisma/client";

export default async (context: MainContext) => {
    const app = context.app as Express;
    const ORM = context.model as PrismaClient;
    const CommonLimiter = context.limiters.CommonLimiter;
    const ApiLimiter = context.limiters.ApiLimiter;
    const SensitiveLimiter = context.limiters.SensitiveLimiter;

    async function get_available_image_list(user_id: string, is_administrator: boolean) {
        const n_table: Map<string, any> = new Map();
        const i_table: Map<string, any> = new Map();
        // Find nodes by owner.
        {
            const query = is_administrator ? undefined : { where: { user_id: user_id } };
            const nodes = await ORM.compute_node.findMany(query);
            if (nodes.length > 0) {
                for (const node of nodes) n_table.set(node.id, node);
                const n_ids = nodes.filter((n: any) => n.id).map((n: any) => n.id);

                const image_list = await ORM.image.findMany({ where: { node_id: { in: n_ids } } });
                const cloned = JSON.parse(JSON.stringify(image_list));
                for (const o of cloned) {
                    o.node_name = n_table.get(o.node_id).name;
                    i_table.set(o.id, o);
                }
            }
        }
        // Find managed instances.
        {
            const managed = JSON.parse(JSON.stringify(await ORM.managed_image.findMany({ where: { user_id: user_id } })));
            const i_ids = managed.filter((n: any) => n.image_id).map((n: any) => n.image_id);
            const cloned = JSON.parse(JSON.stringify(await ORM.image.findMany({ where: { id: { in: i_ids } } })));

            // Merge
            for (const o of cloned) {
                o.managed = true;
                const prev = i_table.get(o.id);
                i_table.set(o.id, Object.assign(prev ?? {}, o));
            }
        }
        const records = Array.from(i_table, ([id, obj]) => obj);

        return records;
    }

    async function has_available_image(user_id: string, is_administrator: boolean, image_id: string): Promise<boolean> {
        const records = await get_available_image_list(user_id, is_administrator);
        for (const record of records) {
            if (record.id == image_id) return true;
        }
        return false;
    }

    async function get_available_image(user_id: string, is_administrator: boolean, image_id: string) {
        const records = await get_available_image_list(user_id, is_administrator);
        for (const record of records) {
            if (record.id == image_id) return record;
        }
        return null;
    }

    app.get("/v1/image/list", CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_ } = CheckJSONProperties([], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        const is_administrator = session.user.is_administrator;
        try {
            const records = await get_available_image_list(user_id, is_administrator);
            res.json({ error: null, data: records });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [cacua6JnTj]" });
        }
    });

    app.post("/v1/image/publish", ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, image_id, publish } = CheckJSONProperties(["image_id", "publish"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        const is_administrator = session.user.is_administrator;
        try {
            const image = await ORM.image.findUnique({ where: { id: image_id } });
            if (image && (await has_available_image(user_id, is_administrator, image_id))) {
                const data = await ORM.image.update({
                    where: { id: image_id },
                    data: {
                        published: publish,
                    },
                });
                logger.log(data, await ORM.image.findUnique({ where: { id: image_id } }));
                res.json({ error: null, data: data });
            } else {
                res.json({ error: "Internal Server Error [nTc6jacJua]" });
            }
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [JnTc6jacua]" });
        }
    });

    async function is_allowed_node(node_id: string, user_id: string) {
        const own_node = await ORM.compute_node.findFirst({ where: { id: node_id, user_id: user_id } });
        if (own_node) return true;
        const permitted_node = await ORM.managed_compute_node.findFirst({ where: { node_id: node_id, user_id: user_id } });
        if (permitted_node) return true;
        return false;
    }

    app.post("/v1/image/fetch", ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, node_id, url } = CheckJSONProperties(["node_id", "url"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        try {
            if (!(await is_allowed_node(node_id, user_id))) return res.json({ error: `Permission defined or already exists image [INs16aZAOc]` });

            const previous = await ORM.image.findFirst({ where: { node_id: node_id, url: url } });
            if (previous == null) {
                const client = NodeTable.get(node_id);
                if (client) {
                    const update_query01 = {
                        name: url,
                        status: "INITIALIZING",
                        node_id: node_id,
                        url: url,
                    };
                    let init_image = await ORM.image.findFirst({ where: { node_id: node_id, url: url } });
                    if (init_image) {
                        init_image = await ORM.image.update({
                            where: { id: init_image.id },
                            data: update_query01,
                        });
                    } else {
                        init_image = await ORM.image.create({ data: update_query01 });
                    }
                    if (init_image == null) return res.json({ error: `Internal Server Error [AINsO16aZc]` });

                    let init_managed_image = await ORM.managed_image.findFirst({ where: { user_id: user_id, image_id: init_image.id } });
                    const update_query02 = {
                        user_id: user_id,
                        node_id: node_id,
                        image_id: init_image.id,
                    };
                    if (init_managed_image) {
                        init_managed_image = await ORM.managed_image.update({
                            where: { id: init_image.id },
                            data: update_query01,
                        });
                    } else {
                        init_managed_image = await ORM.managed_image.create({ data: update_query02 });
                    }

                    if (init_managed_image == null) return res.json({ error: `Internal Server Error [AINsO16aZc]` });

                    client.send({ method: "load_image", params: { url: url } }, async (event: Event) => {
                        if (init_image == null) return res.json({ error: `Internal Server Error [16AINsOaZc]` });
                        if (init_managed_image == null) return res.json({ error: `Internal Server Error [INsO1A6aZc]` });
                        try {
                            const res_data = event.response_data;
                            const result = res_data.result;
                            const request_data = res_data.data;
                            const error = res_data?.error;
                            logger.log(res_data);
                            if (error || result == null) {
                                logger.error(error);
                                logger.log("Delete:", init_image.id);
                                await ORM.image.delete({ where: { id: init_image.id } });
                                logger.log("Delete:", init_managed_image.id);
                                await ORM.managed_image.delete({ where: { id: init_managed_image.id } });

                                res.json({ error: `Internal Server Error [uaL9dkAp7U], Message:${error.message}` });
                            } else {
                                logger.log(result);
                                // Check already exists or not.
                                const check_image = await ORM.image.findFirst({ where: { node_id: node_id, key: result.key } });
                                const already_exists_same_hash_key_image = check_image?.id == init_image.id;
                                if (!already_exists_same_hash_key_image) {
                                    logger.log("Delete:", init_image.id);
                                    await ORM.image.delete({ where: { id: init_image.id } });
                                    logger.log("Delete:", init_managed_image.id);
                                    await ORM.managed_image.delete({ where: { id: init_managed_image.id } });
                                }
                                const query = already_exists_same_hash_key_image ? { id: init_image.id } : { node_id: node_id, key: result.key };
                                logger.log(query);
                                let image02 = await ORM.image.findFirst({ where: query });
                                const image02_update = {
                                    name: result.name,
                                    size: result.size,
                                    status: result.status,
                                    node_id: node_id,
                                    key: result.key,
                                    url: url,
                                    published: false,
                                    native_timestamp: new Date(result.timestamp),
                                };
                                if (image02) {
                                    await ORM.image.update({ where: { id: image02.id }, data: image02_update });
                                } else {
                                    image02 = await ORM.image.create({ data: image02_update });
                                }
                                const managed_image02 = await ORM.managed_image.findFirst({ where: { user_id: user_id, image_id: image02.id } });
                                const managed_iamge02_update = {
                                    user_id: user_id,
                                    node_id: node_id,
                                    image_id: image02.id,
                                };
                                if (managed_image02) {
                                    await ORM.managed_image.update({ where: { id: managed_image02.id }, data: managed_iamge02_update });
                                } else {
                                    await ORM.managed_image.create({ data: managed_iamge02_update });
                                }
                                res.json({ error: null, data: result, request_data: request_data });
                            }
                        } catch (e) {
                            logger.error(e);
                            res.json({ error: `Internal Server Error [EKbZYgosjQ]` });
                        }
                    });
                } else {
                    res.json({ error: `Target node is not available. [Q5IvxPXqDP]` });
                }
            } else {
                res.json({ error: `Already exists image [AINsO16aZc]` });
            }
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [S91hhQlr3B]" });
        }
    });

    app.post("/v1/image/save", ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, any } = CheckJSONProperties(["any"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        // TODO: Request to computing node
        res.json({ error: null, data: {} });
    });

    app.post("/v1/image/delete", ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, image_id, force } = CheckJSONProperties(["image_id", { key: "force", nullable: true }], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        const is_administrator = session.user.is_administrator;
        try {
            const image = await get_available_image(user_id, is_administrator, image_id);
            if (image) {
                const node_id = image.node_id;
                const client = NodeTable.get(node_id);
                if (client || force) {
                    if (client && image.key) {
                        logger.log("Ask an image to delete.", image);
                        client.send({ method: "delete_image", params: { key: image.key } }, async (event: Event) => {
                            try {
                                const res_data = event.response_data;
                                const result = res_data.result;
                                const request_data = res_data.data;
                                let should_delete = true;
                                logger.log(res_data);
                                if (res_data?.error) {
                                    if (res_data.error.statusCode == 404) {
                                        should_delete = true;
                                    } else {
                                        should_delete = false;
                                        logger.error(res_data);
                                    }
                                }
                                if (should_delete) {
                                    await ORM.managed_image.deleteMany({ where: { image_id: image_id } });
                                    await ORM.image.delete({ where: { id: image_id } });
                                    res.json({ error: null, data: result, request_data: request_data });
                                } else {
                                    res.json({ error: `Internal Server Error [YW1xfgX2u4]` });
                                }
                            } catch (e) {
                                logger.error(e);
                                res.json({ error: `Internal Server Error [DIAPQ6DgiL]` });
                            }
                        });
                    } else {
                        logger.log(`No image key(${image_id}):`, image);
                        logger.log("ManagedImage.deleteMany", await ORM.managed_image.deleteMany({ where: { image_id: image_id } }));
                        logger.log("Image.deleteOne", await ORM.image.delete({ where: { id: image_id } }));
                        res.json({ error: null, data: {} });
                    }
                } else {
                    res.json({ error: `The node is not connected. [DxVRb5UOpN]` });
                }
            } else {
                res.json({ error: `Internal Server Error [QXIcdkhKuB]` });
            }
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [cYLYXFJJ0D]" });
        }
    });
};
