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

// function AfterResetPassword() {
// 	const input_a = useRef<any>(null);
// 	const input_b = useRef<any>(null);
// 	const input_c = useRef<any>(null);
// 	const input_d = useRef<any>(null);
// 	const [input_a_s, input_a_set] = useState(false);
// 	const [input_b_s, input_b_set] = useState(false);
// 	const [input_c_s, input_c_set] = useState(false);
// 	const [input_d_s, input_d_set] = useState(false);
// 	const inputs = [input_a, input_b, input_c, input_d];
// 	const inputs_disabled = [input_a_s, input_b_s, input_c_s, input_d_s];
// 	const inputs_disabled_setter = [input_a_set, input_b_set, input_c_set, input_d_set];

// 	function on_key_down(event: KeyboardEvent<HTMLInputElement>) {
// 		if (event.key == 'Backspace') {
// 			const target = event.target as any;
// 			target.value = '';
// 			for (let i = 0; i < inputs.length; i++) {
// 				if (inputs[i].current == target) {
// 					const prev = inputs[i - 1]?.current as any;
// 					if (prev) {
// 						prev.focus();
// 					}
// 				}
// 			}
// 		}
// 	}

// 	function validation_code_step(event: ChangeEvent<HTMLInputElement>) {
// 		let filled = true;
// 		for (let i = 0; i < 4; i++) {
// 			const v = inputs[i].current?.value as string;
// 			if (v.length == 0) {
// 				inputs[i].current?.focus();
// 				filled = false;
// 				break;
// 			}
// 		}
// 		if (filled) {
// 			const code = inputs.map((e) => e?.current?.value).join('');

// 			const elem = document.activeElement;

// 			if (elem instanceof HTMLInputElement) {
// 				elem.blur();
// 			}
// 			function unlock_inputs() {
// 				for (let i = 0; i < 4; i++) {
// 					inputs_disabled_setter[i](false);
// 					if (inputs[i]) {
// 						const input = inputs[i].current;
// 						if (input) {
// 							input.value = '';
// 						}
// 					}
// 				}
// 			}
// 			setErrorMessage('');
// 			setAccessState(1);
// 			for (let i = 0; i < 4; i++) {
// 				inputs_disabled_setter[i](true);
// 			}
// 			input_a_set(true);
// 			setTimeout(() => {
// 				U.post('api/v1/user/email_validation', { code: code })
// 					.then((j: { error?: string }) => {
// 						setTimeout(() => {
// 							if (j.error) {
// 								setErrorMessage(j.error);
// 								unlock_inputs();
// 							} else {
// 								onClosed();
// 								unlock_inputs();
// 							}
// 							setAccessState(0);
// 						}, 2000);
// 					})
// 					.catch((e) => {
// 						setErrorMessage(e.toString());
// 						setAccessState(0);
// 						unlock_inputs();
// 					});
// 			}, 2000);
// 		}
// 	}
// 	return (
// 		<>
// 			<Container component='main' maxWidth='xs'>
// 				<Box
// 					sx={{
// 						marginTop: 4,
// 						display: 'flex',
// 						flexDirection: 'column',
// 						alignItems: 'center',
// 					}}
// 				>
// 					<Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
// 						<LockOutlinedIcon />
// 					</Avatar>
// 					<Typography component='h1' variant='h5'>
// 						{T('validation_code.title')}
// 					</Typography>
// 					{signup_flag == 1 ? (
// 						<>
// 							<Stack direction='row' spacing={2} sx={{ m: 2, p: 2, display: access_state ? 'none' : 'flex' }}>
// 								<TextField inputRef={input_a} autoFocus={true} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[0]}></TextField>
// 								<TextField inputRef={input_b} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[1]}></TextField>
// 								<TextField inputRef={input_c} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[2]}></TextField>
// 								<TextField inputRef={input_d} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[3]}></TextField>
// 							</Stack>
// 							{(() => {
// 								if (error_message.length > 0) {
// 									return (
// 										<Alert sx={{ mb: 3 }} severity='error'>
// 											{error_message}
// 										</Alert>
// 									);
// 								}
// 								return <></>;
// 							})()}
// 							{(() => {
// 								if (access_state) {
// 									return <CircularProgress sx={{ my: 7 }} />;
// 								}
// 								return <></>;
// 							})()}
// 							<Typography>{T('validation_code.description')}</Typography>
// 						</>
// 					) : (
// 						<>
// 							<Alert severity='success'>{T('signup.successful')}</Alert>
// 						</>
// 					)}
// 				</Box>
// 				<Stack sx={{ mt: 8, mb: 2 }}>
// 					<Copyright />
// 				</Stack>
// 			</Container>
// 		</>
// 	);
// }

