import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Jogador } from '../../jogadores/entities/jogador.entity';
import { Partida } from '../../partidas/entities/partida.entity';

@Entity('mensagens')
export class Mensagem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Partida, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partida_id' })
  partida!: Partida;

  @ManyToOne(() => Jogador, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jogador_id' })
  jogador!: Jogador;

  @Column({ name: 'predefined_text_id', length: 50 })
  predefinedTextId!: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
