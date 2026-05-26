import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
	@ApiPropertyOptional({
		description: 'When true and no new avatar uploaded, remove existing avatar',
	})
	@IsOptional()
	@IsBoolean()
	remove_avatar?: boolean;
}
