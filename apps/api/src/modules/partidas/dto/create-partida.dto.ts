import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreatePartidaDto {
  @IsUUID()
  temaId!: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(5)
  maxJogadores?: number;
}
