import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { UserStatus } from "prisma/generated/enums";

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'User status',
    required: true,
  })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}
