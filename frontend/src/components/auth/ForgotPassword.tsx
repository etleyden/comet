import { Box, Button, FormGroup, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { authApi } from "../../../api";
import { useNotification } from "../../context/NotificationContext";
import { HttpError } from "shared";

export default function ForgotPassword(props?: { onCancel?: () => void }) {
    const { notify } = useNotification();
    const [email, setEmail] = useState('');

    const handleForgotPassword = async () => {
        try {
            await authApi.requestResetPassword({ email })
            notify('If an account with that email exists, a reset link has been sent.', 'info');
        } catch (err: unknown) {
            notify(`Error: ${(err as HttpError).status}`, 'error');
        };
        setEmail('');
    };

    return (
        <FormGroup sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 300 }}>
            <Typography variant="h5">Forgot Password</Typography>
            <TextField
                label="Email"
                variant="outlined"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="contained" onClick={handleForgotPassword}>
                    Send Reset Link
                </Button>
                {props?.onCancel && (
                    <Button variant="outlined" onClick={props.onCancel}>
                        Cancel
                    </Button>
                )}
            </Box>
        </FormGroup>
    )
}