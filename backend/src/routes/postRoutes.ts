import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';

const CreatePostSchema = z.object({
  title: z.string().min(3),
  content: z.string(),
});

export function postRoutes(app: Express) {
  // POST /api/posts - Create post (requires authentication)
  app.post('/api/posts', requireAuth(), createEndpoint({
    schema: CreatePostSchema,
    handler: async (input, req) => {
      const post = {
        id: Math.random().toString(36).slice(2, 9),
        ...input,
        authorId: req.user!.id, // User is guaranteed to exist due to requireAuth()
        createdAt: new Date().toISOString()
      };
      return post;
    }
  }));

  // GET /api/posts - Get all posts (requires authentication)
  app.get('/api/posts', requireAuth(), createEndpoint({
    inputSource: 'query',
    handler: async () => {
      return [
        {
          id: '1',
          title: 'First Posts',
          content: 'Hello World',
          authorId: 'user1'
        }
      ];
    }
  }));
}