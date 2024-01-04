import os from "os";
import fs from "fs";
import path from "path";

import util from "util";
import process from "node:process";
import commandExists from "command-exists";
import assert from "assert";
import WebSocket from "ws";
import G, { WSChannel } from "./global";
import logger from "./logger";

import * as pty from "node-pty";

import { Driver, CreateDriver } from "./drivers/driver";
import os_util from "os-utils";
// @ts-ignore
import node_df from "node-df";

const SHORT_TIME_FOR_DEBUG = 0.1;
const [HOST_NAME, PLATFORM, ARCH, CPU_NUM, CPU_MODEL, TOTAL_MEM] = [os.hostname(), os.platform(), os.arch(), os.cpus().length, os.cpus()[0].model, os.totalmem()];
const is_debug = process.env.NODE_ENV == "development" ? true : false;
const exec = util.promisify(require("child_process").exec);

export class ComputeNode {
    WSChannelTable = new Map<string, WSChannel>();
    config: any;
    driver: Driver;
    timers: any = {};
    web_socket_is_observing = false;
    ws: null | WebSocket = null;
    constructor(config: any) {
        this.config = config;
        this.driver = CreateDriver(config, config.driver);
    }

    async test() {
        return this.driver.test();
    }



    observe_websocket(url: string) {
        if (this.web_socket_is_observing) return;
        this.web_socket_is_observing = true;
        logger.error("observe_websocket:", url);
        const WSChannelTable = this.WSChannelTable;
        const ORIGIN_URL_OBJ = new URL(url);
        const WS_PROTOCOL = ORIGIN_URL_OBJ.protocol == "https:" ? "wss:" : "ws:";
        const WS_URL = `${WS_PROTOCOL}//${ORIGIN_URL_OBJ.host}${ORIGIN_URL_OBJ.pathname}ws/`;

        const ws = new WebSocket(WS_URL, {
            headers: { Cookie: G.GetClientCookie() }
        });
        ws.addEventListener("error", (event) => {
            console.log("WebSocket error: ", event);
        });


        ws.on("open", () => {
            logger.log("WS:open");
            ws.send(JSON.stringify({ event: "ping" }));
        });

        ws.on("error", (e) => {
            logger.error("WS:error", e);
        });

        ws.on("message", (data: string) => {
            try {
                const s_data = data.toString();
                const j = JSON.parse(s_data);
                const event = j.event;
                const node_id = j.node_id;
                const instance_id = j.instance_id;
                const channel_id = j.channel_id;
                const instance_key = j.instance_key;
                // logger.error(j);
                // console.log(j,s_data);
                // logger.log("---------------------------------------------------------",event);

                if (event == "term") {
                    const channel_ins = WSChannelTable.get(channel_id);
                    if (channel_ins) {
                        channel_ins.term.write(j.data);
                    }
                } else if (event == "resize") {
                    const channel_ins = WSChannelTable.get(channel_id);
                    if (channel_ins) {
                        channel_ins.term.resize(j.cols, j.rows);
                    }
                } else if (event == "open_terminal") {
                    // logger.log("---------------------------------------------------------",event);
                    const channel_ins = new WSChannel(channel_id, node_id, instance_id);
                    WSChannelTable.set(channel_id, channel_ins);
                    if (instance_id) {
                        logger.info("Open Instance:", instance_id, ":", instance_key, ":", channel_id);
                        const term = pty.spawn(
                            "docker",
                            ["exec", "-it", instance_key, "/bin/bash"],
                            {
                                name: "xterm-color",
                                cols: 80,
                                rows: 30,
                                // cwd: '/',
                                // env: process.env,
                            }
                        );
                        process.stdin.on("data", (data) => {
                            term.write(data.toString());
                        });
                        term.onData((data: any) => {
                            ws.send(JSON.stringify({ event: "term", node_id: node_id, instance_id: instance_id, channel_id: channel_id, data: data }));
                        });
                        channel_ins.term = term;
                    } else {
                        logger.info("Open Node Terminal:", node_id, ":", channel_id);
                        const term = pty.spawn(
                            'bash', [],
                            {
                                name: "xterm-color",
                                cols: 80,
                                rows: 30,
                                cwd: os.homedir(),
                                env: process.env,
                            }
                        );
                        process.stdin.on("data", (data) => {
                            term.write(data.toString());
                        });
                        term.onData((data: any) => {
                            ws.send(JSON.stringify({ event: "term", node_id: node_id, instance_id: instance_id, channel_id: channel_id, data: data }));
                        });
                        channel_ins.term = term;
                    }
                    ws.send(s_data);

                } else if (event == "pong") {
                    logger.log("WS:pong");
                } else if (event == "ping") {
                    logger.log("WS:ping");
                    ws.send(JSON.stringify({ event: "pong" }));
                } else if (event == "close") {
                    const channel_ins = WSChannelTable.get(channel_id);
                    if (channel_ins) {
                        channel_ins.term?.destroy?.();
                        WSChannelTable.delete(channel_id);
                    }
                }
            } catch (e) {
                logger.error(e);
            }
        });

        ws.on("close", (e) => {
            logger.log("WS:close", e);
            this.web_socket_is_observing = false;
            setTimeout(() => {
                this.observe_websocket(url);
            }, 2000);
        });

        this.ws = ws;

    }

