import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageGateway } from './message.gateway';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import appConfig from 'src/config/app.config';
import { log } from 'node:console';
import { PaginationDto } from 'src/common/pagination';
import { OpenOrCreateConversationDto } from "./dto/open-or-create-conversation.dto";


@ApiBearerAuth()
@ApiTags('Message')
@UseGuards(JwtAuthGuard)
@Controller('chat/message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway,
  ) { }


  //*send message
  @Post('send-message')
  @ApiOperation({ summary: 'Send a message with optional attachments' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['conversationId'],
      properties: {
        conversationId: {
          type: 'string',
          example: 'clx123abc456def789',
        },
        text: {
          type: 'string',
          example: 'Hello, how are you?',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Message sent successfully',
    schema: {
      example: {
        message: 'Message sent successfully',
        success: true,
        data: {
          id: 'msg_123',
          text: 'Hello, how are you?',
          createdAt: '2026-05-24T00:00:00.000Z',
          updatedAt: '2026-05-24T00:00:00.000Z',
          status: 'SENT',
          attchment: [],
          attachments_url: [],
          sender: {
            id: 'user_123',
            name: 'John Doe',
            email: 'john@example.com',
            avatar: null,
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, 
      },
    }),
  )
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = req.user.userId;
    console.log(`User ID: ${user}`);
    return this.messageService.create(createMessageDto, user, files);
  }




   @Post('open-or-create-conversation')
  @ApiOperation({
    summary: 'Open an existing conversation or create a new one',
  })
  async openOrCreateConversation(
    @Body() openOrCreateConversationDto: OpenOrCreateConversationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.openOrCreateConversation(
      openOrCreateConversationDto,
      user,
    );
  }


  
  //*get all message for a conversation
  @Get('all-message/:conversationId')
  @ApiOperation({ summary: 'Get all messages for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Messages retrieved successfully',
    schema: {
      example: {
        message: 'Messages retrieved successfully',
        success: true,
        data: {
          data: [],
          meta: {
            total: 0,
            page: 1,
            perPage: 10,
            totalPages: 0,
          },
        },
      },
    },
  })
  async findAll(
    @Param('conversationId') conversationId: string,
    @Query() paginationdto: PaginationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
   return this.messageService.findAll(conversationId, user, paginationdto);
  }
 

  // delete message
  @Delete('delete-message/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiOkResponse({
    description: 'Message deleted successfully',
    schema: {
      example: {
        message: 'Message deleted successfully',
        success: true,
      },
    },
  })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.deleteMessage(user, messageId);
  }
  

   // unread message count
  @Get('unread-message/:conversationId')
  @ApiOperation({ summary: 'Get unread message count for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiOkResponse({
    description: 'Unread message count retrieved successfully',
    schema: {
      example: {
        message: 'Unread message count retrieved successfully',
        success: true,
        data: 3,
      },
    },
  })
  async getUnreadMessageCount(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.getUnreadMessage(user, conversationId);
  }

  // read messages
  @Get('read-message/:conversationId')
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiOkResponse({
    description: 'Messages marked as read',
    schema: {
      example: {
        message: 'Messages marked as read',
        success: true,
      },
    },
  })
  async readMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.readMessages(user, conversationId);
  }

 
}