// function SelectPage({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) {
// 	const T = useTranslation().t;
// 	const id = 'password_reset_form_authentication_type';
// 	return (
// 		<>
// 			<Box
// 				sx={{
// 					marginTop: 4,
// 					display: 'flex',
// 					flexDirection: 'column',
// 					alignItems: 'center',
// 				}}
// 			>
// 				<Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
// 					<LockOutlinedIcon />
// 				</Avatar>
// 				<Typography component='h1' variant='h5'>
// 					{T('common.reset_password')}
// 				</Typography>
// 				<Box component='form' noValidate sx={{ mt: 4 }}>
// 					<FormControl sx={{ minWidth: 300, width: '100%', display: 'flex', justifyContent: 'center' }} size='small'>
// 						<InputLabel id={id} sx={{ mt: 0 }}>
// 							{T('authentication.selector_label')}
// 						</InputLabel>
// 						<Select
// 							labelId={id}
// 							id={id}
// 							value={pageState.auth_type}
// 							label={id}
// 							onChange={(event) => {
// 								dispatchPageState({ type: 'auth_type', payload: event.target.value });
// 							}}
// 						>
// 							<MenuItem value={'email'}>{T('authentication.email')}</MenuItem>
// 							<MenuItem value={'phone'}>{T('authentication.phone')}</MenuItem>
// 							<MenuItem value={'qr_code'}>{T('authentication.qr_code')}</MenuItem>
// 							<MenuItem value={'web_authn'}>{T('authentication.web_authn')}</MenuItem>
// 						</Select>
// 					</FormControl>
// 					<Button
// 						onClick={() => {
// 							dispatchPageState({ type: 'page', payload: pageState.auth_type });
// 						}}
// 						type='submit'
// 						fullWidth
// 						variant='contained'
// 						sx={{ mt: 3, mb: 2, height: 50 }}
// 					>
// 						{T('common.next')}
// 					</Button>
// 				</Box>
// 			</Box>
// 			<Stack sx={{ mt: 8, mb: 2 }}>
// 				<Copyright />
// 			</Stack>
// 		</>
// 	);
// }

// function EmailAuth({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) {
// 	const T = useTranslation().t;
// 	const { lang } = useContext(AppContext);
// 	const email_input = useRef<HTMLInputElement | null>(null);
// 	const password_input = useRef<HTMLInputElement | null>(null);
// 	const confirm_password_input = useRef<HTMLInputElement | null>(null);
// 	const [submit_button_state, setSubmitButtonState] = useState(true);
// 	const [all_input_state, setAllInputState] = useState(false);
// 	const [letter_validation, setLetterValidation] = useState(false);
// 	const [capital_validation, setCapitalValidation] = useState(false);
// 	const [number_validation, setNumberValidation] = useState(false);
// 	const [length_validation, setLengthValidation] = useState(false);
// 	const [password_focused, setPasswordFocused] = useState(false);
// 	const onPasswordFocus = () => setPasswordFocused(true);
// 	const onPasswordBlur = () => setPasswordFocused(false);

// 	const [inputEMailError, setInputEmailError] = useState(false);
// 	const [inputPasswordError, setInputPasswordError] = useState(false);
// 	const [inputConfirmPasswordError, setInputConfirmPasswordError] = useState(false);

// 	const access_state = pageState.access_state;

// 	function email_input_validation(event: ChangeEvent<HTMLInputElement>) {
// 		const em = email_input?.current?.value as string;
// 		const ps = password_input?.current?.value as string;
// 		if (!U.check_email(em)) {
// 			setInputEmailError(true);
// 		} else {
// 			setInputEmailError(false);
// 		}
// 		const available_to_post = U.check_email(em) && U.check_password(ps);
// 		setSubmitButtonState(!available_to_post);
// 	}

