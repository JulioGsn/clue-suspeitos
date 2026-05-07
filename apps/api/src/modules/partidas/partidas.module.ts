import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carta } from '../cartas/entities/carta.entity';
import { Jogador } from '../jogadores/entities/jogador.entity';
import { MaoCarta } from '../mao-cartas/entities/mao-carta.entity';
import { Pergunta } from '../perguntas/entities/pergunta.entity';
import { Tema } from '../temas/entities/tema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Partida } from './entities/partida.entity';
import { PartidasController } from './partidas.controller';
import { PartidasService } from './partidas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Partida,
      Jogador,
      Usuario,
      Tema,
      Carta,
      MaoCarta,
      Pergunta,
    ]),
  ],
  controllers: [PartidasController],
  providers: [PartidasService],
  exports: [TypeOrmModule, PartidasService],
})
export class PartidasModule {}
