import type {
  ApiResponse,
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  AssignVendorRequest,
} from 'shared';
import ApiClient from '../apiClient';

export const vendorsApi = {
  searchVendors(query?: string, limit?: number): Promise<ApiResponse<Vendor[]>> {
    const params: Record<string, string | number> = {};
    if (query) params.query = query;
    if (limit) params.limit = limit;
    return ApiClient.get<ApiResponse<Vendor[]>>('/api/vendors/search', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  },

  createVendor(data: CreateVendorRequest): Promise<ApiResponse<Vendor>> {
    return ApiClient.post<ApiResponse<Vendor>>('/api/vendors', data);
  },

  getVendor(id: string): Promise<ApiResponse<Vendor>> {
    return ApiClient.get<ApiResponse<Vendor>>(`/api/vendors/${encodeURIComponent(id)}`);
  },

  updateVendor(id: string, data: UpdateVendorRequest): Promise<ApiResponse<Vendor>> {
    return ApiClient.put<ApiResponse<Vendor>>(`/api/vendors/${encodeURIComponent(id)}`, data);
  },

  assignVendorToTransaction(
    transactionId: string,
    data: AssignVendorRequest
  ): Promise<ApiResponse<{ updated: boolean }>> {
    return ApiClient.patch<ApiResponse<{ updated: boolean }>>(
      `/api/transactions/${encodeURIComponent(transactionId)}/vendor`,
      data
    );
  },
};