// 	function enter_and_post(event: KeyboardEvent<HTMLElement>) {
// 		if (event.nativeEvent.isComposing || event.key !== 'Enter' || submit_button_state) return;
// 		const ps = password_input?.current?.value as string;
// 		const em = email_input?.current?.value as string;
// 		const available_to_post = U.check_email(em) && U.check_password(ps);
// 		if (available_to_post) signup_action(null);
// 	}

// 	async function signup_action(event: MouseEvent<HTMLElement, MouseEvent> | null) {
// 		const em = email_input?.current?.value as string;
// 		const ps = password_input?.current?.value as string;
// 		dispatchPageState('processing', true);
// 		setSubmitButtonState(true);
// 		setAllInputState(true);

// 		await U.sleep(2000);
// 		let is_success = false;
// 		try {
// 			const ret = (await U.post('api/v1/user/reset_password', { email: em, password: ps })) as { error?: string };
// 			if (ret.error) {
// 				dispatchPageState({ type: 'error', payload: ret.error });
// 			} else {
// 				is_success = true;
// 			}
// 		} catch (e) {
// 			dispatchPageState({ type: 'error', payload: 'Server Error' });
// 			console.error(e);
// 		}
// 		await U.sleep(2000);
// 		dispatchPageState('processing', false);
// 		if (is_success) {
// 			dispatchPageState({ type: 'page', payload: 'success' });
// 		}

// 		setSubmitButtonState(false);
// 		setAllInputState(false);
// 	}

// 	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
// 		event.preventDefault();
// 		signup_action(null);
// 	};

// 	return (
// 		<>
// 			<Box
// 				sx={{
// 					marginTop: 4,
// 					display: 'flex',
// 					flexDirection: 'column',
// 					alignItems: 'center',
// 				}}
// 			>
// 				<Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
// 					<LockOutlinedIcon />
// 				</Avatar>
// 				<Typography component='h1' variant='h5'>
// 					{T('common.reset_password')}
// 				</Typography>
// 				{(() => {
// 					if (access_state) {
// 						return <CircularProgress sx={{ my: 7 }} />;
// 					}
// 					return (
// 						<Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 4 }}>
// 							<TextField margin='normal' required fullWidth id='email' label={T('common.email')} name='email' autoComplete='email' inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }} autoFocus error={inputEMailError} onChange={email_input_validation} onKeyUp={enter_and_post} inputRef={email_input} disabled={all_input_state} />
// 							<TextField margin='normal' required fullWidth name='password' label={T('common.new_password')} type='password' id='password' autoComplete='current-password'
// 							error={inputPasswordError}
// 							onChange={password_input_validation}
// 							onKeyUp={enter_and_post}
// 							inputRef={password_input}
// 							disabled={all_input_state}
// 							onFocus={onPasswordFocus}
// 							onBlur={onPasswordBlur} />
// 							<Box sx={{ display: password_focused ? 'block' : 'none' }}>
// 								<Typography sx={{ my: 1 }}>{T('password_condition.letter_description')}</Typography>
// 								<Alert severity={letter_validation ? 'success' : 'error'}>{T('password_condition.lower_case')}</Alert>
// 								<Alert severity={capital_validation ? 'success' : 'error'}>{T('password_condition.capital')}</Alert>
// 								<Alert severity={number_validation ? 'success' : 'error'}>{T('password_condition.number')}</Alert>
// 								<Alert severity={length_validation ? 'success' : 'error'}>{T('password_condition.minimum_length')}</Alert>
// 							</Box>
// 							<TextField margin='normal' required fullWidth name='confirm_password' label={T('common.confirm_password')} type='password' id='confirm_password'
// 							error={inputConfirmPasswordError} onChange={confirm_password_input_validation}
// 							onKeyUp={enter_and_post}
// 							inputRef={confirm_password_input}
// 							disabled={all_input_state} />
// 							{(() => {
// 								if (pageState.error.length > 0) {
// 									return <Alert severity='error'>{pageState.error}</Alert>;
// 								}
// 								return <></>;
// 							})()}
// 							<Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2, height: 50 }} disabled={submit_button_state}>
// 								<Box sx={{ display: access_state == 0 ? 'none' : 'flex' }}>
// 									<CircularProgress />
// 								</Box>
// 								{access_state == 0 ? T('common.signup') : ''}
// 							</Button>
// 						</Box>
// 					);
// 				})()}
// 			</Box>
// 			<Stack sx={{ mt: 8, mb: 2 }}>
// 				<Copyright />
// 			</Stack>
// 		</>
// 	);
// }


