process.env.JEST = "true";

import { describe, expect, test } from '@jest/globals';
import os from "os";

import { DockerDriver } from './driver_docker';
import { Driver, Image, Instance } from './driver';

import childProcess from 'child_process';
import util from 'util';
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Config from '../config';
import { APP_NAME } from '../compute';

const argv: any = yargs(hideBin(process.argv)).argv;
const verbose = true;//argv.v || argv.verbose;
const config_path = argv.c || argv.config;

const config = Config(APP_NAME, { silent: !verbose, config_path: config_path });

// const _exec = util.promisify(childProcess.exec);
// const _spawn = util.promisify(childProcess.spawn);

async function exec(cmd: string) {
    console.log("CMD:", cmd);
    return new Promise((resolve, reject) => {
        const proc: any = childProcess.exec(cmd, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(void 0);
            }
        });
        proc.stdout.pipe(process.stdout);
    });
    // return await  _spawn('coffee -cw my_file.coffee',[], { stdio: 'inherit' });
}


const jestConsole = console;
global.console = require('console');
const driver: Driver = new DockerDriver(config);

if (0) {
    test("docker driver - init image", async () => {
        await driver.init();
    }, 1000 * 60 * 10);

    test("docker driver - list image", async () => {
        const ret = await driver.handle_event({ method: "list_image", params: {} }) as Array<Image>;
        expect(ret).not.toBe(null);
        expect(ret.length > 0).toBe(true);
    });


    test("docker driver - delete image", async () => {
        const image_list = await driver.handle_event({ method: "list_image", params: {} }) as Array<Image>;
        const fixed_name = "ubuntu:22.04";
        const filtered = image_list.filter((image) => { return image.name == fixed_name; })[0];
        const ret = await driver.handle_event({ method: "delete_image", params: { key: filtered.key } });
        expect(ret).not.toBe(null);
        console.log(ret.name, fixed_name);
        await driver.init(); // Restore
    });


    // test("docker driver - save image", async () => {
    //     const driver = new DockerDriver();
    //     // const ret = await driver.handle_event({type:"container", command:"save_image", key:"test"});
    //     // console.log(ret);
    // });

    test("docker driver - instance list", async () => {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
    });

}

if (0) {
    const fixed_name = "ubuntu:16.04";
    test("docker driver - load image", async () => {
        {
            const driver = new DockerDriver(config);

            {
                const image_list = await driver.handle_event({ method: "list_image", params: {} }) as Array<Image>;
                const filtered = image_list.filter((image) => { return image.name == fixed_name; })[0];
                if (filtered) {
                    const ret = await driver.handle_event({ method: "delete_image", params: { key: filtered.key } });
                    expect(ret).not.toBe(null);
                }
            }

            const ret = await driver.handle_event({ method: "load_image", params: { url: fixed_name } });
            console.log("Fetched:", ret);
        }
        {
            const image_list = await driver.handle_event({ method: "list_image", params: {} }) as Array<Image>;
            const filtered = image_list.filter((image) => { return image.name == fixed_name; })[0];
            const ret = await driver.handle_event({ method: "delete_image", params: { key: filtered.key } });
            expect(ret).not.toBe(null);
            console.log(ret.name, fixed_name);
        }
    }, 1000 * 60 * 10);
}



if (0) test("docker driver - create instance", async () => {
    const driver = new DockerDriver(config);
    const ret = await driver.handle_event({
        method: "create_instance", params: {
            name: "test_Cu3Bw8vCFG", // No conflict
            image_key: "ubuntu:22.04",
            ssh_key: {
                public_key: null
            },
            params: {
                command: "/bin/bash", args: [],
            }
        }
    });
    expect(ret.name).toBe("test_Cu3Bw8vCFG");
});

if (0) test("docker driver - delete instance", async () => {
    const driver = new DockerDriver(config);
    // TODO: key, or name
    {
        const ret = await driver.handle_event({ method: "delete_instance", params: { name: "test_Cu3Bw8vCFG" } });
        expect(ret.name).toBe("test_Cu3Bw8vCFG");
    }
    {
        const ret = await driver.handle_event({
            method: "create_instance", params: {
                name: "test_Cu3Bw8vCFG", // No conflict
                image_key: "ubuntu:22.04",
                ssh_key: {
                    public_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOHK/eX0mGdkxF63//RR3c41nMenUcpxSvy8bvLIQJ2q johndoe@johndoe.local",
                    port: 60022,
                    install: true,
                    os_hint: "ubuntu",
                    sudo: false,
                    mount_host_dir: true,
                },
                params: {
                    command: "/bin/bash", args: [],
                }
            }
        });
        const instance_key = ret.key;
        {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: instance_key } });
            expect(ret.key).toBe(instance_key);
        }
    }
});


if (0) test("docker driver - test instance", async () => {
    const driver = new DockerDriver(config);
    const container_name = "test_uG3Bw8vCFC";
    {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
        const hit = instance_list.filter((instance) => instance.name == container_name)[0];
        if (hit) {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: hit.key } });
            expect(ret.key).toBe(hit.key);
        }
    }
    const ret = await driver.handle_event({
        method: "create_instance", params: {
            name: container_name, // No conflict
            image_key: "ubuntu:22.04",
            ssh: {
                public_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOHK/eX0mGdkxF63//RR3c41nMenUcpxSvy8bvLIQJ2q johndoe@johndoe.local",
                port: 60022,
                install: true,
                os_hint: "ubuntu",
                sudo: false,
                mount_host_dir: true,
            },
            params: {
                // command:'/bin/bash', args:['-c', 'tail -f /var/log/dmesg'], 
                command: "/bin/bash", args: [],
            }
        }
    });
    expect(ret.name).toBe(container_name);
}, 60 * 1000);


