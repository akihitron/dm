import React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import U from '../util';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../Context';
import { Alert, Button, Card, CardContent, CircularProgress, FormControl, FormControlLabel, FormGroup, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

import ISO6391 from 'iso-639-1';
import ConfirmDialog from '../ConfirmDialog';
import { useTranslation } from 'react-i18next';



const columns: GridColDef[] = [
	{ field: 'id', headerName: 'ID', width: 80 },
	{
		field: 'name',
		headerName: 'name',
		width: 100,
	},
	{
		field: 'created_at',
		headerName: 'Created at',
		// type: 'Date',
		width: 210,
	},
];

function check_password(s: string) {
	if (s.length < 8) return false;
	return true;
}


export default function Account(prop: any) {
	const { i18n } = useTranslation();
	const T = i18n.t;

	const onUpdated = prop.onUpdated;
	const { is_administrator, is_logged_in, setLang, lang, available_langs } = useStore();

	const [user_data, setUserData] = useState<any>(null);
	const [api_keys, setAPIKeys] = useState<Array<any>>([]);
	const [needsUpdate, setNeedsUpdate] = useState(0);
	const [api_key_name, setAPIKeyName] = useState("");

	const [error_location, setErrorLocation] = useState("");
	const [something_error, setSomethingError] = useState("");
	const [disable_submit, setDisableSubmit] = useState(true);
	const [showConfirmDialog, setConfirmDialogVisibility] = useState(false);
	const password_input = useRef<HTMLInputElement | null>(null);
	const [old_password, setOldPassword] = useState("");
	const old_password_input = useRef<HTMLInputElement | null>(null);
	const confirm_password_input = useRef<HTMLInputElement | null>(null);
	const [inputPasswordError, setInputPasswordError] = useState(false);
	const [inputConfirmPasswordError, setInputConfirmPasswordError] = useState(false);
	const [letter_validation, setLetterValidation] = useState(false);
	const [capital_validation, setCapitalValidation] = useState(false);
	const [number_validation, setNumberValidation] = useState(false);
	const [length_validation, setLengthValidation] = useState(false);
	const [password_focused, setPasswordFocused] = useState(false);
	const [processing, setProcessing] = useState(false);
	const onPasswordFocus = () => setPasswordFocused(true);
	const onPasswordBlur = () => setPasswordFocused(false);

	function _password_input_validation(event?: React.ChangeEvent<HTMLInputElement> | null) {
		const ps = password_input?.current?.value as string;
		const cps = confirm_password_input?.current?.value as string;
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
		setDisableSubmit(!(available_to_post && check_password(ps)));
	}

	function password_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
		_password_input_validation(event);
	}
	function confirm_password_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
		const ps = password_input?.current?.value as string;
		const cps = confirm_password_input?.current?.value as string;
		if (cps.length < 8 || cps != ps) {
			setInputConfirmPasswordError(true);
		} else {
			setInputConfirmPasswordError(false);
		}

		_password_input_validation(null);
	}




	useEffect(() => {
		(async () => {
			U.get('api/v1/user/description').then((ret: any) => {
				if (ret.error_code == "x2TpbFQruG") window.location.reload();
				if (ret.data) {
					setUserData(ret.data);
				} else {
					console.error(ret.error);
				}
			}).catch(e => console.error(e));
			U.get('api/v1/user/api_key_list').then((ret: any) => {
				if (ret.error_code == "x2TpbFQruG") window.location.reload();
				if (ret.data) {

					setAPIKeys(ret.data.map((v: any) => {
						v.key = v.key + "....";
						v.created_at = U.format_date(new Date(v.created_at));
						return v;
					}));
				} else {
					console.error(ret.error);
				}
			}).catch(e => console.error(e));

		})();
	}, [needsUpdate]);
	return (
		<Box sx={{ height: 250, width: '100%', marginBottom: 10 }}>
			<h1>Account</h1>
			<Card>
				<CardContent>
					<h3>EMail</h3>
					<Typography sx={{ marginLeft: 1 }}>{user_data?.email}</Typography>
					<h3>Role</h3>
					<Typography sx={{ marginLeft: 1 }}>{user_data?.is_administrator ? "Administrator" : "User"}</Typography>
					<h3>Language</h3>
					<FormControl fullWidth sx={{ marginTop: 2, marginLeft: 1, width: "97%" }}>
						<InputLabel id="lang-simple-select-label">Lang</InputLabel>
						<Select
							labelId="lang-simple-select-label"
							id="lang-simple-select"
							value={lang}
							label="Lang"
							onChange={(event: any) => {
								setLang(event.target.value);
							}}>
							{available_langs.map((lang: any, index: number) => <MenuItem key={index} value={lang}>{ISO6391.getName(lang)}</MenuItem>)}
						</Select>
					</FormControl>

				</CardContent>
			</Card>


			<h1>Change Password</h1>
			{processing ? <Card><CardContent><Box sx={{ display: processing ? 'flex' : 'none', width:"100%",alignItems:"center", justifyContent:"center" }}>
				<CircularProgress />
			</Box> </CardContent></Card>: <>
				<Card>
					<CardContent>
						<FormControl fullWidth sx={{ marginTop: 2, marginLeft: 1, width: "97%" }}>
							{error_location == "register" && something_error.length > 0 ? <Alert sx={{ marginBottom: 1, marginTop: 1 }} severity="error">{something_error}</Alert> : <></>}

							<TextField margin='normal' required fullWidth name='password' label={T('common.old_password')} type='password' id='old_password' autoComplete='current-old_password' inputRef={old_password_input} disabled={processing} />
							<TextField margin='normal' required fullWidth name='password' label={T('common.password')} type='password' id='password' autoComplete='current-password' error={inputPasswordError} onChange={password_input_validation} inputRef={password_input} disabled={processing} onFocus={onPasswordFocus} onBlur={onPasswordBlur} />
							<Box sx={{ display: password_focused ? 'block' : 'none' }}>
								<Typography sx={{ my: 1 }}>{T('password_condition.letter_description')}</Typography>
								<Alert severity={letter_validation ? 'success' : 'error'}>{T('password_condition.lower_case')}</Alert>
								<Alert severity={capital_validation ? 'success' : 'error'}>{T('password_condition.capital')}</Alert>
								<Alert severity={number_validation ? 'success' : 'error'}>{T('password_condition.number')}</Alert>
								<Alert severity={length_validation ? 'success' : 'error'}>{T('password_condition.minimum_length')}</Alert>
							</Box>
							<TextField margin='normal' required fullWidth name='confirm_password' label={T('common.confirm_password')} type='password' id='confirm_password' error={inputConfirmPasswordError} onChange={confirm_password_input_validation} inputRef={confirm_password_input} disabled={processing} />

							<Button sx={{ width: "100%", marginTop: 2, marginBottom: 2 }} variant="contained" onClick={() => {
								setConfirmDialogVisibility(true);
							}}
								color="primary" disabled={disable_submit}>
								<Box sx={{ display: processing ? 'flex' : 'none' }}>
									<CircularProgress />
								</Box>
								{processing == false ? 'Change Password' : ''}

							</Button>
						</FormControl>

					</CardContent>
				</Card>
			</>}
			<br />
			<br />

			<ConfirmDialog open={showConfirmDialog} setOpen={setConfirmDialogVisibility} onSubmit={async (flag: boolean) => {
				if (flag) {
					setSomethingError("");
					setErrorLocation("");
					setProcessing(true);
					const password = password_input?.current?.value as string;
					const old_password = old_password_input?.current?.value as string;
					await U.sleep(2000);
					U.post('api/v1/user/change_password', { email: user_data?.email, password: password, old_password: old_password }).then((ret: any) => {
						if (ret.error) {
							setSomethingError(ret.error);
							setErrorLocation("register");
							console.error(ret.error);
						} else {
							setSomethingError("");
							setErrorLocation("");
						}
						setDisableSubmit(true);
						if (password_input.current) {
							password_input.current.value = '';
						}
						if (old_password_input.current) {
							old_password_input.current.value = '';
						}
						if (confirm_password_input.current) {
							confirm_password_input.current.value = '';
						}
						setProcessing(false);
					});
				}
			}} />


		</Box>
	);
}