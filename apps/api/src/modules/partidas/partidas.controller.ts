import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
}
