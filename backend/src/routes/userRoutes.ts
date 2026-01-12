import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import User from "../entities/User";
import { getDB } from '../data-source';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const GetUserSchema = z.object({
  id: z.string()
});

export function userRoutes(app: Express) {
  // POST /api/users - Create user
  app.post('/api/users', createEndpoint({
    method: 'post',
    path: '/api/users',
    schema: CreateUserSchema,
    handler: async (input) => {
      // Your business logic here
      const db = getDB();
      const user = await db.save(User, input);
      return user.id;
    }
  }));

  // GET /api/users/:id - Get user by ID
  app.get('/api/users/:id', createEndpoint({
    method: 'get',
    path: '/api/users/:id',
    handler: async (input, req) => {
      const userId = req.params.id;
      // Your business logic here
      const db = getDB();
      const user = await db.findOneBy(User, { id: userId });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }
  }));
}