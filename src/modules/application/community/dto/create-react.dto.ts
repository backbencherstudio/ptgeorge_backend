import { IsIn, IsNotEmpty } from 'class-validator';

export class ReactPostDto {
  @IsNotEmpty()
  @IsIn(['LIKE', 'LOVE'])
  react_type: 'LIKE' | 'LOVE';
}