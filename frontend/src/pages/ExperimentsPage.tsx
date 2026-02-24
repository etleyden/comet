import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import AccountSelection from "../components/accounts/AccountSelection";
import TransactionTable from "../components/transactionTable/TransactionTable";

export default function ExperimentsPage() {
    const [selectedAccount, setSelectedAccount] = useState("");

    // When an account is selected, constrain the table to that account.
    // Memoised so TransactionTable sees a stable object reference.
    const tableFilter = useMemo(
        () => (selectedAccount ? { accountIds: [selectedAccount] } : undefined),
        [selectedAccount],
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, p: 3 }}>
            <Box>
                <Typography variant="h5" gutterBottom>Filter by Account</Typography>
                <AccountSelection
                    value={selectedAccount}
                    onChange={setSelectedAccount}
                    label="Select Account"
                />
            </Box>

            <Box>
                <Typography variant="h5" gutterBottom>
                    Transactions
                    {selectedAccount && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            (filtered to selected account)
                        </Typography>
                    )}
                </Typography>
                <TransactionTable filter={tableFilter} />
            </Box>
        </Box>
    );
}