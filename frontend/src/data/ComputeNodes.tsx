import React from "react";
import Box from "@mui/material/Box";
import U from "../util";
import { DataGrid, GridColDef, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, CircularProgress, FormControl, Paper, Tab, Tabs, Typography } from "@mui/material";
import ConfirmDialog from "../ConfirmDialog";
import TerminalComponent from "../terminal/Terminal";

const columns: GridColDef[] = [
    {
        field: "name",
        headerName: "Host Name",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "status",
        headerName: "Status",
        width: 120,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "manipulator_driver",
        headerName: "Manipulator",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "ipv4",
        headerName: "IPv4",
        width: 120,
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
        field: "platform",
        headerName: "Platform",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "cpu",
        headerName: "CPU",
        width: 50,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "cpu_info",
        headerName: "Model",
        width: 200,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "gpu",
        headerName: "GPU",
        width: 50,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "gpu_info",
        headerName: "Model",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "memory",
        headerName: "Mem",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "storage",
        headerName: "Storage",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "description",
        headerName: "Description",
        width: 150,
        editable: true,
    },
    {
        field: "updated_at",
        headerName: "Updated",
        // type: 'Date',
        width: 200,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "created_at",
        headerName: "Created",
        // type: 'Date',
        width: 200,
        headerAlign: "center",
        align: "center",
    },
    { field: "id", headerName: "ID", headerAlign: "center", align: "center", width: 80 },
];

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

