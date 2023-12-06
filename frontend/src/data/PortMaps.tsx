import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import U from "../util";
import { Alert, Button } from "@mui/material";
import ConfirmDialog from "../ConfirmDialog";

const columns: GridColDef[] = [
    {
        field: "name",
        headerName: "Name",
        width: 100,
        editable: true,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "port",
        headerName: "port",
        width: 100,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "node_global_ipv4",
        headerName: "IPv4",
        width: 120,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "node_global_ipv6",
        headerName: "IPv6",
        width: 150,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "instance_name",
        headerName: "Instance",
        width: 120,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "node_name",
        headerName: "Node",
        width: 150,
        headerAlign: "center",
        align: "center",
    },
    {
        field: "created_at",
        headerName: "Created at",
        // type: 'Date',
        width: 210,
        headerAlign: "center",
        align: "center",
    },
    { field: "id", headerName: "ID", width: 80 },
];

export default function PortMapsGrid(prop: any) {
    const [data, setData] = useState<any[]>([]);
    const [needsUpdate, setNeedsUpdate] = useState<number>(0);
    const [errorLocation, setErrorLocation] = useState<string>("");
    const [somethingError, setSomethingError] = useState<string>("");
    const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);

    useEffect(() => {
        U.get("api/v1/port_map/list")
            .then((ret: any) => {
                if (ret.error) {
                    setData([]);
                    setErrorLocation("top");
                    setSomethingError(ret.error);
                } else {
                    console.log(ret.data);
                    setData(ret.data);
                }
            })
            .catch((e) => {
                setErrorLocation("top");
                setSomethingError(e.toString());
                console.error(e);
            });
    }, [needsUpdate]);

    return (
        <Box sx={{ width: "100%", marginBottom: 10 }}>
            <h1>Port maps</h1>
            <DataGrid
                sx={{ maxHeight: 400, minHeight: 200 }}
                rows={data}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 100,
                        },
                    },
                }}
                pageSizeOptions={[100]}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={(selectedRows: any) => {
                    setSelectedRows(selectedRows);
                }}
            />
            {errorLocation == "top" && somethingError.length > 0 ? (
                <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                    {somethingError}
                </Alert>
            ) : (
                <></>
            )}
            <Button
                sx={{ width: "100%", marginTop: 2, marginBottom: 10 }}
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
                        setSomethingError("");
                        setErrorLocation("");
                        for (const id of selectedRows) {
                            U.post("api/v1/port_map/delete", { id: id })
                                .then((ret: any) => {
                                    if (ret.error) {
                                        setSomethingError(ret.error);
                                        setErrorLocation("top");
                                        console.error(ret.error);
                                    }
                                    setNeedsUpdate(Math.random());
                                })
                                .catch((e: any) => {
                                    console.error(e);
                                    setErrorLocation("top");
                                    setSomethingError(e.toString());
                                });
                        }
                    }
                }}
            />
        </Box>
    );
}
