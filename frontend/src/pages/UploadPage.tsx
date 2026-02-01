import { useState } from "react";
import UploadTransactionButton from "../components/UploadTransactionButton";
import UploadTable from "../components/UploadTable";

export default function UploadPage() {
    const [data, setData] = useState<any[]>([]);
    const handleUpload = (data: any[]) => {
        setData(data);
        }
    return (<>
        <UploadTransactionButton onFileUpload={handleUpload} />
        <UploadTable data={data} />
    </>)
}