export default function ComputeNodesGrid(prop: any) {
    const onUpdated = prop.onUpdated;
    const [needsUpdate, setNeedsUpdate] = useState(0);
    const [disable_submit, setDisableSubmit] = useState(false);
    const [data, setData] = useState<any>([]);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);
    const [showNodeIDConfirmDialog, setNodeIDConfirmDialogVisibility] = useState(false);
    const [a_new_node_id, setNewNodeID] = useState("");
    const [consoleLogText, setConsoleLogText] = useState("");
    const [ac_chk_open, setAcChkOpen] = useState(false);
    const [something_error, setSomethingError] = useState("");
    const [progress, setProgress] = useState("");
    const [selected_node, setSelectedNode] = useState<any>(null);
    const [tab, changeTab] = useState(0);
	const [channel, setChannel] = useState(U.uuidv4().replace(/-/g, ""));

    useEffect(() => {
        U.get("api/v1/compute_node/list")
            .then((ret: any) => {
                if (ret.error_code == "x2TpbFQruG") window.location.reload();
                if (ret.data) {
                    console.log(ret);
                    const data = JSON.parse(JSON.stringify(ret)).data.map((u: any) =>
                        Object.assign(u, {
                            gpu: u.gpu ? "Y" : "-",
                            platform: `${u.platform ?? ""}:${u.arch ?? ""}`,
                            gpu_info: `${u.gpu_info ?? ""}:${u.gpu_driver ?? ""}`,
                            storage: Math.floor((u.total_storage - u.free_storage) * 10) / 10 + "/" + Math.floor(u.total_storage * 10) / 10 + " GB",
                            memory: Math.floor((u.memory / 1024) * 10) / 10 + " GB",
                            updated_at: U.format_date(new Date(u.updated_at)),
                            created_at: U.format_date(new Date(u.created_at)),
                        })
                    );
                    setData(data);
                } else {
                    console.error(ret.error);
                }
            })
            .catch((e) => console.error(e));
    }, [needsUpdate]);

    return (
        <Box sx={{ width: "100%", marginBottom: 10 }}>
            <h1>Nodes</h1>
            <DataGrid
                sx={{
                    maxHeight: 600,
                    minHeight: 300,
                    "& .rows-selected": {
                        background: "#3300FF22 !important",
                    },
                    "& .rows-dead": {
                        opacity: 0.5,
                        color: "#FF0000",
                        // background: '#FF000044 !important'
                    },
                }}
                getRowClassName={(event: any) => {
                    const row = event.row;
                    const s_class = row.selected_as_single ? "rows-selected" : "";
                    const s_class2 = row.status == "DEAD" ? "rows-dead" : "";
                    return [s_class, s_class2].filter((s: string) => s.length > 0).join(" ");
                }}
                onCellClick={(event: any) => {
                    for (const node of data) {
                        node.selected_as_single = false;
                    }
                    setSelectedNode(event.row);
                    event.row.selected_as_single = true;
                }}
                rows={data}
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
                onRowSelectionModelChange={(selectedRows: any) => {
                    setSelectedRows(selectedRows);
                }}
            />

            {/* {fetching ? <CardHeader
						avatar={<CircularProgress />}
						title={"Image: " + fetch_target}
						subheader="Fetching..."
					/> : <></>} */}
            {something_error.length > 0 ? (
                <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                    {something_error}
                </Alert>
            ) : (
                <></>
            )}

            <Button
                sx={{ width: "49%", marginRight: "2%", marginTop: 3 }}
                variant="contained"
                onClick={() => {
                    setDisableSubmit(true);
                    setProgress("Create entry point...");
                    setTimeout(() => {
                        U.post("api/v1/compute_node/create", {})
                            .then((ret: any) => {
                                if (ret.error) {
                                    console.error(ret.error);
                                    setSomethingError(ret.error);
                                } else {
                                    console.log(ret);
                                    setNeedsUpdate(Math.random());
                                    setDisableSubmit(false);
                                    setNewNodeID(ret.data.id);
                                    setNodeIDConfirmDialogVisibility(true);
                                    onUpdated();
                                }
                                setProgress("");
                            })
                            .catch((e) => {
                                console.error(e);
                                setSomethingError(e.toString());
                                setProgress("");
                            });
                    }, 2000);
                }}
                color="primary"
                disabled={disable_submit}
            >
                {progress && progress.length > 0 ? <CircularProgress size="1.5rem" /> : <Typography>Create an entry point</Typography>}
            </Button>
            <Button
                sx={{ width: "49%", marginRight: "0%", marginTop: 3 }}
                variant="contained"
                onClick={() => {
                    setConfirmDialogVisibility(true);
                    setDisableSubmit(false);
                }}
                color="primary"
                disabled={selectedRows.length == 0 || disable_submit}
            >
                {progress && progress.length > 0 ? <CircularProgress size="1.5rem" /> : <Typography>Delete</Typography>}
            </Button>

            {selected_node != null ? (
                <Box sx={{ width: "100%", marginTop: 2, boxShadow: "0px 0px 2px black" }}>
                    <Tabs onChange={(event: React.SyntheticEvent, newValue: number) => changeTab(newValue)} value={tab}>
                        <Tab label="Helth Checker" disabled={selected_node == null} />
                        <Tab label="Status" disabled={selected_node == null} />
                        <Tab label="Terminal" disabled={selected_node == null} />
                    </Tabs>
                </Box>
            ) : (
                ""
            )}

            {tab == 0 && selected_node != null ? (
                <Box sx={{ boxShadow: "0px 0px 2px black" }}>
                    <FormControl fullWidth>
                        {data && data.length == 0 ? (
                            <Alert sx={{ marginBottom: 1 }} severity="warning">
                                {"No node. Please register a node."}
                            </Alert>
                        ) : (
                            <>
                                <Card sx={{ padding: 2 }}>
                                    <Button
                                        sx={{ width: "100%", marginTop: 2 }}
                                        variant="contained"
                                        onClick={() => {
                                            const node_id = selected_node.id;
                                            if (node_id) {
                                                setProgress("Pinging...");
                                                setDisableSubmit(true);
                                                setTimeout(() => {
                                                    U.post("api/v1/compute_node/ping", { node_id: node_id, params: { test: "test", timestamp: new Date() } })
                                                        .then((ret: any) => {
                                                            console.log(ret);
                                                            setConsoleLogText(JSON.stringify(ret, null, 4));
                                                            // setConsoleLogText(consoleLogText+"\n"+JSON.stringify(ret, null, 4));
                                                        })
                                                        .catch((e) => console.error(e))
                                                        .finally(() => {
                                                            setProgress("");
                                                            setDisableSubmit(false);
                                                        });
                                                }, 1000);
                                            }
                                        }}
                                        disabled={disable_submit}
                                        color="primary"
                                    >
                                        {progress && progress.length > 0 ? <CircularProgress size="1.5rem" /> : <Typography>Ping</Typography>}
                                    </Button>

                                    <Paper
                                        sx={{
                                            height: 300,
                                            marginTop: 2,
                                            padding: 2,
                                            width: "100%",
                                            backgroundColor: "#222",
                                            overflow: "auto",
                                            color: "#AAA",
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        <Typography variant="body2" component="code">
                                            {consoleLogText}
                                        </Typography>
                                    </Paper>
                                </Card>
                            </>
                        )}
                    </FormControl>
                </Box>
            ) : (
                ""
            )}

            {tab == 1 && selected_node != null ? (
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
                                {Object.keys(selected_node).map((k: string, i: number) => (
                                    <Typography key={i}>
                                        {k} : {selected_node[k]}
                                    </Typography>
                                ))}
                            </Paper>
                        </CardContent>
                    </Card>
                </Box>
            ) : (
                ""
            )}

            {tab == 2 && selected_node != null ? (
                <Box sx={{ boxShadow: "0px 0px 2px black" }}>
                    <TerminalComponent node_id={selected_node.id} instance_id={null} channel={channel} />
                </Box>
            ) : (
                ""
            )}

            <ConfirmDialog
                open={showConfirmDialog}
                setOpen={setConfirmDialogVisibility}
                onSubmit={(flag: boolean) => {
                    setProgress("Deleting...");
                    setDisableSubmit(true);
                    (async () => {
                        if (flag) {
                            for (const id of selectedRows) {
                                await U.post("api/v1/compute_node/delete", { node_id: id })
                                    .then((ret: any) => {
                                        if (ret.error) console.error(ret.error);
                                    })
                                    .catch((e) => console.error(e));
                            }
                            setTimeout(() => {
                                setNeedsUpdate(Math.random());
                                setProgress("");
                                setDisableSubmit(false);
                            }, 1000);
                        }
                    })();
                }}
            />

            <ConfirmDialog open={showNodeIDConfirmDialog} title={"Created"} onSubmit={(flag: boolean) => {}} message={`A new your node id is '${a_new_node_id}'. Setup config.json on your node.`} no_cancel={true} setOpen={setNodeIDConfirmDialogVisibility} />
        </Box>
    );
}
