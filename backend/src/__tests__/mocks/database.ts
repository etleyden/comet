import { vi } from 'vitest';

/**
 * Creates a mock EntityManager that mimics the TypeORM manager API.
 * Use this for unit tests where you want to isolate from the database.
 */
export function createMockEntityManager() {
    return {
        save: vi.fn(),
        findOneBy: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn(),
        delete: vi.fn(),
        createQueryBuilder: vi.fn(() => createMockQueryBuilder()),
    };
}

/**
 * Creates a mock QueryBuilder for chaining query operations.
 */
export function createMockQueryBuilder() {
    const qb: Record<string, any> = {};

    const chainMethods = [
        'select', 'addSelect', 'where', 'andWhere', 'orWhere',
        'innerJoin', 'leftJoin', 'innerJoinAndSelect', 'leftJoinAndSelect',
        'relation', 'of', 'add', 'remove', 'orderBy', 'skip', 'take',
    ];

    for (const method of chainMethods) {
        qb[method] = vi.fn().mockReturnValue(qb);
    }

    qb.getOne = vi.fn();
    qb.getMany = vi.fn();
    qb.execute = vi.fn();
    qb.getCount = vi.fn();

    return qb;
}
