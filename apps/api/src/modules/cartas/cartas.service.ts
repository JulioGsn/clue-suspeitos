import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carta, TipoCarta } from './entities/carta.entity';
import { Tema } from '../temas/entities/tema.entity';

@Injectable()
export class CartasService {
  constructor(
    @InjectRepository(Carta)
    private readonly cartasRepository: Repository<Carta>,
    @InjectRepository(Tema)
    private readonly temasRepository: Repository<Tema>,
  ) {}

  async findAll(temaId?: string) {
    const where = temaId ? { tema: { id: temaId } as any } : {};
    const cartas = await this.cartasRepository.find({ where, relations: ['tema'], order: { nome: 'ASC' } as any });
    return cartas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, imageUrl: c.imageUrl, tema: c.tema ? { id: c.tema.id, nome: c.tema.nome } : null }));
  }

  async create(payload: { nome: string; tipo: TipoCarta | string; imageUrl: string; temaId: string }) {
    const { nome, tipo, imageUrl, temaId } = payload;
    if (!nome || !temaId || !tipo) {
      throw new BadRequestException('nome, tipo e temaId são obrigatórios');
    }

    const tema = await this.temasRepository.findOne({ where: { id: temaId } });
    if (!tema) {
      throw new BadRequestException('Tema não encontrado');
    }

    // Normalize tipo (accept frontend values like 'Suspeito' / 'Arma' / 'Local')
    let tipoNormalized: TipoCarta;
    if (typeof tipo === 'string') {
      const key = tipo.trim().toLowerCase();
      if (key === 'suspeito' || key === 'suspect' || key === 'sus') tipoNormalized = TipoCarta.SUSPEITO;
      else if (key === 'arma' || key === 'weapon') tipoNormalized = TipoCarta.ARMA;
      else if (key === 'local' || key === 'location' || key === 'lugar') tipoNormalized = TipoCarta.LOCAL;
      else if ((Object.values(TipoCarta) as string[]).includes(tipo as string)) tipoNormalized = tipo as TipoCarta;
      else throw new BadRequestException('Tipo inválido');
    } else {
      tipoNormalized = tipo as TipoCarta;
    }

    const carta = this.cartasRepository.create({ nome: nome.trim(), tipo: tipoNormalized as any, imageUrl, tema });
    try {
      await this.cartasRepository.save(carta);
    } catch (err: any) {
      // Handle duplicate unique constraint more gracefully
      if (err?.code === 'ER_DUP_ENTRY' || (err?.message && err.message.includes('duplicate'))) {
        throw new BadRequestException('Já existe uma prova com mesmo nome/tipo neste dossiê');
      }
      throw err;
    }
    return { id: carta.id, nome: carta.nome, tipo: carta.tipo, imageUrl: carta.imageUrl, tema: { id: tema.id, nome: tema.nome } };
  }

  async update(id: string, payload: { nome?: string; tipo?: TipoCarta | string; imageUrl?: string }) {
    const carta = await this.cartasRepository.findOne({ where: { id }, relations: ['tema'] });
    if (!carta) throw new NotFoundException('Carta nao encontrada');

    const { nome, tipo, imageUrl } = payload;
    if (nome !== undefined && nome !== null) carta.nome = String(nome).trim();

    if (tipo !== undefined && tipo !== null) {
      let tipoNormalized: TipoCarta;
      if (typeof tipo === 'string') {
        const key = tipo.trim().toLowerCase();
        if (key === 'suspeito' || key === 'suspect' || key === 'sus') tipoNormalized = TipoCarta.SUSPEITO;
        else if (key === 'arma' || key === 'weapon') tipoNormalized = TipoCarta.ARMA;
        else if (key === 'local' || key === 'location' || key === 'lugar') tipoNormalized = TipoCarta.LOCAL;
        else if ((Object.values(TipoCarta) as string[]).includes(tipo as string)) tipoNormalized = tipo as TipoCarta;
        else throw new BadRequestException('Tipo inválido');
      } else {
        tipoNormalized = tipo as TipoCarta;
      }
      carta.tipo = tipoNormalized as any;
    }

    if (imageUrl !== undefined && imageUrl !== null) carta.imageUrl = imageUrl;

    try {
      await this.cartasRepository.save(carta);
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY' || (err?.message && err.message.includes('duplicate'))) {
        throw new BadRequestException('Já existe uma prova com mesmo nome/tipo neste dossiê');
      }
      throw err;
    }

    return { id: carta.id, nome: carta.nome, tipo: carta.tipo, imageUrl: carta.imageUrl, tema: carta.tema ? { id: carta.tema.id, nome: carta.tema.nome } : null };
  }

  async remove(id: string) {
    const carta = await this.cartasRepository.findOne({ where: { id } });
    if (!carta) throw new NotFoundException('Carta nao encontrada');
    await this.cartasRepository.remove(carta);
    return;
  }
}
