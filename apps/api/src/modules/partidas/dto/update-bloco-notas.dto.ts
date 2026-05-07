import { IsObject } from 'class-validator';

export class UpdateBlocoNotasDto {
  @IsObject()
  blocoDeNotas!: Record<string, unknown>;
}
