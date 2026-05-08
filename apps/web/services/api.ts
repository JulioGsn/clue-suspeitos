"use client";

export type UserRole = "ADMIN" | "USER";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  perfilId: string;
  username: string;
  avatarUrl?: string | null;
  abandonos?: number;
  currentPartidaId?: string | null;
  vitorias?: number;
  derrotas?: number;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type StatusPartida = "LOBBY" | "EM_ANDAMENTO" | "FINALIZADA";

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

export type PartidaResponse = {
  id: string;
  status: StatusPartida;
  codigo?: string | null;
  visibilidade?: 'PUBLIC' | 'PRIVATE';
  maxJogadores: number;
  turnoAtual: number;
  criadoEm: string;
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
  minhaMao?: CartaResumo[];
};

type RequestOptions = {
  token?: string | null;
  body?: unknown;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001";

const TOKEN_KEY = "detetive_access_token";
const USER_KEY = "detetive_user";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  method: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : "Nao foi possivel completar a requisicao.";

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(body: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", "POST", { body });
  },
  register(body: { email: string; password: string; username: string }) {
    return request<AuthResponse>("/auth/register", "POST", { body });
  },
  listPartidas(token?: string) {
    return request<PartidaResponse[]>('/partidas', 'GET', { token });
  },
  createPartida(
    token: string | undefined,
    body: { temaId: string; maxJogadores?: number; visibilidade?: 'PUBLIC' | 'PRIVATE' },
  ) {
    return request<PartidaResponse>('/partidas', 'POST', { token, body });
  },
  getPartida(token?: string, id?: string) {
    return request<PartidaResponse>(`/partidas/${id}`, 'GET', { token });
  },
    sendChatMessage(token?: string, id?: string, text?: string) {
      return request(`/partidas/${id}/chat`, 'POST', { token, body: { text } });
    },
  entrarPartida(token?: string, id?: string) {
    return request<PartidaResponse>(`/partidas/${id}/entrar`, 'POST', {
      token,
    });
  },
  entrarPartidaPorCodigo(token?: string, codigo?: string) {
    return request<PartidaResponse>(`/partidas/entrar`, 'POST', { token, body: { codigo } });
  },
  addBot(token?: string, id?: string) {
    return request<PartidaResponse>(`/partidas/${id}/add-bot`, 'POST', {
      token,
    });
  },
  iniciarPartida(token?: string, id?: string) {
    return request<PartidaResponse>(`/partidas/${id}/iniciar`, 'POST', {
      token,
    });
  },
  criarPergunta(token?: string, id?: string, body?: unknown) {
    return request<PerguntaResponse>(`/partidas/${id}/perguntas`, 'POST', {
      token,
      body,
    });
  },
  criarAcusacao(token?: string, id?: string, body?: unknown) {
    return request<AcusacaoResponse>(`/partidas/${id}/acusacoes`, 'POST', {
      token,
      body,
    });
  },
  updateBlocoDeNotas(token?: string, id?: string, body?: { blocoDeNotas: Record<string, unknown> }) {
    return request<PartidaResponse>(`/partidas/${id}/bloco-de-notas`, 'POST', {
      token,
      body,
    });
  },

  // Temas / Cartas (may be unimplemented on backend yet)
  listTemas() {
    return request<{ id: string; nome: string }[]>(`/temas`, "GET");
  },
  getTema(id: string) {
    return request<any>(`/temas/${id}`, "GET");
  },
  listCartas(temaId?: string) {
    const query = temaId ? `?temaId=${encodeURIComponent(temaId)}` : "";
    return request<CartaResumo[]>(`/cartas${query}`, "GET");
  },
  getCarta(id: string) {
    return request<CartaResumo>(`/cartas/${id}`, 'GET');
  },
  me() {
    return request<AuthUser | null>(`/auth/me`, 'GET');
  },
  async updateProfile(formData: FormData) {
    const response = await fetch(`${API_URL}/perfis`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        typeof payload?.message === 'string'
          ? payload.message
          : Array.isArray(payload?.message)
          ? payload.message.join(', ')
          : 'Nao foi possivel completar a requisicao.';

      throw new ApiError(message, response.status);
    }

    return response.json();
  },
  abandonarPartida(token?: string, id?: string) {
    return request<PartidaResponse>(`/partidas/${id}/abandon`, 'POST', { token });
  },
};

export function saveSession(auth: AuthResponse): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, auth.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  document.cookie = `${TOKEN_KEY}=${auth.accessToken}; path=/; max-age=604800; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
