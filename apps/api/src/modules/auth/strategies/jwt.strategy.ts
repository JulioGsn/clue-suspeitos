import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: unknown) => {
          try {
            if (!req || typeof req !== 'object') return null;
            const r = req as { cookies?: Record<string, unknown> };
            const token =
              r.cookies && typeof r.cookies === 'object'
                ? r.cookies['detetive_access_token']
                : undefined;
            return typeof token === 'string' ? token : null;
          } catch {
            return null;
          }
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.perfilId) {
      throw new UnauthorizedException('Token invalido');
    }

    return {
      ...payload,
      usuarioId: payload.sub,
    };
  }
}
