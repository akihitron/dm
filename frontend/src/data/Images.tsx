import React, { RefObject, useRef } from 'react';

import Box from '@mui/material/Box';
import U from '../util';
import { DataGrid, GridColDef, GridRowSelectionModel, GridToolbarQuickFilter, GridValueGetterParams } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { Button, FormControl, InputLabel, Select, MenuItem, Alert, Card, CardContent, CardActions, TextField, CircularProgress, Typography, CardHeader, Avatar } from '@mui/material';
import ConfirmDialog from '../ConfirmDialog';


const columns: GridColDef[] = [
	{
		field: 'node_name',
		headerName: 'Host',
		headerAlign: 'center',
		align: 'center',
		width: 100,
	},
	{
		field: 'name',
		headerName: 'Name',
		width: 200,
	},
	{
		field: 'status',
		headerName: 'Status',
		headerAlign: 'center',
		align: 'center',
		width: 100,
	},
	{
		field: 'size_h',
		headerName: 'Size',
		width: 100,
		headerAlign: 'right',
		align: 'right'
	},

	// {
	// 	field: 'os_hint',
	// 	headerName: 'OS Hint',
	// 	width: 100,
	// 	editable: true,
	// },
	// remote: String,
	// size: Number,
	// os_hint: String, // OS Hint


	// name: String,
	// key: {type:String, unique: true, required:true},
	// remote: String,
	// size: Number,
	// node_id: {
	// 	type: Schema.Types.ObjectId,
	// 	ref: 'ComputeNode',
	// 	required: true
	// },
	// created_at: { type: Number, default: new Date(),  },

	{
		field: 'localized_created_at',
		headerName: 'Created at',
		// type: 'Date',
		headerAlign: 'right',
		align: 'right',
		width: 200,
	},
	{
		field: 'node_id',
		headerName: 'Node',
		headerAlign: 'center',
		width: 150,
	},
	{ field: 'published_sym', headerName: 'P', width: 50, headerAlign: 'center', align: 'center', },
	{ field: 'managed_sym', headerName: 'M', width: 50, headerAlign: 'center', align: 'center', },

	{
		field: 'key',
		headerName: 'Hash',
		headerAlign: 'center',
		align: 'center',
		width: 100,
	},
	{ field: 'id', headerName: 'ID', headerAlign: 'center', align: 'center', width: 80 },
];

// fedora:40,fedora:39,fedora:38,ubuntu:22.04,ubuntu:20.04,ubuntu:18.04,centos:7,centos:6



function QuickSearchToolbar() {
	return (
		<Box
			sx={{
				p: 0.5,
				pb: 0,
			}}
		>
			<GridToolbarQuickFilter
			sx={{width:"100%", padding:1}}
				quickFilterParser={(searchInput: string) =>
					searchInput
						.split(',')
						.map((value) => value.trim())
						.filter((value) => value !== '')
				}
			/>
		</Box>
	);
}


