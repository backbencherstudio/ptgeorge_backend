import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    example: 'clx123...',
    description: 'User ID to assign role to',
  })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'clx456...', description: 'Role ID being assigned' })
  @IsString()
  roleId: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Send email notification',
  })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}