    async update_network_info(config: any) {
        const tm = performance.now();

        const network_promises = [];

        network_promises.push(
            new Promise(async (resolve, reject) => {
                config.IPv4 = config.IPv4_CheckURL
                    ? await G.node_fetch(config.IPv4_CheckURL)
                        .then((res) => res.text())
                        .catch((e) => {
                            logger.log(e);
                        })
                    : null;
                while (!config.IPv4 && config.use_ipv4) {
                    config.IPv4 = config.IPv4_CheckURL
                        ? await G.node_fetch(config.IPv4_CheckURL)
                            .then((res) => res.text())
                            .catch((e) => {
                                logger.log(e);
                            })
                        : null;
                    if (config.IPv4) {
                        break;
                    }
                    await G.sleep(1000);
                }
                resolve(0);
            })
        );
        network_promises.push(
            new Promise(async (resolve, reject) => {
                config.IPv6 = config.IPv6_CheckURL
                    ? await G.node_fetch(config.IPv6_CheckURL)
                        .then((res) => res.text())
                        .catch((e) => {
                            logger.log(e);
                        })
                    : null;
                while (!config.IPv6 && config.use_ipv6) {
                    config.IPv6 = config.IPv6_CheckURL
                        ? await G.node_fetch(config.IPv6_CheckURL)
                            .then((res) => res.text())
                            .catch((e) => {
                                logger.log(e);
                            })
                        : null;
                    if (config.IPv6) {
                        break;
                    }
                    await G.sleep(1000);
                }
                resolve(0);
            })
        );
        const tcp_bounded_ipv4 = new Map<string, boolean>();
        const tcp_bounded_ipv6 = new Map<string, boolean>();
        const udp_bounded_ipv4 = new Map<string, boolean>();
        const udp_bounded_ipv6 = new Map<string, boolean>();
        for (const k in config.ipv4_ports) {
            const { range, protocol } = config.ipv4_ports[k];
            const [mn, mx] = range;
            network_promises.push(
                new Promise(async (resolve, reject) => {
                    const detected = await G.scan_ports("0.0.0.0", mn, mx, protocol);
                    for (const port in detected) {
                        protocol == "tcp" ? tcp_bounded_ipv4.set(port.toString(), true) : udp_bounded_ipv4.set(port.toString(), true);
                    }
                    resolve(0);
                })
            );
        }
        for (const k in config.ipv6_ports) {
            const { range, protocol } = config.ipv6_ports[k];
            const [mn, mx] = range;
            network_promises.push(
                new Promise(async (resolve, reject) => {
                    const detected = await G.scan_ports("::0", mn, mx, protocol);
                    for (const port in detected) {
                        protocol == "tcp" ? tcp_bounded_ipv6.set(port.toString(), true) : udp_bounded_ipv6.set(port.toString(), true);
                    }
                    resolve(0);
                })
            );
        }

        await Promise.all(network_promises);

        logger.success(config.IPv4, config.IPv6);

        logger.info("IPv4 pool:", config.ipv4_ports);
        logger.info("IPv6 pool:", config.ipv6_ports);
        logger.info("TCP-Listening(ipv4):", tcp_bounded_ipv4);
        logger.info("TCP-Listening(ipv6):", tcp_bounded_ipv6);
        logger.info("UDP-Listening(ipv4):", udp_bounded_ipv4);
        logger.info("UDP-Listening(ipv6):", udp_bounded_ipv6);
        config.tcp_bounded_ipv4 = tcp_bounded_ipv4;
        config.tcp_bounded_ipv6 = tcp_bounded_ipv6;
        config.udp_bounded_ipv4 = udp_bounded_ipv4;
        config.udp_bounded_ipv6 = udp_bounded_ipv6;
        logger.log("Network info updated in", G.Round(performance.now() - tm, 1), "ms");
    }

