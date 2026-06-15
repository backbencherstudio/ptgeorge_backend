import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { NotificationSettingType } from 'prisma/generated/enums';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
  ) {}

  /*--------------------------------(utils part start)---------------------------------- */

  // All notification types
  private static readonly ALL_NOTIFICATION_TYPES: NotificationSettingType[] = [
    NotificationSettingType.NEW_REQUEST_ALERT,
    NotificationSettingType.APPROVAL_CONFIRMATION,
    NotificationSettingType.ROLE_ASSIGNMENT_ALERT,
    NotificationSettingType.NEW_REVIEW_ALERT,
    NotificationSettingType.NEW_FOLLOW_ALERT,
  ];

  // Metadata for each notification type - FIXED: Added missing entries
  private static readonly NOTIFICATION_META: Record<
    NotificationSettingType,
    { label: string; description: string }
  > = {
    [NotificationSettingType.NEW_REQUEST_ALERT]: {
      label: 'New Request Alert',
      description: 'Instant notification for new requests',
    },
    [NotificationSettingType.APPROVAL_CONFIRMATION]: {
      label: 'Approval Confirmation',
      description: 'When member is approved',
    },
    [NotificationSettingType.ROLE_ASSIGNMENT_ALERT]: {
      label: 'Role Assignment Alert',
      description: 'When roles are assigned',
    },
    [NotificationSettingType.NEW_REVIEW_ALERT]: {
      label: 'New Review Alert',
      description: 'When someone reviews your profile',
    },
    [NotificationSettingType.NEW_FOLLOW_ALERT]: {
      label: 'New Follow Alert',
      description: 'When someone follows you',
    },
  };

  /*--------------------------------(utils part end)---------------------------------- */

  //  get notification settings
  async getNotificationSettings(userId: string) {
    if (!userId) {
      throw new BadRequestException('User id not found');
    }

    const existingSettings = await this.prisma.userNotificationSetting.findMany(
      {
        where: { user_id: userId },
        select: { type: true, is_enabled: true },
      },
    );

    const settingsMap = new Map<NotificationSettingType, boolean>(
      existingSettings.map((s) => [s.type, s.is_enabled]),
    );

    // Always return all notification types; if not in DB then false.
    const settings = NotificationService.ALL_NOTIFICATION_TYPES.map((type) => ({
      type,
      label: NotificationService.NOTIFICATION_META[type]?.label ?? type,
      description:
        NotificationService.NOTIFICATION_META[type]?.description ?? '',
      isEnabled: settingsMap.has(type) ? settingsMap.get(type)! : false,
    }));

    return {
      userId,
      settings,
    };
  }

  // update notification settings
  async updateNotificationSettings(
    userId: string,
    updateDto: { type: NotificationSettingType; isEnabled: boolean },
  ) {
    if (!userId) {
      throw new BadRequestException('User id not found');
    }

    const compoundWhere = { user_id: userId, type: updateDto.type };
    const existing = await this.prisma.userNotificationSetting.findUnique({
      where: { user_id_type: compoundWhere },
    });

    let updated;
    if (existing) {
      updated = await this.prisma.userNotificationSetting.update({
        where: { id: existing.id },
        data: { is_enabled: updateDto.isEnabled },
      });
    } else {
      updated = await this.prisma.userNotificationSetting.create({
        data: {
          user_id: userId,
          type: updateDto.type,
          is_enabled: updateDto.isEnabled,
        },
      });
    }
    return {
      message: `${updateDto.type} ${updateDto.isEnabled ? 'enabled' : 'disabled'} successfully`,
      setting: {
        type: updated.type,
        label:
          NotificationService.NOTIFICATION_META[updated.type]?.label ??
          updated.type,
        description:
          NotificationService.NOTIFICATION_META[updated.type]?.description ??
          '',
        isEnabled: updated.is_enabled,
      },
    };
  }
}
