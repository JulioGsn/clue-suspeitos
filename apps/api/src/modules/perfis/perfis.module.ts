import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Perfil } from './entities/perfil.entity';
import { PerfisController } from './perfis.controller';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Perfil, Usuario])],
  controllers: [PerfisController],
  exports: [TypeOrmModule],
})
export class PerfisModule {}
