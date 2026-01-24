import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { UserService } from '../services/userService';
import User from "../entities/User";
import { getDB } from '../data-source';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const UserLoginSchema = z.object({
  email: z.string().email()
})

export function userRoutes(app: Express) {
  const userService = new UserService();

  // POST /api/users - Create user
  app.post('/api/users', createEndpoint({
    schema: CreateUserSchema,
    handler: async (input) => {
      const db = getDB();
      const user = await db.save(User, input);
      const token = await userService.createSession(user);
      return user.id;
    }
  }));

  // GET /api/users - List all users
  app.get('/api/users', createEndpoint({
    handler: async () => {
      const users = await userService.listUsers();
      return users;
    }
  }));

  // GET /api/users/test - MUST come before /:id route
  app.post('/api/users/login', createEndpoint({
    schema: UserLoginSchema,
    handler: async (input, req, res) => {
      const session = await userService.createSession();
      res.cookie('session', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      return session.token;
    }
  }));

  // GET /api/users/:id - Get user by ID
  app.get('/api/users/:id', createEndpoint({
    inputSource: 'query',
    handler: async (input, req) => {
      const userId = req.params.id;
      const db = getDB();
      const user = await db.findOneBy(User, { id: userId });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }
  }));


}
/**
 * TODO: Consider CSRF protection for state-changing operations.
 * Referenced from: https://lucia-auth.com/sessions/basic
 * function verifyRequestOrigin(method: string, originHeader: string): boolean {
 * 	if (method === "GET" || method === "HEAD") {
 * 		return true;
 * 	}
 * 	return originHeader === "example.com";
 * }
 * 
 * // Enable strict origin check only on production environments.
 * function verifyRequestOrigin(method: string, originHeader: string): boolean {
 * 	if (env !== ENV.PROD) {
 * 		return true;
 * 	}
 * 	if (method === "GET" || method === "HEAD") {
 * 		return true;
 * 	}
 * 	return originHeader === "example.com";
 * }
 */