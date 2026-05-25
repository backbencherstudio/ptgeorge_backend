import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommunityUtils {
  constructor(private readonly prisma: PrismaService) {}

  // ---- get active church member ----------
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
        'You are not an active member of this church.',
      );
    }

    return member;
  }

  // ------ get church with access check (replaces getCommunityWithAccess) ------
  async getChurchWithAccess(churchId: string, userId: string) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { id: true, church_name: true },
    });

    if (!church) {
      throw new NotFoundException('Church not found.');
    }

    const member = await this.getActiveChurchMember(userId, church.id);

    return { church, member };
  }

  // ------ get post with access check (now ChurchPost) ------
  async getPostWithAccess(postId: string, userId: string) {
    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId },
      include: {
        church: {
          select: { id: true, church_name: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Church post not found.');
    }

    const member = await this.getActiveChurchMember(userId, post.church_id);

    return { post, member };
  }

  // ------ get my active member ids ------
  async getMyActiveMemberIds(userId: string) {
    const memberships = await this.prisma.churchMember.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: { id: true },
    });

    return memberships.map((member) => member.id);
  }

  // ------ check if a specific membership id belongs to user ------
  async isMyActiveMember(memberId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.churchMember.findFirst({
      where: {
        id: memberId,
        user_id: userId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: { id: true },
    });
    if (member) return true;

    throw new ForbiddenException(
      'You are not an active member of this church.',
    );
  }

  // ------ build post access where condition (for ChurchPost) ------
  buildPostAccessWhere(userId: string, churchId?: string) {
    const whereCondition: any = {
      church: {
        members: {
          some: {
            user_id: userId,
            status: 'ACTIVE',
            deleted_at: null,
          },
        },
      },
    };

    if (churchId) {
      whereCondition.church_id = churchId;
    }

    return whereCondition;
  }

  // ------ pagination helper ------
  getPagination(page = 1, limit = 10) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;

    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }

  // ------ get react counts for multiple posts (ChurchPostReact) ------
  async getReactCounts(postIds: string[]) {
    if (!postIds.length) return [];

    return this.prisma.churchPostReact.groupBy({
      by: ['post_id', 'react_type'],
      where: { post_id: { in: postIds } },
      _count: { _all: true },
    });
  }

  // ------ format posts with react counts ------
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
