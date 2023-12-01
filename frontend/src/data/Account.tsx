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
	const [api_keys, setAPIKeys] = useState<Array<any>>([]);
	const [needsUpdate, setNeedsUpdate] = useState(0);
	const [api_key_name, setAPIKeyName] = useState("");

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

		</Box>
	);
}