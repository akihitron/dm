import React from 'react';
import { useState, useRef } from 'react';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Alert, Stack } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import U from './util';
import Copyright from './Copyright';
import { useStore } from './Context';

type Props = {
  show: boolean;
  onClosed: () => void;
  onClickedForgetPassword: () => void;
  onClickedSignUp: () => void;
};

export default function SignIn({ onClosed, show, onClickedForgetPassword, onClickedSignUp }: Props) {
  if (!show) return <></>;
  const { i18n } = useTranslation();
  const T = i18n.t;
  const { setLogin, setUser } = useStore();

  function click_on_outside(event: React.MouseEvent<HTMLElement, MouseEvent> | null) {
    onClosed();
  }

  function click_on_container(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    event.stopPropagation();
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login_action(null);
  };

  const email_input = useRef<HTMLInputElement | null>(null);
  const password_input = useRef<HTMLInputElement | null>(null);
  const [inputEMailError, setInputEmailError] = useState(false);
  const [inputPasswordError, setInputPasswordError] = useState(false);
  const [login_button_state, setLoginButtonState] = useState(true);
  const [all_input_state, setAllInputState] = useState(false);
  const [access_state, setAccessState] = useState(0);
  const [error_message, setErrorMessage] = useState('');
  const [login_flag, setLoginState] = useState(0);
  function email_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
    const em = email_input?.current?.value as string;
    const ps = password_input?.current?.value as string;
    if (!U.check_email(em)) {
      setInputEmailError(true);
    } else {
      setInputEmailError(false);
    }
    const available_to_post = U.check_email(em) && U.check_password(ps);
    setLoginButtonState(!available_to_post);
  }
  function password_input_validation(event: React.ChangeEvent<HTMLInputElement>) {
    const ps = password_input?.current?.value as string;
    const em = email_input?.current?.value as string;
    if (!U.check_password(ps)) {
      setInputPasswordError(true);
    } else {
      setInputPasswordError(false);
    }
    const available_to_post = U.check_email(em) && U.check_password(ps);
    setLoginButtonState(!available_to_post);
  }
  function enter_and_post(event: React.KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing || event.key !== 'Enter') return;
    const ps = password_input?.current?.value as string;
    const em = email_input?.current?.value as string;
    const available_to_post = U.check_email(em) && U.check_password(ps);
    if (available_to_post) login_action(null);
  }

  async function login_action(event: React.MouseEvent<HTMLElement, MouseEvent> | null) {
    const em = email_input?.current?.value as string;
    const ps = password_input?.current?.value as string;

    setAccessState(1);
    setLoginButtonState(true);
    setAllInputState(true);

    setErrorMessage('');
    let error_message = "";

    await U.sleep(1000);
    try {
      const ret = (await U.post('api/v1/user/login', { email: em, password: ps })) as { error?: string };
      console.log(ret);
      if (ret.error) {
        error_message = ret.error;
      } else {
        setUser(ret);
        setLoginState(1);
        setLogin(true);
        // navigate('/dashboard');
        setTimeout(() => {
          click_on_outside(null);
        }, 3000);
      }
      await U.sleep(1000);
    } catch (e) {
      await U.sleep(1000);
      error_message = 'Server Error';
      console.error(e);
    }
    setAccessState(0);
    setLoginButtonState(false);
    setAllInputState(false);
    setErrorMessage(error_message);
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
            {T('common.signin')}
          </Typography>
          <Stack sx={{ mt: 4, display: login_flag ? 'block' : 'none' }} onClick={onClosed}>
            <Button variant='text' color='success' onClick={onClosed}>
              <Alert severity='success'>{T('login.successful_message')}</Alert>
            </Button>
          </Stack>
          <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 4, display: login_flag ? 'none' : 'block' }}>
            <TextField margin='normal' required fullWidth id='email' label={T('common.email')} name='email' autoComplete='email' inputProps={{ minLength: 4, pattern: '^[a-zA-Z0-9_]+$' }} autoFocus error={inputEMailError} onChange={email_input_validation} onKeyUp={enter_and_post} inputRef={email_input} disabled={all_input_state} />
            <TextField margin='normal' required fullWidth name='password' label={T('common.password')} type='password' id='current-password' autoComplete='current-password' error={inputPasswordError} onChange={password_input_validation} onKeyUp={enter_and_post} inputRef={password_input} disabled={all_input_state} />
            {/* <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label="Remember me"
            disabled={all_input_state}
          /> */}
            {(() => {
              if (error_message.length > 0) {
                return <Alert severity='error'>{error_message}</Alert>;
              }
              return <></>;
            })()}
            <Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2, height: 50 }} disabled={login_button_state}>
              <Box sx={{ display: access_state == 0 ? 'none' : 'flex' }}>
                <CircularProgress />
              </Box>
              {access_state == 0 ? T('common.signin') : ''}
            </Button>
            <Grid container>
              <Grid item xs>
                <Link href='#' variant='body2' onClick={() => { onClickedForgetPassword() }}>
                  <s>{T('login.forget_password')}</s>
                </Link>
              </Grid>
              <Grid item>
                <Link href='#' variant='body2' onClick={() => { onClickedSignUp() }}>
                  <s>{T('login.dont_have_an_account')}</s>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
        <Stack sx={{ mt: 8, mb: 2 }}>
          <Copyright />
        </Stack>
      </Container>
    </>
  );
}
