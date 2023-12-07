const PAD = 20;
let stream:any = null;
let enabled_console = true;

function convert_to_string(o: any) {
    if (o instanceof Error) return (o as any).stack;
    else if (o instanceof Object) return JSON.stringify(o, null, 2);
    return typeof o == "string" ? o : JSON.stringify(o, null, 2);
}

/**
 * eLog - displays calling line number & message & dumps vars as pretty json string
 * @param {any} msg - string to display in log message
 * @param {any} dispVars - any number of variables (ellipsis , aka Rest parameters) to dump
 * {@link https://github.com/evanw/node-source-map-support usable by typescript node-source-map-support module}
 * {@link https://github.com/mozilla/source-map/ Mozilla source-map library & project}
 * {@link http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/ good introduction to sourcemaps}
 */
export function info(msg: any, ...dispVars: any[]) {
    /**
     * go one line back for the caller
     * @type {string}
     */
    const eee: any = new Error();
    let stackLine = eee.stack.split("\n")[2];
    /**
     * retrieve the file basename & positional data, after the last `/` to the `)`
     */
    //
    let caller_line = stackLine.slice(stackLine.lastIndexOf("/"), stackLine.lastIndexOf(")"));
    /**
     *  test for no `/` ; if there is no `/` then use filename without a prefixed path
     */
    if (caller_line.length == 0) {
        caller_line = stackLine.slice(stackLine.lastIndexOf("("), stackLine.lastIndexOf(")"));
    }
    //
    /**
     * filename_base - parse out the file basename; remove first `/` char and go to `:`
     */
    const filename_base = caller_line.slice(0 + 1, caller_line.indexOf(":"));
    /**
     * line_no - parse out the line number ; remove first `:` char and go to 2nd `:`
     */
    const line_no = caller_line.slice(caller_line.indexOf(":") + 1, caller_line.lastIndexOf(":"));
    /**
     * line_pos - line positional - from the last `:` to the end of the string
     */
    const line_pos = caller_line.slice(caller_line.lastIndexOf(":") + 1);
    const line_num = `${filename_base}:${line_no}`;
    // const line_num = `${filename_base}:${line_no}:${line_pos}`;

    const arr = [convert_to_string(msg)];
    dispVars.forEach((value) => arr.push(convert_to_string(value)));

    const lines = arr.join(" ").split("\n");

    console.log("\x1b[36m%s\x1b[0m", line_num.padStart(PAD, " "), `\x1b[90m| \x1b[36m${lines.shift()}\x1b[0m`);
    while (lines.length > 0) {
        console.log("\x1b[36m%s\x1b[0m", "".padStart(PAD, " "), `\x1b[90m| \x1b[36m${lines.shift()}\x1b[0m`);
    }
}

/**
 * eLog - displays calling line number & message & dumps vars as pretty json string
 * @param {any} msg - string to display in log message
 * @param {any} dispVars - any number of variables (ellipsis , aka Rest parameters) to dump
 * {@link https://github.com/evanw/node-source-map-support usable by typescript node-source-map-support module}
 * {@link https://github.com/mozilla/source-map/ Mozilla source-map library & project}
 * {@link http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/ good introduction to sourcemaps}
 */
export function success(msg: any, ...dispVars: any[]) {
    /**
     * go one line back for the caller
     * @type {string}
     */
    const eee: any = new Error();
    let stackLine = eee.stack.split("\n")[2];
    /**
     * retrieve the file basename & positional data, after the last `/` to the `)`
     */
    //
    let caller_line = stackLine.slice(stackLine.lastIndexOf("/"), stackLine.lastIndexOf(")"));
    /**
     *  test for no `/` ; if there is no `/` then use filename without a prefixed path
     */
    if (caller_line.length == 0) {
        caller_line = stackLine.slice(stackLine.lastIndexOf("("), stackLine.lastIndexOf(")"));
    }
    //
    /**
     * filename_base - parse out the file basename; remove first `/` char and go to `:`
     */
    const filename_base = caller_line.slice(0 + 1, caller_line.indexOf(":"));
    /**
     * line_no - parse out the line number ; remove first `:` char and go to 2nd `:`
     */
    const line_no = caller_line.slice(caller_line.indexOf(":") + 1, caller_line.lastIndexOf(":"));
    /**
     * line_pos - line positional - from the last `:` to the end of the string
     */
    const line_pos = caller_line.slice(caller_line.lastIndexOf(":") + 1);
    const line_num = `${filename_base}:${line_no}`;
    // const line_num = `${filename_base}:${line_no}:${line_pos}`;

    const arr = [convert_to_string(msg)];
    dispVars.forEach((value) => arr.push(convert_to_string(value)));

    const lines = arr.join(" ").split("\n");

    console.log("\x1b[36m%s\x1b[0m", line_num.padStart(PAD, " "), `\x1b[90m| \x1b[32m${lines.shift()}\x1b[0m`);
    while (lines.length > 0) {
        console.log("\x1b[36m%s\x1b[0m", "".padStart(PAD, " "), `\x1b[90m| \x1b[32m${lines.shift()}\x1b[0m`);
    }
}

