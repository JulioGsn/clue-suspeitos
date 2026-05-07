import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Carta } from '../../cartas/entities/carta.entity';
import { Jogador } from '../../jogadores/entities/jogador.entity';
import { Partida } from '../../partidas/entities/partida.entity';

@Entity('perguntas')
export class Pergunta {
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
  @JoinColumn({ name: 'perguntador_id' })
  perguntador!: Jogador;

  @ManyToOne(() => Carta, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'carta1_id' })
  carta1!: Carta;

  @ManyToOne(() => Carta, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'carta2_id' })
  carta2!: Carta;

  @ManyToOne(() => Carta, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'carta_revelada_id' })
  cartaRevelada!: Carta | null;

  @Column({ name: 'foi_respondida', default: false })
  foiRespondida!: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
