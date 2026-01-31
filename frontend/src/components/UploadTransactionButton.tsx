import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Button, styled } from '@mui/material';

const VisuallyHiddenInput = styled('input')({
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
            <VisuallyHiddenInput
                type="file"
                onChange={(event) => handleUpload(event.target.files)}
                multiple
            />
        </Button>
    </>);
}