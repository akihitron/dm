
import React from 'react';
import Box from '@mui/material/Box';
import U from '../util';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, TextField, TextareaAutosize, Theme, Typography, makeStyles } from '@mui/material';
import ConfirmDialog from '../ConfirmDialog';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';



const columns: GridColDef[] = [
	{
		field: 'name',
		headerName: 'Host Name',
		width: 100,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'status',
		headerName: 'Status',
		width: 120,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'manipulator_driver',
		headerName: 'Manipulator',
		width: 100,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'ipv4',
		headerName: 'IPv4',
		width: 120,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'ipv6',
		headerName: 'IPv6',
		width: 150,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'platform',
		headerName: 'Platform',
		width: 100,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'cpu',
		headerName: 'CPU',
		width: 50,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'cpu_info',
		headerName: 'Model',
		width: 200,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'gpu',
		headerName: 'GPU',
		width: 50,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'gpu_info',
		headerName: 'Model',
		width: 100,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'memory',
		headerName: 'Mem',
		width: 100,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'storage',
		headerName: 'Storage',
		width: 100,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'description',
		headerName: 'Description',
		width: 150,
		editable: true,
	},
	{
		field: 'updated_at',
		headerName: 'Updated',
		// type: 'Date',
		width: 200,
		headerAlign: 'center',
		align: 'center',
	},
	{
		field: 'created_at',
		headerName: 'Created',
		// type: 'Date',
		width: 200,
		headerAlign: 'center',
		align: 'center',
	},
	{ field: 'id', headerName: 'ID', headerAlign: 'center', align: 'center', width: 80 },
];





