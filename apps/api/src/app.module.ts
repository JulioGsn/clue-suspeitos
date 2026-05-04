import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getMainDatabaseConfig, getLogsDatabaseConfig } from './database.config';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { CartasModule } from './modules/cartas/cartas.module';
import { PerfisModule } from './modules/perfis/perfis.module';
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
    UsuariosModule,
    PerfisModule,
    CartasModule,
    AuditoriaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
