import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { Request } from 'express';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactPostDto } from './dto/create-react.dto';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateCommunityPostDto } from './dto/create-community.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';

@ApiTags('Church Community')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_MEMBER)
@Controller('church-community')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.CHURCH_MEMBER,
  Role.PASTOR,
  Role.CHURCH_ADMIN,
  Role.HELPER,
  Role.USER,
)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // -------------------- POSTS --------------------
  //  
  @Post('post')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 10 }], {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: 'Create a church post',
    description:
      'Create a new post in your church community. Church ID is automatically taken from your membership. You can upload up to 10 images.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          example: 'Amazing worship service today!',
          description: 'Post content',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Post images (up to 10 files, max 5MB each). Supports JPEG, PNG, JPG, WEBP, GIF',
        },
      },
    },
  })
  async createPost(
    @Body() dto: CreateCommunityPostDto,
    @Req() req: Request,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
    },
  ) {
    const images = files?.images || [];

    return this.communityService.createPost(dto, req.user.userId, images);
  }

  @Get('posts')
  @ApiOperation({
    summary: 'Get all posts of your church with cursor pagination',
    description:
      'Retrieve all posts from your church community with cursor-based pagination. Church ID is automatically taken from your membership.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page (default: 10, max: 50)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      'Cursor (post ID) for pagination. Pass the last post ID from previous page',
    example: 'cmq0ivlva0000fwu8g8173gpy',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Order direction (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully.',
    schema: {
      example: {
        success: true,
        message: 'Church posts retrieved successfully.',
        data: [],
        pagination: {
          limit: 10,
          next_cursor: 'cmq0ivlva0000fwu8g8173gpy',
          has_more: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'You are not an active member of any church.',
  })
  async findAllPosts(
    @Req() req: Request,
    @Query() cursorPaginationDto: CursorPaginationDto,
  ) {
    return this.communityService.findAllPosts(
      req.user.userId,
      cursorPaginationDto,
    );
  }

  @Get('post/:postId')
  @ApiOperation({
    summary: 'Get a single post by ID',
    description:
      'Retrieve detailed information about a specific post including all comments and reactions.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async getPostById(@Req() req: Request, @Param('postId') postId: string) {
    return this.communityService.getPostById(postId, req.user.userId);
  }

  @Delete('post/:postId')
  @ApiOperation({
    summary: 'Delete a church post',
    description:
      'Delete a post you created. Only the post creator can delete it. This will also delete all associated comments, replies, and reactions.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the post creator can delete this post.',
  })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async removePost(@Req() req: Request, @Param('postId') postId: string) {
    return this.communityService.removePost(postId, req.user.userId);
  }

  // -------------------- COMMENTS --------------------

  // Add comment 
  @Post('post/:postId/comment')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 5 }], {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: 'Add comment to a post with images',
    description:
      'Add a comment to a post in your church community. You can upload up to 5 images.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          example: 'Great post!',
          description: 'Comment text',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Comment images (up to 5 files, max 5MB each)',
        },
      },
    },
  })
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
    },
  ) {
    const images = files?.images || [];

    return this.communityService.addComment(
      postId,
      dto,
      req.user.userId,
      images,
    );
  }



  @Get('post/:postId/comments')
  @ApiOperation({
    summary: 'Get all comments for a post',
    description: 'Retrieve all comments and their replies for a specific post.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully.',
  })
  async getCommentsByPostId(
    @Req() req: Request,
    @Param('postId') postId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = req.user.userId;
    return this.communityService.getCommentsForPost(postId, userId, paginationDto);
  }





  @Delete('comment/:commentId')
  @ApiOperation({
    summary: 'Delete a comment',
    description:
      'Delete a comment you created. Only the comment creator can delete it. This will also delete all associated replies.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the comment creator can delete this comment.',
  })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async deleteComment(
    @Req() req: Request,
    @Param('commentId') commentId: string,
  ) {
    return this.communityService.deleteComment(commentId, req.user.userId);
  }

  // -------------------- REPLIES --------------------

  @Post('comment/:commentId/reply')
  @UseInterceptors(
    FilesInterceptor('images', 3, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Reply to a comment with images',
    description:
      'Add a reply to an existing comment. You can upload up to 3 images.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          example: 'I agree!',
          description: 'Reply text',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Reply images (up to 3 files, max 5MB each)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Reply added successfully.',
  })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @ApiResponse({ status: 400, description: 'Reply text or image is required.' })
  async replyToCommentWithImages(
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.communityService.replyToComment(
      commentId,
      dto,
      req.user.userId,
      images,
    );
  }

  @Delete('reply/:replyId')
  @ApiOperation({
    summary: 'Delete a reply',
    description:
      'Delete a reply you created. Only the reply creator can delete it.',
  })
  @ApiParam({
    name: 'replyId',
    description: 'Reply ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Reply deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the reply creator can delete this reply.',
  })
  @ApiResponse({ status: 404, description: 'Reply not found.' })
  async deleteReply(@Req() req: Request, @Param('replyId') replyId: string) {
    return this.communityService.deleteReplyToComment(replyId, req.user.userId);
  }

  // -------------------- REACTS --------------------

  @Post('post/:postId/react')
  @ApiOperation({
    summary: 'React to a post',
    description: 'Add or remove a reaction (like/love) to a post.',
  })
  @ApiParam({
    name: 'postId',
    description: 'Post ID',
    example: 'cm8n7x5x50000123456789',
  })
  @ApiBody({
    type: ReactPostDto,
    description: 'Reaction type: LIKE or LOVE',
    examples: {
      like: {
        summary: 'Like reaction',
        value: { react_type: 'LIKE' },
      },
      love: {
        summary: 'Love reaction',
        value: { react_type: 'LOVE' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reaction toggled successfully.',
  })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async reactToPost(
    @Param('postId') postId: string,
    @Body() dto: ReactPostDto,
    @Req() req: Request,
  ) {
    return this.communityService.reactToPost(postId, dto, req.user.userId);
  }
}
