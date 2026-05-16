import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ description: 'New role ID to replace the existing one' })
  @IsString()
  newRoleId: string;
}