export default function ImagesGrid(prop: any) {
	const [needUpdate, setNeedsUpdate] = useState(0);
	const [image_list, setImageList] = useState<Array<any>>([]);
	const [disable_submit_to_fetch_image, setDisableSubmitToFetchImage] = useState(true);
	const [node_list, setNodeList] = useState<Array<any> | null>(null);
	const [selectedRows, setSelectedRows] = useState<Array<any>>([]);
	// const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
	const [something_error, setSomethingError] = useState("");

	const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);

	const [fetch_target, setFetchTarget] = useState('');
	const [fetching, setFetchFlag] = useState(false);
	const [fetch_error, setFetchError] = useState('');
	const [fetch_success, setFetchSuccess] = useState('');
	const [modifyError, setModifyError] = useState('');
	const [node_id, setNodeID] = useState('');

	const [processing, setProcessing] = useState(false);

	const fetchButtonRef = useRef<any>(null);



	useEffect(() => {
		U.get('api/v1/image/list').then((ret: any) => {
			if (ret.error) console.error(ret.error);
			if (ret.error_code == "x2TpbFQruG") window.location.reload();
			console.log(ret);
			if (ret.data) {

				const _image_list = ret.data.map((u: any) => Object.assign(u, {
					managed_sym: u.managed ? "Y" : "-",
					published_sym: u.published ? "Y" : "-",
					size_h: u.size ? U.human_file_size_M(u.size) : "-",
					localized_created_at: U.format_date(new Date(u.created_at))
				}));
				setImageList(_image_list);
			} else {
				setImageList([]);
			}
		}).catch(e => console.error(e));
		U.get('api/v1/compute_node/list').then((ret: any) => {
			if (ret.error) console.error(ret.error);
			if (ret.error_code == "x2TpbFQruG") window.location.reload();
			if (ret.data) {
				setNodeList(ret.data);
				if (ret.data.length > 0 && node_id.length == 0) {
					setNodeID(ret.data[0].id);
				}
			} else {
				setNodeList([]);
			}
		}).catch(e => console.error(e));
	}, [needUpdate]);

	return (
		<Box sx={{ width: '100%', marginBottom: 10 }}>
			{something_error.length > 0 ? <Alert sx={{ marginBottom: 1 }} severity="error">{something_error}</Alert> : <></>}
			<h1>Images</h1>
			<Box sx={{ height: 600 }}>
				<DataGrid
					rows={image_list}
					columns={columns}
					initialState={{
						pagination: {
							paginationModel: {
								pageSize: 100,
							},
						},
					}}
					slots={{ toolbar: QuickSearchToolbar }}
					sx={{
						'& .rows-public': {
							background: '#77777722 !important'
						},
						'& .rows-private': {
							opacity: 0.25
						}
					}}
					getRowClassName={(params: any) => {
						const row = params.row;
						if (row.published_sym == "Y") {
							return 'rows-public'
						}
						return 'rows-private'
					}}
					rowSelectionModel={selectedRows}
					pageSizeOptions={[100]}
					checkboxSelection
					disableRowSelectionOnClick
					onRowSelectionModelChange={(selectedRows: any) => {
						setSelectedRows(selectedRows);
					}}
				/>
			</Box>
			{modifyError.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{modifyError}</Alert> : <></>}
			{processing ? <Box sx={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", marginTop: 1, marginBottom: 1 }}><CircularProgress /></Box> : <>
				<Button sx={{ width: "49%", marginRight: "1%", marginTop: 2 }} variant="contained" onClick={async () => {
					const ids = new Set(selectedRows);
					const selected = image_list.filter((i: any) => ids.has(i.id));
					setProcessing(true);
					for (const row of selected) {
						const body = { image_id: row.id, publish: true };
						console.log(body, row);
						await U.post('api/v1/image/publish', body).then((ret: any) => {
							if (ret.error) {
								if (ret.error_code == "x2TpbFQruG") window.location.reload();
								console.error(ret.error);
								setModifyError(ret.error);
							}

						}).catch(e => {
							console.error(e)
							setModifyError(e);
						});
					}
					setProcessing(false);
					setSelectedRows([]);
					setNeedsUpdate(Math.random());
				}} color="primary" disabled={selectedRows.length == 0}>Publish</Button>
				<Button sx={{ width: "49%", marginRight: "1%", marginTop: 2 }} variant="contained" onClick={async () => {
					const ids = new Set(selectedRows);
					const selected = image_list.filter((i: any) => ids.has(i.id));
					setProcessing(true);
					for (const row of selected) {
						const body = { image_id: row.id, publish: false };
						console.log(body, row);
						await U.post('api/v1/image/publish', body).then((ret: any) => {
							if (ret.error) {
								if (ret.error_code == "x2TpbFQruG") window.location.reload();
								console.error(ret.error);
								setModifyError(ret.error);
							}

						}).catch(e => {
							console.error(e)
							setModifyError(e);
						});
					}
					setProcessing(false);
					setSelectedRows([]);
					setNeedsUpdate(Math.random());
				}} color="primary" disabled={selectedRows.length == 0}>Unpublish</Button>

				<Button sx={{ width: "99%", marginTop: 1 }} variant="contained" onClick={() => {
					setConfirmDialogVisibility(true);
				}} color="primary" disabled={selectedRows.length == 0}>Delete</Button>
			</>}



			<h1>Fetch image from remote</h1>
			<Box>
				<Card>
					{fetching ? <CardHeader
						avatar={<CircularProgress />}
						title={"Image: " + fetch_target}
						subheader="Fetching..."
					/> : <></>}

					{!fetching ? <CardContent>

						{node_list && node_list.length == 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="warning">{"No node. Please register a node."}</Alert> : <>
							<FormControl fullWidth sx={{ marginTop: 2, width: "100%" }}>
								<InputLabel id="node_list-simple-select-label">Node</InputLabel>
								<Select
									labelId="node_list-simple-select-label"
									id="node_list-simple-select"
									value={node_id}
									label="Node"
									onChange={(event: any) => {
										//event.target.value
										setNodeID(event.target.value);
									}}
								>
									{node_list && node_list.map((u: any, index: number) => <MenuItem key={index} value={u.id}>{u.name}</MenuItem>)}
								</Select>
							</FormControl>
						</>}
						<TextField label="Remote image url or alias" variant="outlined" sx={{ marginTop: 2, width: "100%" }} value={fetch_target} onChange={(event: any) => {
							setFetchTarget(event.target.value);
							setDisableSubmitToFetchImage(event.target.value.trim().length == 0);
						}}
							onKeyDown={(ev) => {
								if (ev.key === 'Enter') {
									ev.preventDefault();
									if (!disable_submit_to_fetch_image) {
										if (fetchButtonRef) fetchButtonRef.current.click();
									}
								}
							}}
						/>
						{fetch_error.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{fetch_error}</Alert> : <></>}
						{fetch_success.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="success">{fetch_success}</Alert> : <></>}

						<Button sx={{ width: "100%", marginTop: 2 }} variant="contained" ref={fetchButtonRef} onClick={() => {
							setDisableSubmitToFetchImage(true);
							setFetchError("");
							setFetchSuccess("");
							setFetchFlag(true);
							setProcessing(true);
							setTimeout(() => {
								setTimeout(() => setNeedsUpdate(Math.random()), 250);
								U.post('api/v1/image/fetch', {
									node_id: node_id,
									url: fetch_target,
								}).then((ret: any) => {
									console.log(ret);
									if (ret.error_code == "x2TpbFQruG") window.location.reload();
									if (ret.error) {
										setFetchError(ret.error ? ret.error : "");
										setFetchFlag(false);
									} else {
										setFetchSuccess(`Image fetched successfully. ${ret.data.name} ( ${U.human_file_size_M(ret.data.size)} )`);
										setNeedsUpdate(Math.random());
										setFetchFlag(false);
										setFetchTarget("");
									}
									setProcessing(false);
								}).catch(e => {
									console.error(e);
									setNeedsUpdate(Math.random());
									setFetchError(e.toString());
									setFetchFlag(false);
									setProcessing(false);
								});
							}, 0);
						}} color="primary" disabled={disable_submit_to_fetch_image}>
							Fetch Image
						</Button>
					</CardContent> : <></>}
				</Card>
			</Box>
			<></>

			<ConfirmDialog open={showConfirmDialog} setOpen={setConfirmDialogVisibility} onSubmit={async (flag: boolean) => {
				if (flag) {
					setModifyError("");
					setProcessing(true);

					for (const row of selectedRows) {
						await U.post('api/v1/image/delete', { image_id: row }).then((ret: any) => {
							if (ret.error) {
								if (ret.error_code == "x2TpbFQruG") window.location.reload();
								setModifyError(ret.error ?? "");
								console.error(ret.error);
							}
						}).catch(e => {
							setModifyError(e);
							console.error(e)
						});
					}
					setProcessing(false);
					setSelectedRows([]);
					setNeedsUpdate(Math.random());
				}
			}} />

		</Box>
	);
}