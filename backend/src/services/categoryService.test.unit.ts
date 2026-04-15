import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { CategoryService } from './categoryService';
import { UserService } from './userService';
import { setupTestDb, getTestDB, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { seedCategory, seedUserCategoryOverride, seedAccount, seedUploadRecord, seedTransaction } from '@test/utils/seeds';
import User from '../entities/User';

// Redirect data-source imports to the testcontainer-backed database
vi.mock('../data-source');
vi.mock('resend');

describe('CategoryService', () => {
    let categoryService: CategoryService;
    let userService: UserService;
    let testUser: User;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        categoryService = new CategoryService();
        userService = new UserService();
        testUser = await userService.createUser('Test User', 'test@example.com', 'password123');
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    // ── createCategory ──────────────────────────────────────────────

    describe('createCategory', () => {
        it('should create a top-level category', async () => {
            const result = await categoryService.createCategory(
                { name: 'Housing' },
                testUser,
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('Housing');
            expect(result.parentId).toBeUndefined();
            expect(result.isDeprecated).toBe(false);
            expect(result.createdBy).toBe(testUser.id);
        });

        it('should create a child category under a parent', async () => {
            const parent = await seedCategory({ name: 'Housing', createdBy: testUser });
            const result = await categoryService.createCategory(
                { name: 'Rent', parentId: parent.id },
                testUser,
            );

            expect(result.name).toBe('Rent');
            expect(result.parentId).toBe(parent.id);
        });

        it('should reject duplicate category names at the same level', async () => {
            await categoryService.createCategory({ name: 'Food' }, testUser);
            await expect(
                categoryService.createCategory({ name: 'Food' }, testUser),
            ).rejects.toThrow('A top-level category with this name already exists');
        });

        it('should allow same name under different parents', async () => {
            const parent1 = await seedCategory({ name: 'Housing', createdBy: testUser });
            const parent2 = await seedCategory({ name: 'Shopping', createdBy: testUser });
            await categoryService.createCategory({ name: 'Insurance', parentId: parent1.id }, testUser);
            const result = await categoryService.createCategory({ name: 'Insurance', parentId: parent2.id }, testUser);
            expect(result.name).toBe('Insurance');
        });

        it('should reject duplicate names under the same parent', async () => {
            const parent = await seedCategory({ name: 'Housing', createdBy: testUser });
            await categoryService.createCategory({ name: 'Rent', parentId: parent.id }, testUser);
            await expect(
                categoryService.createCategory({ name: 'Rent', parentId: parent.id }, testUser),
            ).rejects.toThrow('A sibling category with this name already exists under the same parent');
        });

        it('should reject creating a child under a child (three-level hierarchy)', async () => {
            const parent = await seedCategory({ name: 'Housing', createdBy: testUser });
            const child = await seedCategory({ name: 'Rent', parent, createdBy: testUser });

            await expect(
                categoryService.createCategory(
                    { name: 'WeWork', parentId: child.id },
                    testUser,
                ),
            ).rejects.toThrow('two-level hierarchy');
        });

        it('should reject creating a category with a nonexistent parent', async () => {
            await expect(
                categoryService.createCategory(
                    { name: 'Orphan', parentId: '00000000-0000-0000-0000-000000000000' },
                    testUser,
                ),
            ).rejects.toThrow('Parent category not found');
        });

        it('should store a default description', async () => {
            const result = await categoryService.createCategory(
                { name: 'Groceries', defaultDescription: 'Weekly grocery shopping' },
                testUser,
            );

            expect(result.defaultDescription).toBe('Weekly grocery shopping');
        });
    });

    // ── getCategories ───────────────────────────────────────────────

    describe('getCategories', () => {
        it('should return an empty array when no categories exist', async () => {
            const result = await categoryService.getCategories();
            expect(result).toEqual([]);
        });

        it('should return top-level categories with nested children', async () => {
            const parent = await seedCategory({ name: 'Housing', createdBy: testUser });
            await seedCategory({ name: 'Rent', parent, createdBy: testUser });
            await seedCategory({ name: 'Mortgage', parent, createdBy: testUser });

            const result = await categoryService.getCategories();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Housing');
            expect(result[0].children).toHaveLength(2);
            expect(result[0].children!.map(c => c.name)).toEqual(
                expect.arrayContaining(['Rent', 'Mortgage']),
            );
        });

        it('should exclude deprecated categories by default', async () => {
            await seedCategory({ name: 'Active', createdBy: testUser });
            await seedCategory({ name: 'Deprecated', createdBy: testUser, isDeprecated: true });

            const result = await categoryService.getCategories(false);
            expect(result.map(c => c.name)).not.toContain('Deprecated');
        });

        it('should include deprecated categories when requested', async () => {
            await seedCategory({ name: 'Active', createdBy: testUser });
            await seedCategory({ name: 'Deprecated', createdBy: testUser, isDeprecated: true });

            const result = await categoryService.getCategories(true);
            expect(result.map(c => c.name)).toContain('Deprecated');
        });
    });

    // ── getCategoryById ─────────────────────────────────────────────

    describe('getCategoryById', () => {
        it('should return the category with parent info', async () => {
            const parent = await seedCategory({ name: 'Food', createdBy: testUser });
            const child = await seedCategory({ name: 'Groceries', parent, createdBy: testUser });

            const result = await categoryService.getCategoryById(child.id);
            expect(result).not.toBeNull();
            expect(result!.name).toBe('Groceries');
            expect(result!.parentId).toBe(parent.id);
        });

        it('should return null for nonexistent ID', async () => {
            const result = await categoryService.getCategoryById('00000000-0000-0000-0000-000000000000');
            expect(result).toBeNull();
        });
    });

    // ── updateCategory ──────────────────────────────────────────────

    describe('updateCategory', () => {
        it('should update default description', async () => {
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            const result = await categoryService.updateCategory(cat.id, {
                defaultDescription: 'All food purchases',
            });

            expect(result.defaultDescription).toBe('All food purchases');
        });

        it('should update name', async () => {
            const cat = await seedCategory({ name: 'Foood', createdBy: testUser });
            const result = await categoryService.updateCategory(cat.id, { name: 'Food' });
            expect(result.name).toBe('Food');
        });

        it('should reject update to an existing name at same level', async () => {
            await seedCategory({ name: 'Food', createdBy: testUser });
            const cat2 = await seedCategory({ name: 'Drinks', createdBy: testUser });

            await expect(
                categoryService.updateCategory(cat2.id, { name: 'Food' }),
            ).rejects.toThrow('A top-level category with this name already exists');
        });

        it('should deprecate a category', async () => {
            const cat = await seedCategory({ name: 'Obsolete', createdBy: testUser });
            const result = await categoryService.updateCategory(cat.id, { isDeprecated: true });
            expect(result.isDeprecated).toBe(true);
        });

        it('should throw for nonexistent category', async () => {
            await expect(
                categoryService.updateCategory('00000000-0000-0000-0000-000000000000', { name: 'X' }),
            ).rejects.toThrow('Category not found');
        });
    });

    // ── deleteCategory ──────────────────────────────────────────────

    describe('deleteCategory', () => {
        it('should delete a category with no children or transactions', async () => {
            const cat = await seedCategory({ name: 'Temp', createdBy: testUser });
            await categoryService.deleteCategory(cat.id);

            const result = await categoryService.getCategoryById(cat.id);
            expect(result).toBeNull();
        });

        it('should reject deleting a parent with children', async () => {
            const parent = await seedCategory({ name: 'Housing', createdBy: testUser });
            await seedCategory({ name: 'Rent', parent, createdBy: testUser });

            await expect(categoryService.deleteCategory(parent.id)).rejects.toThrow(
                'Cannot delete a parent category that has children',
            );
        });

        it('should reject deleting a category referenced by transactions', async () => {
            const cat = await seedCategory({ name: 'Groceries', createdBy: testUser });
            const account = await seedAccount('Checking', testUser);
            const upload = await seedUploadRecord(testUser);
            await seedTransaction({
                account,
                upload,
                amount: 50,
                date: '2025-01-15',
                category: cat,
            });

            await expect(categoryService.deleteCategory(cat.id)).rejects.toThrow(
                'Cannot delete a category that has transactions referencing it',
            );
        });

        it('should throw for nonexistent category', async () => {
            await expect(
                categoryService.deleteCategory('00000000-0000-0000-0000-000000000000'),
            ).rejects.toThrow('Category not found');
        });
    });

    // ── searchCategories ────────────────────────────────────────────

    describe('searchCategories', () => {
        it('should find categories by partial name match', async () => {
            const parent = await seedCategory({ name: 'Food & Drink', createdBy: testUser });
            await seedCategory({ name: 'Groceries', parent, createdBy: testUser });
            await seedCategory({ name: 'Restaurants', parent, createdBy: testUser });

            const results = await categoryService.searchCategories('groc');
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Groceries');
        });

        it('should exclude deprecated categories', async () => {
            const parent = await seedCategory({ name: 'Food', createdBy: testUser });
            await seedCategory({ name: 'Old Food', parent, createdBy: testUser, isDeprecated: true });

            const results = await categoryService.searchCategories('food');
            // 'Food' parent has a non-deprecated child, so it shows; 'Old Food' is deprecated
            const names = results.map(r => r.name);
            expect(names).not.toContain('Old Food');
        });

        it('should exclude parent categories with no children', async () => {
            await seedCategory({ name: 'Empty Parent', createdBy: testUser });

            const results = await categoryService.searchCategories('empty');
            expect(results).toHaveLength(0);
        });
    });

    // ── User Category Overrides ─────────────────────────────────────

    describe('setUserOverride', () => {
        it('should create a new override', async () => {
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            const result = await categoryService.setUserOverride(testUser.id, cat.id, {
                customDescription: 'My food spending',
            });

            expect(result).not.toBeNull();
            expect(result!.customDescription).toBe('My food spending');
        });

        it('should update an existing override', async () => {
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            await categoryService.setUserOverride(testUser.id, cat.id, {
                customDescription: 'First',
            });
            const result = await categoryService.setUserOverride(testUser.id, cat.id, {
                customDescription: 'Updated',
            });

            expect(result!.customDescription).toBe('Updated');
        });

        it('should remove override when null is passed', async () => {
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            await categoryService.setUserOverride(testUser.id, cat.id, {
                customDescription: 'Custom',
            });
            const result = await categoryService.setUserOverride(testUser.id, cat.id, {
                customDescription: null,
            });

            expect(result).toBeNull();
        });

        it('should throw for nonexistent category', async () => {
            await expect(
                categoryService.setUserOverride(testUser.id, '00000000-0000-0000-0000-000000000000', {
                    customDescription: 'X',
                }),
            ).rejects.toThrow('Category not found');
        });
    });

    describe('getUserOverride', () => {
        it('should return null when no override exists', async () => {
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            const result = await categoryService.getUserOverride(testUser.id, cat.id);
            expect(result).toBeNull();
        });

        it('should return the override when it exists', async () => {
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            await seedUserCategoryOverride(testUser, cat, 'My override');

            const result = await categoryService.getUserOverride(testUser.id, cat.id);
            expect(result).not.toBeNull();
            expect(result!.customDescription).toBe('My override');
        });
    });

    describe('getUserOverrides', () => {
        it('should return all overrides for a user', async () => {
            const cat1 = await seedCategory({ name: 'Food', createdBy: testUser });
            const cat2 = await seedCategory({ name: 'Transport', createdBy: testUser });
            await seedUserCategoryOverride(testUser, cat1, 'Food desc');
            await seedUserCategoryOverride(testUser, cat2, 'Transport desc');

            const results = await categoryService.getUserOverrides(testUser.id);
            expect(results).toHaveLength(2);
        });

        it('should not return overrides for another user', async () => {
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
            const cat = await seedCategory({ name: 'Food', createdBy: testUser });
            await seedUserCategoryOverride(otherUser, cat, 'Other desc');

            const results = await categoryService.getUserOverrides(testUser.id);
            expect(results).toHaveLength(0);
        });
    });

    // ── seedDefaultTaxonomy ─────────────────────────────────────────

    describe('seedDefaultTaxonomy', () => {
        it('should create all default categories on first run', async () => {
            const result = await categoryService.seedDefaultTaxonomy(testUser);

            expect(result.created).toBeGreaterThan(0);
            expect(result.skipped).toBe(0);

            // Should have created parent + child categories
            const categories = await categoryService.getCategories();
            expect(categories.length).toBeGreaterThan(0);

            // Every parent should have children
            for (const cat of categories) {
                expect(cat.children!.length).toBeGreaterThan(0);
            }
        });

        it('should skip existing categories on second run', async () => {
            const first = await categoryService.seedDefaultTaxonomy(testUser);
            const second = await categoryService.seedDefaultTaxonomy(testUser);

            expect(second.created).toBe(0);
            expect(second.skipped).toBe(first.created);
        });

        it('should create only missing categories', async () => {
            // Pre-create one parent
            await seedCategory({ name: 'Housing', createdBy: testUser });

            const result = await categoryService.seedDefaultTaxonomy(testUser);

            // Housing parent was skipped, but its children + all other categories were created
            expect(result.skipped).toBe(1);
            expect(result.created).toBeGreaterThan(0);
        });
    });
});
