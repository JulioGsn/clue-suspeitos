import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Jogador } from './entities/jogador.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Jogador])],
  exports: [TypeOrmModule],
})
export class JogadoresModule {}
