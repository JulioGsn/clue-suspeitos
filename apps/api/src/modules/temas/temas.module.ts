import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tema } from './entities/tema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TemasService } from './temas.service';
import { TemasController } from './temas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tema, Usuario])],
  providers: [TemasService],
  controllers: [TemasController],
  exports: [TypeOrmModule, TemasService],
})
export class TemasModule {}
