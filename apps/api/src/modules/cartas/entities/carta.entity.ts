import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Tema } from '../../temas/entities/tema.entity';

export enum TipoCarta {
  SUSPEITO = 'SUSPEITO',
  ARMA = 'ARMA',
  LOCAL = 'LOCAL',
}

@Entity('cartas')
@Unique('UQ_cartas_nome_tipo_tema', ['nome', 'tipo', 'tema'])
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

  @ManyToOne(() => Tema, (tema) => tema.cartas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tema_id' })
  tema!: Tema;
}
