import type { ApiResponse, CreatePostRequest, Post } from 'shared';
import ApiClient from '../apiClient';

/**
 * Posts API service — typed wrappers for post endpoints.
 */
export const postsApi = {
  /**
   * POST /api/posts
   * Creates a new post (requires authentication).
   */
  create(data: CreatePostRequest): Promise<ApiResponse<Post>> {
    return ApiClient.post<ApiResponse<Post>>('/api/posts', data);
  },

  /**
   * GET /api/posts
   * Retrieves all posts (requires authentication).
   */
  list(): Promise<ApiResponse<Post[]>> {
    return ApiClient.get<ApiResponse<Post[]>>('/api/posts');
  },
};
