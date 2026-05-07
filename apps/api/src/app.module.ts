import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  getMainDatabaseConfig,
  getLogsDatabaseConfig,
} from './database.config';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartasModule } from './modules/cartas/cartas.module';
import { JogadoresModule } from './modules/jogadores/jogadores.module';
import { MaoCartasModule } from './modules/mao-cartas/mao-cartas.module';
import { MensagensModule } from './modules/mensagens/mensagens.module';
import { PartidasModule } from './modules/partidas/partidas.module';
import { PerfisModule } from './modules/perfis/perfis.module';
import { PerguntasModule } from './modules/perguntas/perguntas.module';
import { SeedModule } from './modules/seed/seed.module';
import { TemasModule } from './modules/temas/temas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMainDatabaseConfig,
    }),
    TypeOrmModule.forRootAsync({
      name: 'logsConnection',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getLogsDatabaseConfig,
    }),
    AuthModule,
    UsuariosModule,
    PerfisModule,
    TemasModule,
    CartasModule,
    PartidasModule,
    JogadoresModule,
    PerguntasModule,
    MensagensModule,
    MaoCartasModule,
    AuditoriaModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
