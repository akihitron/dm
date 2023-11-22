import React from 'react';
import { AppBar, IconButton, Toolbar } from '@mui/material';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import MenuIcon from '@mui/icons-material/Menu';


export default () => {
	const T = useTranslation().t;

	return (
		<AppBar position="static">
			<Toolbar variant="dense">
				<IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
					<MenuIcon />
				</IconButton>
				<Typography variant="h6" color="inherit" component="div">
					 {T("dm.header")} 
				</Typography>
			</Toolbar>
		</AppBar>
	);
}
