import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommunityUtils } from './utils/community.utils';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactPostDto } from './dto/create-react.dto';
import { StringHelper } from 'src/common/helper/string.helper';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private communityUtils: CommunityUtils,
  ) {}

  /*-----------------------------------
           POST  PART
  -----------------------------------*/

  // create community post
  async create(
    createCommunityDto: CreateCommunityDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const { community_id, title } = createCommunityDto;

    let fileName: string | null = null;
    if (image) {
      fileName = `${StringHelper.randomString(8)}${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );
    }

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
        image: fileName,
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
    communityId: string,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    // check if user is active member of the church
    const member = await this.communityUtils.getActiveChurchMember(
      communityId,
      userId,
    );

    const posts = await this.prisma.communityPost.findMany({
      where: { community_id: communityId },
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
    const community = await this.prisma.communityPost.findUnique({
      where: { id },
      select: { community_id: true, church_member_id: true, image: true },
    });

    if (!community) {
      throw new NotFoundException('Community post not found.');
    }

    // only the member who created the post can delete it
    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      community.community_id,
    );

    if (community.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the post creator can delete this post.',
      );
    }

    if (community.image) {
      await TanvirStorage.delete(
        appConfig().storageUrl.avatar + '/' + community.image,
      );
    }

    const deletedPost = await this.prisma.communityPost.delete({
      where: { id },
    });

    return {
      message: 'Community post deleted successfully.',
      data: deletedPost,
    };
  }

  /*-----------------------------------
           COMMENT  PART
  -----------------------------------*/

  // add comment to community post
  async addComment(
    postId: string,
    createCommentDto: CreateCommentDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const { comment } = createCommentDto;

    const { post, member } = await this.communityUtils.getPostWithAccess(
      postId,
      userId,
    );

    let fileName: string | null = null;
    if (image) {
      fileName = `${StringHelper.randomString(8)}${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );
    }

    const commentData = await this.prisma.communityComment.create({
      data: {
        content: comment,
        post_id: post.id,
        image: fileName,
        church_member_id: member.id,
      },
    });

    return {
      message: 'Comment added successfully.',
      data: commentData,
    };
  }

  // delete a comment
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            community: {
              select: { id: true, church_id: true },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    const member = await this.communityUtils.getActiveChurchMember(
      comment.post.community.church_id,
      userId,
    );

    if (comment.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the comment creator can delete this comment.',
      );
    }

    if (comment.image) {
      await TanvirStorage.delete(
        appConfig().storageUrl.avatar + '/' + comment.image,
      );
    }

    const deleted = await this.prisma.communityComment.delete({
      where: { id: commentId },
    });

    return {
      message: 'Comment deleted successfully.',
      data: deleted,
    };
  }

  // reply to comment
  async replyToComment(
    commentId: string,
    createCommentDto: CreateCommentDto,
    userId: string,
    image?: Express.Multer.File,
  ) {
    const comment = await this.prisma.communityComment.findUnique({
      where: {
        id: commentId,
      },
      include: {
        post: {
          include: {
            community: {
              select: {
                id: true,
                church_id: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    const member = await this.communityUtils.getActiveChurchMember(
      userId,
      comment.post.community.church_id,
    );

    let fileName: string | null = null;
    if (image) {
      fileName = `${StringHelper.randomString(8)}${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );

      const reply = await this.prisma.communityCommentReply.create({
        data: {
          content: createCommentDto.comment,
          comment_id: comment.id,
          image: fileName,
          church_member_id: member.id,
        },
        include: {
          church_member: {
            select: {
              id: true,
              church_role: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      return {
        success: true,
        message: 'Reply added successfully.',
        data: reply,
      };
    }
  }

  // delete a comment reply
  async deleteReplyToComment(replyId: string, userId: string) {
    const reply = await this.prisma.communityCommentReply.findUnique({
      where: { id: replyId },
      include: {
        comment: {
          include: {
            post: {
              include: {
                community: {
                  select: { id: true, church_id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found.');
    }

    const member = await this.communityUtils.getActiveChurchMember(
      reply.comment.post.community.church_id,
      userId,
    );

    if (reply.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the reply creator can delete this reply.',
      );
    }

    if (reply.image) {
      await TanvirStorage.delete(
        appConfig().storageUrl.avatar + '/' + reply.image,
      );
    }

    const deleted = await this.prisma.communityCommentReply.delete({
      where: { id: replyId },
    });

    return {
      message: 'Reply deleted successfully.',
      data: deleted,
    };
  }

  /*-----------------------------------
           REACT  PART
  -----------------------------------*/

  // react to community post
  async reactToPost(
    postId: string,
    reactPostDto: ReactPostDto,
    userId: string,
  ) {
    const { react_type } = reactPostDto;

    const { post, member } = await this.communityUtils.getPostWithAccess(
      postId,
      userId,
    );

    const existingReact = await this.prisma.communityPostReact.findFirst({
      where: {
        post_id: post.id,
        church_member_id: member.id,
      },
    });

    // already reacted থাকলে remove করবে
    if (existingReact) {
      await this.prisma.communityPostReact.delete({
        where: {
          id: existingReact.id,
        },
      });

      return {
        message: 'Reaction removed successfully.',
        reacted: false,
      };
    }

    const newReact = await this.prisma.communityPostReact.create({
      data: {
        post_id: post.id,
        church_member_id: member.id,
        react_type: react_type,
      },
    });

    return {
      message: 'Reaction added successfully.',
      reacted: true,
      data: newReact,
    };
  }
}
