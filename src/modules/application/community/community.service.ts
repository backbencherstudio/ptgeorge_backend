import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommunityUtils } from './utils/community.utils';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactPostDto } from './dto/create-react.dto';
import { StringHelper } from 'src/common/helper/string.helper';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { CreateCommunityPostDto } from './dto/create-community.dto';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private communityUtils: CommunityUtils,
  ) {}

  /* -----------------------------------
     POST  (ChurchPost)
  ----------------------------------- */

  async createPost(
    createPostDto: CreateCommunityPostDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const { church_id, title, content } = createPostDto;

    if (!title && !content) {
      throw new ForbiddenException('Post title or content is required.');
    }

    let fileName: string | null = null;
    if (image) {
      fileName = `${StringHelper.randomString(8)}${image.originalname}`;
      await TanvirStorage.put(
        `${appConfig().storageUrl.avatar}/${fileName}`,
        image.buffer,
      );
    }

    // verify user is an active member of this church
    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      church_id,
    );

    const post = await this.prisma.churchPost.create({
      data: {
        content: content || '',
        image: fileName,
        church_id,
        church_member_id: member.id,
      },
    });

    return {
      message: 'Church post created successfully.',
      data: post,
    };
  }

  async findAllPosts(
    userId: string,
    paginationDto: PaginationDto,
    churchId: string,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    // verify membership
    await this.communityUtils.getActiveChurchMember(userId, churchId);

    const posts = await this.prisma.churchPost.findMany({
      where: { church_id: churchId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: {
        church_member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        comments: {
          orderBy: { created_at: 'desc' },
          include: {
            church_member: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            replies: {
              include: {
                church_member: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        avatar: true,
                        first_name: true,
                        last_name: true,
                      },
                    },
                  },
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

    // get aggregated react counts (optional, but can be used for formatting)
    const postIds = posts.map((p) => p.id);
    const reactCounts = await this.communityUtils.getReactCounts(postIds);
    const formattedPosts = this.communityUtils.formatPostsWithReactCounts(
      posts,
      reactCounts,
    );

    return {
      message: 'Church posts retrieved successfully.',
      data: formattedPosts,
      meta: { page, perPage, total: posts.length },
    };
  }

  async removePost(postId: string, userId: string) {
    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId },
      select: { church_id: true, church_member_id: true, image: true },
    });

    if (!post) {
      throw new NotFoundException('Church post not found.');
    }

    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      post.church_id,
    );

    if (post.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the post creator can delete this post.',
      );
    }

    if (post.image) {
      await TanvirStorage.delete(
        `${appConfig().storageUrl.avatar}/${post.image}`,
      );
    }

    const deleted = await this.prisma.churchPost.delete({
      where: { id: postId },
    });

    return { message: 'Church post deleted successfully.', data: deleted };
  }

  /* -----------------------------------
     COMMENT (ChurchComment)
  ----------------------------------- */

  async addComment(
    postId: string,
    dto: CreateCommentDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const { comment } = dto;
    if (!comment) throw new ForbiddenException('Comment text is required.');

    const { post, member } = await this.communityUtils.getPostWithAccess(
      postId,
      userId,
    );

    let fileName: string | null = null;
    if (image) {
      fileName = `${StringHelper.randomString(8)}${image.originalname}`;
      await TanvirStorage.put(
        `${appConfig().storageUrl.avatar}/${fileName}`,
        image.buffer,
      );
    }

    const newComment = await this.prisma.churchComment.create({
      data: {
        content: comment,
        image: fileName,
        post_id: post.id,
        church_member_id: member.id,
      },
      include: {
        church_member: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    return { message: 'Comment added successfully.', data: newComment };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.churchComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { church_id: true } } },
    });

    if (!comment) throw new NotFoundException('Comment not found.');

    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      comment.post.church_id,
    );

    if (comment.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the comment creator can delete this comment.',
      );
    }

    if (comment.image) {
      await TanvirStorage.delete(
        `${appConfig().storageUrl.avatar}/${comment.image}`,
      );
    }

    const deleted = await this.prisma.churchComment.delete({
      where: { id: commentId },
    });
    return { message: 'Comment deleted successfully.', data: deleted };
  }

  /* -----------------------------------
     REPLY (ChurchCommentReply)
  ----------------------------------- */

  async replyToComment(
    commentId: string,
    dto: CreateCommentDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const comment = await this.prisma.churchComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { church_id: true } } },
    });

    if (!comment) throw new NotFoundException('Comment not found.');

    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      comment.post.church_id,
    );

    let fileName: string | null = null;
    if (image) {
      fileName = `${StringHelper.randomString(8)}${image.originalname}`;
      await TanvirStorage.put(
        `${appConfig().storageUrl.avatar}/${fileName}`,
        image.buffer,
      );
    }

    const reply = await this.prisma.churchCommentReply.create({
      data: {
        content: dto.comment,
        image: fileName,
        comment_id: comment.id,
        church_member_id: member.id,
      },
      include: {
        church_member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return { success: true, message: 'Reply added successfully.', data: reply };
  }

  async deleteReplyToComment(replyId: string, userId: string) {
    const reply = await this.prisma.churchCommentReply.findUnique({
      where: { id: replyId },
      include: {
        comment: {
          include: { post: { select: { church_id: true } } },
        },
      },
    });

    if (!reply) throw new NotFoundException('Reply not found.');

    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      reply.comment.post.church_id,
    );

    if (reply.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the reply creator can delete this reply.',
      );
    }

    if (reply.image) {
      await TanvirStorage.delete(
        `${appConfig().storageUrl.avatar}/${reply.image}`,
      );
    }

    const deleted = await this.prisma.churchCommentReply.delete({
      where: { id: replyId },
    });
    return { message: 'Reply deleted successfully.', data: deleted };
  }

  /* -----------------------------------
     REACT (ChurchPostReact)
  ----------------------------------- */

  async reactToPost(postId: string, dto: ReactPostDto, userId: string) {
    const { react_type } = dto;
    const { post, member } = await this.communityUtils.getPostWithAccess(
      postId,
      userId,
    );

    const existing = await this.prisma.churchPostReact.findFirst({
      where: { post_id: post.id, church_member_id: member.id },
    });

    if (existing) {
      await this.prisma.churchPostReact.delete({ where: { id: existing.id } });
      return { message: 'Reaction removed successfully.', reacted: false };
    }

    const newReact = await this.prisma.churchPostReact.create({
      data: { post_id: post.id, church_member_id: member.id, react_type },
    });

    return {
      message: 'Reaction added successfully.',
      reacted: true,
      data: newReact,
    };
  }
}
