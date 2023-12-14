import React from "react";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
// import TextBoxWithCopyButton from '../libs/TextBoxWithCopyButton';

import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
// import {SearchAddon} from '@xterm/addon-search';
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useAsync } from "react-use";
// import { Unicode11Addon } from '@xterm/addon-unicode11';

const BASE_URL = import.meta.env.BASE_URL;
const ORIGIN_URL_OBJ = new URL(window.location.origin);
const WS_PROTOCOL = ORIGIN_URL_OBJ.protocol == "https:" ? "wss:" : "ws:";
const WS_URL = `${WS_PROTOCOL}//${ORIGIN_URL_OBJ.host}${BASE_URL}api/ws/`;
console.warn(WS_URL);

const fitAddon = new FitAddon();
const webLinksAddon = new WebLinksAddon();
// const searchAddon = new SearchAddon();
// const unicode11Addon = new Unicode11Addon();
const terminal = new Terminal({
    fontFamily: "courier-new, courier, monospace",
    fontWeight: undefined,
    fontSize: 14,
    allowProposedApi: true,
});
terminal.loadAddon(fitAddon);
terminal.loadAddon(webLinksAddon);

let socket:WebSocket | null = null;
// Socket:Channel = 1:*


window.addEventListener("resize", () => {
    fitAddon.fit();
});

function open_websocket(term: Terminal, callback:Function) {
    if (socket == null) {
        const _socket = socket = new WebSocket(WS_URL);
        // _socket.binaryType = "arraybuffer";
        _socket.onopen = () => {
            console.info("WebSocket connected");
            window.dispatchEvent(new Event("resize"));
            callback();
        };

        _socket.onmessage = (event) => {
            const ev = JSON.parse(event.data);
            if (ev.event == "term") {
                term.write(ev.data);
            }
        };

        _socket.onclose = () => {
            console.info("WebSocket closed");
            socket = null;
        };
    } else {
        callback();
    }
}

type TerminalComponentProps = {
    node_id:string|null;
    instance_id:string|null;
    channel:string|null;
};

export default function TerminalComponent({node_id,instance_id,channel}: TerminalComponentProps) {
    // const node_id = prop.node_id;
    // const instance_id = prop.instance_id;
    // const channel = prop.channel;
    console.log(node_id,instance_id,channel);
    const ref = React.useRef<HTMLDivElement>();
    const term = terminal;
    useAsync(async () => {
        const dom = ref.current;
        term.onData((data) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ event: "term", channel, data }));
            }
        });
        term.onResize((size) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ event: "resize", channel, cols: size.cols, rows: size.rows }));
            }
        });
        open_websocket(term,()=>{
            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log("open_websocket2");
                socket.send(JSON.stringify({ event: "open_terminal", channel, instance_id, node_id, cols: term.cols, rows: term.rows }));
            }
        });



        if (!dom) return;
        if (dom.children.length > 0) return;
        // term.loadAddon(searchAddon);
        // term.loadAddon(unicode11Addon);
        term.open(dom);
    }, [node_id, channel, instance_id]);

    return <Box sx={{ padding: "10px", backgroundColor: "black" }} ref={ref} />;
}