/**
 * eLog - displays calling line number & message & dumps vars as pretty json string
 * @param {any} msg - string to display in log message
 * @param {any} dispVars - any number of variables (ellipsis , aka Rest parameters) to dump
 * {@link https://github.com/evanw/node-source-map-support usable by typescript node-source-map-support module}
 * {@link https://github.com/mozilla/source-map/ Mozilla source-map library & project}
 * {@link http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/ good introduction to sourcemaps}
 */
export function warn(msg: any, ...dispVars: any[]) {
    /**
     * go one line back for the caller
     * @type {string}
     */
    const eee: any = new Error();
    let stackLine = eee.stack.split("\n")[2];
    /**
     * retrieve the file basename & positional data, after the last `/` to the `)`
     */
    //
    let caller_line = stackLine.slice(stackLine.lastIndexOf("/"), stackLine.lastIndexOf(")"));
    /**
     *  test for no `/` ; if there is no `/` then use filename without a prefixed path
     */
    if (caller_line.length == 0) {
        caller_line = stackLine.slice(stackLine.lastIndexOf("("), stackLine.lastIndexOf(")"));
    }
    //
    /**
     * filename_base - parse out the file basename; remove first `/` char and go to `:`
     */
    const filename_base = caller_line.slice(0 + 1, caller_line.indexOf(":"));
    /**
     * line_no - parse out the line number ; remove first `:` char and go to 2nd `:`
     */
    const line_no = caller_line.slice(caller_line.indexOf(":") + 1, caller_line.lastIndexOf(":"));
    /**
     * line_pos - line positional - from the last `:` to the end of the string
     */
    const line_pos = caller_line.slice(caller_line.lastIndexOf(":") + 1);
    const line_num = `${filename_base}:${line_no}`;
    // const line_num = `${filename_base}:${line_no}:${line_pos}`;

    const arr = [convert_to_string(msg)];
    dispVars.forEach((value) => arr.push(convert_to_string(value)));

    const lines = arr.join(" ").split("\n");

    console.log("\x1b[36m%s\x1b[0m", line_num.padStart(PAD, " "), `\x1b[90m| \x1b[33m${lines.shift()}\x1b[0m`);
    while (lines.length > 0) {
        console.log("\x1b[36m%s\x1b[0m", "".padStart(PAD, " "), `\x1b[90m| \x1b[33m${lines.shift()}\x1b[0m`);
    }
}

/**
 * eLog - displays calling line number & message & dumps vars as pretty json string
 * @param {any} msg - string to display in log message
 * @param {any} dispVars - any number of variables (ellipsis , aka Rest parameters) to dump
 * {@link https://github.com/evanw/node-source-map-support usable by typescript node-source-map-support module}
 * {@link https://github.com/mozilla/source-map/ Mozilla source-map library & project}
 * {@link http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/ good introduction to sourcemaps}
 */
