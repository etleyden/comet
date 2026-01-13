import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';

const CreatePostSchema = z.object({
  title: z.string().min(3),
  content: z.string(),
  authorId: z.string()
});

export function postRoutes(app: Express) {
  // POST /api/posts - Create post
  app.post('/api/posts', createEndpoint({
    schema: CreatePostSchema,
    handler: async (input) => {
      const post = {
        id: Math.random().toString(36).slice(2, 9),
        ...input,
        createdAt: new Date().toISOString()
      };
      return post;
    }
  }));

  // GET /api/posts - Get all posts
  app.get('/api/posts', createEndpoint({
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