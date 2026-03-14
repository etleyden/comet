import { getTestDB, getTestDataSource } from '@test/utils/testDb';

export const getDB = () => getTestDB();

// Lazy proxy: getTestDataSource() is only called when a property is accessed
// during a test, not at mock setup time (before beforeAll has run).
export const AppDataSource = new Proxy({} as any, {
  get(_target, prop) {
    return (getTestDataSource() as any)[prop];
  },
});
