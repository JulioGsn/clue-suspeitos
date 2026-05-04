import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum OperacaoAuditoria {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @CreateDateColumn()
  timestamp!: Date;

  @Column({ length: 50 })
  tabela!: string;

  @Column({
    type: 'enum',
    enum: OperacaoAuditoria,
  })
  operacao!: OperacaoAuditoria;

  @Column({ name: 'payload_anterior', type: 'json', nullable: true })
  payloadAnterior!: Record<string, unknown> | null;

  @Column({ name: 'payload_novo', type: 'json', nullable: true })
  payloadNovo!: Record<string, unknown> | null;

  @Column({ name: 'responsavel_id', length: 36, nullable: true })
  responsavelId!: string | null;
}
