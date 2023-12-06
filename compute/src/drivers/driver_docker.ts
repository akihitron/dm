import os from "os";
import fs from "fs";
import Docker, { Container } from "dockerode";
import childProcess, { spawn } from "child_process";
import util from "util";
import { Driver, Image, Instance, InstanceState } from "./driver";
import logger from "../logger";
import crypto from "crypto";

const DOCKER_COMMAND = "docker";

const exec = util.promisify(childProcess.exec);

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

class CommandHelper {
    bin: string;
    _install: string;
    _update: string;
    _upgrade: string;
    _remove: string;
    sudo: string = "";
    instance_key: string = "";
    constructor(bin: string, install: string, update: string, upgrade: string, remove: string) {
        this.bin = bin;
        this._install = install;
        this._update = update;
        this._upgrade = upgrade;
        this._remove = remove;
    }
    _spawn(execute_command: string): Promise<string | null> {
        return new Promise(async (resolve, reject) => {
            // const command: Array<string> = [];
            // const add_command = (cmd: string) => { if (cmd.length > 0) command.push(cmd) };
            // add_command(DOCKER_COMMAND);
            // add_command("exec");
            // add_command(this.instance_key);
            // add_command("bash");
            // add_command("-c");
            // const sub_cmd = `${this.sudo} ${execute_command}}`.trim();
            // add_command(`"${sub_cmd}"`);
            // logger.info(command.join(" "));
            // await sleep(1000);
            logger.info(execute_command);
            // const childProcess = spawn(execute_command, {shell:true});
            const childProcess = spawn(`${DOCKER_COMMAND} exec "${this.instance_key}" bash -c "${execute_command}"`, { shell: true, stdio: "inherit" });
            // const childProcess = spawn(command.shift() as string, command, {shell:true, stdio: 'inherit'}});
            // childProcess.stdout.on('data', (data) => process.stdout.write(data));
            // childProcess.stderr.on('data', (data) => process.stderr.write(data));
            childProcess.on("close", (code) => {
                logger.log(`child process exited with code ${code}`);
                resolve("");
            });
        });
    }
    async _exec(execute_command: string, ignore: boolean = false): Promise<string | null> {
        const SUB_CMD = `${this.sudo} ${execute_command}`.trim();
        logger.log(SUB_CMD, "....");
        if (ignore) {
            try {
                const ret = await exec(`${DOCKER_COMMAND} exec "${this.instance_key}" bash -c "${SUB_CMD}"`);
                logger.log(" \t", SUB_CMD, " => Done.");
                return ret.stdout;
            } catch (e) {
                logger.log(" \t", SUB_CMD, " => Ignore.");
                return null;
            }
        }
        const ret = await exec(`${DOCKER_COMMAND} exec "${this.instance_key}" bash -c "${SUB_CMD}"`);
        logger.log(" \t", SUB_CMD, " => Done.");
        return ret.stdout;
    }

    install(packages: Array<string>): Promise<string | null> {
        // return this._exec(`${this.sudo} ${this._install} ${packages.join(" ")}`);
        return this._spawn(`${this.sudo} ${this._install} ${packages.join(" ")}`);
    }
    update_catalog(): Promise<string | null> {
        if (this._update.length > 0)
            // return this._exec(`${this.sudo} ${this._update}`);
            return this._spawn(`${this.sudo} ${this._update}`);
        return Promise.resolve(null);
    }
    upgrade(packages: Array<string> = []): Promise<string | null> {
        // return this._exec(`${this.sudo} ${this._upgrade} ${packages.join(" ")}`);
        return this._spawn(`${this.sudo} ${this._upgrade} ${packages.join(" ")}`);
    }
    remove(packages: Array<string>): Promise<string | null> {
        // return this._exec(`${this.sudo} ${this._remove} ${packages.join(" ")}`);
        return this._spawn(`${this.sudo} ${this._remove} ${packages.join(" ")}`);
    }
}

const CommandHelperTable = [new CommandHelper("apt-get", "apt-get install -y", "apt-get update", "apt-get upgrade -y", "apt-get purge -y"), new CommandHelper("yum", "yum install -y", "", "yum update -y", "yum erase -y")];

