import fs from "fs";
import path from "path";
import express, { Express, Request, Response } from 'express';
import session from "express-session";
import morgan from "morgan";
import WebSocket from "ws";
import expressWs from "express-ws";
import * as os from 'node:os';

import showdown from "showdown";
import configure from "./setup";
import { createStream } from 'rotating-file-stream';
import { AppParams, GenerateSalt, HashPassword, MainContext } from "./global";
import ComputeNodeAPI from "./rest/compute_node";
import ImageAPI from "./rest/image";
import InstanceAPI from "./rest/instance";
import PortMapAPI from "./rest/port_map";
import SSHKeyAPI from "./rest/ssh_key";
import UserAPI from "./rest/user";
import { PrismaClient } from "@prisma/client";
import logger from "./logger";
import cors from "cors";

import * as nodePty from "node-pty";


const APP_NAME = "dmb";
const APP_VERSION = "0.8.0";

///////////////////////////////////////////////////////////////////////////////////////
// Custom session user definition => res.session.user = {} 
declare module 'express-session' {
    export interface SessionData {
        user: { [key: string]: any };
    }
}

function ConvertMarkdownToHTML(params: AppParams) {
    // For development document.
    // http://localhost:3050
    const DEST_README_MD = path.join(__dirname, "../../README.md");
    const README1_PATH = path.join(__dirname, "../README.template.md");
    const README2_PATH = path.join(__dirname, "./public/help/readme.head");
    const B_TEMPLATE_CONFIG_PATH = path.join(__dirname, "./template.config.json");
    const C_TEMPLATE_CONFIG_PATH = path.join(__dirname, "../../compute/src/template.config.json");
    const MODEL_PATH = path.join(__dirname, "../prisma/schema.prisma");
    function check_file(f_path: string) {
        const ret = fs.existsSync(f_path);
        if (!ret) logger.error("File not found:", f_path);
        return ret;
    }
    logger.log(check_file(C_TEMPLATE_CONFIG_PATH), check_file(B_TEMPLATE_CONFIG_PATH) && check_file(README1_PATH), check_file(README2_PATH), check_file(MODEL_PATH));
    if (check_file(C_TEMPLATE_CONFIG_PATH) && check_file(B_TEMPLATE_CONFIG_PATH) && check_file(README1_PATH) && check_file(README2_PATH) && check_file(MODEL_PATH)) {
        const markdown_converter = new showdown.Converter({ tables: true });
        const b_template_json = fs.readFileSync(B_TEMPLATE_CONFIG_PATH).toString("utf8");
        const c_template_json = fs.readFileSync(C_TEMPLATE_CONFIG_PATH).toString("utf8");
        const HEAD = fs.readFileSync(README2_PATH).toString("utf8");
        const MODEL_DEF = fs.readFileSync(MODEL_PATH).toString("utf8");
        const MD = fs.readFileSync(README1_PATH).toString("utf8").
            replace("${backend.config.json}", b_template_json).
            replace("${compute_node.config.json}", c_template_json).
            replace("${model_def}", MODEL_DEF).
            replace(/\${app_name}/g, params.app_name);
        fs.writeFileSync(DEST_README_MD, MD);
        const DOCUMENT = `<!DOCTYPE html>
        <html>
            <title>Rest API Docs</title>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            ${HEAD}
            <body>
            ${markdown_converter.makeHtml(MD)}
            </body>
        </html>
        `;
        return DOCUMENT;
    }
    return "";
}


