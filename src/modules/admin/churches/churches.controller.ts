import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  Body,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
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
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('churches')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.SUPER_ADMIN)
export class ChurchesController {
  constructor(private readonly service: ChurchesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all churches with pagination and search' })
  getAll(@Query() query: QueryChurchDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single church by ID' })
  @ApiParam({ name: 'id', description: 'Church ID' })
  @RequirePermission('read', 'Church')
  getOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit church details' })
  @ApiParam({ name: 'id', description: 'Church ID' })
  @RequirePermission('update', 'Church')
  edit(@Param('id') id: string, @Body() dto: UpdateChurchDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update church status only' })
  @ApiParam({ name: 'id', description: 'Church ID' })
  @RequirePermission('update', 'Church')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateChurchStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete church' })
  @ApiParam({ name: 'id', description: 'Church ID' })
  @RequirePermission('delete', 'Church')
  delete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