function which(name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        childProcess.exec(`command -v ${name}`, (err, stdout, stderr) => {
            if (err) {
                logger.error(err);
                resolve(false);
            } else {
                resolve(stdout.length > 0);
            }
        });
    });
}

const docker_witch = (command: string, instance_key: string) => {
    return new Promise((resolve, reject) => {
        console.log(`${DOCKER_COMMAND} exec "${instance_key}" bash -c  "command -v ${command}"`);
        childProcess.exec(`${DOCKER_COMMAND} exec "${instance_key}" bash -c  "command -v ${command}"`, (err, stdout, stderr) => {
            if (err) {
                logger.log(err);
                resolve(false);
            } else {
                logger.log(stdout);
                resolve(stdout.length > 0);
            }
        });
    });
};

function _getContainerByName(docker: any, name: string): Promise<any> {
    return new Promise((resolve, reject) => {
        docker.listContainers({ all: true }, function (err: any, containers: any) {
            if (err) {
                reject(err);
            } else {
                const container_info = containers.filter((container: any) => container.Names.includes("/" + name))[0];
                // logger.log(container_info,containers);
                if (container_info) {
                    const container = docker.getContainer(container_info.Id);
                    resolve(container);
                } else {
                    resolve(null);
                }
            }
        });
    });
}

function _create_image_info(d_image: any): Image {
    const img = new Image();
    img.key = d_image.Id;
    img.name = d_image.RepoTags?.length > 0 ? d_image.RepoTags[0] : "<none>:<none>";
    img.status = d_image.status;
    img.size = Math.floor(d_image.Size / 1024 / 1024);
    img.timestamp = new Date(d_image.Created * 1000);
    return img;
}

async function _create_container_info(docker: any, d_ins: any): Promise<Instance> {
    const ins = new Instance();
    // logger.log(d_ins);
    ins.key = d_ins.Id;
    let d_name = d_ins.Name;
    if (!d_name) {
        d_name = d_ins.Names.pop();
    }
    if (d_name && d_name[0] == "/") {
        d_name = d_name.substr(1);
    }
    ins.name = d_name ? d_name : "<none>";
    const D_State = d_ins.State;
    if (D_State == "running" || D_State == "created") {
        ins.state = InstanceState.RUNNING;
    } else if (D_State == "dead" || D_State == "exited") {
        ins.state = InstanceState.STOPPED;
    } else if (D_State == "paused") {
        ins.state = InstanceState.PAUSED;
    } else {
        ins.state = InstanceState.UNKNOWN;
    }
    //logger.log(d_ins);
    ins.status = d_ins.Status;
    ins.command = d_ins.Command;
    ins.network_mode = d_ins.HostConfig?.NetworkMode;
    ins.mount_infos = JSON.stringify(d_ins.Mounts);

    ins.cpu = os.cpus().length;
    ins.memory = os.totalmem() / 1024 / 1024;
    ins.storage = -1; // /1024/1024/1024

    if (ins.network_mode == "host") {
    } else {
        // TODO: v4/v6
        ins.local_ipv4 = d_ins.NetworkSettings?.Networks?.bridge?.IPAddress;
    }
    // logger.log(d_ins);
    const image = docker.getImage(d_ins.Image);
    // const image = docker.getImage(d_ins.ImageID);
    const d_image = await image.inspect();
    ins.image = _create_image_info(d_image);
    // ins.size = d_container.Size;
    // ins.timestamp = new Date(d_container.Created * 1000);
    // return img;
    return ins;
}

export class DockerDriver implements Driver {
    config: any;

    constructor(config: any) {
        this.config = config;
    }

    async init() {
        const docker = new Docker();
        const default_images = ["ubuntu:22.04", "ubuntu:20.04", "centos:7"];
        logger.log("Initializing default images... ");
        let exist_images: Array<String> = [];
        const images = await docker.listImages();
        for (let i = 0; i < images.length; i++) {
            const names = images[i].RepoTags as Array<String>;
            exist_images = exist_images.concat(names);
        }
        images.forEach(function (image: any) {
            const img = new Image();
            img.key = image.Id;
            img.name = image.RepoTags;
            img.status = image.status;
            img.size = image.Size;
            img.timestamp = new Date(image.Created * 1000);
        });

        for (const default_image of default_images) {
            if (exist_images.includes(default_image) == false) {
                logger.log("Pulling default image: " + default_image);
                await docker.pull(default_image);
            }
        }
    }