export function error(msg: any, ...dispVars: any[]) {
    /**
     * go one line back for the caller
     * @type {string}
     */
    const eee: any = new Error();
    let stackLine = eee.stack.split("\n")[2];
    /**
     * retrieve the file basename & positional data, after the last `/` to the `)`
     */
    //
    let caller_line = stackLine.slice(stackLine.lastIndexOf("/"), stackLine.lastIndexOf(")"));
    /**
     *  test for no `/` ; if there is no `/` then use filename without a prefixed path
     */
    if (caller_line.length == 0) {
        caller_line = stackLine.slice(stackLine.lastIndexOf("("), stackLine.lastIndexOf(")"));
    }
    //
    /**
     * filename_base - parse out the file basename; remove first `/` char and go to `:`
     */
    const filename_base = caller_line.slice(0 + 1, caller_line.indexOf(":"));
    /**
     * line_no - parse out the line number ; remove first `:` char and go to 2nd `:`
     */
    const line_no = caller_line.slice(caller_line.indexOf(":") + 1, caller_line.lastIndexOf(":"));
    /**
     * line_pos - line positional - from the last `:` to the end of the string
     */
    const line_pos = caller_line.slice(caller_line.lastIndexOf(":") + 1);
    const line_num = `${filename_base}:${line_no}`;
    // const line_num = `${filename_base}:${line_no}:${line_pos}`;

    const arr = [convert_to_string(msg)];
    dispVars.forEach((value) => arr.push(convert_to_string(value)));

    const lines = arr.join(" ").split("\n");

    console.log("\x1b[36m%s\x1b[0m", line_num.padStart(PAD, " "), `\x1b[90m| \x1b[31m${lines.shift()}\x1b[0m`);
    while (lines.length > 0) {
        console.log("\x1b[36m%s\x1b[0m", "".padStart(PAD, " "), `\x1b[90m| \x1b[31m${lines.shift()}\x1b[0m`);
    }
}

/**
 * eLog - displays calling line number & message & dumps vars as pretty json string
 * @param {any} msg - string to display in log message
 * @param {any} dispVars - any number of variables (ellipsis , aka Rest parameters) to dump
 * {@link https://github.com/evanw/node-source-map-support usable by typescript node-source-map-support module}
 * {@link https://github.com/mozilla/source-map/ Mozilla source-map library & project}
 * {@link http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/ good introduction to sourcemaps}
 */
export function log(msg: any, ...dispVars: any[]) {
    /**
     * go one line back for the caller
     * @type {string}
     */
    const eee: any = new Error();
    let stackLine = eee.stack.split("\n")[2];
    /**
     * retrieve the file basename & positional data, after the last `/` to the `)`
     */
    //
    let caller_line = stackLine.slice(stackLine.lastIndexOf("/"), stackLine.lastIndexOf(")"));
    /**
     *  test for no `/` ; if there is no `/` then use filename without a prefixed path
     */
    if (caller_line.length == 0) {
        caller_line = stackLine.slice(stackLine.lastIndexOf("("), stackLine.lastIndexOf(")"));
    }
    //
    /**
     * filename_base - parse out the file basename; remove first `/` char and go to `:`
     */
    const filename_base = caller_line.slice(0 + 1, caller_line.indexOf(":"));
    /**
     * line_no - parse out the line number ; remove first `:` char and go to 2nd `:`
     */
    const line_no = caller_line.slice(caller_line.indexOf(":") + 1, caller_line.lastIndexOf(":"));
    /**
     * line_pos - line positional - from the last `:` to the end of the string
     */
    const line_pos = caller_line.slice(caller_line.lastIndexOf(":") + 1);
    const line_num = `${filename_base}:${line_no}`;
    // const line_num = `${filename_base}:${line_no}:${line_pos}`;

    const arr = [convert_to_string(msg)];
    dispVars.forEach((value) => arr.push(convert_to_string(value)));

    const lines = arr.join(" ").split("\n");
    const l1 = lines.shift();
    if (stream) stream.write(`${line_num.padStart(PAD," ")} | ${l1}\n`);
    if (enabled_console) console.log("\x1b[36m%s\x1b[0m", line_num.padStart(PAD, " "), `\x1b[90m| \x1b[0m${l1}\x1b[0m`);
    while (lines.length > 0) {
        const l2 = lines.shift();
        if (stream) stream.write(`${"".padStart(PAD," ")} | ${l2}\n`);
        if (enabled_console) console.log("\x1b[36m%s\x1b[0m", "".padStart(PAD, " "), `\x1b[90m| \x1b[0m${l2}\x1b[0m`);
    }
}

export default {
    info,
    success,
    warn,
    error,
    log,
    enableConsole: () => {
        enabled_console = true;
    },
    disableConsole: () => {
        enabled_console = false;
    },
    setStream: (s: any) => {
        stream = s;
    }
};
