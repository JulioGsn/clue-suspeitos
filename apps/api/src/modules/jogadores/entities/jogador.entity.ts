import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Partida } from '../../partidas/entities/partida.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('jogadores')
@Check('CHK_jogadores_ordem_turno', 'ordem_turno IS NULL OR ordem_turno > 0')
export class Jogador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Partida, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partida_id' })
  partida!: Partida;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario | null;

  @Column({ name: 'ordem_turno', type: 'int', nullable: true })
  ordemTurno!: number | null;

  @Column({ name: 'is_bot', default: false })
  isBot!: boolean;

  @Column({ name: 'is_eliminado', default: false })
  isEliminado!: boolean;

  @Column({ name: 'bloco_de_notas', type: 'json', nullable: true })
  blocoDeNotas!: Record<string, unknown> | null;
}
