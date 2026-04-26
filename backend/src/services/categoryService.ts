import { getDB } from '../data-source';
import CategoryEntity from '../entities/Category';
import TransactionEntity from '../entities/Transaction';
import UserCategoryOverride from '../entities/UserCategoryOverride';
import User from '../entities/User';
import { DEFAULT_TAXONOMY } from './defaultTaxonomy';
import type {
    Category,
    CategoryWithChildren,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    SetCategoryOverrideRequest,
    UserCategoryOverride as UserCategoryOverrideDTO,
    SeedTaxonomyResponse,
} from 'shared';
import { ApiError } from 'shared';

export class CategoryService {
    private toCategory(entity: CategoryEntity): Category {
        return {
            id: entity.id,
            name: entity.name,
            parentId: entity.parent?.id,
            parentName: entity.parent?.name,
            defaultDescription: entity.defaultDescription,
            isDeprecated: entity.isDeprecated,
            createdBy: entity.createdBy?.id,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }

    private toOverride(entity: UserCategoryOverride): UserCategoryOverrideDTO {
        return {
            id: entity.id,
            userId: typeof entity.user === 'object' ? entity.user.id : (entity as any).userId,
            categoryId: typeof entity.category === 'object' ? entity.category.id : (entity as any).categoryId,
            customDescription: entity.customDescription,
        };
    }

    /**
     * Returns top-level categories with their children nested under each parent.
     * When `includeDeprecated` is false, deprecated categories are excluded from
     * both the top-level results and the nested children.
     * Will not return user overrides for descriptions. Must call
     * getUserOverrides separately and merge on client if needed.
     */
    async getCategories(includeDeprecated = false): Promise<CategoryWithChildren[]> {
        const db = getDB();

        let qb = db
            .createQueryBuilder(CategoryEntity, 'category')
            .leftJoinAndSelect('category.parent', 'parent')
            .leftJoinAndSelect('category.children', 'children')
            .leftJoinAndSelect('category.createdBy', 'createdBy');

        if (!includeDeprecated) {
            qb = qb.andWhere('category.isDeprecated = false');
        }

        const categories = await qb
            .orderBy('category.name', 'ASC')
            .getMany();

        // Return top-level categories with children nested
        const topLevel = categories.filter(c => !c.parent);
        return topLevel.map(c => ({
            ...this.toCategory(c),
            children: (c.children ?? [])
                .filter(child => includeDeprecated || !child.isDeprecated)
                .map(child => this.toCategory(child)),
        }));
    }

    /**
     * Returns a single category by ID.
     */
    async getCategoryById(id: string): Promise<Category | null> {
        const db = getDB();

        const category = await db.findOne(CategoryEntity, {
            where: { id },
            relations: ['parent', 'createdBy'],
        });

        return category ? this.toCategory(category) : null;
    }

    /**
     * Creates a new category. Enforces two-level hierarchy constraint.
     */
    async createCategory(input: CreateCategoryRequest, user: User): Promise<Category> {
        const db = getDB();

        const category = new CategoryEntity();
        category.name = input.name;
        category.defaultDescription = input.defaultDescription;
        category.createdBy = user;

        if (input.parentId) {
            const parent = await db.findOne(CategoryEntity, {
                where: { id: input.parentId },
                relations: ['parent'],
            });
            if (!parent) {
                throw new ApiError('Parent category not found', 404);
            }
            // Two-level hierarchy: parent cannot itself have a parent
            if (parent.parent) {
                throw new ApiError('Categories only support a two-level hierarchy. The specified parent is already a child category.', 400);
            }
            category.parent = parent;
        }

        // Check sibling uniqueness: names must be unique among categories sharing the same parent
        await this.checkSiblingNameUniqueness(db, category.name, category.parent?.id ?? null);

        const saved = await db.save(CategoryEntity, category);
        // Reload with relations
        const reloaded = await db.findOne(CategoryEntity, {
            where: { id: saved.id },
            relations: ['parent', 'createdBy'],
        });
        return this.toCategory(reloaded!);
    }

    /**
     * Updates a category. Only admins should call this (enforced at route level).
     */
    async updateCategory(id: string, input: UpdateCategoryRequest): Promise<Category> {
        const db = getDB();

        const category = await db.findOne(CategoryEntity, {
            where: { id },
            relations: ['parent', 'createdBy'],
        });
        if (!category) {
            throw new ApiError('Category not found', 404);
        }

        if (input.name !== undefined) {
            // Check sibling uniqueness for new name
            await this.checkSiblingNameUniqueness(db, input.name, category.parent?.id ?? null, id);
            category.name = input.name;
        }

        if (input.defaultDescription !== undefined) {
            category.defaultDescription = input.defaultDescription;
        }

        if (input.isDeprecated !== undefined) {
            category.isDeprecated = input.isDeprecated;
        }

        const saved = await db.save(CategoryEntity, category);
        return this.toCategory(saved);
    }

    /**
     * Deletes a category. Only permitted if no transactions reference it
     * and it has no children (for parent categories).
     */
    async deleteCategory(id: string): Promise<void> {
        const db = getDB();

        const category = await db.findOne(CategoryEntity, {
            where: { id },
            relations: ['children'],
        });
        if (!category) {
            throw new ApiError('Category not found', 404);
        }

        if (category.children && category.children.length > 0) {
            throw new ApiError('Cannot delete a parent category that has children', 400);
        }

        // Check for referencing transactions
        const txCount = await db
            .createQueryBuilder(TransactionEntity, 'tx')
            .where('tx.categoryId = :id', { id })
            .getCount();

        if (txCount > 0) {
            throw new ApiError('Cannot delete a category that has transactions referencing it', 400);
        }

        await db.remove(CategoryEntity, category);
    }

    /**
     * Searches categories by name. Excludes deprecated and parent-only categories
     * (parents with no children) from results.
     */
    async searchCategories(query: string, limit = 20): Promise<Category[]> {
        const db = getDB();

        // Get categories matching the name query
        const results = await db
            .createQueryBuilder(CategoryEntity, 'category')
            .leftJoinAndSelect('category.parent', 'parent')
            .leftJoinAndSelect('category.children', 'children')
            .leftJoinAndSelect('category.createdBy', 'createdBy')
            .where('category.isDeprecated = false')
            .andWhere('category.name ILIKE :query', { query: `%${query}%` })
            .orderBy('category.name', 'ASC')
            .take(limit)
            .getMany();

        // Exclude parent categories that have no children (spec: parent-only hide from search)
        return results
            .filter(c => {
                // If it's a parent (no parent of its own), it must have children to appear
                if (!c.parent && (!c.children || c.children.length === 0)) {
                    return false;
                }
                return true;
            })
            .map(c => this.toCategory(c));
    }

    // ── Helpers ─────────────────────────────────────────────────────

    /**
     * Checks that no sibling category (same parent) already owns the given name.
     * Throws 409 if a duplicate is found.
     */
    private async checkSiblingNameUniqueness(
        db: ReturnType<typeof getDB>,
        name: string,
        parentId: string | null,
        excludeId?: string,
    ): Promise<void> {
        const qb = db
            .createQueryBuilder(CategoryEntity, 'cat')
            .where('cat.name = :name', { name });

        if (parentId) {
            qb.andWhere('cat.parentId = :parentId', { parentId });
        } else {
            qb.andWhere('cat.parentId IS NULL');
        }

        if (excludeId) {
            qb.andWhere('cat.id != :excludeId', { excludeId });
        }

        const existing = await qb.getOne();
        if (existing) {
            throw new ApiError(
                parentId
                    ? 'A sibling category with this name already exists under the same parent'
                    : 'A top-level category with this name already exists',
                409,
            );
        }
    }

    /**
     * Seeds the default taxonomy. Creates categories only if they don't
     * already exist at the same position in the hierarchy (matched by
     * name + parent). Safe to call multiple times.
     */
    async seedDefaultTaxonomy(user: User): Promise<SeedTaxonomyResponse> {
        const db = getDB();
        let created = 0;
        let skipped = 0;

        for (const parentDef of DEFAULT_TAXONOMY) {
            // Check if parent already exists at root level
            let parentEntity = await db.findOne(CategoryEntity, {
                where: { name: parentDef.name, parent: undefined },
            });

            // TypeORM treats `parent: undefined` differently from a true IS NULL.
            // Use a query builder for an explicit IS NULL check.
            if (!parentEntity) {
                parentEntity = await db
                    .createQueryBuilder(CategoryEntity, 'cat')
                    .where('cat.name = :name', { name: parentDef.name })
                    .andWhere('cat.parentId IS NULL')
                    .getOne();
            }

            if (!parentEntity) {
                parentEntity = db.create(CategoryEntity, {
                    name: parentDef.name,
                    defaultDescription: parentDef.defaultDescription,
                    createdBy: user,
                });
                parentEntity = await db.save(CategoryEntity, parentEntity);
                created++;
            } else {
                skipped++;
            }

            for (const childDef of parentDef.children) {
                const existingChild = await db.findOne(CategoryEntity, {
                    where: { name: childDef.name, parent: { id: parentEntity.id } },
                });

                if (!existingChild) {
                    const child = db.create(CategoryEntity, {
                        name: childDef.name,
                        defaultDescription: childDef.defaultDescription,
                        parent: parentEntity,
                        createdBy: user,
                    });
                    await db.save(CategoryEntity, child);
                    created++;
                } else {
                    skipped++;
                }
            }
        }

        return { created, skipped };
    }

    // ── User Category Override Methods ──────────────────────────────

    /**
     * Sets or updates a user's custom description for a category.
     * Pass null to revert to the default description.
     */
    async setUserOverride(
        userId: string,
        categoryId: string,
        input: SetCategoryOverrideRequest,
    ): Promise<UserCategoryOverrideDTO | null> {
        const db = getDB();

        const category = await db.findOne(CategoryEntity, { where: { id: categoryId } });
        if (!category) {
            throw new ApiError('Category not found', 404);
        }

        // If customDescription is null, remove the override
        if (input.customDescription === null) {
            await db
                .createQueryBuilder()
                .delete()
                .from(UserCategoryOverride)
                .where('userId = :userId AND categoryId = :categoryId', { userId, categoryId })
                .execute();
            return null;
        }

        // Upsert override
        let override = await db.findOne(UserCategoryOverride, {
            where: { user: { id: userId }, category: { id: categoryId } },
        });

        if (override) {
            override.customDescription = input.customDescription;
        } else {
            override = new UserCategoryOverride();
            override.user = { id: userId } as User;
            override.category = { id: categoryId } as CategoryEntity;
            override.customDescription = input.customDescription;
        }

        const saved = await db.save(UserCategoryOverride, override);
        return this.toOverride(saved);
    }

    /**
     * Gets a user's custom override for a specific category.
     */
    async getUserOverride(userId: string, categoryId: string): Promise<UserCategoryOverrideDTO | null> {
        const db = getDB();
        const override = await db.findOne(UserCategoryOverride, {
            where: { user: { id: userId }, category: { id: categoryId } },
            relations: ['user', 'category'],
        });
        return override ? this.toOverride(override) : null;
    }

    /**
     * Gets all overrides for a user.
     */
    async getUserOverrides(userId: string): Promise<UserCategoryOverrideDTO[]> {
        const db = getDB();
        const overrides = await db.find(UserCategoryOverride, {
            where: { user: { id: userId } },
            relations: ['user', 'category'],
        });
        return overrides.map(o => this.toOverride(o));
    }
}