// function PassCode({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) {
	
// 	return (
// 		<>
			
// 		</>
// 	);
// }



// function ResetPassword({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) {
// 	const T = useTranslation().t;
// 	const { lang } = useContext(AppContext);
// 	const email_input = useRef<HTMLInputElement | null>(null);
// 	const password_input = useRef<HTMLInputElement | null>(null);
// 	const confirm_password_input = useRef<HTMLInputElement | null>(null);
// 	const [submit_button_state, setSubmitButtonState] = useState(true);
// 	const [all_input_state, setAllInputState] = useState(false);
// 	const [letter_validation, setLetterValidation] = useState(false);
// 	const [capital_validation, setCapitalValidation] = useState(false);
// 	const [number_validation, setNumberValidation] = useState(false);
// 	const [length_validation, setLengthValidation] = useState(false);
// 	const [password_focused, setPasswordFocused] = useState(false);
// 	const onPasswordFocus = () => setPasswordFocused(true);
// 	const onPasswordBlur = () => setPasswordFocused(false);

// 	const [inputEMailError, setInputEmailError] = useState(false);
// 	const [inputPasswordError, setInputPasswordError] = useState(false);
// 	const [inputConfirmPasswordError, setInputConfirmPasswordError] = useState(false);

// 	const access_state = pageState.access_state;

// 	function email_input_validation(event: ChangeEvent<HTMLInputElement>) {
// 		const em = email_input?.current?.value as string;
// 		const ps = password_input?.current?.value as string;
// 		if (!U.check_email(em)) {
// 			setInputEmailError(true);
// 		} else {
// 			setInputEmailError(false);
// 		}
// 		const available_to_post = U.check_email(em) && U.check_password(ps);
// 		setSubmitButtonState(!available_to_post);
// 	}

// 	function enter_and_post(event: KeyboardEvent<HTMLElement>) {
// 		if (event.nativeEvent.isComposing || event.key !== 'Enter' || submit_button_state) return;
// 		const ps = password_input?.current?.value as string;
// 		const em = email_input?.current?.value as string;
// 		const available_to_post = U.check_email(em) && U.check_password(ps);
// 		if (available_to_post) signup_action(null);
// 	}

// 	async function signup_action(event: MouseEvent<HTMLElement, MouseEvent> | null) {
// 		const em = email_input?.current?.value as string;
// 		const ps = password_input?.current?.value as string;
// 		dispatchPageState('processing', true);
// 		setSubmitButtonState(true);
// 		setAllInputState(true);

// 		await U.sleep(2000);
// 		let is_success = false;
// 		try {
// 			const ret = (await U.post('api/v1/user/reset_password', { email: em, password: ps })) as { error?: string };
// 			if (ret.error) {
// 				dispatchPageState({ type: 'error', payload: ret.error });
// 			} else {
// 				is_success = true;
// 			}
// 		} catch (e) {
// 			dispatchPageState({ type: 'error', payload: 'Server Error' });
// 			console.error(e);
// 		}
// 		await U.sleep(2000);
// 		dispatchPageState('processing', false);
// 		if (is_success) {
// 			dispatchPageState({ type: 'page', payload: 'success' });
// 		}

// 		setSubmitButtonState(false);
// 		setAllInputState(false);
// 	}

// 	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
// 		event.preventDefault();
// 		signup_action(null);
// 	};

