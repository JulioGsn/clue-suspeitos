import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Do not enable permissive CORS here; configure below with explicit origin.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Detetive API')
    .setDescription('API do jogo Detetive: Arquivo Secreto')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  const configService = app.get(ConfigService);
  const frontend =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  // Enable CORS with credentials. In production, restrict to configured frontend.
  // In development, allow reflected origins to ease local testing (supports http/https variants).
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.enableCors({
      origin: frontend,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization,Accept',
    });
  } else {
    // In development, allow a small whitelist (supports comma-separated FRONTEND_URL)
    const frontendEnv =
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const allowedOrigins = frontendEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    app.enableCors({
      origin: (origin, callback) => {
        // allow requests with no origin (server-to-server, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization,Accept',
    });
  }
  // Parse incoming cookies so JwtStrategy can read HttpOnly cookie
  app.use(cookieParser());

  // Ensure uploads directory exists and serve it under /uploads
  try {
    const uploadsDir = join(__dirname, '..', 'uploads');
    const avatarsDir = join(uploadsDir, 'avatars');
    mkdirSync(avatarsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir));
  } catch (err: unknown) {
    void err;
  }

  const port = Number(configService.get('PORT')) || 3001;
  await app.listen(port);
}
void bootstrap();
