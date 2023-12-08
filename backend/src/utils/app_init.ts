import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';

import { AppParams, MainContext } from "../global";



export async function initialize(app_params: AppParams) {
    const app_name = app_params.app_name;
    const platform = os.platform();
    const userInfo = os.userInfo();
    const username = userInfo.username;
    
    let data_directory = "";
    if (platform == "linux") {
        data_directory = path.join("/var/lib",app_name);
    }  else if (platform == "win32") {
        console.log("Does not support Windows.");
        process.exit(1);
    }  else if (platform == "darwin") {
        data_directory = path.join(os.homedir(),'Library',app_name);
    } else {
        console.log("Does not support unknown OS.", platform);
        process.exit(1);
    }
    
    
    
    const MIN_CONFIG = 
    `
    {
        "database": {
          "driver": "sqlite"
        },
        "session_store": {
          "driver": "memorystore",
          "secret_key": "${crypto.randomBytes(16).toString('hex')}"
        }
      }
    `;
    
    
    function exec_s(cmd:string, ignore:boolean=false, use_reject:boolean=false):Promise<string> {
        return new Promise((resolve, reject) => {
            console.log(cmd);
            exec(cmd, (error:any, stdout:any, stderr:any) => {
                if (error) {
                    if (ignore == false) {
                        console.error(`\x1b[31m${stderr}\x1b[0m`);
                        if (use_reject) reject(stderr);
                        else process.exit(1);
                    } else {
                        console.warn(`\x1b[33m${stderr}\x1b[0m`);
                        if (use_reject) reject(stderr);
                        else resolve(stdout);
                    }
                } else {
                    console.log(`${stdout}`);
                    resolve(stdout);
                }
            });
        });
    }
    let sudo = "";
    let app_user_is_available = false;
    let config_file = "";

    if (platform == "linux") {
        sudo = username != "root"?"sudo":"";
        app_user_is_available = (await exec_s(`id -nG`)).split(" ").map(s=>s.trim()).filter(s=>s==app_name).length > 0;
        if (!app_user_is_available) {
            await exec_s(`${sudo} groupadd ${app_name}`, true);
            await exec_s(`${sudo} useradd -r -g ${app_name} ${app_name}`, true);
            await exec_s(`${sudo} usermod -aG ${app_name} ${username}`);
            await exec_s(`id -nG`);
        }
        app_user_is_available = (await exec_s(`id -nG`)).split(" ").map(s=>s.trim()).filter(s=>s==app_name).length > 0;
        if (!app_user_is_available) {
            console.error(`\x1b[31mPlease relogin and run this script again.\x1b[0m`);
            process.exit(1);
        }
    }
    
    await exec_s(`${sudo} mkdir -p "${data_directory}"`);
    if (platform == "linux") {
        await exec_s(`${sudo} mkdir -p /etc/${app_name}`);
        await exec_s(`${sudo} chown -R ${app_name}:${app_name} ${data_directory}`);
        await exec_s(`${sudo} chmod -R g+w ${data_directory}`);
        await exec_s(`${sudo} chown -R ${app_name}:${app_name} /etc/${app_name}`);
        await exec_s(`${sudo} chmod -R g+w /etc/${app_name}`);
        await exec_s(`ls -la "${data_directory}"`);
        await exec_s(`ls -la /etc/${app_name}`);
        config_file = path.join(`/etc/${app_name}`, 'config.json');;
        if (fs.existsSync(config_file) == false) {
            fs.writeFileSync(config_file, MIN_CONFIG);
        }
    } else {
        await exec_s(`${sudo} mkdir -p ${path.join(os.homedir(),'.'+app_name)}`);
        await exec_s(`ls -la "${data_directory}"`);
        config_file = path.join(os.homedir(),'.'+app_name, 'config.json');
        if (fs.existsSync(config_file) == false) {
            fs.writeFileSync(config_file, MIN_CONFIG);
        }
    }
    console.log("----------------------------------------");
    console.log("Permission test...");
    if (fs.existsSync(path.join(data_directory, 'touch'))) {
        await exec_s(`${sudo} rm -f "${path.join(data_directory, 'touch')}"`);
    }
    await exec_s(`touch "${path.join(data_directory, 'touch')}"`);
    console.log(`\x1b[32mDone.\x1b[0m`);
    console.log("\n----------------------------------------\n");
    const conf = JSON.parse(fs.readFileSync(config_file, 'utf8'));
    console.log("DATA DIRECTORY:", data_directory);
    console.log("CONFIG FILE:", config_file);
    console.log(conf);
    console.log("\n----------------------------------------\n");
}

