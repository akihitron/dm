import React from 'react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import SelectPage from './reset_password_sub/SelectPage';
import EmailAuth from './reset_password_sub/EmailAuth';
import PhoneAuth from './reset_password_sub/PhoneAuth';
import Passcode from './reset_password_sub/Passcode';

export default ({ onClosed, show }: { show: boolean; onClosed: () => void }) => {
	if (!show) return <></>;
	const T = useTranslation().t;
	const [pageState, dispatchPageState] = useReducer(
		(dataState: any, action: any) => {
			switch (action.type) {
				case 'auth_type':
					return {
						...dataState,
						auth_type: action.payload,
					};
				case 'page':
					return {
						...dataState,
						error: '',
						page: action.payload,
					};
				case 'error':
					return {
						...dataState,
						error: action.payload,
						access_state: true,
					};
				case 'processing':
					return {
						...dataState,
						error: '',
						access_state: true,
					};
				case 'idle':
					return {
						...dataState,
						access_state: false,
					};
				default:
					throw new Error();
			}
		},
		{
			page: 'pass_code',
			auth_type: 'phone',
			access_state: false,
			error: '',
		}
	);

	let LocalComponent = () => <Typography>Unknown Error</Typography>;
	if (pageState.page === 'top') {
		LocalComponent = () => <SelectPage pageState={pageState} dispatchPageState={dispatchPageState} />;
	} else if (pageState.page === 'email') {
		LocalComponent = () => <EmailAuth pageState={pageState} dispatchPageState={dispatchPageState} />;
	} else if (pageState.page === 'phone') {
		LocalComponent = () => <PhoneAuth pageState={pageState} dispatchPageState={dispatchPageState} />;
	} else if (pageState.page === 'qr_code') {
	} else if (pageState.page === 'web_authn') {
	} else if (pageState.page === 'pass_code') {
		LocalComponent = () => <Passcode pageState={pageState} dispatchPageState={dispatchPageState} />;
	} else if (pageState.page === 'success') {
	}

	return (
		<Container component='main' maxWidth='xs'>
			<LocalComponent />
		</Container>
	);
};
