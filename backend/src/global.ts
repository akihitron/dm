import crypto from "crypto";
import session from "express-session";
import { spawn, exec } from "child_process";
import util from 'util';

import express, { Express, Request, Response, NextFunction } from "express";
import instance from "rest/instance";
import WebSocket from "ws";
import logger from "./logger";


const exec_p = util.promisify(exec);



///////////////////////////////////////////////////////////////////////////////////////////
// Application Args
export class AppParams {
    app_name = "unknown";
    server_name = "Server";
    worker = { id: 1 };
    port: number | null = null;

    init = {
        session_store: true,
        database: true,
    };
}

///////////////////////////////////////////////////////////////////////////////////////////
// Main Context
export class MainContext {
    worker_id = -1;
    app: Express | null = null;
    config: any = null;
    db: any = null;
    port: number = 3050;
    model: any = null;
    local_ipv4s: string[] = [];
    close = () => {};
    email: string | null = null;
    message_adapter: any = null;
    session_store: any = new session.MemoryStore();
    limiters: any = {};
    sub_apis: any = {};
    clear_sessions: () => void = () => {};
}

export function GenerateUUID() {
    return crypto.randomUUID().replace(/-/g, "");
}

export function HashPassword(password: string, salt: string, algo: string = "sha3-256") {
    const hash = crypto.createHmac(algo, salt);
    hash.update(password);
    const value = hash.digest("hex");
    return value;
}

export function GenerateSalt(length: number = 64) {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length);
}

export function RejectNotLoggedIn(req: Request, res: Response, next: NextFunction) {
    const session = req.session as any;
    if (session?.user?.hash == null) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logger.error(`Rejected:(IP:${clientIp})`);
        return res.json({ error: "The session has already expired or does not exist account.", error_code: "x2TpbFQruG" })
    }
    session.views = session.views == null ? 1 : session.views + 1; // Update maxAge
    session.touch(); // Update maxAge
    next();
}

export function RejectNotLoggedInForWS(ws: WebSocket, req: Request, next: NextFunction) {
    const session = req.session as any;
    if (session?.user?.hash == null) return ws.close(1000, "The session has already expired or does not exist account.");
    session.views = session.views == null ? 1 : session.views + 1; // Update maxAge
    session.touch(); // Update maxAge
    next();
}

export function RejectAPIKeyLoggedIn(req: Request, res: Response, next: NextFunction) {
    const session = req.session as any;
    if (session.user.is_api_key_session) return res.json({ error: "Permission denied." });
    next();
}

export function CheckAdmin(req: Request, res: Response, next: NextFunction) {
    const session = req.session as any;
    if (session?.user?.is_administrator != true) return res.json({ error: "Permission denied." });
    next();
}


export async function ScanPort(host: string, mn: number, mx: number, protocol: string = "tcp") {
    const listening_ports = new Map();
    for (let i = mn; i <= mx; i++) {
        try {
            if (protocol == "tcp") {
                const scanned = await exec_p(`nc -zv ${host} ${i}`);
                listening_ports.set(i, scanned);
            } else {
                // TODO: its too slower than tcp
                const scanned = await exec_p(`nc -zvu ${host} ${i}`);
                listening_ports.set(i, scanned);
            }
        } catch (e) {
            // Ignore
        }
    }
    return listening_ports;
}

export async function GetAvailablePort(port: number) {
    for (let i = 0;i<10;i++) {
        const listening_ports = await ScanPort("0.0.0.0", port + i, port + i, "tcp");
        if (listening_ports.get(port+i)) {
            logger.log(`Port ${port + i} is already in use.`);
            continue;
        } else {
            return port + i;
        }
    }
    throw new Error(`No available port found in range ${port} - ${port + 10}`);
}



export async function s_exe_s(command: string) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, { stdio: "inherit", shell: true });
        child.on("close", (code) => {
            if (code != 0) {
                console.log(`Child process exited with code ${code}`);
            }
            resolve(code);
        });
    });
}

