import { IsOptional } from "class-validator";

// create-profile.dto.ts or update-profile.dto.ts
export class PortfolioDto {
  @IsOptional()
  deleteImages?: string[];
}