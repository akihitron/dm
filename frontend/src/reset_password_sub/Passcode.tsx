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
import U from '../util';
import Copyright from '../Copyright';

export default ({ pageState, dispatchPageState }: { pageState: any; dispatchPageState: any }) => {
	const T = useTranslation().t;

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
	const error_message = pageState.error;
	const access_state = pageState.access_state;

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
			dispatchPageState({ type: "error", payload: '' });
			dispatchPageState({ type: "processing", payload: true });
			for (let i = 0; i < 4; i++) {
				inputs_disabled_setter[i](true);
			}
			input_a_set(true);
			setTimeout(() => {
				U.post('api/v1/user/email_validation', { code: code })
					.then((j: { error?: string }) => {
						setTimeout(() => {
							if (j.error) {
								dispatchPageState({ type: "error", payload: j.error });
								unlock_inputs();
							} else {
								//onClosed();
								unlock_inputs();
							}
							dispatchPageState({ type: "processing", payload: false });

						}, 2000);
					})
					.catch((e:any) => {
						dispatchPageState({ type: "error", payload: e.toString() });
						dispatchPageState({ type: "processing", payload: false });
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
				</Box>
				<Stack sx={{ mt: 8, mb: 2 }}>
					<Copyright />
				</Stack>
			</Container>
		</>
	);
}
