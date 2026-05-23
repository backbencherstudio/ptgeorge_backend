import { PartialType } from '@nestjs/swagger';
import { CreateAdDto } from './create-ad.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AdStatus } from 'prisma/generated/enums';

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @ApiProperty({
    enum: AdStatus,
    description: 'Update ad status',
    required: false,
  })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;
}
