import os from "os";
import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import Config from "./config";
import util from "util";
import process from "node:process";


import net from "node:net";
import url from "url";
import { Express } from "express";
import logger from "./logger";

import G from "./global";

// Asset bundle
import { help_text } from "./help";

import ConfigureServer from "./configure";
import { ComputeNode } from "./node";


const exec = util.promisify(require("child_process").exec);
const is_debug = process.env.NODE_ENV == "development" ? true : false;

const HOST_NAME = os.hostname();

const argv: any = yargs(hideBin(process.argv)).argv;
const verbose = argv.verbose;
const setup = argv.setup;
const version = argv.v || argv.version;
const config_path = argv.c || argv.config;
const help_flag = argv.h || argv.help;

if (help_flag) {
    console.log(help_text);
    process.exit(0);
}
if (version) {
    console.log("Version:", require("../package.json").version);
    process.exit(0);
}

export const APP_NAME = "dmc";

async function main() {
    const config = Config(APP_NAME, { silent: !verbose, config_path: config_path });

    if (config.node_id == null) {
        logger.error("node_id is not set.");
        process.exit(1);
    }
    if (config.manipulator?.end_point == null) {
        logger.error("manipulator.end_point is not set.");
        process.exit(1);
    }
    if (config.api_key_id == null) {
        logger.error("api_key_id is not set.");
        process.exit(1);
    }
    if (config.api_key_secret == null) {
        logger.error("api_key_secret is not set.");
        process.exit(1);
    }
    if (config.ipv4_ports == null) {
        logger.error("ipv4_ports is not set.");
        process.exit(1);
    }

    {
        const k = "node_id";
        const s = config[k];
        if (s.indexOf("<") >= 0) {
            logger.error(`Invalid "${k}" : "${config[k]}"`);
            process.exit(1);
        }
    }
    {
        const k = "api_key_id";
        const s = config[k];
        if (s.indexOf("<") >= 0) {
            logger.error(`Invalid "${k}" : "${config[k]}"`);
            process.exit(1);
        }
    }
    {
        const k = "api_key_secret";
        const s = config[k];
        if (s.indexOf("<") >= 0) {
            logger.error(`Invalid "${k}" : "${config[k]}"`);
            process.exit(1);
        }
    }

    {
        const end_point = config.manipulator.end_point;
        const parsedUrl = url.parse(end_point);
        const hostname = parsedUrl.hostname as string;
        const port = parseInt(parsedUrl.port ?? "80");
        const connection_status = await new Promise((resolve, reject) => {
            const client = net.createConnection({ host: hostname, port: port, timeout: 1000 }, () => {
                client.end();
                resolve(true);
            });
            client.on("error", (err: any) => {
                if (err.code != "ECONNREFUSED") {
                    console.error("Error:", err);
                }
                resolve(false);
            });
            client.on("timeout", () => {
                console.error("Timeout");
                client.destroy();
                resolve(false);
            });
        });
        if (connection_status == false) {
            logger.error("Cannot connect to the manipulator:", end_point);
            process.exit(1);
        }
        logger.success(`Successfully connected to the manipulator:`, end_point);
    }

    config.use_ipv4 = config.use_ipv4 ?? true;
    config.use_ipv6 = config.use_ipv6 ?? false;
    config.driver = config.driver ?? "docker";
    config.IPv4_CheckURL = config.IPv4_CheckURL ?? "https://api.ipify.org";
    config.IPv6_CheckURL = config.IPv6_CheckURL ?? "https://api64.ipify.org";
    logger.log("IPv4_CheckURL:", config.IPv4_CheckURL);
    logger.log("IPv6_CheckURL:", config.IPv6_CheckURL);

    // Prevent double process: fd lock style.
    if (true) {
        const PORT = 48571; // TODO: Change to more smart way.
        const server = require("http").createServer();
        server.listen(PORT, "127.0.0.1");
        server.on("error", (error: any) => {
            if (error.code === "EADDRINUSE") {
                logger.error("");
                logger.error("Detected duplicate process.");
                logger.error("");
                logger.error("Exit...");
                process.exit(1);
            } else {
                logger.error("An error occurred:", error.message);
            }
        });
    }

    G.SetTmpCookiePath(path.join(os.tmpdir(), G.SecureHash(HOST_NAME + config.node_id)));
    const compute_node = new ComputeNode(config);
    if (await compute_node.test()) {
        compute_node.start();
    } else {
        logger.error(" Driver test failed.");
        logger.error(" Exit.");
        process.exit(1);
    }

    return true;
}


if (require.main === module) {
    if (setup) {
        ConfigureServer();
    } else {
        main();
    }
}
