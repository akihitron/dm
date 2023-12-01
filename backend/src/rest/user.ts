import { Express, Request, Response } from 'express';
import { MainContext, RejectNotLoggedIn, CheckAdmin, CheckJSONProperties, GenerateUUID, GenerateSalt, HashPassword, RejectAPIKeyLoggedIn } from "../global";
import logger from '../logger';
import { PrismaClient } from '@prisma/client';

export function check_email(s: string) {
    if (!s.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)) return false;
    if (s.split('@')?.[1]?.indexOf('.') === -1) return false;
    return true;
}

export function check_nonAlphanumeric(s: string) {
    const result = s.match(/[^a-zA-Z0-9]/g);
    return result == null;
}


export default async (context: MainContext) => {
    const app = context.app as Express;
    const ORM = context.model as PrismaClient;
    const CommonLimiter = context.limiters.CommonLimiter;
    const ApiLimiter = context.limiters.ApiLimiter;
    const SensitiveLimiter = context.limiters.SensitiveLimiter;

    function check_length(s: string, min: number, max: number) {
        if (s.length < min) return false;
        if (s.length > max) return false;
        return true;
    }

    function check_id(s: string) {
        if (!s.match(/^[a-zA-Z0-9]+/)) return false;
        return true;
    }

    app.post('/v1/user/login', SensitiveLimiter, async (req: Request, res: Response) => {
        const email = req.body.email;
        const password = req.body.password;
        const api_key_id = req.body.api_key_id;
        const api_key_secret = req.body.api_key_secret;
        const node_id = req.body.node_id;
        const is_password_auth = (email != null && password != null);
        if (!(is_password_auth || (api_key_id != null && api_key_secret != null && node_id != null))) return res.json({ error: "Invalid input or does not exists an account. [4Go21WQlwH]" });
        if (is_password_auth) {
            if (!check_length(email, 5, 100)) return res.json({ error: "Invalid input. [0fuTIJ0Rwi]" });
            if (!check_length(password, 8, 64)) return res.json({ error: "Invalid input. [hslTqTf5Nw]" });
            if (!check_email(email)) return res.json({ error: "Invalid input. [eIX5U2lbK3]" });
        } else {
            if (!check_length(node_id, 8, 64)) return res.json({ error: "Invalid input. [iPTwIR3uCI]" });
            if (!check_nonAlphanumeric(node_id)) return res.json({ error: "Invalid input. [fLMFl7wRp4]" });
            if (!check_length(api_key_secret, 8, 64)) return res.json({ error: "Invalid input. [2oyKCDXy5k]" });
            if (!check_nonAlphanumeric(api_key_secret)) return res.json({ error: "Invalid input. [EAiEiY7MQq]" });
            if (!check_length(api_key_secret, 8, 64)) return res.json({ error: "Invalid input. [F4tCiqmT9s]" });
            if (!check_nonAlphanumeric(api_key_secret)) return res.json({ error: "Invalid input. [kTVVMXpXYB]" });
        }


        try {
            let d_user: any = null;
            let success = false;

            try {
                if (!is_password_auth) {
                    const exists_api_key_by_id = await ORM.api_key.findUnique({ where: { id: api_key_id } });
                    if (exists_api_key_by_id == null) return res.json({ error: "Invalid api key. [JkL9YywrYF]" });
                    const d_api_key = await ORM.api_key.findFirst({ where: { id: api_key_id, hash: HashPassword(api_key_secret, exists_api_key_by_id.salt, 'sha3-256') } });
                    if (d_api_key == null) return res.json({ error: "Invalid api key. [Z1G6v0xdze]" });
                    const d_node = await ORM.compute_node.findFirst({ where: { id: node_id, user_id: d_api_key.user_id } });
                    if (d_node == null) return res.json({ error: "Invalid node. [IaOeScgyMS]" });
                    d_user = await ORM.user.findUnique({ where: { id: d_api_key.user_id } });
                    if (!d_user) return res.json({ error: "Invalid user. [6RSPKiH60U]" });
                } else {
                    const _user = await ORM.user.findFirst({ where: { email: email } });
                    if (_user == null) return res.json({ error: "Invalid email or password. [7k8NH2skt2]" });

                    d_user = await ORM.user.findFirst({ where: { email: email, password_hash: HashPassword(password, _user.password_salt, 'sha3-256') } });
                    if (!d_user) return res.json({ error: "Invalid email or password. [PxvKeTCqvG]" });
                }
                success = true;
            } finally {
                if (!is_password_auth) {
                    success ? logger.log("API Key Auth:", node_id, api_key_id) : logger.error("API Key Auth Failed:", node_id, api_key_id);
                } else {
                    success ? logger.log("Password auth:", email) : logger.error("Password auth Failed:", email);
                }
            }
            logger.log(d_user.id, d_user.email, d_user.permission);
            const session_hash = Math.random().toString(32).substring(2);
            req.session.user = {
                hash: session_hash,
                user_id: d_user.id,
                email: d_user.email,
                is_api_key_session: !is_password_auth,
                is_administrator: d_user.permission == "administrator",
                instance_limit: d_user.instance_limit,
                node_limit: d_user.node_limit,
            };
            req.session.touch();
            res.json({
                error: null,
                email: d_user.email,
                is_logged_in: true,
                is_administrator: d_user.permission == "administrator",
                instance_limit: d_user.instance_limit,
                node_limit: d_user.node_limit,
            });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [kFfPlMhl4o]" });
        }
    });

    app.all('/v1/user/logout', ApiLimiter, async (req: Request, res: Response) => {
        req.session.destroy((err: any) => {
            if (err) logger.error(err);
            res.json({ error: err ? "Internal Server Error [2mhOsYg0bi]" : null });
        });
    });
    let count_user = await ORM.user.count();

    app.all('/v1/user/check_login', CommonLimiter, async (req: Request, res: Response) => {
        const session = req.session as any;
        if (session?.user?.hash) {
            session.views = session.views == null ? 1 : session.views + 1; // Update maxAge
            session.touch(); // Update maxAge
        }
        const user = req.session?.user;
        const ret: any = {
            error: null,
            email: user?.email,
            is_logged_in: user?.hash != null,
            is_administrator: user?.is_administrator == true,
            instance_limit: user?.instance_limit ?? 0,
            node_limit: user?.node_limit ?? 0,
        };
        // logger.log("V:", session.views, ret);
        ret.should_create_administrator = count_user == 0;
        res.json(ret);
    });
    {
        // Init administrator
        if (count_user == 0) {
            app.post('/v1/root/create', SensitiveLimiter, async (req: Request, res: Response) => {
                const { _error_, email, password } = CheckJSONProperties(["email", "password"], req);
                if (_error_) return res.json({ error: _error_ });

                try {
                    if (await ORM.user.count() == 0) {
                        const salt = GenerateSalt(64);
                        await ORM.user.create({
                            data: {
                                email: email,
                                password_salt: salt,
                                password_hash: HashPassword(password, salt, 'sha3-256'),
                                permission: "administrator"
                            }
                        });
                        count_user = await ORM.user.count();
                        res.json({ error: null });
                    } else {
                        res.json({ error: "Internal Server Error [l5D1anQ0vg]" });
                    }
                } catch (e) {
                    logger.error(e);
                    res.json({ error: "Internal Server Error [u1ylUVMRIV]" });
                }
            });
        }
    }

    app.get('/v1/user/description', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const session = req.session as any;
        const user = session.user;
        res.json({
            error: null,
            data: {
                email: user?.email,
                is_logged_in: user?.hash != null,
                is_administrator: user?.is_administrator == true,
                instance_limit: user?.instance_limit ?? 0,
                node_limit: user?.node_limit ?? 0,
            }
        });
    });

    app.post('/v1/user/create_api_key', SensitiveLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, name } = CheckJSONProperties(["name"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id as string;
        try {
            const id = GenerateUUID();
            const salt = GenerateSalt(64);
            const secret = GenerateUUID();
            const hash = HashPassword(secret, salt, 'sha3-256');
            await ORM.api_key.create({
                data: {
                    id: id,
                    user_id: user_id,
                    salt: salt,
                    hash: hash,
                    name: name,
                }
            });
            res.json({ error: null, data: { api_key_id: id, api_key_secret: secret } });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [u1ylUVMRIV]" });
        }
    });

    app.post('/v1/user/delete_api_key', SensitiveLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        const { _error_, api_key_id } = CheckJSONProperties(["api_key_id"], req);
        if (_error_) return res.json({ error: _error_ });
        const session = req.session as any;
        const user_id = session.user.user_id as string;
        try {
            await ORM.api_key.deleteMany({ where: { id: api_key_id, user_id: user_id } });
            res.json({ error: null, data: null });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [ylUu1VMRIV]" });
        }
    });

    app.get('/v1/user/api_key_list', ApiLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => {
        try {
            const session = req.session as any;
            const user = session.user;
            const records = await ORM.api_key.findMany({
                select: { id: true, name: true, created_at: true },
                where: { user_id: user.user_id }
            });
            res.json({ error: null, data: records });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [lUVMRu1yIV]" });
        }
    });


    app.all('/v1/user/status', CommonLimiter, RejectNotLoggedIn, async (req: Request, res: Response) => { res.json(req.session) });

    // RejectAPIKeyLoggedIn
    // Withdrawal
    // ResetPassword
    // ChangePassword
    // ChangeEmail
    // ChangeInstanceLimit
    // ChangeNodeLimit
    // ChangePermission
    // Verify Confirmation Code
    // Check Email Hash

    // Admin
    app.get('/v1/user/list', CommonLimiter, RejectNotLoggedIn, CheckAdmin, async (req: Request, res: Response) => {
        const { _error_ } = CheckJSONProperties([], req);
        if (_error_) return res.json({ error: _error_ });
        try {
            const data = (await ORM.user.findMany({
                select: ['id', 'email', 'permission', 'instance_limit', 'node_limit', 'created_at'].reduce((obj, key) => ({ ...obj, [key]: true }), {})
                // where: {},
            }));
            res.json({ error: null, data: data });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [rddAwKfOY5]" });
        }
    });

    app.post('/v1/user/register', CommonLimiter, RejectNotLoggedIn, RejectAPIKeyLoggedIn, CheckAdmin, async (req: Request, res: Response) => {
        const { _error_, name, password, email } = CheckJSONProperties([{ key: "name", nullable: true }, "email", "password"], req);
        if (_error_) return res.json({ error: _error_ });
        try {
            // Check user exists
            const user = await ORM.user.findFirst({ where: { email: email } });
            if (user) return res.json({ error: "User already exists. [DHqnH426zE]" });
            const salt = GenerateSalt(64);
            const data = (await ORM.user.create({
                data: {
                    email: email,
                    password_salt: salt,
                    password_hash: HashPassword(password, salt, 'sha3-256'),
                    permission: "user",
                    instance_limit: 10,
                    node_limit: 4,
                }
            }));
            res.json({ error: null, data: {} });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [pvz28KZAPQ]" });
        }
    });

    app.post('/v1/user/change_password', CommonLimiter, RejectNotLoggedIn, RejectAPIKeyLoggedIn, async (req: Request, res: Response) => {
        const { _error_, email, password, old_password } = CheckJSONProperties(["email", "password", {key:"old_password", nullable:true}], req);
        if (_error_) return res.json({ error: _error_ });
        const is_administrator = req.session?.user?.is_administrator;
        const user_id = req.session?.user?.user_id;
        if (!is_administrator && old_password == null) return res.json({ error: "Old password is required. [bBiBMPiV47]" })
        if (password.length < 8) return res.json({ error: "Password must be at least 8 characters. [KHBWCWa8bs]" })
        // TODO: Email validation
        try {
            // Check user exists
            let user = null;
            if (is_administrator)  {
                user = await ORM.user.findFirst({ where: { email: email } });
            } else {
                if (old_password.length < 8) return res.json({ error: "Password must be at least 8 characters. [561PsqVt2A]" })
                user = await ORM.user.findFirst({ where: { email: email, id: user_id } });
                if (user == null) return res.json({ error: "Does not exists. [fbmj5EHgIE]" });
                const salt = user?.password_salt;
                user = await ORM.user.findFirst({ where: { email: email, id: user_id, password_hash:HashPassword(old_password, salt, 'sha3-256') } });
            } 
            if (user == null) return res.json({ error: "Does not exists. [GVGHLLUnnU]" });
            const salt = GenerateSalt(64);
            const data = (await ORM.user.update({
                where: { id: user.id },
                data: {
                    password_salt: salt,
                    password_hash: HashPassword(password, salt, 'sha3-256')
                }
            }));
            logger.log(data);
            res.json({ error: null, data: {} });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [pvz28KZAPQ]" });
        }
    });


    app.post('/v1/user/delete', CommonLimiter, RejectNotLoggedIn, RejectAPIKeyLoggedIn, async (req: Request, res: Response) => {
        const { _error_, user_id } = CheckJSONProperties(["user_id"], req);
        if (_error_) return res.json({ error: _error_ });
        const is_administrator = req.session?.user?.is_administrator;
        const _user_id = is_administrator ? user_id : (req.session?.user?.user_id);
        try {
            // Check user exists
            const user = await ORM.user.findUnique({ where: { id: _user_id } });
            if (!user) return res.json({ error: "Does not exists. [nUGVGLUnHL]" });
            await ORM.managed_compute_node.deleteMany({ where: { user_id: user_id } });
            await ORM.managed_image.deleteMany({ where: { user_id: user_id } });
            await ORM.managed_instance.deleteMany({ where: { user_id: user_id } });
            await ORM.compute_node.deleteMany({ where: { user_id: user_id } });
            await ORM.api_key.deleteMany({ where: { user_id: user_id } });
            await ORM.ssh_key.deleteMany({ where: { user_id: user_id } });
            await ORM.user.delete({ where: { id: user_id } });
            res.json({ error: null, data: {} });
        } catch (e) {
            logger.error(e);
            res.json({ error: "Internal Server Error [mKckgHdLSp]" });
        }
    });

}
