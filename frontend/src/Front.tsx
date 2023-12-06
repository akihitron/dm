import React from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, IconButton, Modal, Stack } from '@mui/material';
import Login from './Login';
import ResetPassword from './ResetPassword';

import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';

import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';
import GroupIcon from '@mui/icons-material/Group';
import StorageIcon from '@mui/icons-material/Storage';
import ShareIcon from '@mui/icons-material/Share';
import AlbumIcon from '@mui/icons-material/Album';
import BugReportIcon from '@mui/icons-material/BugReport';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import KeyIcon from '@mui/icons-material/Key';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';


import U from './util';
import { useStore } from './Context';
import UsersGrid from './data/Users';
import SSHKeysGrid from './data/SSHKeys';
import ComputeNodesGrid from './data/ComputeNodes';
import InstancesGrid from './data/Instances';
import ImagesGrid from './data/Images';
import PortMapsGrid from './data/PortMaps';
import MembersGrid from './data/Members';
import Account from './data/Account';
import APIKeysGrid from './data/APIKeys';



const drawerWidth = 240;

interface Props {
	window?: () => Window;
}

function ContentComponent(props: any) {
	const setNavigate = props.setNavigate;
	const T = useTranslation().t;
	const { is_administrator, is_dark_theme, is_logged_in, setLogin } = useStore();


	const [needsUpdate, setNeedsUpdate] = useState(Math.random());
	// const activated_nodes = ret.data.filter((u: any) => u.status.toUpperCase() == "ACTIVATED");

	const [ssh_keys, setSSHKeys] = useState<Array<any> | null>(null);
	const [api_keys, setAPIKeys] = useState<Array<any> | null>(null);
	const [instances, setInstances] = useState<Array<any> | null>(null);
	const [images, setImages] = useState<Array<any> | null>(null);
	const [compute_nodes, setComputeNodes] = useState<Array<any> | null>(null);
	const [activated_compute_nodes, setActivatedComputeNodes] = useState<Array<any> | null>(null);
	// const [port_maps, setPortMaps] = useState<Array<any> | null>(null);

	useEffect(() => {
		(async () => {
			if (is_logged_in) {
				U.get('api/v1/compute_node/list').then((ret: any) => {
					if (ret.error || ret.data == null) {
						setComputeNodes(null);
						setActivatedComputeNodes(null);
					} else {
						setComputeNodes(ret.data);
						setActivatedComputeNodes(ret.data.filter((u: any) => u.status.toUpperCase() == "ACTIVATED"));
					}
				}).catch(e => {
					console.error(e);
					setComputeNodes(null);
					setActivatedComputeNodes(null);
				});
				U.get('api/v1/ssh/list').then((ret: any) => ret.data ? setSSHKeys(ret.data) : console.error(ret.error)).catch(e => console.error(e));
				U.get('api/v1/instance/list').then((ret: any) => ret.data ? setInstances(ret.data) : console.error(ret.error)).catch(e => console.error(e));
				U.get('api/v1/user/api_key_list').then((ret: any) => ret.data ? setAPIKeys(ret.data) : console.error(ret.error)).catch(e => console.error(e));
				U.get('api/v1/image/list').then((ret: any) => ret.data ? setImages(ret.data) : console.error(ret.error)).catch(e => console.error(e));
				// U.get('api/v1/port_map/list').then((ret: any) => ret.data ? setPortMaps(ret.data) : console.error(ret.error)).catch(e => console.error(e));
			}
		})();
	}, [is_logged_in, needsUpdate]);


	return <>
		{compute_nodes && compute_nodes.length == 0 ? <Alert sx={{ '&:hover': { cursor: 'pointer' }, marginBottom: 1 }} severity="warning" onClick={() => { setNavigate("compute_nodes") }}>{"There is no node. Please register a node and cast info to front server from command or ask to the administrator."}</Alert> : <></>}
		{compute_nodes && compute_nodes.length > 0 && api_keys?.length == 0 ? <Alert sx={{ '&:hover': { cursor: 'pointer' }, marginBottom: 1 }} severity="warning" onClick={() => { setNavigate("account") }}>{"Your node needs API key. Please generate an API key on 'Account' panel."}</Alert> : <></>}
		{compute_nodes && compute_nodes.length > 0 && activated_compute_nodes?.length == 0 ? <Alert sx={{ '&:hover': { cursor: 'pointer' }, marginBottom: 1 }} severity="warning" onClick={() => { setNavigate("compute_nodes") }}>{"There are inactive nodes. Please check process and config.json on node."}</Alert> : <></>}

		{ssh_keys && ssh_keys.length == 0 ? <Alert sx={{ '&:hover': { cursor: 'pointer' }, marginBottom: 1 }} severity="warning" onClick={() => { setNavigate("ssh_keys") }}>{"No SSH key. Please register a your public key first."}</Alert> : <></>}
		{images && images.length == 0 ? <Alert sx={{ '&:hover': { cursor: 'pointer' }, marginBottom: 1 }} severity="warning" onClick={() => { setNavigate("images") }}>{"There is no registered OS image."}</Alert> : <></>}
		{/* {users && users.length == 0 ? <Alert sx={{'&:hover': {cursor: 'pointer'} , marginBottom: 1 }} severity="warning">{"There is no user. You can create root user on top page."}</Alert> : <></>} */}
		{/* {port_maps && port_maps.length == 0 ? <Alert sx={{'&:hover': {cursor: 'pointer'} , marginBottom: 1 }} severity="warning">{"Required port map to connect SSH."}</Alert> : <></>} */}
		{instances && instances.length == 0 ? <Alert sx={{ '&:hover': { cursor: 'pointer' }, marginBottom: 1 }} severity="warning" onClick={() => { setNavigate("instances") }}>{"Lets make a new instance."}</Alert> : <></>}
		<Routes>
			<Route path='/' element={<InstancesGrid />} />
			<Route path='ssh_keys' element={<SSHKeysGrid onUpdated={() => setNeedsUpdate(Math.random())} />} />
			<Route path='images' element={<ImagesGrid />} />
			<Route path='compute_nodes' element={<ComputeNodesGrid onUpdated={() => setNeedsUpdate(Math.random())} />} />
			<Route path='instances' element={<InstancesGrid onUpdated={() => setNeedsUpdate(Math.random())} />} />
			<Route path='port_maps' element={<PortMapsGrid />} />
			<Route path='members' element={<MembersGrid />} />
			<Route path='account' element={<Account onUpdated={() => setNeedsUpdate(Math.random())} />} />
			<Route path='api_keys' element={<APIKeysGrid onUpdated={() => setNeedsUpdate(Math.random())} />} />
			{/* <Route path='/networks' element={<PortMapsGrid data={port_maps} />} /> */}
			{is_administrator ? <Route path='users' element={<UsersGrid />} /> : <></>}
		</Routes>
	</>
}

