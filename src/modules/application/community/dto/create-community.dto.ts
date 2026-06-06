import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCommunityPostDto {
  @ApiPropertyOptional({
    example: 'Sunday Service',
    description: 'Post title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Amazing worship service today!',
    description: 'Post content',
  })
  @IsOptional()
  @IsString()
  content?: string;
}