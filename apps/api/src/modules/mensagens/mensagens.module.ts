import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mensagem } from './entities/mensagem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mensagem])],
  exports: [TypeOrmModule],
})
export class MensagensModule {}
