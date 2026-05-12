import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import {
  CreatePermissionDto,
  PERMISSION_SUBJECTS,
  PermissionAction,
} from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Permissions')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ─── POST /permissions ────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new permission',
    description: `Creates a new permission. The \`name\` (key) is auto-generated from \`action\` + \`category\`.
    
**Auto-key rule:** \`action\` + \`_\` + \`category.toLowerCase()\`  
Example: action=\`manage\` + category=\`Church\` → key=\`manage_church\`

**Fixed action values:** ${Object.values(PermissionAction).join(' | ')}  
**Fixed category values:** ${PERMISSION_SUBJECTS.join(' | ')}`,
  })
  @ApiBody({
    type: CreatePermissionDto,
    examples: {
      // ───────────────── CHURCH ─────────────────
      manage_church: {
        summary: 'Manage Churches',
        value: {
          title: 'Manage Churches',
          category: 'Church',
          action: 'manage',
          description: 'Create, edit, suspend and delete churches',
        },
      },
      view_church: {
        summary: 'View Churches',
        value: {
          title: 'View Churches',
          category: 'Church',
          action: 'read',
          description: 'Read-only access to church records',
        },
      },

      // ───────────────── USERS ─────────────────
      manage_users: {
        summary: 'Manage Users',
        value: {
          title: 'Manage Users',
          category: 'Users',
          action: 'manage',
          description: 'Full control over user accounts',
        },
      },
      view_users: {
        summary: 'View Users',
        value: {
          title: 'View Users',
          category: 'Users',
          action: 'read',
          description: 'Read-only access to user accounts',
        },
      },

      // ───────────────── MEMBERS ─────────────────
      manage_members: {
        summary: 'Manage Members',
        value: {
          title: 'Manage Members',
          category: 'Members',
          action: 'manage',
          description: 'Create, edit, and manage member profiles',
        },
      },
      view_members: {
        summary: 'View Members',
        value: {
          title: 'View Members',
          category: 'Members',
          action: 'read',
          description: 'View-only access to member records',
        },
      },

      // ───────────────── CONTENT ─────────────────
      manage_content: {
        summary: 'Manage Content',
        value: {
          title: 'Manage Content',
          category: 'Content',
          action: 'manage',
          description: 'Create, edit, publish, and delete content',
        },
      },
      publish_content: {
        summary: 'Publish Content',
        value: {
          title: 'Publish Content',
          category: 'Content',
          action: 'update',
          description: 'Ability to publish and unpublish content',
        },
      },

      // ───────────────── SYSTEM ─────────────────
      manage_system: {
        summary: 'System Administration',
        value: {
          title: 'System Administration',
          category: 'System',
          action: 'manage',
          description: 'Full system-level administrative control',
        },
      },
      view_system_logs: {
        summary: 'View System Logs',
        value: {
          title: 'View System Logs',
          category: 'System',
          action: 'read',
          description: 'Access to system logs and audit trails',
        },
      },
    },
  })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  // ─── GET /permissions ─────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get all permissions grouped by category',
    description: `Returns all active permissions grouped by category for display in the Permissions tab.
    
Each group shows the category name and count (e.g. "Church (3)"), and each permission includes which roles use it.`,
  })
  findAll() {
    return this.permissionsService.findAll();
  }

  // ─── GET /permissions/flat ────────────────────────────────────────────────────
  @Get('flat')
  @ApiOperation({
    summary: 'Get all permissions as a flat list',
    description:
      'Returns all ACTIVE permissions as a flat array. Use this endpoint to populate the permission selector when assigning permissions to a role.',
  })
  findAllFlat() {
    return this.permissionsService.findAllFlat();
  }

  // ─── GET /permissions/:id ─────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single permission by ID',
    description:
      'Returns full permission details including which roles currently use it.',
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the permission',
    example: 'clxperm0001abc',
  })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  // ─── PATCH /permissions/:id ───────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a permission',
    description: `Updates a permission's title, category, action, or description.
    
The \`name\` key is **automatically recalculated** if \`action\` or \`category\` changes. If the new key conflicts with an existing permission, a 409 is returned.`,
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the permission',
    example: 'clxperm0001abc',
  })
  @ApiBody({
    type: UpdatePermissionDto,
    examples: {
      // ─────────────── CHURCH ───────────────
      update_church_title: {
        summary: 'Update Church title only',
        value: {
          title: 'View Church Directory',
        },
      },
      update_church_action: {
        summary: 'Change Church permission action',
        value: {
          action: 'read',
          category: 'Church',
          description: 'Read-only access to church data',
        },
      },

      // ─────────────── USERS ───────────────
      update_user_permission: {
        summary: 'Update User permission',
        value: {
          title: 'Manage Users',
          action: 'manage',
          category: 'Users',
          description: 'Full control over user accounts',
        },
      },

      // ─────────────── MEMBERS ───────────────
      update_member_permission: {
        summary: 'Update Members permission',
        value: {
          title: 'View Members',
          action: 'read',
          category: 'Members',
          description: 'Read-only access to member profiles',
        },
      },

      // ─────────────── CONTENT ───────────────
      update_content_permission: {
        summary: 'Update Content permission',
        value: {
          title: 'Publish Content',
          action: 'update',
          category: 'Content',
          description: 'Ability to publish and modify content',
        },
      },

      // ─────────────── SYSTEM ───────────────
      update_system_permission: {
        summary: 'Update System permission',
        value: {
          title: 'System Administration',
          action: 'manage',
          category: 'System',
          description: 'Full system-level control',
        },
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  // ─── PATCH /permissions/:id/status ───────────────────────────────────────────
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Toggle permission status (ACTIVE ↔ INACTIVE)',
    description: `Toggles between \`ACTIVE\` and \`INACTIVE\`.
    
- **ACTIVE** → permission works normally, users with a role that has this permission can act
- **INACTIVE** → permission is suspended; even if assigned to a role, it will not grant access`,
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the permission',
    example: 'clxperm0001abc',
  })
  toggleStatus(@Param('id') id: string) {
    return this.permissionsService.toggleStatus(id);
  }

  // ─── DELETE /permissions/:id ──────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a permission (soft delete)',
    description: `Soft-deletes the permission by setting \`deleted_at\`.
    
Also removes the permission from **all roles** it was assigned to (\`permission_roles\` records are hard-deleted).`,
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the permission',
    example: 'clxperm0001abc',
  })
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