function ResponsiveDrawer(props: Props) {
	const T = useTranslation().t;

	const { window } = props;
	const [mobileOpen, setMobileOpen] = useState(false);
	const { is_administrator, user, is_dark_theme, is_logged_in, setLogin, setUser } = useStore();
	const navigate = useNavigate();
	const location = useLocation();

	const selected = location.pathname.split("/").pop();
	const setNavigate = (path: string) => {
		navigate(path);
	};
	const handleDrawerToggle = () => {
		setMobileOpen(!mobileOpen);
	};

	const drawer = (
		<div>
			<Toolbar></Toolbar>
			<Divider />
			<List>
				<ListItem disablePadding selected={selected == "compute_nodes"} onClick={() => { setNavigate("compute_nodes"); }}>
					<ListItemButton>
						<ListItemIcon>
							<StorageIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.compute_nodes")} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding selected={selected == "images"} onClick={() => { setNavigate("images"); }}>
					<ListItemButton>
						<ListItemIcon>
							<AlbumIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.images")} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding selected={selected == "instances"} onClick={() => { setNavigate("instances"); }}>
					<ListItemButton>
						<ListItemIcon>
							<DeveloperBoardIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.instances")} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding selected={selected == "port_maps"} onClick={() => { setNavigate("port_maps"); }}>
					<ListItemButton>
						<ListItemIcon>
							<ShareIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.port_maps")} />
					</ListItemButton>
				</ListItem>
			</List>
			<Divider />
			<List>


			<ListItem disablePadding selected={selected == "ssh_keys"} onClick={() => { setNavigate("ssh_keys"); }}>
					<ListItemButton>
						<ListItemIcon>
							<KeyIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.ssh_keys")} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding selected={selected == "api_keys"} onClick={() => { setNavigate("api_keys"); }}>
					<ListItemButton>
						<ListItemIcon>
							<VpnKeyIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.api_keys")} />
					</ListItemButton>
				</ListItem>
				<ListItem disablePadding selected={selected == "members"} onClick={() => { setNavigate("members"); }}>
					<ListItemButton>
						<ListItemIcon>
							<GroupIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.members")} />
					</ListItemButton>
				</ListItem>

				<ListItem disablePadding selected={selected == "account"} onClick={() => { setNavigate("account"); }}>
					<ListItemButton>
						<ListItemIcon>
							<ManageAccountsIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.account")} />
					</ListItemButton>
				</ListItem>


			</List>
			<Divider />
			<List>

				<ListItem disablePadding onClick={() => { U.post("api/v1/user/logout", {}).then(res => { setLogin(false); setUser({}) }).catch(e => { setLogin(false); setUser({}) }) }}>
					<ListItemButton>
						<ListItemIcon>
							<LogoutIcon />
						</ListItemIcon>
						<ListItemText primary={T("left_menu.logout")} />
					</ListItemButton>
				</ListItem>

			</List>


			{is_administrator ? <>
				<Divider />
				<List>
					<ListItem disablePadding>
						<ListItemButton>
							<ListItemIcon>
								<BugReportIcon />
							</ListItemIcon>
							<ListItemText primary={"Debug"} />
						</ListItemButton>
					</ListItem>
					<ListItem selected={selected == "users"} disablePadding onClick={() => { setNavigate("users"); }}>
						<ListItemButton>
							<ListItemIcon>
								<SupervisorAccountIcon />
							</ListItemIcon>
							<ListItemText primary={T("left_menu.users")} />
						</ListItemButton>
					</ListItem>

				</List>


			</> : <>

			</>}

		</div>
	);

	const container = window !== undefined ? () => window().document.body : undefined;

	return (
		<Box sx={{ display: 'flex' }}>
			<CssBaseline />
			<AppBar
				position="fixed"
				sx={{
					width: { sm: `calc(100% - ${drawerWidth}px)` },
					ml: { sm: `${drawerWidth}px` },
				}}
			>
				<Toolbar>
					<IconButton
						color="inherit"
						aria-label="open drawer"
						edge="start"
						onClick={handleDrawerToggle}
						sx={{ mr: 2, display: { sm: 'none' } }}
					>
						<MenuIcon />
					</IconButton>
					<Typography variant="h6" noWrap component="div">
						{user.email}{is_administrator ? " [ administrator ]" : " [ user ]"}
					</Typography>
				</Toolbar>
			</AppBar>
			<Box
				component="nav"
				sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
				aria-label="mailbox folders"
			>
				<Drawer
					container={container}
					variant="temporary"
					open={mobileOpen}
					onClose={handleDrawerToggle}
					ModalProps={{
						keepMounted: true, // Better open performance on mobile.
					}}
					sx={{
						display: { xs: 'block', sm: 'none' },
						'& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
					}}
				>
					{drawer}
				</Drawer>
				<Drawer
					variant="permanent"
					sx={{
						display: { xs: 'none', sm: 'block' },
						'& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
					}}
					open
				>
					{drawer}
				</Drawer>
			</Box>
			<Box
				component="main"
				sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
			>
				<Toolbar />
				<ContentComponent setNavigate={setNavigate} />
			</Box>
		</Box>
	);
}




