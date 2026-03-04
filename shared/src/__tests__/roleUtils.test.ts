import { describe, it, expect } from 'vitest';
import { Role } from '../types';
import { ROLE_HIERARCHY, meetsRoleRequirement } from '../roleUtils';

describe('ROLE_HIERARCHY', () => {
  it('should list USER before ADMIN', () => {
    expect(ROLE_HIERARCHY.indexOf(Role.USER)).toBeLessThan(ROLE_HIERARCHY.indexOf(Role.ADMIN));
  });

  it('should contain all defined roles', () => {
    const allRoles = Object.values(Role) as Role[];
    for (const role of allRoles) {
      expect(ROLE_HIERARCHY).toContain(role);
    }
  });
});

describe('meetsRoleRequirement', () => {
  it('USER meets USER requirement', () => {
    expect(meetsRoleRequirement(Role.USER, Role.USER)).toBe(true);
  });

  it('ADMIN meets USER requirement', () => {
    expect(meetsRoleRequirement(Role.ADMIN, Role.USER)).toBe(true);
  });

  it('ADMIN meets ADMIN requirement', () => {
    expect(meetsRoleRequirement(Role.ADMIN, Role.ADMIN)).toBe(true);
  });

  it('USER does not meet ADMIN requirement', () => {
    expect(meetsRoleRequirement(Role.USER, Role.ADMIN)).toBe(false);
  });
});
