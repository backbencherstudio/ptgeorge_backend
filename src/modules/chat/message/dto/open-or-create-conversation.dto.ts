import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class OpenOrCreateConversationDto {
  @IsNotEmpty()
  @Type(() => String)
  @IsString()
  @ApiProperty({
    description: 'The id of the user to open a conversation with',
  })
  participant_id: string;
}