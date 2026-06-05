// church-admin-analytics.controller.ts
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
import { ChurchAdminAnalyticsService } from './overview.service';

@ApiTags('Church Admin Analytics')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('church-admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHURCH_ADMIN)
export class ChurchAdminAnalyticsController {
  constructor(
    private readonly churchAdminAnalyticsService: ChurchAdminAnalyticsService,
  ) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Church Admin Analytics Dashboard',
    description:
      'Returns church info, stats, and recent activities for the church the admin belongs to.',
  })
  async getAnalytics(@Req() req: Request) {
    const userId = req.user?.userId;
    return this.churchAdminAnalyticsService.getAnalytics(userId);
  }
}
