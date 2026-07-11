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
import {
  onlySendUserNotification,
  sendAdminNotification,
} from 'src/common/repository/notification/utils/notification.utils';
import { PaginationDto } from '../pro-user/dto/pro-user.dto';

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
        portfolio_images: true, // Added this to return full URLs
        work_globally: true,
        hide_address: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Format avatar URL if exists
    const formattedUser = {
      ...user,
      avatar: user.avatar
        ? TanvirStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
        : null,
      // Format portfolio images URLs if needed
      portfolio_images:
        user.portfolio_images?.map((fileName) =>
          TanvirStorage.url(`${appConfig().storageUrl.portfolio}/${fileName}`),
        ) || [],
    };

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: formattedUser,
    };
  }

  // update my profile - complete version
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

    // Define all updatable fields with their transformation logic
    const fieldMap = {
      // Basic fields
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      phone_number: { type: 'string' },
      language: { type: 'string' },
      church_name: { type: 'string' },

      // Professional fields
      company_name: { type: 'string' },
      business_email: { type: 'string' },
      business_phone: { type: 'string' },
      service: { type: 'string' },
      category: { type: 'string' },
      profession: { type: 'string' },
      website: { type: 'string' },
      whatsapp_number: { type: 'string' },
      available_time: { type: 'string' },

      // Address fields
      address_line1: { type: 'string' },
      address_line2: { type: 'string' },
      state: { type: 'string' },
      country: { type: 'string' },
      zip_code: { type: 'string' },

      // Additional fields
      description: { type: 'string' },
      business_portfolio: { type: 'string' },
      about_me: { type: 'string' },
      address: { type: 'string' },
      name: { type: 'string' },
      location: { type: 'string' },
      bio: { type: 'string' },
      username: { type: 'string' },
      city: { type: 'string' },
      gender: { type: 'string' },
      availability: { type: 'string' },
      other_locations: { type: 'string' },

      hide_address: { type: 'boolean' },
      work_globally: { type: 'boolean' },
    };

    // Process each field
    for (const [dtoField, config] of Object.entries(fieldMap)) {
      const value = updateProfileDto[dtoField];
      if (value !== undefined && value !== null) {
        // Handle boolean transformation
        if (config.type === 'boolean') {
          // Convert string 'true'/'false' to actual boolean
          if (typeof value === 'string') {
            data[dtoField] = value === 'true' || value === '1';
          } else {
            data[dtoField] = value;
          }
        } else {
          data[dtoField] = value;
        }
      }
    }

    // Handle date_of_birth separately
    if (updateProfileDto.date_of_birth) {
      data.date_of_birth = new Date(updateProfileDto.date_of_birth);
    }

    // Handle avatar upload
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

      // Validate file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
      ];
      if (!allowedMimeTypes.includes(avatar.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${avatar.originalname}. Only JPEG, PNG, JPG, WEBP are allowed`,
        );
      }

      // Upload new image
      const fileExtension = avatar.originalname.split('.').pop();
      const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

      await TanvirStorage.put(
        `${appConfig().storageUrl.avatar}/${fileName}`,
        avatar.buffer,
      );

      data.avatar = fileName;
    }

    // Handle avatar removal
    if (updateProfileDto.remove_avatar === true && !avatar) {
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

    // Only update if there's data to update
    if (Object.keys(data).length === 0) {
      return {
        success: true,
        message: 'No changes to update',
        data: existingUser,
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: data,
    });

    // Send notification (optional)
    await onlySendUserNotification({
      sender_id: userId,
      receiver_id: userId,
      text: 'Profile updated successfully',
      type: 'profile_update',
      entity_id: userId,
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  async getUserPosts(userId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;

    // Validate and limit the limit parameter
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Get church member ID for the user
    const churchMember = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        church: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        church_id: true,
        church_role: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
      },
    });

    if (!churchMember) {
      return {
        success: true,
        message: 'User posts retrieved successfully.',
        data: [],
        pagination: {
          page,
          limit: take,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    // Build where clause for posts by this user
    const where = {
      church_member_id: churchMember.id,
      deleted_at: null,
    };

    // Get total count for pagination
    const total = await this.prisma.churchPost.count({
      where,
    });

    // Get posts with pagination
    const posts = await this.prisma.churchPost.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take,
      include: {
        church_member: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
              },
            },
          },
        },
        comments: {
          orderBy: { created_at: 'desc' },
          take: 3,
          include: {
            church_member: {
              include: {
                user: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    avatar: true,
                  },
                },
              },
            },
            replies: {
              take: 2,
              include: {
                church_member: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        reacts: true,
        _count: {
          select: {
            comments: true,
            reacts: true,
          },
        },
      },
    });

    if (posts.length === 0) {
      return {
        success: true,
        message: 'User posts retrieved successfully.',
        data: [],
        pagination: {
          page,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
          hasNextPage: page < Math.ceil(total / take),
          hasPrevPage: page > 1,
        },
      };
    }

    // Get reaction counts for posts
    const postIds = posts.map((p) => p.id);

    // Get reaction counts grouped by post and type
    const reactCounts = await this.prisma.churchPostReact.groupBy({
      by: ['post_id', 'react_type'],
      where: {
        post_id: { in: postIds },
      },
      _count: {
        _all: true,
      },
    });

    // Create a map of post_id to reaction counts
    const reactCountsMap = new Map();
    reactCounts.forEach((item) => {
      const existing = reactCountsMap.get(item.post_id) || { LIKE: 0, LOVE: 0 };
      if (item.react_type === 'LIKE') {
        existing.LIKE = item._count._all;
      } else if (item.react_type === 'LOVE') {
        existing.LOVE = item._count._all;
      }
      reactCountsMap.set(item.post_id, existing);
    });

    // Get user's reactions for each post
    const userReactions = await this.prisma.churchPostReact.findMany({
      where: {
        post_id: { in: postIds },
        church_member_id: churchMember.id,
      },
      select: {
        post_id: true,
        react_type: true,
      },
    });

    const userReactionMap = new Map(
      userReactions.map((r) => [r.post_id, r.react_type]),
    );

    // Helper function for image URLs (assuming you have these methods)
    const getFullImageUrl = (fileName: string | null, type: string) => {
      if (!fileName) return null;
      // Implement your URL generation logic here
      // This is just an example - adjust based on your setup
      return TanvirStorage.url(`${appConfig().storageUrl[type]}/${fileName}`);
    };

    const getFullImageUrls = (images: string[] | null, type: string) => {
      if (!images || !Array.isArray(images)) return [];
      return images.map((img) => getFullImageUrl(img, type)).filter(Boolean);
    };

    const formattedPosts = posts.map((post) => {
      const authorRole = post.church_member.church_role || 'Church Member';
      const postReactions = reactCountsMap.get(post.id) || { LIKE: 0, LOVE: 0 };

      return {
        id: post.id,
        content: post.content,
        images: getFullImageUrls(post.images, 'post'),
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          id: post.church_member.user.id,
          name: `${post.church_member.user.first_name} ${post.church_member.user.last_name}`,
          avatar: getFullImageUrl(post.church_member.user.avatar, 'avatar'),
          role: authorRole,
        },
        stats: {
          comments_count: post._count.comments,
          reacts_count: post._count.reacts,
          reaction_counts: postReactions,
        },
        myreact: userReactionMap.has(post.id),
        is_reacted: userReactionMap.has(post.id),
        user_reacted: userReactionMap.get(post.id) || null,
      };
    });

    const totalPages = Math.ceil(total / take);

    return {
      success: true,
      message: 'User posts retrieved successfully.',
      data: formattedPosts,
      pagination: {
        page,
        limit: take,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /*-----------------------------------
        portfolio images routes
  ------------------------------------*/

  // upload portfolio image
  async uploadPortfolioImage(
    userId: string,
    files?: Express.Multer.File[],
    deleteImages?: string | string[],
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

    // Normalize deleteImages to an array (accept array, comma-separated string, or single string)
    let imagesToDelete: string[] = [];
    if (deleteImages) {
      if (Array.isArray(deleteImages)) {
        imagesToDelete = deleteImages;
      } else if (typeof deleteImages === 'string') {
        imagesToDelete = deleteImages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Delete images if any provided
    if (imagesToDelete.length > 0) {
      for (const imageUrl of imagesToDelete) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          try {
            await TanvirStorage.delete(
              `${appConfig().storageUrl.portfolio}/${fileName}`,
            );

            // portfolio stores plain filenames, compare directly
            portfolio = portfolio.filter((img) => img !== fileName);
          } catch (error) {
            console.error('Failed to delete portfolio image:', error);
          }
        }
      }
    }

    // Upload new images
    if (files && files.length > 0) {
      for (const file of files) {
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

        // Upload to storage using full path
        await TanvirStorage.put(
          `${appConfig().storageUrl.portfolio}/${fileName}`,
          file.buffer,
        );

        // ✅ Store ONLY the filename, not the full path
        portfolio.push(fileName);
      }
    }

    // Update user with new portfolio array
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        portfolio_images: portfolio,
      },
    });

    await onlySendUserNotification({
      sender_id: userId,
      receiver_id: userId,
      text: 'Portfolio images updated successfully',
      type: 'profile_update',
      entity_id: userId,
    });

    return {
      success: true,
      message: 'Portfolio images updated successfully',
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
      existingUser.portfolio_images?.map((fileName) => {
        // ✅ img is now just "filename.jpg", prepend path once
        return TanvirStorage.url(
          `${appConfig().storageUrl.portfolio}/${fileName}`,
        );
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
