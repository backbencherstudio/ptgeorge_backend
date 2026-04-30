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
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { RolesService } from './roles.service';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { CreateRoleDto } from './dto/create-roles.dto';
import { UpdateRoleDto } from './dto/update-roles.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Roles')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── POST /roles ─────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new role',
    description:
      'Creates a new role. The `name` (slug key) is auto-generated from the `title`. System roles (super_admin, system_admin) are seeded and cannot be created from this endpoint.',
  })
  @ApiBody({ type: CreateRoleDto })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  // ─── GET /roles ──────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get all roles',
    description:
      'Returns all active (non-deleted) roles with their permission count, user count, and assigned permissions.',
  })
  findAll() {
    return this.rolesService.findAll();
  }

  // ─── GET /roles/:id ──────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single role by ID',
    description:
      'Returns full role details including all assigned permissions and users.',
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the role',
    example: 'clx1a2b3c0000abc',
  })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  // ─── PATCH /roles/:id ────────────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a role',
    description:
      'Updates a role title, description, or color. System role titles (super_admin, system_admin) cannot be changed. The `name` slug is re-generated if `title` changes.',
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the role',
    example: 'clx1a2b3c0000abc',
  })
  @ApiBody({ type: UpdateRoleDto })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  // ─── DELETE /roles/:id ───────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a role (soft delete)',
    description:
      'Soft-deletes a role by setting `deleted_at`. Blocked for system roles or roles that still have users assigned.',
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the role',
    example: 'clx1a2b3c0000abc',
  })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  // ─── PATCH /roles/:id/status ─────────────────────────────────────────────────
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Toggle role status (Suspend / Activate)',
    description:
      'Toggles the role status between active (1) and suspended (0). Blocked for system roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the role',
    example: 'clx1a2b3c0000abc',
  })
  toggleStatus(@Param('id') id: string) {
    return this.rolesService.toggleStatus(id);
  }

  // ─── POST /roles/:id/permissions ─────────────────────────────────────────────
  @Post(':id/permissions')
  @ApiOperation({
    summary: 'Assign permissions to a role',
    description:
      'Full replace — deletes all existing permissions on the role and assigns the provided list. Pass an empty array to remove all permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'The CUID of the role',
    example: 'clx1a2b3c0000abc',
  })
  @ApiBody({ type: AssignPermissionsDto })
  assignPermissions(
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(roleId, dto.permissionIds);
  }
}
