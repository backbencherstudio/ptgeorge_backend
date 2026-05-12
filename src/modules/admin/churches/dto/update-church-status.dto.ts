import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ChurchStatus } from 'prisma/generated/enums';

export class UpdateChurchStatusDto {
  @ApiProperty({ enum: ChurchStatus, example: 'APPROVED' })
  @IsEnum(ChurchStatus)
  status: ChurchStatus;
}
