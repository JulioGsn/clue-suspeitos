import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carta } from './entities/carta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carta])],
  exports: [TypeOrmModule],
})
export class CartasModule {}
