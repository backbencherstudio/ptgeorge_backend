import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit contact form',
    description:
      'Submit a contact form message that will be sent to the admin email',
  })
  @ApiBody({
    type: CreateContactDto,
    description: 'Contact form data',
    examples: {
      example1: {
        summary: 'Typical contact form submission',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com',
          subject: 'Hospitality',
          message: 'I would like to know more about your hospitality services.',
        },
      },
    },
  })
  async submitContactForm(@Body() createContactDto: CreateContactDto) {
    return await this.contactService.submitContactForm(createContactDto);
  }
}