// 	return (
// 		<>
// 			<Box
// 				sx={{
// 					marginTop: 4,
// 					display: 'flex',
// 					flexDirection: 'column',
// 					alignItems: 'center',
// 				}}
// 			>
// 				<Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
// 					<LockOutlinedIcon />
// 				</Avatar>
// 				<Typography component='h1' variant='h5'>
// 					{T('common.reset_password')}
// 				</Typography>
// 				{(() => {
// 					if (access_state) {
// 						return <CircularProgress sx={{ my: 7 }} />;
// 					}
// 					return (
// 						<Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 4 }}>
// 							<TextField margin='normal' required fullWidth id='email' label={T('common.email')} name='email' autoComplete='email' inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }} autoFocus error={inputEMailError} onChange={email_input_validation} onKeyUp={enter_and_post} inputRef={email_input} disabled={all_input_state} />
// 							<TextField margin='normal' required fullWidth name='password' label={T('common.new_password')} type='password' id='password' autoComplete='current-password'
// 							error={inputPasswordError}
// 							onChange={password_input_validation}
// 							onKeyUp={enter_and_post}
// 							inputRef={password_input}
// 							disabled={all_input_state}
// 							onFocus={onPasswordFocus}
// 							onBlur={onPasswordBlur} />
// 							<Box sx={{ display: password_focused ? 'block' : 'none' }}>
// 								<Typography sx={{ my: 1 }}>{T('password_condition.letter_description')}</Typography>
// 								<Alert severity={letter_validation ? 'success' : 'error'}>{T('password_condition.lower_case')}</Alert>
// 								<Alert severity={capital_validation ? 'success' : 'error'}>{T('password_condition.capital')}</Alert>
// 								<Alert severity={number_validation ? 'success' : 'error'}>{T('password_condition.number')}</Alert>
// 								<Alert severity={length_validation ? 'success' : 'error'}>{T('password_condition.minimum_length')}</Alert>
// 							</Box>
// 							<TextField margin='normal' required fullWidth name='confirm_password' label={T('common.confirm_password')} type='password' id='confirm_password'
// 							error={inputConfirmPasswordError} onChange={confirm_password_input_validation}
// 							onKeyUp={enter_and_post}
// 							inputRef={confirm_password_input}
// 							disabled={all_input_state} />
// 							{(() => {
// 								if (pageState.error.length > 0) {
// 									return <Alert severity='error'>{pageState.error}</Alert>;
// 								}
// 								return <></>;
// 							})()}
// 							<Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2, height: 50 }} disabled={submit_button_state}>
// 								<Box sx={{ display: access_state == 0 ? 'none' : 'flex' }}>
// 									<CircularProgress />
// 								</Box>
// 								{access_state == 0 ? T('common.signup') : ''}
// 							</Button>
// 						</Box>
// 					);
// 				})()}
// 			</Box>
// 			<Stack sx={{ mt: 8, mb: 2 }}>
// 				<Copyright />
// 			</Stack>
// 		</>
// 	);
// }
// export default ({ onClosed, show }: { show: boolean; onClosed: () => void }) => {
// 	if (!show) return <></>;
// 	const T = useTranslation().t;
// 	const [pageState, dispatchPageState] = useReducer(
// 		(dataState: any, action: any) => {
// 			switch (action.type) {
// 				case 'auth_type':
// 					return {
// 						...dataState,
// 						auth_type: action.payload,
// 					};
// 				case 'page':
// 					return {
// 						...dataState,
// 						error: '',
// 						page: action.payload,
// 					};
// 				case 'error':
// 					return {
// 						...dataState,
// 						error: action.payload,
// 						access_state: true,
// 					};
// 				case 'processing':
// 					return {
// 						...dataState,
// 						error: '',
// 						access_state: true,
// 					};
// 				case 'idle':
// 					return {
// 						...dataState,
// 						access_state: false,
// 					};
// 				default:
// 					throw new Error();
// 			}
// 		},
// 		{
// 			page: 'top',
// 			auth_type: 'email',
// 			access_state: false,
// 			error: '',
// 		}
// 	);

// 	console.log('@', pageState.page);
// 	let LocalComponent = () => <Typography>Unknown Error</Typography>;
// 	if (pageState.page === 'top') {
// 		LocalComponent = () => <SelectPage pageState={pageState} dispatchPageState={dispatchPageState} />;
// 	} else if (pageState.page === 'email') {
// 		LocalComponent = () => <EmailAuth pageState={pageState} dispatchPageState={dispatchPageState} />;
// 	} else if (pageState.page === 'phone') {
// 	} else if (pageState.page === 'qr_code') {
// 	} else if (pageState.page === 'web_authn') {
// 	} else if (pageState.page === 'success') {
// 	}

// 	return (
// 		<Container component='main' maxWidth='xs'>
// 			<LocalComponent />
// 		</Container>
// 	);
// };