    async update_device_info(config: any) {
        const tm = performance.now();
        config.host_name = HOST_NAME;
        config.platform = PLATFORM;
        config.arch = ARCH;
        config.cpu = CPU_NUM;
        config.cpu_info = CPU_MODEL;
        config.memory = TOTAL_MEM;

        let available_nvidia = await commandExists("nvidia-smi").catch((e) => false);
        let available_radeon = await commandExists("rocm-smi").catch((e) => false);
        let available_nvidia_docker = await commandExists("nvidia-docker").catch((e) => false);
        let is_jetson = false;

        const dpkg = await commandExists("dpkg").catch((e) => false);
        if (dpkg) {
            await exec("dpkg --list | grep nvidia-jetpack")
                .then((r: any) => {
                    if (r.stdout.includes("nvidia-jetpack")) is_jetson = available_nvidia = available_nvidia_docker = true;
                })
                .catch((e: any) => { });
        }

        config.gpu = available_nvidia || available_radeon ? true : false;
        config.gpu_driver = available_nvidia ? "cuda" : available_radeon ? "rocm" : null;
        config.nvidia_docker = available_nvidia_docker ? true : false;

        if (available_nvidia) {
            let gpu_info = [];
            if (is_jetson) {
            } else {
                const ret = await exec("nvidia-smi -x -q");
                const xml = ret.stdout;
                const j: any = await G.xml2json(xml);
                const nvidia_smi_log = j.nvidia_smi_log;
                for (const gpu of nvidia_smi_log.gpu) {
                    const product_name = gpu.product_name?.[0];
                    const uuid = gpu.uuid?.[0];
                    const serial = gpu.serial?.[0];
                    const vram_usage = gpu.fb_memory_usage?.[0];
                    const vram_total = vram_usage.total?.[0];
                    const vram_free = vram_usage.free?.[0];
                    const vram_used = vram_usage.used?.[0];
                    const utilization = gpu.utilization?.[0];
                    const gpu_util = utilization.gpu_util?.[0];
                    const memory_util = utilization.memory_util?.[0];
                    const temperature = gpu.temperature?.[0];
                    const gpu_temp = temperature.gpu_temp?.[0];
                    const fan_speed = gpu.fan_speed?.[0];
                    const pci = gpu.pci[0];
                    const no_whitespace = (s: string) => s.replace(/\s/g, "");
                    if (product_name) gpu_info.push(`${product_name}`);
                    if (vram_total) gpu_info.push(no_whitespace(`[M:${vram_used}/${vram_total}]`));
                    if (gpu_util) gpu_info.push(no_whitespace(`[U:${gpu_util}]`));
                    if (gpu_temp) gpu_info.push(no_whitespace(`[T:${gpu_temp}]`));
                    if (fan_speed) gpu_info.push(no_whitespace(`[F:${fan_speed}]`));
                }
            }

            config.gpu_info = gpu_info.join(" ");
        } else if (available_radeon) {
            config.gpu_info = (await exec("rocm-smi")).stdout.trim().slice(0, 200); // TODO
        } else config.gpu_info = null;

        if (is_debug) logger.log("Device info updated in", G.Round(performance.now() - tm, 1), "ms");
    }

    async update_images(config: any) {
        const tm = performance.now();
        const driver = this.driver;
        const images = await driver?.list_image({});
        config.images = images;

        if (is_debug) logger.log("Images info updated in", G.Round(performance.now() - tm, 1), "ms");
    }

    async update_instances(config: any) {
        const tm = performance.now();
        const driver = this.driver;
        const instances = await driver?.list_instance({});
        const total = Math.floor(config.total_storage / 1024 / 1024);
        const free = Math.floor(config.free_storage / 1024 / 1024);

        for (const instance of instances ?? []) {
            if (instance.network_mode == "host") {
                instance.storage = instance.storage == -1 ? free : instance.storage;
                instance.total_storage = instance.total_storage == -1 ? total : instance.total_storage;
                instance.global_ipv4 = instance.global_ipv4 ?? config.IPv4;
                instance.global_ipv6 = instance.global_ipv6 ?? config.IPv6;
            }
        }
        config.instances = instances;
        if (is_debug) logger.log(`Instances(${instances.length}) info updated in`, G.Round(performance.now() - tm, 1), "ms");
    }

