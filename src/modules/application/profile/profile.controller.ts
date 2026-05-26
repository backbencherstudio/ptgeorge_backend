import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PortfolioDto } from './dto/create-portfolio.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Profile')
@ApiBearerAuth(SWAGGER_AUTH.PRO_USER)
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /*-----------------------------------
          Edit profile routes
  ------------------------------------*/

  // get profile
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req) {
    const user = req.user.userId;
    return this.profileService.getProfile(user);
  }

  // update profile
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Patch('me')
  @ApiOperation({ summary: 'Update user profile with optional avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Update profile information and avatar',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Req() req,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const user = req.user.userId;
    return this.profileService.updateProfile(user, updateProfileDto, avatar);
  }

  /*-----------------------------------
        portfolio images routes
  ------------------------------------*/

  // upload portfolio image
  @Post('portfolio')
  @UseInterceptors(
    FilesInterceptor('portfolio_image', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload portfolio images and/or delete existing ones' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload new portfolio images and/or delete existing ones by sending their URLs',
    schema: {
      type: 'object',
      properties: {
        portfolio_image: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Portfolio images (up to 10 files)',
        },
        deleteImages: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'URLs/Paths of portfolio images to delete',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Portfolio updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadPortfolioImage(
    @Req() req,
    @UploadedFiles() files?: Express.Multer.File[],
    @Body() portfolioDto?: PortfolioDto,
  ) {
    const user = req.user.userId;
    return this.profileService.uploadPortfolioImage(
      user,
      files,
      portfolioDto?.deleteImages,
    );
  }

  // get portfolio images
  @Get('portfolio')
  @ApiOperation({ summary: 'Get current user portfolio images' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio images retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPortfolioImages(@Req() req) {
    const user = req.user.userId;
    return this.profileService.getPortfolioImages(user);
  }

  /*-----------------------------------
         Expertise & skills routes
  ------------------------------------*/

  // add skills
  @Post('skills')
  @ApiOperation({ summary: 'Add a new skill to profile' })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({
    status: 201,
    description: 'Skill added successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addSkill(@Req() req, @Body() createSkillDto: CreateSkillDto) {
    const user = req.user.userId;
    return this.profileService.createSkill(user, createSkillDto);
  }

  // Get all skills
  @Get('skills')
  @ApiOperation({ summary: 'Get all skills of current user' })
  @ApiResponse({
    status: 200,
    description: 'Skills retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSkills(@Req() req) {
    const user = req.user.userId;
    return this.profileService.getSkills(user);
  }

  // update skill
  @Patch('skills/:skillId')
  @ApiOperation({ summary: 'Update an existing skill' })
  @ApiParam({ name: 'skillId', description: 'ID of the skill to update' })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({
    status: 200,
    description: 'Skill updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSkill(
    @Req() req,
    @Param('skillId') skillId: string,
    @Body() createSkillDto: CreateSkillDto,
  ) {
    const user = req.user.userId;
    return this.profileService.updateSkill(user, skillId, createSkillDto);
  }

  // delete skill
  @Delete('skills/:skillId')
  @ApiOperation({ summary: 'Delete a skill from profile' })
  @ApiParam({ name: 'skillId', description: 'ID of the skill to delete' })
  @ApiResponse({
    status: 200,
    description: 'Skill deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteSkill(@Req() req, @Param('skillId') skillId: string) {
    const user = req.user.userId;
    return this.profileService.deleteSkill(user, skillId);
  }
}
