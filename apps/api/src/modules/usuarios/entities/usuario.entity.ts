import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Perfil } from '../../perfis/entities/perfil.entity';

export enum UsuarioRole {
  ADMIN = 'ADMIN',
  PLAYER = 'PLAYER',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UsuarioRole,
    default: UsuarioRole.PLAYER,
  })
  role!: UsuarioRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToOne(() => Perfil, (perfil) => perfil.usuario)
  perfil!: Perfil;
}
