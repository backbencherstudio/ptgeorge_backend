import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  action: string; // 'manage' | 'read' | 'create' | 'update' | 'delete'
  category: string; // 'Church' | 'User' | 'Role' etc.
}

export const RequirePermission = (action: string, category: string) =>
  SetMetadata(PERMISSION_KEY, { action, category } as RequiredPermission);
