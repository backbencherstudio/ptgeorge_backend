import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
 
  @IsString()
  @IsNotEmpty()
  content: string;


}