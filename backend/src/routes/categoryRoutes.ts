import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type {
    Category,
    CategoryWithChildren,
    GetCategoriesResponse,
    DeleteCategoryResponse,
    SeedTaxonomyResponse,
    UserCategoryOverride,
} from 'shared';
import { ApiError, Role } from 'shared';
import { CategoryService } from '../services/categoryService';

const CreateCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(100),
    parentId: z.string().uuid().optional(),
    defaultDescription: z.string().max(500).optional(),
});

const UpdateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    defaultDescription: z.string().max(500).optional(),
    isDeprecated: z.boolean().optional(),
});

const SearchCategoriesSchema = z.object({
    query: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const GetCategoriesSchema = z.object({
    includeDeprecated: z.preprocess(
        (v) => v === 'true' || v === true,
        z.boolean().default(false),
    ),
});

const SetOverrideSchema = z.object({
    customDescription: z.string().max(500).nullable(),
});

const categoryService = new CategoryService();

export function categoryRoutes(app: Express) {
    // GET /api/categories — Get category hierarchy
    app.get(
        '/api/categories',
        requireAuth(),
        createEndpoint<z.infer<typeof GetCategoriesSchema>, GetCategoriesResponse, AuthenticatedRequest>({
            inputSource: 'query',
            schema: GetCategoriesSchema,
            handler: async (input): Promise<GetCategoriesResponse> => {
                const categories = await categoryService.getCategories(input.includeDeprecated);
                return { categories };
            },
        })
    );

    // GET /api/categories/search?query=...&limit=20 — Search categories
    app.get(
        '/api/categories/search',
        requireAuth(),
        createEndpoint<z.infer<typeof SearchCategoriesSchema>, Category[], AuthenticatedRequest>({
            inputSource: 'query',
            schema: SearchCategoriesSchema,
            handler: async (input): Promise<Category[]> => {
                return categoryService.searchCategories(input.query, input.limit);
            },
        })
    );

    // GET /api/categories/:id — Get single category
    app.get(
        '/api/categories/:id',
        requireAuth(),
        createEndpoint<unknown, Category, AuthenticatedRequest>({
            inputSource: 'query',
            handler: async (_input, req): Promise<Category> => {
                const category = await categoryService.getCategoryById(req.params.id);
                if (!category) {
                    throw new ApiError('Category not found', 404);
                }
                return category;
            },
        })
    );

    // POST /api/categories — Create a new category
    app.post(
        '/api/categories',
        requireAuth(),
        createEndpoint<z.infer<typeof CreateCategorySchema>, Category, AuthenticatedRequest>({
            schema: CreateCategorySchema,
            handler: async (input, req): Promise<Category> => {
                return categoryService.createCategory(input, req.user);
            },
        })
    );

    // PUT /api/categories/:id — Update a category (admin only)
    app.put(
        '/api/categories/:id',
        requireAuth(Role.ADMIN),
        createEndpoint<z.infer<typeof UpdateCategorySchema>, Category, AuthenticatedRequest>({
            schema: UpdateCategorySchema,
            handler: async (input, req): Promise<Category> => {
                return categoryService.updateCategory(req.params.id, input);
            },
        })
    );

    // DELETE /api/categories/:id — Delete a category (admin only)
    app.delete(
        '/api/categories/:id',
        requireAuth(Role.ADMIN),
        createEndpoint<unknown, DeleteCategoryResponse, AuthenticatedRequest>({
            handler: async (_input, req): Promise<DeleteCategoryResponse> => {
                await categoryService.deleteCategory(req.params.id);
                return { deleted: true };
            },
        })
    );

    // ── Admin Actions ─────────────────────────────────────────────────

    // POST /api/categories/seed — Seed default taxonomy (admin only)
    app.post(
        '/api/categories/seed',
        requireAuth(Role.ADMIN),
        createEndpoint<unknown, SeedTaxonomyResponse, AuthenticatedRequest>({
            handler: async (_input, req): Promise<SeedTaxonomyResponse> => {
                return categoryService.seedDefaultTaxonomy(req.user);
            },
        })
    );

    // ── User Category Overrides ─────────────────────────────────────

    // PUT /api/categories/:id/override — Set or clear custom description
    app.put(
        '/api/categories/:id/override',
        requireAuth(),
        createEndpoint<z.infer<typeof SetOverrideSchema>, { override: UserCategoryOverride | null }, AuthenticatedRequest>({
            schema: SetOverrideSchema,
            handler: async (input, req): Promise<{ override: UserCategoryOverride | null }> => {
                const override = await categoryService.setUserOverride(
                    req.user.id,
                    req.params.id,
                    { customDescription: input.customDescription },
                );
                return { override };
            },
        })
    );

    // GET /api/categories/:id/override — Get the user's override for a category
    app.get(
        '/api/categories/:id/override',
        requireAuth(),
        createEndpoint<unknown, { override: UserCategoryOverride | null }, AuthenticatedRequest>({
            inputSource: 'query',
            handler: async (_input, req): Promise<{ override: UserCategoryOverride | null }> => {
                const override = await categoryService.getUserOverride(
                    req.user.id,
                    req.params.id,
                );
                return { override };
            },
        })
    );
}
