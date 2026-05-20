import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetMembersDto } from './dto/get-members.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ChurchMembersService } from './members-directory.service';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Church Members')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('church/members')
@UseGuards(JwtAuthGuard)
export class ChurchMembersController {
  constructor(private readonly membersService: ChurchMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all members of the church' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'John' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'role', required: false, example: 'pastor' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getMembers(@Request() req, @Query() query: GetMembersDto) {
    return this.membersService.getChurchMembers(req.user.userId, query);
  }

  @Get('assignable-roles')
  @ApiOperation({ summary: 'Get roles that current admin can assign' })
  async getAssignableRoles(@Request() req) {
    return this.membersService.getAssignableRoles(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get member by ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async getMemberById(@Request() req, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new member to the church' })
  @ApiBody({ type: CreateMemberDto })
  async addMember(@Request() req, @Body() dto: CreateMemberDto) {
    return this.membersService.addMember(req.user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiBody({ type: UpdateMemberDto })
  async updateMember(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from church (soft delete)' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  async removeMember(@Request() req, @Param('id') id: string) {
    return this.membersService.removeMember(req.user.userId, id);
  }
}
