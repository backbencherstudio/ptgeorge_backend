import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { CreateSkillDto } from './dto/create-skill.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /*-----------------------------------
          Edit profile routes
  ------------------------------------*/

  // get my profile
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        status: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        church_name: true,
        language: true,
        email: true,
        type: true,
        company_name: true,
        business_email: true,
        business_phone: true,
        service: true,
        category: true,
        profession: true,
        website: true,
        whatsapp_number: true,
        available_time: true,
        address_line1: true,
        address_line2: true,
        state: true,
        country: true,
        zip_code: true,
        business_portfolio: true,
        description: true,
        avatar: true,
        about_me: true,
        address: true,
        name: true,
        location: true,
        balance: true,
        bio: true,
        username: true,
        city: true,
        gender: true,
        date_of_birth: true,
        availability: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    };
  }

  // update my profile
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    avatar?: Express.Multer.File,
  ) {
    const data: any = {};

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateProfileDto.first_name) {
      data.first_name = updateProfileDto.first_name;
    }

    if (updateProfileDto.last_name) {
      data.last_name = updateProfileDto.last_name;
    }

    if (updateProfileDto.phone_number) {
      data.phone_number = updateProfileDto.phone_number;
    }

    if (updateProfileDto.language) {
      data.language = updateProfileDto.language;
    }

    if (updateProfileDto.language) {
      data.language = updateProfileDto.language;
    }

    if (updateProfileDto.company_name) {
      data.company_name = updateProfileDto.company_name;
    }

    if (updateProfileDto.business_email) {
      data.business_email = updateProfileDto.business_email;
    }

    if (updateProfileDto.business_phone) {
      data.business_phone = updateProfileDto.business_phone;
    }

    if (updateProfileDto.service) {
      data.service = updateProfileDto.service;
    }

    if (updateProfileDto.category) {
      data.category = updateProfileDto.category;
    }

    if (updateProfileDto.profession) {
      data.profession = updateProfileDto.profession;
    }

    if (updateProfileDto.website) {
      data.website = updateProfileDto.website;
    }

    if (updateProfileDto.whatsapp_number) {
      data.whatsapp_number = updateProfileDto.whatsapp_number;
    }

    if (updateProfileDto.available_time) {
      data.available_time = updateProfileDto.available_time;
    }

    if (updateProfileDto.address_line1) {
      data.address_line1 = updateProfileDto.address_line1;
    }

    if (updateProfileDto.address_line2) {
      data.address_line2 = updateProfileDto.address_line2;
    }

    if (updateProfileDto.state) {
      data.state = updateProfileDto.state;
    }

    if (updateProfileDto.country) {
      data.country = updateProfileDto.country;
    }

    if (updateProfileDto.zip_code) {
      data.zip_code = updateProfileDto.zip_code;
    }

    if (updateProfileDto.description) {
      data.business_portfolio = updateProfileDto.description;
    }

    if (updateProfileDto.description) {
      data.other_locations = updateProfileDto.other_locations;
    }

    // If client requested explicit avatar removal (and not uploading a new one)
    if ((updateProfileDto as any).remove_avatar && !avatar) {
      if (existingUser.avatar) {
        try {
          await TanvirStorage.delete(
            `${appConfig().storageUrl.avatar}/${existingUser.avatar}`,
          );
        } catch (error) {
          console.error(
            'Failed to delete avatar during remove request:',
            error,
          );
        }
      }
      data.avatar = null;
    }

    if (avatar) {
      // Delete old image if exists
      if (existingUser.avatar) {
        try {
          await TanvirStorage.delete(
            `${appConfig().storageUrl.avatar}/${existingUser.avatar}`,
          );
        } catch (error) {
          console.error('Failed to delete old avatar:', error);
        }
      }

      // Upload new image
      const fileExtension = avatar.originalname.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

      await TanvirStorage.put(
        `${appConfig().storageUrl.avatar}/${fileName}`,
        avatar.buffer,
      );
      data.avatar = fileName;
    }

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: data,
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  /*-----------------------------------
        portfolio images routes
  ------------------------------------*/

  // upload portfolio image
  async uploadPortfolioImage(
    userId: string,
    files?: Express.Multer.File[],
    deleteImages?: string[],
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { portfolio_images: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    let portfolio: string[] = [];

    if (existingUser.portfolio_images) {
      portfolio = Array.isArray(existingUser.portfolio_images)
        ? [...existingUser.portfolio_images]
        : [];
    }

    // Delete images if deleteImages array is provided
    if (deleteImages && deleteImages.length > 0) {
      for (const imageUrl of deleteImages) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          try {
            // Delete from storage
            await TanvirStorage.delete(
              `${appConfig().storageUrl.portfolio}/${fileName}`,
            );

            portfolio = portfolio.filter((img) => {
              const imgFileName = img.split('/').pop();
              return imgFileName !== fileName;
            });
          } catch (error) {
            console.error('Failed to delete portfolio image:', error);
          }
        }
      }
    }

    // Upload new images
    if (files && files.length > 0) {
      for (const file of files) {
        // Validate file type
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/webp',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new BadRequestException(
            `Invalid file type: ${file.originalname}. Only JPEG, PNG, JPG, WEBP are allowed`,
          );
        }

        const fileExtension = file.originalname.split('.').pop();
        const fileName = `portfolio_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

        // Upload to storage
        await TanvirStorage.put(
          `${appConfig().storageUrl.portfolio}/${fileName}`,
          file.buffer,
        );

        // Store the full URL or just filename (consistent with your avatar storage)
        const imageUrl = `${appConfig().storageUrl.portfolio}/${fileName}`;
        portfolio.push(imageUrl);
      }
    }

    // Update user with new portfolio array
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        portfolio_images: portfolio,
      },
    });

    return {
      success: true,
      message: 'Portfolio updated successfully',
      data: {
        portfolio_images: updatedUser.portfolio_images,
        total: updatedUser.portfolio_images.length,
      },
    };
  }

  // get portfolio images
  async getPortfolioImages(userId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { portfolio_images: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const formattedImages =
      existingUser.portfolio_images?.map((img) => {
        TanvirStorage.url(`${appConfig().storageUrl.portfolio}/${img}}`);
      }) || [];

    return {
      success: true,
      message: 'Portfolio images retrieved successfully',
      data: formattedImages,
    };
  }

  /*-----------------------------------
        Expertise & skills routes
  ------------------------------------*/

  // add skill
  async createSkill(userId: string, createSkillDto: CreateSkillDto) {
    const { skill_name } = createSkillDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { skills: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const existingSkill = await this.prisma.skills.findFirst({
      where: {
        user_id: userId,
        skill_name: {
          equals: skill_name,
          mode: 'insensitive', // Case-insensitive check
        },
        deleted_at: null,
      },
    });

    if (existingSkill) {
      throw new BadRequestException(
        `Skill "${skill_name}" already exists for this user`,
      );
    }

    // Create new skill
    const skill = await this.prisma.skills.create({
      data: {
        skill_name: skill_name.trim(),
        user_id: userId,
      },
      select: {
        id: true,
        skill_name: true,
        created_at: true,
      },
    });

    return {
      success: true,
      message: 'Skill added successfully',
      data: skill,
    };
  }

  // Get all skills for a user
  async getSkills(userId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const skills = await this.prisma.skills.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        skill_name: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      success: true,
      message: 'Skills retrieved successfully',
      data: skills,
      total: skills.length,
    };
  }

  // update skill
  async updateSkill(
    userId: string,
    skillId: string,
    createSkillDto: CreateSkillDto,
  ) {
    const { skill_name } = createSkillDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if skill exists and belongs to user
    const existingSkill = await this.prisma.skills.findFirst({
      where: {
        id: skillId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!existingSkill) {
      throw new NotFoundException('Skill not found');
    }

    const duplicateSkill = await this.prisma.skills.findFirst({
      where: {
        user_id: userId,
        skill_name: {
          equals: skill_name,
          mode: 'insensitive',
        },
        id: { not: skillId },
        deleted_at: null,
      },
    });

    if (duplicateSkill) {
      throw new BadRequestException(
        `Skill "${skill_name}" already exists for this user`,
      );
    }

    // Update skill
    const updatedSkill = await this.prisma.skills.update({
      where: { id: skillId },
      data: {
        skill_name: skill_name.trim(),
      },
      select: {
        id: true,
        skill_name: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      message: 'Skill updated successfully',
      data: updatedSkill,
    };
  }

  // delete skill
  async deleteSkill(userId: string, skillId: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if skill exists and belongs to user
    const existingSkill = await this.prisma.skills.findFirst({
      where: {
        id: skillId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!existingSkill) {
      throw new NotFoundException('Skill not found');
    }

    // Soft delete skill
    const deletedSkill = await this.prisma.skills.delete({
      where: { id: skillId },
      select: {
        id: true,
        skill_name: true,
      },
    });

    return {
      success: true,
      message: 'Skill deleted successfully',
      data: deletedSkill,
    };
  }
}
