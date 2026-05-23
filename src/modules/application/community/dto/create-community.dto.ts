import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty()
  community_id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

}