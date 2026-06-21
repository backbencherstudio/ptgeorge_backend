import { NotificationRepository, prisma } from "../notification.repository";
import type { NotificationType } from "../notification.repository";

/*----------------------(Send Admin Notification)----------------------*/

type SendAdminNotificationPayload = {
  sender_id?: string | null;
  text: string;
  type: NotificationType;
  entity_id?: string;
};

export const sendAdminNotification = async (
  payload: SendAdminNotificationPayload,
) => {
  const adminUser = await prisma.user.findFirst({
    where: {
      type: "ADMIN",
    },
  });

  if (!adminUser) {
    return null;
  }

  const notificationPayload = {
    sender_id: payload.sender_id === 'system' ? null : payload.sender_id,
    receiver_id: adminUser.id,
    text: payload.text,
    type: payload.type,
    entity_id: payload.entity_id || payload.sender_id,
  };

  return await NotificationRepository.createNotification(notificationPayload);
};

/*-----------------------(Send User Notification)----------------------*/


type SendUserNotificationPayload = {
  sender_id?: string | null;
  receiver_id: string;
  text: string;
  type: NotificationType;
  entity_id?: string;
};

export const sendUserNotification = async (

  payload: SendUserNotificationPayload,
) => {
  const notificationPayload = {
    ...payload,
    sender_id: payload.sender_id === 'system' ? null : payload.sender_id,
    entity_id: payload.entity_id ?? payload.sender_id,
  };

  return await NotificationRepository.createNotification(notificationPayload);
};


/*-----------------------(Only Send User Notification)----------------------*/


type SendMeNotificationPayload = {
  sender_id?: string | null;
  receiver_id: string;
  text: string;
  type: NotificationType;
  entity_id?: string;
};


export const onlySendUserNotification = async (
  payload: SendMeNotificationPayload,
) => {
  const notificationPayload = {
    ...payload,
    entity_id: payload.entity_id ?? payload.sender_id,
  };
  return await NotificationRepository.createNotification(notificationPayload);
};
