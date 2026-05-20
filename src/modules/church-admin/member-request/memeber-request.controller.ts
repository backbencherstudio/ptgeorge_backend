import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserType } from 'prisma/generated/enums';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { ApproveUserDto, GetProUsersDto } from './dto/get-pro-users.dto';
import { ProUserService } from './memeber-request.service';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Member Requests')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_MAIN_ADMIN)
@Controller('pro-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProUserController {
  constructor(private readonly proUserService: ProUserService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Get all PRO_USERs with pending status' })
  async getAllProUsers(@Query() query: GetProUsersDto) {
    return this.proUserService.getAllProUsers(query);
  }

  @Post(':userId/approve')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Approve a PRO_USER as helper or member' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'User is not a PRO_USER or already approved',
  })
  async approveUser(
    @Param('userId') userId: string,
    @Body() approveUserDto: ApproveUserDto,
  ) {
    return this.proUserService.approveUser(userId, approveUserDto);
  }
}
