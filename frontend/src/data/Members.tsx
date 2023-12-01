import React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import U from '../util';
import { useEffect, useState } from 'react';
import { useStore } from '../Context';

const columns: GridColDef[] = [
	{ field: 'id', headerName: 'ID', width: 80 },
	{
		field: 'email',
		headerName: 'EMail',
		width: 250,
		editable: true,
	},
	{
		field: 'permission',
		headerName: 'Permission',
		width: 150,
		editable: true,
	},
	{
		field: 'created_at',
		headerName: 'Created at',
		// type: 'Date',
		width: 210,
	},
];

export default function MembersGrid(prop: any) {
	const { is_administrator, is_logged_in } = useStore();
	const [users, setUsers] = useState<Array<any> | null>(null);

	useEffect(() => {
		(async () => {
			if (is_logged_in) {
				U.get('api/v1/user/list').then((ret: any) => ret.data ? setUsers(ret.data) : console.error(ret.error)).catch(e => console.error(e));
			}
		})();
	}, [is_logged_in]);

	if (is_administrator) {
	}


	const data = users ? users.map((u: any) => Object.assign(u, { created_at: U.format_date(new Date(u.created_at)) })) : [];
	return (
		<Box sx={{ height: 250, width: '100%', marginBottom: 10 }}>
			<h1>Members</h1>
				<DataGrid
				sx={{maxHeight: 400, minHeight: 200 }}
				rows={data}
					columns={columns}
					initialState={{
						pagination: {
							paginationModel: {
								pageSize: 100,
							},
						},
					}}
					pageSizeOptions={[100]}
					checkboxSelection
					disableRowSelectionOnClick
				/>

		</Box>
	);
}