export default () => {
	const T = useTranslation().t;
	const { is_administrator, is_dark_theme, is_logged_in, setLogin } = useStore();

	const [login_component_visibility, showLoginComponent] = useState(false);
	const [signup_component_visibility, showSignupComponent] = useState(false);
	const [reset_component_visibility, showResetPasswordComponent] = useState(false);
	const [processing_component_visibility, showProcessingComponent] = useState(false);
	const modal_bg_color = is_dark_theme ? '#222' : '#FFF';
	const open_login_component = login_component_visibility || is_logged_in === false;
	return (
		<>

			{(open_login_component) ? (
				<Modal
					open={open_login_component}
					onClose={() => {
						showLoginComponent(false);
					}}
					aria-labelledby='modal-modal-title'
					aria-describedby='modal-modal-description'
					sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: "100%" }}>
					<Stack sx={{
						display: 'flex', mx: 2, my: 10, justifyContent: 'center',
						alignItems: 'center', borderRadius: 1, background: modal_bg_color
					}}>
						<Login
							show={open_login_component}
							onClosed={() => {
								showLoginComponent(false);
							}}
							onClickedForgetPassword={() => {
								// showSignupComponent(false);
								// showLoginComponent(false);
							}}
							onClickedSignUp={() => {
								showLoginComponent(false);
							}}
						/>
					</Stack>
				</Modal>

			) : (
				is_logged_in === null ? <></> : <ResponsiveDrawer />
			)}
			{/* 
			{signup_component_visibility ? (
				<Modal
					open={signup_component_visibility}
					onClose={() => {
						showSignupComponent(false);
					}}
					aria-labelledby='modal-modal-title'
					aria-describedby='modal-modal-description'
				>
					<Stack sx={{ display: 'flex', mx: 2, my: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 1, background: modal_bg_color }}>
						<Signup
							forRoot={true}
							show={signup_component_visibility}
							onClosed={() => {
								showSignupComponent(false);
							}}
						/>
					</Stack>
				</Modal>
			) : (
				<></>
			)} */}
			{reset_component_visibility ? (
				<Modal
					open={reset_component_visibility}
					onClose={() => {
						showResetPasswordComponent(false);
					}}
					aria-labelledby='modal-modal-title'
					aria-describedby='modal-modal-description'
				>
					<Stack sx={{ display: 'flex', mx: 2, my: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 1, background: modal_bg_color }}>
						<ResetPassword
							show={reset_component_visibility}
							onClosed={() => {
								showResetPasswordComponent(false);
							}}
						/>
					</Stack>
				</Modal>
			) : (
				<></>
			)}
			{reset_component_visibility ? (
				<Modal
					open={reset_component_visibility}
					onClose={() => {
						showResetPasswordComponent(false);
					}}
					aria-labelledby='modal-modal-title'
					aria-describedby='modal-modal-description'
				>
					<Stack sx={{ display: 'flex', mx: 2, my: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 1, background: modal_bg_color }}>
						<ResetPassword
							show={reset_component_visibility}
							onClosed={() => {
								showResetPasswordComponent(false);
							}}
						/>
					</Stack>
				</Modal>
			) : (
				<></>
			)}



			<Modal
				open={processing_component_visibility}
				onClose={() => {
					showProcessingComponent(false);
				}}
				aria-labelledby='modal-modal-title'
				aria-describedby='modal-modal-description'
			>
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
					<CircularProgress size="1.5rem" />
				</Box>
			</Modal>

		</>
	)
}