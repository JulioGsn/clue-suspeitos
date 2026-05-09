import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { InjectRepository } from '@nestjs/typeorm';
import { Perfil } from './entities/perfil.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Repository } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
// mkdirSync not needed here (handled in main.ts bootstrap)

// Minimal local type for uploaded file — we only read `filename` here.
type UploadedFile = { filename?: string } & Record<string, unknown>;

import { UpdatePerfilDto } from './dto/update-perfil.dto';

@UseGuards(JwtAuthGuard)
@Controller('perfis')
export class PerfisController {
  constructor(
    @InjectRepository(Perfil)
    private readonly perfilRepository: Repository<Perfil>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  @Patch()
  @UseInterceptors(
    FileInterceptor('avatar', {
      dest: join(process.cwd(), 'uploads', 'avatars'),
    }),
  )
  async updatePerfil(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    updatePerfilDto: UpdatePerfilDto,
    @UploadedFile() avatar?: UploadedFile,
  ) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: user.usuarioId },
      relations: { perfil: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    let changed = false;

    // update username (no password required)
    if (typeof updatePerfilDto.username === 'string' && updatePerfilDto.username.trim() !== '') {
      usuario.perfil.username = updatePerfilDto.username.trim();
      changed = true;
    }

    // avatar upload (no password required)
    if (avatar) {
      const filename = (avatar as unknown as { filename?: string })?.filename;
      if (typeof filename === 'string' && filename) {
        usuario.perfil.avatarUrl = `/uploads/avatars/${filename}`;
        changed = true;
      }
    }

    // password change: require currentPassword
    if (updatePerfilDto.newPassword && updatePerfilDto.newPassword.trim() !== '') {
      if (!updatePerfilDto.currentPassword) {
        throw new BadRequestException(
          'Senha atual requerida para alterar senha',
        );
      }

      const matches = await bcrypt.compare(
        updatePerfilDto.currentPassword,
        usuario.passwordHash,
      );
      if (!matches) {
        throw new BadRequestException('Senha atual invalida');
      }

      const hash = await bcrypt.hash(body.newPassword, 10);
      usuario.passwordHash = hash;
      changed = true;
    }

    if (changed) {
      // persist changes
      await this.perfilRepository.save(usuario.perfil);
      await this.usuarioRepository.save(usuario);
    }

    return {
      ok: true,
      perfil: {
        username: usuario.perfil.username,
        avatarUrl: usuario.perfil.avatarUrl,
      },
    };
  }
}
