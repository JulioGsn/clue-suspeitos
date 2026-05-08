import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tema } from './entities/tema.entity';

@Injectable()
export class TemasService {
  constructor(
    @InjectRepository(Tema)
    private readonly temasRepository: Repository<Tema>,
  ) {}

  async findAll(): Promise<{ id: string; nome: string }[]> {
    const temas = await this.temasRepository.find({
      relations: ['dono'],
      order: { nome: 'ASC' },
    });
    return temas.map((t) => ({ id: t.id, nome: t.nome }));
  }
}
