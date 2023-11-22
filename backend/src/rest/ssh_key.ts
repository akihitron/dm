import express, { Express, Request, Response, NextFunction } from 'express';
import { AppParams, MainContext, RejectNotLoggedIn, CheckAdmin, Node, Event, CheckJSONProperties } from "../global";
import logger from '../logger';
import { PrismaClient } from '@prisma/client';


export default async (context: MainContext) => {
    const app = context.app as Express;
    const ORM = context.model as PrismaClient;
    const CommonLimiter = context.limiters.CommonLimiter;
    const ApiLimiter = context.limiters.ApiLimiter;
    const SensitiveLimiter = context.limiters.SensitiveLimiter;

    app.post('/v1/ssh/register', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, name, key } = CheckJSONProperties(["name", { key: "key", max_length: 4096 }], req); if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id;
        try {
            const exists = await ORM.ssh_key.findMany({ where: { key } });
            if (exists.length > 0) {
                res.json({ error: "Already exists public key. [sfEWUlDRlM]" });
            } else {
                const ret = await ORM.ssh_key.create({data:{ name, key, user_id }});
                res.json({ error: null, data: ret });
            }
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [DfOmatoOVa]" });
        }
    });

    app.post('/v1/ssh/delete', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, id } = CheckJSONProperties(["id"], req); if (_error_) return res.json({ error: _error_ });
        const user_id = (req.session as any).user.user_id;
        try {
            const data = await ORM.ssh_key.delete({where:{id:id, user_id:user_id}});
            res.json({ error: null, data: data });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [d81yVSluvx]" });
        }
    });

    app.get('/v1/ssh/list', RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_ } = CheckJSONProperties([], req); if (_error_) return res.json({ error: _error_ });
        const user_id = (req.session as any).user.user_id;

        try {
            const data = await ORM.ssh_key.findMany({ where:{user_id:user_id} });
            res.json({ error: null, data: data });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [iRw615skrH]" });
        }
    });

}
