import { useState } from "react";
import TransactionMappingTable from "../components/upload/TransactionMappingTable";
import AccountSelection from "../components/accounts/AccountSelection";
import AccountCreation from "../components/accounts/AccountCreation";
import Button from "@mui/material/Button";
import { Alert, Box, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ImportCSVButton from "../components/upload/ImportCSVButton";
import { transactionsApi, accountsApi } from "../../api";
import { useNotification } from "../context/NotificationContext";

type UploadPageState = "EMPTY" | "MAPPING" | "LOADING" | "SUCCESS" | "ERROR";

export default function UploadPage() {
    const { notify } = useNotification();
    const [data, setData] = useState<any[]>([]);
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
    const [accountId, setAccountId] = useState<string>("");
    const [pageState, setPageState] = useState<UploadPageState>("EMPTY");
    const [uploadResult, setUploadResult] = useState<{ uploadRecordId: string; transactionCount: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
    const [accountRefreshTrigger, setAccountRefreshTrigger] = useState(0);

    const handleCSVImport = (data: any[]) => {
        setData(data);
        setPageState("MAPPING");
    };

    const handleFileUpload = async () => {
        if (!accountId) {
            setError("Please select an account before uploading.");
            return;
        }

        setPageState("LOADING");
        setError(null);

        try {
            const response = await transactionsApi.uploadTransactions({
                accountId,
                mapping: columnMappings,
                transactions: data,
            });

            if (response.success) {
                setUploadResult(response.data);
                setPageState("SUCCESS");
            } else {
                setError(response.error);
                setPageState("ERROR");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            notify("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"), "error");
            setPageState("ERROR");
        }
    };

    const handleReset = () => {
        setData([]);
        setColumnMappings({});
        setAccountId("");
        setUploadResult(null);
        setError(null);
        setPageState("EMPTY");
    };

    const handleAccountCreated = async () => {
        // Refresh the account list
        setAccountRefreshTrigger(prev => prev + 1);
        
        // Get the newly created account to auto-select it
        try {
            const response = await accountsApi.getAccounts();
            if (response.success && response.data.length > 0) {
                // Select the most recently created account (last in list)
                const newAccount = response.data[response.data.length - 1];
                setAccountId(newAccount.id);
                notify(`Account "${newAccount.name}" created and selected`, "success");
            }
        } catch (err) {
            notify("Account created, but failed to auto-select", "warning");
        }
        
        // Close the dialog
        setShowCreateAccountDialog(false);
    };

    return (<>
        {pageState === "EMPTY" && <ImportCSVButton onFileUpload={handleCSVImport} />}

        {pageState === "MAPPING" && (<>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
                <Box sx={{ minWidth: 250 }}>
                    <AccountSelection
                        value={accountId}
                        onChange={setAccountId}
                        label="Upload to Account"
                        required
                        refreshTrigger={accountRefreshTrigger}
                    />
                </Box>
                <IconButton 
                    color="primary" 
                    onClick={() => setShowCreateAccountDialog(true)}
                    title="Create new account"
                    sx={{ border: 1, borderColor: 'primary.main' }}
                >
                    <AddIcon />
                </IconButton>
                <Button
                    variant="contained"
                    onClick={handleFileUpload}
                    disabled={!accountId}
                >
                    Upload
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TransactionMappingTable data={data} onMappingChange={setColumnMappings} />
        </>)}

        {pageState === "LOADING" && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 4 }}>
                <CircularProgress />
                <Typography>Uploading transactions...</Typography>
            </Box>
        )}

        {pageState === "SUCCESS" && uploadResult && (
            <Box sx={{ mt: 4 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                    Successfully uploaded {uploadResult.transactionCount} transactions.
                </Alert>
                <Button variant="outlined" onClick={handleReset}>
                    Upload Another File
                </Button>
                <Button href="/">
                    Home
                </Button>
            </Box>
        )}

        {pageState === "ERROR" && (
            <Box sx={{ mt: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error ?? "An unknown error occurred."}
                </Alert>
                <Button variant="outlined" onClick={() => setPageState("MAPPING")}>
                    Back to Mapping
                </Button>
            </Box>
        )}

        <Dialog 
            open={showCreateAccountDialog} 
            onClose={() => setShowCreateAccountDialog(false)}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>Create New Account</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <AccountCreation onAccountCreated={handleAccountCreated} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowCreateAccountDialog(false)}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    </>)
}
