import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { AnnouncementAudience, AnnouncementStatus } from 'prisma/generated/enums';

export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'Platform Maintenance — Feb 15',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Announcement message/content',
    example: 'Scheduled maintenance on Feb 15 from 2–4 AM EST.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiProperty({
    enum: AnnouncementStatus,
    description: 'Publication status of the announcement',
    default: AnnouncementStatus.PUBLISHED,
    required: false,
    example: AnnouncementStatus.PUBLISHED,
  })
  @IsEnum(AnnouncementStatus)
  @IsOptional()
  status?: AnnouncementStatus;

  @ApiProperty({
    enum: AnnouncementAudience,
    description: `Who can see this announcement:
- ALL_USERS: Regular users (can be filtered by target_church_ids)
- CHURCH_ADMINS_ONLY: Only church administrators
- SUPER_ADMINS_ONLY: Only super administrators

💡 Tip: Use target_church_ids with ALL_USERS to show to specific churches only.`,
    default: AnnouncementAudience.ALL_USERS,
    required: false,
    example: AnnouncementAudience.ALL_USERS,
  })
  @IsEnum(AnnouncementAudience)
  @IsOptional()
  audience?: AnnouncementAudience;

  @ApiProperty({
    description: `Target specific churches:
- Empty array [] = ALL churches see this announcement
- With church IDs = ONLY those churches see this announcement

Examples:
- [] → Everyone sees it
- ["church-id-1"] → Only church-1 members see it
- ["church-id-1", "church-id-2"] → Only church-1 and church-2 members see it`,
    type: [String],
    required: false,
    example: [],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  target_church_ids?: string[];

  @ApiProperty({
    description: 'When should this announcement start showing? (ISO format)',
    example: '2025-02-08T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({
    description: 'When should this announcement stop showing? (ISO format)',
    example: '2025-02-15T23:59:59Z',
  })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;
}