    async test(): Promise<boolean> {
        return await which("docker");
    }

    async list_image(params: any): Promise<Image[]> {
        const docker = new Docker();
        const ret: Image[] = [];
        const images = await docker.listImages();
        images.forEach(function (image: any) {
            ret.push(_create_image_info(image));
        });
        return ret;
    }

    async delete_image(params: any): Promise<Image | null> {
        const docker = new Docker();
        try {
            const image = docker.getImage(params.key);
            await image.remove(params.key);
            return _create_image_info(image);
        } catch (e) {
            logger.log(e);
        }
        return null;
    }

    async create_instance(params: any): Promise<Instance | null> {
        const docker = new Docker();
        const image_key = params.image_key;
        const name = params.name;
        const ssh = params.ssh;
        const cpu = params.cpu; // (float)
        const memory = params.memory; // (int)MB
        const storage = params.storage; // (int)GB
        const accelerator = params.accelerator; // rocm/nvidia/cpu
        const network_mode = params.network_mode; // host/bridge

        const privileged = params.privileged ?? true; // Notice: for SSHD

        const need_sudo = params.sudo ?? false;
        const mount_host_dir = params.mount_host_dir ?? false;
        const docker_version = (await docker.version()).Version;
        const major_version: number = parseInt(docker_version.split(".")[0]);
        const minor_version: number = parseInt(docker_version.split(".")[1]);
        const patch_version: number = parseInt(docker_version.split(".")[2]);

        const c_params = params.params; // Special sub command
        const command = c_params.command;
        const args = c_params.args;
        const os_hint = c_params.os_hint ?? "ubuntu";

        let instance_key;

        if (image_key == null) throw new Error("Image key is null");
        if (name == null) throw new Error("Instance name is null");
        if (1) {
            const container_name = name;
            const home_dir = os.homedir();
            const workspace = "/root";
            const image = image_key;
            const mounts: Array<string> = [];
            let accelerator_param = "";
            if (accelerator && accelerator != "cpu") {
                // Notice:
                //  Actually ipc is not recommended, but this service is for inner members.
                //  And machine learning needs a lot of memory, its better to use ipc(share memory) host.
                // See: https://docs.docker.com/engine/reference/run/#ipc-settings---ipc

                if (major_version < 19 || (major_version == 19 && minor_version < 3)) {
                    throw new Error("Does not support a gpu passthrough.");
                }

                // --gpus option is not supported in less than 19.03.
                if (accelerator == "cuda") {
                    accelerator_param = `--gpus all --ipc="host"`;
                } else if (accelerator == "rocm") {
                    accelerator_param = `--device=/dev/kfd --device=/dev/dri --group-add video --ipc="host"`;
                } else {
                    throw new Error("Unknown accelerator");
                }
            }

            if (mount_host_dir) {
                mounts.push(`-v ${home_dir}:/root/host`);
                logger.log("Mount host");
            } else {
                logger.log("No mount host");
            }
            const instance_list = await this.list_instance({});
            if (instance_list.filter((instance) => instance.name == container_name)[0]) {
                throw new Error("Container name conflict");
            }

            const cpu_param = cpu ? `--cpus=${Math.max(cpu, 0.1)}` : "";
            const memory_param = memory ? `--memory=${memory}m` : "";

            // Notice: There is no method to control a storage size for container.
            // const storage_param = storage?`--storage-opt size=${storage}G`:"";

            const privileged_param = privileged ? "--privileged" : "";

            //  -- /usr/sbin/sshd -D
            const _cmd_ = `${DOCKER_COMMAND} run -d -it --name "${container_name}" ${privileged_param} ${accelerator_param} ${cpu_param} ${memory_param} --restart=always --net=${network_mode} -w "${workspace}" ${mounts.join(" ")} --dns=8.8.8.8 ${image}`;
            logger.log("Run:", _cmd_);
            await exec(_cmd_);
        }

        try {
            // Notice: Sync dockerode socket status.
            await sleep(1000);
            const container = await _getContainerByName(docker, name);
            const container_info = await container.inspect();
            const instance = await _create_container_info(docker, container_info);
            logger.info(instance, container_info);

            // Search package manager.
            let command_helper = null;
            for (const helper of CommandHelperTable) {
                if (await docker_witch(helper.bin, instance.key)) {
                    command_helper = helper;
                    break;
                }
            }
            if (!command_helper) {
                logger.error("Could not find a command helper.");
                new Error("Could not find a command helper.");
                return null;
            }

            const sudo = need_sudo ? "sudo" : "";
            command_helper.sudo = sudo;
            instance_key = command_helper.instance_key = instance.key;

            logger.log(ssh);
            if (ssh.install) {
                logger.log("Install SSHD.");

                // Install openssh-server
                await command_helper.update_catalog();
                await command_helper.install(["openssh-server"]);
                await command_helper._exec(`echo root:${crypto.randomUUID().split("-").join("")} | chpasswd`);
                await command_helper._exec(`mkdir -p /var/run/sshd`);
                await command_helper._exec(`sed -i 's/.*RSAAuthentication.*/RSAAuthentication yes/g' /etc/ssh/sshd_config`); // RSA
                await command_helper._exec(`sed -i 's/.*PubkeyAuthentication.*/PubkeyAuthentication yes/g' /etc/ssh/sshd_config`); // Public key login
                await command_helper._exec(`sed -i 's/.*PasswordAuthentication.*/PasswordAuthentication no/g' /etc/ssh/sshd_config`); // Reject password login
                await command_helper._exec(`sed -i 's/.*AddressFamily.*/AddressFamily any/g' /etc/ssh/sshd_config`); // IPv4/IPv6
                await command_helper._exec(`sed -i 's/.*ListenAddress 0\.0\.0\.0.*/ListenAddress 0.0.0.0/g' /etc/ssh/sshd_config`); // IPv4
                await command_helper._exec(`sed -i 's/.*ListenAddress ::.*/ListenAddress ::/g' /etc/ssh/sshd_config`); // IPv6
                if (ssh.port) {
                    command_helper._exec(`sed -i 's/.*Port.*/Port ${ssh.port}/g' /etc/ssh/sshd_config`);
                }
                // Send a public key to .ssh/authentication_key
                if (ssh.key) {
                    await command_helper._exec(`mkdir -p ~/.ssh && echo '${ssh.key}' > ~/.ssh/authorized_keys`);
                    await command_helper._exec(`chmod 600 ~/.ssh/authorized_keys`);
                }

                // For MITM attack
                await command_helper._exec(`ssh-keygen -t rsa -N '' -f /etc/ssh/ssh_host_rsa_key`, true);
                await command_helper._exec(`ssh-keygen -t dsa -N '' -f /etc/ssh/ssh_host_dsa_key`, true);
                await command_helper._exec(`ssh-keygen -t ecdsa -N '' -f /etc/ssh/ssh_host_ecdsa_key`, true);
                await command_helper._exec(`ssh-keygen -t ed25519 -N '' -f /etc/ssh/ssh_host_ed25519_key`, true);

                await command_helper._exec(`systemctl start ssh`, true);
                await command_helper._exec(`systemctl start sshd.service`, true);
                await command_helper._exec(`service ssh start`, true); // Debian/Ubuntu
                await command_helper._exec(`service sshd start`, true);
                await command_helper._exec(`/etc/init.d/sshd start`, true);
                await command_helper._exec(`/etc/rc.d/sshd start`, true);
                await command_helper._exec(`/usr/sbin/sshd -D &`, true); // RedHat/CentOS/Fedora
            } else {
                logger.info("Without SSHD.");
            }

            // instance.storage = instance.storage ==
            // instance.total_storage = instance.total_storage == -1 ? total : instance.total_storage;
            instance.global_ipv4 = instance.global_ipv4 ?? this.config.IPv4;
            instance.global_ipv6 = instance.global_ipv6 ?? this.config.IPv6;
            logger.info("Created instance: ", instance);
            return instance;
        } catch (e) {
            logger.error(e);
            if (instance_key)
                try {
                    await this.delete_instance({ key: instance_key });
                } catch (e) {
                    logger.error(e);
                }
            else
                try {
                    await this.delete_instance({ name: name });
                } catch (e) {
                    logger.error(e);
                }
            throw e;
        }
        return null;
    }

