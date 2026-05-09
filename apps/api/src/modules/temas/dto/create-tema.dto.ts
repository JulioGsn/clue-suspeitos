import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTemaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsUUID()
  @IsOptional()
  donoId?: string;

  @IsEnum(['PUBLIC', 'PRIVATE'])
  @IsOptional()
  visibilidade?: 'PUBLIC' | 'PRIVATE';
}
