import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from './user/user.repository';
import { ChatRepository } from './chat/chat.repository';
import { NotificationRepository } from './notification/notification.repository';
import { UcodeRepository } from './ucode/ucode.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    ChatRepository,
    NotificationRepository,
    UcodeRepository,
  ],
  exports: [
    UserRepository,
    ChatRepository,
    NotificationRepository,
    UcodeRepository,
  ],
})
export class RepositoryModule {}
