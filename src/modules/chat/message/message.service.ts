import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import appConfig from "../../../config/app.config";
import { CreateMessageDto } from "./dto/create-message.dto";
import { PrismaService } from "../../../prisma/prisma.service";
import { TanvirStorage } from '../../../common/lib/Disk/TanvirStorage';
import { MessageGateway } from "./message.gateway";
import { StringHelper } from "src/common/helper/string.helper";
import { paginateResponse, PaginationDto } from "src/common/pagination";
import { ChatRepository } from "../../../common/repository/chat/chat.repository";
import { OpenOrCreateConversationDto } from "./dto/open-or-create-conversation.dto";

// Temporary enum until Prisma generates it
enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  PENDING = 'PENDING',
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) { }


  // ------------- utils start --------------------
  
  private formatConversationParticipant(user: {
    id: string;
    name: string | null;
    avatar: string | null;
  }) {
    return {
      userId: user.id,
      name: user.name,
      avater: user.avatar,
      avatar_url: user.avatar
        ? TanvirStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
        : null,
    };
  }

  private formatConversationMessage(message: {
    id: string;
    text: string | null;
    createdAt: Date;
    sender: {
      id: string;
      name: string | null;
      avatar: string | null;
    };
  }) {
    return {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatar: message.sender.avatar
          ? TanvirStorage.url(
              `${appConfig().storageUrl.avatar}/${message.sender.avatar}`,
            )
          : null,
      },
    };
  }

  private async buildConversationResponse(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      id: conversation.id,
      participants: conversation.participants.map((participant) =>
        this.formatConversationParticipant(participant.user),
      ),
      messages: conversation.messages.map((message) =>
        this.formatConversationMessage(message),
      ),
    };
  }

  // ------------- utils end -------------------


  // *Send message (with Prisma transaction)
  async create(
    createMessageDto: CreateMessageDto,
    sender: string,
    files?: Express.Multer.File[],
  ) {
    const { text, conversationId } = createMessageDto;

    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId: sender },
    });

    if (!participant) {
      throw new UnauthorizedException(
        "You are not a participant of this conversation.",
      );
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const savedFileNames: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `${StringHelper.randomString(8)}_${file.originalname}`;
        await TanvirStorage.put(
          appConfig().storageUrl.attachment + "/" + fileName,
          file.buffer,
        );
        savedFileNames.push(fileName);
      }
    }

    const message = await this.prisma.message.create({
      data: {
        text,
        conversationId,
        senderId: sender,
        status: MessageStatus.SENT,
        attachments: savedFileNames.length > 0 ? savedFileNames : [],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const formatted = {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      status: message.status,
      attchment: message.attachments,
      attachments_url: (message.attachments || []).map((f) =>
        TanvirStorage.url(`${appConfig().storageUrl.attachment}/${f}`),
      ),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
        avatar: message.sender.avatar
          ? TanvirStorage.url(
            `${appConfig().storageUrl.avatar}/${message.sender.avatar}`,
          )
          : null,
      },
    };

    // note: socket implementation for message sending
    const senderSocketId = this.messageGateway.clients.get(sender);

    if (senderSocketId) {
      this.messageGateway.server
        .to(conversationId)
        .except(senderSocketId)
        .emit("message", {
          from: sender,
          data: formatted,
        });
    } else {
      this.messageGateway.server.to(conversationId).emit("message", {
        from: sender,
        data: formatted,
      });
    }

    /*
     socket.on('message', (msg) => {
      console.log('New message received:', msg);
    });
    */

    return {
      message: "Message sent successfully",
      success: true,
      data: formatted,
    };
  }

  // *Open or create conversation
  async openOrCreateConversation(
    openOrCreateConversationDto: OpenOrCreateConversationDto,
    sender: string,
  ) {
    const participantId = openOrCreateConversationDto.participant_id?.trim();

    if (!participantId) {
      throw new BadRequestException('participant_id is required');
    }

    if (participantId === sender) {
      throw new ConflictException('Cannot create conversation with yourself');
    }

    const [senderUser, participantUser] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: sender },
        select: { id: true, name: true, avatar: true },
      }),
      this.prisma.user.findUnique({
        where: { id: participantId },
        select: { id: true, name: true, avatar: true },
      }),
    ]);

    if (!senderUser) {
      throw new NotFoundException('Authenticated user not found');
    }

    if (!participantUser) {
      throw new NotFoundException('Participant not found');
    }

    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: sender } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
    });

    if (existingConversation) {
      return {
        message: 'Conversation retrieved successfully',
        success: true,
        conversation: await this.buildConversationResponse(existingConversation.id),
      };
    }

    const newConversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: sender }, { userId: participantId }],
        },
      },
    });

    return {
      message: 'Conversation created successfully',
      success: true,
      conversation: {
        id: newConversation.id,
        participants: [
          this.formatConversationParticipant(senderUser),
          this.formatConversationParticipant(participantUser),
        ],
        messages: [],
      },
    };
  }

  // *get all messages for a conversation
  async findAll(
    conversationId: string,
    userId: string,
    paginationdto: PaginationDto,
  ) {
    const { page, perPage } = paginationdto;
    const skip = (page - 1) * perPage;
    const take = perPage;
    const whereClause = { conversationId };

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new UnauthorizedException(
        "You are not a participant of this conversation.",
      );
    }

    const receiverParticipant = conversation.participants.find(
      (p) => p.userId !== userId,
    );

    let formattedReceiver = null;
    if (receiverParticipant) {
      formattedReceiver = {
        id: receiverParticipant.user.id,
        name: receiverParticipant.user.name,
        email: receiverParticipant.user.email,
        avatar_url: receiverParticipant.user.avatar
          ? TanvirStorage.url(
            `${appConfig().storageUrl.avatar}/${receiverParticipant.user.avatar}`,
          )
          : null,
      };
    }

    const [totalMessages, messages] = await this.prisma.$transaction([
      this.prisma.message.count({ where: whereClause }),
      this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      }),
    ]);

    if (totalMessages === 0) {
      return {
        message: "No messages found",
        success: true,
        data: paginateResponse([], page, perPage, totalMessages),
      };
    }

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      attachments: msg.attachments,
      attachments_url: (msg.attachments || []).map((f) =>
        TanvirStorage.url(`${appConfig().storageUrl.attachment}/${f}`),
      ),
      createdAt: msg.createdAt,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        email: msg.sender.email,
        avater: msg.sender.avatar,
        avatar_url: msg.sender.avatar
          ? TanvirStorage.url(
            `${appConfig().storageUrl.avatar}/${msg.sender.avatar}`,
          )
          : null,
      },

      receiver: formattedReceiver,
    }));

    const paginationResult = paginateResponse(
      formattedMessages,
      page,
      perPage,
      totalMessages,
    );

    return {
      message: "Messages retrieved successfully",
      success: true,
      ...paginationResult,
    };
  }

  // *delete a message
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.senderId !== userId) {
      throw new UnauthorizedException(
        "You are not authorized to delete this message.",
      );
    }

    await this.prisma.$transaction(async (tx) => {

      await tx.message.delete({
        where: { id: messageId },
      });

      if (message.attachments && message.attachments.length > 0) {
        for (const fname of message.attachments) {
          await TanvirStorage.delete(
            `${appConfig().storageUrl.attachment}/${fname}`,
          );
        }
      }
    });

    return {
      message: "Message deleted successfully",
      success: true,
    };
  }


  // *unread message count
  async getUnreadMessage(userId: string, conversationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new UnauthorizedException(
        "You are not a participant of this conversation.",
      );
    }

    const lastReadAt = participant.lastReadAt || new Date(0);

    const whereClause = {
      conversationId,
      NOT: { status: MessageStatus.READ },
      senderId: { not: userId },
      createdAt: { gt: lastReadAt },
    };

    const [unreadCount, unreadMessages] = await this.prisma.$transaction([
      this.prisma.message.count({ where: whereClause }),
      this.prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
    ]);

    const formattedMessages = unreadMessages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      senderName: msg.sender.name,
      attachments: (msg.attachments || []).map((f) =>
        TanvirStorage.url(`${appConfig().storageUrl.attachment}/${f}`),
      ),
    }));

    return {
      message: "Unread message count retrieved successfully",
      success: true,
      data: {
        count: unreadCount,
        messages: formattedMessages,
      },
    };
  }

  // *Mark messages as read
  async readMessages(userId: string, conversationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new UnauthorizedException(
        "You are not a participant of this conversation.",
      );
    }

    const lastReadAt = participant.lastReadAt || new Date(0);

    await this.prisma.$transaction(async (tx) => {
      await tx.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: { not: "READ" },
          createdAt: { gt: lastReadAt },
        },
        data: { status: "READ" },
      });

      await tx.participant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });
    });

    return {
      message: "Messages marked as read successfully",
      success: true,
    };
  }


}
