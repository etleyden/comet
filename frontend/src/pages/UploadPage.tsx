import { useState } from "react";
import TransactionMappingTable from "../components/upload/TransactionMappingTable";
import AccountSelection from "../components/accounts/AccountSelection";
import Button from "@mui/material/Button";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import ImportCSVButton from "../components/upload/ImportCSVButton";
import { transactionsApi } from "../../api";

type UploadPageState = "EMPTY" | "MAPPING" | "LOADING" | "SUCCESS" | "ERROR";

export default function UploadPage() {
    const [data, setData] = useState<any[]>([]);
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
    const [accountId, setAccountId] = useState<string>("");
    const [pageState, setPageState] = useState<UploadPageState>("EMPTY");
    const [uploadResult, setUploadResult] = useState<{ uploadRecordId: string; transactionCount: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                    />
                </Box>
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
    </>)
}