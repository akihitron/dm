import { useRef } from "react";

import Box from "@mui/material/Box";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import U from "../util";
import { useEffect, useState } from "react";
import { useStore } from "../Context";
import { Alert, Button, Card, CardContent, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../ConfirmDialog";

const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    {
        field: "email",
        headerName: "EMail",
        width: 250,
        editable: true,
    },
    {
        field: "instance_limit",
        headerName: "Max Ins",
        width: 150,
        editable: true,
    },
    {
        field: "node_limit",
        headerName: "Max Node",
        width: 150,
        editable: true,
    },
    {
        field: "permission",
        headerName: "Permission",
        width: 150,
        editable: true,
    },
    {
        field: "created_at",
        headerName: "Created at",
        // type: 'Date',
        width: 210,
    },
];

export default function UsersGrid(prop: any) {
    const { i18n } = useTranslation();
    const T = i18n.t;

    const { is_administrator, is_logged_in } = useStore();
    const [users, setUsers] = useState<Array<any>>([]);

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const name_input = useRef<HTMLInputElement | null>(null);
    const email_input = useRef<HTMLInputElement | null>(null);
    const password_input = useRef<HTMLInputElement | null>(null);

    const [instance_limit, setInstanceLimit] = useState(0);
    const [node_limit, setNodeLimit] = useState(0);
    const [permission, setPermission] = useState(0);
    const [error_location, setErrorLocation] = useState("");
    const [something_error, setSomethingError] = useState("");
    const [disable_submit, setDisableSubmit] = useState(false);
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);

    const [needs_update_users, needsUpdateUsers] = useState(0);

    useEffect(() => {
        (async () => {
            if (is_logged_in) {
                U.get("api/v1/user/list")
                    .then((ret: any) => {
                        if (ret.error_code == "x2TpbFQruG") window.location.reload();
                        if (ret.data) {
                            const data = ret.data ? ret.data.map((u: any) => Object.assign(u, { created_at: U.format_date(new Date(u.created_at)) })) : [];
                            console.log(data);
                            setUsers(data);
                        } else {
                            console.error(ret.error);
                        }
                    })
                    .catch((e) => console.error(e));
            }
        })();
    }, [is_logged_in, needs_update_users]);
    const data = users;

    if (is_administrator) {
    }

    return (
        <Box sx={{ height: 250, width: "100%", marginBottom: 10 }}>
            <h1>Users</h1>
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
            {error_location == "delete" && something_error.length > 0 ? (
                <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                    {something_error}
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

            <h1>Register user</h1>
            <Card>
                <CardContent>
                    <TextField
                        label="Name"
                        variant="outlined"
                        required
                        fullWidth
                        // value={name}
                        inputRef={name_input}
                        // onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        // 	const em = email_input?.current?.value as string;
                        // 	const ps = password_input?.current?.value as string;
                        // 	if (!U.check_email(em)) {
                        // 	  setInputEmailError(true);
                        // 	} else {
                        // 	  setInputEmailError(false);
                        // 	}
                        // 	const available_to_post = U.check_email(em) && U.check_password(ps);
                        // 	setLoginButtonState(!available_to_post);
                        //   }
                        margin="normal"
                    />
                    <TextField
                        label="Email"
                        variant="outlined"
                        required
                        fullWidth
                        inputRef={email_input}
                        onChange={() => {
                            const em = (email_input?.current?.value as string) ?? "";
                            if (!U.check_email(em)) {
                                setSomethingError("Invalid email.");
                                setErrorLocation("register");
                            } else {
                                setSomethingError("");
                                setErrorLocation("");
                            }
                        }}
                        margin="normal"
                    />
                    <TextField
                        label="Password"
                        variant="outlined"
                        required
                        fullWidth
                        type="password"
                        inputRef={password_input}
                        onChange={() => {
                            const em = (password_input?.current?.value as string) ?? "";

                            if (!U.check_password(em)) {
                                setSomethingError("Invalid password.");
                                setErrorLocation("register");
                            } else {
                                setSomethingError("");
                                setErrorLocation("");
                            }
                        }}
                        margin="normal"
                    />

                    {error_location == "register" && something_error.length > 0 ? (
                        <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">
                            {something_error}
                        </Alert>
                    ) : (
                        <></>
                    )}
                    <Button
                        sx={{ width: "100%", marginTop: 2, marginBottom: 10 }}
                        variant="contained"
                        onClick={() => {
                            U.post("api/v1/user/register", {
                                email: email_input?.current?.value,
                                password: password_input?.current?.value,
                                name: name_input?.current?.value,
                            }).then((ret: any) => {
                                if (ret.error) {
                                    setSomethingError(ret.error);
                                    setErrorLocation("register");
                                    console.error(ret.error);
                                } else {
                                    setSomethingError("");
                                    setErrorLocation("");
                                    setEmail("");
                                    setName("");
                                    setPassword("");
                                    setDisableSubmit(false);
                                    setUsers((users) => [...users, ret.data]);
                                }
                            });
                        }}
                        color="primary"
                        disabled={disable_submit}
                    >
                        Register
                    </Button>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showConfirmDialog}
                setOpen={setConfirmDialogVisibility}
                onSubmit={(flag: boolean) => {
                    if (flag) {
                        setSomethingError("");
                        setErrorLocation("");
                        for (const id of selectedRows) {
                            U.post("api/v1/user/delete", { user_id: id })
                                .then((ret: any) => {
                                    if (ret.error) {
                                        setSomethingError(ret.error);
                                        setErrorLocation("delete");
                                        console.error(ret.error);
                                    }
                                    needsUpdateUsers(Math.random());
                                })
                                .catch((e: any) => {
                                    console.error(e);
                                    setErrorLocation("delete");
                                    setSomethingError(e.toString());
                                });
                        }
                    }
                }}
            />
        </Box>
    );
}
