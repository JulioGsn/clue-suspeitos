import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tema } from './entities/tema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tema])],
  exports: [TypeOrmModule],
})
export class TemasModule {}
