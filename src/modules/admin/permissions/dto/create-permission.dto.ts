import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PermissionAction {
  MANAGE = 'manage',
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

// UI Categories for the Roles & Permissions page
export const PERMISSION_CATEGORIES = [
  'Church',
  'Users',
  'Members',
  'Content',
  'System',
] as const;

// Fixed subjects — must match what your backend guards check against.
// Extend this list as your platform grows.
export const PERMISSION_SUBJECTS = [
  'Church',
  'User',
  'Role',
  'Permission',
  'Notification',
  'Announcement',
  'AdsManager',
  'VerificationQueue',
] as const;

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Human-readable permission title shown in the UI.',
    example: 'Manage Churches',
    examples: {
      manage_church: {
        summary: 'Manage Churches',
        value: 'Manage Churches',
      },
      view_church: {
        summary: 'View Churches',
        value: 'View Churches',
      },
      manage_users: {
        summary: 'Manage Users',
        value: 'Manage Users',
      },
      view_users: {
        summary: 'View Users',
        value: 'View Users',
      },
      manage_members: {
        summary: 'Manage Members',
        value: 'Manage Members',
      },
      view_members: {
        summary: 'View Members',
        value: 'View Members',
      },
      manage_content: {
        summary: 'Manage Content',
        value: 'Manage Content',
      },
      publish_content: {
        summary: 'Publish Content',
        value: 'Publish Content',
      },
      manage_system: {
        summary: 'System Administration',
        value: 'System Administration',
      },
      view_system_logs: {
        summary: 'View System Logs',
        value: 'View System Logs',
      },
    },
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description:
      'Category groups permissions visually in the UI and becomes the subject used by backend guards. Must be one of the fixed allowed values.',
    example: 'Church',
    enum: PERMISSION_CATEGORIES,
    examples: {
      church: {
        summary: 'Church category',
        value: 'Church',
      },
      users: {
        summary: 'Users category',
        value: 'Users',
      },
      members: {
        summary: 'Members category',
        value: 'Members',
      },
      content: {
        summary: 'Content category',
        value: 'Content',
      },
      system: {
        summary: 'System category',
        value: 'System',
      },
    },
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([...PERMISSION_CATEGORIES], {
    message: `category must be one of: ${PERMISSION_CATEGORIES.join(', ')}`,
  })
  category: string;

  @ApiProperty({
    description:
      'The action this permission grants. Used by backend guards. Must be one of the fixed allowed values.',
    example: 'manage',
    enum: PermissionAction,
    examples: {
      manage: {
        summary: 'Full management access',
        value: 'manage',
      },
      read: {
        summary: 'Read-only access',
        value: 'read',
      },
      create: {
        summary: 'Create only access',
        value: 'create',
      },
      update: {
        summary: 'Update only access',
        value: 'update',
      },
      delete: {
        summary: 'Delete only access',
        value: 'delete',
      },
    },
  })
  @IsEnum(PermissionAction, {
    message: `action must be one of: ${Object.values(PermissionAction).join(', ')}`,
  })
  action: PermissionAction;

  @ApiPropertyOptional({
    description: 'Human-readable description of what this permission allows.',
    example: 'Create, edit, suspend and delete churches',
    examples: {
      manage_church_desc: {
        summary: 'Manage Churches description',
        value: 'Create, edit, suspend and delete churches',
      },
      view_church_desc: {
        summary: 'View Churches description',
        value: 'Read-only access to church records',
      },
      manage_users_desc: {
        summary: 'Manage Users description',
        value: 'Full control over user accounts',
      },
      view_users_desc: {
        summary: 'View Users description',
        value: 'Read-only access to user accounts',
      },
      manage_members_desc: {
        summary: 'Manage Members description',
        value: 'Create, edit, and manage member profiles',
      },
      view_members_desc: {
        summary: 'View Members description',
        value: 'View-only access to member records',
      },
      manage_content_desc: {
        summary: 'Manage Content description',
        value: 'Create, edit, publish, and delete content',
      },
      publish_content_desc: {
        summary: 'Publish Content description',
        value: 'Ability to publish and unpublish content',
      },
      manage_system_desc: {
        summary: 'System Administration description',
        value: 'Full system-level administrative control',
      },
      view_system_logs_desc: {
        summary: 'View System Logs description',
        value: 'Access to system logs and audit trails',
      },
    },
  })
  @IsString()
  @IsOptional()
  description?: string;
}
