import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { Response } from 'express';
import { Carta, TipoCarta } from '../cartas/entities/carta.entity';
import { Jogador } from '../jogadores/entities/jogador.entity';
import { MaoCarta } from '../mao-cartas/entities/mao-carta.entity';
import { Pergunta } from '../perguntas/entities/pergunta.entity';
import { Tema } from '../temas/entities/tema.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateAcusacaoDto } from './dto/create-acusacao.dto';
import { CreatePartidaDto } from './dto/create-partida.dto';
import { CreatePerguntaDto } from './dto/create-pergunta.dto';
import {
  AcusacaoResponse,
  PerguntaResponse,
} from './dto/gameplay-response.dto';
import {
  CartaResumo,
  JogadorResumo,
  PartidaResponse,
} from './dto/partida-response.dto';
import { UpdateBlocoNotasDto } from './dto/update-bloco-notas.dto';
import {
  Partida,
  StatusPartida,
  VisibilidadePartida,
} from './entities/partida.entity';

@Injectable()
export class PartidasService {
  // map of partidaId => set of SSE response objects
  private chatStreams: Map<string, Set<Response>> = new Map();
  // in-memory chat history per partida (capped)
  private chatHistory: Map<string, Array<unknown>> = new Map();
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Partida)
    private readonly partidasRepository: Repository<Partida>,
    @InjectRepository(Jogador)
    private readonly jogadoresRepository: Repository<Jogador>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Tema)
    private readonly temasRepository: Repository<Tema>,
    @InjectRepository(Carta)
    private readonly cartasRepository: Repository<Carta>,
    @InjectRepository(MaoCarta)
    private readonly maoCartasRepository: Repository<MaoCarta>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async create(
    createPartidaDto: CreatePartidaDto,
    usuarioId: string,
  ): Promise<PartidaResponse> {
    const usuario = await this.findUsuarioOrFail(usuarioId);
    const tema = await this.temasRepository.findOne({
      where: { id: createPartidaDto.temaId },
    });

    if (!tema) {
      throw new NotFoundException('Tema nao encontrado');
    }

    const maxJogadores = createPartidaDto.maxJogadores ?? 4;
    const visibilidade: VisibilidadePartida =
      (createPartidaDto.visibilidade as VisibilidadePartida) ??
      VisibilidadePartida.PRIVATE;

    const partida = await this.dataSource.transaction(async (manager) => {
      const partidaRepository = manager.getRepository(Partida);
      const jogadorRepository = manager.getRepository(Jogador);

      const createdPartida = await partidaRepository.save(
        partidaRepository.create({
          anfitriao: usuario,
          tema,
          maxJogadores,
          status: StatusPartida.LOBBY,
          turnoAtual: 1,
          cartasReveladas: [],
          visibilidade,
          codigo: null,
        }),
      );

      // If private (with code), generate a unique code and persist
      if (visibilidade === VisibilidadePartida.PRIVATE) {
        const code = await this.generateUniqueCode(6);
        createdPartida.codigo = code;
        await partidaRepository.save(createdPartida);
      }

      await jogadorRepository.save(
        jogadorRepository.create({
          partida: createdPartida,
          usuario,
          isBot: false,
          isEliminado: false,
          ordemTurno: null,
          blocoDeNotas: {},
        }),
      );

      return createdPartida;
    });

    return this.findOne(partida.id, usuarioId);
  }

  private async generateUniqueCode(length = 6) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const make = () =>
      Array.from({ length })
        .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
        .join('');

    for (let i = 0; i < 10; i++) {
      const code = make();
      const exists = await this.partidasRepository.findOne({
        where: { codigo: code },
      });
      if (!exists) return code;
    }

    // fallback to longer attempts
    while (true) {
      const code = make();
      const exists = await this.partidasRepository.findOne({
        where: { codigo: code },
      });
      if (!exists) return code;
    }
  }

  async findLobby(usuarioId?: string): Promise<PartidaResponse[]> {
    const partidas = await this.partidasRepository.find({
      where: { status: StatusPartida.LOBBY },
      relations: {
        anfitriao: { perfil: true },
        tema: true,
        vencedor: { perfil: true },
      },
      order: { criadoEm: 'ASC' },
    });

    return Promise.all(
      partidas.map((partida) => this.buildPartidaResponse(partida, usuarioId)),
    );
  }

  async findOne(id: string, usuarioId?: string): Promise<PartidaResponse> {
    const partida = await this.findPartidaOrFail(id);

    // debug logs to investigate unauthorized access reports
    try {
      console.debug(
        `[partidas.findOne] id=${id} usuarioId=${usuarioId ?? 'null'} visibilidade=${partida.visibilidade} anfitriaoId=${partida.anfitriao?.id ?? 'none'}`,
      );
    } catch (e: unknown) {
      void e;
    }

    // Require membership for ALL partidas: only anfitriao or jogadores can view
    if (!usuarioId) {
      throw new NotFoundException('Partida nao encontrada');
    }

    if (partida.anfitriao?.id !== usuarioId) {
      const jogador = await this.jogadoresRepository.findOne({
        where: { partida: { id }, usuario: { id: usuarioId } },
      });

      try {
        console.debug(
          `[partidas.findOne] checked jogador membership for usuarioId=${usuarioId} exists=${!!jogador}`,
        );
      } catch (e: unknown) {
        void e;
      }

      if (!jogador) {
        // hide existence for non-members
        throw new NotFoundException('Partida nao encontrada');
      }
    }

    return this.buildPartidaResponse(partida, usuarioId);
  }

  async entrar(id: string, usuarioId: string): Promise<PartidaResponse> {
    const usuario = await this.findUsuarioOrFail(usuarioId);
    const partida = await this.findPartidaOrFail(id);

    if (partida.status !== StatusPartida.LOBBY) {
      throw new BadRequestException('A partida nao esta em lobby');
    }

    const jogadores = await this.findJogadores(id);
    const alreadyJoined = jogadores.some(
      (jogador) => jogador.usuario?.id === usuarioId,
    );

    if (alreadyJoined) {
      return this.buildPartidaResponse(partida, usuarioId);
    }

    if (jogadores.length >= partida.maxJogadores) {
      throw new BadRequestException('Partida cheia');
    }

    await this.jogadoresRepository.save(
      this.jogadoresRepository.create({
        partida,
        usuario,
        isBot: false,
        isEliminado: false,
        ordemTurno: null,
        blocoDeNotas: {},
      }),
    );

    return this.findOne(id, usuarioId);
  }

  async entrarPorCodigo(
    codigo: string,
    usuarioId: string,
  ): Promise<PartidaResponse> {
    if (!codigo || !codigo.trim()) {
      throw new NotFoundException('Partida nao encontrada');
    }

    const partida = await this.partidasRepository.findOne({
      where: { codigo },
    });
    if (!partida) throw new NotFoundException('Partida nao encontrada');

    return this.entrar(partida.id, usuarioId);
  }

  // Chat / SSE support
  async registerChatStream(
    partidaId: string,
    usuarioId: string | null,
    res: Response,
  ): Promise<void> {
    // verify partida exists and that this usuario is linked to it
    try {
      const partida = await this.findPartidaOrFail(partidaId);

      if (!usuarioId) {
        try {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Unauthorized' }));
        } catch (innerErr: unknown) {
          void innerErr;
        }
        return;
      }

      // host may always view; otherwise ensure the usuario is a jogador
      if (partida.anfitriao?.id !== usuarioId) {
        const jogador = await this.jogadoresRepository.findOne({
          where: {
            partida: { id: partidaId },
            usuario: { id: usuarioId },
          },
        });

        if (!jogador) {
          try {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Partida nao encontrada' }));
          } catch (innerErr: unknown) {
            void innerErr;
          }
          return;
        }
      }
    } catch (err: unknown) {
      void err;
      try {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Partida nao encontrada' }));
      } catch (innerErr: unknown) {
        void innerErr;
      }
      return;
    }

    // prepare SSE headers
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      // send a comment to establish the stream
      res.write(': connected\n\n');
    } catch (err: unknown) {
      void err;
    }

    // load last messages persisted in DB and send to client
    try {
      const persisted: ChatMessage[] = await this.chatMessageRepository.find({
        where: { partida: { id: partidaId } },
        relations: { usuario: { perfil: true } },
        order: { criadoEm: 'ASC' },
        take: 200,
      });

      const mapped = persisted.map((m) => {
        const author =
          m.authorUsername ??
          m.usuario?.perfil?.username ??
          m.usuario?.email?.split('@')[0] ??
          'Anônimo';
        return {
          author,
          text: m.text,
          criadoEm: m.criadoEm?.toISOString?.() ?? new Date().toISOString(),
        };
      });

      // ensure headers flushed immediately (if available)
      try {
        (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();
      } catch (err: unknown) {
        void err;
      }

      for (const msg of mapped) {
        try {
          res.write(`data: ${JSON.stringify(msg)}\n\n`);
        } catch (err: unknown) {
          void err;
        }
      }

      // initialize in-memory history from persisted messages for faster broadcasts
      this.chatHistory.set(partidaId, mapped.slice(-200));
    } catch (err: unknown) {
      void err;
    }

    const set = this.chatStreams.get(partidaId) ?? new Set<Response>();
    set.add(res);
    this.chatStreams.set(partidaId, set);

    const remove = () => {
      const s = this.chatStreams.get(partidaId);
      if (!s) return;
      s.delete(res);
      if (s.size === 0) this.chatStreams.delete(partidaId);
    };

    res.on('close', remove);
    res.on('finish', remove);
  }

  private broadcastChatMessage(partidaId: string, payload: unknown) {
    const set = this.chatStreams.get(partidaId);
    if (!set) return;

    const data = `data: ${JSON.stringify(payload)}\n\n`;
    // log for debugging
    try {
      console.debug(
        `[chat] broadcast to ${set.size} clients for partida=${partidaId}`,
      );
    } catch (err: unknown) {
      void err;
    }

    set.forEach((r) => {
      try {
        r.write(data);
      } catch (err: unknown) {
        void err;
      }
    });
  }

  private closeChatStreams(partidaId: string, payload?: unknown) {
    const set = this.chatStreams.get(partidaId);
    if (!set) return;

    const event = `event: partida_deleted\n`;
    const data = `data: ${JSON.stringify(payload ?? { message: 'Partida encerrada' })}\n\n`;

    set.forEach((res) => {
      try {
        res.write(event + data);
      } catch (err: unknown) {
        void err;
      }
      try {
        res.end();
      } catch (err: unknown) {
        void err;
      }
    });

    this.chatStreams.delete(partidaId);
    this.chatHistory.delete(partidaId);
  }

  async sendChatMessage(
    partidaId: string,
    usuarioId: string | undefined,
    text: string,
  ) {
    const usuario = usuarioId
      ? await this.usuariosRepository.findOne({
          where: { id: usuarioId },
          relations: { perfil: true },
        })
      : undefined;

    const author =
      usuario?.perfil?.username ?? usuario?.email?.split('@')[0] ?? 'Anônimo';
    const payload = {
      author,
      text,
      partidaId,
      criadoEm: new Date().toISOString(),
    };

    // persist to DB (try) and to in-memory cache
    try {
      await this.chatMessageRepository.save(
        this.chatMessageRepository.create({
          partida: { id: partidaId } as unknown as Partida,
          usuario: usuario ?? null,
          authorUsername: author,
          text,
        }),
      );
    } catch (err: unknown) {
      void err;
    }

    const history = this.chatHistory.get(partidaId) ?? [];
    history.push(payload);
    if (history.length > 200) history.splice(0, history.length - 200);
    this.chatHistory.set(partidaId, history);

    this.broadcastChatMessage(partidaId, payload);
  }

  async abandonar(id: string, usuarioId: string): Promise<PartidaResponse> {
    const partida = await this.findPartidaOrFail(id);

    const jogador = await this.jogadoresRepository.findOne({
      where: { partida: { id }, usuario: { id: usuarioId } },
      relations: { usuario: true },
    });

    if (!jogador) {
      throw new NotFoundException('Jogador nao encontrado na partida');
    }

    if (partida.status === StatusPartida.LOBBY) {
      // If the host abandons before the game starts, remove the whole partida
      // and all related records (via DB cascade). Do not count as abandono.
      if (partida.anfitriao.id === usuarioId) {
        // build response before deleting so frontend can receive a snapshot
        const snapshot = await this.buildPartidaResponse(partida, usuarioId);

        // notify connected clients via SSE that this partida foi removida
        try {
          this.closeChatStreams(partida.id, { reason: 'host_left' });
        } catch (err: unknown) {
          void err;
        }

        await this.dataSource.transaction(async (manager) => {
          const partidaRepo = manager.getRepository(Partida);
          // use delete to ensure DB-level cascades are applied
          await partidaRepo.delete(id);
        });

        return snapshot;
      }

      // non-host leaving: simply remove the jogador to free the slot
      await this.jogadoresRepository.remove(jogador);

      // don't call `findOne` here — the usuario is no longer a member
      // and `findOne` would hide the partida. Return a fresh snapshot
      // built from current DB state instead.
      return this.buildPartidaResponse(partida, usuarioId);
    }

    // If partida already started, convert the player slot to a bot and count an abandonment
    await this.dataSource.transaction(async (manager) => {
      const jogadorRepo = manager.getRepository(Jogador);
      const perfilRepo = manager.getRepository(Perfil);
      const partidaRepo = manager.getRepository(Partida);
      const usuarioRepo = manager.getRepository(Usuario);

      jogador.usuario = null;
      jogador.isBot = true;
      await jogadorRepo.save(jogador);

      await perfilRepo
        .createQueryBuilder()
        .update()
        .set({ abandonos: () => 'abandonos + 1' })
        .where('user_id = :usuarioId', { usuarioId })
        .execute();

      if (partida.anfitriao.id === usuarioId) {
        const remaining = await jogadorRepo.find({
          where: { partida: { id } },
          relations: { usuario: true },
        });
        const next = remaining.find(
          (j) => j.usuario && j.usuario.id !== usuarioId,
        );
        if (next && next.usuario) {
          const usuarioNovo = await usuarioRepo.findOne({
            where: { id: next.usuario.id },
          });
          if (usuarioNovo) {
            partida.anfitriao = usuarioNovo;
            await partidaRepo.save(partida);
          }
        }
      }
    });

    // Return an updated snapshot rather than calling `findOne`, since
    // the requesting usuario may no longer be associated with a jogador
    // (converted to bot / removed). `buildPartidaResponse` will reload
    // players and present the current state.
    return this.buildPartidaResponse(partida, usuarioId);
  }

  async addBot(id: string, usuarioId: string): Promise<PartidaResponse> {
    const partida = await this.findPartidaOrFail(id);
    this.assertHost(partida, usuarioId);

    if (partida.status !== StatusPartida.LOBBY) {
      throw new BadRequestException('A partida nao esta em lobby');
    }

    const jogadores = await this.findJogadores(id);

    if (jogadores.length >= partida.maxJogadores) {
      throw new BadRequestException('Partida cheia');
    }

    await this.jogadoresRepository.save(
      this.jogadoresRepository.create({
        partida,
        usuario: null,
        isBot: true,
        isEliminado: false,
        ordemTurno: null,
        blocoDeNotas: {},
      }),
    );

    return this.findOne(id, usuarioId);
  }

  async iniciar(id: string, usuarioId: string): Promise<PartidaResponse> {
    const partida = await this.findPartidaOrFail(id);
    this.assertHost(partida, usuarioId);

    if (partida.status !== StatusPartida.LOBBY) {
      throw new BadRequestException('A partida nao esta em lobby');
    }

    const jogadores = await this.findJogadores(id);

    if (jogadores.length < 2) {
      throw new BadRequestException(
        'A partida precisa de pelo menos 2 jogadores',
      );
    }

    const cartas = await this.cartasRepository.find({
      where: { tema: { id: partida.tema.id } },
      relations: { tema: true },
    });

    const suspeitos = cartas.filter(
      (carta) => carta.tipo === TipoCarta.SUSPEITO,
    );
    const armas = cartas.filter((carta) => carta.tipo === TipoCarta.ARMA);
    const locais = cartas.filter((carta) => carta.tipo === TipoCarta.LOCAL);

    if (!suspeitos.length || !armas.length || !locais.length) {
      throw new BadRequestException(
        'Tema precisa ter ao menos 1 suspeito, 1 arma e 1 local',
      );
    }

    const suspeito = this.pickRandom(suspeitos);
    const arma = this.pickRandom(armas);
    const local = this.pickRandom(locais);
    const crimeIds = new Set([suspeito.id, arma.id, local.id]);
    const cartasDistribuiveis = this.shuffle(
      cartas.filter((carta) => !crimeIds.has(carta.id)),
    );
    const cartasPorJogador = Math.floor(
      cartasDistribuiveis.length / jogadores.length,
    );
    const totalDistribuir = cartasPorJogador * jogadores.length;
    const cartasParaMao = cartasDistribuiveis.slice(0, totalDistribuir);
    const cartasReveladas = cartasDistribuiveis
      .slice(totalDistribuir)
      .map((carta) => carta.id);

    await this.dataSource.transaction(async (manager) => {
      const partidaRepository = manager.getRepository(Partida);
      const jogadorRepository = manager.getRepository(Jogador);
      const maoCartaRepository = manager.getRepository(MaoCarta);

      await maoCartaRepository
        .createQueryBuilder()
        .delete()
        .where('partida_id = :id', { id })
        .execute();

      for (const [index, jogador] of jogadores.entries()) {
        jogador.ordemTurno = index + 1;
        await jogadorRepository.save(jogador);
      }

      const maoCartas = cartasParaMao.map((carta, index) =>
        maoCartaRepository.create({
          partida,
          jogador: jogadores[index % jogadores.length],
          carta,
        }),
      );

      await maoCartaRepository.save(maoCartas);

      partida.suspeito = suspeito;
      partida.arma = arma;
      partida.local = local;
      partida.cartasReveladas = cartasReveladas;
      partida.turnoAtual = 1;
      partida.status = StatusPartida.EM_ANDAMENTO;
      await partidaRepository.save(partida);
    });

    return this.findOne(id, usuarioId);
  }

  async criarPergunta(
    id: string,
    usuarioId: string,
    createPerguntaDto: CreatePerguntaDto,
  ): Promise<PerguntaResponse> {
    const partida = await this.findPartidaOrFail(id);
    this.assertEmAndamento(partida);

    const jogadores = await this.findJogadores(id);
    const perguntador = this.findJogadorHumano(jogadores, usuarioId);
    this.assertJogadorAtivo(perguntador);
    this.assertTurno(partida, perguntador);

    if (createPerguntaDto.carta1Id === createPerguntaDto.carta2Id) {
      throw new BadRequestException(
        'A pergunta precisa de duas cartas distintas',
      );
    }

    const [carta1, carta2] = await Promise.all([
      this.findCartaDoTemaOrFail(createPerguntaDto.carta1Id, partida.tema.id),
      this.findCartaDoTemaOrFail(createPerguntaDto.carta2Id, partida.tema.id),
    ]);

    const cartaRevelada = await this.findCartaParaRevelar(
      partida.id,
      jogadores,
      perguntador,
      [carta1.id, carta2.id],
    );

    const pergunta = await this.dataSource.transaction(async (manager) => {
      const partidaRepository = manager.getRepository(Partida);
      const perguntaRepository = manager.getRepository(Pergunta);

      const createdPergunta = await perguntaRepository.save(
        perguntaRepository.create({
          partida,
          perguntador,
          carta1,
          carta2,
          cartaRevelada,
          foiRespondida: cartaRevelada !== null,
        }),
      );

      partida.turnoAtual = this.getProximoTurnoHumano(jogadores, perguntador);
      await partidaRepository.save(partida);

      return createdPergunta;
    });

    return {
      perguntaId: pergunta.id,
      foiRespondida: pergunta.foiRespondida,
      cartaRevelada: pergunta.cartaRevelada
        ? this.mapCarta(pergunta.cartaRevelada)
        : null,
      partida: await this.findOne(id, usuarioId),
    };
  }

  async criarAcusacao(
    id: string,
    usuarioId: string,
    createAcusacaoDto: CreateAcusacaoDto,
  ): Promise<AcusacaoResponse> {
    const partida = await this.partidasRepository.findOne({
      where: { id },
      relations: {
        anfitriao: true,
        tema: true,
        vencedor: true,
        suspeito: true,
        arma: true,
        local: true,
      },
    });

    if (!partida) {
      throw new NotFoundException('Partida nao encontrada');
    }

    this.assertEmAndamento(partida);

    if (!partida.suspeito || !partida.arma || !partida.local) {
      throw new BadRequestException('Partida ainda nao possui crime sorteado');
    }

    const jogadores = await this.findJogadores(id);
    const acusador = this.findJogadorHumano(jogadores, usuarioId);
    this.assertJogadorAtivo(acusador);

    const [suspeito, arma, local] = await Promise.all([
      this.findCartaDoTemaOrFail(createAcusacaoDto.suspeitoId, partida.tema.id),
      this.findCartaDoTemaOrFail(createAcusacaoDto.armaId, partida.tema.id),
      this.findCartaDoTemaOrFail(createAcusacaoDto.localId, partida.tema.id),
    ]);

    if (
      suspeito.tipo !== TipoCarta.SUSPEITO ||
      arma.tipo !== TipoCarta.ARMA ||
      local.tipo !== TipoCarta.LOCAL
    ) {
      throw new BadRequestException(
        'Acusacao precisa conter suspeito, arma e local',
      );
    }

    const isCorreta =
      suspeito.id === partida.suspeito.id &&
      arma.id === partida.arma.id &&
      local.id === partida.local.id;
    let isEliminado = false;

    await this.dataSource.transaction(async (manager) => {
      const partidaRepository = manager.getRepository(Partida);
      const jogadorRepository = manager.getRepository(Jogador);
      const perfilRepository = manager.getRepository(Perfil);

      if (isCorreta) {
        const vencedor = await this.findUsuarioOrFail(usuarioId);
        partida.status = StatusPartida.FINALIZADA;
        partida.vencedor = vencedor;
        await partidaRepository.save(partida);
        await perfilRepository
          .createQueryBuilder()
          .update()
          .set({ vitorias: () => 'vitorias + 1' })
          .where('user_id = :usuarioId', { usuarioId })
          .execute();

        await this.incrementarDerrotasDosPerdedores(
          perfilRepository,
          jogadores,
          usuarioId,
        );
        return;
      }

      acusador.isEliminado = true;
      isEliminado = true;
      await jogadorRepository.save(acusador);
      await perfilRepository
        .createQueryBuilder()
        .update()
        .set({ derrotas: () => 'derrotas + 1' })
        .where('user_id = :usuarioId', { usuarioId })
        .execute();

      const humanosAtivos = jogadores.filter(
        (jogador) =>
          jogador.id !== acusador.id && !jogador.isBot && !jogador.isEliminado,
      );

      if (!humanosAtivos.length) {
        partida.status = StatusPartida.FINALIZADA;
        partida.vencedor = null;
        await partidaRepository.save(partida);
        return;
      }

      if (humanosAtivos.length === 1 && humanosAtivos[0].usuario) {
        partida.status = StatusPartida.FINALIZADA;
        partida.vencedor = humanosAtivos[0].usuario;
        await partidaRepository.save(partida);
        await perfilRepository
          .createQueryBuilder()
          .update()
          .set({ vitorias: () => 'vitorias + 1' })
          .where('user_id = :usuarioId', {
            usuarioId: humanosAtivos[0].usuario.id,
          })
          .execute();
        return;
      }

      partida.turnoAtual = this.getProximoTurnoHumano(jogadores, acusador);
      await partidaRepository.save(partida);
    });

    const partidaAtualizada = await this.findPartidaOrFail(id);
    const deveRevelarCrime =
      isCorreta || partidaAtualizada.status === StatusPartida.FINALIZADA;

    return {
      isCorreta,
      isEliminado,
      cartasCrime: deveRevelarCrime
        ? {
            suspeito: this.mapCarta(partida.suspeito),
            arma: this.mapCarta(partida.arma),
            local: this.mapCarta(partida.local),
          }
        : null,
      partida: await this.findOne(id, usuarioId),
    };
  }

  async updateBlocoDeNotas(
    id: string,
    usuarioId: string,
    updateBlocoNotasDto: UpdateBlocoNotasDto,
  ): Promise<PartidaResponse> {
    const partida = await this.findPartidaOrFail(id);
    const jogadores = await this.findJogadores(id);
    const jogador = this.findJogadorHumano(jogadores, usuarioId);

    if (partida.status === StatusPartida.FINALIZADA) {
      throw new BadRequestException('Partida finalizada');
    }

    jogador.blocoDeNotas = updateBlocoNotasDto.blocoDeNotas;
    await this.jogadoresRepository.save(jogador);

    return this.findOne(id, usuarioId);
  }

  private async findUsuarioOrFail(id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    return usuario;
  }

  private async findPartidaOrFail(id: string): Promise<Partida> {
    const partida = await this.partidasRepository.findOne({
      where: { id },
      relations: {
        anfitriao: { perfil: true },
        tema: true,
        vencedor: { perfil: true },
      },
    });

    if (!partida) {
      throw new NotFoundException('Partida nao encontrada');
    }

    return partida;
  }

  private async findJogadores(partidaId: string): Promise<Jogador[]> {
    return this.jogadoresRepository.find({
      where: { partida: { id: partidaId } },
      relations: { usuario: { perfil: true } },
      order: { ordemTurno: 'ASC', id: 'ASC' },
    });
  }

  private findJogadorHumano(jogadores: Jogador[], usuarioId: string): Jogador {
    const jogador = jogadores.find((item) => item.usuario?.id === usuarioId);

    if (!jogador) {
      throw new ForbiddenException('Usuario nao esta nesta partida');
    }

    return jogador;
  }

  private assertJogadorAtivo(jogador: Jogador): void {
    if (jogador.isEliminado) {
      throw new BadRequestException('Jogador eliminado');
    }
  }

  private assertEmAndamento(partida: Partida): void {
    if (partida.status !== StatusPartida.EM_ANDAMENTO) {
      throw new BadRequestException('A partida nao esta em andamento');
    }
  }

  private assertTurno(partida: Partida, jogador: Jogador): void {
    if (jogador.ordemTurno !== partida.turnoAtual) {
      throw new BadRequestException('Nao e o turno deste jogador');
    }
  }

  private async findCartaDoTemaOrFail(
    cartaId: string,
    temaId: string,
  ): Promise<Carta> {
    const carta = await this.cartasRepository.findOne({
      where: {
        id: cartaId,
        tema: { id: temaId },
      },
      relations: { tema: true },
    });

    if (!carta) {
      throw new NotFoundException('Carta nao encontrada neste tema');
    }

    return carta;
  }

  private async findCartaParaRevelar(
    partidaId: string,
    jogadores: Jogador[],
    perguntador: Jogador,
    cartaIds: string[],
  ): Promise<Carta | null> {
    const ordemResposta = this.getOrdemResposta(jogadores, perguntador);

    for (const jogador of ordemResposta) {
      const mao = await this.maoCartasRepository.find({
        where: {
          partida: { id: partidaId },
          jogador: { id: jogador.id },
          carta: { id: In(cartaIds) },
        },
        relations: { carta: true },
      });

      if (mao.length) {
        return this.pickRandom(mao).carta;
      }
    }

    return null;
  }

  private getOrdemResposta(
    jogadores: Jogador[],
    perguntador: Jogador,
  ): Jogador[] {
    const ordenados = this.ordenarPorTurno(jogadores);
    const indexPerguntador = ordenados.findIndex(
      (jogador) => jogador.id === perguntador.id,
    );

    return [
      ...ordenados.slice(indexPerguntador + 1),
      ...ordenados.slice(0, indexPerguntador),
    ].filter((jogador) => jogador.id !== perguntador.id);
  }

  private getProximoTurnoHumano(
    jogadores: Jogador[],
    jogadorAtual: Jogador,
  ): number {
    const ordenados = this.ordenarPorTurno(jogadores);
    const ativosHumanos = ordenados.filter(
      (jogador) => !jogador.isBot && !jogador.isEliminado,
    );
    const candidatos = ativosHumanos.length
      ? ativosHumanos
      : ordenados.filter((jogador) => !jogador.isEliminado);

    if (!candidatos.length) {
      return jogadorAtual.ordemTurno ?? 1;
    }

    const indexAtual = ordenados.findIndex(
      (jogador) => jogador.id === jogadorAtual.id,
    );
    const proximo = [
      ...ordenados.slice(indexAtual + 1),
      ...ordenados.slice(0, indexAtual),
    ]
      .filter((jogador) => candidatos.some((item) => item.id === jogador.id))
      .at(0);

    return proximo?.ordemTurno ?? candidatos[0].ordemTurno ?? 1;
  }

  private ordenarPorTurno(jogadores: Jogador[]): Jogador[] {
    return [...jogadores].sort(
      (a, b) =>
        (a.ordemTurno ?? Number.MAX_SAFE_INTEGER) -
        (b.ordemTurno ?? Number.MAX_SAFE_INTEGER),
    );
  }

  private async incrementarDerrotasDosPerdedores(
    perfilRepository: Repository<Perfil>,
    jogadores: Jogador[],
    vencedorId: string,
  ): Promise<void> {
    const perdedoresIds = jogadores
      .map((jogador) => jogador.usuario?.id)
      .filter((id): id is string => Boolean(id) && id !== vencedorId);

    for (const usuarioId of new Set(perdedoresIds)) {
      await perfilRepository
        .createQueryBuilder()
        .update()
        .set({ derrotas: () => 'derrotas + 1' })
        .where('user_id = :usuarioId', { usuarioId })
        .execute();
    }
  }

  private async buildPartidaResponse(
    partida: Partida,
    usuarioId?: string,
  ): Promise<PartidaResponse> {
    const jogadores = await this.findJogadores(partida.id);
    const cartasReveladas = await this.findCartasByIds(
      partida.cartasReveladas ?? [],
    );
    const minhaMao = usuarioId
      ? await this.findMinhaMao(partida.id, usuarioId)
      : undefined;
    const meuJogador = usuarioId
      ? jogadores.find((jogador) => jogador.usuario?.id === usuarioId)
      : undefined;

    return {
      id: partida.id,
      codigo: partida.codigo ?? null,
      visibilidade: partida.visibilidade,
      status: partida.status,
      maxJogadores: partida.maxJogadores,
      turnoAtual: partida.turnoAtual,
      criadoEm: partida.criadoEm,
      anfitriao: {
        id: partida.anfitriao.id,
        email: partida.anfitriao.email,
        username: partida.anfitriao.perfil?.username ?? null,
      },
      tema: {
        id: partida.tema.id,
        nome: partida.tema.nome,
      },
      vencedor: partida.vencedor
        ? {
            id: partida.vencedor.id,
            email: partida.vencedor.email,
            username: partida.vencedor.perfil?.username ?? null,
          }
        : null,
      jogadores: jogadores.map((jogador) => this.mapJogador(jogador)),
      cartasReveladas: cartasReveladas.map((carta) => this.mapCarta(carta)),
      ...(meuJogador ? { meuBlocoDeNotas: meuJogador.blocoDeNotas } : {}),
      ...(minhaMao ? { minhaMao } : {}),
    };
  }

  private async findCartasByIds(ids: string[]): Promise<Carta[]> {
    if (!ids.length) {
      return [];
    }

    return this.cartasRepository.find({
      where: { id: In(ids) },
    });
  }

  private async findMinhaMao(
    partidaId: string,
    usuarioId: string,
  ): Promise<CartaResumo[]> {
    const jogador = await this.jogadoresRepository.findOne({
      where: {
        partida: { id: partidaId },
        usuario: { id: usuarioId },
      },
    });

    if (!jogador) {
      return [];
    }

    const mao = await this.maoCartasRepository.find({
      where: {
        partida: { id: partidaId },
        jogador: { id: jogador.id },
      },
      relations: { carta: true },
    });

    return mao.map((maoCarta) => this.mapCarta(maoCarta.carta));
  }

  private mapJogador(jogador: Jogador): JogadorResumo {
    return {
      id: jogador.id,
      usuarioId: jogador.usuario?.id ?? null,
      email: jogador.usuario?.email ?? null,
      username: jogador.usuario?.perfil?.username ?? null,
      isBot: jogador.isBot,
      isEliminado: jogador.isEliminado,
      ordemTurno: jogador.ordemTurno,
    };
  }

  private mapCarta(carta: Carta): CartaResumo {
    return {
      id: carta.id,
      nome: carta.nome,
      tipo: carta.tipo,
      imageUrl: carta.imageUrl,
    };
  }

  private assertHost(partida: Partida, usuarioId: string): void {
    if (partida.anfitriao.id !== usuarioId) {
      throw new ForbiddenException(
        'Apenas o anfitriao pode executar esta acao',
      );
    }
  }

  private pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }
}
