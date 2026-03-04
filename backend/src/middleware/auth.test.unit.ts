import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Role } from 'shared';

const mockValidateSessionToken = vi.fn();

vi.mock('../services/userService', () => ({
    // accepts this as an argument since UserService is a class
    UserService: vi.fn().mockImplementation(function (this: any) {
        this.validateSessionToken = mockValidateSessionToken;
    }),
}));

import { requireAuth } from './auth';
import Session from '../entities/Session';
import User from '../entities/User';

function createMocks(cookies?: Record<string, string>, authorization?: string) {
    const req = {
        cookies: cookies ?? {},
        headers: authorization ? { authorization } : {},
    } as unknown as Request;
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
}

function createMockUser(role: Role = Role.USER): User {
    const user = new User();
    user.id = 'user-id-1';
    user.name = 'Test User';
    user.email = 'test@example.com';
    user.role = role;
    return user;
}

function createMockSession(user: User): Session {
    const session = new Session();
    session.id = 'session-id-1';
    session.secretHash = 'hashvalue';
    session.user = user;
    return session;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('requireAuth', () => {
    describe('no token provided', () => {
        it('returns 401 when authentication is required (default)', async () => {
            const { req, res, next } = createMocks();

            await requireAuth()(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required' });
            expect(next).not.toHaveBeenCalled();
        });

        it('calls next() when authentication is optional', async () => {
            const { req, res, next } = createMocks();

            await requireAuth({ required: false })(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('token from cookie', () => {
        it('attaches user and session to request on valid cookie token', async () => {
            const user = createMockUser();
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const { req, res, next } = createMocks({ session: 'session-id-1.secret' });

            await requireAuth()(req, res, next);

            expect(mockValidateSessionToken).toHaveBeenCalledWith('session-id-1.secret');
            expect(req.user).toBe(user);
            expect(req.authSession).toEqual({ id: 'session-id-1', userId: 'user-id-1' });
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('token from Authorization header', () => {
        it('attaches user and session on valid Bearer token', async () => {
            const user = createMockUser();
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const { req, res, next } = createMocks(undefined, 'Bearer session-id-1.secret');

            await requireAuth()(req, res, next);

            expect(mockValidateSessionToken).toHaveBeenCalledWith('session-id-1.secret');
            expect(req.user).toBe(user);
            expect(next).toHaveBeenCalled();
        });

        it('prefers cookie token over Authorization header when both are present', async () => {
            const user = createMockUser();
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const req = {
                cookies: { session: 'cookie-token' },
                headers: { authorization: 'Bearer header-token' },
            } as unknown as Request;
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
            const next = vi.fn() as NextFunction;

            await requireAuth()(req, res, next);

            expect(mockValidateSessionToken).toHaveBeenCalledWith('cookie-token');
        });
    });

    describe('invalid or expired session', () => {
        it('returns 401 when session is null and authentication is required', async () => {
            mockValidateSessionToken.mockResolvedValue(null);

            const { req, res, next } = createMocks({ session: 'bad.token' });

            await requireAuth()(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid or expired session',
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('calls next() when session is null and authentication is optional', async () => {
            mockValidateSessionToken.mockResolvedValue(null);

            const { req, res, next } = createMocks({ session: 'bad.token' });

            await requireAuth({ required: false })(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('returns 401 when session has no user and authentication is required', async () => {
            mockValidateSessionToken.mockResolvedValue({ id: 'session-id-1', user: null });

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth()(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid or expired session',
            });
        });
    });

    describe('role-based access control', () => {
        it('returns 403 when user does not meet the required role', async () => {
            const user = createMockUser(Role.USER);
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth(Role.ADMIN)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Insufficient permissions',
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('calls next() when user meets the required role', async () => {
            const user = createMockUser(Role.ADMIN);
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth(Role.ADMIN)(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('accepts a role passed as a string shorthand', async () => {
            const user = createMockUser(Role.USER);
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth(Role.ADMIN)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('accepts a role via the options object', async () => {
            const user = createMockUser(Role.ADMIN);
            const session = createMockSession(user);
            mockValidateSessionToken.mockResolvedValue(session);

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth({ role: Role.ADMIN })(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('returns 401 when validateSessionToken throws and authentication is required', async () => {
            mockValidateSessionToken.mockRejectedValue(new Error('DB connection error'));

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth()(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication failed',
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('calls next() when validateSessionToken throws and authentication is optional', async () => {
            mockValidateSessionToken.mockRejectedValue(new Error('DB connection error'));

            const { req, res, next } = createMocks({ session: 'valid.token' });

            await requireAuth({ required: false })(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});
