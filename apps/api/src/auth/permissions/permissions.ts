import { UserRole } from '../../../generated/prisma/enums.js';

export enum Permission {
  READ_CANDIDATE = 'candidate:read',
  CREATE_CANDIDATE = 'candidate:create',
  UPDATE_CANDIDATE = 'candidate:update',

  READ_DOCUMENT = 'document:read',
  CREATE_DOCUMENT = 'document:create',
  UPDATE_DOCUMENT = 'document:update',
  DELETE_DOCUMENT = 'document:delete',

  EXTRACT_AI = 'ai:extract',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    Permission.READ_CANDIDATE,
    Permission.CREATE_CANDIDATE,
    Permission.UPDATE_CANDIDATE,
    Permission.READ_DOCUMENT,
    Permission.CREATE_DOCUMENT,
    Permission.UPDATE_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.EXTRACT_AI,
  ],

  RECRUITER: [
    Permission.READ_CANDIDATE,
    Permission.CREATE_CANDIDATE,
    Permission.UPDATE_CANDIDATE,
    Permission.READ_DOCUMENT,
    Permission.CREATE_DOCUMENT,
    Permission.EXTRACT_AI,
  ],

  COMPLIANCE_MANAGER: [
    Permission.READ_CANDIDATE,
    Permission.READ_DOCUMENT,
    Permission.CREATE_DOCUMENT,
    Permission.UPDATE_DOCUMENT,
  ],
};
