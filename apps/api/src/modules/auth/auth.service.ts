import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Usuario, UsuarioRole } from '../usuarios/entities/usuario.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtPayload } from './types/authenticated-user';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const email = registerDto.email.toLowerCase().trim();
    const username = registerDto.username.trim();

    const existingUser = await this.usuariosRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const { usuario, perfil } = await this.dataSource.transaction(
      async (manager) => {
        const usuarioRepository = manager.getRepository(Usuario);
        const perfilRepository = manager.getRepository(Perfil);

        const createdUsuario = usuarioRepository.create({
          email,
          passwordHash,
          role: UsuarioRole.PLAYER,
        });
        const savedUsuario = await usuarioRepository.save(createdUsuario);

        const createdPerfil = perfilRepository.create({
          usuario: savedUsuario,
          username,
          avatarUrl: null,
        });
        const savedPerfil = await perfilRepository.save(createdPerfil);

        return {
          usuario: savedUsuario,
          perfil: savedPerfil,
        };
      },
    );

    return this.buildAuthResponse(usuario, perfil);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const email = loginDto.email.toLowerCase().trim();
    const usuario = await this.usuariosRepository.findOne({
      where: { email },
      relations: { perfil: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      usuario.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    if (!usuario.perfil) {
      throw new UnauthorizedException('Perfil do usuario nao encontrado');
    }

    return this.buildAuthResponse(usuario, usuario.perfil);
  }

  private buildAuthResponse(usuario: Usuario, perfil: Perfil): AuthResponse {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      perfilId: perfil.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
        perfilId: perfil.id,
        username: perfil.username,
        vitorias: usuario.vitorias,
        derrotas: usuario.derrotas,
      },
    };
  }
}
