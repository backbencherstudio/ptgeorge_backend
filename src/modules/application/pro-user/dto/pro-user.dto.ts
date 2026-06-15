export class PaginationDto {
  page?: number = 1;
  limit?: number = 10;
}

// dto/pro-user-filter.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ProUserFilterDto {
  @ApiProperty({
    required: false,
    description: 'Search by name, company, or profession',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by service category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, description: 'Filter by profession' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ required: false, description: 'Filter by distance in miles' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  distance?: number;

  @ApiProperty({
    required: false,
    description: 'User zip code for distance calculation',
  })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by rating (minimum stars)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}

export class ProUserReviewDto {
  @ApiProperty()
  rating: number;

  @ApiProperty()
  count: number;
}

export class ProUserLocationDto {
  @ApiProperty()
  distance: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  city: string;

  @ApiProperty({ required: false })
  state?: string;

  @ApiProperty({ required: false })
  zipCode?: string;
}

export class ProUserListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false })
  fullName: string;

  @ApiProperty({ required: false })
  companyName: string;

  @ApiProperty({ required: false })
  profession: string;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiProperty({ type: ProUserLocationDto })
  location: ProUserLocationDto;

  @ApiProperty({ required: false })
  avatar: string;

  @ApiProperty({ required: false })
  description: string;
}

export class ProUserDetailsDto extends ProUserListItemDto {
  @ApiProperty({ required: false })
  businessEmail: string;

  @ApiProperty({ required: false })
  businessPhone: string;

  @ApiProperty({ required: false })
  website: string;

  @ApiProperty({ required: false })
  whatsappNumber: string;

  @ApiProperty({ required: false })
  availableTime: string;

  @ApiProperty({ required: false })
  addressLine1: string;

  @ApiProperty({ required: false })
  addressLine2: string;

  @ApiProperty({ required: false })
  state: string;

  @ApiProperty({ required: false })
  country: string;

  @ApiProperty({ required: false })
  businessPortfolio: string;

  @ApiProperty({ type: [String], required: false })
  portfolioImages: string[];

  @ApiProperty({ type: [Object], required: false })
  skills: { id: string; skillName: string }[];

  @ApiProperty({ required: false })
  aboutMe: string;

  @ApiProperty({ required: false })
  availability: string;
}

export class ProUserListResponseDto {
  @ApiProperty({ type: [ProUserListItemDto] })
  data: ProUserListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ProUserFilterOptionsDto {
  @ApiProperty({ type: [String] })
  services: string[];

  @ApiProperty({ type: [String] })
  professions: string[];

  @ApiProperty({ type: [Number] })
  distances: number[];
}
