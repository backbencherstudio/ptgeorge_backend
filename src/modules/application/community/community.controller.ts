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
  UploadedFile,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Request } from 'express';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactPostDto } from './dto/create-react.dto';
import { FileInterceptor } from '@nestjs/platform-express';
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

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(SWAGGER_AUTH.PASTOR)
@ApiTags('Church Community')
@ApiBearerAuth()
@Controller('church-community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // -------------------- POSTS --------------------

  @Post('post')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Create a church post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCommunityPostDto })
  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  async createPost(
    @Body() dto: CreateCommunityPostDto,
    @Req() req: Request,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.communityService.createPost(dto, req.user.userId, image);
  }

  @Get('posts/:churchId')
  @ApiOperation({ summary: 'Get all posts of a church' })
  @ApiParam({ name: 'churchId', description: 'Church ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Posts retrieved.' })
  async findAllPosts(
    @Req() req: Request,
    @Query() pagination: PaginationDto,
    @Param('churchId') churchId: string,
  ) {
    return this.communityService.findAllPosts(
      req.user.userId,
      pagination,
      churchId,
    );
  }

  @Delete('post/:postId')
  @ApiOperation({ summary: 'Delete a church post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post deleted.' })
  async removePost(@Req() req: Request, @Param('postId') postId: string) {
    return this.communityService.removePost(postId, req.user.userId);
  }

  // -------------------- COMMENTS --------------------

  @Post('post/:postId/comment')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Add comment to a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment added.' })
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.communityService.addComment(
      postId,
      dto,
      req.user.userId,
      image,
    );
  }

  @Delete('comment/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted.' })
  async deleteComment(
    @Req() req: Request,
    @Param('commentId') commentId: string,
  ) {
    return this.communityService.deleteComment(commentId, req.user.userId);
  }

  // -------------------- REPLIES --------------------

  @Post('comment/:commentId/reply')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Reply added.' })
  async replyToComment(
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.communityService.replyToComment(
      commentId,
      dto,
      req.user.userId,
      image,
    );
  }

  @Delete('reply/:replyId')
  @ApiOperation({ summary: 'Delete a reply' })
  @ApiParam({ name: 'replyId', description: 'Reply ID' })
  @ApiResponse({ status: 200, description: 'Reply deleted.' })
  async deleteReply(@Req() req: Request, @Param('replyId') replyId: string) {
    return this.communityService.deleteReplyToComment(replyId, req.user.userId);
  }

  // -------------------- REACTS --------------------

  @Post('post/:postId/react')
  @ApiOperation({ summary: 'React to a post (like/love)' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: ReactPostDto })
  @ApiResponse({ status: 200, description: 'Reaction toggled.' })
  async reactToPost(
    @Param('postId') postId: string,
    @Body() dto: ReactPostDto,
    @Req() req: Request,
  ) {
    return this.communityService.reactToPost(postId, dto, req.user.userId);
  }
}
