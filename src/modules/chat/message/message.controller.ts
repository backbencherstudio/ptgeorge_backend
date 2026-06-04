import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  UploadedFiles,
  Param,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageGateway } from './message.gateway';
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
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import appConfig from 'src/config/app.config';
import { log } from 'node:console';
import { PaginationDto } from 'src/common/pagination';
import { OpenOrCreateConversationDto } from './dto/open-or-create-conversation.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiBearerAuth()
@ApiTags('Message')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('chat/message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway,
  ) {}


  @Post('send-message')
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Send a text message with optional file attachments (max 10 files, 10MB each). The message is delivered in real‑time via WebSocket.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Message payload',
    schema: {
      type: 'object',
      required: ['conversationId'],
      properties: {
        conversationId: { type: 'string', example: 'clx123abc456def789' },
        text: { type: 'string', example: 'Hello, how are you?' },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Up to 10 files (images, documents)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Message sent successfully' })
  @ApiUnauthorizedResponse({
    description: 'Not a participant of the conversation',
  })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
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
    return this.messageService.create(createMessageDto, user, files);
  }

  //*open or create conversation
  @Post('open-or-create-conversation')
  @ApiOperation({
    summary: 'Open or create a conversation',
    description:
      'If a conversation between the current user and the given participant already exists, returns it. Otherwise creates a new one.',
  })
  @ApiBody({ type: OpenOrCreateConversationDto })
  @ApiCreatedResponse({ description: 'Conversation created' })
  @ApiOkResponse({ description: 'Existing conversation retrieved' })
  @ApiBadRequestResponse({ description: 'participant_id missing' })
  @ApiConflictResponse({
    description: 'Cannot create conversation with yourself',
  })
  @ApiNotFoundResponse({ description: 'Participant user not found' })
  async openOrCreateConversation(
    @Body() dto: OpenOrCreateConversationDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.messageService.openOrCreateConversation(dto, userId);
  }

  //*get all message for a conversation
  @Get('all-message/:conversationId')
  @ApiOperation({
    summary: 'Get paginated messages of a conversation',
    description:
      'Returns messages sorted by creation time (oldest first). Only accessible to conversation participants.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'ID of the conversation',
    example: 'clx123abc456def789',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page (default 10)',
  })
  @ApiOkResponse({ description: 'Messages retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not a participant' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async findAll(
    @Param('conversationId') conversationId: string,
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.findAll(conversationId, user, paginationDto);
  }

  @Delete('delete-message/:messageId')
  @ApiOperation({
    summary: 'Delete a message',
    description:
      'Only the sender of the message can delete it. Attachments are also removed from storage.',
  })
  async deleteMessage(
    @Param('messageId') messageId: string, 
    @Req() req: any
  ) {
    const user = req.user.userId;
    return this.messageService.deleteMessage(user, messageId);
  }

  // unread message count
  @Get('unread-message/:conversationId')
  @ApiOperation({
    summary: 'Get unread message count and details',
    description:
      'Returns the number of messages sent by others that are not yet marked as read, along with the first few unread messages.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiOkResponse({ description: 'Unread count retrieved' })
  @ApiUnauthorizedResponse({ description: 'Not a participant' })
  async getUnreadMessageCount(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.messageService.getUnreadMessage(userId, conversationId);
  }

  @Get('read-message/:conversationId')
  @ApiOperation({
    summary: 'Mark all messages as read',
    description:
      'Updates the status of all unread messages in the conversation (sent by others) to READ and updates the participant’s `lastReadAt` timestamp.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiOkResponse({ description: 'Messages marked as read' })
  @ApiUnauthorizedResponse({ description: 'Not a participant' })
  async readMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.messageService.readMessages(userId, conversationId);
  }




}