    async delete_instance(params: any): Promise<Instance | null> {
        const docker = new Docker();
        const container = params.name ? await _getContainerByName(docker, params.name) : docker.getContainer(params.key);
        const container_info = await container.inspect();
        const instance = await _create_container_info(docker, container_info);
        // await container.stop();
        await container.remove({ force: { true: "true" } });
        return instance;
    }

    async stop_instance(params: any): Promise<Instance | null> {
        const docker = new Docker();
        const container = await docker.getContainer(params.key);
        await container.stop();
        const container_info = await container.inspect();
        return await _create_container_info(docker, container_info);
    }

    async start_instance(params: any): Promise<Instance | null> {
        const docker = new Docker();
        const container = await docker.getContainer(params.key);
        await container.start();

        const enabled_ssh = params.enabled_ssh;
        if (enabled_ssh) {
            let command_helper = null;
            for (const helper of CommandHelperTable) {
                if (await docker_witch(helper.bin, params.key)) {
                    command_helper = helper;
                    break;
                }
            }
            if (!command_helper) {
                logger.error("Could not find a command helper.");
                new Error("Could not find a command helper.");
                return null;
            }

            await command_helper._exec(`systemctl start ssh`, true);
            await command_helper._exec(`systemctl start sshd.service`, true);
            await command_helper._exec(`service ssh start`, true);
            await command_helper._exec(`service sshd start`, true);
            await command_helper._exec(`/etc/init.d/sshd start`, true);
            await command_helper._exec(`/etc/rc.d/sshd start`, true);
            await command_helper._exec(`/usr/sbin/sshd -D`, true);
        }

        const container_info = await container.inspect();
        return await _create_container_info(docker, container_info);
    }

