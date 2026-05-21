import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../../prisma/prisma.service';

export type NotificationType =
  | 'NEW_REQUEST_ALERT'
  | 'APPROVAL_CONFIRMATION'
  | 'PROLE_ASSIGNMENT_ALERT';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    text?: string;
    type?: NotificationType;
    entity_id?: string;
  }) {
    try {
      const notificationEventData = {};
      if (type) {
        notificationEventData['type'] = type;
      }
      if (text) {
        notificationEventData['text'] = text;
      }
      
      const notificationEvent = await this.prisma.notificationEvent.create({
        data: {
          type: type,
          text: text,
          ...notificationEventData,
        },
      });

      const notificationData = {};
      if (sender_id) {
        notificationData['sender_id'] = sender_id;
      }
      if (receiver_id) {
        notificationData['receiver_id'] = receiver_id;
      }
      if (entity_id) {
        notificationData['entity_id'] = entity_id;
      }

      const notification = await this.prisma.notification.create({
        data: {
          notification_event_id: notificationEvent.id,
          ...notificationData,
        },
      });

      if (receiver_id && type && text) {
        await this.sendPushNotification(receiver_id, type, text, entity_id);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // send push notification using firebase
  private async sendPushNotification(
    receiverId: string,
    type: string,
    text: string,
    entityId?: string,
  ) {
    if (!admin.apps.length) {
      console.warn(
        '⚠️ Firebase app is not initialized. Push notification skipped.',
      );
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { fcm_token: true },
      });

      if (user?.fcm_token) {
        const message: admin.messaging.Message = {
          token: user.fcm_token,
          notification: {
            title: this.getNotificationTitle(type),
            body: text,
          },
          data: {
            entity_id: entityId ? String(entityId) : '',
            type: String(type),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        };

        await admin.messaging().send(message);
      } else {
        console.warn(
          `⚠️ FCM token missing for user ${receiverId}. Push notification skipped.`,
        );
      }
    } catch (error) {
      console.error('❌ Error sending FCM:', error);
    }
  }

  // get notification title based on type
  private getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      new_request_alert: 'New Request Alert',
      approval_confirmation: 'Approval Confirmation',
      role_assignment_alert: 'Role Assignment Alert',
      
    };

    return titles[type] || 'New Notification';
  }
}