    async update_storage_usage_dynamic_info(config: any) {
        const tm = performance.now();
        const df = async (mount_point: string = "/"): Promise<any> => {
            return new Promise((resolve, reject) => {
                node_df((err: any, arr: any) => {
                    if (err) reject(err);
                    else {
                        for (const d of arr) {
                            if (d.mount == mount_point) {
                                return resolve({ total: d.size, free: d.available });
                            }
                        }
                        return resolve({ total: -1, free: -1 });
                    }
                });
            });
        };
        const { total, free } = await df("/");
        config.total_storage = total;
        config.free_storage = free;
        if (is_debug) logger.log("Storage usage info updated in", G.Round(performance.now() - tm, 1), "ms");
    }

    async update_cpu_usage_dynamic_info(config: any) {
        const tm = performance.now();
        function get_cpu_usage() {
            return new Promise((resolve, reject) => {
                os_util.cpuUsage((v: number) => {
                    resolve(v);
                });
            });
        }
        config.cpu_usages = await get_cpu_usage();
        if (is_debug) logger.log("CPU usage info updated in", G.Round(performance.now() - tm, 1), "ms");
    }

    async update_memory_usage_dynamic_info(config: any) {
        const tm = performance.now();
        config.memory_usages = (TOTAL_MEM - os.freemem()) / TOTAL_MEM;
        if (is_debug) logger.log("Memory usage info updated in", G.Round(performance.now() - tm, 1), "ms");
    }

    async login_with_api_key(api_key_id: string, api_key_secret: string, node_id: string): Promise<boolean | null> {
        const end_point = this.config.manipulator.end_point;
        try {
            const check_login = await G.node_fetch(path.join(end_point, "v1/user/check_login"), { method: "GET", headers: { Cookie: G.GetClientCookie(), "Content-Type": "application/json" }, credentials: "same-origin" })
                .then((res) => res.json())
                .then((j) => {
                    if (j.error) {
                        logger.error("   Error:", j.error);
                        return false;
                    }
                    return j.is_logged_in;
                })
                .catch((e) => {
                    logger.error(e);
                });
            if (check_login === true) return true;
            const body = JSON.stringify({ api_key_id, api_key_secret, node_id });
            return await G.node_fetch(path.join(end_point, "v1/user/login"), { method: "POST", headers: { Cookie: G.GetClientCookie(), "Content-Type": "application/json" }, body: body })
                .then(async (res) => {
                    logger.success("Login-StatusCode:", res.status);
                    if (res.status == 200) {
                        const _cookies = res.headers.get("set-cookie");
                        if (_cookies) {
                            G.SetClientCookie(_cookies);
                        }
                        return res.json();
                    }
                    logger.log("TEXT: ", await res.text());
                    return { error: "Request error." };
                })
                .then((j) => {
                    if (j.error) {
                        logger.error("   Error:", j.error);
                        return false;
                    }
                    return true;
                });
        } catch (e: any) {
            const code = e.cause?.code || e.code;
            if (code == "UND_ERR_HEADERS_TIMEOUT") {
                logger.error(" Login: Connection failed.");
                return null;
            } else if (code == "ECONNREFUSED" || code == "ECONNRESET" || code == "ECONNABORTED" || code == "EPIPE" || code == "UND_ERR_SOCKET") {
                logger.error(" Login: Connection failed.");
                return null;
            }
            logger.error(e);
            return false;
        }
    }

    async login_with_email_password(email: string, password: string): Promise<boolean | null> {
        const end_point = this.config.manipulator.end_point;
        try {
            const body = JSON.stringify({ email: email, password: password });
            return await G.node_fetch(path.join(end_point, "v1/user/login"), { method: "POST", headers: { Cookie: G.GetClientCookie(), "Content-Type": "application/json" }, body: body })
                .then(async (res) => {
                    logger.log("Login-StatusCode:", res.status);
                    if (res.status == 200) {
                        const _cookies = res.headers.get("set-cookie");
                        if (_cookies) G.SetClientCookie(_cookies);
                        return res.json();
                    }
                    logger.log("TEXT: ", await res.text());
                    return { error: "Request error." };
                })
                .then((j) => {
                    if (j.error) {
                        logger.error("   Error:", j.error);
                        return false;
                    }
                    return true;
                });
        } catch (e: any) {
            const code = e.cause?.code || e.code;
            if (code == "UND_ERR_HEADERS_TIMEOUT") {
                logger.error(" Login: Connection failed.");
                return null;
            } else if (code == "ECONNREFUSED" || code == "ECONNRESET" || code == "ECONNABORTED" || code == "EPIPE" || code == "UND_ERR_SOCKET") {
                logger.error(" Login: Connection failed.");
                return null;
            }
            logger.error(e);
            return false;
        }
    }

