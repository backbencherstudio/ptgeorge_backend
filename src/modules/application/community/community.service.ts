import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommunityUtils } from './utils/community.utils';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private communityUtils: CommunityUtils,
  ) {}

  // create community post
  async create(
    createCommunityDto: CreateCommunityDto, 
    userId: string,
  ) {
    
    const { community_id, title } = createCommunityDto;

    // check if user is active member of the church
    const member = await this.communityUtils.getActiveChurchMember(
      community_id,
      userId,
    );

    if (!title) {
      throw new ForbiddenException('Post title is required.');
    }


    // create community post
    const post = await this.prisma.communityPost.create({
      data: {
        title: title,
        community_id: community_id,
        church_member_id: member.id,
      },
    });

    return {
      message: 'Community post created successfully.',
      data: post,
    };
  }

  // get all community posts
  async findAll(
    userId: string, 
    paginationDto: PaginationDto,
    communityId: string
  ) {

    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

     // check if user is active member of the church
    const member = await this.communityUtils.getActiveChurchMember(
      communityId,
      userId,
    );

    const posts = await this.prisma.communityPost.findMany({
      where: { community_id: communityId},
      orderBy: { created_at: 'desc' },
      include: {
        church_member: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        comments: {
          orderBy: { created_at: 'desc' },
          include: {
            church_member: {
              include: {
                user: {
                  select: { id: true, name: true, avatar: true },
                },
              },
            },
          },
        },
        reacts: true,
        _count: { select: { comments: true, reacts: true } },
      },
      skip,
      take: perPage,
      
    });


    return {
      message: 'Community posts retrieved successfully.',
      data: posts,
    };



  }

  // delete community post
  async remove(id: string, userId: string) {
   
    const post = await this.communityUtils.getPostWithAccess(id, userId);
  
  }

}
