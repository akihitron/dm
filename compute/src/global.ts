
import xml2js from "xml2js";
import crypto from "crypto";
import fs from "fs";
import util from "util";

import logger from "./logger";

// For nodejs 16-
import _node_fetch from "isomorphic-fetch";
export const node_fetch = _node_fetch;
const exec = util.promisify(require("child_process").exec);

export class WSChannel {
    id: string;
    node_id: string;
    instance_id: string | null;
    term: any;
    constructor(id: string, node_id: string, instance_id: string | null) {
        this.id = id;
        this.node_id = node_id;
        this.instance_id = instance_id;
    }
}

function SecureHash(s: string) {
    return crypto.createHash("sha3-256").update(s).digest("hex");
}

function xml2json(xml: string) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

let tmp_cookie_path = "";
let ClientCookie: string = fs.existsSync(tmp_cookie_path) ? fs.readFileSync(tmp_cookie_path).toString() : "";
function GetClientCookie(): string {
    return ClientCookie;
}
function SetClientCookie(cookie:string): string {
    ClientCookie = cookie;
    fs.writeFileSync(tmp_cookie_path, cookie);
    return cookie;
}
function SetTmpCookiePath(path:string) {
    tmp_cookie_path = path;
}
async function HTTP_POST(url: string, body: any) {
    logger.log("POST:", url);
    const body_params = JSON.stringify(body);
    return await node_fetch(url, { method: "POST", headers: { Cookie: ClientCookie, "Content-Type": "application/json" }, credentials: "same-origin", body: body_params }).then(async (res) => {
        if (res.status != 200) {
            if (res.status == 504) {
                // Gateway timeout
                logger.log("Gateway timeout(504)");
                return { error: "GATEWAY_TIMEOUT" };
            } else {
                logger.log(url, "Status:", res.status);
                logger.log(await res.text());
            }
        }
        return res.json();
    });
}

async function HTTP_GET(url: string, body: any) {
    const query = Object.keys(body)
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(body[k]))
        .join("&");
    return await node_fetch(url + "?" + query, { method: "GET", headers: { Cookie: ClientCookie, "Content-Type": "application/json" }, credentials: "same-origin" }).then((res) => res.json());
}

async function sleep(s: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, s);
    });
}

function Round(number: number, decimalPlaces: number) {
    const factor = 10 ** decimalPlaces;
    return Math.floor(number * factor) / factor;
}

async function scan_ports(host: string, mn: number, mx: number, protocol: string = "tcp") {
    const listening_ports = new Map();
    for (let i = mn; i <= mx; i++) {
        try {
            if (protocol == "tcp") {
                const scanned = await exec(`nc -zv ${host} ${i}`);
                listening_ports.set(i, scanned);
            } else {
                // TODO: its too slower than tcp
                const scanned = await exec(`nc -zvu ${host} ${i}`);
                listening_ports.set(i, scanned);
            }
        } catch (e) {
            // Ignore
        }
    }
    return listening_ports;
}


export default {
    Round,
    sleep,
    HTTP_GET,
    HTTP_POST,
    SetClientCookie,
    GetClientCookie,
    SetTmpCookiePath,
    SecureHash,
    WSChannel,
    xml2json,
    node_fetch,
    scan_ports,
}