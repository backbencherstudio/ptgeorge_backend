import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
 
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Comment content', type: 'string' })
  comment: string;


}