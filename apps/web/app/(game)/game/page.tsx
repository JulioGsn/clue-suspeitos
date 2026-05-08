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

  // Load players for this partida from session (or create a sensible fallback)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('partida_players');
      if (raw) {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize: keep only entries with a username, remove duplicates by username
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
            // Shuffle order for display
            const shuffled = shuffle(parsed);
            // attach card counts if missing
            const hands = dealHandsToPlayers(shuffled);
            const assembled = shuffled.map((p: any, i: number) => ({ ...p, username: p.username, cards: hands[i] ? hands[i].length : 0 }));
            setPlayersState(assembled);
            savePlayersToSession(assembled);
            setTurnIndex(0);
            return;
          }
        }
      }
    } catch (e) {}

    // fallback: create a small simulated partida and distribute cards
    const fallback = [ { username: 'AGENTE JÚLIO' }, { username: 'INSPETOR_GOMES' } ];
    const hands = dealHandsToPlayers(fallback);
    const assembled = fallback.map((p, i) => ({ ...p, username: p.username, cards: hands[i] ? hands[i].length : 0 }));
    const shuffled = shuffle(assembled);
    setPlayersState(shuffled);
    savePlayersToSession(shuffled);
    setTurnIndex(0);
  }, []);

  const router = useRouter();
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

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
      .clue-card { background: white !important; border-color: #333 !important; min-width: 120px; width:120px; height:180px !important; display:flex; flex-direction:column; justify-content:space-between; padding:8px; }
      .hand-card { min-width: 120px; width: 120px; height:180px; }
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
    `;
    document.head.appendChild(style);
    return () => { const s = document.getElementById('game-theme-overrides'); if (s) s.remove(); };
  }, []);

  function zoomCard(name: string, type: string) {
    const nameEl = document.getElementById('zoom-name');
    const typeEl = document.getElementById('zoom-type');
    if (nameEl) nameEl.innerText = name;
    if (typeEl) typeEl.innerText = type;
    const overlay = document.getElementById('card-zoom-overlay');
    if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
  }

  function closeZoom() {
    const overlay = document.getElementById('card-zoom-overlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
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
        name: cb.getAttribute('data-name'),
        marked: (cb as HTMLInputElement).checked,
        category
      }));

      options.sort((a, b) => (a.marked ? 1 : 0) - (b.marked ? 1 : 0));

      options.forEach(opt => {
        const btn = document.createElement('div');
        const isSelected = selectedItemsRef.current.some(i => i.name === opt.name);
        btn.className = `selectable-item ${opt.marked ? 'marked' : ''} ${isSelected ? 'selected' : ''}`;
        btn.setAttribute('data-category', opt.category || '');
        btn.innerText = opt.name || '';
        btn.onclick = () => toggleSelectItem(opt);
        grid.appendChild(btn);
      });

      catContainer.appendChild(grid);
      content.appendChild(catContainer);
    });
  }

  function toggleSelectItem(item: any) {
    const idx = selectedItemsRef.current.findIndex(i => i.name === item.name);
    if (idx > -1) {
      selectedItemsRef.current.splice(idx, 1);
    } else {
      const sameCatIdx = selectedItemsRef.current.findIndex(i => i.category === item.category);
      if (sameCatIdx > -1) selectedItemsRef.current.splice(sameCatIdx, 1);
      const max = currentModalModeRef.current === 'pergunta' ? 2 : 3;
      if (selectedItemsRef.current.length < max) selectedItemsRef.current.push(item);
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
    setTurnIndex(t => nextIndex(t));
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

  function confirmAction() {
    const names = selectedItemsRef.current.map(i => i.name).join(' e ');
    if (currentModalModeRef.current === 'pergunta') {
      // Build card list and set a pending question to the next player in turn order
      const cards = selectedItemsRef.current.map(i => i.name).filter(Boolean);
      const asker = turnIndex;
      const target = nextIndex(turnIndex);
      setEvents(e => [...e, { text: `${playersState[asker]?.username ?? 'Agente'} fez pergunta para ${playersState[target]?.username ?? 'Agente'}: ${cards.join(', ')}` }]);
      setPendingQuestion({ askerIndex: asker, targetIndex: target, cards });
      setShowRevealOverlay(true);
      addChatMsg("SISTEMA", `Interrogando sobre: ${names}.`, "text-stone-600 italic font-bold");
      closeModal();
      return;
    } else {
      const confirmText = `ACUSAÇÃO IRREVOGÁVEL:\n\nVocê afirma que o crime foi cometido por:\n${selectedItemsRef.current.map(i => i.name).join('\n')}\n\nSe errar, você será ELIMINADO imediatamente. Prosseguir?`;
      if (confirm(confirmText)) {
        if (Math.random() > 0.4) {
          document.body.classList.add('is-eliminated');
          setEvents(e => [...e, { text: `Acusação incorreta! ${playersState[turnIndex]?.username ?? 'Agente'} foi eliminado.` }]);
          addChatMsg("SISTEMA", "ERRO FATAL NA ACUSAÇÃO! Agente fora de combate.", "text-red-800 font-bold uppercase border-y border-red-800 my-1 py-1");
        } else {
          alert("CASO RESOLVIDO! Você é o mestre dos investigadores!");
          setEvents(e => [...e, { text: `Acusação correta! Caso encerrado por ${playersState[turnIndex]?.username ?? 'Agente'}.` }]);
          location.reload();
        }
        closeModal();
      }
    }
  }

  function sendChat() {
    const input = document.getElementById('chat-input') as HTMLInputElement | null;
    if (!input || !input.value.trim()) return;
    addChatMsg("VOCÊ", input.value);
    input.value = '';
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

  useEffect(() => {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) addChatMsg('SISTEMA', 'Investigação iniciada.');
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
          .clue-card { width: 120px; height: 180px; background: white; border: 2px solid #333; box-shadow: 3px 3px 8px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.2s; display:flex; flex-direction:column; justify-content:space-between; padding:8px; }
          .clue-card:hover { transform: translateY(-10px); }
          .clue-card .font-bold { color: #111827; }
          .clue-card:hover .font-bold, .clue-card.selected .font-bold { color: var(--accent-red); }
          .is-eliminated { filter: grayscale(0.8) contrast(0.8); }
          .stamp-defeated { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); border: 12px double var(--accent-red); color: var(--accent-red); padding: 20px 50px; font-size: 5rem; z-index: 500; background: rgba(253, 246, 227, 0.95); pointer-events: none; display: none; text-align: center; box-shadow: 0 0 100px rgba(0,0,0,0.5); }
          .is-eliminated .stamp-defeated { display: block; }
          .is-eliminated #action-buttons { opacity: 0.3; pointer-events: none; }
          .chat-msg { border-bottom: 1px solid rgba(0,0,0,0.05); padding: 4px 0; font-size: 11px; color: #111; }
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

        <main className="flex-1 overflow-hidden p-4 grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col paper-sheet p-4 h-full">
            <h2 className="special-elite text-xl border-b-2 border-stone-800 mb-4 uppercase shrink-0">Dossiê de Eliminação</h2>
            <div id="dossie-list" className="flex-1 overflow-y-auto space-y-4 pr-2">
              <section data-category="Suspeito">
                <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">Suspeitos</h3>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Srta. Scarlett" /> Srta. Scarlett</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Coronel Mustard" /> Coronel Mustard</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Rev. Green" /> Reverendo Green</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Sra. Peacock" /> Sra. Peacock</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Prof. Plum" /> Prof. Plum</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Sra. White" /> Sra. White</label>
                </div>
              </section>
              <section data-category="Arma">
                <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">Armas</h3>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Castial" /> Castial</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Faca" /> Faca</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Revlver" /> Revlver</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Corda" /> Corda</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Cano" /> Cano</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Chave Inglesa" /> Chave Inglesa</label>
                </div>
              </section>
              <section data-category="Local">
                <h3 className="text-[9px] font-bold bg-stone-800 text-white px-2 py-1 mb-2 uppercase tracking-widest">Locais</h3>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Cozinha" /> Cozinha</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Biblioteca" /> Biblioteca</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Hall" /> Hall</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Sala de Estar" /> Sala de Estar</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Sala de Msica" /> Sala de Msica</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-200 p-1"><input type="checkbox" className="elimination-checkbox" data-name="Jardim" /> Jardim</label>
                </div>
              </section>
            </div>
          </div>

          <div className="col-span-6 flex flex-col gap-4 h-full">
            <div className="paper-sheet p-4 shrink-0 flex justify-around items-center">
              <div className="text-center">
                <span className="text-[8px] font-bold text-stone-400 block mb-2 uppercase tracking-widest">Evidncias Pblicas</span>
                <div className="flex gap-2">
                  <div onClick={() => zoomCard('SALA DE MSICA', 'Local')} className="w-16 h-20 border-2 border-green-800 flex flex-col items-center justify-between text-[10px] text-stone-700 font-bold p-1 text-center bg-white cursor-pointer hover:-translate-y-1 transition-transform shadow-sm group">
                    <span className="mt-auto group-hover:text-red-800 transition-colors uppercase leading-tight">SALA DE MSICA</span>
                    <span className="text-[6px] text-stone-400 uppercase font-bold border-t border-stone-200 w-full mt-1">Local</span>
                  </div>
                  <div onClick={() => zoomCard('CHAVE INGLESA', 'Arma')} className="w-16 h-20 border-2 border-stone-600 flex flex-col items-center justify-between text-[10px] text-stone-700 font-bold p-1 text-center bg-white cursor-pointer hover:-translate-y-1 transition-transform shadow-sm group">
                    <span className="mt-auto group-hover:text-red-800 transition-colors uppercase leading-tight">CHAVE INGLESA</span>
                    <span className="text-[6px] text-stone-400 uppercase font-bold border-t border-stone-200 w-full mt-1">Arma</span>
                  </div>
                </div>
              </div>
              <div className="w-32 h-20 bg-[#dcc4a3] border-b-4 border-r-4 border-stone-600 shadow-lg flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform" onClick={() => openActionModal('acusacao')}>
                <span className="special-elite text-red-900 font-bold text-lg -rotate-6 uppercase">Confidencial</span>
                <span className="bg-red-800 text-white text-[8px] px-1 font-bold absolute top-1 right-1">LACRADO</span>
              </div>
            </div>

            <div className="flex-1 paper-sheet p-6 flex flex-col items-center justify-center text-center relative border-dashed border-4 border-stone-300 m-1">
              <div id="action-buttons" className="space-y-6">
                <h2 className="special-elite text-4xl text-stone-800 uppercase tracking-tighter">Sua vez, Agente</h2>
                <p className="text-stone-500 italic text-sm mb-6">Analise as evidências e tome uma decisão.</p>
                <button onClick={() => openActionModal('pergunta')} className="w-full bg-stone-900 text-white py-5 px-6 special-elite text-xl hover:bg-stone-700 transition-all shadow-lg active:scale-95 mb-4">?? FAZER PERGUNTA ??</button>
                <button onClick={() => openActionModal('acusacao')} className="w-full bg-red-800 text-white py-5 px-6 special-elite text-xl hover:bg-red-900 transition-all shadow-lg active:scale-95">!! ACUSAÇÃO !!</button>

                <button onClick={() => passTurn()} className="w-full mt-6 bg-stone-200 text-stone-900 py-4 font-bold uppercase rounded shadow-sm">&gt;&gt; PASSAR VEZ &gt;&gt;</button>
              </div>
            </div>
          </div>

          <div className="col-span-3 flex flex-col gap-4 h-full">
            <div className="paper-sheet p-4 shrink-0 h-48 flex flex-col">
              <h3 className="text-[10px] font-bold text-stone-500 uppercase border-b mb-2 shrink-0">Equipe em Campo</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {playersState && playersState.length > 0 ? (
                  // Only show players that look like part of the partida (have id/usuarioId/username)
                  playersState
                    .filter(p => p && (p.usuarioId || p.id || p.username))
                    .map((p, vIdx) => {
                      const globalIdx = playersState.findIndex(pp => pp && ((pp.id && p.id && pp.id === p.id) || (pp.usuarioId && p.usuarioId && pp.usuarioId === p.usuarioId) || (pp.username && p.username && pp.username === p.username)));
                      const borders = ['border-yellow-500','border-blue-600','border-orange-500','border-purple-600','border-green-500','border-red-500'];
                      const bc = borders[(globalIdx >= 0 ? globalIdx : vIdx) % borders.length];
                      const name = (p && (p.username || p.name)) || `Jogador ${vIdx+1}`;
                      const isLocal = Boolean(p && p.isLocal);
                      const isTurn = globalIdx === turnIndex;
                      const isEliminado = Boolean(p && (p.isEliminado || p.is_eliminado));

                      return (
                        <div key={p?.id ?? vIdx} className={`flex justify-between items-center bg-stone-50 p-1 ${bc} shadow-sm`}>
                          <span className="text-[10px] font-bold">{isLocal ? '👮 ' : '🕵️ '}{name}</span>
                          {isTurn ? (
                            <span className="bg-yellow-500 text-white px-1 font-bold uppercase text-[8px]">Sua Vez</span>
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
                  <div className="border-l-2 border-stone-400 pl-2">
                    <p className="text-stone-500 font-bold uppercase text-[8px] mb-1">Agente Júlio &gt; Gomes</p>
                    <div className="flex flex-col gap-1">
                      <span className="bg-stone-200 px-1 py-0.5 rounded text-stone-700 italic">Sala de Música</span>
                      <span className="bg-stone-200 px-1 py-0.5 rounded text-stone-700 italic">Faca</span>
                    </div>
                    <p className="text-green-800 font-bold uppercase mt-1">Carta revelada.</p>
                  </div>
                  <div className="border-l-2 border-stone-400 pl-2 bg-stone-100 rounded-r py-1">
                    <p className="text-stone-500 font-bold uppercase text-[8px] mb-1">Você &gt; Agente Júlio</p>
                    <div className="flex flex-col gap-1">
                      <span className="bg-stone-200 px-1 py-0.5 rounded text-stone-700 italic">Rev. Green</span>
                      <span className="bg-stone-200 px-1 py-0.5 rounded text-stone-700 italic">Cano</span>
                    </div>
                    <p className="text-red-800 font-bold uppercase mt-1">Nenhuma carta revelada.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="h-40 shrink-0 bg-stone-900/95 flex items-center justify-center gap-6 relative shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="absolute -top-6 bg-stone-800 px-6 py-1 text-[9px] text-white font-bold uppercase tracking-widest border border-stone-600">Arquivo Privado</div>
          <div onClick={() => zoomCard('COL. MUSTARD', 'Suspeito')} className="clue-card flex flex-col items-center justify-between p-2 text-center group">
            <div className="w-full h-1 bg-yellow-600"></div>
            <span className="font-bold text-[10px] mt-2 group-hover:text-red-800">COL. MUSTARD</span>
            <span className="text-[8px] text-stone-500 uppercase font-bold border-t border-stone-300 w-full pt-1 mb-1">Suspeito</span>
          </div>
          <div onClick={() => zoomCard('FACA', 'Arma')} className="clue-card flex flex-col items-center justify-between p-2 text-center group">
            <div className="w-full h-1 bg-stone-600"></div>
            <span className="font-bold text-[10px] mt-2 group-hover:text-red-800">FACA</span>
            <span className="text-[8px] text-stone-500 uppercase font-bold border-t border-stone-300 w-full pt-1 mb-1">Arma</span>
          </div>
          <div onClick={() => zoomCard('BIBLIOTECA', 'Local')} className="clue-card flex flex-col items-center justify-between p-2 text-center group">
            <div className="w-full h-1 bg-green-800"></div>
            <span className="font-bold text-[10px] mt-2 group-hover:text-red-800">BIBLIOTECA</span>
            <span className="text-[8px] text-stone-500 uppercase font-bold border-t border-stone-300 w-full pt-1 mb-1">Local</span>
          </div>
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
      </div>
    </>
  );
}
