import { Role } from './types';

/**
 * Ordered role hierarchy — higher index means more privileged.
 * Used for role comparison / "meets or exceeds" checks.
 */
export const ROLE_HIERARCHY: Role[] = [Role.USER, Role.ADMIN];

/**
 * Returns true when `userRole` meets or exceeds the `requiredRole` in the
 * hierarchy.
 *
 * @example
 * meetsRoleRequirement(Role.ADMIN, Role.USER)  // true
 * meetsRoleRequirement(Role.USER, Role.ADMIN)  // false
 * meetsRoleRequirement(Role.USER, Role.USER)   // true
 */
export function meetsRoleRequirement(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}
