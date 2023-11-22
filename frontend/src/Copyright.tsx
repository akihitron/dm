import React from 'react';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function Copyright() {
	const T = useTranslation().t;
	const author_webpage = T('author_webpage');
	return (
		<Typography variant='body2' color='text.secondary' align='center'>
			<Link color='inherit' href={author_webpage}>
				{T('copyright')} {new Date().getFullYear()}
			</Link>
		</Typography>
	);
}
