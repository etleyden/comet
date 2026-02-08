import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Button, styled } from '@mui/material';
import Papa from 'papaparse';

const HiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

export default function UploadTransactionButton(props: {
    onFileUpload?: (data: any[]) => void;
}) {
    const handleUpload = (files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            Papa.parse(file, {
                header: true, // Use first row as keys
                skipEmptyLines: true,
                complete: (results) => {
                    if (props.onFileUpload && results.data) {
                        props.onFileUpload(results.data);
                    }
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        });
    }
    return (<>
        <Button
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUploadIcon />}
        >
            Import CSV
            <HiddenInput
                type="file"
                onChange={(event) => handleUpload(event.target.files)}
                multiple
            />
        </Button>
    </>);
}