// pro-user.controller.ts
import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProUserService } from './pro-user.service';
import { ProUserFilterDto } from './dto/pro-user.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { Public } from 'src/common/guard/role/public.decorator';

@ApiTags('Pro Users')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_MEMBER)
@Controller('pro-users')
@UseGuards(JwtAuthGuard)
export class ProUserController {
  constructor(private readonly proUserService: ProUserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pro users from church with filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of pro users from the same church',
  })
  async findAll(@Query() filterDto: ProUserFilterDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || null; // Allow logged-out users
    const currentUserZipCode =
      req.user?.zip_code || filterDto.zipCode || '75068';

    const result = await this.proUserService.findAllWithFilters(
      filterDto,
      userId,
      currentUserZipCode,
    );

    return {
      success: true,
      message: 'Pro users retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Public()
  @Get('filter-options')
  @ApiOperation({
    summary: 'Get available filter options (services, professions, distances)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns filter options for dropdowns',
  })
  async getFilterOptions(@Req() req: any) {
    const userId = req.user.id;
    const result = await this.proUserService.getFilterOptions(userId);
    return {
      success: true,
      message: 'Filter options retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pro user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed pro user profile',
  })
  @ApiResponse({ status: 404, description: 'Pro user not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const result = await this.proUserService.findOne(id, userId);
    return {
      success: true,
      message: 'Pro user details retrieved successfully',
      data: result,
    };
  }
}
