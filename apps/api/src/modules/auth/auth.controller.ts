import { Body, Controller, Post, Res, Get, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './types/authenticated-user';
import type { AuthenticatedUser } from './types/authenticated-user';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Jogador } from '../jogadores/entities/jogador.entity';
import { Repository } from 'typeorm';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Perfil)
    private readonly perfilRepository: Repository<Perfil>,
    @InjectRepository(Jogador)
    private readonly jogadoresRepository: Repository<Jogador>,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const auth = await this.authService.register(registerDto);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    };
    res.cookie('detetive_access_token', auth.accessToken, cookieOptions);
    return auth;
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const auth = await this.authService.login(loginDto);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    };
    res.cookie('detetive_access_token', auth.accessToken, cookieOptions);
    return auth;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const perfil = await this.perfilRepository.findOne({
      where: { id: user.perfilId },
    });

    // try to find jogador record to expose current partida id if any
    const jogador = await this.jogadoresRepository.findOne({
      where: { usuario: { id: user.usuarioId } },
      relations: { partida: true },
    });

    return {
      id: user.usuarioId,
      email: user.email,
      role: user.role,
      perfilId: user.perfilId,
      username: perfil?.username ?? null,
      avatarUrl: perfil?.avatarUrl ?? null,
      vitorias: perfil?.vitorias ?? 0,
      derrotas: perfil?.derrotas ?? 0,
      abandonos: perfil?.abandonos ?? 0,
      currentPartidaId: jogador?.partida?.id ?? null,
      currentPartidaStatus: jogador?.partida?.status ?? null,
    };
  }
}
