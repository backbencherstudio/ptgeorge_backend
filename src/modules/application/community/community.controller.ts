import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Request } from 'express';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('community')
export class CommunityController {

  constructor(private readonly communityService: CommunityService) {}

  // create community post
  @Post()
  async create(
    @Body() createCommunityDto: CreateCommunityDto,
    @Req() req: Request
  ) {
    const userId = req.user.userId;
    return this.communityService.create(createCommunityDto, userId);
  }

  // get all community posts
  @Get('all-post/:communityId')
  async findAll(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
    @Param('communityId') communityId: string
  ) {
    const userId = req.user.userId; 
    return this.communityService.findAll(
      userId, 
      paginationDto,
      communityId
    );
  }

  // delete community post
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id') id: string) {
    const userId = req.user.userId;
    return this.communityService.remove(id, userId);
  }
   
 
}
