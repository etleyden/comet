import { Box, Button, Stack, Typography } from "@mui/material";
import { useNotification } from "../context/NotificationContext";

export default function ExperimentsPage() {
    const { notify } = useNotification();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Notification System Demo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Click a button to trigger a notification. They appear in the bottom-right,
                auto-dismiss after 5 seconds, and can be closed manually.
            </Typography>

            <Stack direction="row" spacing={2}>
                <Button
                    color="success"
                    onClick={() => notify("Operation completed successfully!", "success")}
                >
                    Success
                </Button>
                <Button
                    color="error"
                    onClick={() => notify("Something went wrong.", "error")}
                >
                    Error
                </Button>
                <Button
                    color="warning"
                    onClick={() => notify("Watch out — this needs attention.", "warning")}
                >
                    Warning
                </Button>
                <Button
                    color="info"
                    onClick={() => notify("Here's some useful info.", "info")}
                >
                    Info
                </Button>
            </Stack>
        </Box>
    );
}