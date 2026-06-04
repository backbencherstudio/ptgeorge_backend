import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  Body,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Create a new audit log entry' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', example: 'Deleted Permission' },
        target: { type: 'string', example: 'Manage Churches' },
        church: { type: 'string', example: 'Grace Community Church' },
      },
      required: ['action', 'target'],
    },
  })
  async createLog(
    @Req() req: Request,
    @Body() body: { action: string; target: string; church?: string },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Fetch user details from database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { churchUser: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get actor name (string, not UserType)
    let actorName: string = user.type; // Default to user type
    if (user.first_name && user.last_name) {
      actorName = `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      actorName = user.first_name;
    }

    // Get church info (churchUser is an array)
    let churchName = body.church;
    let churchId = null;

    if (user.churchUser && user.churchUser.length > 0) {
      churchId = user.churchUser[0].id;
      if (user.type === 'CHURCH_ADMIN') {
        churchName = user.churchUser[0].church_name;
      }
    }

    const log = await this.auditLogService.createLog({
      actor: actorName,
      action: body.action,
      target: body.target,
      church: churchName || '--',
      actor_id: userId,
      actor_type: user.type,
      church_id: churchId,
    });

    return log;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Get all audit logs (role-based filtering)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by actor, action, target, or church',
  })
  @ApiQuery({ name: 'actor', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs',
  })
  async getAllLogs(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.auditLogService.getAuditLogs({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      actor,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId: userId,
    });
  }
}
