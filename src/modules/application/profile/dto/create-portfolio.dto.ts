import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from "class-validator";

// create-profile.dto.ts or update-profile.dto.ts
export class PortfolioDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Array of portfolio image URLs/identifiers to delete',
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  deleteImages?: string[];
}