    async list_instance(params: any): Promise<Instance[]> {
        const docker = new Docker();
        const containers = await docker.listContainers({ all: true });
        const ret: Instance[] = [];
        for (const container of containers) {
            ret.push(await _create_container_info(docker, container));
        }
        return ret;
    }

    async save_image(params: any): Promise<Image | null> {
        return new Image();
    }

    async load_image(params: any): Promise<Image | null> {
        const docker = new Docker();
        const url = params.url;
        function pull(url: string) {
            return new Promise((resolve, reject) => {
                docker.pull(url, function (err: any, stream: any) {
                    if (err) {
                        if (err) reject(err);
                    } else {
                        docker.modem.followProgress(stream, onFinished, onProgress);
                        function onFinished(err: any, output: any) {
                            if (err) reject(err);
                            console.log("\n");
                            resolve(output);
                        }
                        console.log("\n");
                        function onProgress(event: any) {
                            if (event.progress) {
                                process.stdout.write("\x1b[1A\x1b[1G");
                                process.stdout.write(`${event.id}:${event.status}\n${event.progress}`);
                            }
                        }
                    }
                });
            });
        }
        // Notice:
        //  Docker pull is a terrible API that doesn't return an explicit status, so identify it with a difference set.
        //  Note that it does not work in parallel.
        const pre_images = await docker.listImages();
        const _ = (await pull(url)) as [any];
        const cur_images = await docker.listImages();

        const an_image = cur_images.filter((aObj) => {
            return !pre_images.some((bObj) => JSON.stringify(aObj) === JSON.stringify(bObj));
        })[0];

        if (an_image == null) {
            throw new Error("Could not create an image or the image already exists.");
        }

        const ret = _create_image_info(an_image);
        logger.log(ret);
        return ret;
    }

    async handle_event(params: any) {
        const self: any = this;
        // TODO:Validation check
        return self[params.method](params.params);
    }
}
