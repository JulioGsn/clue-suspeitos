import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePerfilDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  newPassword?: string;
}
