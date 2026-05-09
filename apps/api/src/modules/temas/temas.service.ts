import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tema } from './entities/tema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class TemasService {
  constructor(
    @InjectRepository(Tema)
    private readonly temasRepository: Repository<Tema>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async findAll(): Promise<{
    id: string;
    nome: string;
    cartasCount: number;
    visibilidade: string;
    donoId?: string | null;
    suspeitoCount?: number;
    armaCount?: number;
    localCount?: number;
  }[]> {
    // Return per-theme totals including counts per card type and owner id so front-end can filter
    const rows: any[] = await this.temasRepository
      .createQueryBuilder('tema')
      .leftJoin('tema.dono', 'dono')
      .leftJoin('tema.cartas', 'cartas')
      .select('tema.id', 'id')
      .addSelect('tema.nome', 'nome')
      .addSelect('tema.visibilidade', 'visibilidade')
      .addSelect('dono.id', 'donoId')
      .addSelect('COUNT(cartas.id)', 'cartasCount')
      .addSelect("SUM(CASE WHEN cartas.tipo = 'SUSPEITO' THEN 1 ELSE 0 END)", 'suspeitoCount')
      .addSelect("SUM(CASE WHEN cartas.tipo = 'ARMA' THEN 1 ELSE 0 END)", 'armaCount')
      .addSelect("SUM(CASE WHEN cartas.tipo = 'LOCAL' THEN 1 ELSE 0 END)", 'localCount')
      .groupBy('tema.id')
      .addGroupBy('dono.id')
      .addGroupBy('tema.nome')
      .addGroupBy('tema.visibilidade')
      .orderBy('tema.nome', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      visibilidade: r.visibilidade || 'PUBLIC',
      cartasCount: Number(r.cartasCount || 0),
      donoId: r.donoId || null,
      suspeitoCount: Number(r.suspeitoCount || 0),
      armaCount: Number(r.armaCount || 0),
      localCount: Number(r.localCount || 0),
    } as any));
  }

  async create(nome: string, donoId?: string, visibilidade?: 'PUBLIC' | 'PRIVATE'): Promise<{ id: string; nome: string; visibilidade: string }> {
    if (!nome || !nome.trim()) {
      throw new BadRequestException('Nome do tema é obrigatório');
    }

    let dono: Usuario | null = null;
    if (donoId) {
      dono = await this.usuariosRepository.findOne({ where: { id: donoId } });
    }

    if (!dono) {
      // fallback: use any existing user as owner
      // TypeORM v0.3 requires an options object for findOne; pass empty options to retrieve one user.
      dono = await this.usuariosRepository.findOne({});
    }

    if (!dono) {
      throw new BadRequestException('Nenhum usuário disponível para ser dono do tema');
    }

    const tema = this.temasRepository.create({ nome: nome.trim(), dono, visibilidade: visibilidade || 'PUBLIC' });
    await this.temasRepository.save(tema);
    return { id: tema.id, nome: tema.nome, visibilidade: tema.visibilidade };
  }

  async update(id: string, payload: { nome?: string; visibilidade?: 'PUBLIC' | 'PRIVATE' }) {
    const tema = await this.temasRepository.findOne({ where: { id } });
    if (!tema) throw new NotFoundException('Tema nao encontrado');

    if (payload.nome !== undefined && payload.nome !== null) tema.nome = String(payload.nome).trim();
    if (payload.visibilidade !== undefined && payload.visibilidade !== null) tema.visibilidade = payload.visibilidade;

    await this.temasRepository.save(tema);
    return { id: tema.id, nome: tema.nome, visibilidade: tema.visibilidade };
  }

  async remove(id: string) {
    const tema = await this.temasRepository.findOne({ where: { id } });
    if (!tema) throw new NotFoundException('Tema nao encontrado');
    await this.temasRepository.remove(tema);
    return;
  }
}
