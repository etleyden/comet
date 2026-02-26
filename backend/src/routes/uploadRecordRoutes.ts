import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type {
    GetUploadRecordResponse,
    DeleteUploadRecordResponse,
} from 'shared';
import { UploadRecordService } from '../services/uploadRecordService';

const UpdateMappingSchema = z.object({
    mapping: z.record(z.string(), z.string()),
});

export function uploadRecordRoutes(app: Express) {
    const uploadRecordService = new UploadRecordService();

    // GET /api/upload-record/:id — Fetch a single upload record
    app.get(
        '/api/upload-record/:id',
        requireAuth(),
        createEndpoint<unknown, GetUploadRecordResponse, AuthenticatedRequest>({
            handler: async (_input, req): Promise<GetUploadRecordResponse> => {
                return uploadRecordService.getUploadRecord({
                    id: req.params.id,
                    user: req.user,
                });
            },
        })
    );

    // PUT /api/upload-record/:id — Update the column mapping
    app.put(
        '/api/upload-record/:id',
        requireAuth(),
        createEndpoint<z.infer<typeof UpdateMappingSchema>, GetUploadRecordResponse, AuthenticatedRequest>({
            schema: UpdateMappingSchema,
            handler: async (input, req): Promise<GetUploadRecordResponse> => {
                return uploadRecordService.updateUploadRecord({
                    id: req.params.id,
                    user: req.user,
                    mapping: input.mapping,
                });
            },
        })
    );

    // DELETE /api/upload-record/:id — Delete the upload record and its transactions
    app.delete(
        '/api/upload-record/:id',
        requireAuth(),
        createEndpoint<unknown, DeleteUploadRecordResponse, AuthenticatedRequest>({
            handler: async (_input, req): Promise<DeleteUploadRecordResponse> => {
                return uploadRecordService.deleteUploadRecord({
                    id: req.params.id,
                    user: req.user,
                });
            },
        })
    );
}
