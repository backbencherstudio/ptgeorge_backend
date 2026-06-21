import * as admin from 'firebase-admin';
import { PrismaPg } from '@prisma/adapter-pg';
import appConfig from '../../../config/app.config';
import { PrismaClient } from '../../../../prisma/generated/client';

const connectionString = appConfig().database.url;
const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!admin.apps.length) {
  if (firebasePrivateKey && firebaseProjectId && firebaseClientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('💯💯💯 Firebase initialized successfully. 💯💯💯');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
    }
  } else {
    console.warn(
      '⚠️ Firebase credentials missing in .env file. Push notifications will not work.',
    );
  }
}

export type NotificationType =
  | 'new_user_registration'
  | 'new_user_created'
  | 'email_verification'
  | 'account_verification'
  | 'verification_approved'
  | 'verification_rejected'
  | 'profile_update'
  | 'danger_request'
  | 'account_action'
  | 'create_booking'
  | 'approve_booking'
  | 'complete_booking'
  | 'started_booking'
  | 'submitted_job'
  | 'approve_job_submission'
  | 'reject_job_submission'
  | 'conversation_created'
  | 'cancel_booking'
  |  'role_created'
  | 'community'
  | 'cleaner_verification_update'
  | 'review_booking'
  | 'update_commission'
  | 'update_booking';

export class NotificationRepository {
  
  // create notification
  static async createNotification(payload: {
    sender_id?: string | null;
    receiver_id: string;
    text: string;
    type: NotificationType;
    entity_id: string;
  }) {
    let { sender_id, receiver_id, text, type, entity_id } = payload;
    const safeSenderId = sender_id === 'system' ? null : sender_id ?? null;

    try {
      let notificationEvent = await prisma.notificationEvent.findFirst({
        where: { type, text },
      });

      if (!notificationEvent) {
        notificationEvent = await prisma.notificationEvent.create({
          data: { type, text },
        });
      }

      const newNotification = await prisma.notification.create({
        data: {
          sender_id: safeSenderId,
          receiver_id,
          entity_id,
          notification_event_id: notificationEvent.id,
        },
      });

      await this.sendPushNotification(receiver_id, type, text, entity_id);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // send push notification using firebase
  private static async sendPushNotification(
    receiverId: string,
    type: string,
    text: string,
    entityId: string,
  ) {
    if (!admin.apps.length) {
      console.warn(
        '⚠️ Firebase app is not initialized. Push notification skipped.',
      );
      return;
    }

    try {
      const user = await prisma.user.findUnique({
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
            entity_id: String(entityId),
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
  private static getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      new_user_registration: 'New User Registration',
      new_user_created: 'New User Created',
      email_verification: 'Email Verification',
      account_verification: 'Account Verification',
      verification_approved: 'Verification Approved',
      verification_rejected: 'Verification Rejected',
      profile_update: 'Profile Updated',
      danger_request: 'Danger Request',
      account_action: 'Account Action',

      create_booking: 'Booking Created',
      approve_booking: 'Booking Approved',
      complete_booking: 'Booking Completed',
      started_job: 'Job Started',
      submitted_job: 'Job Submitted',
      approve_job_submission: 'Job Submission Approved',
      reject_job_submission: 'Job Submission Rejected',
      cancel_booking: 'Booking Cancelled',
      review_booking: 'Booking Reviewed',
      update_booking: 'Booking Updated',
    };

    return titles[type] || 'New Notification';
  }

  
}
