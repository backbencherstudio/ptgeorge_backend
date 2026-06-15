import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FollowDto {
  @ApiProperty({ example: 'user_id_to_follow' })
  @IsUUID()
  following_id: string;
}
