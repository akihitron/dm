import React from 'react';

import { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, CircularProgress, Stack } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Copyright from '../Copyright';
import U from '../util';

export default ({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) => {
	const T = useTranslation().t;
	const type = "phone";
	const email_input = useRef<HTMLInputElement | null>(null);
	const attr_input = useRef<HTMLInputElement | null>(null);
	const [submit_button_state, setSubmitButtonState] = useState(true);
	const [all_input_state, setAllInputState] = useState(false);

	const [inputEMailError, setInputEmailError] = useState(false);
	const [inputAttrError, setInputAttrError] = useState(false);

	const access_state = pageState.access_state;

	function email_input_validation(event: ChangeEvent<HTMLInputElement>) {
		const em = email_input?.current?.value as string;
		const ps = attr_input?.current?.value as string;
		if (!U.check_email(em)) {
			setInputEmailError(true);
		} else {
			setInputEmailError(false);
		}
		const available_to_post = U.check_email(em) && ps.length >= 4;
		setSubmitButtonState(!available_to_post);
	}
	function attr_input_validation(event: ChangeEvent<HTMLInputElement>) {
		const em = email_input?.current?.value as string;
		const ps = attr_input?.current?.value as string;
		if (!U.check_email(em)) {
			setInputEmailError(true);
		} else {
			setInputEmailError(false);
		}
		if (ps.length >= 4) {
			setInputAttrError(false);
		} else {
			setInputAttrError(true);
		}
		const available_to_post = U.check_email(em) && ps.length >= 4;
		setSubmitButtonState(!available_to_post);
	}


	function enter_and_post(event: KeyboardEvent<HTMLElement>) {
		if (event.nativeEvent.isComposing || event.key !== 'Enter' || submit_button_state) return;
		const ps = attr_input?.current?.value as string;
		const em = email_input?.current?.value as string;
		const available_to_post = U.check_email(em) && ps.length >= 4;
		if (available_to_post) submit_action(null);
	}

	async function submit_action(event: MouseEvent<HTMLElement, MouseEvent> | null) {
		const em = email_input?.current?.value as string;
		const ps = attr_input?.current?.value as string;
		dispatchPageState('processing', true);
		setSubmitButtonState(true);
		setAllInputState(true);

		await U.sleep(2000);
		let is_success = false;
		try {
			const ret = (await U.post('api/v1/user/issue_pass_code', { email: em, attr: ps, type: type })) as { error?: string };
			if (ret.error) {
				dispatchPageState({ type: 'error', payload: ret.error });
			} else {
				is_success = true;
			}
		} catch (e) {
			dispatchPageState({ type: 'error', payload: 'Server Error' });
			console.error(e);
		}
		await U.sleep(2000);
		dispatchPageState('processing', false);
		if (is_success) {
			dispatchPageState({ type: 'page', payload: 'pass_code' });
		}

		setSubmitButtonState(false);
		setAllInputState(false);
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		submit_action(null);
	};

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
				{(() => {
					if (access_state) {
						return <CircularProgress sx={{ my: 7 }} />;
					}
					return (
						<Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 4 }}>
							<TextField margin='normal' required fullWidth
								id='email'
								label={T('common.email')}
								name='email'
								autoComplete='email'
								inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }}
								autoFocus
								error={inputEMailError}
								onChange={email_input_validation}
								onKeyUp={enter_and_post}
								inputRef={email_input}
								disabled={all_input_state} />
							<TextField margin='normal' required fullWidth
								id='attr'
								label={T('common.phone_4_digit')}
								name='attr'
								autoComplete='attr'
								inputProps={{
									maxLength: 4,
									inputMode: 'numeric',
									pattern: '[0-9]*'
								}}
								error={inputAttrError}
								onChange={attr_input_validation}
								onKeyUp={enter_and_post}
								inputRef={attr_input}
								disabled={all_input_state} />
							{(() => {
								if (pageState.error.length > 0) {
									return <Alert severity='error'>{pageState.error}</Alert>;
								}
								return <></>;
							})()}
							<Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2, height: 50 }} disabled={submit_button_state}>
								<Box sx={{ display: access_state == 0 ? 'none' : 'flex' }}>
									<CircularProgress />
								</Box>
								{access_state == 0 ? T('authentication.submit') : ''}
							</Button>
						</Box>
					);
				})()}
			</Box>
			<Stack sx={{ mt: 8, mb: 2 }}>
				<Copyright />
			</Stack>
		</>
	);
}
