import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReactPostDto {
  @IsNotEmpty()
  @IsIn(['LIKE', 'LOVE'])
  @ApiProperty({ description: 'Reaction type', enum: ['LIKE', 'LOVE'] })
  react_type: 'LIKE' | 'LOVE';
}