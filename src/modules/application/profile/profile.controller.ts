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
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
import { PaginationDto } from 'src/common/pagination';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

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
  @Patch('me')
  @ApiOperation({ summary: 'Update user profile with optional avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Update profile information and avatar',
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Only image files (JPG, JPEG, PNG, WEBP) are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async updateProfile(
    @Req() req,
    @UploadedFile() avatar?: Express.Multer.File,
    @Body() updateProfileDto?: UpdateProfileDto,
  ) {
    const userId = req.user.userId;
    
    // Handle the case where updateProfileDto might be undefined
    const dto = updateProfileDto || {};
    
    // Convert and validate the DTO
    const validatedDto = plainToClass(UpdateProfileDto, dto);
    const errors = await validate(validatedDto, { 
      skipMissingProperties: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    
    if (errors.length > 0) {
      const errorMessages = errors
        .map(error => Object.values(error.constraints || {}).join(', '))
        .join('; ');
      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }
    
    return this.profileService.updateProfile(userId, validatedDto, avatar);
  }


  @Get('posts')
  @ApiOperation({
    summary: 'Get all posts created by the current user',
    description:
      'Retrieve all posts created by the authenticated user with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page (default: 10, max: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'User posts retrieved successfully.',
    schema: {
      example: {
        success: true,
        message: 'User posts retrieved successfully.',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPosts(@Req() req, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.profileService.getUserPosts(user, paginationDto);
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
  @ApiOperation({
    summary: 'Upload portfolio images and/or delete existing ones',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Upload new portfolio images and/or delete existing ones by sending their URLs',
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
