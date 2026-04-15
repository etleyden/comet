import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { setupTestDb, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { seedCategory } from '@test/utils/seeds';
import { UserService } from '../services/userService';
import { Role } from 'shared';

// Redirect ALL data-source imports (routes, middleware, services) to the test DB
vi.mock('../data-source');
vi.mock('resend');

describe('Category Routes (Integration)', () => {
    const app = createTestApp();
    let sessionToken: string;
    let adminSessionToken: string;
    let userId: string;
    let adminUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        const userService = new UserService();

        // Create regular user
        const user = await userService.createUser('Test User', 'test@example.com', 'password123');
        userId = user.id;
        const session = await userService.createSession(user);
        sessionToken = session.token;

        // Create admin user
        const admin = await userService.createUser('Admin User', 'admin@example.com', 'password123');
        adminUserId = admin.id;
        // Promote to admin
        const { getTestDB } = await import('@test/utils/testDb');
        const db = getTestDB();
        await db.query('UPDATE "user" SET role = $1 WHERE id = $2', [Role.ADMIN, admin.id]);
        const adminSession = await userService.createSession(admin);
        adminSessionToken = adminSession.token;
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    // ── POST /api/categories ────────────────────────────────────────

    describe('POST /api/categories', () => {
        it('should return 401 when not authenticated', async () => {
            const res = await request(app)
                .post('/api/categories')
                .send({ name: 'Food' })
                .expect(401);

            expect(res.body.success).toBe(false);
        });

        it('should return 400 with missing name', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({})
                .expect(400);

            expect(res.body.success).toBe(false);
        });

        it('should create a top-level category', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Housing', defaultDescription: 'Housing expenses' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('Housing');
            expect(res.body.data.defaultDescription).toBe('Housing expenses');
            expect(res.body.data.id).toBeDefined();
        });

        it('should create a child category', async () => {
            // First create parent using seed (need the user entity)
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const parent = await seedCategory({ name: 'Housing', createdBy: user });

            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Rent', parentId: parent.id })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('Rent');
            expect(res.body.data.parentId).toBe(parent.id);
        });

        it('should reject duplicate names at the root level', async () => {
            await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Food' })
                .expect(200);

            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Food' })
                .expect(409);

            expect(res.body.success).toBe(false);
        });

        it('should allow same name under different parents', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const parent1 = await seedCategory({ name: 'Housing', createdBy: user });
            const parent2 = await seedCategory({ name: 'Shopping', createdBy: user });

            await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Insurance', parentId: parent1.id })
                .expect(200);

            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Insurance', parentId: parent2.id })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('Insurance');
        });

        it('should reject same name under the same parent', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const parent = await seedCategory({ name: 'Housing', createdBy: user });

            await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Insurance', parentId: parent.id })
                .expect(200);

            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'Insurance', parentId: parent.id })
                .expect(409);

            expect(res.body.success).toBe(false);
        });

        it('should reject three-level hierarchy', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const parent = await seedCategory({ name: 'Housing', createdBy: user });
            const child = await seedCategory({ name: 'Rent', parent, createdBy: user });

            const res = await request(app)
                .post('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .send({ name: 'WeWork', parentId: child.id })
                .expect(400);

            expect(res.body.success).toBe(false);
        });
    });

    // ── GET /api/categories ─────────────────────────────────────────

    describe('GET /api/categories', () => {
        it('should return 401 when not authenticated', async () => {
            await request(app).get('/api/categories').expect(401);
        });

        it('should return category hierarchy', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const parent = await seedCategory({ name: 'Food', createdBy: user });
            await seedCategory({ name: 'Groceries', parent, createdBy: user });
            await seedCategory({ name: 'Restaurants', parent, createdBy: user });

            const res = await request(app)
                .get('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.categories).toHaveLength(1);
            expect(res.body.data.categories[0].name).toBe('Food');
            expect(res.body.data.categories[0].children).toHaveLength(2);
        });

        it('should exclude deprecated categories by default', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            await seedCategory({ name: 'Active', createdBy: user });
            await seedCategory({ name: 'Deprecated', createdBy: user, isDeprecated: true });

            const res = await request(app)
                .get('/api/categories')
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            const names = res.body.data.categories.map((c: any) => c.name);
            expect(names).toContain('Active');
            expect(names).not.toContain('Deprecated');
        });
    });

    // ── GET /api/categories/:id ─────────────────────────────────────

    describe('GET /api/categories/:id', () => {
        it('should return a single category', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'Food', createdBy: user });

            const res = await request(app)
                .get(`/api/categories/${cat.id}`)
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('Food');
        });

        it('should return 404 for nonexistent category', async () => {
            const res = await request(app)
                .get('/api/categories/00000000-0000-0000-0000-000000000000')
                .set('Cookie', `session=${sessionToken}`)
                .expect(404);

            expect(res.body.success).toBe(false);
        });
    });

    // ── PUT /api/categories/:id ─────────────────────────────────────

    describe('PUT /api/categories/:id', () => {
        it('should return 403 for non-admin users', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'Food', createdBy: user });

            const res = await request(app)
                .put(`/api/categories/${cat.id}`)
                .set('Cookie', `session=${sessionToken}`)
                .send({ defaultDescription: 'Updated' })
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('should allow admin to update a category', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const admin = await db.findOneByOrFail(User, { id: adminUserId });
            const cat = await seedCategory({ name: 'Food', createdBy: admin });

            const res = await request(app)
                .put(`/api/categories/${cat.id}`)
                .set('Cookie', `session=${adminSessionToken}`)
                .send({ defaultDescription: 'All food-related' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.defaultDescription).toBe('All food-related');
        });
    });

    // ── DELETE /api/categories/:id ──────────────────────────────────

    describe('DELETE /api/categories/:id', () => {
        it('should return 403 for non-admin users', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'ToDelete', createdBy: user });

            await request(app)
                .delete(`/api/categories/${cat.id}`)
                .set('Cookie', `session=${sessionToken}`)
                .expect(403);
        });

        it('should allow admin to delete a category', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const admin = await db.findOneByOrFail(User, { id: adminUserId });
            const cat = await seedCategory({ name: 'ToDelete', createdBy: admin });

            const res = await request(app)
                .delete(`/api/categories/${cat.id}`)
                .set('Cookie', `session=${adminSessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.deleted).toBe(true);
        });
    });

    // ── POST /api/categories/seed ──────────────────────────────────

    describe('POST /api/categories/seed', () => {
        it('should return 403 for non-admin users', async () => {
            await request(app)
                .post('/api/categories/seed')
                .set('Cookie', `session=${sessionToken}`)
                .expect(403);
        });

        it('should seed default taxonomy for admin', async () => {
            const res = await request(app)
                .post('/api/categories/seed')
                .set('Cookie', `session=${adminSessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.created).toBeGreaterThan(0);
            expect(res.body.data.skipped).toBe(0);
        });

        it('should skip existing categories on second seed', async () => {
            await request(app)
                .post('/api/categories/seed')
                .set('Cookie', `session=${adminSessionToken}`)
                .expect(200);

            const res = await request(app)
                .post('/api/categories/seed')
                .set('Cookie', `session=${adminSessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.created).toBe(0);
            expect(res.body.data.skipped).toBeGreaterThan(0);
        });
    });

    // ── Category Overrides ──────────────────────────────────────────

    describe('PUT /api/categories/:id/override', () => {
        it('should set a custom description', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'Food', createdBy: user });

            const res = await request(app)
                .put(`/api/categories/${cat.id}/override`)
                .set('Cookie', `session=${sessionToken}`)
                .send({ customDescription: 'My food budget' })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.override.customDescription).toBe('My food budget');
        });

        it('should clear override with null', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'Food', createdBy: user });

            // Set then clear
            await request(app)
                .put(`/api/categories/${cat.id}/override`)
                .set('Cookie', `session=${sessionToken}`)
                .send({ customDescription: 'Custom' });

            const res = await request(app)
                .put(`/api/categories/${cat.id}/override`)
                .set('Cookie', `session=${sessionToken}`)
                .send({ customDescription: null })
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.override).toBeNull();
        });
    });

    describe('GET /api/categories/:id/override', () => {
        it('should return null when no override exists', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'Food', createdBy: user });

            const res = await request(app)
                .get(`/api/categories/${cat.id}/override`)
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.override).toBeNull();
        });

        it('should return the override when it exists', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const cat = await seedCategory({ name: 'Food', createdBy: user });

            await request(app)
                .put(`/api/categories/${cat.id}/override`)
                .set('Cookie', `session=${sessionToken}`)
                .send({ customDescription: 'My desc' });

            const res = await request(app)
                .get(`/api/categories/${cat.id}/override`)
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.override.customDescription).toBe('My desc');
        });
    });

    // ── GET /api/categories/search ──────────────────────────────────

    describe('GET /api/categories/search', () => {
        it('should find categories by partial name', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            const parent = await seedCategory({ name: 'Food', createdBy: user });
            await seedCategory({ name: 'Groceries', parent, createdBy: user });

            const res = await request(app)
                .get('/api/categories/search?query=groc')
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe('Groceries');
        });

        it('should exclude parent-only categories from search', async () => {
            const { getTestDB } = await import('@test/utils/testDb');
            const db = getTestDB();
            const User = (await import('../entities/User')).default;
            const user = await db.findOneByOrFail(User, { id: userId });
            await seedCategory({ name: 'Empty Parent', createdBy: user });

            const res = await request(app)
                .get('/api/categories/search?query=empty')
                .set('Cookie', `session=${sessionToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(0);
        });
    });
});
