import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  MarkHelpfulDto,
  CreateReviewReplyDto,
} from './dto/review.dto';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { ReviewStatus, UserType } from 'prisma/generated/enums';

@Injectable()
export class ProUserReviewService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // HELPER METHODS FOR IMAGE UPLOADS
  // ============================================

  private getFullImageUrl(
    fileName: string | null,
    type: string,
  ): string | null {
    if (!fileName) return null;
    if (fileName.startsWith('http')) return fileName;

    const baseUrl = appConfig().app.url;
    return `${baseUrl}/public/storage${appConfig().storageUrl[type]}/${fileName}`;
  }

  private async uploadReviewImage(file: Express.Multer.File): Promise<string> {
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
    const fileName = `review_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const reviewPath = appConfig().storageUrl.review || '/review';
    await TanvirStorage.put(`${reviewPath}/${fileName}`, file.buffer);

    return fileName;
  }

  private async uploadReviewImages(
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const uploadedFileNames: string[] = [];
    for (const file of files) {
      const fileName = await this.uploadReviewImage(file);
      uploadedFileNames.push(fileName);
    }
    return uploadedFileNames;
  }

  private async uploadReplyImage(file: Express.Multer.File): Promise<string> {
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

  private async deleteImage(
    fileName: string | null,
    type: string,
  ): Promise<void> {
    if (!fileName) return;
    try {
      const storagePath = `${appConfig().storageUrl[type]}/${fileName}`;
      await TanvirStorage.delete(storagePath);
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

  // ============================================
  // REVIEW CRUD OPERATIONS
  // ============================================

  async createReview(
    proUserId: string,
    reviewerId: string,
    dto: CreateReviewDto,
    images?: Express.Multer.File[],
  ) {
    // Check if pro user exists and is actually a PRO_USER
    const proUser = await this.prisma.user.findFirst({
      where: {
        id: proUserId,
        type: UserType.PRO_USER,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (!proUser) {
      throw new NotFoundException('Professional user not found');
    }

    // Check if reviewer exists and is not a PRO_USER
    // const reviewer = await this.prisma.user.findFirst({
    //   where: {
    //     id: reviewerId,
    //     type: { not: UserType.PRO_USER },
    //     status: 'ACTIVE',
    //     deleted_at: null,
    //   },
    // });

    // if (!reviewer) {
    //   throw new ForbiddenException('Only regular users can write reviews');
    // }

    // Check if reviewer is in the same church as the pro user
    const reviewerMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: reviewerId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    const proUserMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: proUserId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (
      !reviewerMembership ||
      !proUserMembership ||
      reviewerMembership.church_id !== proUserMembership.church_id
    ) {
      throw new ForbiddenException(
        'You can only review professionals from your church',
      );
    }

    // Check if already reviewed
    const existingReview = await this.prisma.review.findUnique({
      where: {
        reviewer_id_reviewed_user_id: {
          reviewer_id: reviewerId,
          reviewed_user_id: proUserId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this professional',
      );
    }

    // Upload images if any
    let uploadedImageNames: string[] = [];
    if (images && images.length > 0) {
      uploadedImageNames = await this.uploadReviewImages(images);
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        images: uploadedImageNames,
        reviewer_id: reviewerId,
        reviewed_user_id: proUserId,
        church_id: reviewerMembership.church_id,
        status: ReviewStatus.PUBLISHED,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        helpful_votes: true,
      },
    });

    // Create notification for pro user
    await this.createReviewNotification(proUserId, reviewerId, review.id);

    return {
      success: true,
      message: 'Review submitted successfully',
      data: this.formatReview(review),
    };
  }

  async getProUserReviews(
    proUserId: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const proUser = await this.prisma.user.findFirst({
      where: {
        id: proUserId,
        type: UserType.PRO_USER,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (!proUser) {
      throw new NotFoundException('Professional user not found');
    }

    const currentUserMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: currentUserId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    const proUserMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: proUserId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (
      !currentUserMembership ||
      !proUserMembership ||
      currentUserMembership.church_id !== proUserMembership.church_id
    ) {
      throw new ForbiddenException('Access denied');
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          reviewed_user_id: proUserId,
          status: ReviewStatus.PUBLISHED,
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar: true,
            },
          },
          helpful_votes: true,
          replies: {
            where: { deleted_at: null },
            include: {
              reply_by: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { created_at: 'asc' },
          },
        },
      }),
      this.prisma.review.count({
        where: {
          reviewed_user_id: proUserId,
          status: ReviewStatus.PUBLISHED,
          deleted_at: null,
        },
      }),
    ]);

    const reviewsWithUserVotes = await Promise.all(
      reviews.map(async (review) => {
        const userVote = await this.prisma.reviewHelpfulVote.findUnique({
          where: {
            review_id_user_id: {
              review_id: review.id,
              user_id: currentUserId,
            },
          },
        });

        return {
          ...this.formatReview(review),
          is_helpful_by_current_user: !!userVote,
        };
      }),
    );

    const ratingAggregate = await this.prisma.review.aggregate({
      where: {
        reviewed_user_id: proUserId,
        status: ReviewStatus.PUBLISHED,
        deleted_at: null,
      },
      _avg: { rating: true },
      _count: true,
    });

    return {
      success: true,
      message: 'Reviews fetched successfully',
      data: {
        reviews: reviewsWithUserVotes,
        average_rating: ratingAggregate._avg.rating || 0,
        total_reviews: ratingAggregate._count,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async updateReview(reviewId: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        reviewer_id: userId,
        deleted_at: null,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found or you are not the author');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment,
        updated_at: new Date(),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        helpful_votes: true,
      },
    });

    return {
      success: true,
      message: 'Review updated successfully',
      data: this.formatReview(updated),
    };
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        reviewer_id: userId,
        deleted_at: null,
      },
      include: {
        replies: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found or you are not the author');
    }

    // Delete review images
    if (review.images && review.images.length > 0) {
      await this.deleteMultipleImages(review.images, 'review');
    }

    // Delete reply images
    for (const reply of review.replies) {
      if (reply.images && reply.images.length > 0) {
        await this.deleteMultipleImages(reply.images, 'reply');
      }
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { deleted_at: new Date() },
    });

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  async markReviewHelpful(
    reviewId: string,
    userId: string,
    dto: MarkHelpfulDto,
  ) {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        status: ReviewStatus.PUBLISHED,
        deleted_at: null,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewer_id === userId) {
      throw new BadRequestException(
        'You cannot mark your own review as helpful',
      );
    }

    const existingVote = await this.prisma.reviewHelpfulVote.findUnique({
      where: {
        review_id_user_id: {
          review_id: reviewId,
          user_id: userId,
        },
      },
    });

    if (existingVote) {
      await this.prisma.reviewHelpfulVote.delete({
        where: { id: existingVote.id },
      });
      return {
        success: true,
        message: 'Removed helpful vote',
        is_helpful: false,
      };
    } else {
      await this.prisma.reviewHelpfulVote.create({
        data: {
          review_id: reviewId,
          user_id: userId,
          is_helpful: dto.is_helpful ?? true,
        },
      });
      return {
        success: true,
        message: 'Marked as helpful',
        is_helpful: true,
      };
    }
  }

  // ============================================
  // REVIEW REPLIES
  // ============================================

  async replyToReview(
    reviewId: string,
    proUserId: string,
    dto: CreateReviewReplyDto,
    images?: Express.Multer.File[],
  ) {
    const review = await this.prisma.review.findFirst({
      where: {
        id: reviewId,
        reviewed_user_id: proUserId,
        deleted_at: null,
      },
      include: {
        reviewed_user: true,
      },
    });

    if (!review) {
      throw new NotFoundException(
        'Review not found or you are not the professional being reviewed',
      );
    }

    if (review.reviewed_user.type !== UserType.PRO_USER) {
      throw new ForbiddenException(
        'Only professional users can reply to reviews',
      );
    }

    let uploadedImageNames: string[] = [];
    if (images && images.length > 0) {
      uploadedImageNames = [];
      for (const image of images) {
        const fileName = await this.uploadReplyImage(image);
        uploadedImageNames.push(fileName);
      }
    }

    const reply = await this.prisma.reviewReply.create({
      data: {
        comment: dto.comment,
        images: uploadedImageNames,
        review_id: reviewId,
        reply_by_id: proUserId,
      },
      include: {
        reply_by: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
      },
    });

    await this.createReplyNotification(
      review.reviewer_id,
      proUserId,
      reviewId,
      reply.id,
    );

    return {
      success: true,
      message: 'Reply added successfully',
      data: {
        id: reply.id,
        comment: reply.comment,
        images: this.getFullImageUrls(reply.images, 'reply'),
        created_at: reply.created_at,
        replied_by: {
          id: reply.reply_by.id,
          name: `${reply.reply_by.first_name} ${reply.reply_by.last_name}`,
          avatar: this.getFullImageUrl(reply.reply_by.avatar, 'avatar'),
        },
      },
    };
  }

  async deleteReply(replyId: string, userId: string) {
    const reply = await this.prisma.reviewReply.findFirst({
      where: {
        id: replyId,
        reply_by_id: userId,
        deleted_at: null,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found or you are not the author');
    }

    if (reply.images && reply.images.length > 0) {
      await this.deleteMultipleImages(reply.images, 'reply');
    }

    await this.prisma.reviewReply.update({
      where: { id: replyId },
      data: { deleted_at: new Date() },
    });

    return {
      success: true,
      message: 'Reply deleted successfully',
    };
  }

  // ============================================
  // FOLLOW/UNFOLLOW
  // ============================================

  async toggleFollow(followerId: string, followingId: string) {
    const following = await this.prisma.user.findFirst({
      where: {
        id: followingId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (!following) {
      throw new NotFoundException('User to follow not found');
    }

    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const followerMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: followerId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    const followingMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: followingId,
        status: 'ACTIVE',
        deleted_at: null,
      },
    });

    if (
      !followerMembership ||
      !followingMembership ||
      followerMembership.church_id !== followingMembership.church_id
    ) {
      throw new ForbiddenException(
        'You can only follow users from your church',
      );
    }

    const existingFollow = await this.prisma.userFollow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
    });

    if (existingFollow) {
      await this.prisma.userFollow.delete({
        where: { id: existingFollow.id },
      });
      return {
        success: true,
        message: 'Unfollowed successfully',
        is_following: false,
      };
    } else {
      await this.prisma.userFollow.create({
        data: {
          follower_id: followerId,
          following_id: followingId,
        },
      });
      await this.createFollowNotification(followingId, followerId);
      return {
        success: true,
        message: 'Followed successfully',
        is_following: true,
      };
    }
  }

  async checkFollowStatus(followerId: string, followingId: string) {
    const follow = await this.prisma.userFollow.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
    });

    return {
      success: true,
      is_following: !!follow,
    };
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { following_id: userId, status: 'ACTIVE' },
        skip,
        take: limit,
        include: {
          follower: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar: true,
              type: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.userFollow.count({
        where: { following_id: userId, status: 'ACTIVE' },
      }),
    ]);

    return {
      success: true,
      data: {
        followers: followers.map((f) => ({
          id: f.follower.id,
          name: `${f.follower.first_name} ${f.follower.last_name}`,
          avatar: this.getFullImageUrl(f.follower.avatar, 'avatar'),
          type: f.follower.type,
          followed_since: f.created_at,
        })),
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { follower_id: userId, status: 'ACTIVE' },
        skip,
        take: limit,
        include: {
          following: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar: true,
              type: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.userFollow.count({
        where: { follower_id: userId, status: 'ACTIVE' },
      }),
    ]);

    return {
      success: true,
      data: {
        following: following.map((f) => ({
          id: f.following.id,
          name: `${f.following.first_name} ${f.following.last_name}`,
          avatar: this.getFullImageUrl(f.following.avatar, 'avatar'),
          type: f.following.type,
          followed_since: f.created_at,
        })),
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private getFullImageUrls(fileNames: string[] | null, type: string): string[] {
    if (!fileNames || fileNames.length === 0) return [];
    return fileNames.map((fileName) => this.getFullImageUrl(fileName, type));
  }

  private formatReview(review: any) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: this.getFullImageUrls(review.images, 'review'),
      created_at: review.created_at,
      updated_at: review.updated_at,
      reviewer: review.reviewer
        ? {
            id: review.reviewer.id,
            name: `${review.reviewer.first_name} ${review.reviewer.last_name}`,
            avatar: this.getFullImageUrl(review.reviewer.avatar, 'avatar'),
          }
        : null,
      helpful_count: review.helpful_votes?.length || 0,
      replies:
        review.replies?.map((reply: any) => ({
          id: reply.id,
          comment: reply.comment,
          images: this.getFullImageUrls(reply.images, 'reply'),
          created_at: reply.created_at,
          replied_by: reply.reply_by
            ? {
                id: reply.reply_by.id,
                name: `${reply.reply_by.first_name} ${reply.reply_by.last_name}`,
                avatar: this.getFullImageUrl(reply.reply_by.avatar, 'avatar'),
              }
            : null,
        })) || [],
    };
  }

  private async createReviewNotification(
    proUserId: string,
    reviewerId: string,
    reviewId: string,
  ) {
    await this.prisma.notification.create({
      data: {
        sender_id: reviewerId,
        receiver_id: proUserId,
        entity_id: reviewId,
      },
    });
  }

  private async createReplyNotification(
    reviewerId: string,
    proUserId: string,
    reviewId: string,
    replyId: string,
  ) {
    await this.prisma.notification.create({
      data: {
        sender_id: proUserId,
        receiver_id: reviewerId,
        entity_id: replyId,
      },
    });
  }

  private async createFollowNotification(
    followingId: string,
    followerId: string,
  ) {
    await this.prisma.notification.create({
      data: {
        sender_id: followerId,
        receiver_id: followingId,
        entity_id: followingId,
      },
    });
  }
}
