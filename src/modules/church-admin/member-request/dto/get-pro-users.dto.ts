import { IsOptional, IsInt, Min, Max, IsNotEmpty, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetProUsersDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ required: false, enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  status?: string;
}

export enum ApprovalType {
  HELPER = 'HELPER',
  MEMBER = 'MEMBER',
}

export class ApproveUserDto {
  @ApiProperty({
    enum: ApprovalType,
    description: 'Type of approval - helper or member',
    example: ApprovalType.HELPER,
  })
  @IsNotEmpty()
  @IsEnum(ApprovalType)
  approvalType: ApprovalType;
}
