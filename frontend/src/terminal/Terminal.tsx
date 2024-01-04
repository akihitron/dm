import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
// import TextBoxWithCopyButton from '../libs/TextBoxWithCopyButton';

import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
// import {SearchAddon} from '@xterm/addon-search';
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useAsync } from "react-use";
import { Button } from "@mui/material";
// import { Unicode11Addon } from '@xterm/addon-unicode11';

const BASE_URL = import.meta.env.BASE_URL;
const ORIGIN_URL_OBJ = new URL(window.location.origin);
const WS_PROTOCOL = ORIGIN_URL_OBJ.protocol == "https:" ? "wss:" : "ws:";
const WS_URL = `${WS_PROTOCOL}//${ORIGIN_URL_OBJ.host}${BASE_URL}api/ws/`;

const fitAddon = new FitAddon();
const webLinksAddon = new WebLinksAddon();
// const searchAddon = new SearchAddon();
// const unicode11Addon = new Unicode11Addon();
// let terminal: Terminal|null = null;
// Terminal.element.addEventListener
// terminal.attachCustomKeyEventHandler((e) => {

// });
// terminal.onKey((e) => {
//     console.log(e);
//     e.domEvent.preventDefault();
//     e.domEvent.stopPropagation()
// if (e.domEvent.code === "ESCAPE") { 

//     }
//   });
// document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape") {
//         console.log(e.key);
//         e.preventDefault();
//     }
// });
// document.addEventListener("keyup", (e) => {
//     if (e.key === "Escape") {
//         console.log(e.key);
//         e.preventDefault();
//     }
// });


// let socket: WebSocket | null = null;
// Socket:Channel = 1:*


window.addEventListener("resize", () => {
    fitAddon.fit();
});


type TerminalComponentProps = {
    node_id: string | null;
    instance_id: string | null;
};

class TestA {
    constructor() {
        console.log("TestA");
    }
    test() {
        console.log("test");
    }

}

export default function TerminalComponent({ node_id, instance_id }: TerminalComponentProps) {
    // const node_id = prop.node_id;
    // const instance_id = prop.instance_id;
    // const channel = prop.channel;
    // console.log(node_id, instance_id);
    const ref = useRef<HTMLDivElement>();
    const [testA, setTestA] = useState(Math.random());
    const [channel_id, setChannelId] = useState<string | null>(null);
    const socketRef = useRef<WebSocket>();
    const terminalRef = useRef<Terminal>();
    console.log(testA);

    useEffect(() => {
        console.log("new terminal");

        const dom = ref.current;
        //if (node_id&&instance_id&&channel_id) return;
        // dom.innerHTML = "";
        // if (dom.children.length > 0) return;


        // console.log("new terminal1");_

        if (!terminalRef.current && dom) {
            // console.log("new terminal2");
            const _socket = new WebSocket(WS_URL);
            socketRef.current = _socket;

            const terminal = new Terminal({
                fontFamily: "courier-new, courier, monospace",
                fontWeight: undefined,
                fontSize: 14,
                screenKeys: true, // Prevent esq key, and some other keys from being handled by the browser
                allowProposedApi: true,
            } as any);
            terminalRef.current = terminal;
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(webLinksAddon);
            terminal.open(dom);
        }
        
        if (terminalRef.current && socketRef.current) {
            const terminal = terminalRef.current;
            const _socket = socketRef.current;
            terminal.element?.addEventListener("blur", (e) => {
                console.log("blur", e);
            });

            terminal.onData((data) => {
                // console.log("terminal.onData",data, _socket?.readyState === WebSocket.OPEN, channel_id);
                if (_socket && _socket.readyState === WebSocket.OPEN && channel_id) {
                    _socket.send(JSON.stringify({ event: "term", channel_id, instance_id, node_id, data }));
                }
            });
            terminal.onResize((size) => {
                console.log("terminal.onResize",size);
                if (_socket && _socket.readyState === WebSocket.OPEN && channel_id) {
                    _socket.send(JSON.stringify({ event: "resize", channel_id, instance_id, node_id, cols: size.cols, rows: size.rows }));
                }
            });


            // _socket.binaryType = "arraybuffer";
            _socket.onopen = () => {
                console.info("_socket.onopen", "WebSocket connected");
                if (terminal && _socket && _socket.readyState === WebSocket.OPEN) {
                    const event = { event: "open_terminal", instance_id, node_id, cols: terminal.cols, rows: terminal.rows };
                    console.log(event);
                    _socket.send(JSON.stringify(event));
                }
            };

            _socket.onmessage = (event: MessageEvent<any>) => {
                const ev = JSON.parse(event.data);
                // console.log(ev);
                if (ev.error) {
                    console.error(ev.error);
                    return;
                }
                if (ev.event == "term" && terminal) {
                    terminal.write(ev.data);
                } else if (ev.event == "open_terminal") {
                    console.log("@@@@@@@@@@@@@@@Opened and resize@@@@@@@@@@@@@@@@@", ev.channel_id);
                    setChannelId(ev.channel_id);
                    setTimeout(() => window.dispatchEvent(new Event("resize")), 1000);
                }
            };
            _socket.onerror = (event) => {
                console.info("WebSocket error:", event);
            };

            _socket.onclose = () => {
                console.info("WebSocket closed");
            };
            // return ()=> {
            //     _socket.close();
            //     terminal.dispose();
            // }
        }
        // return () => {
        //     console.log("closed terminal");                
        // };
}, [node_id, channel_id, instance_id]);

    return <Box sx={{ width: "100%", padding:1 }}>
        <Box sx={{ width: "100%", textAlign: "right" }}>
            <Button
                sx={{ width: 100, marginLeft: 1, mt: 1, mb: 1 }}
                variant="outlined"
                onClick={() => { }}
                color="primary"
            >Refresh</Button>
            <Button
                sx={{ width: 100, marginLeft: 1, mt: 1, mb: 1, mr: 1 }}
                variant="outlined"
                onClick={() => { }}
                color="primary"
            >Connect</Button>
        </Box>
        <Box sx={{ width: "calc(100% - 10px)",padding: "10px", marginBottom:"50px", backgroundColor: "black"  }}>
            <Box sx={{ width:"100%", height: "300px", }} ref={ref} />
        </Box>
    </Box>;
}