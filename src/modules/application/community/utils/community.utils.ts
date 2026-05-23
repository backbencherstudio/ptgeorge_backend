import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommunityUtils {
 
  constructor(private readonly prisma: PrismaService) {}

  // ----  get active church member ----------
  async getActiveChurchMember(userId: string, churchId: string) {
    const member = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        church_id: churchId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You are not an active member of this church community.',
      );
    }

    return member;
  }

  //  ------  get community with access check ------
  async getCommunityWithAccess(communityId: string, userId: string) {
    const community = await this.prisma.churchCommunity.findUnique({
      where: {
        id: communityId,
      },
      select: {
        id: true,
        church_id: true,
        community_name: true,
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const member = await this.getActiveChurchMember(
      userId,
      community.church_id,
    );

    return {
      community,
      member,
    };
  }


  //  ------  get post with access check ------
  async getPostWithAccess(postId: string, userId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: {
        id: postId,
      },
      include: {
        community: {
          select: {
            id: true,
            church_id: true,
            community_name: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Community post not found.');
    }

    const member = await this.getActiveChurchMember(
      userId,
      post.community.church_id,
    );

    return {
      post,
      member,
    };
  }

  // ------  get my active member ids ------
  async getMyActiveMemberIds(userId: string) {
    const memberships = await this.prisma.churchMember.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });

    return memberships.map((member) => member.id);
  }

  // ------  check if a specific membership id 
  async isMyActiveMember(
    memberId: string, 
    userId: string
  ): Promise<boolean> {
 
    const member = await this.prisma.churchMember.findFirst({
      where: {
        id: memberId,
        user_id: userId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (member) return true;

    throw new ForbiddenException(
      'You are not an active member of this church community.',
    );
  }

 
  // ------  build post access where condition ------
  buildPostAccessWhere(userId: string, communityId?: string) {
    const whereCondition: any = {
      community: {
        church: {
          members: {
            some: {
              user_id: userId,
              status: 'ACTIVE',
              deleted_at: null,
            },
          },
        },
      },
    };

    if (communityId) {
      whereCondition.community_id = communityId;
    }

    return whereCondition;
  }

  // ------  pagination helper ------
  getPagination(page = 1, limit = 10) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;

    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }

  // ------  get react counts for multiple posts ------
  async getReactCounts(postIds: string[]) {
    if (!postIds.length) {
      return [];
    }

    return this.prisma.communityPostReact.groupBy({
      by: ['post_id', 'react_type'],
      where: {
        post_id: {
          in: postIds,
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  // ------  format posts with react counts ------
  formatPostsWithReactCounts(posts: any[], reactCounts: any[]) {
    return posts.map((post) => {
      const likeCount =
        reactCounts.find(
          (item) => item.post_id === post.id && item.react_type === 'LIKE',
        )?._count._all || 0;

      const loveCount =
        reactCounts.find(
          (item) => item.post_id === post.id && item.react_type === 'LOVE',
        )?._count._all || 0;

      return {
        ...post,
        my_react: post.reacts?.[0]?.react_type || null,
        like_count: likeCount,
        love_count: loveCount,
        react_count: likeCount + loveCount,
      };
    });
  }
}