import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaoCarta } from './entities/mao-carta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaoCarta])],
  exports: [TypeOrmModule],
})
export class MaoCartasModule {}
