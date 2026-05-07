import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Carta } from '../../cartas/entities/carta.entity';
import { Jogador } from '../../jogadores/entities/jogador.entity';
import { Partida } from '../../partidas/entities/partida.entity';

@Entity('mao_cartas')
@Unique('UQ_mao_cartas_partida_jogador_carta', ['partida', 'jogador', 'carta'])
export class MaoCarta {
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

  @ManyToOne(() => Carta, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'carta_id' })
  carta!: Carta;
}
