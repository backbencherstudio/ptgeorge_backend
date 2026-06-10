import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import appConfig from '../config/app.config';

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('mail-queue') private queue: Queue,
    private mailerService: MailerService,
  ) {}

  async sendMemberInvitation({ user, member, url }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = `${user.fname} is inviting you to ${appConfig().app.name}`;

      // add to queue
      await this.queue.add('sendMemberInvitation', {
        to: member.email,
        from: from,
        subject: subject,
        template: 'member-invitation',
        context: {
          user: user,
          member: member,
          url: url,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  // send otp code for email verification
  async sendOtpCodeToEmail({ name, email, otp }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = 'Email Verification';

      // add to queue
      await this.queue.add('sendOtpCodeToEmail', {
        to: email,
        from: from,
        subject: subject,
        template: 'email-verification',
        context: {
          name: name,
          otp: otp,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendVerificationLink(params: {
    email: string;
    name: string;
    token: string;
    type: string;
  }) {
    try {
      const verificationLink = `${appConfig().app.client_app_url}/verify-email?token=${params.token}&email=${params.email}&type=${params.type}`;

      // add to queue
      await this.queue.add('sendVerificationLink', {
        to: params.email,
        subject: 'Verify Your Email',
        template: './verification-link',
        context: {
          name: params.name,
          verificationLink,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendContactNotification(contactData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    subject: string;
    message: string;
  }) {
    try {
      const { firstName, lastName, phone, email, subject, message } =
        contactData;
      const adminEmail = appConfig().mail.user;
      const from = `${firstName} ${lastName} <${email}>`;
      const appName = process.env.APP_NAME || appConfig().app.name;

      // Queue the admin notification email
      await this.queue.add('sendContactNotification', {
        to: adminEmail,
        from: from,
        subject: `New Contact Form Submission: ${subject}`,
        template: './contact-notification',
        context: {
          firstName,
          lastName,
          phone,
          email,
          subject,
          message,
          submittedAt: new Date(),
          appName,
        },
      });

      // Queue auto-reply to user
      await this.queue.add('sendAutoReply', {
        to: email,
        subject: `Thank you for contacting ${appName}`,
        template: './auto-reply',
        context: {
          firstName,
          lastName,
          appName,
        },
      });
    } catch (error) {
      console.log('Error sending contact notification:', error);
      throw error;
    }
  }
}
