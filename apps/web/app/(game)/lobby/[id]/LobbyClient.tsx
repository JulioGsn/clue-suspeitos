"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useRouter } from "next/navigation";
import {
  ApiError,
  PartidaResponse,
  api,
  AuthUser,
} from "@/services/api";

type Props = {
  initialPartida?: PartidaResponse | null;
  initialRemoteUser?: AuthUser | null;
  partidaId: string;
};

export default function LobbyClient({ initialPartida = null, initialRemoteUser = null, partidaId }: Props) {
  const router = useRouter();
  const [remoteUser, setRemoteUser] = useState<AuthUser | null>(initialRemoteUser ?? null);
  const [partida, setPartida] = useState<PartidaResponse | null>(initialPartida ?? null);
  const [players, setPlayers] = useState<PartidaResponse['jogadores']>(initialPartida?.jogadores ?? [] as PartidaResponse['jogadores']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(initialPartida ? false : true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const user = useMemo(() => remoteUser, [remoteUser]);
  const isHost = Boolean(user && partida?.anfitriao.id === user.id);
  const [timeLeft, setTimeLeft] = useState(10);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ author: string; text: string }>>([]);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const prevPlayersRef = useRef<PartidaResponse['jogadores']>(initialPartida?.jogadores ?? [] as PartidaResponse['jogadores']);

  const loadPartida = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.getPartida(undefined, partidaId);
      setPartida(response);
      setPlayers(response.jogadores ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel carregar o lobby.",
      );
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [partidaId]);

  useEffect(() => {
    void (async () => {
      try {
        if (!initialPartida) {
          await loadPartida();
        }
      } catch (caughtError) {
        if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
          router.replace("/login");
          return;
        }
      }

      try {
        const me = await api.me();
        setRemoteUser(me);
      } catch {
        // ignore
      }
    })();

    return () => {
      // cleanup if necessary
    };
  }, [loadPartida, router, initialPartida]);

  // start refresh timer
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await api.getPartida(undefined, partidaId);
        setPlayers(response.jogadores ?? []);
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          const st = (caughtError as any).status;
          if (st === 401) {
            router.replace('/login');
            return;
          }
          if (st === 404) {
            router.replace('/home');
            return;
          }
        }
        // ignore other polling errors
      }
    };

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0) {
          void fetchPlayers();
          return 10;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [partidaId, router]);

  // Initialize chat messages when partida loads
  useEffect(() => {
    if (!partida) return;
    const initial: Array<{ author: string; text: string }> = [];
    if (partida.anfitriao) initial.push({ author: partida.anfitriao.username ?? (partida.anfitriao.email?.split('@')[0] ?? 'ANFITRIÃO'), text: 'Sejam bem-vindos, agentes. Vamos resolver esse crime.' });

    const playerPhrases = [
      'Presente. Bloco pronto.',
      'Na área. Prontos para investigar.',
      'Em posição. Prontos para o chamado.',
      'Agente pronto. Vamos à obra.',
    ];

    const otherPlayers = partida.jogadores.filter((j) => j && j.usuarioId !== partida.anfitriao.id);
    otherPlayers.slice(0, 4).forEach((j, idx) => {
      if (!j) return;
      const phrase = playerPhrases[idx % playerPhrases.length];
      initial.push({ author: j.username ?? (j.email?.split('@')[0] ?? 'Agente'), text: phrase });
    });

    setChatMessages((prev) => (prev && prev.length > 0 ? prev : initial));
    prevPlayersRef.current = partida.jogadores ?? [];
  }, [partida]);

  // SSE: subscribe to chat stream
  useEffect(() => {
    if (!partidaId) return;
    const base = (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001');
    const url = `${base}/partidas/${partidaId}/chat/stream`;

    let es: EventSource | null = null;
    try {
      es = new EventSource(url, { withCredentials: true } as any);
    } catch (e) {
      es = null;
    }

    if (!es) return;

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        setChatMessages((s) => {
          const last = s[s.length - 1];
          if (last && last.author === 'VOCÊ' && last.text === payload.text) {
            return [...s.slice(0, -1), { author: payload.author, text: payload.text }];
          }
          return [...s, { author: payload.author, text: payload.text }];
        });
        // After receiving any SSE chat event, ensure we refresh partida status
        (async () => {
          try {
            const fresh = await api.getPartida(undefined, partidaId);
            if (fresh && fresh.status === 'EM_ANDAMENTO') {
              setPartida(fresh);
              setPlayers(fresh.jogadores ?? []);
              try { router.push('/game'); } catch (e) {}
            } else {
              // update local partida info if changed
              setPartida(fresh);
              setPlayers(fresh.jogadores ?? []);
            }
          } catch (e) {
            // ignore fetch errors here
          }
        })();
      } catch (err) {
        // ignore
      }
    };

    try {
      es.addEventListener('partida_deleted', () => {
        try {
          router.replace('/home');
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore if addEventListener not supported
    }

    // Listen for explicit partida events (backend may emit these)
    try {
      const handlePartidaEvent = async (ev: any) => {
        try {
          // try to fetch latest partida state and redirect if started
          const fresh = await api.getPartida(undefined, partidaId);
          setPartida(fresh);
          setPlayers(fresh.jogadores ?? []);
          if (fresh && fresh.status === 'EM_ANDAMENTO') {
            try { router.push('/game'); } catch (e) {}
          }
        } catch (err) {
          // ignore
        }
      };

      es.addEventListener('partida_started', handlePartidaEvent as any);
      es.addEventListener('partida_iniciada', handlePartidaEvent as any);
      es.addEventListener('partida_updated', handlePartidaEvent as any);
    } catch (e) {
      // ignore if addEventListener not supported
    }

    es.onerror = () => {
      // keep trying; no-op
    };

    return () => {
      try {
        es?.close();
      } catch {}
    };
  }, [partidaId, router]);

  // Ensure lobby uses the same background/tone as /home and /game
  useEffect(() => {
    const id = 'lobby-theme-overrides';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      :root { --clue-dark: #1a1a1a; --clue-yellow: #e6d5b8; --clue-red: #8b0000; --paper-bg: #fdf6e3; --accent-red: #8b0000; }
      html, body, #__next, .min-h-screen, .h-screen, main { background-image: radial-gradient(circle,#2a2a2a 1px,transparent 1px) !important; background-size:30px 30px !important; background-color: var(--clue-dark) !important; color: #e6e6e6 !important; }
      body { font-family: 'Courier Prime', monospace; }
    `;
    document.head.appendChild(style);

    return () => {
      try { style.remove(); } catch {}
    };
  }, []);

  // Detect newly joined players and append a thematic auto-message
  useEffect(() => {
    if (!partida) return;
    const prev = prevPlayersRef.current ?? [];
    const joined = players.filter((p) => p && !prev.some((pp) => pp && pp.id === p.id));
    if (!joined.length) return;

    const playerPhrases = [
      'Presente. Bloco pronto.',
      'Na área. Prontos para investigar.',
      'Em posição. Prontos para o chamado.',
      'Agente pronto. Vamos à obra.',
    ];

    setChatMessages((s) => {
      const additions = joined
        .filter((j) => j.usuarioId !== partida.anfitriao.id)
        .map((j, idx) => ({ author: j.username ?? (j.email?.split('@')[0] ?? 'Agente'), text: playerPhrases[(prev.length + idx) % playerPhrases.length] }));
      return [...s, ...additions];
    });

    prevPlayersRef.current = players;
  }, [players, partida]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  async function runAction(
    actionName: string,
    action: () => Promise<PartidaResponse>,
  ) {
    setError(null);
    setPendingAction(actionName);

    try {
      const response = await action();
      setPartida(response);
      setPlayers(response.jogadores ?? []);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
        router.replace('/login');
        return;
      }

      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel executar a acao.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  // Redirect to game page when the partida status changes to 'EM_ANDAMENTO'
  useEffect(() => {
    if (partida?.status === 'EM_ANDAMENTO') {
      try {
        router.push('/game');
      } catch (e) {
        // ignore navigation errors
      }
    }
  }, [partida?.status, router]);

  function sendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((s) => [...s, { author: 'VOCÊ', text }]);
    setChatInput('');

    void api.sendChatMessage(undefined, partidaId, text).catch(() => {
      setChatMessages((s) => [...s, { author: 'Sistema', text: 'Falha ao enviar mensagem' }]);
    });
  }

  return (
    <main className="min-h-screen p-4 md:p-8 mb-12">
      {/* Faixa Superior */}
      <div className="fixed top-0 left-0 w-full h-8 crime-tape flex items-center justify-center z-50 shadow-md">
        <span className="text-white font-bold tracking-[0.3em] text-[10px] uppercase">
          SALA DE ESPA PARA INVESTIGAÇÃO - AGUARDANDO REFORÇOS
        </span>
      </div>

      <div className="max-w-6xl mx-auto mt-10">
        <header className="flex flex-col md:flex-row justify-between items-start mb-8 px-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="special-elite text-4xl text-stone-200 uppercase">Caso: {partida?.tema?.nome ?? 'Mansão Tudor'}</h1>
              <span className="bg-red-800 text-white text-[10px] px-2 py-1 font-bold">CÓDIGO: {(partida?.codigo ?? partidaId?.slice(0,8) ?? '').toUpperCase()}</span>
            </div>
            <p className="text-stone-400 italic text-sm">Tema: {partida?.tema?.nome ?? 'Cartas Clássicas'} | Objetivo: {partida?.maxJogadores ?? 4} Agentes</p>
          </div>

          <div className="mt-4 md:mt-0 text-right">
            <span className="block text-[10px] font-bold text-stone-500 uppercase">Sincronizando Arquivos</span>
            <span id="refresh-timer" className="text-red-800 font-bold tabular-nums text-2xl">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 folder-container p-6 md:p-10 relative">
            <h2 className="special-elite text-2xl text-stone-800 uppercase border-b-2 border-stone-400 mb-6 pb-2">Investigadores Convocados</h2>

            <div id="agents-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <div className="col-span-full grid place-items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-stone-700" />
                </div>
              ) : (
                Array.from({ length: partida?.maxJogadores ?? 4 }).map((_, index) => {
                  const jogador = players[index];
                  const isHostSlot = jogador && partida && jogador.usuarioId === partida.anfitriao.id;

                  return (
                    <div key={jogador?.id ?? index} className={`agent-slot p-4 flex items-center gap-4 ${jogador ? '' : 'empty'}`}>
                      <div className={`w-12 h-12 ${jogador ? 'bg-stone-800 text-white' : 'bg-stone-300 text-stone-500'} flex items-center justify-center special-elite text-xl`}>{jogador ? index + 1 : '?'}</div>
                      <div>
                        <p className={`font-bold ${jogador ? 'text-stone-900' : 'text-stone-400'} leading-none`}>{jogador ? (jogador.username ?? (jogador.email ? jogador.email.split('@')[0] : `AGENTE ${index + 1}`)) : 'AGUARDANDO...'}</p>
                        <p className={`text-[9px] ${isHostSlot ? 'text-red-800' : jogador ? 'text-green-700' : 'text-stone-400'} font-bold uppercase mt-1`}>{isHostSlot ? 'Anfitrião / Pronto' : jogador ? (jogador.isBot ? 'Bot' : 'Pronto') : 'Vaga Disponível'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-stone-300 pt-8">
              <div className="text-stone-600">
                <p className="text-xs uppercase font-bold">Status da Investigação:</p>
                <div className="stamp-status mt-2">{partida?.status === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Aguardando Equipe'}</div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    setError(null);
                    setPendingAction('abandonar');
                    try {
                      await api.abandonarPartida(undefined, partidaId);
                      router.push('/home');
                    } catch (caughtError) {
                      if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
                        router.replace('/login');
                        return;
                      }

                      setError(
                        caughtError instanceof ApiError
                          ? caughtError.message
                          : 'Nao foi possivel abandonar a partida.',
                      );
                    } finally {
                      setPendingAction(null);
                    }
                  }}
                  className="bg-stone-300 text-stone-700 px-6 py-3 font-bold uppercase hover:bg-stone-400 transition-all text-xs"
                >
                  {pendingAction === 'abandonar' ? 'Abandonando...' : 'Abandonar Caso'}
                </button>
                <button id="start-btn" disabled={!isHost || pendingAction !== null || partida?.status !== 'LOBBY'} onClick={() => runAction('iniciar', () => api.iniciarPartida(undefined, partidaId))} className={`bg-stone-400 text-stone-200 px-8 py-3 font-bold uppercase cursor-not-allowed special-elite text-xl ${isHost && partida?.status === 'LOBBY' ? 'hover:bg-red-700 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                  {pendingAction === 'iniciar' ? 'Iniciando...' : 'Iniciar Partida'}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white border-2 border-stone-400 p-4 shadow-lg flex flex-col h-[600px]">
              <div className="border-b border-stone-200 pb-2 mb-4">
                <h3 className="special-elite text-xl text-stone-800 uppercase tracking-tighter">Frequência de Rádio</h3>
                <p className="text-[9px] text-stone-500 uppercase">Mensagens criptografadas de ponta-a-ponta</p>
              </div>

              <div id="chat-messages" ref={chatRef} className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2 text-[11px] text-stone-800">
                {chatMessages.map((m, i) => (
                  <div key={i} className="message">
                    <span className="font-bold text-red-800">{m.author}:</span>
                    <span className="ml-2">{m.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t border-stone-200 pt-4">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} type="text" id="chat-input" placeholder="Diga algo..." className="flex-1 p-2 bg-stone-100 border border-stone-300 outline-none focus:border-red-800 text-xs text-stone-900 placeholder:text-stone-400" onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} />
                <button
                  type="button"
                  onClick={sendMessage}
                  aria-label="Enviar mensagem"
                  title="Enviar mensagem"
                  className="bg-stone-800 text-white px-4 py-2 hover:bg-red-800 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="sr-only">Enviar mensagem</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-8 crime-tape flex items-center justify-center z-50 border-t border-black">
        <span className="text-white font-bold tracking-[0.2em] text-[10px] uppercase">
          PRINCIPAIS SUSPEITOS: {players?.slice(0,2).map(j => (j?.username ?? j?.email?.split('@')[0] ?? 'DESCONHECIDO').toUpperCase()).join(' & ') || 'JALES MONTEIRO - JÚLIO GOMES'}
        </span>
      </div>
    </main>
  );
}