    async associate(config: any) {
        const manipulator = config.manipulator;
        const end_point = manipulator.end_point;
        const body_params = {
            node_id: config.node_id,
            name: config.host_name,
            use_ipv4: config.use_ipv4,
            use_ipv6: config.use_ipv6,
            ipv4: config.IPv4,
            ipv6: config.IPv6,
            platform: config.platform,
            arch: config.arch,
            cpu: config.cpu,
            cpu_info: config.cpu_info,
            memory: Math.floor(config.memory / 1024 / 1024), //MB
            total_storage: Math.floor(config.total_storage / 1024 / 1024), //GB
            free_storage: Math.floor(config.free_storage / 1024 / 1024), //GB
            gpu: config.gpu,
            gpu_info: config.gpu_info,
            gpu_driver: config.gpu_driver,
            nvidia_docker: config.nvidia_docker,
            manipulator_driver: config.driver,
            images: config.images,
            instances: config.instances,
            ipv4_ports: config.ipv4_ports,
            ipv6_ports: config.ipv6_ports,
            tcp_bounded_ipv4: config.tcp_bounded_ipv4,
            tcp_bounded_ipv6: config.tcp_bounded_ipv6,
            udp_bounded_ipv4: config.udp_bounded_ipv4,
            udp_bounded_ipv6: config.udp_bounded_ipv6,
            memory_usages: config.memory_usages,
        };
        assert.notEqual(body_params.node_id, undefined);
        assert.notEqual(body_params.name, undefined);
        assert.notEqual(body_params.ipv4, undefined);
        if (config.use_ipv6) {
            assert.notEqual(body_params.ipv6, undefined);
        }
        assert.notEqual(body_params.platform, undefined);
        assert.notEqual(body_params.arch, undefined);
        assert.notEqual(body_params.manipulator_driver, undefined);
        assert.notEqual(body_params.images, undefined);
        assert.notEqual(body_params.instances, undefined);

        const node = await G.HTTP_POST(path.join(end_point, "v1/compute_node/associate"), body_params);
        if (node.error) {
            logger.error(" Associate Error:", node.error);
        } else {
            logger.success(` Sent device infos and associated as "${config.host_name}".`);
        }
    }

