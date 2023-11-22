import React from 'react';

import { useTranslation } from 'react-i18next';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import Copyright from '../Copyright';


export default ({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) => {
	const T = useTranslation().t;
	const id = 'password_reset_form_authentication_type';
	return (
		<>
			<Box
				sx={{
					marginTop: 4,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
					<LockOutlinedIcon />
				</Avatar>
				<Typography component='h1' variant='h5'>
					{T('common.reset_password')}
				</Typography>
				<Box component='form' noValidate sx={{ mt: 4 }}>
					<FormControl sx={{ minWidth: 300, width: '100%', display: 'flex', justifyContent: 'center' }} size='small'>
						<InputLabel id={id} sx={{ mt: 0 }}>
							{T('authentication.selector_label')}
						</InputLabel>
						<Select
							labelId={id}
							id={id}
							value={pageState.auth_type}
							label={id}
							onChange={(event) => {
								dispatchPageState({ type: 'auth_type', payload: event.target.value });
							}}
						>
							{/* <MenuItem value={'email'}>{T('authentication.email')}</MenuItem> */}
							<MenuItem value={'phone'}>{T('authentication.phone')}</MenuItem>
							<MenuItem value={'qr_code'}>{T('authentication.qr_code')}</MenuItem>
							<MenuItem value={'web_authn'}>{T('authentication.web_authn')}</MenuItem>
						</Select>
					</FormControl>
					<Button
						onClick={() => {
							dispatchPageState({ type: 'page', payload: pageState.auth_type });
						}}
						type='submit'
						fullWidth
						variant='contained'
						sx={{ mt: 3, mb: 2, height: 50 }}
					>
						{T('common.next')}
					</Button>
				</Box>
			</Box>
			<Stack sx={{ mt: 8, mb: 2 }}>
				<Copyright />
			</Stack>
		</>
	);
}
