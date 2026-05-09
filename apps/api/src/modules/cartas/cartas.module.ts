import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carta } from './entities/carta.entity';
import { CartasController } from './cartas.controller';
import { CartasService } from './cartas.service';
import { Tema } from '../temas/entities/tema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carta, Tema])],
  providers: [CartasService],
  controllers: [CartasController],
  exports: [TypeOrmModule, CartasService],
})
export class CartasModule {}
