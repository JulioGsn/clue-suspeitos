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

  async findAll(): Promise<{ id: string; nome: string; cartasCount: number }[]> {
    const temas = await this.temasRepository
      .createQueryBuilder('tema')
      .leftJoin('tema.cartas', 'cartas')
      .loadRelationCountAndMap('tema.cartasCount', 'tema.cartas')
      .orderBy('tema.nome', 'ASC')
      .getMany();

    return temas.map((t: any) => ({ id: t.id, nome: t.nome, cartasCount: t.cartasCount || 0 }));
  }

  async create(nome: string, donoId?: string): Promise<{ id: string; nome: string }> {
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

    const tema = this.temasRepository.create({ nome: nome.trim(), dono });
    await this.temasRepository.save(tema);
    return { id: tema.id, nome: tema.nome };
  }

  async remove(id: string) {
    const tema = await this.temasRepository.findOne({ where: { id } });
    if (!tema) throw new NotFoundException('Tema nao encontrado');
    await this.temasRepository.remove(tema);
    return;
  }
}
