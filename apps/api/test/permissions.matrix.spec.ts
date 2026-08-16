import 'dotenv/config';

import { describe, expect, it } from '@jest/globals';

import {
  Permission,
  ROLE_PERMISSIONS,
} from '../src/auth/permissions/permissions.js';
import { UserRole } from '../generated/prisma/enums.js';

/**
 * These assertions are hardcoded against the intended access policy, not
 * derived from ROLE_PERMISSIONS itself. A test that imports the map and
 * asserts it equals itself can never fail, even if someone silently drops
 * a permission a role is supposed to have. The point of this suite is to
 * catch that drift.
 */

describe('ROLE_PERMISSIONS matrix', () => {
  it('grants ADMIN every permission in the system', () => {
    const allPermissions = Object.values(Permission);

    expect([...ROLE_PERMISSIONS[UserRole.ADMIN]].sort()).toEqual(
      [...allPermissions].sort(),
    );
  });

  it('grants RECRUITER candidate CRUD but not document update, deletion, or verification requests', () => {
    const recruiterPermissions = ROLE_PERMISSIONS[UserRole.RECRUITER];

    expect(recruiterPermissions).toEqual(
      expect.arrayContaining([
        Permission.READ_CANDIDATE,
        Permission.CREATE_CANDIDATE,
        Permission.UPDATE_CANDIDATE,
        Permission.READ_DOCUMENT,
        Permission.CREATE_DOCUMENT,
        Permission.READ_VERIFICATION,
        Permission.READ_AI_EXTRACTION,
        Permission.CREATE_AI_EXTRACTION,
        Permission.CONFIRM_AI_EXTRACTION,
      ]),
    );

    expect(recruiterPermissions).not.toContain(Permission.UPDATE_DOCUMENT);
    expect(recruiterPermissions).not.toContain(Permission.DELETE_DOCUMENT);
    expect(recruiterPermissions).not.toContain(Permission.CREATE_VERIFICATION);
  });

  it('grants COMPLIANCE_MANAGER document and verification authority but not candidate writes or AI extraction access', () => {
    const complianceManagerPermissions =
      ROLE_PERMISSIONS[UserRole.COMPLIANCE_MANAGER];

    expect(complianceManagerPermissions).toEqual(
      expect.arrayContaining([
        Permission.READ_CANDIDATE,
        Permission.READ_DOCUMENT,
        Permission.CREATE_DOCUMENT,
        Permission.UPDATE_DOCUMENT,
        Permission.CREATE_VERIFICATION,
        Permission.READ_VERIFICATION,
      ]),
    );

    expect(complianceManagerPermissions).not.toContain(
      Permission.CREATE_CANDIDATE,
    );
    expect(complianceManagerPermissions).not.toContain(
      Permission.UPDATE_CANDIDATE,
    );
    expect(complianceManagerPermissions).not.toContain(
      Permission.DELETE_DOCUMENT,
    );
    expect(complianceManagerPermissions).not.toContain(
      Permission.CREATE_AI_EXTRACTION,
    );
  });

  it('restricts document deletion to ADMIN only', () => {
    const rolesWithDeletePermission = Object.entries(ROLE_PERMISSIONS)
      .filter(([, permissions]) =>
        permissions.includes(Permission.DELETE_DOCUMENT),
      )
      .map(([role]) => role);

    expect(rolesWithDeletePermission).toEqual([UserRole.ADMIN]);
  });

  it('grants every permission in the enum to at least one role', () => {
    const grantedPermissions = new Set(Object.values(ROLE_PERMISSIONS).flat());

    for (const permission of Object.values(Permission)) {
      expect(grantedPermissions.has(permission)).toBe(true);
    }
  });
});