    async start_long_polling(config: any) {
        const manipulator = config.manipulator;
        const end_point = manipulator.end_point;
        const driver = this.driver;

        if (this.timers.cpu) clearInterval(this.timers.cpu);
        this.timers.cpu = setInterval(() => {
            this.update_cpu_usage_dynamic_info(config);
        }, 1000 * 60 * 2);
        if (this.timers.memory) clearInterval(this.timers.memory);
        this.timers.memory = setInterval(() => {
            this.update_memory_usage_dynamic_info(config);
        }, 1000 * 60 * 2);
        if (this.timers.storage) clearInterval(this.timers.storage);
        this.timers.storage = setInterval(() => {
            this.update_storage_usage_dynamic_info(config);
        }, 1000 * 60 * 2);
        if (this.timers.image_and_containers) clearInterval(this.timers.image_and_containers);
        this.timers.image_and_containers = setInterval(() => {
            this.update_instance_and_image_status(config);
        }, 1000 * 60 * 2);

        const loop = async (response: Array<any> = []) => {
            logger.log("Try to subscribe: polling.....\n", path.join(end_point, "v1/compute_node/subscribe"));
            G.HTTP_POST(path.join(end_point, "v1/compute_node/subscribe"), { node_id: config.node_id, events: response })
                .then(async (j) => {
                    if (j.error) {
                        if (j.error_code == "x2TpbFQruG") {
                            // Session expired
                            logger.error(j.error);
                            this.login_with_api_key(config.api_key_id, config.api_key_secret, config.node_id).then((r) => {
                                logger.success(" Login:", r);
                                if (r === true) {
                                    setTimeout(loop, 1000);
                                } else if (r === false) {
                                    logger.error(" Login failed.");
                                    logger.error("\n Exit.\n\n\n");
                                    process.exit(1);
                                } else {
                                    setTimeout(loop, 5000);
                                }
                            });
                        } else if (j.error == "GATEWAY_TIMEOUT") {
                            logger.log("Poll(timeout)");
                            setTimeout(loop, 1);
                        } else {
                            logger.error(j.error);
                            if (j.error == "Invalid node_id.") {
                                logger.error(" Available node_id does not exist in the server.");
                                logger.error(" Please make a new node_id before start the node.");
                                logger.error(" Exit.");
                                process.exit(1);
                                return;
                            }
                            setTimeout(loop, 5000);
                        }
                    } else {
                        const events = j.events;
                        logger.log(events);
                        if (events && Array.isArray(events)) {
                            for (const event of events) {
                                try {
                                    const params = event.data;
                                    if (params.method == "ping") {
                                        event.result = "pong";
                                        // } else if (params.method == "refresh") {
                                        //     await this.refresh(config);
                                        //     event.result = "ok";
                                    } else {
                                        event.result = await driver?.handle_event(event.data);
                                    }
                                    await this.refresh(config);
                                    // {request_id,data,result};
                                } catch (e: any) {
                                    event.error = e; // TODO: Error code
                                    logger.error(e);
                                }
                            }

                            setTimeout(() => {
                                loop(events);
                            }, 1);
                        } else {
                            logger.error(" Invalid events");
                            setTimeout(loop, 5000);
                        }
                    }
                })
                .catch((e: any) => {
                    const code = e.cause?.code || e.code;
                    if (code == "UND_ERR_HEADERS_TIMEOUT") {
                        logger.log("Poll(timeout)");
                        setTimeout(loop, 1);
                    } else if (code == "ECONNREFUSED" || code == "ECONNRESET" || code == "ECONNABORTED" || code == "EPIPE") {
                        logger.error(" Subscribe: Connection failed.", code);
                        setTimeout(loop, 5000 * SHORT_TIME_FOR_DEBUG);
                    } else if (code == "UND_ERR_SOCKET") {
                        logger.error(" Subscribe: Disconnected.", code);
                        setTimeout(() => {
                            this.start();
                        }, (10000 + Math.random() * 10000) * SHORT_TIME_FOR_DEBUG);
                    } else {
                        logger.error(e);
                        setTimeout(loop, 5000 * SHORT_TIME_FOR_DEBUG);
                    }
                });
        };
        let counter = 1;
        while (1) {
            const logged_in = await this.login_with_api_key(config.api_key_id, config.api_key_secret, config.node_id);
            if (logged_in === true) {
                logger.success(`First login:(${counter++})`, logged_in);
                await this.associate(config);
                if (this.timers.associate) clearInterval(this.timers.associate);
                this.timers.associate = setInterval(() => {
                    this.associate(config);
                }, 1000 * 60 * 5 + Math.random() * 1000 * 60 * 2);
                break;
            } else if (logged_in === false) {
                logger.error(" Login failed.");
                logger.error("\n Exit.\n\n\n");
                process.exit(1);
            } else {
                logger.error(` First login:(${counter++})`, logged_in);
                await G.sleep(1000 * (5 + Math.min(counter * counter, 30)));
            }
        }
        this.observe_websocket(config.manipulator.end_point);

        await loop();
    }

    async refresh(config: any) {
        const compute_node = this;
        logger.log(`Update device infos`);
        await Promise.all([compute_node.update_network_info(config), compute_node.update_device_info(config), compute_node.update_cpu_usage_dynamic_info(config), compute_node.update_memory_usage_dynamic_info(config), compute_node.update_storage_usage_dynamic_info(config)]);
        logger.log(`Update instances.`);
        await this.update_instance_and_image_status(config);
    }

    async update_instance_and_image_status(config: any) {
        const compute_node = this;
        await Promise.all([compute_node.update_images(config), compute_node.update_instances(config)]);
    }

    async start() {
        const config = this.config;
        const compute_node = this;
        await compute_node.refresh(config);
        // Ignore driver mismatch and no GPU. Just check gpu manipulator commands.
        compute_node.start_long_polling(config);

    }
}