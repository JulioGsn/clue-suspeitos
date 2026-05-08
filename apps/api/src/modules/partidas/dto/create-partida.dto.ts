import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { VisibilidadePartida } from '../entities/partida.entity';

export class CreatePartidaDto {
  @IsUUID()
  temaId!: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(5)
  maxJogadores?: number;

  @IsOptional()
  @IsIn(Object.values(VisibilidadePartida))
  visibilidade?: VisibilidadePartida;
}
