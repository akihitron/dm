import React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import U from '../util';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../Context';
import { Button, Card, CardContent, CircularProgress, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

import ISO6391 from 'iso-639-1';
import ConfirmDialog from '../ConfirmDialog';

const columns: GridColDef[] = [
	{ field: 'id', headerName: 'ID', width: 80 },
	{
		field: 'name',
		headerName: 'name',
		width: 100,
	},
	{
		field: 'created_at',
		headerName: 'Created at',
		// type: 'Date',
		width: 210,
	},
];


export default function Account(prop: any) {
	const onUpdated = prop.onUpdated;
	const { is_administrator, is_logged_in, setLang, lang, available_langs } = useStore();

	const [user_data, setUserData] = useState<any>(null);
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
			U.get('api/v1/user/description').then((ret: any) => {
				if (ret.error_code == "x2TpbFQruG") window.location.reload();
				if (ret.data) {
					setUserData(ret.data);
				} else {
					console.error(ret.error);
				}
			}).catch(e => console.error(e));
			U.get('api/v1/user/api_key_list').then((ret: any) => {
				if (ret.error_code == "x2TpbFQruG") window.location.reload();
				if (ret.data) {

					setAPIKeys(ret.data.map((v: any) => {
						v.key = v.key + "....";
						v.created_at = U.format_date(new Date(v.created_at));
						return v;
					}));
				} else {
					console.error(ret.error);
				}
			}).catch(e => console.error(e));

		})();
	}, [needsUpdate]);
	return (
		<Box sx={{ height: 250, width: '100%', marginBottom: 10 }}>
			<h1>Account</h1>
			<Card>
				<CardContent>
					<h3>EMail</h3>
					<Typography sx={{ marginLeft: 1 }}>{user_data?.email}</Typography>
					<h3>Role</h3>
					<Typography sx={{ marginLeft: 1 }}>{user_data?.is_administrator ? "Administrator" : "User"}</Typography>
					<h3>Language</h3>
					<FormControl fullWidth sx={{ marginTop: 2, marginLeft: 1, width: "97%" }}>
						<InputLabel id="lang-simple-select-label">Lang</InputLabel>
						<Select
							labelId="lang-simple-select-label"
							id="lang-simple-select"
							value={lang}
							label="Lang"
							onChange={(event: any) => {
								setLang(event.target.value);
							}}>
							{available_langs.map((lang: any, index: number) => <MenuItem key={index} value={lang}>{ISO6391.getName(lang)}</MenuItem>)}
						</Select>
					</FormControl>
				</CardContent>
			</Card>

			<h1>API Keys</h1>
			<DataGrid
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

			<Button sx={{ width: "100%", marginRight: "2%", marginTop: 2 }} variant="contained" onClick={() => {
				setDisableSubmit(true);
				setProgress("Create API key...");
				setTimeout(() => {
					U.post('api/v1/user/create_api_key', { name: api_key_name }).then((ret: any) => {
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
					}).catch(e => {
						console.error(e)
						setProgress("");
					});
				}, 2000);
			}} color="primary" disabled={disable_submit}>
						{progress && progress.length > 0 ? <CircularProgress /> : <Typography>Generate API Key</Typography>}

				
			</Button>
			<Button sx={{ width: "100%", marginTop: 2 }} variant="contained" onClick={() => {
				setConfirmDialogVisibility(true);
			}} color="primary" disabled={selectedRows.length == 0}>Delete</Button>


			<ConfirmDialog open={showConfirmDialog} setOpen={setConfirmDialogVisibility} onSubmit={(flag: boolean) => {
				if (flag) {
					(async () => {
						for (const id of selectedRows) {
							await U.post('api/v1/user/delete_api_key', { api_key_id: id }).then((ret: any) => {
								if (ret.error) console.error(ret.error);
								onUpdated(Math.random());
							}).catch(e => console.error(e));
						}
						setNeedsUpdate(Math.random());
					})()
				}
			}} />

			<ConfirmDialog open={showAPIKeyConfirmDialog} title={"API Key has issued"} message={`ID : [ ${api_key_id} ]\nSecret : [ ${api_key} ]\n\nPlease take a memo and setup config.json on your node.`} no_cancel={true} setOpen={setAPIKeyConfirmDialogVisibility} onSubmit={(flag: boolean) => { }} />

		</Box>
	);
}