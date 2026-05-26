import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty } from 'class-validator';

export class CreateSkillDto {
 
  @ApiProperty({
    example: 'TypeScript',
    description: 'Name of the skill',
  })
  @IsNotEmpty()
  skill_name: string;
}
