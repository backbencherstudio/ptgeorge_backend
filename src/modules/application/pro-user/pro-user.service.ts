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

@Injectable()
export class ProUserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllWithFilters(
    filterDto: ProUserFilterDto,
    currentUserId: string,
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
      page = 1,
      limit = 10,
    } = filterDto;
    const skip = (page - 1) * limit;

    // First, get the current user's church membership
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

    const churchId = currentUserMembership.church_id;

    // Get all PRO_USER members from the same church
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

    const proUserIds = churchMemberIds.map((m) => m.user_id);

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

    // Calculate average rating and map to DTO
    const data = await Promise.all(
      users.map(async (user) => {
        const ratingData = await this.getUserRating(user.id);
        const locationData = await this.calculateDistance(
          user.zip_code,
          userZipCode || filterDto.zipCode,
          user.city || 'Little Elm',
          user.state,
        );

        return {
          id: user.id,
          fullName: `${user.first_name} ${user.last_name}`,
          companyName: user.company_name,
          profession: user.profession,
          rating: ratingData.averageRating,
          reviewCount: ratingData.reviewCount,
          location: {
            distance: locationData.distance,
            unit: 'mi',
            city: locationData.city,
            state: user.state,
            zipCode: user.zip_code,
          },
          avatar: user.avatar,
          description: user.description,
        } as ProUserListItemDto;
      }),
    );

    // Apply distance filter if specified
    let filteredData = data;
    if (distance) {
      filteredData = data.filter((item) => item.location.distance <= distance);
    }

    // Apply rating filter if specified
    if (minRating) {
      filteredData = filteredData.filter((item) => item.rating >= minRating);
    }

    return {
      data: filteredData,
      total: filteredData.length,
      page,
      limit,
      totalPages: Math.ceil(filteredData.length / limit),
    };
  }

  async findOne(id: string, currentUserId: string): Promise<ProUserDetailsDto> {
    // First, get the current user's church membership
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
      },
    });

    if (!proUserMembership) {
      throw new NotFoundException(
        `Pro user with ID ${id} not found in your church`,
      );
    }

    const user = proUserMembership.user;
    const ratingData = await this.getUserRating(user.id);

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      companyName: user.company_name,
      profession: user.profession,
      rating: ratingData.averageRating,
      reviewCount: ratingData.reviewCount,
      location: {
        distance: 0,
        unit: 'mi',
        city: user.city || 'Little Elm',
        state: user.state,
        zipCode: user.zip_code,
      },
      avatar: user.avatar,
      description: user.description,
      businessEmail: user.business_email,
      businessPhone: user.business_phone,
      website: user.website,
      whatsappNumber: user.whatsapp_number,
      availableTime: user.available_time,
      addressLine1: user.address_line1,
      addressLine2: user.address_line2,
      state: user.state,
      country: user.country,
      businessPortfolio: user.business_portfolio,
      portfolioImages: user.portfolio_images,
      skills: user.skills.map((skill) => ({
        id: skill.id,
        skillName: skill.skill_name,
      })),
      aboutMe: user.about_me,
      availability: user.availability,
    };
  }

  async getFilterOptions(currentUserId: string) {
    // Get current user's church
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

    // Get all PRO_USER members from the same church
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

    const proUserIds = churchMemberIds.map((m) => m.user_id);

    if (proUserIds.length === 0) {
      return { services: [], professions: [], distances: [1, 3, 5, 7, 10] };
    }

    // Get unique categories (services) from pro users in this church
    const categoriesResult = await this.prisma.user.findMany({
      where: {
        id: { in: proUserIds },
        type: 'PRO_USER',
        status: 'ACTIVE',
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    });
    const services = categoriesResult
      .map((c) => c.category)
      .filter(Boolean) as string[];

    // Get unique professions from pro users in this church
    const professionsResult = await this.prisma.user.findMany({
      where: {
        id: { in: proUserIds },
        type: 'PRO_USER',
        status: 'ACTIVE',
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
}
