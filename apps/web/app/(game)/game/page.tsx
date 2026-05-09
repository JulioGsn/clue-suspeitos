"use client"
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/services/api';
import Head from "next/head";

export default function Page() {
  const selectedItemsRef = useRef<any[]>([]);
  const currentModalModeRef = useRef<'pergunta' | 'acusacao'>('pergunta');
  // Game state (local simulation / client-side)
  const [playersState, setPlayersState] = useState<any[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [events, setEvents] = useState<Array<{ text: string }>>([]);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const [showRevealOverlay, setShowRevealOverlay] = useState(false);
  const [selectedReveal, setSelectedReveal] = useState<string | null>(null);
  const [revealedInfo, setRevealedInfo] = useState<any>(null);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cardZoom, setCardZoom] = useState<{ nome: string; tipoLabel: string; imageUrl: string | null } | null>(null);
  const [questionResultOverlay, setQuestionResultOverlay] = useState<{
    carta1: string; carta2: string; cartaRevelada: { id: string; nome: string; tipo: string; imageUrl: string } | null; foiRespondida: boolean;
  } | null>(null);
  const [gameEndOverlay, setGameEndOverlay] = useState<{
    isCorreta: boolean; isEliminado: boolean;
    cartasCrime: { suspeito: any; arma: any; local: any } | null;
    vencedorName?: string; // definido para os perdedores quando outro jogador venceu
  } | null>(null);
  const [dossieChecked, setDossieChecked] = useState<Set<string>>(new Set());

  const SUSPECTS = ['Srta. Scarlett', 'Coronel Mustard', 'Rev. Green', 'Sra. Peacock', 'Prof. Plum', 'Sra. White'];
  const WEAPONS = ['Castiçal', 'Faca', 'Revólver', 'Corda', 'Cano', 'Chave Inglesa'];
  const LOCALS = ['Cozinha', 'Biblioteca', 'Hall', 'Sala de Estar', 'Sala de Música', 'Jardim'];
  const ALL_CARDS = [...SUSPECTS, ...WEAPONS, ...LOCALS];

  function shuffle<T>(arr: T[]) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function dealHandsToPlayers(players: any[]) {
    const shuffled = shuffle(ALL_CARDS.slice());
    const hands = players.map(() => [] as string[]);
    let idx = 0;
    while (idx < shuffled.length) {
      for (let i = 0; i < players.length && idx < shuffled.length; i++) {
        hands[i].push(shuffled[idx++]);
      }
    }
    return hands;
  }

  function savePlayersToSession(players: any[]) {
    try { sessionStorage.setItem('partida_players', JSON.stringify(players)); } catch {}
  }

  function getDossiePid(): string | null {
    return meUserRef.current?.currentPartidaId ?? partidaStateRef.current?.id ?? null;
  }

  function toggleDossieCheck(name: string) {
    setDossieChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      try {
        const pid = getDossiePid();
        if (pid) localStorage.setItem(`dossie_${pid}`, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  // Estado do usuário autenticado (se houver) e carregamento da partida real
  const [meUser, setMeUser] = useState<any | null>(null);
  const [partidaState, setPartidaState] = useState<any | null>(null);
  const meUserRef = React.useRef<any | null>(null);
  const [cardsByCategory, setCardsByCategory] = useState<Record<string, any[]>>({ Suspeito: [], Arma: [], Local: [] });

  // Fluxo de pergunta: Player A espera, Player B responde
  const [waitingForAnswer, setWaitingForAnswer] = useState<{
    perguntaId: string; carta1Nome: string; carta2Nome: string; targetName: string;
  } | null>(null);
  const [pendingAnswerRequest, setPendingAnswerRequest] = useState<{
    perguntaId: string; carta1Nome: string; carta2Nome: string; askerName: string;
    cardOptions: string[]; // nomes das cartas que Player B tem na mão
    cardObjects: { nome: string; imageUrl?: string | null; tipo?: string | null; hasIt: boolean }[];
  } | null>(null);
  const [gamePhaseBanner, setGamePhaseBanner] = useState<string>('');
  // Armazena resultado enquanto aguarda ACK do Player B
  const pendingAnswerRef = useRef<{
    perguntaId: string; cartaRevelada: any; foiRespondida: boolean; carta1Nome: string; carta2Nome: string; targetName: string;
  } | null>(null);
  const turnIndexRef = useRef(0);
  const playersStateRef = useRef<any[]>([]);
  const partidaStateRef = useRef<any>(null);
  const cardsByCategoryRef = useRef<Record<string, any[]>>({ Suspeito: [], Arma: [], Local: [] });

  useEffect(() => { meUserRef.current = meUser; }, [meUser]);
  // Restaurar dossier ao carregar a partida (pelo meUser ou pelo partidaState)
  useEffect(() => {
    const pid = meUser?.currentPartidaId ?? partidaState?.id ?? null;
    if (!pid) return;
    try {
      const raw = localStorage.getItem(`dossie_${pid}`);
      if (raw) setDossieChecked(new Set(JSON.parse(raw)));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meUser?.currentPartidaId, partidaState?.id]);
  // Salvar dossier automaticamente sempre que mudar
  useEffect(() => {
    const pid = getDossiePid();
    if (!pid) return;
    try { localStorage.setItem(`dossie_${pid}`, JSON.stringify([...dossieChecked])); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossieChecked]);
  useEffect(() => { turnIndexRef.current = turnIndex; }, [turnIndex]);
  useEffect(() => { playersStateRef.current = playersState; }, [playersState]);
  useEffect(() => { partidaStateRef.current = partidaState; }, [partidaState]);
  useEffect(() => { cardsByCategoryRef.current = cardsByCategory; }, [cardsByCategory]);

  function mapPartidaToPlayers(partida: any, me: any | null) {
    if (!partida || !Array.isArray(partida.jogadores)) return [];
    return partida.jogadores.map((j: any) => ({
      id: j.id,
      usuarioId: j.usuarioId ?? null,
      username: j.username ?? (j.email ? j.email.split('@')[0] : undefined) ?? `Jogador`,
      isBot: j.isBot,
      isEliminado: j.isEliminado,
      ordemTurno: j.ordemTurno,
      cards: j.usuarioId && me && me.id === j.usuarioId && partida.minhaMao ? partida.minhaMao.length : 0,
      isLocal: me && me.id === j.usuarioId,
    }));
  }

  // Reset per-turn state when turn changes
  useEffect(() => {
    setHasAskedQuestion(false);
    setPendingQuestion(null);
    setQuestionResultOverlay(null);
  }, [turnIndex]);

  // Auto-skip eliminated player's turn
  useEffect(() => {
    const me = meUserRef.current;
    if (!me || !partidaState) return;
    const myJogador = (partidaState.jogadores ?? []).find((j: any) => j.usuarioId === me.id);
    if (!myJogador || !myJogador.isEliminado) return;
    const myIdx = playersState.findIndex(p => p.isLocal);
    if (myIdx >= 0 && myIdx === turnIndex) {
      const timer = setTimeout(() => passTurn(), 1500);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, partidaState]);

  // Load players for this partida from API (prefer) or from session as fallback
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await api.me();
        if (!mounted) return;
        setMeUser(me);

        const partidaId = me?.currentPartidaId ?? undefined;
        if (partidaId) {
          try {
                const partida = await api.getPartida(undefined, partidaId);
                if (!mounted) return;
                setPartidaState(partida);
                const players = mapPartidaToPlayers(partida, me);
                setPlayersState(players);
                savePlayersToSession(players);
                const idx = players.findIndex(p => p.ordemTurno === partida.turnoAtual);
                setTurnIndex(idx >= 0 ? idx : 0);

                // fetch theme cards and group by category
                try {
                  const cartas = await api.listCartas(partida.tema.id);
                  const grouped: Record<string, any[]> = { Suspeito: [], Arma: [], Local: [] };
                  for (const c of cartas) {
                    if (c.tipo === 'SUSPEITO') grouped.Suspeito.push(c);
                    if (c.tipo === 'ARMA') grouped.Arma.push(c);
                    if (c.tipo === 'LOCAL') grouped.Local.push(c);
                  }
                  setCardsByCategory(grouped);
                } catch (err) {
                  // ignore card fetch errors
                }

                return;
          } catch (err) {
            // fallthrough to session fallback
            console.debug('Falha ao obter partida via API, usando sessão/fallback', err);
          }
        }
      } catch (err) {
        // ignore
      }

      // sessionStorage fallback
      try {
        const raw = sessionStorage.getItem('partida_players');
        if (raw) {
          let parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seen = new Set();
            parsed = parsed
              .filter((p: any) => p && (p.username || p.name))
              .map((p: any) => ({ ...p, username: p.username || p.name }))
              .filter((p: any) => {
                const key = (p.username || '').toString().trim();
                if (!key) return false;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

            if (parsed.length > 0) {
              const shuffled = shuffle(parsed);
              const hands = dealHandsToPlayers(shuffled);
              const assembled = shuffled.map((p: any, i: number) => ({ ...p, username: p.username, cards: hands[i] ? hands[i].length : 0 }));
              if (!mounted) return;
              setPlayersState(assembled);
              savePlayersToSession(assembled);
              setTurnIndex(0);
              return;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // fallback: create a small simulated partida and distribute cards
      const fallback = [{ username: 'AGENTE JÚLIO' }, { username: 'INSPETOR_GOMES' }];
      const hands = dealHandsToPlayers(fallback);
      const assembled = fallback.map((p, i) => ({ ...p, username: p.username, cards: hands[i] ? hands[i].length : 0 }));
      const shuffled = shuffle(assembled);
      if (!mounted) return;
      setPlayersState(shuffled);
      savePlayersToSession(shuffled);
      setTurnIndex(0);
    })();

    return () => { mounted = false; };
  }, []);

  // Polling de fallback: sincroniza estado a cada 4s para casos onde SSE falha
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const me = meUserRef.current;
        if (!me?.currentPartidaId) return;
        const partida = await api.getPartida(undefined, me.currentPartidaId);
        setPartidaState(partida);
        const players = mapPartidaToPlayers(partida, me);
        setPlayersState(players);
        savePlayersToSession(players);
        const idx = players.findIndex((p: any) => p.ordemTurno === partida.turnoAtual);
        setTurnIndex(idx >= 0 ? idx : 0);
      } catch { /* ignora erros de rede */ }
    }, 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [accusationConfirm, setAccusationConfirm] = useState<{
    suspeito: any; arma: any; local: any;
    suspId: string; armaId: string; localId: string;
    partidaId: string;
  } | null>(null);

  function openAbandonModal() {
    setShowAbandonModal(true);
  }

  function cancelAbandon() {
    setShowAbandonModal(false);
  }

  async function confirmAbandon() {
    setAbandoning(true);
    try {
      const me = await api.me();
      const partidaId = (me && (me.currentPartidaId ?? undefined)) || undefined;
      await api.abandonarPartida(undefined, partidaId);

      try { sessionStorage.removeItem('partida_players'); } catch {}
      setEvents(e => [...e, { text: 'Um agente abandonou a partida.' }]);

      try { router.push('/home'); } catch (e) {}
    } catch (caughtError) {
      if (caughtError instanceof ApiError && (caughtError as any).status === 401) {
        try { router.replace('/login'); } catch (e) {}
        return;
      }

      try { sessionStorage.removeItem('partida_players'); } catch {}
      setEvents(e => [...e, { text: 'Um agente abandonou a partida.' }]);
      alert(caughtError instanceof ApiError ? caughtError.message : 'Nao foi possivel abandonar a partida.');
      try { router.push('/home'); } catch (e) {}
    } finally {
      setAbandoning(false);
      setShowAbandonModal(false);
    }
  }

  // local player simulation: prefer an explicit `isLocal` flag when available
  function localPlayerIndex() {
    const idx = playersState.findIndex(p => Boolean(p && p.isLocal));
    return idx >= 0 ? idx : 0;
  }

  useEffect(() => {
    let timeLeft = 10;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft < 0) timeLeft = 10;
      const el = document.getElementById('refresh-timer');
      if (el) el.innerText = `00:${timeLeft < 10 ? '0'+timeLeft : timeLeft}`;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Inject theme overrides and hover fixes so page matches template visuals
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'game-theme-overrides';
    style.innerHTML = `
      :root { --clue-dark: #1a1a1a; --clue-yellow: #e6d5b8; --clue-red: #8b0000; --paper-bg: #fdf6e3; --accent-red: #8b0000; }
      html, body, #__next, .min-h-screen, .h-screen, main { background-image: radial-gradient(circle,#2a2a2a 1px,transparent 1px) !important; background-size:30px 30px !important; background-color: var(--clue-dark) !important; color: #e6e6e6 !important; }
      .paper-sheet { background-color: var(--paper-bg) !important; background-image: url('https://www.transparenttextures.com/patterns/paper.png') !important; color: #111827 !important; }
      .clue-card { background: white !important; border-color: #333 !important; min-width: 120px; width:120px; display:flex; flex-direction:column; justify-content:space-between; padding:8px; }
      .hand-card { min-width: 120px; width: 120px; }
      .clue-card .font-bold { color: #111827 !important; }
      .clue-card:hover .font-bold, .clue-card.selected .font-bold { color: var(--accent-red) !important; }
      .elimination-checkbox { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border: 2px solid var(--accent-red) !important; background: transparent !important; }
      .elimination-checkbox:checked { background: var(--accent-red) !important; border-color: var(--accent-red) !important; }
      /* Tab styling: active should look like paper with red text */
      .tab-btn { color: #e6e6e6 !important; }
      .tab-btn.active { background-color: var(--paper-bg) !important; color: var(--accent-red) !important; }
      #dossie-list label:hover { color: #111827 !important; background-color: transparent !important; }
      .selectable-item { display:flex; align-items:center; justify-content:center; height:48px; border:1px solid #cfcfcf; background: #fff; cursor: pointer; }
      .selectable-item.marked { opacity: 0.75; text-decoration: line-through; background: #efefef !important; color: #6b6b6b !important; border-style: dashed !important; }
      /* Accusation mode visuals */
      .mode-acusacao .selectable-item { background: #2a2a2a !important; color: #ddd !important; border-color: #444 !important; }
      .mode-acusacao .selectable-item.marked { background: #3a3a3a !important; color: #999 !important; text-decoration: line-through; opacity: 0.7; border-color: #555 !important; }
      .mode-acusacao .selectable-item.selected { background: var(--accent-red) !important; color: white !important; border-color: white !important; box-shadow: 0 0 10px var(--accent-red) !important; }
      .selectable-item.selected { background: var(--accent-red) !important; color: white !important; }
      .crime-tape { background: repeating-linear-gradient(45deg, #facc15, #facc15 20px, #000 20px, #000 40px) !important; }
      [class*="bg-[radial-gradient"], [class*="bg-[linear-gradient"] { background-image: none !important; }
      footer, .h-40 { background-color: #0b0b0c !important; }
      /* Card images: always cover their container */
      .evidence-card img, .hand-card img, .mini-card-image img { width:100% !important; height:100% !important; object-fit: cover !important; display:block !important; }
    `;
    document.head.appendChild(style);
    return () => { const s = document.getElementById('game-theme-overrides'); if (s) s.remove(); };
  }, []);

  // NOTE: dossier is now rendered entirely via JSX (see dossie-list in return).
  // The imperative DOM approach was removed because React reconciliation would wipe
  // the raw DOM elements on every re-render (e.g. turn change), erasing checked state.

  function zoomCard(nome: string, tipoLabel: string, imageUrl?: string | null) {
    setCardZoom({ nome, tipoLabel, imageUrl: imageUrl ?? null });
  }

  function closeZoom() {
    setCardZoom(null);
  }

  function switchTab(tab: string) {
    const btnChat = document.getElementById('btn-tab-chat');
    const btnLog = document.getElementById('btn-tab-log');
    if (btnChat) {
      btnChat.classList.toggle('active', tab === 'chat');
      btnChat.classList.toggle('bg-stone-300', tab !== 'chat');
      btnChat.classList.toggle('text-stone-500', tab !== 'chat');
    }
    if (btnLog) {
      btnLog.classList.toggle('active', tab === 'log');
      btnLog.classList.toggle('bg-stone-300', tab !== 'log');
      btnLog.classList.toggle('text-stone-500', tab !== 'log');
    }
    const contentChat = document.getElementById('content-chat');
    const contentLog = document.getElementById('content-log');
    if (tab === 'chat') {
      if (contentChat) { contentChat.classList.remove('hidden'); contentChat.classList.add('flex'); }
      if (contentLog) { contentLog.classList.add('hidden'); contentLog.classList.remove('flex'); }
    } else {
      if (contentLog) { contentLog.classList.remove('hidden'); contentLog.classList.add('flex'); }
      if (contentChat) { contentChat.classList.add('hidden'); contentChat.classList.remove('flex'); }
    }
  }

  function openActionModal(mode: 'pergunta'|'acusacao') {
    currentModalModeRef.current = mode;
    selectedItemsRef.current = [];
    const container = document.getElementById('modal-container');
    const ribbon = document.getElementById('warning-ribbon');
    const warnBox = document.getElementById('accusation-warning');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');

    if (container) container.classList.remove('mode-acusacao', 'mode-pergunta');
    if (ribbon) ribbon.classList.add('hidden');
    if (warnBox) warnBox.classList.add('hidden');

    if (mode === 'acusacao') {
      if (container) container.classList.add('mode-acusacao');
      if (ribbon) ribbon.classList.remove('hidden');
      if (warnBox) warnBox.classList.remove('hidden');
      if (title) title.innerText = "!! VEREDITO FINAL !!";
      if (desc) desc.innerText = "Escolha o Suspeito, a Arma e o Local do crime. Não há volta.";
    } else {
      if (container) container.classList.add('mode-pergunta');
      if (title) title.innerText = "?? INTERROGATÓRIO ??";
      if (desc) desc.innerText = "Selecione exatamente 2 pistas de categorias diferentes (ex: Suspeito e Local).";
    }

    renderModalContent();
    const overlay = document.getElementById('action-modal-overlay');
    if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
    validateSelection();
  }

  function renderModalContent() {
    const content = document.getElementById('modal-content');
    if (!content) return;
    content.innerHTML = '';
    const dossieSections = document.querySelectorAll('#dossie-list section');

    dossieSections.forEach(section => {
      const category = section.getAttribute('data-category') || '';
      const catContainer = document.createElement('div');
      catContainer.innerHTML = `<h4 class="text-[10px] font-bold bg-stone-200 px-2 py-1 mb-2 uppercase tracking-widest text-stone-800">${category}s</h4>`;

      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-3 gap-3';

      const options = Array.from(section.querySelectorAll('.elimination-checkbox')).map(cb => ({
        id: cb.getAttribute('data-id'),
        name: cb.getAttribute('data-name'),
        marked: (cb as HTMLInputElement).checked,
        category
      }));

      options.sort((a, b) => (a.marked ? 1 : 0) - (b.marked ? 1 : 0));

      options.forEach(opt => {
        const btn = document.createElement('div');
        const isSelected = selectedItemsRef.current.some(i => (i.id && opt.id && i.id === opt.id) || (i.name && opt.name && i.name === opt.name));
        btn.className = `selectable-item ${opt.marked ? 'marked' : ''} ${isSelected ? 'selected' : ''}`;
        btn.setAttribute('data-category', opt.category || '');
        if (opt.id) btn.setAttribute('data-id', opt.id);
        btn.innerText = opt.name || '';
        btn.onclick = () => toggleSelectItem(opt);
        grid.appendChild(btn);
      });

      catContainer.appendChild(grid);
      content.appendChild(catContainer);
    });
  }

  function toggleSelectItem(item: any) {
    const idx = selectedItemsRef.current.findIndex(i => (i.id && item.id && i.id === item.id) || i.name === item.name);
    if (idx > -1) {
      selectedItemsRef.current.splice(idx, 1);
    } else {
      const sameCatIdx = selectedItemsRef.current.findIndex(i => i.category === item.category);
      if (sameCatIdx > -1) selectedItemsRef.current.splice(sameCatIdx, 1);
      const max = currentModalModeRef.current === 'pergunta' ? 2 : 3;
      if (selectedItemsRef.current.length < max) selectedItemsRef.current.push({ id: item.id ?? null, name: item.name ?? null, category: item.category });
    }
    renderModalContent();
    validateSelection();
  }

  function validateSelection() {
    const btn = document.getElementById('confirm-action-btn') as HTMLButtonElement | null;
    let isValid = false;
    if (currentModalModeRef.current === 'pergunta') {
      if (selectedItemsRef.current.length === 2) {
        isValid = selectedItemsRef.current[0].category !== selectedItemsRef.current[1].category;
      }
    } else {
      if (selectedItemsRef.current.length === 3) {
        const cats = new Set(selectedItemsRef.current.map(i => i.category));
        isValid = cats.size === 3;
      }
    }
    if (btn) btn.disabled = !isValid;
  }

  function closeModal() {
    const overlay = document.getElementById('action-modal-overlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
  }

  function nextIndex(i: number) { return (i + 1) % Math.max(1, playersState.length); }

  function passTurn() {
    const current = playersState[turnIndex];
    setEvents(e => [...e, { text: `${current?.username ?? 'Agente'} passou a vez.` }]);
    setPendingQuestion(null);
    setRevealedInfo(null);
    setHasAskedQuestion(false);
    setQuestionResultOverlay(null);

    // If we have a real partida, call API to advance the turno; otherwise fallback to local rotation
    (async () => {
            try {
            if (meUserRef.current && meUserRef.current.currentPartidaId) {
              const pid = meUserRef.current.currentPartidaId;
              // call server endpoint to pass the turn
              try {
                const updated = await api.passarVez(undefined, pid);
                if (updated) {
                  const players = mapPartidaToPlayers(updated, meUserRef.current);
                  setPlayersState(players);
                  savePlayersToSession(players);
                  const idx = players.findIndex((p: any) => p.ordemTurno === updated.turnoAtual);
                  setTurnIndex(idx >= 0 ? idx : 0);
                  // Notifica todos os jogadores (inclusive eliminados) que o turno mudou
                  try { await api.sendChatMessage(undefined, pid, `__VEZ__:${meUserRef.current?.username ?? ''}`); } catch {}
                  return;
                }
              } catch (err) {
                // fallback to local rotation if API fails
              }
            }
      } catch (err) {
        // ignore
      }

      setTurnIndex(t => nextIndex(t));
    })();
  }

  function handleSendInfo() {
    if (!pendingQuestion) return;
    const target = playersState[pendingQuestion.targetIndex];
    const asker = playersState[pendingQuestion.askerIndex];
    const selected = selectedReveal;
    if (selected) {
      setEvents(e => [...e, { text: `${target.username} respondeu com a carta: ${selected}` }]);
    } else {
      setEvents(e => [...e, { text: `${target.username} informou que não possuía as cartas solicitadas.` }]);
    }
    setRevealedInfo({ card: selected, fromIndex: pendingQuestion.targetIndex, toIndex: pendingQuestion.askerIndex });
    setPendingQuestion(null);
    setSelectedReveal(null);
    setShowRevealOverlay(false);
  }

  function addDossierEntry(asker: string, target: string, carta1: string, carta2: string, cartaRevelada: { nome: string } | null) {
    const container = document.getElementById('content-log');
    if (!container) return;
    const entry = document.createElement('div');
    entry.className = 'border-l-2 border-stone-400 pl-2 mb-3';
    entry.innerHTML = `
      <p class="text-stone-500 font-bold uppercase text-[8px] mb-1">${asker} &gt; ${target}</p>
      <div class="flex flex-col gap-1">
        <span class="bg-stone-200 px-1 py-0.5 rounded text-stone-700 italic">${carta1}</span>
        <span class="bg-stone-200 px-1 py-0.5 rounded text-stone-700 italic">${carta2}</span>
      </div>
      <p class="${cartaRevelada ? 'text-green-800' : 'text-red-800'} font-bold uppercase mt-1">${cartaRevelada ? 'Carta revelada.' : 'Nenhuma carta revelada.'}</p>
    `;
    container.insertBefore(entry, container.firstChild);
  }

  async function confirmAction() {
    const me = meUserRef.current;
    const partidaId = me?.currentPartidaId;

    if (currentModalModeRef.current === 'pergunta') {
      if (selectedItemsRef.current.length !== 2) return;
      const [item1, item2] = selectedItemsRef.current;

      // Try to resolve IDs from cardsByCategory if not present (static fallback)
      function resolveId(item: any) {
        if (item.id) return item.id;
        const cat = item.category as string;
        const catKey = cat === 'Suspeito' ? 'Suspeito' : cat === 'Arma' ? 'Arma' : 'Local';
        const found = ((cardsByCategory as any)[catKey] ?? []).find((c: any) => c.nome === item.name);
        return found?.id ?? null;
      }

      const id1 = resolveId(item1);
      const id2 = resolveId(item2);

      if (!id1 || !id2 || !partidaId) {
        addChatMsg('SISTEMA', 'Cartas sem ID — verifique se o tema foi carregado.', 'text-red-800 font-bold');
        closeModal();
        return;
      }

      closeModal();
      setActionLoading(true);
      try {
        const result = await api.criarPergunta(undefined, partidaId, { carta1Id: id1, carta2Id: id2 });

        const askerName = playersStateRef.current[turnIndexRef.current]?.username ?? 'Agente';
        const targetName = playersStateRef.current[nextIndex(turnIndexRef.current)]?.username ?? 'Próximo Agente';

        // Guarda resultado – NÃO exibe ainda, aguarda ACK do Player B
        pendingAnswerRef.current = {
          perguntaId: result.perguntaId,
          cartaRevelada: result.cartaRevelada,
          foiRespondida: result.foiRespondida,
          carta1Nome: item1.name ?? '',
          carta2Nome: item2.name ?? '',
          targetName,
        };

        setPendingQuestion({ askerIndex: turnIndexRef.current, targetIndex: nextIndex(turnIndexRef.current), cards: [item1.name, item2.name] });
        setHasAskedQuestion(true);
        setWaitingForAnswer({ perguntaId: result.perguntaId, carta1Nome: item1.name ?? '', carta2Nome: item2.name ?? '', targetName });

        // Sinal para Player B via chat (filtrado no display) — inclui username do alvo para detecção confiável
        try {
          await api.sendChatMessage(undefined, partidaId, `__PERGUNTA__:${result.perguntaId}:${item1.name}:${item2.name}:${targetName}`);
        } catch {}

        if (result.partida) {
          setPartidaState(result.partida);
          const players = mapPartidaToPlayers(result.partida, me);
          setPlayersState(players);
        }

      } catch (err) {
        addChatMsg('SISTEMA', err instanceof ApiError ? (err as ApiError).message : 'Erro ao fazer pergunta.', 'text-red-800 font-bold');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Acusação
    const suspeito = selectedItemsRef.current.find(i => i.category === 'Suspeito');
    const arma     = selectedItemsRef.current.find(i => i.category === 'Arma');
    const local    = selectedItemsRef.current.find(i => i.category === 'Local');
    if (!suspeito || !arma || !local) return;

    function resolveAccId(item: any, catKey: string) {
      if (item.id) return item.id;
      const found = ((cardsByCategory as any)[catKey] ?? []).find((c: any) => c.nome === item.name);
      return found?.id ?? null;
    }

    const suspId  = resolveAccId(suspeito, 'Suspeito');
    const armaId  = resolveAccId(arma, 'Arma');
    const localId = resolveAccId(local, 'Local');

    if (!suspId || !armaId || !localId || !partidaId) {
      addChatMsg('SISTEMA', 'Cartas sem ID — verifique se o tema foi carregado.', 'text-red-800 font-bold');
      return;
    }

    closeModal();
    setAccusationConfirm({ suspeito, arma, local, suspId, armaId, localId, partidaId });
  }

  async function executeAccusation() {
    if (!accusationConfirm) return;
    const { suspeito, arma, local, suspId, armaId, localId, partidaId } = accusationConfirm;
    const me = meUserRef.current;
    setAccusationConfirm(null);
    setActionLoading(true);
    try {
      const result = await api.criarAcusacao(undefined, partidaId, { suspeitoId: suspId, armaId: armaId, localId: localId });

      setGameEndOverlay({ isCorreta: result.isCorreta, isEliminado: result.isEliminado, cartasCrime: result.cartasCrime });

      if (result.partida) {
        setPartidaState(result.partida);
        const players = mapPartidaToPlayers(result.partida, me);
        setPlayersState(players);
        const idx = players.findIndex(p => p.ordemTurno === result.partida.turnoAtual);
        setTurnIndex(idx >= 0 ? idx : 0);
      }

      if (result.isEliminado) {
        addChatMsg('SISTEMA', `ACUSAÇÃO INCORRETA! ${me?.username ?? 'Agente'} foi eliminado.`, 'text-red-800 font-bold uppercase border-y border-red-800 my-1 py-1');
        setPendingQuestion(null);
        setHasAskedQuestion(false);
        // O backend já envia __ACUSACAO__: via SSE para todos os clientes.
        // Não precisa chamar passarVez nem sendChatMessage aqui.
      }

    } catch (err) {
      addChatMsg('SISTEMA', err instanceof ApiError ? (err as ApiError).message : 'Erro ao fazer acusação.', 'text-red-800 font-bold');
    } finally {
      setActionLoading(false);
    }
  }

  function sendChat() {
    const input = document.getElementById('chat-input') as HTMLInputElement | null;
    if (!input || !input.value.trim()) return;
    const text = input.value;
    addChatMsg("VOCÊ", text);
    input.value = '';
    (async () => {
      try {
        const me = await api.me();
        const pid = me?.currentPartidaId;
        // persist optimistic message
        try {
          if (pid) {
            const raw = sessionStorage.getItem(`partida_chat_${pid}`);
            const arr = raw ? JSON.parse(raw) : [];
            arr.push({ author: 'VOCÊ', text });
            sessionStorage.setItem(`partida_chat_${pid}`, JSON.stringify(arr));
          }
        } catch (e) {}

        await api.sendChatMessage(undefined, pid ?? undefined, text);
      } catch (e) {
        addChatMsg('Sistema', 'Falha ao enviar mensagem.');
      }
    })();
  }

  function addChatMsg(user: string, text: string, customClass = '') {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `chat-msg ${customClass}`.trim();
    msg.innerHTML = `<strong>${user}:</strong> ${text}`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  // Load persisted chat from lobby and subscribe to SSE stream so Rádio is continuous
  useEffect(() => {
    let es: EventSource | null = null;
    (async () => {
      try {
        const me = await api.me();
        const partidaId = me?.currentPartidaId;
        if (partidaId) {
          try {
            const raw = sessionStorage.getItem(`partida_chat_${partidaId}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach((m: any) => addChatMsg(m.author ?? '?', m.text ?? ''));
                // scroll to bottom after injecting history
                setTimeout(() => { try { const c = document.getElementById('chat-messages'); if (c) c.scrollTop = c.scrollHeight; } catch (e) {} }, 50);
              } else {
                addChatMsg('SISTEMA', 'Investigação iniciada.');
              }
            } else {
              addChatMsg('SISTEMA', 'Investigação iniciada.');
            }
          } catch (e) {
            addChatMsg('SISTEMA', 'Investigação iniciada.');
          }

          const base = (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001');
          try {
            es = new EventSource(`${base}/partidas/${partidaId}/chat/stream`, { withCredentials: true } as any);
          } catch (e) {
            es = null;
          }

          if (es) {
            es.onmessage = async (ev) => {
              try {
                const payload = JSON.parse(ev.data);
                const text: string = payload.text ?? '';

                // --- Sinal de pergunta: destinado ao Player B ---
                if (text.startsWith('__PERGUNTA__:')) {
                  const parts = text.split(':');
                  const perguntaId = parts[1] ?? '';
                  const carta1Nome = parts[2] ?? '';
                  const carta2Nome = parts[3] ?? '';
                  const targetUsername = parts[4] ?? '';
                  const askerName = payload.author ?? '?';
                  // Comparação por username — muito mais confiável que cálculo de índice
                  const myUsername = meUserRef.current?.username ?? '';
                  if (myUsername && myUsername === targetUsername) {
                    // Eu sou Player B: verificar quais cartas tenho
                    const minhaMao: any[] = partidaStateRef.current?.minhaMao ?? [];
                    const cardOptions = [carta1Nome, carta2Nome].filter(cn =>
                      minhaMao.some((c: any) => (c.nome ?? c.name ?? '') === cn)
                    );
                    // Se não tenho nenhuma das cartas, auto-passar sem mostrar overlay
                    if (cardOptions.length === 0) {
                      try {
                        const pid = meUserRef.current?.currentPartidaId;
                        if (pid) await api.sendChatMessage(undefined, pid, `__ACK__:${perguntaId}:`);
                      } catch {}
                      setGamePhaseBanner(`${askerName} perguntou — você não tem nenhuma dessas cartas.`);
                      return;
                    }
                    // Montar objetos completos das cartas (com imagem)
                    const allCardsFlat = Object.values(cardsByCategoryRef.current).flat() as any[];
                    const cardObjects = [carta1Nome, carta2Nome].map(cn => {
                      const fromMao = minhaMao.find((c: any) => (c.nome ?? c.name ?? '') === cn);
                      const fromAll = allCardsFlat.find((c: any) => (c.nome ?? c.name ?? '') === cn);
                      const card = fromMao ?? fromAll;
                      return {
                        nome: cn,
                        imageUrl: card?.imageUrl ?? card?.image ?? null,
                        tipo: card?.tipo ?? null,
                        hasIt: cardOptions.includes(cn),
                      };
                    });
                    // Auto-selecionar se só tem 1 carta
                    setSelectedReveal(cardOptions.length === 1 ? cardOptions[0] : null);
                    setPendingAnswerRequest({ perguntaId, carta1Nome, carta2Nome, askerName, cardOptions, cardObjects });
                    setGamePhaseBanner(`${askerName} perguntou para você: ${carta1Nome} ou ${carta2Nome}`);
                  } else {
                    // Sou outro jogador: atualizar banner informativo
                    setGamePhaseBanner(`${askerName} perguntou para ${targetUsername || 'próximo agente'}: ${carta1Nome} ou ${carta2Nome}`);
                  }
                  return;
                }

                // --- Sinal de ACK: Player B respondeu, exibir resultado para Player A ---
                if (text.startsWith('__ACK__:')) {
                  const parts = text.split(':');
                  const ackId = parts[1] ?? '';
                  const chosenCardName = parts[2] ?? '';
                  if (pendingAnswerRef.current && pendingAnswerRef.current.perguntaId === ackId) {
                    const { foiRespondida, carta1Nome, carta2Nome, targetName } = pendingAnswerRef.current;
                    // Usar carta escolhida por Player B; fallback para resultado do backend
                    let cartaRevelada: any = pendingAnswerRef.current.cartaRevelada;
                    if (chosenCardName) {
                      const allCardsFlat = Object.values(cardsByCategoryRef.current).flat() as any[];
                      const found = allCardsFlat.find((c: any) => (c.nome ?? c.name ?? '') === chosenCardName);
                      cartaRevelada = found
                        ? { id: found.id ?? '', nome: found.nome ?? found.name ?? chosenCardName, tipo: found.tipo ?? '', imageUrl: found.imageUrl ?? null }
                        : { id: '', nome: chosenCardName, tipo: '', imageUrl: null };
                    }
                    setQuestionResultOverlay({ carta1: carta1Nome, carta2: carta2Nome, cartaRevelada: cartaRevelada ?? null, foiRespondida });
                    setWaitingForAnswer(null);
                    addDossierEntry(
                      playersStateRef.current[turnIndexRef.current]?.username ?? 'Agente',
                      targetName,
                      carta1Nome, carta2Nome,
                      cartaRevelada
                    );
                    pendingAnswerRef.current = null;
                  }
                  const responderName = payload.author ?? '?';
                  setGamePhaseBanner(`${responderName} respondeu.`);
                  return;
                }

                // --- Sinal de acusação (servidor → todos os clientes) ---
                if (text.startsWith('__ACUSACAO__:')) {
                  const parts = text.split(':');
                  const acusadorName = parts[1] ?? '?';
                  const resultado = parts[2] ?? '';
                  if (resultado === 'CORRETA') {
                    addChatMsg('SISTEMA', `${acusadorName} solucionou o caso! Jogo encerrado.`, 'text-green-800 font-bold');
                  } else {
                    addChatMsg('SISTEMA', `${acusadorName} fez uma acusação errada e foi eliminado.`, 'text-red-700 font-bold');
                  }
                  // Sem return: cai no getPartida abaixo para atualizar o estado
                }

                // --- Sinal de turno forçado após eliminação (legado) ---
                if (text.startsWith('__TURNO__:')) {
                  const eliminadoName = text.split(':')[1] ?? '?';
                  addChatMsg('SISTEMA', `${eliminadoName} fez uma acusação errada e foi eliminado.`, 'text-red-700 font-bold italic');
                  // Não retorna: deixa o bloco abaixo fazer getPartida para atualizar o turno
                }

                // Não adiciona mensagens de controle ao chat normal
                if (!text.startsWith('__TURNO__:') && !text.startsWith('__VEZ__:') && !text.startsWith('__ACUSACAO__:')) {
                  addChatMsg(payload.author ?? '??', text);
                  try {
                    const rawNow = sessionStorage.getItem(`partida_chat_${partidaId}`);
                    const arr = rawNow ? JSON.parse(rawNow) : [];
                    arr.push({ author: payload.author, text });
                    sessionStorage.setItem(`partida_chat_${partidaId}`, JSON.stringify(arr));
                  } catch (e) {}
                }

                // Atualizar estado da partida
                try {
                  const partida = await api.getPartida(undefined, partidaId);
                  setPartidaState(partida);
                  const players = mapPartidaToPlayers(partida, meUserRef.current);
                  setPlayersState(players);
                  savePlayersToSession(players);
                  const idx = players.findIndex(p => p.ordemTurno === partida.turnoAtual);
                  setTurnIndex(idx >= 0 ? idx : 0);
                  try {
                    const hasAny = ['Suspeito','Arma','Local'].some(cat => ((cardsByCategory as any)[cat] ?? []).length > 0);
                    if (!hasAny && partida?.tema?.id) {
                      const cartas = await api.listCartas(partida.tema.id);
                      const grouped: Record<string, any[]> = { Suspeito: [], Arma: [], Local: [] };
                      for (const c of cartas) {
                        if (c.tipo === 'SUSPEITO') grouped.Suspeito.push(c);
                        if (c.tipo === 'ARMA') grouped.Arma.push(c);
                        if (c.tipo === 'LOCAL') grouped.Local.push(c);
                      }
                      setCardsByCategory(grouped);
                    }
                  } catch (err) { void err; }
                } catch (e) {}
              } catch (err) {}
            };
            es.onerror = () => {};
          }
        } else {
          addChatMsg('SISTEMA', 'Investigação iniciada.');
        }
      } catch (e) {
        addChatMsg('SISTEMA', 'Investigação iniciada.');
      }
    })();

    return () => { try { es?.close(); } catch {} };
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Clue Suspeitos - Operação Final</title>
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Special+Elite&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --clue-dark: #1a1a1a; --clue-yellow: #e6d5b8; --clue-red: #8b0000; --paper-bg: #fdf6e3; --accent-red: #8b0000; }
          body { font-family: 'Courier Prime', monospace; background-color: var(--clue-dark); background-image: radial-gradient(circle,#2a2a2a 1px,transparent 1px); -webkit-background-size:30px 30px; -moz-background-size:30px 30px; -o-background-size:30px 30px; background-size:30px 30px; color: #e6e6e6; }
          .special-elite { font-family: 'Special Elite', cursive; }
          .paper-sheet { background-color: var(--paper-bg); background-image: url('https://www.transparenttextures.com/patterns/paper.png'); background-repeat: repeat; box-shadow: 5px 5px 15px rgba(0,0,0,0.5); border: 1px solid #dcd3bc; color: #111827; }
          .crime-tape { background: repeating-linear-gradient(45deg, #facc15, #facc15 20px, #000 20px, #000 40px); }
          .clue-card { width: 120px; aspect-ratio: 2/3; height: auto; max-height: 180px; background: white; border: 2px solid #333; box-shadow: 3px 3px 8px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.2s; display:flex; flex-direction:column; justify-content:flex-start; padding:8px; box-sizing: border-box; }
          .clue-card:hover { transform: translateY(-10px); }
          .clue-card .font-bold { color: #111827; }
          .clue-card:hover .font-bold, .clue-card.selected .font-bold { color: var(--accent-red); }
          /* Image container inside game cards (keeps game's proportion but mirrors /temas layout) */
          .clue-card .card-image { width: 100%; flex: 1 1 auto; min-height: 0; overflow: hidden; display:block; margin-bottom: 6px; }
          .clue-card .card-image img { width: 100%; height: 100%; object-fit: cover; display:block; }
          /* Mini variant used in Evidências Públicas */
          .mini-clue-card { width: 72px; aspect-ratio: 2/3; display:flex; flex-direction:column; justify-content:flex-start; padding:6px; box-sizing:border-box; }
          .mini-clue-card .mini-card-image { width:100%; flex: 1 1 auto; min-height: 0; overflow:hidden; margin-bottom:6px; border:1px solid #e6e6e6; }
          .mini-clue-card .mini-card-image img { width:100%; height:100%; object-fit:cover; display:block; }
          .mini-clue-card .card-name { font-size:10px; line-height:1rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          /* Hand (private) small variant used in footer */
          .hand-card { width: 92px; aspect-ratio: 2/3; display:flex; flex-direction:column; justify-content:flex-start; padding:6px; box-sizing:border-box; background:white; border:2px solid #333; box-shadow: 2px 2px 6px rgba(0,0,0,0.2); }
          .hand-card .card-image { width:100%; flex:1 1 auto; min-height:0; overflow:hidden; margin-bottom:6px; }
          .hand-card .card-image img { width:100%; height:100%; object-fit:cover; display:block; }
          .hand-card .card-name { font-size:11px; line-height:1rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .is-eliminated { filter: grayscale(0.8) contrast(0.8); }
          .stamp-defeated { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); border: 12px double var(--accent-red); color: var(--accent-red); padding: 20px 50px; font-size: 5rem; z-index: 500; background: rgba(253, 246, 227, 0.95); pointer-events: none; display: none; text-align: center; box-shadow: 0 0 100px rgba(0,0,0,0.5); }
          .is-eliminated .stamp-defeated { display: block; }
          .is-eliminated #action-buttons { opacity: 0.3; pointer-events: none; }
          .chat-msg { border-bottom: 1px solid rgba(0,0,0,0.05); padding: 4px 0; font-size: 11px; color: #111; }
          /* Rádio/chat sizing and scroll behavior */
          #content-chat { display:flex; flex-direction:column; height:100%; }
          #chat-messages { flex: 1 1 auto; overflow-y: auto; padding: 1rem; max-height: 120px; }
          .chat-msg { color: #111; }
          .elimination-checkbox { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border: 2px solid var(--accent-red); cursor: pointer; position: relative; display: inline-block; vertical-align: middle; background: transparent; }
          .elimination-checkbox:checked { background: var(--accent-red); border-color: var(--accent-red); }
          .elimination-checkbox:checked::after { content: 'X'; color: #ffffff; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -55%); font-size: 12px; font-family: 'Special Elite'; }
          .tab-btn.active { background-color: var(--paper-bg); border-bottom-color: transparent; color: var(--accent-red); z-index: 10; }
          .mode-acusacao { border: 8px solid var(--accent-red) !important; background-color: #1a1a1a !important; color: white !important; }
          .mode-acusacao h2 { color: #ff0000 !important; border-bottom-color: #ff0000 !important; }
          .mode-acusacao .selectable-item { background: #2a2a2a; border-color: #444; color: #ccc; }
          .mode-acusacao .selectable-item.selected { background: #ff0000; color: white; border-color: white; box-shadow: 0 0 10px #ff0000; }
          .mode-acusacao h4 { background: #333 !important; color: #ff0000 !important; }
          .mode-pergunta .selectable-item.selected[data-category="Suspeito"] { background: #ca8a04 !important; }
          .mode-pergunta .selectable-item.selected[data-category="Arma"] { background: #57534e !important; }
          .mode-pergunta .selectable-item.selected[data-category="Local"] { background: #166534 !important; }
          .selectable-item { cursor: pointer; border: 1px solid #ccc; padding: 8px 4px; font-size: 10px; background: white; transition: all 0.1s; text-align: center; font-weight: bold; }
          .selectable-item.selected { background: var(--accent-red); color: white; border-color: #000; transform: scale(1.05); }
          .selectable-item.marked { opacity: 0.3; text-decoration: line-through; background: #eee; }
          .btn-abort { transition: all 0.2s; }
          .mode-acusacao .btn-abort { color: #f3f4f6 !important; background: transparent; border: 1px solid #6b7280; }
          .mode-acusacao .btn-abort:hover { background-color: #374151 !important; color: #ffffff !important; border-color: #9ca3af; }
          .mode-acusacao #confirm-action-btn { background-color: #991b1b !important; color: #ffffff !important; border: 1px solid #ef4444; box-shadow: 0 0 15px rgba(220, 38, 38, 0.3); }
          .mode-acusacao #confirm-action-btn:not(:disabled):hover { background-color: #dc2626 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #dcd3bc; }
          ::-webkit-scrollbar-thumb { background: var(--accent-red); }
          /* Layout fixes to avoid footer overlap and allow inner scrolling */
          .game-main { padding-bottom: 13rem !important; box-sizing: border-box; }
          .game-main .paper-sheet, .game-main .flex-1 { min-height: 0 !important; }
          #chat-messages { max-height: 120px !important; }
        ` }} />
      </Head>

      <div className="h-screen flex flex-col overflow-hidden">
          <div className="h-10 shrink-0 crime-tape flex items-center justify-between px-6 z-50 shadow-xl">
          <span className="text-white font-bold text-[10px] uppercase tracking-widest">ARQUIVO ATIVO: #CASO-732X | STATUS: INVESTIGAÇÃO CRÍTICA</span>
          <div className="flex items-center gap-3">
            <div id="refresh-timer" className="bg-black text-yellow-500 px-3 py-0.5 rounded font-bold text-xs tabular-nums">00:10</div>
            <button onClick={() => openAbandonModal()} className="bg-red-800 text-white px-3 py-1 rounded font-bold text-[11px] hover:bg-red-900">ABANDONAR PARTIDA</button>
          </div>
        </div>

        <main className="game-main flex-1 min-h-0 overflow-hidden p-4 grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col paper-sheet p-4 flex-1 min-h-0">
            <h2 className="special-elite text-xl border-b-2 border-stone-800 mb-4 uppercase shrink-0">Dossiê de Eliminação</h2>
            <div id="dossie-list" className="flex-1 overflow-y-auto space-y-4 pr-2">
              {(() => {
                const hasThemeCards = ['Suspeito','Arma','Local'].some(cat => (cardsByCategory[cat] ?? []).length > 0);
                if (hasThemeCards) {
                  return (['Suspeito','Arma','Local'] as const).map(cat => (
                    <section key={cat} data-category={cat}>
                      <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">
                        {cat === 'Suspeito' ? 'Suspeitos' : cat === 'Arma' ? 'Armas' : 'Locais'}
                      </h3>
                      <div className="flex flex-col gap-1">
                        {(cardsByCategory[cat] ?? []).map((c: any) => (
                          <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1">
                            <input
                              type="checkbox"
                              className="elimination-checkbox"
                              data-id={c.id}
                              data-name={c.nome}
                              checked={dossieChecked.has(c.nome)}
                              onChange={() => toggleDossieCheck(c.nome)}
                            />
                            {c.nome}
                          </label>
                        ))}
                      </div>
                    </section>
                  ));
                }
                // Fallback estático quando cartas do tema ainda não foram carregadas
                return (
                  <>
                    <section data-category="Suspeito">
                      <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">Suspeitos</h3>
                      <div className="flex flex-col gap-1">
                        {['Srta. Scarlett','Coronel Mustard','Rev. Green','Sra. Peacock','Prof. Plum','Sra. White'].map(n => (
                          <label key={n} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1">
                            <input type="checkbox" className="elimination-checkbox" data-name={n} checked={dossieChecked.has(n)} onChange={() => toggleDossieCheck(n)} />
                            {n === 'Rev. Green' ? 'Reverendo Green' : n}
                          </label>
                        ))}
                      </div>
                    </section>
                    <section data-category="Arma">
                      <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">Armas</h3>
                      <div className="flex flex-col gap-1">
                        {['Castiçal','Faca','Revólver','Corda','Cano','Chave Inglesa'].map(n => (
                          <label key={n} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1">
                            <input type="checkbox" className="elimination-checkbox" data-name={n} checked={dossieChecked.has(n)} onChange={() => toggleDossieCheck(n)} />
                            {n}
                          </label>
                        ))}
                      </div>
                    </section>
                    <section data-category="Local">
                      <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">Locais</h3>
                      <div className="flex flex-col gap-1">
                        {['Cozinha','Biblioteca','Hall','Sala de Estar','Sala de Música','Jardim'].map(n => (
                          <label key={n} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1">
                            <input type="checkbox" className="elimination-checkbox" data-name={n} checked={dossieChecked.has(n)} onChange={() => toggleDossieCheck(n)} />
                            {n}
                          </label>
                        ))}
                      </div>
                    </section>
                  </>
                );
              })()}
            </div>

          </div>

          <div className="col-span-6 flex flex-col gap-4 flex-1 min-h-0">
            <div className="paper-sheet p-4 shrink-0 flex justify-around items-center">
              <div className="text-center">
                {(() => {
                  const reveladas = (partidaState && partidaState.cartasReveladas) || [];
                  if (!Array.isArray(reveladas) || reveladas.length === 0) return null;
                  return (
                    <>
                      <span className="text-[8px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">Evidências Públicas</span>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {reveladas.map((c: any) => {
                          const img = (c.imageUrl || c.image || c.imagem) || null;
                          const nome = (c.nome || c.name || '').toString();
                          const tipo = (c.tipo || '').toString().toUpperCase();
                          const tipoLabel = tipo === 'SUSPEITO' || tipo === 'SUS' ? 'Suspeito' : tipo === 'ARMA' ? 'Arma' : 'Local';
                          const typeTextClass = tipo === 'SUSPEITO' ? 'text-blue-600' : tipo === 'ARMA' ? 'text-green-600' : tipo === 'LOCAL' ? 'text-purple-600' : 'text-stone-500';
                          return (
                            <div key={c.id} onClick={() => zoomCard(nome, tipoLabel, img)} className="evidence-card border-2 p-2 bg-white cursor-pointer shadow-sm hover:scale-105 transition-transform" style={{ width: 120 }}>
                              <div className="w-full h-[110px] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
                                {img ? <img src={img} className="w-full h-full object-cover" alt={nome} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">{nome.toUpperCase()}</div>}
                              </div>
                              <div className="flex flex-col px-1">
                                <span className="font-bold card-name text-black text-[10px] sm:text-[11px] leading-tight text-center uppercase" style={{ minHeight: '2.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nome}</span>
                                <span className={"text-[8px] uppercase font-bold text-center mt-1 tracking-widest " + typeTextClass}>{tipoLabel}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="w-32 h-20 bg-[#dcc4a3] border-b-4 border-r-4 border-stone-600 shadow-lg flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform" onClick={() => openActionModal('acusacao')}>
                <span className="special-elite text-red-900 font-bold text-lg -rotate-6 uppercase">Confidencial</span>
                <span className="bg-red-800 text-white text-[8px] px-1 font-bold absolute top-1 right-1">LACRADO</span>
              </div>
            </div>

            <div className="flex-1 paper-sheet p-6 flex flex-col items-center justify-center text-center relative border-dashed border-4 border-stone-300 m-1">
              <div id="action-buttons" className="space-y-6">
                {(() => {
                  const myIndex = playersState.findIndex(p => p && p.isLocal);
                  const isMyTurn = myIndex >= 0 && myIndex === turnIndex;

                  if (isMyTurn) {
                    return (
                      <>
                        <h2 className="special-elite text-4xl text-stone-800 uppercase tracking-tighter">Sua Vez, Agente</h2>
                        <p className="text-stone-500 italic text-sm mb-6">Analise as evidências e tome uma decisão.</p>
                        {!hasAskedQuestion && (
                          <button onClick={() => openActionModal('pergunta')} disabled={actionLoading} className="w-full bg-stone-900 text-white py-5 px-6 special-elite text-xl hover:bg-stone-700 transition-all shadow-lg active:scale-95 mb-4 disabled:opacity-40">🔍 FAZER PERGUNTA</button>
                        )}
                        {hasAskedQuestion && (
                          <p className="text-stone-500 italic text-xs">Pergunta já feita neste turno.</p>
                        )}
                        <button onClick={() => openActionModal('acusacao')} disabled={actionLoading} className="w-full bg-red-800 text-white py-5 px-6 special-elite text-xl hover:bg-red-900 transition-all shadow-lg active:scale-95 disabled:opacity-40">⚠ ACUSAÇÃO</button>
                        <button onClick={() => passTurn()} disabled={actionLoading || !hasAskedQuestion} title={!hasAskedQuestion ? 'Faça uma pergunta antes de passar a vez' : ''} className="w-full mt-6 bg-stone-200 text-stone-900 py-4 font-bold uppercase rounded shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">&gt;&gt; PASSAR VEZ &gt;&gt;</button>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <h2 className="special-elite text-4xl text-stone-800 uppercase tracking-tighter opacity-40">Aguardando...</h2>
                        <p className="text-stone-500 italic text-sm">Não é sua vez.</p>
                        {gamePhaseBanner && <p className="text-stone-600 text-xs mt-2 italic">{gamePhaseBanner}</p>}
                      </>
                    );
                  }
                })()}
              </div>
            </div>
          </div>

          <div className="col-span-3 flex flex-col gap-4 flex-1 min-h-0">
            <div className="paper-sheet p-4 shrink-0 h-48 flex flex-col">
              <h3 className="text-[10px] font-bold text-stone-500 uppercase border-b mb-2 shrink-0">Equipe em Campo</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {playersState && playersState.length > 0 ? (
                  playersState
                    .filter(p => p && (p.usuarioId || p.id || p.username))
                    .map((p, vIdx) => {
                      const globalIdx = playersState.findIndex(pp => pp && ((pp.id && p.id && pp.id === p.id) || (pp.usuarioId && p.usuarioId && pp.usuarioId === p.usuarioId) || (pp.username && p.username && pp.username === p.username)));
                      const name = (p && (p.username || p.name)) || `Jogador ${vIdx+1}`;
                      const isLocal = Boolean(p && p.isLocal);
                      const isTurn = globalIdx === turnIndex;
                      const isEliminado = Boolean(p && (p.isEliminado || p.is_eliminado));
                      return (
                        <div key={p?.id ?? vIdx} className={`flex justify-between items-center p-1 border-l-4 shadow-sm ${isLocal ? 'bg-yellow-50 border-yellow-400' : 'bg-stone-50 border-stone-300'} ${isEliminado ? 'opacity-50' : ''}`}>
                          <span className={`text-[10px] ${isLocal ? 'font-extrabold text-yellow-800 underline' : 'font-bold'} ${isEliminado ? 'line-through' : ''}`}>{name}</span>
                          {isTurn ? (
                            <span className="bg-yellow-500 text-white px-1 font-bold uppercase text-[8px]">Vez</span>
                          ) : isEliminado ? (
                            <span className="bg-red-800 text-white px-1 font-bold uppercase text-[8px]">Eliminado</span>
                          ) : (
                            <span className="text-[8px] font-bold uppercase text-stone-500">&nbsp;</span>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="text-[10px] text-stone-500 italic">Nenhum jogador na partida.</div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex gap-1 px-2 shrink-0">
                <button onClick={() => switchTab('chat')} id="btn-tab-chat" className="tab-btn active px-4 py-1 text-[10px] font-bold uppercase border-t border-l border-r border-stone-400 paper-sheet rounded-t-md">Rádio</button>
                <button onClick={() => switchTab('log')} id="btn-tab-log" className="tab-btn px-4 py-1 text-[10px] font-bold uppercase border-t border-l border-r border-stone-400 bg-stone-300 text-stone-500 rounded-t-md">Dossiê</button>
              </div>
              <div className="paper-sheet flex-1 flex flex-col overflow-hidden border-t-0 -mt-px relative z-0">
                <div id="content-chat" className="flex-1 flex flex-col h-full">
                  <div id="chat-messages" className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 text-[11px]"></div>
                  <div className="shrink-0 p-2 border-t border-stone-200 bg-stone-50 flex gap-1">
                    <input type="text" id="chat-input" placeholder="Transmitir..." className="flex-1 border border-stone-300 px-2 py-1 text-[11px] outline-none" onKeyDown={(e) => { if ((e as any).key === 'Enter') sendChat(); }} />
                    <button onClick={() => sendChat()} className="bg-stone-800 text-white px-3 py-1 text-[10px] font-bold">OK</button>
                  </div>
                </div>
                <div id="content-log" className="hidden flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-[10px]">
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="h-40 shrink-0 bg-stone-900/95 flex items-center justify-center gap-6 relative shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="absolute -top-6 bg-stone-800 px-6 py-1 text-[9px] text-white font-bold uppercase tracking-widest border border-stone-600">Arquivo Privado</div>
          {(() => {
            const mao = (partidaState && partidaState.minhaMao) || [];
            return mao.map((c: any) => {
              const img = (c.imageUrl || c.image || c.imagem) || null;
              const nome = (c.nome || c.name || '').toString();
              const tipo = (c.tipo || '').toString().toUpperCase();
              const tipoLabel = tipo === 'SUSPEITO' ? 'Suspeito' : tipo === 'ARMA' ? 'Arma' : 'Local';
              const borderColor = tipo === 'SUSPEITO' ? 'border-yellow-600' : tipo === 'ARMA' ? 'border-stone-600' : 'border-green-800';
              return (
                <div key={c.id} onClick={() => zoomCard(nome, tipoLabel, img)} className={`evidence-card border-2 ${borderColor} p-2 bg-white cursor-pointer shadow-sm hover:scale-105 transition-transform`} style={{ width: 100 }}>
                  <div className="w-full h-[100px] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
                    {img ? <img src={img} className="w-full h-full object-cover" alt={nome} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">{nome.toUpperCase()}</div>}
                  </div>
                  <div className="flex flex-col px-1">
                    <span className="font-bold text-black text-[10px] leading-tight text-center uppercase" style={{ minHeight: '2.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nome}</span>
                    <span className={"text-[8px] uppercase font-bold text-center mt-1 tracking-widest " + (tipo === 'SUSPEITO' ? 'text-blue-600' : tipo === 'ARMA' ? 'text-green-600' : 'text-purple-600')}>{tipoLabel}</span>
                  </div>
                </div>
              );
            });
          })()}
        </footer>

        <div id="action-modal-overlay" className="fixed inset-0 z-[600] hidden items-center justify-center bg-black/90 p-4">
          <div id="modal-container" className="paper-sheet w-full max-w-2xl p-8 flex flex-col border-[6px] border-stone-800 relative shadow-2xl max-h-[90vh]">
            <div id="warning-ribbon" className="absolute -right-12 top-8 rotate-45 bg-red-600 text-white font-bold py-1 px-16 text-[10px] uppercase tracking-widest hidden z-50">RISCO DE ELIMINAÇÃO</div>
            <h2 id="modal-title" className="special-elite text-3xl mb-1 uppercase border-b-4 border-stone-800 pb-2">FAZER PERGUNTA</h2>
            <p id="modal-desc" className="text-[11px] text-stone-500 mb-6 italic">Selecione pistas para confrontar os agentes.</p>
            <div id="modal-content" className="flex-1 overflow-y-auto pr-2 space-y-6"></div>
            <div id="accusation-warning" className="hidden mt-4 bg-red-950 p-4 border border-red-500 text-red-200 text-center animate-pulse">
              <p className="special-elite text-sm">ATENÇÃO: SE A ACUSAÇÃO ESTIVER ERRADA, VOCÊ PERDE O JOGO IMEDIATAMENTE.</p>
            </div>
            <div className="mt-6 flex justify-end gap-4 border-t pt-4 shrink-0">
              <button onClick={() => closeModal()} className="btn-abort px-6 py-2 text-xs font-bold uppercase hover:bg-stone-200 text-stone-600">Abortar Missão</button>
              <button id="confirm-action-btn" onClick={() => confirmAction()} className="bg-stone-900 text-white px-8 py-3 special-elite text-lg shadow-lg hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none uppercase">Confirmar Transmissão</button>
            </div>
          </div>
        </div>

        <div id="card-zoom-overlay" className="fixed inset-0 z-[700] hidden items-center justify-center bg-black/90" onClick={() => closeZoom()}>
          <div onClick={(e) => e.stopPropagation()} className="modal-card paper-sheet p-10 flex flex-col items-center justify-between border-[10px] border-stone-800">
            <div id="zoom-type" className="text-[10px] font-bold text-red-900 uppercase tracking-widest border-b-2 border-red-900/20 w-full text-center pb-2 mb-8">Tipo</div>
            <div id="zoom-name" className="special-elite text-4xl text-center uppercase border-y-4 border-stone-800 py-6 w-full leading-tight">Nome</div>
            <div className="text-[9px] italic text-stone-500 mt-8 uppercase">Material Confidencial</div>
          </div>
        </div>

        {cardZoom && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80" onClick={() => setCardZoom(null)}>
            <div onClick={(e) => e.stopPropagation()} className="paper-sheet flex flex-col items-center border-[6px] border-stone-800 shadow-2xl" style={{ width: 260 }}>
              <div className="w-full bg-stone-800 text-white text-[9px] font-bold uppercase tracking-widest text-center py-2">Arquivo Privado</div>
              <div className="w-full h-[220px] bg-stone-200 overflow-hidden border-b border-stone-300">
                {cardZoom.imageUrl ? <img src={cardZoom.imageUrl} className="w-full h-full object-cover" alt={cardZoom.nome} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">{cardZoom.nome.toUpperCase()}</div>}
              </div>
              <div className="flex flex-col px-4 py-3 items-center w-full">
                <span className="special-elite text-xl text-center uppercase text-black">{cardZoom.nome}</span>
                <span className={"text-[9px] uppercase font-bold tracking-widest mt-1 " + (cardZoom.tipoLabel === 'Suspeito' ? 'text-blue-600' : cardZoom.tipoLabel === 'Arma' ? 'text-green-600' : 'text-purple-600')}>{cardZoom.tipoLabel}</span>
              </div>
            </div>
          </div>
        )}

        {waitingForAnswer && (
          <div className="fixed inset-0 z-[810] flex items-center justify-center bg-black/80">
            <div className="paper-sheet p-8 flex flex-col items-center gap-4 border-4 border-stone-800">
              <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="special-elite text-2xl text-stone-800">Aguardando {waitingForAnswer.targetName}...</p>
              <p className="text-xs text-stone-500 italic">{waitingForAnswer.carta1Nome} · {waitingForAnswer.carta2Nome}</p>
            </div>
          </div>
        )}

        {pendingAnswerRequest && (
          <div className="fixed inset-0 z-[810] flex items-center justify-center bg-black/80">
            <div className="paper-sheet p-6 flex flex-col gap-4 border-4 border-stone-800 max-w-lg w-full">
              <h3 className="special-elite text-2xl uppercase text-center">{pendingAnswerRequest.askerName} pergunta</h3>
              <p className="text-xs text-stone-500 text-center">Selecione a carta a revelar (ou confirme que não tem nenhuma)</p>
              <div className="flex gap-4 justify-center flex-wrap">
                {pendingAnswerRequest.cardObjects.map((co) => {
                  const img = co.imageUrl || null;
                  const tipo = (co.tipo || '').toUpperCase();
                  const isSelected = selectedReveal === co.nome;
                  return (
                    <div key={co.nome}
                      onClick={() => co.hasIt ? setSelectedReveal(co.nome) : undefined}
                      className={`evidence-card border-2 p-2 bg-white transition-transform ${co.hasIt ? 'cursor-pointer hover:scale-105' : 'opacity-40 cursor-not-allowed'} ${isSelected ? 'ring-4 ring-yellow-400' : ''}`}
                      style={{ width: 120 }}>
                      <div className="w-full h-[110px] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
                        {img ? <img src={img} className="w-full h-full object-cover" alt={co.nome} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">{co.nome.toUpperCase()}</div>}
                      </div>
                      <div className="flex flex-col px-1">
                        <span className="font-bold text-black text-[10px] leading-tight text-center uppercase" style={{ minHeight: '2.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{co.nome}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pendingAnswerRequest.cardObjects.every(co => !co.hasIt) && (
                <p className="text-center text-xs text-red-700 italic">Você não tem nenhuma dessas cartas.</p>
              )}
              <div className="flex justify-center mt-2">
                <button
                  onClick={async () => {
                    const hasNone = pendingAnswerRequest.cardObjects.every(co => !co.hasIt);
                    if (!hasNone && !selectedReveal) return;
                    const chosenCardName = hasNone ? '' : (selectedReveal || '');
                    try {
                      const pid = meUserRef.current?.currentPartidaId;
                      if (pid) await api.sendChatMessage(undefined, pid, `__ACK__:${pendingAnswerRequest.perguntaId}:${chosenCardName}`);
                    } catch {}
                    setPendingAnswerRequest(null);
                    setSelectedReveal(null);
                  }}
                  disabled={!pendingAnswerRequest.cardObjects.every(co => !co.hasIt) && !selectedReveal}
                  className="bg-stone-900 text-white px-6 py-2 special-elite text-lg disabled:opacity-40">
                  Enviar Resposta
                </button>
              </div>
            </div>
          </div>
        )}

        {questionResultOverlay && (
          <div className="fixed inset-0 z-[810] flex items-center justify-center bg-black/80">
            <div className="paper-sheet p-6 flex flex-col gap-4 border-4 border-stone-800 max-w-md w-full items-center">
              <h3 className="special-elite text-2xl uppercase text-center">Resultado da Pergunta</h3>
              <p className="text-xs text-stone-500 italic text-center">{questionResultOverlay.carta1} · {questionResultOverlay.carta2}</p>
              {questionResultOverlay.cartaRevelada ? (
                <>
                  <p className="text-green-700 font-bold text-sm uppercase text-center">Carta revelada!</p>
                  {(() => {
                    const cr = questionResultOverlay.cartaRevelada;
                    const img = cr.imageUrl || null;
                    const tipo = (cr.tipo || '').toUpperCase();
                    const tipoLabel = tipo === 'SUSPEITO' ? 'Suspeito' : tipo === 'ARMA' ? 'Arma' : 'Local';
                    return (
                      <div className="evidence-card border-2 p-2 bg-white" style={{ width: 140 }}>
                        <div className="w-full h-[120px] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
                          {img ? <img src={img} className="w-full h-full object-cover" alt={cr.nome} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">{cr.nome.toUpperCase()}</div>}
                        </div>
                        <div className="flex flex-col px-1">
                          <span className="special-elite text-sm text-center uppercase text-black">{cr.nome}</span>
                          <span className={"text-[8px] uppercase font-bold text-center mt-1 tracking-widest " + (tipo === 'SUSPEITO' ? 'text-blue-600' : tipo === 'ARMA' ? 'text-green-600' : 'text-purple-600')}>{tipoLabel}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="text-red-700 font-bold text-sm uppercase text-center">Nenhuma carta revelada.</p>
              )}
              <button onClick={() => setQuestionResultOverlay(null)} className="bg-stone-900 text-white px-6 py-2 special-elite text-lg mt-2">OK</button>
            </div>
          </div>
        )}

        {showAbandonModal ? (
          <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60">
            <div className="paper-sheet max-w-md w-full p-6 rounded shadow-lg">
              <h3 className="special-elite text-2xl mb-2">Abandonar Partida</h3>
              <p className="text-sm text-stone-700 mb-4">Deseja realmente abandonar esta partida? Você sairá da sala.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => cancelAbandon()} className="px-4 py-2 border rounded bg-white text-stone-800 font-bold">Cancelar</button>
                <button onClick={() => confirmAbandon()} disabled={abandoning} className="px-4 py-2 bg-red-800 text-white rounded font-bold">{abandoning ? 'Abandonando...' : 'Confirmar'}</button>
              </div>
            </div>
          </div>
        ) : null}

        {accusationConfirm && (
          <div className="fixed inset-0 z-[820] flex items-center justify-center bg-black/80">
            <div className="paper-sheet max-w-lg w-full border-4 border-red-800 shadow-2xl overflow-hidden">
              <div className="bg-red-800 px-6 py-4">
                <h3 className="special-elite text-2xl text-white uppercase">Confirmar Acusação</h3>
                <p className="text-red-200 text-xs mt-1">Esta ação é irreversível. Se errar, será eliminado.</p>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="font-bold text-blue-700 py-1 pr-4 uppercase text-xs">Suspeito</td><td className="font-bold">{accusationConfirm.suspeito?.name || '—'}</td></tr>
                    <tr><td className="font-bold text-green-700 py-1 pr-4 uppercase text-xs">Arma</td><td className="font-bold">{accusationConfirm.arma?.name || '—'}</td></tr>
                    <tr><td className="font-bold text-purple-700 py-1 pr-4 uppercase text-xs">Local</td><td className="font-bold">{accusationConfirm.local?.name || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button onClick={() => setAccusationConfirm(null)} className="px-4 py-2 border rounded bg-white text-stone-800 font-bold">Recuar</button>
                <button onClick={() => executeAccusation()} className="px-6 py-2 bg-red-800 text-white rounded font-bold special-elite text-lg">Acusar</button>
              </div>
            </div>
          </div>
        )}

        {gameEndOverlay && (
          <div className="fixed inset-0 z-[820] flex items-center justify-center bg-black/90">
            <div className="paper-sheet max-w-lg w-full p-8 border-4 border-stone-800 shadow-2xl flex flex-col items-center gap-4">
              {gameEndOverlay.isCorreta ? (
                <>
                  <h2 className="special-elite text-4xl text-green-800 uppercase">Caso Resolvido!</h2>
                  <p className="text-stone-600 italic text-center">Você identificou corretamente os culpados.</p>
                </>
              ) : gameEndOverlay.vencedorName ? (
                <>
                  <h2 className="special-elite text-4xl text-stone-800 uppercase">Jogo Encerrado!</h2>
                  <p className="text-stone-600 italic text-center">
                    <strong>{gameEndOverlay.vencedorName}</strong> solucionou o caso e venceu a investigação. Você perdeu.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="special-elite text-4xl text-red-800 uppercase">Eliminado!</h2>
                  <p className="text-stone-600 italic text-center">Sua acusação estava errada. Você foi eliminado da investigação.</p>
                </>
              )}
              {gameEndOverlay.cartasCrime && (
                <div className="flex gap-4 justify-center flex-wrap mt-2">
                  {[gameEndOverlay.cartasCrime.suspeito, gameEndOverlay.cartasCrime.arma, gameEndOverlay.cartasCrime.local].filter(Boolean).map((c: any) => {
                    const img = (c.imageUrl || c.image || c.imagem) || null;
                    const nome = (c.nome || '').toString();
                    const tipo = (c.tipo || '').toUpperCase();
                    const tipoLabel = tipo === 'SUSPEITO' ? 'Suspeito' : tipo === 'ARMA' ? 'Arma' : 'Local';
                    return (
                      <div key={c.id} className="evidence-card border-2 p-2 bg-white" style={{ width: 100 }}>
                        <div className="w-full h-[90px] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
                          {img ? <img src={img} className="w-full h-full object-cover" alt={nome} /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">{nome.toUpperCase()}</div>}
                        </div>
                        <div className="flex flex-col px-1">
                          <span className="text-[9px] font-bold text-center uppercase text-black">{nome}</span>
                          <span className={"text-[7px] uppercase font-bold text-center mt-1 tracking-widest " + (tipo === 'SUSPEITO' ? 'text-blue-600' : tipo === 'ARMA' ? 'text-green-600' : 'text-purple-600')}>{tipoLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {(gameEndOverlay.isEliminado && !gameEndOverlay.isCorreta && !gameEndOverlay.vencedorName) ? (
                <div className="flex gap-4 mt-4">
                  <button onClick={() => setGameEndOverlay(null)} className="bg-stone-600 text-white px-6 py-3 special-elite text-lg shadow-lg hover:bg-stone-500">Continuar Observando</button>
                  <button onClick={() => { setGameEndOverlay(null); router.push('/home'); }} className="bg-stone-900 text-white px-6 py-3 special-elite text-lg shadow-lg hover:bg-stone-700">Sair</button>
                </div>
              ) : (
                <button onClick={() => { setGameEndOverlay(null); router.push('/home'); }} className="mt-4 bg-stone-900 text-white px-8 py-3 special-elite text-xl shadow-lg hover:bg-stone-700">Sair</button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
