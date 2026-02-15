import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { Post } from 'shared';

const CreatePostSchema = z.object({
  title: z.string().min(3),
  content: z.string(),
});

export function postRoutes(app: Express) {
  // POST /api/posts - Create post (requires authentication)
  app.post(
    '/api/posts',
    requireAuth(),
    createEndpoint<z.infer<typeof CreatePostSchema>, Post, AuthenticatedRequest>({
      schema: CreatePostSchema,
      handler: async (input, req): Promise<Post> => {
        const post: Post = {
          id: Math.random().toString(36).slice(2, 9),
          ...input,
          authorId: req.user.id,
          createdAt: new Date().toISOString(),
        };
        return post;
      },
    })
  );

  // GET /api/posts - Get all posts (requires authentication)
  app.get(
    '/api/posts',
    requireAuth(),
    createEndpoint<unknown, Post[], AuthenticatedRequest>({
      inputSource: 'query',
      handler: async (): Promise<Post[]> => {
        return [
          {
            id: '1',
            title: 'First Posts',
            content: 'Hello World',
            authorId: 'user1',
          },
        ];
      },
    })
  );
}