////////////////////////////////////////////////////////////////////////////////////
// Main Proc
async function main(params: AppParams) {


    const app_name = APP_NAME;
    params.server_name = `${app_name} server`;
    params.app_name = app_name;

    const TOP_DOCUMENT = ConvertMarkdownToHTML(params);
    const context: MainContext = await configure(params);
    const ORM = context.model as PrismaClient;




    //////////////////////////////////////////////////////////////////////////////
    // Create express app
    const app: Express = express();
    context.app = app;

    // CORS
    if (false) {
        app.use(cors()); // Cross Origin Resource Sharing
        // app.use(cors({
        //     origin: 'http://localhost:8080',
        //     credentials: true,
        //     optionsSuccessStatus: 200
        // }));
    }

    //////////////////////////////////////////////////////////////////////////////
    // WebSocket
    expressWs(app);
    {
        const app_ws = app as any;
        app_ws.ws('/ws', (ws: WebSocket, req: express.Request, next: express.NextFunction) => {
            // WebSocket接続が確立されたときの処理
            ws.binaryType = "arraybuffer";
            logger.log("Start");

            const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';


            try {

                let pty = nodePty.spawn(shell, [], {
                    name: 'xterm-color',
                    cols: 80,
                    rows: 30,
                    cwd: process.env.HOME,
                    env: process.env
                });


                logger.log("Start1");
                pty.onData((data) => {
                    // logger.log('WebSocket message(S):', data);
                    const obj = { event: "term", data: data };
                    ws.send(JSON.stringify(obj));
                });

                console.log('WebSocket connected');
                ws.on('message', (message) => {
                    try {
                        if (typeof message === "string") {
                            const obj = JSON.parse(message);
                            if (obj.event == "term") {
                                pty.write(obj.data);
                            } else if (obj.event == "resize") {
                                // pty.write(obj.data);
                                pty.resize(obj.cols, obj.rows);
                            }
                        } else {
                            logger.error("Unknown message type:", typeof message);
                        }
                    } catch (e) {
                        logger.error(e);
                    }
                });

                ws.on('close', () => {
                    // WebSocket接続が閉じられたときの処理
                    console.log('WebSocket closed');
                });
            } catch (e) {
                logger.error(e);

            }




        });
    }



    // const server = new http.Server(app);
    // const wss = new WebSocket.Server({ server });

    // server.listen(process.env.PORT || 8999, () => {
    //     console.log(`Server started on port`);
    //   });



    //////////////////////////////////////////////////////////////////////////////
    // HTTP access logger and live reloader
    // "combined": Apache standard combined log
    // "short": tiny log.
    logger.info(app.get('env'));
    if (app.get('env') != 'development') {
        const logDirectory = path.join(__dirname, './log');
        fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
        const accessLogStream = createStream('access.log', {
            size: '10MB',
            interval: '10d',
            compress: 'gzip',
            path: logDirectory
        });
        app.use(morgan("combined", { stream: accessLogStream }));
        context.port = 3150;
    } else {
        logger.warn("DEBUG: log: morgan");
        app.use(morgan("              morgan | => :method :url"));
        const livereload = await import("livereload");
        const connectLiveReload = require("connect-livereload");
        logger.warn("DEBUG: livereload");
        const liveReloadServer = livereload.createServer();
        liveReloadServer.server.once("connection", () => {
            setTimeout(() => {
                liveReloadServer.refresh("./");
            }, 100);
        });
        app.use(connectLiveReload());
        context.port = 3050;
    }



    //////////////////////////////////////////////////////////////////////////////
    // Create default users in development mode.
    if (app.get('env') != 'production') {
        for (const default_user of context.config.default_users) {
            const salt = GenerateSalt(64);
            const hash = HashPassword(default_user.password, salt, 'sha3-256');
            const update = {
                email: default_user.email,
                password_hash: hash,
                password_salt: salt,
                permission: default_user.permission,
            };
            const user = await ORM.user.upsert({
                where: { email: default_user.email },
                create: update,
                update: update,
            });
            logger.log("Registered:", user);
        }
    }

    logger.log("Server start");


    //////////////////////////////////////////////////////////////////////////////
    // Session store
    if (context.config.session_store.secret_key == "<your session secret key>") {
        console.error("You have to change session secret key.", context.config.session_store.secret_key);
    }
    const session_configuration = {
        secret: context.config.session_store.secret_key,
        name: app_name,
        resave: false, // true: force save if no change.  false: save at modified.
        rolling: false,
        saveUninitialized: false, // true: force create session every time. false: specify initialization when you need.
        proxy: true, // Allow nginx proxy.
        cookie: {
            path: "/",
            maxAge: 60 * 60 * 5000, // 5 hour
            httpOnly: true, // Prevent XSS.
            sameSite: true, // boolean/strict/lax/none
            secure: false, // true: required SSL to get a cookie. false: ignore ssl.
        },
        store: context.session_store,
    };

    //////////////////////////////////////////////////////////////////////////////
    // Allow proxy access
    // Browser => LoadBalancer => Express
    // Browser => Vite => Express
    // app.set('trust proxy', 'loopback') // trust first proxy
    app.set('trust proxy', true) // trust first proxy

    //////////////////////////////////////////////////////////////////////////////
    // Session/JSON/URL/Static
    app.use(session(session_configuration));
    app.use(express.json()); // Json body/response
    app.use(express.urlencoded({ extended: true })); // ?key1=value1&key2=value2 ...
    app.use(express.static(path.join(__dirname, 'public')))


    //////////////////////////////////////////////////////////////////////////////
    // Allow proxy access
    app.get('/', context.limiters.CommonLimiter, (req: Request, res: Response) => { res.send(TOP_DOCUMENT) });
    app.all('/v1/common/version', context.limiters.CommonLimiter, async (req: Request, res: Response) => { res.json({ error: null, version: APP_VERSION }); });
    app.all('/v1/common/heartbeat', context.limiters.CommonLimiter, async (req: Request, res: Response) => { res.json({ error: null, data: {} }); });


    // Register Rest APIs
    await UserAPI(context);
    await SSHKeyAPI(context);
    await PortMapAPI(context);
    await InstanceAPI(context);
    await ImageAPI(context);
    await ComputeNodeAPI(context);

    {
        for (const k in context.sub_apis) await context.sub_apis[k].initialize(context);
        for (const k in context.sub_apis) await context.sub_apis[k].register_rest_api(app);
    }

    // Listen
    const prefix = params.app_name;
    const port = params.port ?? context.port;
    app.listen(port, () => { logger.log(`Server Listen(HTTP1.1): ${port}\n    ${context.local_ipv4s.map((s: string) => "http://" + s + ":" + port + "/").join("    \n    ")}`) })
}



//////////////////////////////////////////////////////////////////////////////////////
// Single thread
const app_params = new AppParams();
main(app_params);

//////////////////////////////////////////////////////////////////////////////////////
// Multi thread thread. # session driver has to be redis/memcached. Don't use memory driver.
// import cluster from "express-cluster";
// const num_of_cluster = Number(process.env.NODE_CLUSTER ?? "1");
// if (num_of_cluster > 1) {
//     cluster(function (worker: any) {
//         logger.log("Worker:", worker.id);
//         app_params.worker = worker;
//         main(app_params);
//     }, { count: num_of_cluster })
// } else {
//     main(app_params);
// }
