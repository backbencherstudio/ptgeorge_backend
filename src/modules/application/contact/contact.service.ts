import { Injectable, Logger } from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import { CreateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly mailService: MailService) {}

  async submitContactForm(
    contactData: CreateContactDto,
  ) {
    try {
      await this.mailService.sendContactNotification({
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        phone: contactData.phone,
        email: contactData.email,
        subject: contactData.subject,
        message: contactData.message,
      });

      this.logger.log(
        `Contact form submitted by ${contactData.firstName} ${contactData.lastName} (${contactData.email})`,
      );

      return {
        success: true,
        message:
          'Your message has been sent successfully! We will get back to you soon.',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error submitting contact form:', error);
      throw error;
    }
  }
}
