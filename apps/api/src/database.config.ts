import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getMainDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USER', 'root'),
  password: configService.get<string>('DB_PASSWORD', 'root'),
  database: configService.get<string>('DB_NAME', 'detetive_db'),
  autoLoadEntities: true,
  synchronize: true, // Only for dev
});

export const getLogsDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  name: 'logsConnection',
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USER', 'root'),
  password: configService.get<string>('DB_PASSWORD', 'root'),
  database: configService.get<string>('LOGS_DB_NAME', 'detetive_logs_db'),
  autoLoadEntities: true,
  synchronize: true, // Only for dev
});
