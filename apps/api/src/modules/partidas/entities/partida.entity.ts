import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Carta } from '../../cartas/entities/carta.entity';
import { Tema } from '../../temas/entities/tema.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum StatusPartida {
  LOBBY = 'LOBBY',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  FINALIZADA = 'FINALIZADA',
}

export enum VisibilidadePartida {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Entity('partidas')
@Check(
  'CHK_partidas_max_jogadores',
  'max_jogadores >= 2 AND max_jogadores <= 5',
)
@Check('CHK_partidas_turno_atual', 'turno_atual > 0')
export class Partida {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Usuario, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anfitriao_id' })
  anfitriao!: Usuario;

  @ManyToOne(() => Tema, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'tema_id' })
  tema!: Tema;

  @Column({ name: 'max_jogadores', type: 'int' })
  maxJogadores!: number;

  @Column({
    type: 'enum',
    enum: StatusPartida,
    default: StatusPartida.LOBBY,
  })
  status!: StatusPartida;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vencedor_id' })
  vencedor!: Usuario | null;

  @ManyToOne(() => Carta, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'suspeito_id' })
  suspeito!: Carta | null;

  @ManyToOne(() => Carta, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'arma_id' })
  arma!: Carta | null;

  @ManyToOne(() => Carta, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'local_id' })
  local!: Carta | null;

  @Column({ name: 'cartas_reveladas', type: 'json', nullable: true })
  cartasReveladas!: string[] | null;

  @Column({ name: 'turno_atual', type: 'int', default: 1 })
  turnoAtual!: number;

  @Column({
    name: 'codigo',
    type: 'varchar',
    length: 12,
    nullable: true,
    unique: true,
  })
  codigo!: string | null;

  @Column({
    name: 'visibilidade',
    type: 'enum',
    enum: VisibilidadePartida,
    default: VisibilidadePartida.PRIVATE,
  })
  visibilidade!: VisibilidadePartida;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
