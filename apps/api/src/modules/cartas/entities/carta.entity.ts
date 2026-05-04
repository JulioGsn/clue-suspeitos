import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoCarta {
  SUSPEITO = 'SUSPEITO',
  ARMA = 'ARMA',
  LOCAL = 'LOCAL',
}

@Entity('cartas')
export class Carta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  nome!: string;

  @Column({
    type: 'enum',
    enum: TipoCarta,
  })
  tipo!: TipoCarta;

  @Column({ name: 'image_url', length: 255 })
  imageUrl!: string;
}
