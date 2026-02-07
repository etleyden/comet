import { useState } from "react";
import UploadTransactionButton from "../components/UploadTransactionButton";
import UploadTable from "../components/UploadTable";
import TransactionMappingTable from "../components/TransactionMappingTable";

export default function UploadPage() {
    const [data, setData] = useState<any[]>([]);
    const handleUpload = (data: any[]) => {
        setData(data);
        }
    return (<>
        <UploadTransactionButton onFileUpload={handleUpload} />
        <TransactionMappingTable data={data} />
        {/* <UploadTable data={data} /> */}
    </>)
}