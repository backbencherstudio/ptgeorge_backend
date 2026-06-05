import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSkillDto {
 
  @ApiProperty({
    example: 'TypeScript',
    description: 'Name of the skill',
  })
  @IsString()
  skill_name: string;
}
