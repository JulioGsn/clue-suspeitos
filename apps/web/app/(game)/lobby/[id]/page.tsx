"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Crown,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ApiError,
  PartidaResponse,
  api,
  getToken,
  getUser,
} from "@/services/api";

export default function LobbyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [partida, setPartida] = useState<PartidaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const user = useMemo(() => getUser(), []);
  const isHost = Boolean(user && partida?.anfitriao.id === user.id);

  const loadPartida = useCallback(
    async (currentToken: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const response = await api.getPartida(currentToken, params.id);
        setPartida(response);
      } catch (caughtError) {
        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : "Nao foi possivel carregar o lobby.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [params.id],
  );

  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      router.replace("/login");
      return;
    }

    setToken(currentToken);
    void loadPartida(currentToken);
  }, [loadPartida, router]);

  async function runAction(
    actionName: string,
    action: (currentToken: string) => Promise<PartidaResponse>,
  ) {
    if (!token) {
      return;
    }

    setError(null);
    setPendingAction(actionName);

    try {
      const response = await action(token);
      setPartida(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel executar a acao.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#10261c,#1a3b2b_52%,#2c1e16)] text-noir-paper">
      <header className="border-b border-white/10 bg-black/18">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link
              href="/home"
              className="inline-flex items-center gap-2 text-sm font-semibold text-noir-paper/70 transition hover:text-noir-gold"
            >
              <ArrowLeft className="h-4 w-4" />
              Salas
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">
              Lobby {params.id.slice(0, 8)}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => token && loadPartida(token)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-bold text-noir-paper/80 transition hover:border-noir-gold/70 hover:text-noir-gold"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_24rem] lg:px-8">
        <section className="rounded-lg border border-white/10 bg-[#163523]/85 p-5 shadow-xl shadow-black/15">
          {isLoading ? (
            <div className="grid min-h-[28rem] place-items-center text-noir-paper/60">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : partida ? (
            <>
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-noir-gold">
                    {partida.tema.nome}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Aguardando investigadores
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-noir-paper/60">
                    Host: {partida.anfitriao.email}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-white/10 bg-black/14 p-3">
                    <Users className="mb-2 h-4 w-4 text-noir-orange" />
                    {partida.jogadores.length}/{partida.maxJogadores} slots
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/14 p-3">
                    <ShieldCheck className="mb-2 h-4 w-4 text-noir-orange" />
                    {partida.status}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: partida.maxJogadores }).map((_, index) => {
                  const jogador = partida.jogadores[index];

                  return (
                    <div
                      key={jogador?.id ?? index}
                      className="min-h-40 rounded-lg border border-white/10 bg-black/16 p-4"
                    >
                      {jogador ? (
                        <div className="flex h-full flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-md bg-noir-paper text-noir-green">
                              {jogador.isBot ? (
                                <Bot className="h-6 w-6" />
                              ) : (
                                <UserRound className="h-6 w-6" />
                              )}
                            </div>
                            {jogador.usuarioId === partida.anfitriao.id ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-noir-gold px-2 py-1 text-xs font-black text-noir-wood">
                                <Crown className="h-3 w-3" />
                                Host
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold">
                              {jogador.email ?? `Bot ${index + 1}`}
                            </h3>
                            <p className="mt-1 text-sm text-noir-paper/58">
                              {jogador.isBot
                                ? "Resposta automatica"
                                : "Jogador humano"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid h-full place-items-center rounded-md border border-dashed border-white/15 text-sm text-noir-paper/45">
                          Slot vazio
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-noir-paper p-5 text-[#1b1a16]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-noir-orange">
              Controles
            </p>
            <h2 className="mt-1 text-xl font-semibold">Sala</h2>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() =>
                  runAction("entrar", (currentToken) =>
                    api.entrarPartida(currentToken, params.id),
                  )
                }
                disabled={pendingAction !== null}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d7cab0] px-4 text-sm font-bold transition hover:border-noir-orange disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pendingAction === "entrar" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Entrar na sala
              </button>

              <button
                type="button"
                onClick={() =>
                  runAction("bot", (currentToken) =>
                    api.addBot(currentToken, params.id),
                  )
                }
                disabled={!isHost || pendingAction !== null}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d7cab0] px-4 text-sm font-bold transition hover:border-noir-orange disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === "bot" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                Adicionar bot
              </button>

              <button
                type="button"
                onClick={() =>
                  runAction("iniciar", (currentToken) =>
                    api.iniciarPartida(currentToken, params.id),
                  )
                }
                disabled={!isHost || pendingAction !== null}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-noir-orange px-4 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === "iniciar" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Iniciar partida
              </button>
            </div>

            {!isHost ? (
              <p className="mt-4 text-sm leading-6 text-[#615845]">
                Apenas o host pode adicionar bots ou iniciar a partida.
              </p>
            ) : null}
          </div>

          {partida?.status === "EM_ANDAMENTO" ? (
            <div className="rounded-lg border border-noir-gold/30 bg-noir-gold/10 p-5">
              <h2 className="font-semibold text-yellow-100">
                Partida iniciada
              </h2>
              <p className="mt-2 text-sm leading-6 text-noir-paper/65">
                O backend já retornou cartas reveladas e sua mão quando
                disponível. A próxima tela pode consumir esse mesmo contrato.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
