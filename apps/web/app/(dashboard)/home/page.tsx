"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarClock,
  DoorOpen,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  PartidaResponse,
  api,
  clearSession,
  getToken,
  getUser,
} from "@/services/api";

const DEFAULT_TEMA_ID = process.env.NEXT_PUBLIC_DEFAULT_TEMA_ID ?? "";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [partidas, setPartidas] = useState<PartidaResponse[]>([]);
  const [temaId, setTemaId] = useState(DEFAULT_TEMA_ID);
  const [maxJogadores, setMaxJogadores] = useState(4);
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const user = useMemo(() => getUser(), []);

  const loadPartidas = useCallback(
    async (currentToken: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const response = await api.listPartidas(currentToken);
        setPartidas(response);
      } catch (caughtError) {
        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : "Nao foi possivel carregar as salas.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      router.replace("/login");
      return;
    }

    setToken(currentToken);
    void loadPartidas(currentToken);
  }, [loadPartidas, router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (!temaId.trim()) {
      setError(
        "Informe o temaId. Enquanto a API nao expuser /temas, use NEXT_PUBLIC_DEFAULT_TEMA_ID ou cole o ID do seed.",
      );
      return;
    }

    setError(null);
    setNotice(null);
    setIsCreating(true);

    try {
      const partida = await api.createPartida(token, {
        temaId: temaId.trim(),
        maxJogadores,
      });
      router.push(`/lobby/${partida.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel criar a sala.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(id: string) {
    if (!token) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      const partida = await api.entrarPartida(token, id);
      router.push(`/lobby/${partida.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel entrar na sala.",
      );
    }
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#10261c] text-noir-paper">
      <header className="border-b border-white/10 bg-black/18">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.22em] text-noir-gold"
            >
              Arquivo Secreto
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Salas abertas</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-noir-paper/70 sm:block">
              {user?.username ?? user?.email ?? "Investigador"}
            </div>
            <button
              type="button"
              onClick={() => token && loadPartidas(token)}
              className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-noir-paper/80 transition hover:border-noir-gold/60 hover:text-noir-gold"
              aria-label="Atualizar salas"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-noir-paper/80 transition hover:border-noir-red/70 hover:text-red-200"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[24rem_1fr] lg:px-8">
        <aside className="space-y-4">
          <form
            onSubmit={handleCreate}
            className="rounded-lg border border-white/10 bg-noir-paper p-5 text-[#1b1a16] shadow-xl shadow-black/15"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-noir-orange">
                  Nova sala
                </p>
                <h2 className="mt-1 text-xl font-semibold">Preparar lobby</h2>
              </div>
              <Plus className="h-5 w-5 text-noir-orange" />
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Tema ID</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d7cab0] bg-white px-3 text-sm outline-none focus:border-noir-orange"
                value={temaId}
                onChange={(event) => setTemaId(event.target.value)}
                placeholder="UUID do tema"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold">Jogadores</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[#d7cab0] bg-white px-3 text-sm outline-none focus:border-noir-orange"
                value={maxJogadores}
                onChange={(event) => setMaxJogadores(Number(event.target.value))}
              >
                {[2, 3, 4, 5].map((option) => (
                  <option key={option} value={option}>
                    {option} slots
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={isCreating}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-noir-orange px-4 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar sala
            </button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleJoin(joinId.trim());
            }}
            className="rounded-lg border border-white/10 bg-white/5 p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-noir-gold" />
              <h2 className="text-lg font-semibold">Entrar por ID</h2>
            </div>
            <input
              className="h-11 w-full rounded-md border border-white/10 bg-black/18 px-3 text-sm text-noir-paper outline-none placeholder:text-noir-paper/35 focus:border-noir-gold/70"
              value={joinId}
              onChange={(event) => setJoinId(event.target.value)}
              placeholder="ID da partida"
            />
            <button
              type="submit"
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-noir-gold/40 px-4 text-sm font-bold text-noir-gold transition hover:bg-noir-gold/10"
            >
              <Search className="h-4 w-4" />
              Entrar
            </button>
          </form>

          {error ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-md border border-noir-gold/30 bg-noir-gold/10 px-4 py-3 text-sm text-yellow-100">
              {notice}
            </div>
          ) : null}
        </aside>

        <section className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 md:p-5">
          {isLoading ? (
            <div className="grid min-h-[24rem] place-items-center text-noir-paper/60">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : partidas.length ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {partidas.map((partida) => (
                <article
                  key={partida.id}
                  className="rounded-lg border border-white/10 bg-[#163523] p-4 shadow-lg shadow-black/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-noir-gold">
                        {partida.tema.nome}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        Sala {partida.id.slice(0, 8)}
                      </h2>
                    </div>
                    <span className="rounded-md bg-noir-paper px-2 py-1 text-xs font-black text-noir-green">
                      {partida.status}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-white/10 bg-black/14 p-3">
                      <Users className="mb-2 h-4 w-4 text-noir-orange" />
                      {partida.jogadores.length}/{partida.maxJogadores} slots
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/14 p-3">
                      <CalendarClock className="mb-2 h-4 w-4 text-noir-orange" />
                      {formatDate(partida.criadoEm)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {partida.jogadores.map((jogador, index) => (
                      <span
                        key={jogador.id}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/16 px-2 py-1 text-xs text-noir-paper/72"
                      >
                        {jogador.isBot ? (
                          <Bot className="h-3.5 w-3.5 text-noir-gold" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-noir-orange" />
                        )}
                        {jogador.email ?? `Bot ${index + 1}`}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleJoin(partida.id)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-noir-orange px-4 text-sm font-bold text-white transition hover:bg-orange-500"
                    >
                      <DoorOpen className="h-4 w-4" />
                      Entrar
                    </button>
                    <Link
                      href={`/lobby/${partida.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-4 text-sm font-bold text-noir-paper/80 transition hover:border-noir-gold/70 hover:text-noir-gold"
                    >
                      Ver
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[24rem] place-items-center rounded-lg border border-dashed border-white/15 text-center">
              <div>
                <Search className="mx-auto h-8 w-8 text-noir-gold" />
                <h2 className="mt-4 text-xl font-semibold">
                  Nenhuma sala aberta
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-noir-paper/60">
                  Crie uma sala com um tema existente ou atualize a lista quando
                  outro host abrir um lobby.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNotice("Use o formulario ao lado para criar o primeiro lobby.");
                  }}
                  className="mt-5 rounded-md border border-noir-gold/40 px-4 py-2 text-sm font-bold text-noir-gold"
                >
                  Preparar nova sala
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
