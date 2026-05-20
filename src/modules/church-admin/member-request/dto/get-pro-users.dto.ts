// dto/get-pro-users.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from 'prisma/generated/enums';

export enum UserApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ALL = 'all',
}

export enum UserAccountType {
  USER = 'USER',
  PRO_USER = 'PRO_USER',
  ALL = 'all',
}

// Move ApprovalType BEFORE it's used
export enum ApprovalType {
  HELPER = 'helper',
  MEMBER = 'member',
}

export class GetProUsersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: UserApprovalStatus,
    default: UserApprovalStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(UserApprovalStatus)
  status?: UserApprovalStatus = UserApprovalStatus.PENDING;

  @ApiPropertyOptional({ enum: UserAccountType, default: UserAccountType.ALL })
  @IsOptional()
  @IsEnum(UserAccountType)
  account_type?: UserAccountType = UserAccountType.ALL;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by church name' })
  @IsOptional()
  @IsString()
  church_name?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['created_at', 'first_name', 'last_name', 'status'],
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sort_order?: string = 'desc';
}

// ApproveUserDto now comes AFTER ApprovalType is declared
export class ApproveUserDto {
  @ApiProperty({
    enum: ApprovalType,
    description: 'Type of approval - helper or member',
    example: ApprovalType.HELPER,
  })
  @IsEnum(ApprovalType)
  approvalType: ApprovalType;
}
