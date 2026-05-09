import { IsNotEmpty, IsString, Length } from 'class-validator';

export class EntrarPartidaDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'O código deve ter exatamente 6 caracteres' })
  codigo: string;
}
