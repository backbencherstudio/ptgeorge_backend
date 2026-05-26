import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty } from 'class-validator';

export class CreateSkillDto {
 
  @IsNotEmpty()
  skill_name: string;
}
