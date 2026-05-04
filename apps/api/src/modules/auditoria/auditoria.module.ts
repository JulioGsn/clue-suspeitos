import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from './entities/auditoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auditoria], 'logsConnection')],
  exports: [TypeOrmModule],
})
export class AuditoriaModule {}
