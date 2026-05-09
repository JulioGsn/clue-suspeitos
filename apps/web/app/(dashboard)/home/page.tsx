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
  AuthUser,
} from "@/services/api";
import ProfileEditModal from "./ProfileEditModal";

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
  const [remoteUser, setRemoteUser] = useState<AuthUser | null>(null);
  const [currentPartida, setCurrentPartida] = useState<PartidaResponse | null>(null);
  const [partidas, setPartidas] = useState<PartidaResponse[]>([]);
  const [temas, setTemas] = useState<{ id: string; nome: string }[]>([]);
  const [temaId, setTemaId] = useState(DEFAULT_TEMA_ID);
  const [maxJogadores, setMaxJogadores] = useState(4);
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const user = useMemo(() => remoteUser, [remoteUser]);

  const loadPartidas = useCallback(async (opts?: { background?: boolean }) => {
    setError(null);
    if (!opts?.background) setIsLoading(true);

    try {
      const response = await api.listPartidas();
      setPartidas(response);
      return response;
    } catch (caughtError) {
      if (!opts?.background) {
        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : "Nao foi possivel carregar as salas.",
        );
      }
      throw caughtError;
    } finally {
      if (!opts?.background) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await loadPartidas();
      } catch (caughtError) {
        if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
          router.replace("/login");
          return;
        }
      }

      try {
        const me = await api.me();
        if (!mounted) return;
        setRemoteUser(me);
        if (me?.currentPartidaId) {
          try {
            const p = await api.getPartida(undefined, me.currentPartidaId);
            if (mounted) setCurrentPartida(p);
          } catch {
            if (mounted) setCurrentPartida(null);
          }
        } else {
          if (mounted) setCurrentPartida(null);
        }
      } catch {
        // ignore
      }
      // load temas for modal select
      try {
        const temasList = await api.listTemas();
        if (Array.isArray(temasList) && temasList.length) {
          setTemas(temasList as any);
          setTemaId((curr) => curr || (temasList[0]?.id ?? ""));
        }
      } catch {
        // ignore - backend may not expose temas endpoint in early stages
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadPartidas, router]);

  useEffect(() => {
    if (!remoteUser?.currentPartidaId) {
      setCountdown(10);
      const id = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            void loadPartidas({ background: true }).catch(() => {});
            return 10;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [remoteUser?.currentPartidaId, loadPartidas]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      const partida = await api.createPartida(undefined, {
        temaId: temaId.trim(),
        maxJogadores,
      });
      router.push(`/lobby/${partida.id}`);
    } catch (caughtError) {
      // log to console for debugging
      try {
        // eslint-disable-next-line no-console
        console.error('createPartida failed', caughtError);
      } catch {}
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
    setError(null);
    setNotice(null);

    try {
      const partida = await api.entrarPartida(undefined, id);
      router.push(`/lobby/${partida.id}`);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
        router.replace('/login');
        return;
      }

      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel entrar na sala.",
      );
    }
  }

  async function handleCreatePublic() {
    setError(null);
    setNotice(null);

    const tema = (DEFAULT_TEMA_ID || temaId || "").trim();
    if (!tema) {
      setNotice(
        "Informe um tema no formulário à esquerda ou defina NEXT_PUBLIC_DEFAULT_TEMA_ID",
      );
      return;
    }

    setIsCreating(true);
    try {
      const partida = await api.createPartida(undefined, {
        temaId: tema,
        maxJogadores,
        visibilidade: 'PUBLIC',
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

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (showCreateModal) {
      // do not pre-generate code on modal open; generate only when user chooses 'Privado'
      setGeneratedCode(null);
    } else {
      setGeneratedCode(null);
    }
  }, [showCreateModal]);

  async function handleCreateModalSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      // quick debug to confirm handler is invoked
      // eslint-disable-next-line no-console
      console.debug('handleCreateModalSubmit invoked', { temaId });
    } catch {}
    const fd = new FormData(e.currentTarget);
    // prefer controlled temaId (from select), fall back to form value
    let themeVal = (temaId || (fd.get("theme")?.toString() ?? DEFAULT_TEMA_ID)).trim();
    const maxPlayersVal = Number(fd.get("maxPlayers") ?? maxJogadores);
    const privacyVal = (fd.get("privacy")?.toString() ?? "private").trim();

    // If themeVal isn't a UUID, fall back to DEFAULT_TEMA_ID when available
    const isUuid = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
    if (!isUuid(themeVal)) {
      if (DEFAULT_TEMA_ID) {
        themeVal = DEFAULT_TEMA_ID;
      } else {
        setError('Tema selecionado invalido. Defina NEXT_PUBLIC_DEFAULT_TEMA_ID ou escolha um tema valido.');
        return;
      }
    }

    setIsCreating(true);
    try {
      const partida = await api.createPartida(undefined, {
        temaId: themeVal,
        maxJogadores: maxPlayersVal,
        visibilidade: privacyVal === 'private' ? 'PRIVATE' : 'PUBLIC',
      });
      setShowCreateModal(false);

      // If this was a private visibility, prefer server-generated code
      if (privacyVal === 'private') {
        const serverCode = partida.codigo ?? generatedCode;
        setGeneratedCode(serverCode ?? null);
        if (serverCode) {
          try {
            await navigator.clipboard.writeText(serverCode);
          } catch {
            // ignore clipboard errors
          }
        }
      }

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

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setGeneratedCode(out);
  }

  async function handleCopyCode() {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setError('Falha ao copiar o código para a área de transferência.');
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <>
      

      <div className="fixed top-0 left-0 w-full h-8 crime-tape flex items-center justify-center z-50 shadow-md">
        <span className="text-white font-bold tracking-[0.3em] text-[10px] uppercase">
          CENTRAL DE INTELIGÊNCIA - TERMINAL DO AGENTE - CONFIDENCIAL
        </span>
      </div>

      <main className="min-h-screen p-4 md:p-8 mb-12">
        <div className="max-w-6xl mx-auto mt-10">
          <header className="flex flex-col md:flex-row justify-between items-end mb-8 px-4">
            <div>
              <h1 className="special-elite text-5xl text-stone-200 mb-2 uppercase">Lobby de<br/>Investigação</h1>
              <p className="text-stone-400 italic text-sm">O rastro ainda está quente. Escolha seu caso.</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-4">
              <button onClick={() => router.push('/temas')} className="bg-stone-800 hover:bg-stone-700 text-white px-6 py-3 special-elite text-lg shadow-xl transition-all active:scale-95">
                NOVO DOSSIÊ
              </button>
              <button onClick={() => setShowCreateModal(true)} className="bg-red-800 hover:bg-red-700 text-white px-6 py-3 special-elite text-lg shadow-xl transition-all active:scale-95">
                + NOVO CASO
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 folder-container p-6 md:p-10 min-h-[600px] relative">

              {remoteUser?.currentPartidaId ? (
                <div id="active-session" className="mb-8 p-6 active-session-card shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-red-800 text-white px-3 py-1 text-[10px] font-bold uppercase">Em Andamento</div>
                  <h3 className="special-elite text-xl text-stone-900 mb-2 tracking-tighter">CASO NÃO FINALIZADO</h3>
                  <p className="text-sm text-stone-600 mb-4 italic">
                    Você tem uma investigação aberta na <strong>{currentPartida?.tema?.nome ?? 'Mansão Tudor'}</strong> com outros {currentPartida?.jogadores?.length ?? '0'} agentes.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => router.push(`/lobby/${remoteUser.currentPartidaId}`)} className="bg-stone-900 text-white px-8 py-2 font-bold uppercase hover:bg-red-800 transition-all text-xs">Retornar à Cena do Crime</button>
                    <button onClick={async () => {
                      setError(null);
                      setNotice(null);
                      try {
                        await api.abandonarPartida(undefined, remoteUser.currentPartidaId ?? undefined);
                        const me2 = await api.me();
                        setRemoteUser(me2);
                        await loadPartidas();
                        setCurrentPartida(null);
                        setNotice('Você abandonou a partida.');
                      } catch (caughtError) {
                        setError(
                          caughtError instanceof ApiError
                            ? caughtError.message
                            : 'Nao foi possivel abandonar a partida.',
                        );
                      }
                    }} className="bg-stone-300 text-stone-700 px-6 py-2 font-bold uppercase hover:bg-stone-400 transition-all text-xs">Abandonar Partida</button>
                  </div>
                </div>
              ) : null}

              {!remoteUser?.currentPartidaId ? (
                <>
                  <div className="flex justify-between items-center border-b-2 border-stone-400 mb-6 pb-2">
                    <h2 className="special-elite text-2xl text-stone-800 uppercase">Salas com Vagas Disponíveis</h2>
                    <div className="text-right">
                      <span className="block text-[8px] font-bold text-stone-500 uppercase">Próxima Atualização</span>
                      <span className="text-red-800 font-bold tabular-nums">00:{String(countdown).padStart(2,'0')}</span>
                    </div>
                  </div>

                  <div id="rooms-list" className="space-y-4">
                    {partidas.filter(p => p.status === 'LOBBY' && (p.jogadores?.length ?? 0) < (p.maxJogadores ?? 4)).length ? partidas.filter(p => p.status === 'LOBBY' && (p.jogadores?.length ?? 0) < (p.maxJogadores ?? 4)).map((partida) => (
                  <div key={partida.id} className="case-card p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-800 flex items-center justify-center text-white special-elite text-xl">#{partida.id.slice(0, 4)}</div>
                      <div>
                        <h3 className="font-bold text-lg text-stone-900 leading-tight">{partida.tema?.nome ?? 'Tema'}</h3>
                        <p className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">Investigador: {partida.jogadores[0]?.username ?? partida.jogadores[0]?.email?.split('@')[0] ?? 'Host'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="block text-[10px] uppercase font-bold text-stone-400 leading-none">Agentes</span>
                        <span className="text-xl font-bold text-stone-800">{partida.jogadores.length}/{partida.maxJogadores}</span>
                      </div>
                      <button onClick={() => void handleJoin(partida.id)} className="bg-stone-900 text-white px-6 py-2 text-xs font-bold uppercase hover:bg-red-800 transition-colors">Entrar</button>
                    </div>
                  </div>
                    )) : (
                      <div className="case-card p-8 text-center text-stone-600">
                        Nenhuma sala aberta. Crie uma investigação ou atualize a lista.
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              <div className="mt-12 text-center text-stone-500 text-[10px] italic border-t border-stone-300 pt-4">
                -- RELATÓRIO DE INTELIGÊNCIA EM TEMPO REAL --
              </div>
            </div>

            <aside className="space-y-6">
              <div className="bg-stone-200 border-2 border-stone-400 p-6 shadow-lg rotate-1">
                <h3 className="special-elite text-xl text-stone-800 mb-2 uppercase tracking-tighter">Dossiê Privado</h3>
                <p className="text-[9px] text-stone-500 uppercase font-bold mb-4">Insira o selo de acesso para entrar em casos fechados</p>
                  <div className="space-y-3">
                  <input id="join-code" aria-label="Código do caso" value={joinId} onChange={(e) => setJoinId(e.target.value)} type="text" placeholder="CÓDIGO-DO-CASO" className="w-full p-3 bg-white border border-stone-300 text-center font-bold tracking-widest uppercase placeholder-stone-300 outline-none focus:border-red-800 transition-colors" />
                  <button onClick={async () => {
                    setError(null);
                    setNotice(null);
                    const code = (joinId || '').trim().toUpperCase();
                    if (!code) {
                      setError('Informe o código do caso.');
                      return;
                    }

                    try {
                      const partida = await api.entrarPartidaPorCodigo(undefined, code);
                      router.push(`/lobby/${partida.id}`);
                    } catch (caughtError) {
                      if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
                        router.replace('/login');
                        return;
                      }

                      setError(
                        caughtError instanceof ApiError
                          ? caughtError.message
                          : 'Nao foi possivel entrar na sala com este código.',
                      );
                    }
                  }} className="w-full bg-stone-800 text-white py-2 font-bold hover:bg-stone-700 transition-colors uppercase text-sm">Validar</button>
                </div>
              </div>

              <div className="bg-[#f3f4f6] p-6 border border-stone-300 shadow-inner -rotate-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-stone-800 text-white text-[8px] px-2 py-1 font-bold">IDENTIDADE DO AGENTE</span>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <div className="flex gap-4 items-center mb-6">
                  <div className="w-14 h-14 bg-stone-300 border border-stone-400 flex items-center justify-center italic text-stone-500 text-[8px] grayscale">FOTO</div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-stone-800 leading-none uppercase truncate" id="profile-name">{user?.username ?? 'Agente Investigador'}</p>
                    <p className="text-[9px] text-stone-500 uppercase tracking-tighter">Patente: Inspetor</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="bg-stone-100 p-3 border border-stone-200 mb-2 flex justify-between items-center">
                    <span className="text-[11px] uppercase font-bold text-stone-600">Casos solucionados</span>
                    <span className="text-2xl font-bold text-green-600">{String(remoteUser?.vitorias ?? 0)}</span>
                  </div>
                  <div className="bg-stone-100 p-3 border border-stone-200 mb-2 flex justify-between items-center">
                    <span className="text-[11px] uppercase font-bold text-stone-600">Culpados em fuga</span>
                    <span className="text-2xl font-bold text-red-600">{String(remoteUser?.derrotas ?? 0)}</span>
                  </div>
                  <div className="bg-stone-100 p-3 border border-stone-200 flex justify-between items-center">
                    <span className="text-[11px] uppercase font-bold text-stone-600">Investigações interrompidas</span>
                    <span className="text-2xl font-bold text-stone-700">{String(remoteUser?.abandonos ?? 0)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setShowProfileModal(true)} className="w-full text-left p-2 border-b border-stone-200 text-[10px] font-bold uppercase hover:bg-white transition-colors flex items-center">
                    <span className="mr-2">⚙️</span> Editar Perfil / Senha
                  </button>
                  <button onClick={handleLogout} className="w-full text-left p-2 border-b border-stone-200 text-[10px] font-bold uppercase text-red-800 hover:bg-white transition-colors flex items-center">
                    <span className="mr-2">🚪</span> Encerrar Sessão
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-8 crime-tape flex items-center justify-center z-50 border-t border-black">
        <span className="text-white font-bold tracking-[0.2em] text-[10px] uppercase">
          PRINCIPAIS SUSPEITOS: JALES MONTEIRO & JÚLIO GOMES
        </span>
      </div>

      {showProfileModal && remoteUser ? (
        <ProfileEditModal
          user={remoteUser}
          onClose={() => setShowProfileModal(false)}
          onUpdated={async () => {
            try {
              const me = await api.me();
              setRemoteUser(me);
            } catch {}
          }}
        />
      ) : null}

      {showCreateModal ? (
        <div className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="folder-container max-w-lg w-full p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="special-elite text-3xl text-stone-900 uppercase underline italic">Abrir Novo Dossiê</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-stone-400 hover:text-red-800 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCreateModalSubmit} className="space-y-5">
              {error ? (
                <div className="p-3 bg-red-800 text-white font-bold text-sm rounded">{error}</div>
              ) : null}
              {notice ? (
                <div className="p-3 bg-yellow-200 text-black font-bold text-sm rounded">{notice}</div>
              ) : null}
              <div>
                <label htmlFor="theme-select" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Tema das Cartas</label>
                {temas.length ? (
                  <select id="theme-select" name="theme" value={temaId} onChange={(e) => setTemaId(e.target.value)} className="w-full input-classic p-3 text-stone-800 font-bold outline-none">
                    {temas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                ) : (
                  <select id="theme-select" name="theme" defaultValue="classic" className="w-full input-classic p-3 text-stone-800 font-bold outline-none">
                    <option value="classic">Mansão Tudor (Clássico)</option>
                    <option value="simpsons">Springfield (Simpsons)</option>
                    <option value="got">Westeros (Game of Thrones)</option>
                    <option value="office">Dunder Mifflin (The Office)</option>
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxPlayersInput" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Qtd. Agentes (2-5)</label>
                    <input id="maxPlayersInput" name="maxPlayers" type="number" min="2" max="5" defaultValue={4} className="w-full input-classic p-3 text-stone-800 font-bold outline-none" />
                </div>
                <div>
                  <label htmlFor="privacy-select" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Visibilidade</label>
                  <select id="privacy-select" name="privacy" onChange={(e) => { if ((e.target as HTMLSelectElement).value === 'private') generateCode(); else setGeneratedCode(null); }} className="w-full input-classic p-3 text-stone-800 font-bold outline-none">
                    <option value="public">Público</option>
                    <option value="private">Privado (Com Código)</option>
                  </select>
                </div>
              </div>

              {generatedCode ? (
                <div className="mt-4 w-full">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Código de Acesso Gerado</label>
                  <div className="border-2 border-dashed border-stone-400 p-4 flex items-center gap-4 w-full">
                    <div className="flex-1 font-special text-2xl tracking-widest text-red-800 font-bold text-center">{generatedCode}</div>
                    <button type="button" onClick={handleCopyCode} className={`px-3 py-2 text-white transition-colors ${copied ? 'bg-green-700 animate-pulse' : 'bg-stone-800 hover:bg-stone-700'}`}>
                      {copied ? '✓ Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              ) : null}
              <button type="submit" disabled={isCreating} className="w-full bg-red-900 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 font-bold uppercase shadow-xl hover:bg-stone-900 transition-colors special-elite text-lg">
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Criando...</span>
                ) : (
                  'Criar Investigação'
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        :root {
          --clue-yellow: #e6d5b8;
          --clue-red: #8b0000;
          --clue-dark: #1a1a1a;
        }

        body {
          font-family: 'Courier Prime', monospace;
          background-color: var(--clue-dark);
          background-image: radial-gradient(circle, #2a2a2a 1px, transparent 1px);
          background-size: 30px 30px;
          color: #333;
        }

        .special-elite { font-family: 'Special Elite', cursive; }

        .folder-container {
          background-color: var(--clue-yellow);
          background-image: url('https://www.transparenttextures.com/patterns/paper.png');
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
          border-left: 20px solid #d4c3a3;
        }

        .crime-tape {
          background: repeating-linear-gradient(45deg, #facc15, #facc15 20px, #000 20px, #000 40px);
          text-shadow: 1px 1px 0px #000;
        }

        .case-card {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid #c5b599;
          transition: all 0.2s;
        }

        .case-card:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .active-session-card {
          background: #fffbeb;
          border: 3px double var(--clue-red);
          animation: borderPulse 2s infinite;
        }

        @keyframes borderPulse {
          0% { border-color: var(--clue-red); }
          50% { border-color: #fca5a5; }
          100% { border-color: var(--clue-red); }
        }

        .stamp-red {
          border: 3px solid var(--clue-red);
          color: var(--clue-red);
          padding: 2px 8px;
          text-transform: uppercase;
          font-weight: bold;
          transform: rotate(-5deg);
          display: inline-block;
        }

        .modal-overlay {
          background: rgba(0, 0, 0, 0.85);
          -webkit-backdrop-filter: blur(5px);
          backdrop-filter: blur(5px);
        }

        .input-classic {
          background: #fdf6e3;
          border: 1px solid #ccc;
          border-bottom: 2px solid #666;
        }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #d4c3a3; }
        ::-webkit-scrollbar-thumb { background: #8b0000; }
      `}</style>
    </>
  );
}
