import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Usuario, UsuarioRole } from '../usuarios/entities/usuario.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usuariosRepository: jest.Mocked<Repository<Usuario>>;
  let signMock: jest.Mock;

  const perfil: Perfil = {
    id: 'perfil-id',
    usuario: undefined as unknown as Usuario,
    username: 'detetive',
    avatarUrl: null,
    vitorias: 0,
    derrotas: 0,
  };

  const usuario: Usuario = {
    id: 'usuario-id',
    email: 'user@test.com',
    passwordHash:
      '$2b$10$fce2Xsm0vskh0KgXn8S/V.Pb1nDp20ddsyWu6E/2sL1TGSbj8bJC6',
    role: UsuarioRole.PLAYER,
    vitorias: 0,
    derrotas: 0,
    createdAt: new Date(),
    perfil,
  };

  beforeEach(async () => {
    const usuarioRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn((data: Partial<Usuario>) => data as Usuario),
      save: jest.fn((data: Usuario) =>
        Promise.resolve({
          ...usuario,
          ...data,
          id: data.id ?? usuario.id,
        }),
      ),
    };

    const perfilRepositoryMock = {
      create: jest.fn((data: Partial<Perfil>) => data as Perfil),
      save: jest.fn((data: Perfil) =>
        Promise.resolve({
          ...perfil,
          ...data,
          id: data.id ?? perfil.id,
        }),
      ),
    };

    signMock = jest.fn(() => 'jwt-token');

    const dataSourceMock = {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        Promise.resolve(
          callback({
            getRepository: (entity: unknown) =>
              entity === Usuario ? usuarioRepositoryMock : perfilRepositoryMock,
          }),
        ),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getDataSourceToken(),
          useValue: dataSourceMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuarioRepositoryMock,
        },
        {
          provide: getRepositoryToken(Perfil),
          useValue: perfilRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: {
            sign: signMock,
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usuariosRepository = module.get(getRepositoryToken(Usuario));
  });

  it('registra usuario e retorna token JWT', async () => {
    usuariosRepository.findOne.mockResolvedValueOnce(null);

    const result = await authService.register({
      email: 'USER@test.com',
      password: '123456',
      username: 'detetive',
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.user.email).toBe('user@test.com');
    expect(result.user.perfilId).toBe('perfil-id');
    expect(signMock).toHaveBeenCalledWith({
      sub: 'usuario-id',
      email: 'user@test.com',
      role: UsuarioRole.PLAYER,
      perfilId: 'perfil-id',
    });
  });

  it('bloqueia registro com email duplicado', async () => {
    usuariosRepository.findOne.mockResolvedValueOnce(usuario);

    await expect(
      authService.register({
        email: 'user@test.com',
        password: '123456',
        username: 'detetive',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloqueia login com senha incorreta', async () => {
    usuariosRepository.findOne.mockResolvedValueOnce(usuario);

    await expect(
      authService.login({
        email: 'user@test.com',
        password: 'senha-errada',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