export async function s_exe(command: string, args: Array<string>) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: "inherit" });
        child.on("close", (code) => {
            if (code != 0) {
                console.log(`Child process exited with code ${code}`);
            }
            resolve(code);
        });
    });
}

// TODO: Recursive check and check total length.
export function CheckJSONProperties(args: Array<string | any>, req: Request) {
    const json = req.body;
    const lacked_props = [];
    const ret: any = {};
    for (const arg of args) {
        const is_object = typeof arg == "object";
        const is_null = arg == null; // null or undefined
        const key = is_object ? arg["key"] : arg;
        let max_length = 256;
        let ignore = false;
        if (is_object) {
            max_length = arg["max_length"] || 256;
            if (arg["nullable"] != true) {
                if (json[key] == null) {
                    lacked_props.push(key);
                    continue;
                }
            } else {
                ignore = true;
            }
        }
        if (json.hasOwnProperty(key)) {
            const s = String(json[key]);
            if (s.length > max_length) {
                ret["_error_"] = `Max length of ${key} is 256.`;
                return ret;
            }
            ret[key] = json[key];
        } else {
            if (!ignore) {
                lacked_props.push(key);
            }
        }
    }
    ret["_error_"] = lacked_props.length > 0 ? `Required: ${lacked_props.join(",")} props` : null;
    return ret;
}

export class Event {
    // Data Block
    request_id: string = crypto.randomUUID();
    request_data: any = {};

    timestamp: number = Date.now();
    response_data: any = undefined; // {error:null, data:any}
    callback: any;

    // error: any = undefined;
    // callback: undefined|(event:Event)=>void = undefined;
}

export class WSChannel {
    id: string;
    node_id: string | null = null;
    instance_id: string | null = null;
    left_queue: Array<any> = [];
    right_queue: Array<any> = [];
    last_updated: number = Date.now();
    client_ws: WebSocket | null = null;
    server_ws: WebSocket | null = null;
    constructor(channel_id: string) {
        this.id = channel_id;
    }
    update() {
        if (this.client_ws) {
            if (this.left_queue.length > 0) {
                for (const data of this.left_queue) {
                    this.client_ws.send(data);
                }
                this.left_queue = [];
            }
        }
        if (this.server_ws) {
            if (this.right_queue.length > 0) {
                for (const data of this.right_queue) {
                    this.server_ws.send(data);
                }
                this.right_queue = [];
            }
        }
    }
}

export class Node {
    node_id: string | null = null;
    event_table: Map<string, Event> = new Map();

    channel_table: Map<string, WSChannel> = new Map();

    server_ws: WebSocket | null = null;
    

    connector: any = null;

    last_updated: number = Date.now();
    status: string = "Unknown";

    send_queue: Array<any> = [];

    send(params: any, callback: any) {
        const event = new Event();
        event.request_data = params;
        event.callback = callback;
        const ev = { request_id: event.request_id, data: event.request_data };
        if (this.connector) {
            this.connector.send({ events: [ev] }); // {method:"list_image", params:{}}
        } else {
            this.send_queue.push(ev);
        }
        this.event_table.set(event.request_id, event);
    }

    send_and_wait(message: any): Promise<Event> {
        return new Promise((resolve, reject) => {
            this.send(message, async (event: Event) => {
                resolve(event);
            });
        });
    }

    recv(data: any) {
        if (data.request_id) {
            const event = this.event_table.get(data.request_id);
            if (event) {
                event.response_data = data;
                event.callback?.(event);
                this.event_table.delete(data.request_id);
            }
        }
        this.last_updated = Date.now();
    }

    update() {
        if (this.connector && this.send_queue.length > 0) {
            this.send_queue = [];
            this.connector.send({ events: this.send_queue });
            this.connector = null;
            this.last_updated = Date.now();
        }
    }
}
