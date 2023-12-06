
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function ConfirmDialog(prop: any) {
	const title = prop.title ?? "Confirmation";
	const message = prop.message ?? "Are you sure?";
	const positive = prop.positive ?? 'OK';
	const negative = prop.negative ?? 'Cancel';
	const no_cancel = prop.no_cancel ?? false;
	const open = prop.open;
	const setOpen = prop.setOpen;
	const onSubmit = prop.onSubmit;

	return (
		<Dialog
			open={open}
			onClose={() => { setOpen(false) }}
			aria-labelledby="generic-alert-dialog-title"
			aria-describedby="generic-alert-dialog-description"
			sx={{ width: "100%" }}
		>
			<DialogTitle id="generic-alert-dialog-title">{title}</DialogTitle>
			<DialogContent sx={{ minWidth: 300 }}>
				<DialogContentText id="generic-alert-dialog-description" sx={{ whiteSpace: "pre-wrap" }}>{message}</DialogContentText>
			</DialogContent>
			<DialogActions>
				{no_cancel ? <></> : <Button onClick={() => { setOpen(false); onSubmit(false); }} autoFocus>{negative}</Button>}
				<Button onClick={() => { setOpen(false); onSubmit(true); }}>{positive}</Button>
			</DialogActions>
		</Dialog>
	);
}