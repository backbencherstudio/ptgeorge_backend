import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { Request } from 'express';
import { SuperAdminService } from './overview.service';

@ApiTags('Super Admin Overview')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Super Admin Dashboard Overview',
    description:
      'Returns all statistics, recent activities, and verification queue for super admin dashboard.',
  })
  async getOverview(@Req() req: Request) {
    const userId = req.user?.userId;
    return this.superAdminService.getOverview(userId);
  }
}
