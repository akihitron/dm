import React from 'react';
import { useTranslation } from 'react-i18next';
import Footer from './Footer';
import Head from './Head';

import { Paper, Box } from '@mui/material';


export default () => {
	const T = useTranslation().t;
	return (
		<>
			<Head />
			<Box
				sx={{
					display: 'flex',
					flexWrap: 'wrap',
					'& > :not(style)': {
						m: 1,
						width: 128,
						height: 128,
					},
				}}
			>
				<Paper elevation={0} />
				<Paper />
				<Paper />
				<Paper elevation={3} />
			</Box>
			<Footer />
		</>
	);
}
