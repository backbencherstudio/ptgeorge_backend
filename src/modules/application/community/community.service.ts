// community.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { CursorPaginationDto } from './dto/cursor-pagination.dto';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private communityUtils: CommunityUtils,
  ) {}

  /* -----------------------------------
     Helper Methods
  ----------------------------------- */

  private async getUserChurchId(userId: string): Promise<string> {
    const membership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: {
        church_id: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not an active member of any church. Please join a church first.',
      );
    }

    return membership.church_id;
  }

  private async getUserChurchMember(userId: string, churchId: string) {
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

  private async getUserRoleInChurch(
    userId: string,
    churchId: string,
  ): Promise<string | null> {
    const roleAssignment = await this.prisma.roleUser.findFirst({
      where: {
        user_id: userId,
        churchId: churchId,
      },
      include: {
        role: {
          select: {
            title: true,
            name: true,
          },
        },
      },
    });

    return (
      roleAssignment?.role?.title ||
      roleAssignment?.role?.name ||
      'Church Member'
    );
  }

  private getFullImageUrl(fileName: string, type: string): string | null {
    if (!fileName) return null;
    if (fileName.startsWith('http')) return fileName;
    return TanvirStorage.url(`${appConfig().storageUrl[type]}/${fileName}`);
  }

  private getFullImageUrls(fileNames: string[], type: string): string[] {
    if (!fileNames || fileNames.length === 0) return [];
    return fileNames.map((fileName) => this.getFullImageUrl(fileName, type));
  }

  private async uploadPostImages(
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const uploadedFileNames: string[] = [];
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.originalname}. Only JPEG, PNG, JPG, WEBP, GIF are allowed`,
        );
      }

      const fileExtension = file.originalname.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

      await TanvirStorage.put(
        `${appConfig().storageUrl.post}/${fileName}`,
        file.buffer,
      );

      uploadedFileNames.push(fileName);
    }

    return uploadedFileNames;
  }

  private async uploadCommentImage(
    file: Express.Multer.File,
  ): Promise<string | null> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.originalname}. Only JPEG, PNG, JPG, WEBP, GIF are allowed`,
      );
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `comment_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const commentPath = appConfig().storageUrl.comment || '/comment';
    await TanvirStorage.put(`${commentPath}/${fileName}`, file.buffer);

    return fileName;
  }

  private async uploadReplyImage(
    file: Express.Multer.File,
  ): Promise<string | null> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.originalname}. Only JPEG, PNG, JPG, WEBP, GIF are allowed`,
      );
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `reply_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const replyPath = appConfig().storageUrl.reply || '/reply';
    await TanvirStorage.put(`${replyPath}/${fileName}`, file.buffer);

    return fileName;
  }

  private async deleteImage(fileName: string, type: string): Promise<void> {
    try {
      if (fileName) {
        const storagePath = `${appConfig().storageUrl[type]}/${fileName}`;
        await TanvirStorage.delete(storagePath);
      }
    } catch (error) {
      console.error(`Failed to delete ${type} image:`, error);
    }
  }

  private async deleteMultipleImages(
    fileNames: string[],
    type: string,
  ): Promise<void> {
    for (const fileName of fileNames) {
      await this.deleteImage(fileName, type);
    }
  }

  /* -----------------------------------
     POST  (ChurchPost)
  ----------------------------------- */

  async createPost(
    createPostDto: CreateCommunityPostDto,
    userId: string,
    images?: Express.Multer.File[],
  ) {
    const { content } = createPostDto;

    if (!content && (!images || images.length === 0)) {
      throw new BadRequestException('Post content or image is required.');
    }

    const churchId = await this.getUserChurchId(userId);
    const member = await this.getUserChurchMember(userId, churchId);
    const userRole = await this.getUserRoleInChurch(userId, churchId);

    let imageFileNames: string[] = [];
    if (images && images.length > 0) {
      imageFileNames = await this.uploadPostImages(images);
    }

    const post = await this.prisma.churchPost.create({
      data: {
        content: content || '',
        images: imageFileNames,
        church_id: churchId,
        church_member_id: member.id,
      },
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
    });

    const formattedPost = {
      id: post.id,
      content: post.content,
      images: this.getFullImageUrls(post.images, 'post'),
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: {
        id: post.church_member.user.id,
        name: `${post.church_member.user.first_name} ${post.church_member.user.last_name}`,
        avatar: this.getFullImageUrl(post.church_member.user.avatar, 'avatar'),
        role: member.church_role || userRole,
      },
      stats: {
        comments_count: 0,
        reacts_count: 0,
      },
      myreact: false,
      is_reacted: false,
      user_reacted: null,
    };

    return {
      success: true,
      message: 'Church post created successfully.',
      data: formattedPost,
    };
  }

  async findAllPosts(
    userId: string, 
    cursorPaginationDto: CursorPaginationDto
  ) {
    const { limit = 10, cursor, order = 'desc' } = cursorPaginationDto;
    const churchId = await this.getUserChurchId(userId);

    // Build the where clause
    const where = {
      church_id: churchId,
      deleted_at: null,
    };

    // Build the orderBy - Fix: Use proper Prisma sort order
    const orderBy = [
      { created_at: order as 'asc' | 'desc' },
      { id: order as 'asc' | 'desc' },
    ];

    let cursorCondition = {};
    if (cursor) {
      // Get the cursor post to use its created_at and id for pagination
      const cursorPost = await this.prisma.churchPost.findUnique({
        where: { id: cursor },
        select: { created_at: true },
      });

      if (cursorPost) {
        if (order === 'desc') {
          cursorCondition = {
            OR: [
              { created_at: { lt: cursorPost.created_at } },
              {
                created_at: { equals: cursorPost.created_at },
                id: { lt: cursor },
              },
            ],
          };
        } else {
          cursorCondition = {
            OR: [
              { created_at: { gt: cursorPost.created_at } },
              {
                created_at: { equals: cursorPost.created_at },
                id: { gt: cursor },
              },
            ],
          };
        }
      }
    }

    // Get posts with cursor pagination
    const posts = await this.prisma.churchPost.findMany({
      where: {
        ...where,
        ...cursorCondition,
      },
      orderBy,
      take: limit,
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

    // Get next cursor (last post's ID)
    const nextCursor =
      posts.length === limit ? posts[posts.length - 1].id : null;

    if (posts.length === 0) {
      return {
        success: true,
        message: 'Church posts retrieved successfully.',
        data: [],
        pagination: {
          limit,
          next_cursor: null,
          has_more: false,
        },
      };
    }

    const postIds = posts.map((p) => p.id);
    const reactCountsArray = await this.communityUtils.getReactCounts(postIds);

    // Create a map of post_id to reaction counts
    const reactCountsMap = new Map();
    reactCountsArray.forEach((item: any) => {
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
        church_member: {
          user_id: userId,
          church_id: churchId,
        },
      },
      select: {
        post_id: true,
        react_type: true,
      },
    });

    const userReactionMap = new Map(
      userReactions.map((r) => [r.post_id, r.react_type]),
    );

    const formattedPosts = posts.map((post) => {
      // Since we included church_member, we can access it directly
      const authorRole = post.church_member.church_role || 'Church Member';
      const postReactions = reactCountsMap.get(post.id) || { LIKE: 0, LOVE: 0 };

      return {
        id: post.id,
        content: post.content,
        images: this.getFullImageUrls(post.images, 'post'),
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          id: post.church_member.user.id,
          name: `${post.church_member.user.first_name} ${post.church_member.user.last_name}`,
          avatar: this.getFullImageUrl(
            post.church_member.user.avatar,
            'avatar',
          ),
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

    return {
      success: true,
      message: 'Church posts retrieved successfully.',
      data: formattedPosts,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_more: nextCursor !== null,
      },
    };
  }

  async getPostById(
    postId: string, 
    userId: string
  ) {
    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId, deleted_at: null },
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

    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    await this.getUserChurchMember(userId, post.church_id);

    const reactCountsArray = await this.communityUtils.getReactCounts([
      post.id,
    ]);

    // Parse reaction counts
    let likeCount = 0;
    let loveCount = 0;

    reactCountsArray.forEach((item: any) => {
      if (item.react_type === 'LIKE') {
        likeCount = item._count._all;
      } else if (item.react_type === 'LOVE') {
        loveCount = item._count._all;
      }
    });

    // Get user's reaction
    const userReaction = await this.prisma.churchPostReact.findFirst({
      where: {
        post_id: postId,
        church_member: {
          user_id: userId,
          church_id: post.church_id,
        },
      },
      select: { react_type: true },
    });

    const authorRole = post.church_member.church_role || 'Church Member';

    const formattedPost = {
      id: post.id,
      content: post.content,
      images: this.getFullImageUrls(post.images, 'post'),
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: {
        id: post.church_member.user.id,
        name: `${post.church_member.user.first_name} ${post.church_member.user.last_name}`,
        avatar: this.getFullImageUrl(post.church_member.user.avatar, 'avatar'),
        role: authorRole,
      },
      stats: {
        comments_count: post._count.comments,
        reacts_count: post._count.reacts,
        reaction_counts: {
          LIKE: likeCount,
          LOVE: loveCount,
        },
      },
      myreact: !!userReaction?.react_type,
      is_reacted: !!userReaction?.react_type,
      user_reacted: userReaction?.react_type || null,
      comments: post.comments.map((comment) => {
        const commentAuthorRole =
          comment.church_member.church_role || 'Church Member';
        return {
          id: comment.id,
          content: comment.content,
          image: this.getFullImageUrl(comment.image, 'comment'),
          created_at: comment.created_at,
          author: {
            id: comment.church_member.user.id,
            name: `${comment.church_member.user.first_name} ${comment.church_member.user.last_name}`,
            avatar: this.getFullImageUrl(
              comment.church_member.user.avatar,
              'avatar',
            ),
            role: commentAuthorRole,
          },
          replies: comment.replies.map((reply) => {
            const replyAuthorRole =
              reply.church_member.church_role || 'Church Member';
            return {
              id: reply.id,
              content: reply.content,
              image: this.getFullImageUrl(reply.image, 'reply'),
              created_at: reply.created_at,
              author: {
                id: reply.church_member.user.id,
                name: `${reply.church_member.user.first_name} ${reply.church_member.user.last_name}`,
                avatar: this.getFullImageUrl(
                  reply.church_member.user.avatar,
                  'avatar',
                ),
                role: replyAuthorRole,
              },
            };
          }),
        };
      }),
    };

    return {
      success: true,
      message: 'Post retrieved successfully.',
      data: formattedPost,
    };
  }

  async removePost(
    postId: string, 
    userId: string
  ) {
    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId },
      select: {
        church_id: true,
        church_member_id: true,
        images: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Church post not found.');
    }

    const member = await this.getUserChurchMember(userId, post.church_id);

    if (post.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the post creator can delete this post.',
      );
    }

    const comments = await this.prisma.churchComment.findMany({
      where: { post_id: postId },
      select: {
        id: true,
        image: true,
        replies: {
          select: { image: true },
        },
      },
    });

    if (post.images && post.images.length > 0) {
      await this.deleteMultipleImages(post.images, 'post');
    }

    for (const comment of comments) {
      if (comment.image) {
        await this.deleteImage(comment.image, 'comment');
      }
      for (const reply of comment.replies) {
        if (reply.image) {
          await this.deleteImage(reply.image, 'reply');
        }
      }
    }

    for (const comment of comments) {
      await this.prisma.churchCommentReply.deleteMany({
        where: { comment_id: comment.id },
      });
    }

    await this.prisma.churchComment.deleteMany({
      where: { post_id: postId },
    });

    await this.prisma.churchPostReact.deleteMany({
      where: { post_id: postId },
    });

    const deleted = await this.prisma.churchPost.delete({
      where: { id: postId },
    });

    return {
      success: true,
      message: 'Church post deleted successfully.',
      data: deleted,
    };
  }

  /* -----------------------------------
     COMMENT (ChurchComment)
  ----------------------------------- */

  async addComment(
    postId: string,
    dto: CreateCommentDto,
    userId: string,
    images?: Express.Multer.File[],
  ) {
    const { comment } = dto;
    if (!comment && (!images || images.length === 0)) {
      throw new BadRequestException('Comment text or image is required.');
    }

    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId, deleted_at: null },
      select: { church_id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    const member = await this.getUserChurchMember(userId, post.church_id);
    const userRole = await this.getUserRoleInChurch(userId, post.church_id);

    let imageFileName: string | null = null;
    if (images && images.length > 0) {
      imageFileName = await this.uploadCommentImage(images[0]);
    }

    const newComment = await this.prisma.churchComment.create({
      data: {
        content: comment || '',
        image: imageFileName,
        post_id: postId,
        church_member_id: member.id,
      },
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
    });

    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      image: this.getFullImageUrl(newComment.image, 'comment'),
      created_at: newComment.created_at,
      author: {
        id: newComment.church_member.user.id,
        name: `${newComment.church_member.user.first_name} ${newComment.church_member.user.last_name}`,
        avatar: this.getFullImageUrl(
          newComment.church_member.user.avatar,
          'avatar',
        ),
        role: member.church_role || userRole,
      },
    };

    return {
      success: true,
      message: 'Comment added successfully.',
      data: formattedComment,
    };
  }

  async getCommentsForPost(
    postId: string, userId: string, paginationDto: PaginationDto) {
    

    const { page = 1, perPage = 10 } = paginationDto || {};

    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId, deleted_at: null },
      select: { church_id: true },
    });

    if (!post) throw new NotFoundException('Post not found.');

    await this.getUserChurchMember(userId, post.church_id);

    const skip = (page - 1) * perPage;

    const [comments, total] = await Promise.all([
      this.prisma.churchComment.findMany({
        where: { post_id: postId },
        orderBy: { created_at: 'desc' },
        skip,
        take: perPage,
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
      }),
      this.prisma.churchComment.count({ where: { post_id: postId } }),
    ]);

    const formatted = comments.map((comment) => {
      const authorRole = comment.church_member.church_role || 'Church Member';
      return {
        id: comment.id,
        content: comment.content,
        image: this.getFullImageUrl(comment.image, 'comment'),
        created_at: comment.created_at,
        author: {
          id: comment.church_member.user.id,
          name: `${comment.church_member.user.first_name} ${comment.church_member.user.last_name}`,
          avatar: this.getFullImageUrl(comment.church_member.user.avatar, 'avatar'),
          role: authorRole,
        },
        // replies omitted by request
      };
    });

    return {
      success: true,
      message: 'Comments retrieved successfully.',
      data: formatted,
      pagination: {
        page,
        perPage,
        total,
        has_more: skip + comments.length < total,
      },
    };

  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.churchComment.findUnique({
      where: { id: commentId },
      include: {
        post: { select: { church_id: true } },
      },
    });

    if (!comment) throw new NotFoundException('Comment not found.');

    const member = await this.getUserChurchMember(
      userId,
      comment.post.church_id,
    );

    if (comment.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the comment creator can delete this comment.',
      );
    }

    const replies = await this.prisma.churchCommentReply.findMany({
      where: { comment_id: commentId },
      select: { image: true },
    });

    if (comment.image) {
      await this.deleteImage(comment.image, 'comment');
    }

    for (const reply of replies) {
      if (reply.image) {
        await this.deleteImage(reply.image, 'reply');
      }
    }

    await this.prisma.churchCommentReply.deleteMany({
      where: { comment_id: commentId },
    });

    const deleted = await this.prisma.churchComment.delete({
      where: { id: commentId },
    });

    return {
      success: true,
      message: 'Comment deleted successfully.',
      data: deleted,
    };
  }

  /* -----------------------------------
     REPLY (ChurchCommentReply)
  ----------------------------------- */

  async replyToComment(
    commentId: string,
    dto: CreateCommentDto,
    userId: string,
    images?: Express.Multer.File[],
  ) {
    const { comment } = dto;
    if (!comment && (!images || images.length === 0)) {
      throw new BadRequestException('Reply text or image is required.');
    }

    const commentData = await this.prisma.churchComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { church_id: true } } },
    });

    if (!commentData) throw new NotFoundException('Comment not found.');

    const member = await this.getUserChurchMember(
      userId,
      commentData.post.church_id,
    );
    const userRole = await this.getUserRoleInChurch(
      userId,
      commentData.post.church_id,
    );

    let imageFileName: string | null = null;
    if (images && images.length > 0) {
      imageFileName = await this.uploadReplyImage(images[0]);
    }

    const reply = await this.prisma.churchCommentReply.create({
      data: {
        content: comment || '',
        image: imageFileName,
        comment_id: commentId,
        church_member_id: member.id,
      },
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
    });

    const formattedReply = {
      id: reply.id,
      content: reply.content,
      image: this.getFullImageUrl(reply.image, 'reply'),
      created_at: reply.created_at,
      author: {
        id: reply.church_member.user.id,
        name: `${reply.church_member.user.first_name} ${reply.church_member.user.last_name}`,
        avatar: this.getFullImageUrl(reply.church_member.user.avatar, 'avatar'),
        role: member.church_role || userRole,
      },
    };

    return {
      success: true,
      message: 'Reply added successfully.',
      data: formattedReply,
    };
  }

  async deleteReplyToComment(
    replyId: string, 
    userId: string) {
    const reply = await this.prisma.churchCommentReply.findUnique({
      where: { id: replyId },
      include: {
        comment: {
          include: { post: { select: { church_id: true } } },
        },
      },
    });

    if (!reply) throw new NotFoundException('Reply not found.');

    const member = await this.getUserChurchMember(
      userId,
      reply.comment.post.church_id,
    );

    if (reply.church_member_id !== member.id) {
      throw new ForbiddenException(
        'Only the reply creator can delete this reply.',
      );
    }

    if (reply.image) {
      await this.deleteImage(reply.image, 'reply');
    }

    const deleted = await this.prisma.churchCommentReply.delete({
      where: { id: replyId },
    });

    return {
      success: true,
      message: 'Reply deleted successfully.',
      data: deleted,
    };
  }

  /* -----------------------------------
     REACT (ChurchPostReact)
  ----------------------------------- */

  async reactToPost(
    postId: string, 
    dto: ReactPostDto, 
    userId: string
  ) {
    const { react_type } = dto;

    const post = await this.prisma.churchPost.findUnique({
      where: { id: postId, deleted_at: null },
      select: { church_id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    const member = await this.getUserChurchMember(userId, post.church_id);

    const existing = await this.prisma.churchPostReact.findFirst({
      where: { post_id: postId, church_member_id: member.id },
    });

    if (existing) {
      await this.prisma.churchPostReact.delete({ where: { id: existing.id } });
      return {
        success: true,
        message: 'Reaction removed successfully.',
        reacted: false,
      };
    }

    const newReact = await this.prisma.churchPostReact.create({
      data: {
        post_id: postId,
        church_member_id: member.id,
        react_type,
      },
    });

    return {
      success: true,
      message: 'Reaction added successfully.',
      reacted: true,
      data: newReact,
    };
  }



}
