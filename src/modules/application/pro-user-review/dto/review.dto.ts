import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Amazing service! Very professional.',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateReviewDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ example: 'Updated comment', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class MarkHelpfulDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  is_helpful?: boolean = true;
}

export class CreateReviewReplyDto {
  @ApiProperty({ example: 'Thank you for your kind review!' })
  @IsString()
  comment: string;
}

export class FollowDto {
  @ApiProperty({ example: 'user_id_to_follow' })
  @IsString()
  following_id: string;
}
