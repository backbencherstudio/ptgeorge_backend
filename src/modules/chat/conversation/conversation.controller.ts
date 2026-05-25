import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiBearerAuth()
@ApiTags('Conversation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('chat/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('create-conversation')
  @ApiOperation({
    summary: 'Create a new conversation',
    description:
      'Creates a one-to-one conversation between the authenticated user and another user. If a conversation already exists, returns the existing one.',
  })
  @ApiBody({ type: CreateConversationDto })
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req,
  ) {
    const user = req.user.userId;
    return this.conversationService.create(createConversationDto, user);
  }

  @Get('conversation-list')
  @ApiOperation({
    summary: 'Get all conversations for the authenticated user',
    description:
      'Returns a list of conversations with the last message and opponent details.',
  })
  async findAll(@Req() req) {
    const user = req.user.userId;
    return this.conversationService.findAll(user);
  }

  @Get('single-conversation/:id')
  @ApiOperation({
    summary: 'Get a single conversation by ID',
    description:
      'Returns full conversation details including all messages (only if the user is a participant).',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'clx123abc456def789',
  })
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.findOne(id, user);
  }

  @Delete('delete-conversation/:id')
  @ApiOperation({
    summary: 'Delete a conversation by ID',
    description:
      'Deletes the conversation (only if the user is a participant).',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'clx123abc456def789',
  })
  async remove(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.remove(id, user);
  }

  @Get('all-user')
  @ApiOperation({
    summary: 'Get all users except the authenticated user',
    description:
      'Returns a list of all platform users (excluding the current user) for starting new conversations.',
  })
  async findAllUser(@Req() req) {
    const user = req.user.userId;
    return this.conversationService.findAllUserInfo(user);
  }
}
