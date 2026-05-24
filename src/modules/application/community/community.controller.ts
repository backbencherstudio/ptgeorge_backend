import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Request } from 'express';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactPostDto } from './dto/create-react.dto';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
 
  constructor(private readonly communityService: CommunityService) {}

  /*-----------------------------------
           POST  PART
  -----------------------------------*/

  // create community post
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Create a community post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        community_id: { type: 'string' },
        title: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @Post()
  async create(
    @Body() createCommunityDto: CreateCommunityDto,
    @Req() req: Request,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    return this.communityService.create(createCommunityDto, userId, image);
  }

  // get all community posts
  @ApiOperation({ summary: 'Get all community posts' })
  @Get('all-post/:communityId')
  async findAll(
    @Req() req: Request,
    @Query() paginationDto: PaginationDto,
    @Param('communityId') communityId: string,
  ) {
    const userId = req.user.userId;
    return this.communityService.findAll(userId, paginationDto, communityId);
  }

  // delete community post
  @ApiOperation({ summary: 'Delete a community post' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.communityService.remove(id, userId);
  }

  /*-----------------------------------
           COMMENT  PART
  -----------------------------------*/

  // add comment to community post
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Add comment to a post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @Post('post/:postId/comment')
  async addComment(
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    return this.communityService.addComment(postId, createCommentDto, userId);
  }

  // detete a comment
  @ApiOperation({ summary: 'Delete a comment' })
  @Delete('comment/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: Request,
  ) {
    const userId = req.user.userId;
    return this.communityService.deleteComment(commentId, userId);
  }


  // reply to comment
  @ApiOperation({ summary: 'Reply to a comment' })
  @Post('comment/:commentId/reply')
  async replyToComment(
    @Param('commentId') commentId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const userId = req.user.userId;
    return this.communityService.replyToComment(
      commentId,
      createCommentDto,
      userId,
    );
  }


  // delete reply to comment
  @ApiOperation({ summary: 'Delete a reply to a comment' })
  @Delete('comment/reply/:replyId')
  async deleteReplyToComment(
    @Param('replyId') replyId: string,
    @Req() req: Request,
  ) {
    const userId = req.user.userId;
    return this.communityService.deleteReplyToComment(replyId, userId);
  }

  /*-----------------------------------
           REACT  PART
  -----------------------------------*/

  // react to community post
  @ApiOperation({ summary: 'React to a community post' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Post('post/:postId/react')
  async reactToPost(
    @Param('postId') postId: string,
    @Body() reactPostDto: ReactPostDto,
    @Req() req: Request,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    return this.communityService.reactToPost(postId, reactPostDto, userId);
  }

  
  
}
