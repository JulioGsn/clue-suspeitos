import { CartaResumo, PartidaResponse } from './partida-response.dto';

export type PerguntaResponse = {
  perguntaId: string;
  foiRespondida: boolean;
  cartaRevelada: CartaResumo | null;
  partida: PartidaResponse;
};

export type AcusacaoResponse = {
  isCorreta: boolean;
  isEliminado: boolean;
  cartasCrime: {
    suspeito: CartaResumo;
    arma: CartaResumo;
    local: CartaResumo;
  } | null;
  partida: PartidaResponse;
};
