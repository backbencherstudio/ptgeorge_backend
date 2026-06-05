// super-admin-analytics.controller.ts
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
import { SuperAdminAnalyticsService } from './analytics.service';

@ApiTags('Super Admin Analytics')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('super-admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminAnalyticsController {
  constructor(
    private readonly superAdminAnalyticsService: SuperAdminAnalyticsService,
  ) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Super Admin Analytics Dashboard',
    description:
      'Returns all analytics data including totals, members per church, ad performance, users by role, and church status breakdown in a single optimized API call.',
  })
  async getAnalytics(@Req() req: Request) {
    const userId = req.user?.userId;
    return this.superAdminAnalyticsService.getAnalytics(userId);
  }
}
