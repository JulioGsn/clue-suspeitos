import { StatusPartida, VisibilidadePartida } from '../entities/partida.entity';

export type JogadorResumo = {
  id: string;
  usuarioId: string | null;
  email: string | null;
  username?: string | null;
  isBot: boolean;
  isEliminado: boolean;
  ordemTurno: number | null;
};

export type CartaResumo = {
  id: string;
  nome: string;
  tipo: string;
  imageUrl: string;
};

export type PartidaResponse = {
  id: string;
  status: StatusPartida;
  codigo?: string | null;
  visibilidade?: VisibilidadePartida;
  maxJogadores: number;
  turnoAtual: number;
  criadoEm: Date;
  anfitriao: {
    id: string;
    email: string;
    username?: string | null;
  };
  tema: {
    id: string;
    nome: string;
  };
  vencedor: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
  jogadores: JogadorResumo[];
  cartasReveladas: CartaResumo[];
  meuBlocoDeNotas?: Record<string, unknown> | null;
  minhaMao?: CartaResumo[];
};
