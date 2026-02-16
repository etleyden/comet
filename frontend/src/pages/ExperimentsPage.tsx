import { useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import AccountCreation from "../components/accounts/AccountCreation";
import AccountSelection from "../components/accounts/AccountSelection";

export default function ExperimentsPage() {
    const [selectedAccount, setSelectedAccount] = useState("");

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, p: 3 }}>
            <Box>
                <Typography variant="h5" gutterBottom>Account Creation</Typography>
                <AccountCreation />
            </Box>

            <Divider />

            <Box>
                <Typography variant="h5" gutterBottom>Account Selection</Typography>
                <AccountSelection
                    value={selectedAccount}
                    onChange={setSelectedAccount}
                    label="Select Account"
                    required
                />
            </Box>
        </Box>
    );
}