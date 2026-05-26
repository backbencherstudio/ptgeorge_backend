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
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PortfolioDto } from './dto/create-portfolio.dto';
import { CreateSkillDto } from './dto/create-skill.dto';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /*-----------------------------------
          Edit profile routes
  ------------------------------------*/

  // get profile
  @Get('me')
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
  async getPortfolioImages(@Req() req) {
    const user = req.user.userId;
    return this.profileService.getPortfolioImages(user);
  }

  /*-----------------------------------
         Expertise & skills routes
  ------------------------------------*/

  // add skills
  @Post('skills')
  async addSkill(@Req() req, @Body() createSkillDto: CreateSkillDto) {
    const user = req.user.userId;
    return this.profileService.createSkill(user, createSkillDto);
  }

  // Get all skills
  @Get('skills')
  async getSkills(@Req() req) {
    const user = req.user.userId;
    return this.profileService.getSkills(user);
  }

  // update skill
  @Patch('skills/:skillId')
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
  async deleteSkill(@Req() req, @Param('skillId') skillId: string) {
    const user = req.user.userId;
    return this.profileService.deleteSkill(user, skillId);
  }
}
