import { IsUUID } from 'class-validator';

export class CreatePerguntaDto {
  @IsUUID()
  carta1Id!: string;

  @IsUUID()
  carta2Id!: string;
}
