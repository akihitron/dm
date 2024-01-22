import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
// import TextBoxWithCopyButton from '../libs/TextBoxWithCopyButton';

import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useAsync } from "react-use";
import { Button } from "@mui/material";
// import { Unicode11Addon } from '@xterm/addon-unicode11';

const pathJoin = (parts: Array<string>, sep = '/') => parts.join(sep).replace(new RegExp(sep + '{1,}', 'g'), sep);


const BASE_URL = import.meta.env.BASE_URL;
const ORIGIN_URL_OBJ = new URL(window.location.origin);
const WS_PROTOCOL = ORIGIN_URL_OBJ.protocol == "https:" ? "wss:" : "ws:";
const WS_URL = `${WS_PROTOCOL}//${ORIGIN_URL_OBJ.host}${pathJoin([BASE_URL, 'api/ws/'])}`;

const fitAddon = new FitAddon();
const webLinksAddon = new WebLinksAddon();


window.addEventListener("resize", () => {
    fitAddon.fit();
});


type TerminalComponentProps = {
    node_id: string | null;
    instance_id: string | null;
    is_instance_terminal: boolean;
};

class TerminalInstance {
    socket: WebSocket | null = null;
    terminal: Terminal | null = null;
    dom: HTMLDivElement | null = null;
    channel_id: string | null = null;
    node_id: string | null = null;
    instance_id: string | null = null;
    is_instance_terminal: boolean = false;

    constructor(is_instance_terminal: boolean) {
        this.is_instance_terminal = is_instance_terminal;
    }



    handler(
        dom: HTMLDivElement | null | undefined,
        ws_url: string,
        node_id: string | null = null,
        instance_id: string | null = null,
    ) {
        const scope = this;


        if (dom != scope.dom || scope.node_id != node_id || scope.instance_id != instance_id) {
            console.log("dom != scope.dom");
            scope.socket?.close();
            scope.socket = null;
            scope.terminal?.dispose();
            scope.terminal = null;
            scope.channel_id = null;
            scope.dom = null;
        }

        scope.node_id = node_id;
        scope.instance_id = instance_id;

        if (dom && scope.terminal == null) {
            console.warn("new Terminal");
            dom.innerHTML = "";
            scope.terminal = new Terminal({
                fontFamily: "courier-new, courier, monospace",
                fontWeight: undefined,
                fontSize: 14,
                screenKeys: true, // Prevent esq key, and some other keys from being handled by the browser
                allowProposedApi: true,
            } as any);
            scope.terminal.loadAddon(fitAddon);
            scope.terminal.loadAddon(webLinksAddon);
            scope.terminal.open(dom);
            scope.terminal.onData((data) => {
                const socket = scope.socket;
                const channel_id = scope.channel_id;
                const instance_id = scope.instance_id;
                const node_id = scope.node_id;
                if (socket && socket.readyState === WebSocket.OPEN && channel_id) {
                    socket.send(JSON.stringify({ event: "term", channel_id, instance_id, node_id, data }));
                }
            });
            scope.terminal.onResize((size) => {
                const socket = scope.socket;
                const channel_id = scope.channel_id;
                const instance_id = scope.instance_id;
                const node_id = scope.node_id;
                if (socket && socket.readyState === WebSocket.OPEN && channel_id) {
                    socket.send(JSON.stringify({ event: "resize", channel_id, instance_id, node_id, cols: size.cols, rows: size.rows }));
                }
            });
            window.dispatchEvent(new Event("resize"));
            this.dom = dom;
        }



        if (node_id && ((scope.is_instance_terminal == false) || (scope.is_instance_terminal && scope.instance_id)) && scope.socket == null && scope.terminal) {
            scope.socket = new WebSocket(ws_url);
            scope.socket.onopen = () => {
                console.log("new WebSocket");
                const socket = scope.socket;
                const instance_id = scope.instance_id;
                const node_id = scope.node_id;
                const terminal = scope.terminal;
                if (terminal && socket && socket.readyState === WebSocket.OPEN) {
                    const event = { event: "open_terminal", instance_id, node_id, cols: terminal.cols, rows: terminal.rows };
                    // console.log(event);
                    socket.send(JSON.stringify(event));
                }
            };

            scope.socket.onmessage = (event: MessageEvent<any>) => {
                const terminal = scope.terminal;
                const ev = JSON.parse(event.data);
                // console.log(ev);
                if (ev.error) {
                    console.error(ev.error);
                    return;
                }
                if (ev.event == "term" && terminal) {
                    terminal.write(ev.data);
                } else if (ev.event == "open_terminal") {
                    console.log("Open Terminal", ev.channel_id);
                    scope.channel_id = ev.channel_id;
                    window.dispatchEvent(new Event("resize"));
                }
            };
            scope.socket.onerror = (event) => {
                console.info("WebSocket error:", event);
            };

            scope.socket.onclose = () => {
                console.info("WebSocket closed");
            };
        }

    }



}


export default function TerminalComponent({ node_id, instance_id, is_instance_terminal }: TerminalComponentProps) {
    const ref = useRef<HTMLDivElement>();
    const [terminal_instance, setTerminalInstance] = useState<TerminalInstance>(new TerminalInstance(is_instance_terminal));
    // console.log("TerminalComponent",ref.current, node_id, instance_id, is_instance_terminal);
    useEffect(() => {
        terminal_instance.handler(ref.current, WS_URL, node_id, instance_id);
    }, [terminal_instance, node_id, instance_id, is_instance_terminal, ref.current]);

    return <Box sx={{ width: "100%", padding: 0 }}>
        <Box sx={{ width: "100%", textAlign: "right" }}>
            {/* <Button
                sx={{ width: 100, ml: 1, mt: 1, mb: 1 }}
                variant="outlined"
                onClick={() => {
                    setTerminalInstance(new TerminalInstance(is_instance_terminal));
                }}
                color="primary"
            >Refresh</Button> */}
            {/* <Button
                sx={{ width: 100, ml: 1, mt: 1, mb: 1, mr: 1 }}
                variant="outlined"
                onClick={() => { }}
                color="primary"
            >Connect</Button> */}
        </Box>
        <Box sx={{ width: "calc(100%)", borderRadius: 0, pd: 0, mb: 0, backgroundColor: "black" }}>
            <Box sx={{ width: "100%", height: "300px", }} ref={ref} />
        </Box>
    </Box>;
}

