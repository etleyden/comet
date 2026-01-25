import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { UserService } from '../services/userService';
import User from "../entities/User";
import { getDB } from '../data-source';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export function userRoutes(app: Express) {
  const userService = new UserService();

  // POST /api/users - Create user
  app.post('/api/auth/register', createEndpoint({
    schema: CreateUserSchema,
    handler: async (input, req, res) => {
      const user = await userService.createUser(input.name, input.email, input.password);
      const session = await userService.createSession(user);
      res.cookie('session', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      return { id: user.id, name: user.name, email: user.email, token: session.token };
    }
  }));

  // POST /api/auth/login - Login user
  app.post('/api/auth/login', createEndpoint({
    schema: UserLoginSchema,
    handler: async (input, req, res) => {
      const user = await userService.authenticateUser(input.email, input.password);
      const session = await userService.createSession(user);
      res.cookie('session', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      return { id: user.id, name: user.name, email: user.email, token: session.token };
    }
  }));

  // POST /api/auth/logout - Logout user
  app.post('/api/auth/logout', createEndpoint({
    handler: async (input, req, res) => {
      const sessionToken = req.cookies?.session;
      if (sessionToken) {
        const tokenParts = sessionToken.split('.');
        if (tokenParts.length === 2) {
          const sessionId = tokenParts[0];
          await userService.deleteSession(sessionId);
        }
      }
      res.clearCookie('session', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      return { success: true };
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