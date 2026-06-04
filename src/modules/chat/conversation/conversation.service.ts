import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import appConfig from '../../../config/app.config';
import { MessageGateway } from '../message/message.gateway';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';

@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  // Create or get existing conversation
  async create(createConversationDto: CreateConversationDto, sender: string) {
    const { participant_id } = createConversationDto;

    if (participant_id === sender) {
      throw new ConflictException('Cannot create conversation with yourself');
    }

    // 1. Check that both users exist
    const [senderUser, participantUser] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: sender },
        select: { id: true, name: true, avatar: true },
      }),
      this.prisma.user.findUnique({
        where: { id: participant_id },
        select: { id: true, name: true, avatar: true },
      }),
    ]);

    if (!senderUser) {
      throw new NotFoundException('Authenticated user not found');
    }
    if (!participantUser) {
      throw new NotFoundException(
        'The participant you want to chat with does not exist',
      );
    }

    // Optional: ensure sender is active (if needed)
    // const senderFull = await this.prisma.user.findUnique({ where: { id: sender }, select: { status: true } });
    // if (senderFull?.status !== 'ACTIVE') throw new ForbiddenException('Your account is not active');

    // 2. Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: sender } } },
          { participants: { some: { userId: participant_id } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return {
        message: 'Conversation already exists',
        success: true,
        conversation: {
          id: existingConversation.id,
          participants: existingConversation.participants.map((p) => ({
            userId: p.user.id,
            name: p.user.name,
            avatar_url: p.user.avatar
              ? TanvirStorage.url(
                  `${appConfig().storageUrl.avatar}/${p.user.avatar}`,
                )
              : null,
          })),
        },
      };
    }

    // 3. Create new conversation (now we are sure both users exist)
    const newConversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: sender }, { userId: participant_id }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    const formattedParticipants = {
      conversation_id: newConversation.id,
      participants: newConversation.participants.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        avatar_url: p.user.avatar
          ? TanvirStorage.url(
              `${appConfig().storageUrl.avatar}/${p.user.avatar}`,
            )
          : null,
      })),
    };

    return {
      message: 'Conversation created successfully',
      success: true,
      conversation: formattedParticipants,
    };
  }

  // Get all conversations for a user
  async findAll(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { text: true, attachments: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedConversations = conversations.map((conv) => {
      const opponentParticipant = conv.participants.find(
        (p) => p.userId !== userId,
      );
      const opponentData = opponentParticipant
        ? {
            userId: opponentParticipant.user.id,
            name: opponentParticipant.user.name,
            avatar_url: opponentParticipant.user.avatar
              ? TanvirStorage.url(
                  `${appConfig().storageUrl.avatar}/${opponentParticipant.user.avatar}`,
                )
              : null,
          }
        : null;

      return {
        conversation_id: conv.id,
        opponent: opponentData,
        lastMessage: conv.messages[0]
          ? {
              text: conv.messages[0].text,
              createdAt: conv.messages[0].createdAt,
              attachments: conv.messages[0].attachments,
              attachment_urls: conv.messages[0].attachments
                ? conv.messages[0].attachments.map((att) =>
                    TanvirStorage.url(
                      `${appConfig().storageUrl.attachment}/${att}`,
                    ),
                  )
                : [],
            }
          : null,
      };
    });

    return {
      message: 'Conversations retrieved successfully',
      success: true,
      conversations: formattedConversations,
    };
  }

  // Get single conversation by ID
  async findOne(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant.',
      );
    }

    const formattedConversation = {
      id: conversation.id,
      participants: conversation.participants.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        avatar_url: p.user.avatar
          ? TanvirStorage.url(
              `${appConfig().storageUrl.avatar}/${p.user.avatar}`,
            )
          : null,
      })),
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        createdAt: msg.createdAt,
        sender: {
          id: msg.sender.id,
          name: msg.sender.name,
          avatar: msg.sender.avatar
            ? TanvirStorage.url(
                `${appConfig().storageUrl.avatar}/${msg.sender.avatar}`,
              )
            : null,
        },
      })),
    };

    return {
      message: 'Conversation retrieved successfully',
      success: true,
      conversation: formattedConversation,
    };
  }

  // Delete conversation
  async remove(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        participants: { some: { userId } },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant.',
      );
    }

    await this.prisma.conversation.delete({ where: { id } });

    return {
      message: 'Conversation deleted successfully',
      success: true,
    };
  }

  // Get all users except current user
  async findAllUserInfo(userId: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { not: userId } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
        ? TanvirStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
        : null,
      type: user.type,
    }));

    return {
      message: 'Users retrieved successfully',
      success: true,
      data: formattedUsers,
    };
  }
}
