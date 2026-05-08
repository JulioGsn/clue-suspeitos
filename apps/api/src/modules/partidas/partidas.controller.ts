import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateAcusacaoDto } from './dto/create-acusacao.dto';
import { CreatePartidaDto } from './dto/create-partida.dto';
import { CreatePerguntaDto } from './dto/create-pergunta.dto';
import type {
  AcusacaoResponse,
  PerguntaResponse,
} from './dto/gameplay-response.dto';
import type { PartidaResponse } from './dto/partida-response.dto';
import { UpdateBlocoNotasDto } from './dto/update-bloco-notas.dto';
import { PartidasService } from './partidas.service';

@UseGuards(JwtAuthGuard)
@Controller('partidas')
export class PartidasController {
  constructor(private readonly partidasService: PartidasService) {}

  @Post()
  create(
    @Body() createPartidaDto: CreatePartidaDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.create(createPartidaDto, user.usuarioId);
  }

  @Get()
  findLobby(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse[]> {
    return this.partidasService.findLobby(user.usuarioId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.findOne(id, user.usuarioId);
  }

  @Post(':id/entrar')
  entrar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.entrar(id, user.usuarioId);
  }

  @Post('entrar')
  entrarPorCodigo(
    @Body() body: { codigo: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.entrarPorCodigo(body.codigo, user.usuarioId);
  }

  @Post(':id/add-bot')
  addBot(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.addBot(id, user.usuarioId);
  }

  @Post(':id/iniciar')
  iniciar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.iniciar(id, user.usuarioId);
  }

  @Post(':id/abandon')
  abandonar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.abandonar(id, user.usuarioId);
  }

  @Post(':id/perguntas')
  criarPergunta(
    @Param('id') id: string,
    @Body() createPerguntaDto: CreatePerguntaDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PerguntaResponse> {
    return this.partidasService.criarPergunta(
      id,
      user.usuarioId,
      createPerguntaDto,
    );
  }

  @Post(':id/acusacoes')
  criarAcusacao(
    @Param('id') id: string,
    @Body() createAcusacaoDto: CreateAcusacaoDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AcusacaoResponse> {
    return this.partidasService.criarAcusacao(
      id,
      user.usuarioId,
      createAcusacaoDto,
    );
  }

  @Post(':id/bloco-de-notas')
  updateBlocoDeNotas(
    @Param('id') id: string,
    @Body() updateBlocoNotasDto: UpdateBlocoNotasDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PartidaResponse> {
    return this.partidasService.updateBlocoDeNotas(
      id,
      user.usuarioId,
      updateBlocoNotasDto,
    );
  }

  @Get(':id/chat/stream')
  streamChat(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthenticatedUser },
    @Res() res: Response,
  ) {
    // ensure CORS headers on this long-lived response
    try {
      const origin = (req.headers as Record<string, unknown>)['origin'] as
        | string
        | undefined;
      res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('X-Accel-Buffering', 'no');
    } catch (err: unknown) {
      void err;
    }

    // register SSE stream for this partida (service will validate membership)
    void this.partidasService.registerChatStream(
      id,
      req.user?.usuarioId ?? null,
      res,
    );
  }

  @Post(':id/chat')
  async sendChatMessage(
    @Param('id') id: string,
    @Body() body: { text: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.partidasService.sendChatMessage(id, user.usuarioId, body.text);
    return { ok: true };
  }
}
