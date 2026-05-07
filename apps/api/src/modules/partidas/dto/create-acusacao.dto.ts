import { IsUUID } from 'class-validator';

export class CreateAcusacaoDto {
  @IsUUID()
  suspeitoId!: string;

  @IsUUID()
  armaId!: string;

  @IsUUID()
  localId!: string;
}
