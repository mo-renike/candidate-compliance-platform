import { UserRole } from '../../../generated/prisma/enums.js';

export enum Permission {
  READ_CANDIDATE = 'candidate:read',
  CREATE_CANDIDATE = 'candidate:create',
  UPDATE_CANDIDATE = 'candidate:update',

  READ_DOCUMENT = 'document:read',
  CREATE_DOCUMENT = 'document:create',
  UPDATE_DOCUMENT = 'document:update',
  DELETE_DOCUMENT = 'document:delete',

  CREATE_VERIFICATION = 'verification:create',
  READ_VERIFICATION = 'verification:read',

  READ_AI_EXTRACTION = 'ai:extract',
  CREATE_AI_EXTRACTION = 'ai:create',
  CONFIRM_AI_EXTRACTION = 'ai:confirm',
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
    Permission.CREATE_VERIFICATION,
    Permission.READ_VERIFICATION,
    Permission.READ_AI_EXTRACTION,
    Permission.CONFIRM_AI_EXTRACTION,
    Permission.CREATE_AI_EXTRACTION,
  ],

  RECRUITER: [
    Permission.READ_CANDIDATE,
    Permission.CREATE_CANDIDATE,
    Permission.UPDATE_CANDIDATE,

    Permission.READ_DOCUMENT,
    Permission.CREATE_DOCUMENT,

    Permission.READ_VERIFICATION,

    Permission.READ_AI_EXTRACTION,
    Permission.CREATE_AI_EXTRACTION,
    Permission.CONFIRM_AI_EXTRACTION,
  ],

  COMPLIANCE_MANAGER: [
    Permission.READ_CANDIDATE,
    Permission.READ_DOCUMENT,
    Permission.CREATE_DOCUMENT,
    Permission.UPDATE_DOCUMENT,
    Permission.CREATE_VERIFICATION,
    Permission.READ_VERIFICATION,
  ],
};
