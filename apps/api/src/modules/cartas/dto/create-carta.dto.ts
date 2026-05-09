import { IsEnum, IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';
import { TipoCarta } from '../entities/carta.entity';

export class CreateCartaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEnum(TipoCarta)
  tipo: TipoCarta;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsUUID()
  temaId: string;
}
