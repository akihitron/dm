import React, { useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Alert, CircularProgress, FormGroup, Stack } from '@mui/material';

import Copyright from './Copyright';
import U from './util';
import { useStore } from './Context';

function check_email(s: string) {
	if (!s.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)) return false;
	if (s.split('@')?.[1]?.indexOf('.') === -1) return false;
	return true;
}
function check_name (s:string) {
	if (s.length < 2) return false;
	return true;
}

function check_password(s: string) {
	if (s.length < 8) return false;
	return true;
}

function sleep(m: number) {
	return new Promise((resolve) => setTimeout(resolve, Math.floor(m)));
}

type Props = {
	show: boolean;
	onClosed: () => void;
	forRoot: boolean;
};

export default ({ onClosed, show, forRoot }: Props) => {
	if (!show) return <></>;
	const T = useTranslation().t;
	const { lang } = useStore();

	const [access_state, setAccessState] = useState(0);
	const [error_message, setErrorMessage] = useState('');
	const [signup_flag, setSignupState] = useState(0);

	function AfterSingup() {
		const input_a = useRef<any>(null);
		const input_b = useRef<any>(null);
		const input_c = useRef<any>(null);
		const input_d = useRef<any>(null);
		const [input_a_s, input_a_set] = useState(false);
		const [input_b_s, input_b_set] = useState(false);
		const [input_c_s, input_c_set] = useState(false);
		const [input_d_s, input_d_set] = useState(false);
		const inputs = [input_a, input_b, input_c, input_d];
		const inputs_disabled = [input_a_s, input_b_s, input_c_s, input_d_s];
		const inputs_disabled_setter = [input_a_set, input_b_set, input_c_set, input_d_set];

		function on_key_down(event: React.KeyboardEvent<HTMLInputElement>) {
			if (event.key == 'Backspace') {
				const target = event.target as any;
				target.value = '';
				for (let i = 0; i < inputs.length; i++) {
					if (inputs[i].current == target) {
						const prev = inputs[i - 1]?.current as any;
						if (prev) {
							prev.focus();
						}
					}
				}
			}
		}

		function validation_code_step(event: React.ChangeEvent<HTMLInputElement>) {
			let filled = true;
			for (let i = 0; i < 4; i++) {
				const v = inputs[i].current?.value as string;
				if (v.length == 0) {
					inputs[i].current?.focus();
					filled = false;
					break;
				}
			}
			if (filled) {
				const code = inputs.map((e) => e?.current?.value).join('');

				const elem = document.activeElement;

				if (elem instanceof HTMLInputElement) {
					elem.blur();
				}
				function unlock_inputs() {
					for (let i = 0; i < 4; i++) {
						inputs_disabled_setter[i](false);
						if (inputs[i]) {
							const input = inputs[i].current;
							if (input) {
								input.value = '';
							}
						}
					}
				}
				setErrorMessage('');
				setAccessState(1);
				for (let i = 0; i < 4; i++) {
					inputs_disabled_setter[i](true);
				}
				input_a_set(true);
				setTimeout(() => {
					U.post('api/v1/user/email_validation', { code: code })
						.then((j: { error?: string }) => {
							setTimeout(() => {
								if (j.error) {
									setErrorMessage(j.error);
									unlock_inputs();
								} else {
									onClosed();
									unlock_inputs();
								}
								setAccessState(0);
							}, 2000);
						})
						.catch((e) => {
							setErrorMessage(e.toString());
							setAccessState(0);
							unlock_inputs();
						});
				}, 2000);
			}
		}
		return (
			<>
				<Container component='main' maxWidth='xs'>
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
							{T('validation_code.title')}
						</Typography>
						{signup_flag == 1 ? (
							<>
								<Stack direction='row' spacing={2} sx={{ m: 2, p: 2, display: access_state ? 'none' : 'flex' }}>
									<TextField inputRef={input_a} autoFocus={true} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[0]}></TextField>
									<TextField inputRef={input_b} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[1]}></TextField>
									<TextField inputRef={input_c} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[2]}></TextField>
									<TextField inputRef={input_d} inputProps={{ min: 0, style: { textAlign: 'center', fontSize: 40 } }} InputLabelProps={{ style: { fontSize: 40 } }} sx={{ width: 60 }} onKeyDown={on_key_down} onInput={validation_code_step} disabled={inputs_disabled[3]}></TextField>
								</Stack>
								{(() => {
									if (error_message.length > 0) {
										return (
											<Alert sx={{ mb: 3 }} severity='error'>
												{error_message}
											</Alert>
										);
									}
									return <></>;
								})()}
								{(() => {
									if (access_state) {
										return <CircularProgress sx={{ my: 7 }} />;
									}
									return <></>;
								})()}
								<Typography>{T('validation_code.description')}</Typography>
							</>
						) : (
							<>
								<Alert severity='success'>{T('signup.successful')}</Alert>
							</>
						)}
					</Box>
					<Stack sx={{ mt: 8, mb: 2 }}>
						<Copyright />
					</Stack>
				</Container>
			</>
		);
	}

	function SingUp() {
		{
			const name_input = useRef<HTMLInputElement | null>(null);
			const email_input = useRef<HTMLInputElement | null>(null);
			const password_input = useRef<HTMLInputElement | null>(null);
			const confirm_password_input = useRef<HTMLInputElement | null>(null);
			const [signup_button_state, setSignupButtonState] = useState(true);
			const [all_input_state, setAllInputState] = useState(false);
			const [letter_validation, setLetterValidation] = useState(false);
			const [capital_validation, setCapitalValidation] = useState(false);
			const [number_validation, setNumberValidation] = useState(false);
			const [length_validation, setLengthValidation] = useState(false);
			const [password_focused, setPasswordFocused] = useState(false);
			const onPasswordFocus = () => setPasswordFocused(true);
			const onPasswordBlur = () => setPasswordFocused(false);

			const [policy_agreement, setAgree] = useState(false);

			const [inputNameError, setInputNameError] = useState(false);
			const [inputEMailError, setInputEmailError] = useState(false);
			const [inputPasswordError, setInputPasswordError] = useState(false);
			const [inputConfirmPasswordError, setInputConfirmPasswordError] = useState(false);

			function email_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
				const em = email_input?.current?.value as string;
				const ps = password_input?.current?.value as string;
				if (!check_email(em)) {
					setInputEmailError(true);
				} else {
					setInputEmailError(false);
				}
				const available_to_post = check_email(em) && check_password(ps);
				setSignupButtonState(!available_to_post);
			}
			function name_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
				const em = email_input?.current?.value as string;
				const ps = password_input?.current?.value as string;
				const nm = name_input?.current?.value as string;
				if (!check_name(nm)) {
					setInputNameError(true);
				} else {
					setInputNameError(false);
				}
				const available_to_post = check_email(em) && check_password(ps);
				setSignupButtonState(!available_to_post);
			}

			function _password_input_validation(event?: React.ChangeEvent<HTMLInputElement> | null) {
				const ps = password_input?.current?.value as string;
				const cps = confirm_password_input?.current?.value as string;
				const em = email_input?.current?.value as string;
				if (!check_password(ps)) {
					setInputPasswordError(true);
				} else {
					setInputPasswordError(false);
				}

				const lowerCaseLetters = /[a-z]/g;
				let available_to_post = true;
				if (ps.match(lowerCaseLetters)) {
					setLetterValidation(true);
				} else {
					setLetterValidation(false);
					available_to_post = false;
				}
				const upperCaseLetters = /[A-Z]/g;
				if (ps.match(upperCaseLetters)) {
					setCapitalValidation(true);
				} else {
					setCapitalValidation(false);
					available_to_post = false;
				}
				const numbers = /[0-9]/g;
				if (ps.match(numbers)) {
					setNumberValidation(true);
				} else {
					setNumberValidation(false);
					available_to_post = false;
				}

				// Validate length
				if (ps.length >= 8) {
					setLengthValidation(true);
				} else {
					setLengthValidation(false);
					available_to_post = false;
				}

				if (cps != ps) available_to_post = false;
				setSignupButtonState(!(available_to_post && check_email(em) && check_password(ps)));
			}

			function password_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
				_password_input_validation(event);
			}
			function confirm_password_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
				const ps = password_input?.current?.value as string;
				const cps = confirm_password_input?.current?.value as string;
				const em = email_input?.current?.value as string;
				if (cps.length < 8 || cps != ps) {
					setInputConfirmPasswordError(true);
				} else {
					setInputConfirmPasswordError(false);
				}

				_password_input_validation(null);

				// if (cps == ps) {
				//   setSignupButtonState(!((check_email(em) && check_password(ps))));
				// } else {
				//   setSignupButtonState(true);
				// }
			}

			function enter_and_post(event: React.KeyboardEvent<HTMLElement>) {
				if (event.nativeEvent.isComposing || event.key !== 'Enter' || signup_button_state) return;
				const ps = password_input?.current?.value as string;
				const em = email_input?.current?.value as string;
				const nm = name_input?.current?.value as string;
				const available_to_post = check_email(em) && check_password(ps)&& check_name(nm);
				if (available_to_post) signup_action(null);
			}

			async function signup_action(event: React.MouseEvent<HTMLElement, MouseEvent> | null) {
				const em = email_input?.current?.value as string;
				const ps = password_input?.current?.value as string;
				const nm = name_input?.current?.value as string;
				setAccessState(1);
				setSignupButtonState(true);
				setAllInputState(true);

				await sleep(2000);
				let is_success = false;
				try {
					const ret = (await U.post(forRoot?'api/v1/root/create':'api/v1/user/signup', { lang: lang, email: em, password: ps, name:nm })) as { error?: string };
					if (ret.error) {
					setErrorMessage(ret.error);
					} else {
						is_success = true;
					}
				} catch (e) {
					setErrorMessage('Server Error');
					console.error(e);
				}
				await sleep(2000);
				setSignupState(is_success ? 1 : 0);
				setAccessState(0);

				setSignupButtonState(false);
				setAllInputState(false);
			}

			const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
				event.preventDefault();
				signup_action(null);
			};

			const handleCheckBoxChange = (e: any) => {
				setAgree(e.target.checked);
			};

			return (
				<>
					<Container component='main' maxWidth='xs'>
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
								{T('common.signup')}
							</Typography>
							{(() => {
								if (access_state) {
									return <CircularProgress sx={{ my: 7 }} />;
								}
								return (
									<Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 4 }}>
										<TextField margin='normal' required fullWidth id='fullname' label={T('common.fullname')} name='fullname' autoComplete='fullname' inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }} autoFocus error={inputNameError} onChange={name_input_validation} onKeyUp={enter_and_post} inputRef={name_input} disabled={all_input_state} />
										<TextField margin='normal' required fullWidth id='email' label={T('common.email')} name='email' autoComplete='email' inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }} error={inputEMailError} onChange={email_input_validation} onKeyUp={enter_and_post} inputRef={email_input} disabled={all_input_state} />
										<TextField margin='normal' required fullWidth name='password' label={T('common.password')} type='password' id='password' autoComplete='current-password' error={inputPasswordError} onChange={password_input_validation} onKeyUp={enter_and_post} inputRef={password_input} disabled={all_input_state} onFocus={onPasswordFocus} onBlur={onPasswordBlur} />
										<Box sx={{ display: password_focused ? 'block' : 'none' }}>
											<Typography sx={{my:1}}>{T('password_condition.letter_description')}</Typography>
											<Alert severity={letter_validation ? 'success' : 'error'}>{T('password_condition.lower_case')}</Alert>
											<Alert severity={capital_validation ? 'success' : 'error'}>{T('password_condition.capital')}</Alert>
											<Alert severity={number_validation ? 'success' : 'error'}>{T('password_condition.number')}</Alert>
											<Alert severity={length_validation ? 'success' : 'error'}>{T('password_condition.minimum_length')}</Alert>
										</Box>
										<TextField margin='normal' required fullWidth name='confirm_password' label={T('common.confirm_password')} type='password' id='confirm_password' error={inputConfirmPasswordError} onChange={confirm_password_input_validation} onKeyUp={enter_and_post} inputRef={confirm_password_input} disabled={all_input_state} />
										<FormGroup>
											<FormControlLabel control={<Checkbox onChange={handleCheckBoxChange} />} label={<Typography style={{ fontSize: 12 }}>{T('signup.agree')}</Typography>} />
											<a
												style={{ fontSize: 10, color: '#38F', cursor: 'pointer' }}
												onClick={() => {
													window.open(T('policy_url') as string, '_blank', 'noreferrer');
												}}
											>
												{T('signup.policy_agreement')}
											</a>
										</FormGroup>
										{(() => {
											if (error_message.length > 0) {
												return <Alert severity='error'>{error_message}</Alert>;
											}
											return <></>;
										})()}
										<Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2, height: 50 }} disabled={signup_button_state || !policy_agreement}>
											<Box sx={{ display: access_state == 0 ? 'none' : 'flex' }}>
												<CircularProgress />
											</Box>
											{access_state == 0 ? T('common.signup') : ''}
										</Button>
									</Box>
								);
							})()}
						</Box>
						<Stack sx={{ mt: 8, mb: 2 }}>
							<Copyright />
						</Stack>
					</Container>
				</>
			);
		}
	}

	return <>{signup_flag ? <AfterSingup /> : <SingUp />}</>;
};
