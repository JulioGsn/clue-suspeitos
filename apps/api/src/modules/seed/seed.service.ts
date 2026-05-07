import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Carta } from '../cartas/entities/carta.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Tema } from '../temas/entities/tema.entity';
import { Usuario, UsuarioRole } from '../usuarios/entities/usuario.entity';
import { CARTAS_BASE_SEED } from './cartas.seed';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Perfil)
    private readonly perfisRepository: Repository<Perfil>,
    @InjectRepository(Tema)
    private readonly temasRepository: Repository<Tema>,
    @InjectRepository(Carta)
    private readonly cartasRepository: Repository<Carta>,
  ) {}

  async run(): Promise<void> {
    const admin = await this.seedAdmin();
    const tema = await this.seedTemaPadrao(admin);
    await this.seedCartasBase(tema);

    this.logger.log('Seed concluido');
  }

  private async seedAdmin(): Promise<Usuario> {
    const email = 'admin@detetive.com';
    let admin = await this.usuariosRepository.findOne({
      where: { email },
      relations: { perfil: true },
    });

    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      admin = await this.usuariosRepository.save(
        this.usuariosRepository.create({
          email,
          passwordHash,
          role: UsuarioRole.ADMIN,
        }),
      );
      this.logger.log('Usuario admin criado');
    }

    if (admin.role !== UsuarioRole.ADMIN) {
      admin.role = UsuarioRole.ADMIN;
      admin = await this.usuariosRepository.save(admin);
    }

    if (!admin.perfil) {
      await this.perfisRepository.save(
        this.perfisRepository.create({
          usuario: admin,
          username: 'Admin',
          avatarUrl: null,
        }),
      );
      this.logger.log('Perfil do admin criado');
    }

    return admin;
  }

  private async seedTemaPadrao(dono: Usuario): Promise<Tema> {
    const nome = 'Classico';
    const existingTema = await this.temasRepository.findOne({
      where: {
        nome,
        dono: { id: dono.id },
      },
      relations: { dono: true },
    });

    if (existingTema) {
      return existingTema;
    }

    const tema = await this.temasRepository.save(
      this.temasRepository.create({
        nome,
        dono,
      }),
    );
    this.logger.log('Tema padrao criado');

    return tema;
  }

  private async seedCartasBase(tema: Tema): Promise<void> {
    for (const cartaSeed of CARTAS_BASE_SEED) {
      const existingCarta = await this.cartasRepository.findOne({
        where: {
          nome: cartaSeed.nome,
          tipo: cartaSeed.tipo,
          tema: { id: tema.id },
        },
        relations: { tema: true },
      });

      if (existingCarta) {
        if (existingCarta.imageUrl !== cartaSeed.imageUrl) {
          existingCarta.imageUrl = cartaSeed.imageUrl;
          await this.cartasRepository.save(existingCarta);
        }
        continue;
      }

      await this.cartasRepository.save(
        this.cartasRepository.create({
          ...cartaSeed,
          tema,
        }),
      );
    }

    this.logger.log(`${CARTAS_BASE_SEED.length} cartas base garantidas`);
  }
}
