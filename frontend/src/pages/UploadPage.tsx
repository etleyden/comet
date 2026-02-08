import { useState } from "react";
import TransactionMappingTable from "../components/upload/TransactionMappingTable";
import Button from "@mui/material/Button";
import ImportCSVButton from "../components/upload/UploadTransactionButton";

type UploadPageState = "EMPTY" | "MAPPING" | "LOADING";

export default function UploadPage() {
    const [data, setData] = useState<any[]>([]);
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
    const [pageState, setPageState] = useState<UploadPageState>("EMPTY");

    const handleCSVImport = (data: any[]) => {
        setData(data);
        setPageState("MAPPING");
    };

    const handleFileUpload = () => {
        setPageState("LOADING");

    }

    return (<>
        {pageState === "EMPTY" && <ImportCSVButton onFileUpload={handleCSVImport} />}
        {pageState === "MAPPING" && (<>
            <Button onClick={handleFileUpload}>
                Upload
            </Button>
            <TransactionMappingTable data={data} onMappingChange={setColumnMappings} />
        </>)}
    </>)
}