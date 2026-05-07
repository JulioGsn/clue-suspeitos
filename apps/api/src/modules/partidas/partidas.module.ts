import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partida } from './entities/partida.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Partida])],
  exports: [TypeOrmModule],
})
export class PartidasModule {}
