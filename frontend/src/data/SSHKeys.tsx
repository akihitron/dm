import React from 'react';

import Box from '@mui/material/Box';
import U from '../util';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import { Alert, Button, TextField } from '@mui/material';
import { TextareaAutosize } from '@mui/base/TextareaAutosize';

import { useEffect, useState } from 'react';
import ConfirmDialog from '../ConfirmDialog';


const columns: GridColDef[] = [
	{
		field: 'name',
		headerName: 'name',
		width: 150,
		editable: true,
		headerAlign: 'center',
		align: 'center'
	},
	{
		field: 'key',
		headerName: 'key',
		width: 200,
		editable: true,
		headerAlign: 'center',
		align: 'center'
	},
	{
		field: 'created_at',
		headerName: 'Created at',
		// type: 'Date',
		width: 200,
		editable: true,
		headerAlign: 'right',
		align: 'right'
	},
	{ field: 'id', headerName: 'ID', headerAlign: 'center', align: 'center', width: 80 },
];

function TinySSHPublicKeyChecker(key: string) {
	const k = key.trim();
	if (k.length < 10) return false;
	if (k.indexOf("-----BEGIN PUBLIC KEY-----") == 0) return true;
	if (k.indexOf("-----BEGIN PUBLIC KEY-----") == 0) {
		if (k.indexOf("-----END PUBLIC KEY-----") > 0) {
			return true;
		}
		return false;
	}
	if (k.indexOf("ssh-") == 0) {
		if (k.indexOf(" ") > 0) {
			return true;
		}
		return false;
	}


	return false;
}

const fileToDataUri = (file: any) => new Promise((resolve, reject) => {
	const reader = new FileReader();
	reader.onload = (event: any) => {
		const arrayBuffer = reader.result as ArrayBuffer;
		const bytes = new Uint8Array(arrayBuffer);

		resolve(bytes)
	};
	reader.readAsArrayBuffer(file);
});



