import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TanvirStorage } from '../../../common/lib/Disk/TanvirStorage';
import appConfig from '../../../config/app.config';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { NotificationSettingType } from 'prisma/generated/client';
import { UserType } from 'prisma/generated/client';

@Injectable()
export class NotificationService {
  
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
  ) {}

  
  //  get notification settings
  async getNotificationSettings(
    userId: string
  ) {

    
    
  }

  
 
 
}
