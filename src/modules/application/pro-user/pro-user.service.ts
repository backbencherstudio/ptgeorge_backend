// pro-user.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ProUserFilterDto,
  ProUserListItemDto,
  ProUserDetailsDto,
} from './dto/pro-user.dto';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class ProUserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWithFilters(
    filterDto: ProUserFilterDto,
    currentUserId: string | null,
    userZipCode?: string,
  ): Promise<{
    data: ProUserListItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      category,
      profession,
      distance,
      minRating,
      churchName,
      page = 1,
      limit = 10,
    } = filterDto;
    const skip = (page - 1) * limit;

    let churchIds: string[] = [];
    let isSuperAdmin = false;

    // Handle church filtering based on user authentication
    if (currentUserId) {
      // Check if the user is a SUPER_ADMIN
      const currentUser = await this.prisma.user.findUnique({
        where: {
          id: currentUserId,
          deleted_at: null,
        },
        select: {
          type: true,
        },
      });

      isSuperAdmin = currentUser?.type === 'SUPER_ADMIN';

      // If not super admin, check church membership
      if (!isSuperAdmin) {
        const currentUserMembership = await this.prisma.churchMember.findFirst({
          where: {
            user_id: currentUserId,
            status: 'ACTIVE',
            deleted_at: null,
          },
          include: {
            church: true,
          },
        });

        if (!currentUserMembership) {
          throw new ForbiddenException('You are not a member of any church');
        }

        // Get church IDs based on church name filter
        if (churchName) {
          const churches = await this.prisma.church.findMany({
            where: {
              church_name: { contains: churchName, mode: 'insensitive' },
              deleted_at: null,
            },
            select: { id: true },
          });
          churchIds = churches.map((church) => church.id);

          if (churchIds.length === 0) {
            return {
              data: [],
              total: 0,
              page,
              limit,
              totalPages: 0,
            };
          }
        } else {
          churchIds = [currentUserMembership.church_id];
        }
      } else {
        // Super admin - get church IDs based on church name filter or all churches
        if (churchName) {
          const churches = await this.prisma.church.findMany({
            where: {
              church_name: { contains: churchName, mode: 'insensitive' },
              deleted_at: null,
            },
            select: { id: true },
          });
          churchIds = churches.map((church) => church.id);

          if (churchIds.length === 0) {
            return {
              data: [],
              total: 0,
              page,
              limit,
              totalPages: 0,
            };
          }
        }
        // If no churchName filter, super admin sees all churches
        // Leave churchIds empty to get all pro users
      }
    } else {
      // Logged-out user: show pro users from all churches or filter by church name
      if (churchName) {
        const churches = await this.prisma.church.findMany({
          where: {
            church_name: { contains: churchName, mode: 'insensitive' },
            deleted_at: null,
          },
          select: { id: true },
        });
        churchIds = churches.map((church) => church.id);

        if (churchIds.length === 0) {
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
      }
      // If no churchName filter and user is logged out, show all pro users
    }

    // Get PRO_USER members from the specified churches
    let proUserIds: string[] = [];

    if (churchIds.length > 0) {
      const churchMemberIds = await this.prisma.churchMember.findMany({
        where: {
          church_id: { in: churchIds },
          status: 'ACTIVE',
          deleted_at: null,
          user: {
            type: 'PRO_USER',
            status: 'ACTIVE',
            deleted_at: null,
          },
        },
        select: {
          user_id: true,
          church_id: true,
        },
      });
      proUserIds = churchMemberIds.map((m) => m.user_id);
    } else {
      // If no church filter and user is super admin or logged out, get all pro users
      const allProUsers = await this.prisma.user.findMany({
        where: {
          type: 'PRO_USER',
          status: 'ACTIVE',
          deleted_at: null,
        },
        select: { id: true },
      });
      proUserIds = allProUsers.map((user) => user.id);
    }

    if (proUserIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Build where conditions
    const where: any = {
      id: { in: proUserIds },
      type: 'PRO_USER',
      status: 'ACTIVE',
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { company_name: { contains: search, mode: 'insensitive' } },
        { profession: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (profession) {
      where.profession = { equals: profession, mode: 'insensitive' };
    }

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get users with their skills
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        skills: true,
      },
    });

    // ❌ REMOVE THIS LINE - It's incorrectly placed outside the map
    // const shouldHideAddress = user.hide_address === true;

    // Calculate average rating and map to DTO
    const data = await Promise.all(
      users.map(async (user) => {
        const ratingData = await this.getUserRating(user.id);

        // Get location data
        const locationData = await this.calculateDistance(
          user.zip_code,
          userZipCode || filterDto.zipCode || '75068',
          user.city || 'Little Elm',
          user.state,
        );

        // Get the church name for this user
        const userChurch = await this.prisma.churchMember.findFirst({
          where: {
            user_id: user.id,
            status: 'ACTIVE',
            deleted_at: null,
          },
          include: {
            church: true,
          },
        });

        // Format avatar URL if exists
        const avatarUrl = user.avatar
          ? TanvirStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
          : null;

        // ✅ Handle address visibility - Check if hide_address is true
        const shouldHideAddress = user.hide_address === true;

        // Create the DTO object with address handling
        const dto: ProUserListItemDto = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
          companyName: user.company_name,
          profession: user.profession,
          rating: ratingData.averageRating,
          reviewCount: ratingData.reviewCount,
          location: {
            distance: locationData.distance,
            unit: 'mi',
            // ✅ Hide location details if hide_address is true
            city: shouldHideAddress ? undefined : locationData.city,
            state: shouldHideAddress ? undefined : user.state,
            zipCode: shouldHideAddress ? undefined : user.zip_code,
            // ✅ Add a flag to indicate address is hidden
            isAddressHidden: shouldHideAddress,
          },
          avatar: avatarUrl,
          description: user.description,
          // ✅ Add work_globally flag to DTO
          workGlobally: user.work_globally || false,
          // ✅ Add hideAddress flag to DTO
          hideAddress: shouldHideAddress,
        };

        // Add churchName if available
        if (userChurch?.church?.church_name) {
          (dto as any).churchName = userChurch.church.church_name;
        }

        return dto;
      }),
    );

    // Apply distance filter if specified
    let filteredData = data;
    if (distance) {
      filteredData = data.filter((item) => {
        // If user works globally, always show them regardless of distance
        if (item.workGlobally) return true;
        return item.location.distance <= distance;
      });
    }

    // Apply rating filter if specified
    if (minRating) {
      filteredData = filteredData.filter((item) => item.rating >= minRating);
    }

    // Calculate pagination for filtered data
    const filteredTotal = filteredData.length;
    const paginatedData = filteredData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit),
    };
  }

  async findOne(id: string, currentUserId: string) {
    // Check if the user is a SUPER_ADMIN
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: currentUserId,
        deleted_at: null,
      },
      select: {
        type: true,
      },
    });

    const isSuperAdmin = currentUser?.type === 'SUPER_ADMIN';

    // If not super admin, check church membership
    if (!isSuperAdmin) {
      const currentUserMembership = await this.prisma.churchMember.findFirst({
        where: {
          user_id: currentUserId,
          status: 'ACTIVE',
          deleted_at: null,
        },
      });

      if (!currentUserMembership) {
        throw new ForbiddenException('You are not a member of any church');
      }

      const churchId = currentUserMembership.church_id;

      // Check if the requested pro user belongs to the same church
      const proUserMembership = await this.prisma.churchMember.findFirst({
        where: {
          user_id: id,
          church_id: churchId,
          status: 'ACTIVE',
          deleted_at: null,
          user: {
            type: 'PRO_USER',
          },
        },
        include: {
          user: {
            include: {
              skills: true,
            },
          },
          church: true,
        },
      });

      if (!proUserMembership) {
        throw new NotFoundException(
          `Pro user with ID ${id} not found in your church`,
        );
      }

      return this.formatProUserDetails(
        proUserMembership.user,
        proUserMembership.church,
      );
    }

    // Super admin - can view any pro user
    const proUser = await this.prisma.user.findFirst({
      where: {
        id: id,
        type: 'PRO_USER',
        status: 'ACTIVE',
        deleted_at: null,
      },
      include: {
        skills: true,
      },
    });

    if (!proUser) {
      throw new NotFoundException(`Pro user with ID ${id} not found`);
    }

    // Get church info for super admin view
    const churchMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: id,
        status: 'ACTIVE',
        deleted_at: null,
      },
      include: {
        church: true,
      },
    });

    return this.formatProUserDetails(proUser, churchMembership?.church);
  }

  async getFilterOptions(currentUserId: string) {
    // Check if the user is a SUPER_ADMIN
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: currentUserId,
        deleted_at: null,
      },
      select: {
        type: true,
      },
    });

    const isSuperAdmin = currentUser?.type === 'SUPER_ADMIN';

    let proUserIds: string[] = [];

    if (isSuperAdmin) {
      // Super admin - get all pro users
      const allProUsers = await this.prisma.user.findMany({
        where: {
          type: 'PRO_USER',
          status: 'ACTIVE',
          deleted_at: null,
        },
        select: { id: true },
      });
      proUserIds = allProUsers.map((user) => user.id);
    } else {
      // Regular user - get pro users from their church
      const currentUserMembership = await this.prisma.churchMember.findFirst({
        where: {
          user_id: currentUserId,
          status: 'ACTIVE',
          deleted_at: null,
        },
      });

      if (!currentUserMembership) {
        throw new ForbiddenException('You are not a member of any church');
      }

      const churchId = currentUserMembership.church_id;

      const churchMemberIds = await this.prisma.churchMember.findMany({
        where: {
          church_id: churchId,
          status: 'ACTIVE',
          deleted_at: null,
          user: {
            type: 'PRO_USER',
            status: 'ACTIVE',
          },
        },
        select: {
          user_id: true,
        },
      });

      proUserIds = churchMemberIds.map((m) => m.user_id);
    }

    if (proUserIds.length === 0) {
      return { services: [], professions: [], distances: [1, 3, 5, 7, 10] };
    }

    // Get unique categories (services) from pro users
    const categoriesResult = await this.prisma.user.findMany({
      where: {
        id: { in: proUserIds },
        type: 'PRO_USER',
        status: 'ACTIVE',
        deleted_at: null,
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    });
    const services = categoriesResult
      .map((c) => c.category)
      .filter(Boolean) as string[];

    // Get unique professions from pro users
    const professionsResult = await this.prisma.user.findMany({
      where: {
        id: { in: proUserIds },
        type: 'PRO_USER',
        status: 'ACTIVE',
        deleted_at: null,
        profession: { not: null },
      },
      select: { profession: true },
      distinct: ['profession'],
    });
    const professions = professionsResult
      .map((p) => p.profession)
      .filter(Boolean) as string[];

    // Distance options
    const distances = [1, 3, 5, 7, 10];

    return { services, professions, distances };
  }

  private async getUserRating(
    userId: string,
  ): Promise<{ averageRating: number; reviewCount: number }> {
    // This is a placeholder. In a real app, you would query a reviews table
    // For demo purposes, returning mock data based on user ID for consistency
    const mockRatings: Record<string, { rating: number; count: number }> = {
      // You can customize ratings per user here
    };

    // Generate consistent mock rating based on user ID
    const hash = userId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const averageRating = 4.0 + (hash % 100) / 100;
    const reviewCount = 50 + (hash % 200);

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount,
    };
  }

  private async calculateDistance(
    userZipCode: string | null,
    currentZipCode: string | undefined,
    city: string | null,
    state: string | null,
  ): Promise<{ distance: number; unit: string; city: string }> {
    // This is a placeholder for actual distance calculation
    // In production, use a geocoding service like Google Maps API

    // Mock distance calculation - random between 1-20 miles for demo
    const mockDistance = Math.random() * 10 + 1;

    return {
      distance: parseFloat(mockDistance.toFixed(1)),
      unit: 'mi',
      city: city || 'Little Elm',
    };
  }

  /**
   * Format user data into ProUserDetailsDto
   * Handles address visibility and image URL formatting
   */
  private async formatProUserDetails(
    user: any,
    church: any,
  ): Promise<ProUserDetailsDto> {
    // Format avatar URL if exists
    const avatarUrl = user.avatar
      ? TanvirStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
      : null;

    // Format portfolio images URLs
    const portfolioImageUrls =
      user.portfolio_images?.map((fileName: string) =>
        TanvirStorage.url(`${appConfig().storageUrl.portfolio}/${fileName}`),
      ) || [];

    // Handle address visibility
    const shouldHideAddress = user.hide_address === true;

    // Get rating data - AWAIT here
    const ratingData = await this.getUserRating(user.id);

    // Create the DTO object
    const result: ProUserDetailsDto = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      companyName: user.company_name,
      profession: user.profession,
      rating: ratingData.averageRating,
      reviewCount: ratingData.reviewCount,
      location: {
        distance: 0, // Will be updated by caller if needed
        unit: 'mi',
        city: shouldHideAddress ? undefined : user.city || 'Little Elm',
        state: shouldHideAddress ? undefined : user.state,
        zipCode: shouldHideAddress ? undefined : user.zip_code,
        isAddressHidden: shouldHideAddress,
      },
      avatar: avatarUrl,
      description: user.description,
      businessEmail: user.business_email,
      businessPhone: user.business_phone,
      website: user.website,
      whatsappNumber: user.whatsapp_number,
      availableTime: user.available_time,
      addressLine1: shouldHideAddress ? undefined : user.address_line1,
      addressLine2: shouldHideAddress ? undefined : user.address_line2,
      state: shouldHideAddress ? undefined : user.state,
      country: shouldHideAddress ? undefined : user.country,
      businessPortfolio: user.business_portfolio,
      portfolioImages: portfolioImageUrls,
      skills:
        user.skills?.map((skill: any) => ({
          id: skill.id,
          skillName: skill.skill_name,
        })) || [],
      aboutMe: user.about_me,
      availability: user.availability,
      churchName: church?.church_name,
      workGlobally: user.work_globally || false,
      hideAddress: shouldHideAddress,
    };

    return result;
  }
}