if (0) test("docker native - create instance", async () => {
    const driver = new DockerDriver(config);
    // const ret = await driver.handle_event({type:"container", command:"save_image", key:"test"});
    // console.log(ret);

    const s_driver = "docker";
    const container_name = "test_BwdgD9dCffg";
    const home_dir = os.homedir();
    const network_mode = "host";
    const workspace = "/root";
    const image = "e4c58958181a";
    const mounts: Array<string> = [];
    const mount_host_dir = false;
    if (mount_host_dir) {
        mounts.push(`-v ${home_dir}:/root/host`);
    }
    {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
        const hit = instance_list.filter((instance) => instance.name == container_name)[0];
        if (hit) {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: hit.key } });
            expect(ret.key).toBe(hit.key);
        }
    }

    await exec(`${s_driver} run -d -it --name "${container_name}" --restart=always --net=${network_mode} -w "${workspace}" ${mounts.join(" ")} --dns=8.8.8.8 ${image} `)


}, 1000 * 30);



if (0) test("docker native - CPU slice", async () => {
    const driver = new DockerDriver(config);
    const s_driver = "docker";
    const container_name = "test_BwdgD9dCffg";
    const network_mode = "host";
    const workspace = "/root";
    const image = "ubuntu:22.04";
    {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
        const hit = instance_list.filter((instance) => instance.name == container_name)[0];
        if (hit) {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: hit.key } });
            expect(ret.key).toBe(hit.key);
        }
    }

    const cpu_slice = 0.1;
    const resource_limits = [`--cpus=${cpu_slice}`];

    await exec(`${s_driver} run -d -it --name "${container_name}" --restart=always ${resource_limits.join(" ")} --net=${network_mode} -w "${workspace}" --dns=8.8.8.8 ${image} `)

    if (0) {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
        const hit = instance_list.filter((instance) => instance.name == container_name)[0];
        if (hit) {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: hit.key } });
            expect(ret.key).toBe(hit.key);
        }
    }


}, 1000 * 30);


if (0) test("docker native - Memory limit", async () => {
    const driver = new DockerDriver(config);
    const s_driver = "docker";
    const container_name = "test_BwdgD9dCffg";
    const network_mode = "host";
    const workspace = "/root";
    const image = "ubuntu:22.04";
    {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
        const hit = instance_list.filter((instance) => instance.name == container_name)[0];
        if (hit) {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: hit.key } });
            expect(ret.key).toBe(hit.key);
        }
    }

    const resource_limits = [`--memory=128m`, `--memory-swap=1g`];

    await exec(`${s_driver} run -d -it --name "${container_name}" --restart=always ${resource_limits.join(" ")} --net=${network_mode} -w "${workspace}" --dns=8.8.8.8 ${image} `)

    if (0) {
        const instance_list = await driver.handle_event({ method: "list_instance", params: {} }) as Array<Instance>;
        const hit = instance_list.filter((instance) => instance.name == container_name)[0];
        if (hit) {
            const ret = await driver.handle_event({ method: "delete_instance", params: { key: hit.key } });
            expect(ret.key).toBe(hit.key);
        }
    }


}, 1000 * 30);



if (0) test("docker native - Storage limit", async () => {
    // There is no method to limit storage size for instance.
}, 1000 * 30);


if (0) test("spawn with docker test", async () => {
    const spawn = childProcess.spawn;

    async function s_exec(command: string, args: Array<string>) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args);
            console.log(command, args.join(" "));

            child.stdout.on('data', (data) => {
                process.stdout.write(data);
            });

            child.stderr.on('data', (data) => {
                process.stderr.write(data);
            });

            child.on('close', (code) => {
                console.log(`Child process exited with code ${code}`);
                resolve(0);
            });
        });
    }

    await s_exec("docker", ['rmi', 'ubuntu:22.04']);
    await s_exec("docker", ['pull', 'ubuntu:22.04']);
    // await s_exec("docker", ['exec', '-it', '9dd7222241e9', 'ls', '/']);

}, 1000 * 30);

if (1) test("spawn command test", async () => {
    const spawn = childProcess.spawn;
    async function s_exec(command: string, args: Array<string>) {
        return new Promise((resolve, reject) => {
            console.log(command, args.join(" "));
            const child = spawn(command, args);
            child.stdout.on('data', (data) => {
                process.stdout.write(data);
            });

            child.stderr.on('data', (data) => {
                process.stderr.write(data);
            });

            child.on('close', (code) => {
                console.log(`Child process exited with code ${code}`);
                resolve(0);
            });
        });
    }
    
    // await s_exec("docker", [
    //     'run',
    //     '--gpus',
    //     'all',
    //     '-d',
    //     '-it',
    //     '--name',
    //     'test_bear',
    //     '--restart=always',
    //     '--net=host',
    //     '-w',
    //     '/root',
    //     '--dns=8.8.8.8',
    //     'ubuntu:22.04'
    // ]);
    // docker exec -it test_bear bash -c "apt update && apt install -y vim"

    await s_exec("docker", ['exec', '-i', 'test_bear', 'bash', '-c', 'apt update && apt install -y vim']);
    // await s_exec("docker", ['stop', 'test_bear']);
    // await s_exec("docker", ['rm', 'test_bear']);
    

}, 1000 * 30);


if (1) test("Empty", async () => { expect(0).toBe(0) });
