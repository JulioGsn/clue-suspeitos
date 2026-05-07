import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Carta } from '../../cartas/entities/carta.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('temas')
@Unique('UQ_temas_nome_dono', ['nome', 'dono'])
export class Tema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  nome!: string;

  @ManyToOne(() => Usuario, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dono_id' })
  dono!: Usuario;

  @OneToMany(() => Carta, (carta) => carta.tema)
  cartas!: Carta[];
}
