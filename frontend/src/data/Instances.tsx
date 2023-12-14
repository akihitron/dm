import React from "react";
import Box from "@mui/material/Box";
import U from "../util";
import { DataGrid, GridColDef, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { Button, FormControl, InputLabel, Select, MenuItem, Alert, Card, CardContent, TextField, FormControlLabel, Checkbox, Slider, CircularProgress, Tabs, Tab, Paper, Grid } from "@mui/material";
import ConfirmDialog from "../ConfirmDialog";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Typography from "@mui/material/Typography";
import TerminalComponent from "../terminal/Terminal";
// import TextBoxWithCopyButton from '../libs/TextBoxWithCopyButton';

const BASE_URL = import.meta.env.BASE_URL;
const ORIGIN_URL_OBJ = new URL(window.location.origin);
const WS_PROTOCOL = ORIGIN_URL_OBJ.protocol == "https:" ? "wss:" : "ws:";
const WS_URL = `${WS_PROTOCOL}//${ORIGIN_URL_OBJ.host}${BASE_URL}api/ws/`;
console.warn(WS_URL);

const TEMPLATE_NAME = ["raccoon", "dog", "wild_boar", "rabbit", "cow", "horse", "wolf", "hippopotamus", "kangaroo", "fox", "giraffe", "bear", "koala", "bat", "gorilla", "rhinoceros", "monkey", "deer", "zebra", "jaguar", "polar_bear", "skunk", "elephant", "raccoon_dog", "animal", "reindeer", "rat", "tiger", "cat", "mouse", "buffalo", "hamster", "panda", "sheep", "leopard", "pig", "mole", "goat", "lion", "camel", "squirrel", "donkey"];
const TEMPLATE_NAME2 = ["smiling", "angry", "sad", "surprised", "happy", "crazy", "drunk", "smart", "noble", "spoiled", "sleepy","excited","relaxing","fighting","mysterious", "awesome", "burning", "frost", "giant", "steel", "confused", "talking", "typing", "space"];

const columns: GridColDef[] = [
    {
        field: "combined_name",
        headerName: "Name",
        width: 150,
    },
    {
        field: "base_image",
        headerName: "From",
        width: 140,
        headerAlign: "left",
        align: "left",
    },

    {
        field: "status",
        headerName: "Status",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "ipv4",
        headerName: "IPv4",
        width: 140,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "ipv6",
        headerName: "IPv6",
        width: 150,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "node_name",
        headerName: "Node",
        width: 100,
        headerAlign: "center",
        align: "center",
    },

    {
        field: "cpu_h",
        headerName: "CPU",
        width: 50,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "memory_h",
        headerName: "Memory",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "storage_h",
        headerName: "Storage",
        width: 150,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "created_at",
        headerName: "Created at",
        // type: 'Date',
        width: 210,
        headerAlign: "right",
        align: "right",
    },
    {
        field: "network_mode",
        headerName: "Network",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    { field: "managed_sym", headerName: "M", headerAlign: "center", align: "center", width: 50 },
    { field: "id", headerName: "ID", headerAlign: "center", align: "center", width: 80 },
    {
        field: "status_info",
        headerName: "Info",
        width: 100,
    },
];



const PORT_POOL: Array<number> = [];
for (let i = 0; i < 100; i++) PORT_POOL.push(60000 + i);

function BoundedPorts(port_maps: Array<any>) {
    const table = new Map<string, any>();
    for (const p of port_maps) {
        const node_id = p.node_id;
        const port = p.port;
        const protocol = p.protocol;
        if (table.has(node_id) == false) {
            const obj = {
                ipv4: {
                    tcp: new Set<number>(),
                    udp: new Set<number>(),
                },
                ipv6: {
                    tcp: new Set<number>(),
                    udp: new Set<number>(),
                },
            };
            table.set(node_id, obj);
        }
        const mp = table.get(node_id);
        if (p.is_ipv4) {
            mp.ipv4[protocol].add(port);
        }
        if (p.is_ipv6) {
            mp.ipv6[protocol].add(port);
        }
    }
    return table;
}
function AcceptablePortMaps(n: any) {
    const ret = {
        ipv4: {
            tcp: [] as Array<Array<number>>,
            udp: [] as Array<Array<number>>,
        },
        ipv6: {
            tcp: [] as Array<Array<number>>,
            udp: [] as Array<Array<number>>,
        },
    };
    if (n.use_ipv4) {
        const ip_ports = JSON.parse(n.ipv4_ports);
        const available_ranges = [];
        for (const k in ip_ports) available_ranges.push(ip_ports[k]);
        available_ranges.filter((u: any) => u.protocol == "tcp").forEach((u: any) => ret.ipv4.tcp.push(u.range));
        available_ranges.filter((u: any) => u.protocol == "udp").forEach((u: any) => ret.ipv4.udp.push(u.range));
    }
    if (n.use_ipv6) {
        const ip_ports = JSON.parse(n.ipv6_ports);
        const available_ranges = [];
        for (const k in ip_ports) available_ranges.push(ip_ports[k]);
        available_ranges.filter((u: any) => u.protocol == "tcp").forEach((u: any) => ret.ipv6.tcp.push(u.range));
        available_ranges.filter((u: any) => u.protocol == "udp").forEach((u: any) => ret.ipv6.udp.push(u.range));
    }
    return ret;
}

function GetAvailablePort(n: any, port_map_list: Array<any>, ipvx: string = "ipv4", protocol: string = "tcp") {
    if (n == null) return -1;
    if (port_map_list == null) return -1;
    const acceptable_port_map = AcceptablePortMaps(n) as any;
    const bounded_port_map = BoundedPorts(port_map_list) as any;
    const acceptable_ports = acceptable_port_map[ipvx][protocol];
    const bounded_ports_set = bounded_port_map.get(n.id)?.[ipvx]?.[protocol];
    if (acceptable_ports.length == 0) return -1;
    console.log("acceptable_ports:", acceptable_ports, bounded_ports_set);
    function shuffleArray(array: number[]): number[] {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    for (const range of acceptable_ports) {
        const numbersArray: number[] = Array.from({ length: range[1] - range[0] }, (_, index) => range[0] + index);
        const shuffledArray: number[] = shuffleArray(numbersArray);

        for (const port of shuffledArray) {
            if (bounded_ports_set == null || !bounded_ports_set.has(port)) {
                console.log("available port:", port);
                return port;
            }
        }
    }
    return -1;
}

function QuickSearchToolbar() {
    return (
        <Box
            sx={{
                p: 0.5,
                pb: 0,
            }}
        >
            <GridToolbarQuickFilter
                sx={{ width: "100%", padding: 1 }}
                quickFilterParser={(searchInput: string) =>
                    searchInput
                        .split(",")
                        .map((value) => value.trim())
                        .filter((value) => value !== "")
                }
            />
        </Box>
    );
}

export default function InstancesGrid(prop: any) {
    const onUpdated = prop.onUpdated;

    const [needsUpdate, setNeedsUpdate] = useState(0);
    const [disable_submit, setDisableSubmit] = useState(true);
    const [selectedRows, setSelectedRows] = useState<Array<any>>([]);
    const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);
    const [processing_flag, setProcessingFlag] = useState(false);

    const [tab, changeTab] = useState(0);

    const [node_list, setNodeList] = useState<Array<any> | null>(null);
    const [image_list, setImageList] = useState<Array<any>>([]);
    const [instance_list, setInstanceList] = useState<Array<any>>([]);
    const [selected_node_for_create_instance, setSelectedNodeForCreateInstance] = useState<any>(null);
    const [cpu_core, setCPUCore] = useState(0.25);
    const [memory, setMemory] = useState(512);
    const [storage, setStorage] = useState(8);
    const [something_error, setSomethingError] = useState("");
    const [operation_error, setOperationError] = useState("");
    const [ssh_list, setSSHList] = useState<Array<any>>([]);
    const [ssh_id, setSSH_ID] = useState("");
    const [node_id, setNodeID] = useState("");
    const [image_id, setImageID] = useState("");
    const [error_message, setErrorMessage] = useState("");
    const [copied_message, setCopiedMessage] = useState(false);

    const [error_message_of_instance_name, setErrorMessageOfInstanceName] = useState("");
    const [error_message_of_ssh_port, setErrorMessageOfSSHPort] = useState("");

    const [use_ssh, toggleSSH] = useState(true);
    const [ssh_port, setSSH_Port] = useState(-1);
    const [port_map_list, setPortMapList] = useState<Array<any>>([]);
    const [app_port_list, setAppPortList] = useState<Array<string>>([]);
    const [instance_name, _setInstanceName] = useState(TEMPLATE_NAME[Math.floor(Math.random() * 1000) % TEMPLATE_NAME.length]);
    const setInstanceName = (name: string) => {
        if (name.length <= 2 || instance_list.filter((u: any) => u.name == name).length > 0 || name.match(/^[a-z0-9_-]+$/) == null) {
            setErrorMessageOfInstanceName("Invalid name.");
        } else {
            setErrorMessageOfInstanceName("");
        }
        _setInstanceName(name);
    };
    const updateSubmitButtonForLaunch = () => {
        if (instance_name.length <= 2 || instance_list.filter((u: any) => u.name == instance_name).length > 0 || (use_ssh && ssh_port == -1) || image_list.filter((u: any) => u.id == image_id).length == 0 || instance_name.match(/^[a-z0-9_-]+$/) == null) {
            if (disable_submit == false) setDisableSubmit(true);
        } else {
            if (disable_submit == true) setDisableSubmit(false);
        }
    };
    updateSubmitButtonForLaunch();

    const [accelerator, setAccelerator] = useState("cpu");

    const [buttonName, setButtonName] = useState("");

    const [ac_ins_open, setAcInsOpen] = useState(true);
    const [ac_img_open, setAcImgOpen] = useState(true);
    const [ac_ssh_open, setAcSSHOpen] = useState(true);
    const [ac_net_open, setAcNetOpen] = useState(false);

    const [ssh_tab_instance_name, setSSHTabInstanceName] = useState("");
    const [ssh_tab_address, setSSHTabAddress] = useState("");
    const [ssh_tab_port, setSSHTabPort] = useState(-1);
    const [ssh_tab_key_name, setSSHTabKeyName] = useState("");

    const [enable_cpu_limit, setEnableCPULimit] = useState(false);
    const [enable_memory_limit, setEnableMemoryLimit] = useState(false);
    const [enable_storage_limit, setEnableStorageLimit] = useState(false);

    const [selected_instance, setSelectedInstance] = useState<any>(null);

    let m_memory = 512;
    if (selected_node_for_create_instance?.memory) {
        m_memory = Math.floor(selected_node_for_create_instance.memory);
    }
    let g_storage = 8;
    if (selected_node_for_create_instance?.free_storage) {
        g_storage = Math.floor(selected_node_for_create_instance.free_storage);
    }

    function clear_error_messages() {
        setOperationError("");
        setErrorMessage("");
        setErrorMessageOfInstanceName("");
        setErrorMessageOfSSHPort("");
        setSomethingError("");
    }

    useEffect(() => {
        U.get("api/v1/compute_node/list")
            .then((ret: any) => {
                if (ret.error_code == "x2TpbFQruG") window.location.reload();
                if (ret.data) {
                    const activated_nodes = ret.data.filter((u: any) => u.status.toUpperCase() == "ACTIVATED");
                    setNodeList(activated_nodes);
                    console.log("ActivatedNodes:", activated_nodes);
                    if (activated_nodes.length > 0 && node_id.length == 0) {
                        const n = activated_nodes[0];
                        setNodeID(n.id);
                        setSelectedNodeForCreateInstance(n);
                        const port = GetAvailablePort(n, port_map_list, "ipv4", "tcp");
                        setSSH_Port(port);
                        setCPUCore(n.cpu);
                        setMemory(n.memory);
                        setStorage(n.free_storage);
                    }
                } else {
                    console.error(ret.error);
                    setSomethingError(ret.error);
                }
            })
            .catch((e) => console.error(e));

        U.get("api/v1/ssh/list")
            .then((ret: any) => {
                if (ret.data) {
                    setSSHList(ret.data);
                    if (ret.data.length > 0) {
                        setSSH_ID(ret.data[0].id);
                    }
                } else {
                    console.error(ret.error);
                    setSomethingError(ret.error);
                }
            })
            .catch((e) => console.error(e));

        U.get("api/v1/image/list")
            .then((ret: any) => {
                if (ret.data) {
                    setImageList(ret.data);
                    if (ret.data.length > 0 && image_id.length == 0) {
                        setImageID(ret.data[0].id); //TODO: Timing issue
                    }
                } else {
                    console.error(ret.error);
                    setSomethingError(ret.error);
                }
            })
            .catch((e) => console.error(e));

        U.get("api/v1/port_map/list")
            .then((ret: any) => {
                if (ret.data) {
                    console.log("PortMap:", ret.data);
                    setPortMapList(ret.data);
                    const n = node_list && node_list.filter((n) => n.id == node_id)[0];
                    if (n) {
                        const port = GetAvailablePort(n, port_map_list, "ipv4", "tcp");
                        setSSH_Port(port);
                    }
                } else {
                    console.error(ret.error);
                    setSomethingError(ret.error);
                }
            })
            .catch((e) => console.error(e));

        U.get("api/v1/instance/list")
            .then((ret: any) => {
                if (ret.data) {
                    const data = ret.data.map((u: any) =>
                        Object.assign(u, {
                            combined_name: `${u.node_name} - ${u.name}`,
                            managed_sym: u.managed ? "Y" : "-",
                            created_at: U.format_date(new Date(u.created_at)),
                            cpu_h: u.cpu ?? "host",
                            memory_h: u.memory == -1 ? "host" : U.human_file_size_M(u.memory),
                            storage_h: u.storage == -1 ? "host" : `${U.human_file_size_M(u.storage)}/${U.human_file_size_M(u.total_storage)}`,
                        })
                    );
                    console.log("Instances:", data);
                    setInstanceList(data);
                } else {
                    console.error(ret.error);
                    setSomethingError(ret.error);
                }
            })
            .catch((e) => console.error(e));
    }, [needsUpdate]);

    return (
        <Box sx={{ width: "100%", marginBottom: 10 }}>
            {something_error.length > 0 ? (
                <Alert sx={{ marginBottom: 1 }} severity="error">
                    {something_error}
                </Alert>
            ) : (
                ""
            )}

            {/* <TerminalComponent /> */}

            <h1>Instances</h1>

            <DataGrid
                rows={instance_list}
                columns={columns}
                initialState={{
                    sorting: {
                        sortModel: [{ field: "created_at", sort: "desc" }],
                    },
                    pagination: {
                        paginationModel: {
                            pageSize: 100,
                        },
                    },
                }}
                slots={{ toolbar: QuickSearchToolbar }}
                pageSizeOptions={[100]}
                checkboxSelection
                disableRowSelectionOnClick
                onCellClick={(event: any) => {
                    const instance_id = event.id;
                    setSSHTabPort(-1);
                    setSelectedInstance(null);

                    if (instance_id) {
                        const instance = instance_list.find((u: any) => u.id == instance_id);
                        if (instance) {
                            setSSHTabInstanceName(instance.name);
                            setSSHTabAddress(instance.ipv4);
                            port_map_list.forEach((p: any) => {
                                if (p.instance_id == instance.id) {
                                    setSSHTabPort(p.port);
                                }
                            });
                            setSSHTabKeyName(instance.ssh_key_name);
                            setSelectedInstance(instance);
                        }
                    }
                    for (const instance of instance_list) {
                        instance.selected_as_single = false;
                    }
                    event.row.selected_as_single = true;
                }}
                sx={{
                    maxHeight: 600,
                    minHeight: 200,

                    "& .rows-managed": {
                        // background: '#77777722 !important'
                    },
                    "& .rows-selected": {
                        background: "#3300FF22 !important",
                    },
                    "& .rows-unmanaged": {
                        opacity: 0.25,
                        // background: '#2C7CFF33 !important'
                    },
                }}
                getRowClassName={(params: any) => {
                    const row = params.row;
                    const s_class = row.selected_as_single ? "rows-selected" : "";
                    if (row.managed_sym == "Y") {
                        return ["rows-managed", s_class].filter((s: string) => s.length > 0).join(" ");
                    }
                    return ["rows-unmanaged", s_class].filter((s: string) => s.length > 0).join(" ");
                }}
                onRowSelectionModelChange={(selectedRows: any) => {
                    setSelectedRows(selectedRows);
                    console.log(selectedRows);
                }}
            />

            {operation_error.length > 0 ? (
                <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                    {operation_error}
                </Alert>
            ) : (
                ""
            )}
            <Box sx={{ width: "100%", marginTop: 2, textAlign: processing_flag ? "center" : "right" }}>
                {processing_flag ? (
                    <CircularProgress size="1.5rem" />
                ) : (
                    <>
                        <Button
                            sx={{ width: "20%", marginLeft: 1 }}
                            variant="contained"
                            onClick={() => {
                                setButtonName("start");
                                setConfirmDialogVisibility(true);
                            }}
                            color="primary"
                            disabled={selectedRows.length == 0}
                        >
                            Start
                        </Button>
                        <Button
                            sx={{ width: "20%", marginLeft: 1 }}
                            variant="contained"
                            onClick={() => {
                                setButtonName("stop");
                                setConfirmDialogVisibility(true);
                            }}
                            color="primary"
                            disabled={selectedRows.length == 0}
                        >
                            Stop
                        </Button>
                        <Button
                            sx={{ width: "20%", marginLeft: 1 }}
                            variant="contained"
                            onClick={() => {
                                setConfirmDialogVisibility(true);
                                setButtonName("restart");
                            }}
                            color="primary"
                            disabled={selectedRows.length == 0}
                        >
                            Restart
                        </Button>
                        <Button
                            sx={{ width: "20%", marginLeft: 1 }}
                            variant="contained"
                            onClick={() => {
                                setButtonName("delete");
                                setConfirmDialogVisibility(true);
                            }}
                            color="primary"
                            disabled={selectedRows.length == 0}
                        >
                            Delete
                        </Button>
                    </>
                )}
            </Box>

            {/* <TextBoxWithCopyButton/> */}

            <Box sx={{ width: "100%", marginTop: 2, boxShadow: "0px 0px 2px black" }}>
                <Tabs onChange={(event: React.SyntheticEvent, newValue: number) => changeTab(newValue)} value={tab}>
                    <Tab label="Launch" />
                    {selected_instance != null ? <Tab label="SSH" disabled={selected_instance == null || ssh_tab_port <= 0} /> : ""}
                    {selected_instance != null ? <Tab label="Status" disabled={selected_instance == null} /> : ""}
                    {selected_instance != null ? <Tab label="Terminal" disabled={selected_instance == null} /> : ""}
                </Tabs>
            </Box>

            {tab == 0 ? (
                    <Box sx={{ boxShadow: "0px 0px 2px black" }}>
                        <Card>
                            <CardContent>
                                {error_message.length > 0 ? (
                                    <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                                        {error_message}
                                    </Alert>
                                ) : (
                                    ""
                                )}

                                {processing_flag ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
                                        <CircularProgress size="1.5rem" />
                                    </Box>
                                ) : (
                                    <>
                                        <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                                            <Grid item xs={6}>
                                                <Accordion
                                                    sx={{ backgroundColor: "#88888802" }}
                                                    expanded={ac_ins_open}
                                                    onChange={() => {
                                                        setAcInsOpen(!ac_ins_open);
                                                    }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header" sx={{ backgroundColor: "#88888808" }}>
                                                        <Typography>Instance</Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        {node_list && node_list.length == 0 ? (
                                                            <Alert sx={{ marginBottom: 1 }} severity="warning">
                                                                {"No node. Please register a node."}
                                                            </Alert>
                                                        ) : (
                                                            <>
                                                                <FormControl fullWidth sx={{ marginTop: 2, width: "100%" }}>
                                                                    <InputLabel id="node_list-simple-select-label">Node</InputLabel>
                                                                    <Select
                                                                        labelId="node_list-simple-select-label"
                                                                        id="node_list-simple-select"
                                                                        value={node_id}
                                                                        label="Node"
                                                                        onChange={(event: any) => {
                                                                            const node_id = event.target.value;
                                                                            const n = node_list && node_list.filter((n) => n.id == node_id)[0];
                                                                            if (n) {
                                                                                setNodeID(node_id);
                                                                                setSelectedNodeForCreateInstance(node_list && node_list.find((u: any) => u.id == node_id));
                                                                                setAccelerator("cpu");
                                                                                const port = GetAvailablePort(n, port_map_list, "ipv4", "tcp");
                                                                                setSSH_Port(port);
                                                                                const image = image_list.find((u: any) => u.node_id == node_id);
                                                                                setImageID(image?.id ?? "");

                                                                                setCPUCore(n.cpu);
                                                                                setMemory(n.memory);
                                                                                setStorage(n.free_storage);
                                                                            } else {
                                                                                setNodeID("");
                                                                                setNeedsUpdate(Math.random());
                                                                            }
                                                                        }}
                                                                    >
                                                                        {node_list &&
                                                                            node_list.map((u: any, index: number) => (
                                                                                <MenuItem key={index} value={u.id}>
                                                                                    {u.name}
                                                                                </MenuItem>
                                                                            ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </>
                                                        )}

                                                        <TextField
                                                            label="Instance name"
                                                            variant="outlined"
                                                            sx={{ marginBottom: 2, marginTop: 2, width: "100%" }}
                                                            error={!!error_message_of_instance_name}
                                                            helperText={error_message_of_instance_name}
                                                            value={instance_name}
                                                            onChange={(event: any) => {
                                                                setInstanceName(event.target.value);
                                                            }}
                                                        />
                                                    </AccordionDetails>
                                                </Accordion>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Accordion
                                                    sx={{ backgroundColor: "#88888802" }}
                                                    expanded={ac_img_open}
                                                    onChange={() => {
                                                        setAcImgOpen(!ac_img_open);
                                                    }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel2a-content" id="panel2a-header" sx={{ backgroundColor: "#88888808" }}>
                                                        <Typography>OS Image</Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <FormControl fullWidth sx={{ marginTop: 2 }}>
                                                            <InputLabel id="image-simple-select-label">Image</InputLabel>
                                                            <Select
                                                                labelId="image-simple-select-label"
                                                                id="image-simple-select"
                                                                value={String(image_id)}
                                                                label="Image"
                                                                onChange={(event: any) => {
                                                                    setImageID(event.target.value);
                                                                }}
                                                            >
                                                                {image_list
                                                                    .filter((img) => selected_node_for_create_instance && img.node_id == selected_node_for_create_instance.id)
                                                                    .map((u: any, index: number) => (
                                                                        <MenuItem key={index} value={u.id}>
                                                                            {u.name} <Typography sx={{ color: "gray", marginLeft: 1 }}>[ {U.human_file_size_M(u.size)} ]</Typography>
                                                                        </MenuItem>
                                                                    ))}
                                                            </Select>
                                                        </FormControl>
                                                    </AccordionDetails>
                                                </Accordion>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Accordion
                                                    sx={{ backgroundColor: "#88888802" }}
                                                    expanded={ac_ssh_open}
                                                    onChange={() => {
                                                        setAcSSHOpen(!ac_ssh_open);
                                                    }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel3a-content" id="panel3a-header" sx={{ backgroundColor: "#88888808" }}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={use_ssh}
                                                                    onClick={(event: any) => {
                                                                        event.stopPropagation();
                                                                        toggleSSH(!use_ssh);
                                                                    }}
                                                                />
                                                            }
                                                            label="SSH"
                                                        />
                                                    </AccordionSummary>

                                                    <AccordionDetails>
                                                        {ssh_list && ssh_list.length == 0 ? (
                                                            <Alert sx={{ marginBottom: 1 }} severity="warning">
                                                                {"No SSH key. Please register a your public key first."}
                                                            </Alert>
                                                        ) : (
                                                            <>
                                                                <FormControl fullWidth sx={{ marginTop: 2, width: "100%" }}>
                                                                    <InputLabel id="ssh_key-simple-select-label">SSH Key</InputLabel>
                                                                    <Select
                                                                        labelId="ssh_key-simple-select-label"
                                                                        id="ssh_key-simple-select"
                                                                        value={ssh_id}
                                                                        label="SSH Key"
                                                                        onChange={(event: any) => {
                                                                            setSSH_ID(event.target.value);
                                                                        }}
                                                                    >
                                                                        {ssh_list.map((u: any, index: number) => (
                                                                            <MenuItem key={index} value={u.id}>
                                                                                {u.name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </>
                                                        )}

                                                        <TextField label="SSH port" variant="outlined" sx={{ marginBottom: 2, marginTop: 2, width: "100%" }} error={!!error_message_of_ssh_port} helperText={error_message_of_ssh_port} value={ssh_port} onChange={(event: any) => { }} disabled />
                                                    </AccordionDetails>
                                                </Accordion>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Accordion
                                                    sx={{ backgroundColor: "#88888802" }}
                                                    expanded={ac_net_open}
                                                    onChange={() => {
                                                        setAcNetOpen(!ac_net_open);
                                                    }}
                                                >
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel4a-content" id="panel4a-header" sx={{ backgroundColor: "#88888808" }}>
                                                        <Typography>Advanced</Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <Box sx={{ padding: 2 }}>
                                                            <FormControlLabel
                                                                control={
                                                                    <Checkbox
                                                                        checked={enable_cpu_limit}
                                                                        onClick={(event: any) => {
                                                                            event.stopPropagation();
                                                                            setEnableCPULimit(!enable_cpu_limit);
                                                                        }}
                                                                    />
                                                                }
                                                                label="Enable CPU Limit"
                                                            />
                                                            <br />

                                                            {enable_cpu_limit ? (
                                                                <>
                                                                    <span>
                                                                        CPU Slicing ( {selected_node_for_create_instance?.cpu ?? 1} Cores ) : {selected_node_for_create_instance?.cpu_info ?? ""}
                                                                    </span>
                                                                    <Slider
                                                                        aria-label="CPU"
                                                                        defaultValue={selected_node_for_create_instance?.cpu ?? 1}
                                                                        getAriaValueText={(value: number) => {
                                                                            return `${value}${value == 1 ? "Core" : "Cores"}`;
                                                                        }}
                                                                        valueLabelDisplay="auto"
                                                                        step={0.25}
                                                                        marks
                                                                        min={0.25}
                                                                        max={selected_node_for_create_instance?.cpu ?? 1}
                                                                        onChange={(event: any, value: any) => {
                                                                            setCPUCore(value);
                                                                        }}
                                                                    />
                                                                </>
                                                            ) : (
                                                                ""
                                                            )}

                                                            <FormControlLabel
                                                                control={
                                                                    <Checkbox
                                                                        checked={enable_memory_limit}
                                                                        onClick={(event: any) => {
                                                                            event.stopPropagation();
                                                                            setEnableMemoryLimit(!enable_memory_limit);
                                                                        }}
                                                                    />
                                                                }
                                                                label="Enable Memory Limit"
                                                            />
                                                            <br />

                                                            {enable_memory_limit ? (
                                                                <>
                                                                    <span>Memory Cap ( {m_memory} MB )</span>
                                                                    <Slider
                                                                        aria-label="Memory"
                                                                        defaultValue={m_memory}
                                                                        getAriaValueText={(value: number) => {
                                                                            return `${value}MB`;
                                                                        }}
                                                                        valueLabelDisplay="auto"
                                                                        step={256}
                                                                        marks
                                                                        min={256}
                                                                        max={m_memory}
                                                                        onChange={(event: any, value: any) => {
                                                                            setMemory(parseInt(value));
                                                                        }}
                                                                    />
                                                                </>
                                                            ) : (
                                                                ""
                                                            )}

                                                            <FormControlLabel
                                                                control={
                                                                    <Checkbox
                                                                        checked={enable_storage_limit}
                                                                        onClick={(event: any) => {
                                                                            event.stopPropagation();
                                                                            setEnableStorageLimit(!enable_storage_limit);
                                                                        }}
                                                                    />
                                                                }
                                                                label="Enable Storage Limit"
                                                            />
                                                            <br />
                                                            {enable_storage_limit ? (
                                                                <span>
                                                                    <span>Storage Cap ( {g_storage} GB )</span>
                                                                    <Slider
                                                                        aria-label="Storage"
                                                                        defaultValue={g_storage}
                                                                        getAriaValueText={(value: number) => {
                                                                            return `${value}GB`;
                                                                        }}
                                                                        valueLabelDisplay="auto"
                                                                        step={2}
                                                                        marks
                                                                        min={8}
                                                                        max={g_storage}
                                                                        onChange={(event: any, value: any) => {
                                                                            setStorage(parseInt(value));
                                                                        }}
                                                                    />
                                                                </span>
                                                            ) : (
                                                                ""
                                                            )}
                                                            {enable_storage_limit && selected_node_for_create_instance && selected_node_for_create_instance.manipulator_driver == "docker" ? (
                                                                <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                                                                    The docker does not support storage limitation for instance.
                                                                </Alert>
                                                            ) : (
                                                                ""
                                                            )}
                                                        </Box>

                                                        <FormControl fullWidth sx={{ marginTop: 2, width: "100%" }}>
                                                            <InputLabel id="node_list-simple-select-label">Accelerator</InputLabel>
                                                            <Select
                                                                labelId="node_list-simple-select-label"
                                                                id="node_list-simple-select"
                                                                value={accelerator}
                                                                label="Accelerator"
                                                                onChange={(event: any) => {
                                                                    setAccelerator(event.target.value);
                                                                }}
                                                            >
                                                                <MenuItem value={"cpu"}>Only CPU</MenuItem>
                                                                {selected_node_for_create_instance?.gpu && selected_node_for_create_instance?.gpu_driver == "cuda" ? <MenuItem value={"cuda"}>CUDA {selected_node_for_create_instance?.gpu_info}</MenuItem> : ""}
                                                                {selected_node_for_create_instance?.gpu && selected_node_for_create_instance?.gpu_driver == "rocm" ? <MenuItem value={"rocm"}>ROCm {selected_node_for_create_instance?.gpu_info}</MenuItem> : ""}
                                                            </Select>
                                                        </FormControl>
                                                    </AccordionDetails>
                                                </Accordion>
                                            </Grid>
                                        </Grid>

                                        {error_message.length > 0 ? (
                                            <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                                                {error_message}
                                            </Alert>
                                        ) : (
                                            ""
                                        )}

                                        <Button
                                            sx={{ width: "100%", marginTop: 4 }}
                                            variant="contained"
                                            onClick={() => {
                                                clear_error_messages();
                                                setDisableSubmit(true);
                                                setProcessingFlag(true);
                                                setTimeout(() => {
                                                    U.post("api/v1/instance/create", {
                                                        node_id: node_id,
                                                        image_id: image_id,
                                                        instance_name: instance_name,
                                                        accelerator: accelerator,
                                                        cpu: enable_cpu_limit ? cpu_core : null,
                                                        memory: enable_memory_limit ? memory : null,
                                                        storage: enable_storage_limit ? storage : null,
                                                        network_mode: "host", // TODO: network_mode

                                                        params: {
                                                            ssh: {
                                                                enabled: use_ssh,
                                                                id: ssh_id,
                                                                port: ssh_port,
                                                                install: use_ssh,
                                                            },
                                                        },
                                                    })
                                                        .then((ret: any) => {
                                                            console.log(ret);
                                                            console.log(onUpdated);
                                                            if (onUpdated) onUpdated();
                                                            setNeedsUpdate(Math.random());
                                                            if (ret.error) {
                                                                setErrorMessage(ret.error);
                                                                console.error(ret.error);
                                                                setDisableSubmit(true);
                                                            }
                                                            setInstanceName(TEMPLATE_NAME2[Math.floor(Math.random() * 1000) % TEMPLATE_NAME2.length] +"_"+ TEMPLATE_NAME[Math.floor(Math.random() * 1000) % TEMPLATE_NAME.length]);
                                                        })
                                                        .catch((e) => {
                                                            console.error(e);
                                                        })
                                                        .finally(() => {
                                                            setTimeout(() => {
                                                                // setDisableSubmit(false);
                                                                setProcessingFlag(false);
                                                                setNeedsUpdate(Math.random());
                                                            }, 1000);
                                                        });
                                                }, 0);
                                                setTimeout(() => {
                                                    setNeedsUpdate(Math.random());
                                                }, 2500);
                                            }}
                                            color="primary"
                                            disabled={disable_submit || (use_ssh == true && ssh_list.length == 0)}
                                        >
                                            Launch a new instance
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
            ) : (
                ""
            )}

            {tab == 1 && selected_instance && ssh_tab_port > 0 ? (
                <Box sx={{ boxShadow: "0px 0px 2px black" }}>
                    <Card>
                        <CardContent>
                            <Paper
                                sx={{
                                    height: 200,
                                    marginTop: 2,
                                    padding: 2,
                                    width: "100%",
                                    backgroundColor: "#222",
                                    overflow: "auto",
                                    color: "#AAA",
                                    whiteSpace: "pre-wrap",

                                    boxShadow: "0px 0px 2px black",
                                }}
                            >
                                <Typography variant="body2" component="code">
                                    {`Host ${ssh_tab_instance_name}\n\tHostName ${ssh_tab_address}\n\tUser root\n\tPort ${ssh_tab_port}\n\tIdentitiesOnly yes\n\tIdentityFile ~/.ssh/${ssh_tab_key_name}.pem\n\tServerAliveInterval 5`}
                                </Typography>
                            </Paper>
                            <Button
                                variant="outlined"
                                sx={{ marginTop: 2 }}
                                onClick={() => {
                                    const ssh_text = `Host ${ssh_tab_instance_name}\n\tHostName ${ssh_tab_address}\n\tUser root\n\tPort ${ssh_tab_port}\n\tIdentitiesOnly yes\n\tIdentityFile ~/.ssh/${ssh_tab_key_name}.pem\n\tServerAliveInterval 5`;
                                    U.copyTextToClipboard(ssh_text);
                                    setCopiedMessage(true);
                                    setTimeout(() => {
                                        setCopiedMessage(false);
                                    }, 800);
                                }}
                            >
                                {copied_message ? "Copied!" : "Copy to clipboard"}
                            </Button>
                        </CardContent>
                    </Card>
                </Box>
            ) : (
                ""
            )}

            {tab == 2 && selected_instance ? (
                <>
                    <Box sx={{ boxShadow: "0px 0px 2px black" }}>
                        <Card>
                            <CardContent>
                                <Paper
                                    sx={{
                                        marginTop: 2,
                                        padding: 2,
                                        width: "100%",
                                        backgroundColor: "#222",
                                        overflow: "auto",
                                        color: "#AAA",
                                        whiteSpace: "pre-wrap",
                                        boxShadow: "0px 0px 2px black",
                                    }}
                                >
                                    <Typography>Name : {selected_instance.name}</Typography>
                                    <Typography>status : {selected_instance.status}</Typography>
                                    <Typography>status_info : {selected_instance.status_info}</Typography>
                                    <Typography>cpu : {selected_instance.cpu_h}</Typography>
                                    <Typography>memory : {selected_instance.memory_h}</Typography>
                                    <Typography>storage : {selected_instance.storage_h}</Typography>
                                    <Typography>network_mode : {selected_instance.network_mode}</Typography>
                                    <Typography>ipv4 : {selected_instance.ipv4}</Typography>
                                    <Typography>ipv6 : {selected_instance.ipv6}</Typography>
                                    <Typography>local_ipv4 : {selected_instance.local_ipv4}</Typography>
                                    <Typography>local_ipv6 : {selected_instance.local_ipv6}</Typography>
                                    <Typography>description : {selected_instance.description}</Typography>
                                    <Typography>managed : {selected_instance.managed_sym}</Typography>
                                    <Typography>ssh_key_name : {selected_instance.ssh_key_name}</Typography>
                                    <Typography>created_at : {selected_instance.created_at}</Typography>
                                    <Typography>updated_at : {selected_instance.updated_at}</Typography>
                                </Paper>
                            </CardContent>
                        </Card>
                    </Box>
                </>
            ) : (
                ""
            )}

            {tab == 3 ? (
                <Box sx={{ boxShadow: "0px 0px 2px black" }}>
                    <TerminalComponent />
                </Box>
            ) : (
                ""
            )}

            <ConfirmDialog
                open={showConfirmDialog}
                setOpen={setConfirmDialogVisibility}
                onSubmit={(flag: boolean) => {
                    clear_error_messages();

                    if (flag) {
                        (async () => {
                            setProcessingFlag(true);
                            setTimeout(() => {
                                setNeedsUpdate(Math.random());
                            }, 2500);
                            for (const row of selectedRows) {
                                if (buttonName == "delete") {
                                    await U.post("api/v1/instance/delete", { instance_id: row })
                                        .then((ret: any) => {
                                            if (ret.error) {
                                                setOperationError(ret.error);
                                                console.error(ret.error);
                                            }
                                            console.log(onUpdated);
                                            if (onUpdated) onUpdated();
                                        })
                                        .catch((e) => {
                                            setOperationError(e.toString());
                                            console.error(e);
                                        });
                                } else if (buttonName == "start") {
                                    await U.post("api/v1/instance/start", { instance_id: row })
                                        .then((ret: any) => {
                                            if (ret.error) {
                                                setOperationError(ret.error);
                                                console.error(ret.error);
                                            }
                                            console.log(onUpdated);
                                            if (onUpdated) onUpdated();
                                        })
                                        .catch((e) => {
                                            setOperationError(e.toString());
                                            console.error(e);
                                        });
                                } else if (buttonName == "stop") {
                                    await U.post("api/v1/instance/stop", { instance_id: row })
                                        .then((ret: any) => {
                                            if (ret.error) {
                                                setOperationError(ret.error);
                                                console.error(ret.error);
                                            }
                                            console.log(onUpdated);
                                            if (onUpdated) onUpdated();
                                        })
                                        .catch((e) => {
                                            setOperationError(e.toString());
                                            console.error(e);
                                        });
                                } else if (buttonName == "restart") {
                                    await U.post("api/v1/instance/stop", { instance_id: row })
                                        .then((ret: any) => {
                                            if (ret.error) {
                                                setOperationError(ret.error);
                                                console.error(ret.error);
                                            }
                                            console.log(onUpdated);
                                            if (onUpdated) onUpdated();
                                        })
                                        .catch((e) => {
                                            setOperationError(e.toString());
                                            console.error(e);
                                        });
                                    await U.post("api/v1/instance/start", { instance_id: row })
                                        .then((ret: any) => {
                                            if (ret.error) {
                                                setOperationError(ret.error);
                                                console.error(ret.error);
                                            }
                                            console.log(onUpdated);
                                            if (onUpdated) onUpdated();
                                        })
                                        .catch((e) => {
                                            setOperationError(e.toString());
                                            console.error(e);
                                        });
                                }
                            }
                            setTimeout(() => {
                                setNeedsUpdate(Math.random());
                                setProcessingFlag(false);
                            }, 1000);
                        })();
                    }
                }}
            />
        </Box>
    );
}
