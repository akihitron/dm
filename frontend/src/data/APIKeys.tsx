import Box from "@mui/material/Box";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import U from "../util";
import { useEffect, useState } from "react";
import { Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";

import ConfirmDialog from "../ConfirmDialog";


const pathJoin = (parts:Array<string>, sep='/') => parts.join(sep).replace(new RegExp(sep+'{1,}', 'g'), sep);

const BASE_URL = import.meta.env.BASE_URL;

const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    {
        field: "name",
        headerName: "name",
        width: 100,
    },
    {
        field: "created_at",
        headerName: "Created at",
        // type: 'Date',
        width: 210,
    },
];

export default function APIKeys(prop: any) {
    const onUpdated = prop.onUpdated;

    const [api_key, setAPIKey] = useState<string>("");
    const [api_key_id, setAPIKeyID] = useState<string>("");
    const [api_keys, setAPIKeys] = useState<Array<any>>([]);
    const [showAPIKeyConfirmDialog, setAPIKeyConfirmDialogVisibility] = useState(false);
    const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);

    const [needsUpdate, setNeedsUpdate] = useState(0);
    const [disable_submit, setDisableSubmit] = useState(true);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [api_key_name, setAPIKeyName] = useState("");

    const [progress, setProgress] = useState("");

    useEffect(() => {
        (async () => {
            U.get("api/v1/user/api_key_list")
                .then((ret: any) => {
                    if (ret.error_code == "x2TpbFQruG") window.location.reload();
                    if (ret.data) {
                        setAPIKeys(
                            ret.data.map((v: any) => {
                                v.key = v.key + "....";
                                v.created_at = U.format_date(new Date(v.created_at));
                                return v;
                            })
                        );
                    } else {
                        console.error(ret.error);
                    }
                })
                .catch((e) => console.error(e));
        })();
    }, [needsUpdate]);
    return (
        <Box sx={{ width: "100%", marginBottom: 10 }}>
            <h1>API Keys</h1>
            <DataGrid
                sx={{ maxHeight: 400, minHeight: 200 }}
                autoHeight
                rows={api_keys}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 10,
                        },
                    },
                }}
                pageSizeOptions={[10]}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(selectedRows: any) => {
                    setSelectedRows(selectedRows);
                }}
            />
            <TextField
                label="Name"
                variant="outlined"
                fullWidth
                value={api_key_name}
                onChange={(event: any) => {
                    setAPIKeyName(event.target.value);
                    setDisableSubmit(event.target.value.length == 0);
                }}
                margin="normal"
            />

            <Button
                sx={{ width: "100%", marginRight: "2%", marginTop: 2 }}
                variant="contained"
                onClick={() => {
                    setDisableSubmit(true);
                    setProgress("Create API key...");
                    setTimeout(() => {
                        U.post("api/v1/user/create_api_key", { name: api_key_name })
                            .then((ret: any) => {
                                if (ret.error) console.error(ret.error);
                                else {
                                    console.log(ret);
                                    onUpdated(Math.random());
                                    setNeedsUpdate(Math.random());
                                    setDisableSubmit(true);
                                    setAPIKeyID(ret.data.api_key_id);
                                    setAPIKey(ret.data.api_key_secret);
                                    setAPIKeyConfirmDialogVisibility(true);
                                    setAPIKeyName("");
                                }
                                setProgress("");
                            })
                            .catch((e) => {
                                console.error(e);
                                setProgress("");
                            });
                    }, 2000);
                }}
                color="primary"
                disabled={disable_submit}
            >
                {progress && progress.length > 0 ? <CircularProgress size="1.5rem" /> : <Typography>Generate API Key</Typography>}
            </Button>
            <Button
                sx={{ width: "100%", marginTop: 2, marginBottom: 5 }}
                variant="contained"
                onClick={() => {
                    setConfirmDialogVisibility(true);
                }}
                color="primary"
                disabled={selectedRows.length == 0}
            >
                Delete
            </Button>

            <ConfirmDialog
                open={showConfirmDialog}
                setOpen={setConfirmDialogVisibility}
                onSubmit={(flag: boolean) => {
                    if (flag) {
                        (async () => {
                            for (const id of selectedRows) {
                                await U.post("api/v1/user/delete_api_key", { api_key_id: id })
                                    .then((ret: any) => {
                                        if (ret.error) console.error(ret.error);
                                        onUpdated(Math.random());
                                    })
                                    .catch((e) => console.error(e));
                            }
                            setNeedsUpdate(Math.random());
                        })();
                    }
                }}
            />
            <ConfirmDialog open={showAPIKeyConfirmDialog} title={"API Key has issued"} message={`ID : [ ${api_key_id} ]\nSecret : [ ${api_key} ]\n\nPlease take a memo and setup config.json on your node.`} no_cancel={true} setOpen={setAPIKeyConfirmDialogVisibility} onSubmit={(flag: boolean) => {}} />

            <h3>Endpoint of Manipulator</h3>
            <Paper
                sx={{
                    height: 57,
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
                    {window.location.origin}
                    {pathJoin([BASE_URL,"api/"])}
                </Typography>
            </Paper>

            <br />
            <br />
        </Box>
    );
}