export default function SSHKeysGrid(prop: any) {
	const onUpdated = prop.onUpdated;
	const [name, setName] = useState('');
	const [public_key, setPublicKey] = useState('');
	const [update_ssh_keys, needsUpdateSSHKeys] = useState(0);
	const [ssh_keys, setSSHKeys] = useState([]);
	const [disable_submit, setDisableSubmit] = useState(true);
	const [selectedRows, setSelectedRows] = useState<any>([]);
	const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);
	const [something_error, setSomethingError] = useState("");
	const [error_location, setErrorLocation] = useState("");

	const data = ssh_keys;


	const handleText1Change = (event: any) => {
		setName(event.target.value);
		if (TinySSHPublicKeyChecker(public_key)) {
			setErrorLocation("");
			setSomethingError("");
			setDisableSubmit(!(event.target.value.length > 0));
		} else {
			setErrorLocation("register");
			setSomethingError("Invalid public key.");
			setDisableSubmit(true);
		}
	};

	const handleText2Change = (event: any) => {
		setPublicKey(event.target.value);
		if (TinySSHPublicKeyChecker(event.target.value)) {
			setDisableSubmit(!(name.trim().length > 0));
			setErrorLocation("");
			setSomethingError("");
		} else {
			setErrorLocation("register");
			setSomethingError("Invalid public key.");
			setDisableSubmit(true);
		}
	};

	const handleSubmit = () => {
		if (TinySSHPublicKeyChecker(public_key) && name.length > 0) {
			console.log('Text 1:', name);
			console.log('Text 2:', public_key);
			setErrorLocation("");
			setSomethingError("");
			U.post('api/v1/ssh/register', { name: name.trim(), key: public_key.trim() }).then((ret: any) => {
				if (ret.data) {
					needsUpdateSSHKeys(Math.random());
					onUpdated();
				} else {
					if (ret.error) {
						setSomethingError(ret.error);
						setErrorLocation("register");
						console.error(ret.error);
					}
				}
			}).catch((e: any) => {
				console.error(e);
				setSomethingError(e.toString());
				setErrorLocation("register");
			});
			setName('');
			setPublicKey('');
			setDisableSubmit(true);
		}
	};

	useEffect(() => {
		console.log("SSH keys Grid");
		U.get('api/v1/ssh/list').then((ret: any) => {
			setErrorLocation("");
			ret.data ? setSSHKeys(ret.data.map((u: any) => Object.assign(u,
				{
					created_at: U.format_date(new Date(u.created_at))
				}))) : console.error(ret.error);
			if (ret.error) setSomethingError(ret.error);
			else setSomethingError("");
		}).catch(e => {
			setErrorLocation("top");
			setSomethingError(e.toString());
			console.error(e)
		});
	}, [update_ssh_keys]);




	return (
		<Box sx={{ height: 250, width: '100%', marginBottom: 10 }}>
			{error_location == "top" && something_error.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{something_error}</Alert> : <></>}

			<h1>SSH keys</h1>
			<Box sx={{ height: 400 }}>

				<DataGrid
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
			</Box>

			{error_location == "delete" && something_error.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{something_error}</Alert> : <></>}
			<Button sx={{ width: "100%", marginTop: 2, marginBottom: 10 }} variant="contained" onClick={() => {
				setConfirmDialogVisibility(true);
			}} color="primary" disabled={selectedRows.length == 0}>Delete</Button>

			<h1>Register SSH Key</h1>
			<Box>
				<Box sx={{ width: "100%", textAlign: "left" }}>
				{/* <label htmlFor="ssh_key_upload_file">Upload</label> */}
					<input type="file" id="ssh_key_upload_file" onChange={(event: any) => {
						console.log(event);
						// onChange(event.target.files[0] || null)
						const file = event.target.files[0] || null;
						if (!file) {
							setPublicKey('');
							setName('');
							setErrorLocation("register");
							setSomethingError("Invalid public key.");
							setDisableSubmit(true);
							return;
						}
						const file_name = file.name;
						const basename = file_name.split('.').slice(0, -1).join('.');
						fileToDataUri(file).then((dataUri: any) => {
							if (dataUri) {
								const decoder = new TextDecoder('utf-8');
								const str = decoder.decode(dataUri);
								setPublicKey(str);
								setName(basename);

								if (TinySSHPublicKeyChecker(str)) {
									setDisableSubmit(!(name.trim().length > 0));
									setErrorLocation("");
									setSomethingError("");
									setDisableSubmit(false);
								} else {
									setErrorLocation("register");
									setSomethingError("Invalid public key.");
									setDisableSubmit(true);
								}
	
							}
						})
					}} />

				</Box>

				<TextField
					label="Name"
					variant="outlined"
					fullWidth
					value={name}
					onChange={handleText1Change}
					margin="normal"
				/>
				<TextareaAutosize
					style={{ width: "100%" }}
					value={public_key}
					onChange={handleText2Change}

					aria-label="minimum height"
					minRows={5}
					placeholder="Public Key"
				/>
				{error_location == "register" && something_error.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{something_error}</Alert> : <></>}
				<Button sx={{ width: "100%", marginTop: 2, marginBottom: 10 }} variant="contained" onClick={handleSubmit} color="primary" disabled={disable_submit}>
					Register a new SSH key
				</Button>

			</Box>

			<ConfirmDialog open={showConfirmDialog} setOpen={setConfirmDialogVisibility} onSubmit={(flag: boolean) => {
				if (flag) {
					setSomethingError("");
					setErrorLocation("");
					for (const id of selectedRows) {
						U.post('api/v1/ssh/delete', { id: id }).then((ret: any) => {
							if (ret.error) {
								setSomethingError(ret.error);
								setErrorLocation("delete");
								console.error(ret.error);
							}
							needsUpdateSSHKeys(Math.random());
							onUpdated();
						}).catch((e: any) => {
							console.error(e);
							setErrorLocation("delete");
							setSomethingError(e.toString());
						});
					}
				}
			}} />
		</Box>
	);
}