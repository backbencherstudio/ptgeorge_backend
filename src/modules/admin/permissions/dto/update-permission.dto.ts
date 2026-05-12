// update-permission.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatePermissionDto,
  PermissionAction,
  PERMISSION_SUBJECTS,
} from './create-permission.dto';
import { IsString, IsOptional, IsEnum, IsIn } from 'class-validator';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {
  @ApiPropertyOptional({
    description: 'Human-readable permission title shown in the UI.',
    example: 'Manage Churches',
    minLength: 1,
    type: String,
    examples: {
      'Update Title': {
        summary: 'Change to more specific title',
        value: 'Manage All Churches',
      },
      'Original Title': {
        summary: 'Keep original or revert',
        value: 'Manage Churches',
      },
    },
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description:
      'Category groups permissions visually in the UI and becomes the subject used by backend guards. ' +
      'Must be one of the fixed allowed values. Changing this affects which controller actions this permission protects.',
    example: 'Church',
    enum: PERMISSION_SUBJECTS,
    examples: {
      'Church Category': {
        summary: 'Church management permissions',
        value: 'Church',
      },
      'User Category': {
        summary: 'User management permissions',
        value: 'User',
      },
      'Role Category': {
        summary: 'Role management permissions',
        value: 'Role',
      },
      'Permission Category': {
        summary: 'Permission management permissions',
        value: 'Permission',
      },
      'Notification Category': {
        summary: 'Notification permissions',
        value: 'Notification',
      },
      'Announcement Category': {
        summary: 'Announcement permissions',
        value: 'Announcement',
      },
      'AdsManager Category': {
        summary: 'Ads manager permissions',
        value: 'AdsManager',
      },
      'VerificationQueue Category': {
        summary: 'Verification queue permissions',
        value: 'VerificationQueue',
      },
    },
  })
  @IsString()
  @IsOptional()
  @IsIn([...PERMISSION_SUBJECTS], {
    message: `category must be one of: ${PERMISSION_SUBJECTS.join(', ')}`,
  })
  category?: string;

  @ApiPropertyOptional({
    description:
      'The action this permission grants. Used by backend guards. ' +
      'Must be one of the fixed allowed values. ' +
      'Changing this affects what operations users with this permission can perform.',
    example: 'manage',
    enum: PermissionAction,
    examples: {
      Manage: {
        summary: 'Full management access',
        value: 'manage',
      },
      Read: {
        summary: 'Read-only access',
        value: 'read',
      },
      Create: {
        summary: 'Create only access',
        value: 'create',
      },
      Update: {
        summary: 'Update only access',
        value: 'update',
      },
      Delete: {
        summary: 'Delete only access',
        value: 'delete',
      },
    },
  })
  @IsEnum(PermissionAction, {
    message: `action must be one of: ${Object.values(PermissionAction).join(', ')}`,
  })
  action?: PermissionAction;

  @ApiPropertyOptional({
    description: 'Human-readable description of what this permission allows.',
    example: 'Create, edit, suspend and delete churches',
    maxLength: 500,
    type: String,
    examples: {
      'Full Description': {
        summary: 'Detailed description',
        value:
          'Allows user to create new churches, edit existing church details, suspend church accounts, and permanently delete churches from the platform.',
      },
      'Short Description': {
        summary: 'Brief description',
        value: 'Full church management capabilities',
      },
      'Remove Description': {
        summary: 'Remove description (null or empty string)',
        value: '',
      },
    },
  })
  @IsString()
  @IsOptional()
  description?: string;
}
