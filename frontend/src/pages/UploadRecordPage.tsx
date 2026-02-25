import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import type { GetUploadRecordResponse } from 'shared';
import { MAPPING_ATTRIBUTES } from 'shared';
import { uploadRecordsApi } from '../../api';
import { useNotification } from '../context/NotificationContext';

type PageState = 'loading' | 'ready' | 'error';

export default function UploadRecordPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { notify } = useNotification();

    const [record, setRecord] = useState<GetUploadRecordResponse | null>(null);
    const [pageState, setPageState] = useState<PageState>('loading');
    const [error, setError] = useState<string | null>(null);

    // ── Edit mode ────────────────────────────────────────────────
    const [editing, setEditing] = useState(false);
    const [draftMapping, setDraftMapping] = useState<Record<string, string>>({});

    // ── Delete confirmation ──────────────────────────────────────
    const [deleting, setDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const DELETE_PHRASE = 'delete transactions';

    // ── Fetch ────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setPageState('loading');

        uploadRecordsApi
            .getUploadRecord(id)
            .then((res) => {
                if (res.success) {
                    setRecord(res.data);
                    setPageState('ready');
                } else {
                    setError(res.error);
                    setPageState('error');
                }
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load upload record');
                setPageState('error');
            });
    }, [id]);

    // ── Handlers ─────────────────────────────────────────────────
    const startEditing = () => {
        if (!record) return;
        setDraftMapping({ ...record.mapping });
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setDraftMapping({});
    };

    const saveMapping = async () => {
        if (!id) return;
        try {
            const res = await uploadRecordsApi.updateUploadRecord(id, { mapping: draftMapping });
            if (res.success) {
                setRecord(res.data);
                setEditing(false);
                notify('Mapping updated successfully', 'success');
            } else {
                notify(res.error, 'error');
            }
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Failed to save mapping', 'error');
        }
    };

    const openDeleteDialog = () => {
        setDeleteConfirmText('');
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeleteConfirmText('');
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            const res = await uploadRecordsApi.deleteUploadRecord(id);
            if (res.success) {
                notify(
                    `Upload record deleted (${res.data.deletedTransactionCount} transactions removed)`,
                    'success',
                );
                navigate('/home');
            } else {
                notify(res.error, 'error');
                setDeleting(false);
            }
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Failed to delete upload record', 'error');
            setDeleting(false);
        } finally {
            setDeleteDialogOpen(false);
        }
    };

    const updateDraftValue = (key: string, value: string) => {
        setDraftMapping((prev) => ({ ...prev, [key]: value }));
    };

    // ── Render ───────────────────────────────────────────────────
    if (pageState === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (pageState === 'error' || !record) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error ?? 'Upload record not found'}</Alert>
            </Box>
        );
    }

    const createdAt = new Date(record.createdAt).toLocaleString();

    return (
        <>
            <Box sx={{ p: 3, maxWidth: 800 }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="h5">Upload Record</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {record.accountName} &middot; {createdAt} &middot; {record.transactionCount} transactions
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        {!editing && (
                            <IconButton color="primary" onClick={startEditing} title="Edit mapping">
                                <EditIcon />
                            </IconButton>
                        )}
                        <IconButton
                            color="error"
                            onClick={openDeleteDialog}
                            disabled={deleting}
                            title="Delete upload record and its transactions"
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Stack>
                </Stack>

                {/* Mapping table */}
                <Typography variant="h6" gutterBottom>
                    Column Mapping
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Field
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        CSV Column
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {MAPPING_ATTRIBUTES.map((attr: string) => {
                                const csvColumn = editing ? draftMapping[attr] : record.mapping[attr];
                                return (
                                    <TableRow key={attr}>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{attr}</TableCell>
                                        <TableCell>
                                            {editing ? (
                                                <TextField
                                                    size="small"
                                                    variant="standard"
                                                    value={csvColumn ?? ''}
                                                    onChange={(e) => updateDraftValue(attr, e.target.value)}
                                                    fullWidth
                                                />
                                            ) : (
                                                csvColumn ?? <Typography color="text.secondary">—</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Edit actions */}
                {editing && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={saveMapping}
                        >
                            Save
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={cancelEditing}
                        >
                            Cancel
                        </Button>
                    </Stack>
                )}
            </Box>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Delete upload record?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        This will permanently delete this upload record and all{' '}
                        <strong>{record?.transactionCount ?? ''} transactions</strong> associated with it.
                        This action cannot be undone.
                    </DialogContentText>
                    <DialogContentText sx={{ mb: 1 }}>
                        Type <strong>{DELETE_PHRASE}</strong> to confirm:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && deleteConfirmText === DELETE_PHRASE) handleDelete();
                        }}
                        placeholder={DELETE_PHRASE}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteDialog} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={deleteConfirmText !== DELETE_PHRASE || deleting}
                        onClick={handleDelete}
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
