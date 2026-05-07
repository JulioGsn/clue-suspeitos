import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pergunta } from './entities/pergunta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pergunta])],
  exports: [TypeOrmModule],
})
export class PerguntasModule {}
