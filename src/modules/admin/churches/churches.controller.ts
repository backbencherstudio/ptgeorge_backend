// churches.controller.ts
import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  Body,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { ChurchesService } from './churches.service';
import { QueryChurchDto } from './dto/query-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { UpdateChurchStatusDto } from './dto/update-church-status.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { Public } from 'src/common/guard/role/public.decorator';

@ApiTags('Churches')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('churches')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
export class ChurchesController {
  constructor(private readonly service: ChurchesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all churches with pagination and search' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'Grace' })
  @ApiQuery({
    name: 'fields',
    required: false,
    example: 'id,church_name,church_city',
  })
  getAll(@Query() query: QueryChurchDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single church by ID' })
  @ApiParam({
    name: 'id',
    description: 'Church ID',
    example: 'cm0n1d3f4g567890',
  })
  @RequirePermission('read', 'Church')
  getOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit church details',
    description:
      'Update church information including name, contact, address, and description. For Church Admin, the ID parameter is ignored and their own church is updated automatically.',
  })
  @ApiParam({
    name: 'id',
    description:
      'Church ID (Required for SUPER_ADMIN, ignored for CHURCH_ADMIN)',
    example: 'cm0n1d3f4g567890',
    required: true,
  })
  @ApiBody({
    type: UpdateChurchDto,
    examples: {
      'full-update': {
        summary: 'Complete church update',
        value: {
          church_name: 'Grace Community Church',
          church_city: 'New York, NY',
          church_email: 'contact@graceny.org',
          church_domain: 'graceny.org',
          church_address: '125 East 84th Street, New York, NY 10028',
          church_description:
            "A vibrant community church serving Manhattan's Upper East Side for over 70 years.",
          church_phone: '+1 212 555 0100',
          church_members: 120,
          church_adminname: 'John Doe',
        },
      },
      'partial-update': {
        summary: 'Partial church update',
        value: {
          church_name: 'Grace Community Church Updated',
          church_phone: '+1 212 555 0123',
        },
      },
    },
  })
  @RequirePermission('update', 'Church')
  async edit(
    @Param('id') id: string,
    @Body() dto: UpdateChurchDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update church status only' })
  @ApiParam({ name: 'id', description: 'Church ID' })
  @ApiBody({ type: UpdateChurchStatusDto })
  @RequirePermission('update', 'Church')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateChurchStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateStatus(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete church' })
  @ApiParam({ name: 'id', description: 'Church ID' })
  @RequirePermission('delete', 'Church')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.softDelete(id, req.user);
  }
}
