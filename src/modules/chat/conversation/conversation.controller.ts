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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';

@ApiBearerAuth()
@ApiTags('Conversation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // *create conversation
  @Post('create-conversation')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({ type: CreateConversationDto })
  @ApiCreatedResponse({
    description: 'Conversation created successfully',
    schema: {
      example: {
        message: 'Conversation created successfully',
        success: true,
        conversation: {
          conversation_id: 'clx123abc456def789',
          participants: [],
        },
      },
    },
  })
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req,
  ) {
    const user = req.user.userId;
    return this.conversationService.create(createConversationDto, user);
  }

  //  *conversation list of user
  @Get('conversation-list')
  @ApiOperation({ summary: 'Get all conversations for the authenticated user' })
  @ApiOkResponse({
    description: 'Conversations retrieved successfully',
    schema: {
      example: {
        message: 'Conversations retrieved successfully',
        success: true,
        conversations: [],
      },
    },
  })
  async findAll(@Req() req) {
    const user = req.user.userId;
    return this.conversationService.findAll(user);
  }

  // get conversation by id
  @Get('single-conversation/:id')
  @ApiOperation({ summary: 'Get a single conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiOkResponse({
    description: 'Conversation retrieved successfully',
    schema: {
      example: {
        message: 'Conversation retrieved successfully',
        success: true,
        conversation: {
          id: 'clx123abc456def789',
          participants: [],
          messages: [],
        },
      },
    },
  })
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.findOne(id, user);
  }

  // Delete a conversation by ID
  @Delete('delete-conversation/:id')
  @ApiOperation({ summary: 'Delete a conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiOkResponse({
    description: 'Conversation deleted successfully',
    schema: {
      example: {
        message: 'Conversation deleted successfully',
        success: true,
      },
    },
  })
  async remove(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.remove(id, user);
  }


  // user information
  @Get('all-user')
  @ApiOperation({ summary: 'Get all users except the authenticated user' })
  @ApiOkResponse({
    description: 'Users retrieved successfully',
    schema: {
      example: {
        message: 'Users retrieved successfully',
        success: true,
        data: [],
      },
    },
  })
  async findAllUser(
    @Req() req,
  ) {
    const user = req.user.userId;
    return this.conversationService.findAllUserInfo(user);
  }


}
