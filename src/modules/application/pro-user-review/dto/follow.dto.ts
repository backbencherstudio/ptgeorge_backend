import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FollowDto {
  @ApiProperty({ example: 'user_id_to_follow' })
  @IsString()
  following_id: string;
}
