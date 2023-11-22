import React, { useEffect, useRef, Fragment, useState } from 'react';

import { Box, CssBaseline, Modal, Stack } from '@mui/material';


import { ThemeProvider } from '@mui/material/styles';
import U from './util';

import Front from './Front';
import RootSignup from './RootSignup';
import { StoreContextProvider, useStore } from './Context';

import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';


import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './index.css';

import { useAsync, useInterval } from 'react-use';

export const BASE_URL = import.meta.env.BASE_URL;
console.log("BASE_URL", BASE_URL);
let first_login_check_flag = false;

const style = {
	position: 'absolute' as 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: 400,
	bgcolor: 'background.paper',
	border: '2px solid #000',
	boxShadow: 24,
	pt: 2,
	px: 4,
	pb: 3,
};


function Wrapped() {
	const {
		theme,
		lang,
		is_debug_mode,
		is_logged_in,
		is_dark_theme,
		is_administrator,
		setColorMode,
		setLogin,
		user,
		setUser,
		setAdministratorFlag,
		toggleDebugComponents
	} = useStore();
	const [errorWindow, showErrorWindow] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const [signup_component_visibility, showSignupComponent] = useState(false);
	const modal_bg_color = is_dark_theme ? '#222' : '#FFF';


	useAsync(async () => {
		if (first_login_check_flag == false) {
			first_login_check_flag = true;
			const j = await U.get('api/v1/user/check_login') as { error: string, email: string, is_administrator: boolean, is_logged_in: boolean, should_create_administrator: boolean };
			if (j.error) {
				console.error("------------------------------------");
				console.error("Login error:", j.error);
				console.error("------------------------------------");
				setErrorMessage(String(j.error));
				showErrorWindow(true);
				setLogin(false);
			} else {
				setUser(j);
				setLogin(j.is_logged_in);
				setAdministratorFlag(j.is_administrator);
				showSignupComponent(j.should_create_administrator);
			}
		}
	}, []); // First time only

	// console.log("Login", is_logged_in);

	return <ThemeProvider theme={theme}>
		<CssBaseline />

		{signup_component_visibility ? (
			<Modal
				open={signup_component_visibility}
				onClose={() => {
					//showSignupComponent(false);
				}}
				aria-labelledby='modal-modal-title'
				aria-describedby='modal-modal-description'
			>
				<Stack sx={{ display: 'flex', mx: 2, my: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 1, background: modal_bg_color }}>
					<RootSignup
						show={signup_component_visibility}
						onClosed={() => {
							showSignupComponent(false);
						}}
					/>
				</Stack>
			</Modal>
		) : (
			<Front />
		)}
		<Fragment>
			<Modal open={errorWindow} onClose={() => { showErrorWindow(false) }}>
				<Box sx={{ ...style, width: "50%", textAlign: "center" }}>
					<h2>Error</h2>
					<p>{errorMessage}</p>
				</Box>
			</Modal>
		</Fragment>
	</ThemeProvider>
}

function App() {
	return (
		<StoreContextProvider>
			<Wrapped />
		</StoreContextProvider>
	);
}


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<Router basename={BASE_URL}>
			<App />
		</Router>
	</React.StrictMode>
);
