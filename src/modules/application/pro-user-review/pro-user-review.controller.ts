import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProUserReviewService } from './pro-user-review.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  MarkHelpfulDto,
  CreateReviewReplyDto,
} from './dto/review.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { FollowDto } from './dto/follow.dto';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('Pro Users - Reviews & Follows')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_MEMBER)
@Controller('pro-users')
@UseGuards(JwtAuthGuard)
export class ProUserReviewController {
  constructor(private readonly reviewService: ProUserReviewService) {}

  // ============================================
  // REVIEW ENDPOINTS
  // ============================================

  @Post(':id/reviews')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 5 }], {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Write a review for a pro user with images' })
  @ApiParam({ name: 'id', description: 'Pro user ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'number', example: 5, description: 'Rating 1-5' },
        comment: {
          type: 'string',
          example: 'Amazing service!',
          description: 'Review comment',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Review images (up to 5 files, max 5MB each)',
        },
      },
      required: ['rating'],
    },
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 404, description: 'Pro user not found' })
  @ApiResponse({ status: 403, description: 'You cannot review this pro user' })
  async createReview(
    @Param('id') proUserId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    const images = files?.images || [];
    return this.reviewService.createReview(proUserId, req.user.userId, dto, images);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get all reviews for a pro user' })
  @ApiParam({ name: 'id', description: 'Pro user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Reviews fetched successfully' })
  async getProUserReviews(
    @Param('id') proUserId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.reviewService.getProUserReviews(
      proUserId,
      req.user.userId,
      pageNumber,
      limitNumber,
    );
  }

  @Patch('reviews/:reviewId')
  @ApiOperation({ summary: 'Update your own review' })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @Req() req: any,
  ) {
    return this.reviewService.updateReview(reviewId, req.user.userId, dto);
  }

  @Delete('reviews/:reviewId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete your own review' })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  async deleteReview(@Param('reviewId') reviewId: string, @Req() req: any) {
    return this.reviewService.deleteReview(reviewId, req.user.userId);
  }

  @Post('reviews/:reviewId/helpful')
  @ApiOperation({ summary: 'Mark a review as helpful/unhelpful (toggle)' })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Helpful vote toggled successfully',
  })
  async markHelpful(
    @Param('reviewId') reviewId: string,
    @Body() dto: MarkHelpfulDto,
    @Req() req: any,
  ) {
    return this.reviewService.markReviewHelpful(reviewId, req.user.userId, dto);
  }

  // ============================================
  // REVIEW REPLIES (PRO USER only)
  // ============================================

  @Post('reviews/:reviewId/replies')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', 3, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'PRO user replies to a review with images' })
  @ApiParam({ name: 'reviewId', description: 'Review ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          example: 'Thank you for your kind review!',
          description: 'Reply text',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Reply images (up to 3 files, max 5MB each)',
        },
      },
      required: ['comment'],
    },
  })
  @ApiResponse({ status: 201, description: 'Reply added successfully' })
  async replyToReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewReplyDto,
    @Req() req: any,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.reviewService.replyToReview(reviewId, req.user.userId, dto, images);
  }

  @Delete('reviews/replies/:replyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete your own reply' })
  @ApiParam({ name: 'replyId', description: 'Reply ID' })
  @ApiResponse({ status: 200, description: 'Reply deleted successfully' })
  async deleteReply(@Param('replyId') replyId: string, @Req() req: any) {
    return this.reviewService.deleteReply(replyId, req.user.userId);
  }

  // ============================================
  // FOLLOW/UNFOLLOW ENDPOINTS
  // ============================================

  @Post('follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow or unfollow a user (toggle)' })
  @ApiResponse({ status: 200, description: 'Follow toggled successfully' })
  async toggleFollow(@Body() dto: FollowDto, @Req() req: any) {
    return this.reviewService.toggleFollow(req.user.userId, dto.following_id);
  }

  @Get('follow/status/:userId')
  @ApiOperation({ summary: 'Check if current user is following another user' })
  @ApiParam({ name: 'userId', description: 'User ID to check' })
  @ApiResponse({ status: 200, description: 'Follow status retrieved' })
  async checkFollowStatus(@Param('userId') userId: string, @Req() req: any) {
    return this.reviewService.checkFollowStatus(req.user.userId, userId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get followers of current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getMyFollowers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.reviewService.getFollowers(
      req.user.userId,
      pageNumber,
      limitNumber,
    );
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users that current user is following' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getMyFollowing(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.reviewService.getFollowing(
      req.user.userId,
      pageNumber,
      limitNumber,
    );
  }

  @Get('users/:userId/followers')
  @ApiOperation({ summary: 'Get followers of a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getUserFollowers(
    @Param('userId') userId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.reviewService.getFollowers(userId, pageNumber, limitNumber);
  }

  @Get('users/:userId/following')
  @ApiOperation({ summary: 'Get users that a specific user is following' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getUserFollowing(
    @Param('userId') userId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.reviewService.getFollowing(userId, pageNumber, limitNumber);
  }
}
