import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carta } from '../cartas/entities/carta.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Tema } from '../temas/entities/tema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Perfil, Tema, Carta])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
