import type {
  ApiResponse,
  GetCategoriesResponse,
  SeedTaxonomyResponse,
} from 'shared';
import ApiClient from '../apiClient';

export const categoriesApi = {
  getCategories(includeDeprecated = false): Promise<ApiResponse<GetCategoriesResponse>> {
    return ApiClient.get<ApiResponse<GetCategoriesResponse>>('/api/categories', {
      params: includeDeprecated ? { includeDeprecated: 'true' } : undefined,
    });
  },

  seedDefaultTaxonomy(): Promise<ApiResponse<SeedTaxonomyResponse>> {
    return ApiClient.post<ApiResponse<SeedTaxonomyResponse>>('/api/categories/seed');
  },
};
