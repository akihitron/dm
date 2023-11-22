import React from 'react';

import { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent, useContext, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, CircularProgress, FormControl, FormGroup, InputLabel, MenuItem, Select, SelectChangeEvent, Stack } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Copyright from '../Copyright';
import U from '../util';
import { useStore } from '../Context';

export default ({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) => {
	const T = useTranslation().t;
	const { lang } = useStore();
	const email_input = useRef<HTMLInputElement | null>(null);
	const password_input = useRef<HTMLInputElement | null>(null);
	const confirm_password_input = useRef<HTMLInputElement | null>(null);
	const [submit_button_state, setSubmitButtonState] = useState(true);
	const [all_input_state, setAllInputState] = useState(false);
	const [letter_validation, setLetterValidation] = useState(false);
	const [capital_validation, setCapitalValidation] = useState(false);
	const [number_validation, setNumberValidation] = useState(false);
	const [length_validation, setLengthValidation] = useState(false);
	const [password_focused, setPasswordFocused] = useState(false);
	const onPasswordFocus = () => setPasswordFocused(true);
	const onPasswordBlur = () => setPasswordFocused(false);

	const [inputEMailError, setInputEmailError] = useState(false);
	const [inputPasswordError, setInputPasswordError] = useState(false);
	const [inputConfirmPasswordError, setInputConfirmPasswordError] = useState(false);

	const access_state = pageState.access_state;

	function email_input_validation(event: ChangeEvent<HTMLInputElement>) {
		const em = email_input?.current?.value as string;
		const ps = password_input?.current?.value as string;
		if (!U.check_email(em)) {
			setInputEmailError(true);
		} else {
			setInputEmailError(false);
		}
		const available_to_post = U.check_email(em) && U.check_password(ps);
		setSubmitButtonState(!available_to_post);
	}

	function enter_and_post(event: KeyboardEvent<HTMLElement>) {
		if (event.nativeEvent.isComposing || event.key !== 'Enter' || submit_button_state) return;
		const ps = password_input?.current?.value as string;
		const em = email_input?.current?.value as string;
		const available_to_post = U.check_email(em) && U.check_password(ps);
		if (available_to_post) signup_action(null);
	}

	async function signup_action(event: MouseEvent<HTMLElement, MouseEvent> | null) {
		const em = email_input?.current?.value as string;
		const ps = password_input?.current?.value as string;
		dispatchPageState('processing', true);
		setSubmitButtonState(true);
		setAllInputState(true);

		await U.sleep(2000);
		let is_success = false;
		try {
			const ret = (await U.post('api/v1/user/reset_password', { email: em, password: ps })) as { error?: string };
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
			dispatchPageState({ type: 'page', payload: 'success' });
		}

		setSubmitButtonState(false);
		setAllInputState(false);
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		signup_action(null);
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
							<TextField margin='normal' required fullWidth id='email' label={T('common.email')} name='email' autoComplete='email' inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }} autoFocus error={inputEMailError} onChange={email_input_validation} onKeyUp={enter_and_post} inputRef={email_input} disabled={all_input_state} />
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
