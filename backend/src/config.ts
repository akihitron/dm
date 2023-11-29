import os from "os";
import fs from "fs";
import path from "path";

let app_name: string;

export default (_app_name: string, _params: any = {}) => {
    console.log("\n\n------------------------------------------");
    const params: any = {};
    if (_params) Object.assign(params, _params);
    if (!app_name) app_name = _app_name;

    const IS_DEVELOPMENT_MODE = process.env.NODE_ENV == "development";

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Configuration
    // Priority
    //  1. ~/.<app>/config.json
    //  2. /etc/<app>/config.json
    //  3. template.config.json
    let CONFIG: any | null = null;
    let config_file = "";
    const home_json = path.join(os.homedir(), `.${app_name}/config.json`);
    const etc_json = `/etc/${app_name}/config.json`;
    const template_json = path.join(__dirname, `./template.config.json`);
    const user_defined_json = params.config_path;
    let _warn = (...args: any[]) => { };
    let _log = (...args: any[]) => { };
    if (!params.silent) {
        // _warn = (...args: any[]) => console.warn(...args);
        // _log = (...args: any[]) => console.log(...args);
        // log = console.log;
    }
    _warn = (...args: any[]) => console.warn(...args);
    _log = (...args: any[]) => console.log(...args);


    const load = (f: string, warn = false) => {
        if (CONFIG == null) {
            if (fs.existsSync(f)) try { (warn ? _warn("Found:", f) : _log("\x1b[32mFound:", f, "\x1b[0m")); CONFIG = require(f); config_file = f; } catch (e) { console.error(e) }
            else warn ? _warn("Not found:", f) : _log("Not found:", f);
        }
    }
    // Try all config files.
    if (user_defined_json) {
        load(user_defined_json, true);
    } else {
        load(home_json);
        load(etc_json);
        if (IS_DEVELOPMENT_MODE) load(template_json, true);
    }


    // Check config.
    if (CONFIG == null) {
        console.error(` Error: Could not load ${app_name} config.`);
        process.exit(1);
    }

    // Watch config file.
    if (template_json != config_file) {
        fs.watch(config_file, function (event, filename) {
            _log(event + ' to ' + filename);
            if (event == "change") {
                try {
                    const time = new Date();
                    fs.utimesSync(path.join(__dirname, "config.ts"), time, time);
                } catch {
                    fs.closeSync(fs.openSync(path.join(__dirname, "config.ts"), 'w'));
                }
            }
        });
    }
    console.log("------------------------------------------\n\n");
    return CONFIG;
}