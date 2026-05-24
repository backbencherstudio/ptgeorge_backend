import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Community id', type: 'string' })
  community_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Post title', type: 'string' })
  title: string;

}