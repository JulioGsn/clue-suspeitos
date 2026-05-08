import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Partida } from './partida.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('chat_messages')
export class ChatMessage {
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

  @Column({
    name: 'author_username',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  authorUsername!: string | null;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