export default function ComputeNodesGrid(prop: any) {
	const onUpdated = prop.onUpdated;
	const [needsUpdate, setNeedsUpdate] = useState(0);
	const [disable_submit, setDisableSubmit] = useState(false);
	const [data, setData] = useState<any>([]);
	const [selected_node_for_ping, selectNodeForPing] = useState<any>(null);
	const [selectedRows, setSelectedRows] = useState<any>([]);
	const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);
	const [showNodeIDConfirmDialog, setNodeIDConfirmDialogVisibility] = useState(false);
	const [a_new_node_id, setNewNodeID] = useState("");
	const [consoleLogText, setConsoleLogText] = useState("");
	const [ac_chk_open, setAcChkOpen] = useState(false);
	const [something_error, setSomethingError] = useState("");
	const [progress, setProgress] = useState("");


	useEffect(() => {
		U.get('api/v1/compute_node/list').then((ret: any) => {
			if (ret.error_code == "x2TpbFQruG") window.location.reload();
			if (ret.data) {
				console.log(ret);
				const data = JSON.parse(JSON.stringify(ret)).data.map((u: any) => Object.assign(u, {
					gpu: u.gpu ? "Y" : "-",
					platform: `${u.platform ?? ""}:${u.arch ?? ""}`,
					gpu_info: `${u.gpu_info ?? ""}:${u.gpu_driver ?? ""}`,
					storage: Math.floor((u.total_storage - u.free_storage) * 10) / 10 + "/" + Math.floor((u.total_storage) * 10) / 10 + " GB",
					memory: Math.floor((u.memory / 1024) * 10) / 10 + " GB",
					updated_at: U.format_date(new Date(u.updated_at)),
					created_at: U.format_date(new Date(u.created_at)),
				}));
				setData(data);
				if (data.length > 0) {
					selectNodeForPing(data[0]);
				}
			} else {
				console.error(ret.error);
			}
		}).catch(e => console.error(e));
	}, [needsUpdate]);


	return (
		<Box sx={{ width: '100%', marginBottom: 10 }}>
			<h1>Nodes</h1>
			<DataGrid
				sx={{ maxHeight: 400, minHeight: 200  }}
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

			{/* {fetching ? <CardHeader
						avatar={<CircularProgress />}
						title={"Image: " + fetch_target}
						subheader="Fetching..."
					/> : <></>} */}
			{something_error.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{something_error}</Alert> : <></>}

			<Button sx={{ width: "100%", marginTop: 2 }} variant="contained" onClick={() => {
				setConfirmDialogVisibility(true);
				setDisableSubmit(false);
			}} color="primary" disabled={selectedRows.length == 0}>Delete</Button>
			<Button sx={{ width: "100%", marginTop: 2, marginBottom: 5 }} variant="contained" onClick={() => {
				setDisableSubmit(true);
				setProgress("Create entry point...");
				setTimeout(() => {
					U.post('api/v1/compute_node/create', {}).then((ret: any) => {
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
					}).catch(e => {
						console.error(e);
						setSomethingError(e.toString());
						setProgress("");
					});
				}, 2000);
			}} color="primary" disabled={disable_submit}>
				{progress && progress.length > 0 ? <CircularProgress /> : <Typography>Create an entry point</Typography>}

			</Button>


			<Accordion sx={{}} expanded={ac_chk_open} onChange={() => { setAcChkOpen(!ac_chk_open); }}>
				<AccordionSummary
					expandIcon={<ExpandMoreIcon />}
					aria-controls="panel2a-content"
					id="panel2a-header"
				>
					<Typography>Health Checker</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<FormControl fullWidth sx={{ marginTop: 2 }}>

						{data && data.length == 0 ? <Alert sx={{ marginBottom: 1 }} severity="warning">{"No node. Please register a node."}</Alert> : <>
							<Card sx={{ marginTop: 2, padding: 2 }}>
								<FormControl fullWidth sx={{ marginTop: 2, width: "100%" }}>
									<InputLabel id="node_list-simple-select-label">Node</InputLabel>
									<Select
										labelId="node_list-simple-select-label"
										id="node_list-simple-select"
										value={selected_node_for_ping.id}
										label="Node"
										onChange={(event: any) => {
											//event.target.value
											selectNodeForPing(data.find((u: any) => u.id == event.target.value));
										}}
									>
										{data.map((u: any, index: number) => <MenuItem key={index} value={u.id}>{u.name}</MenuItem>)}
									</Select>
								</FormControl>
								<Button sx={{ width: "100%", marginTop: 2 }} variant="contained" onClick={() => {
									const node_id = selected_node_for_ping.id;
									if (node_id) {
										U.post('api/v1/compute_node/ping', { node_id: node_id, params: { "test": "test", timestamp: new Date() } }).then((ret: any) => {
											console.log(ret);
											setConsoleLogText(JSON.stringify(ret, null, 4));
											// setConsoleLogText(consoleLogText+"\n"+JSON.stringify(ret, null, 4));
										}).catch(e => console.error(e));
									}

								}} color="primary">Ping</Button>

								<Paper sx={{
									height: 300,
									marginTop: 2,
									padding: 2,
									width: '100%',
									backgroundColor: '#222',
									overflow: 'auto',
									color: '#AAA',
									whiteSpace: 'pre-wrap',

								}}>
									<Typography variant="body2" component="code">
										{consoleLogText}
									</Typography>
								</Paper>

							</Card>

						</>}
					</FormControl>
				</AccordionDetails>
			</Accordion>



			<ConfirmDialog open={showConfirmDialog} setOpen={setConfirmDialogVisibility} onSubmit={(flag: boolean) => {
				(async()=>{
					if (flag) {
						for (const id of selectedRows) {
							await U.post('api/v1/compute_node/delete', { node_id: id }).then((ret: any) => {
								if (ret.error) console.error(ret.error);
							}).catch(e => console.error(e));
						}
						setTimeout(() => {
							setNeedsUpdate(Math.random());
						},1000);
					}
				})();
			}} />

			<ConfirmDialog open={showNodeIDConfirmDialog} title={"Created"} onSubmit={(flag: boolean) => { }} message={`A new your node id is '${a_new_node_id}'. Setup config.json on your node.`} no_cancel={true} setOpen={setNodeIDConfirmDialogVisibility} />

		</Box>
	);
}