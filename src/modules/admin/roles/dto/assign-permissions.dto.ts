import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({
    description:
      'Array of permission IDs to assign to the role. Full replace — existing permissions are removed and replaced with this list.',
    type: [String],
    example: ['clx1a2b3c0000abc', 'clx1a2b3c0001abc', 'clx1a2b3c0002abc'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionIds: string[];
}
