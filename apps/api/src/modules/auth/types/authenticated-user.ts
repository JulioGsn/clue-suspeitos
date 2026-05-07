import { UsuarioRole } from '../../usuarios/entities/usuario.entity';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UsuarioRole;
  perfilId: string;
};

export type AuthenticatedUser = JwtPayload & {
  usuarioId: string;
};

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UsuarioRole;
    perfilId: string;
    username: string;
  };
};
