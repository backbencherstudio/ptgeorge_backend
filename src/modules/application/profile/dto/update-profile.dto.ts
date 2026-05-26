import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
	@ApiPropertyOptional({
		type: 'string',
		format: 'binary',
		description: 'Profile avatar image file',
	})
	@IsOptional()
	avatar?: any;

	@ApiPropertyOptional({
		description: 'When true and no new avatar uploaded, remove existing avatar',
	})
	@IsOptional()
	@IsBoolean()
	remove_avatar?: boolean;
}
