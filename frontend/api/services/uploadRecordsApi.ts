import type {
    ApiResponse,
    GetUploadRecordResponse,
    UpdateUploadRecordRequest,
    DeleteUploadRecordResponse,
} from 'shared';
import ApiClient from '../apiClient';

/**
 * Upload Records API service — typed wrappers for upload-record endpoints.
 *
 * NOTE: The backend endpoints are not yet implemented.
 * These stubs are wired to the expected routes so they'll
 * work as soon as the backend catches up.
 */
export const uploadRecordsApi = {
    /**
     * GET /api/upload-record/:id
     */
    getUploadRecord(id: string): Promise<ApiResponse<GetUploadRecordResponse>> {
        return ApiClient.get<ApiResponse<GetUploadRecordResponse>>(`/api/upload-record/${id}`);
    },

    /**
     * PUT /api/upload-record/:id
     */
    updateUploadRecord(
        id: string,
        data: UpdateUploadRecordRequest,
    ): Promise<ApiResponse<GetUploadRecordResponse>> {
        return ApiClient.put<ApiResponse<GetUploadRecordResponse>>(
            `/api/upload-record/${id}`,
            data,
        );
    },

    /**
     * DELETE /api/upload-record/:id
     */
    deleteUploadRecord(id: string): Promise<ApiResponse<DeleteUploadRecordResponse>> {
        return ApiClient.delete<ApiResponse<DeleteUploadRecordResponse>>(
            `/api/upload-record/${id}`,
        );
    },
};
