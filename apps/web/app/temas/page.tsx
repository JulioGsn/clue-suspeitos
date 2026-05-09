// @ts-nocheck
"use client";

import React, { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";

export default function TemasPage() {
  const router = useRouter();

  useEffect(() => {
    // --- DADOS E ESTADO ---
    let themes = [
      {
        id: 1,
        name: "Mansão Tudor (Clássico)",
        cards: [
          { id: 101, name: "Coronel Mustard", type: "Suspeito", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80" },
          { id: 102, name: "Castiçal", type: "Arma", image: "https://images.unsplash.com/photo-1616086782200-db81d6f7ed85?w=300&q=80" },
          { id: 103, name: "Biblioteca", type: "Local", image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&q=80" }
        ]
      },
      { id: 2, name: "Incidente no Escritório", cards: [] }
    ];

    let activeThemeId = null;

    // Referências Editor Imagem (Pan & Zoom)
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const imageEditor = document.getElementById('image-editor');
    const cropContainer = document.getElementById('crop-container');
    const cropImage = document.getElementById('crop-image');
    const zoomSlider = document.getElementById('zoom-slider');
    const btnDiscard = document.getElementById('btn-discard');

    // Estado do Crop
    let cropX = 0, cropY = 0, cropScale = 1;
    let isDragging = false, startDragX, startDragY, initialCropX, initialCropY;
    let originalImageFile = null;

    // --- ORDENAÇÃO DE CARTAS ---
    const sortCards = (cards) => {
      const typeOrder = { 'Suspeito': 1, 'Arma': 2, 'Local': 3 };
      return [...cards].sort((a, b) => {
        if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
        return a.name.localeCompare(b.name);
      });
    };

    // --- RENDERIZAÇÃO TEMAS ---
    function renderThemes() {
      const listEl = document.getElementById('themes-list');
      if (!listEl) return;
      listEl.innerHTML = '';
      themes.forEach(theme => {
        const li = document.createElement('li');
        const isReady = theme.cards.length >= 12;
        li.className = `theme-item p-3 cursor-pointer text-sm flex justify-between items-center border border-transparent ${theme.id === activeThemeId ? 'active bg-stone-200 border-stone-300' : ''}`;
        li.innerHTML = `
          <div class="flex items-center gap-2 min-w-0">
            ${!isReady ? '<span title="Incompleto (< 12 cartas)" class="text-red-600 shrink-0 font-bold">⚠️</span>' : '<span title="Pronto para Campo" class="text-green-600 shrink-0 font-bold">✓</span>'}
            <span class="font-bold text-stone-800 truncate">${theme.name}</span>
          </div>
          <span class="text-[9px] bg-stone-300 px-1.5 text-stone-700 font-bold rounded shrink-0">${theme.cards.length}</span>
        `;
        li.onclick = () => selectTheme(theme.id);
        listEl.appendChild(li);
      });
    }

    function selectTheme(id) {
      activeThemeId = id;
      renderThemes();
      const theme = themes.find(t => t.id === id);
      if (!theme) return;
      const titleEl = document.getElementById('active-theme-title');
      if (titleEl) titleEl.innerText = theme.name;
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.classList.add('hidden');
      const ws = document.getElementById('theme-workspace');
      if (ws) { ws.classList.remove('hidden'); ws.classList.add('flex'); }
      renderCards();
    }

    function renderCards() {
      const grid = document.getElementById('cards-grid');
      if (!grid) return;
      grid.innerHTML = '';
      const theme = themes.find(t => t.id === activeThemeId);
      if (!theme) return;
      const sortedCards = sortCards(theme.cards);

      const cSuspects = sortedCards.filter(c => c.type === 'Suspeito').length;
      const cWeapons = sortedCards.filter(c => c.type === 'Arma').length;
      const cLocations = sortedCards.filter(c => c.type === 'Local').length;

      const cardCountEl = document.getElementById('card-count');
      if (cardCountEl) cardCountEl.innerText = `${sortedCards.length} Total`;
      const cSusEl = document.getElementById('count-suspect');
      const cWeapEl = document.getElementById('count-weapon');
      const cLocEl = document.getElementById('count-location');
      if (cSusEl) cSusEl.innerText = `👤 ${cSuspects}`;
      if (cWeapEl) cWeapEl.innerText = `⚔️ ${cWeapons}`;
      if (cLocEl) cLocEl.innerText = `🏠 ${cLocations}`;

      const badge = document.getElementById('theme-status-badge');
      if (badge) {
        if (sortedCards.length >= 12) {
          badge.className = "flex items-center gap-2 bg-green-900/90 text-white px-3 py-1.5 shadow-lg border border-green-500 shrink-0";
          badge.innerHTML = `
            <span class="text-xl">✓</span>
            <div class="flex flex-col">
              <span class="text-[10px] font-bold uppercase leading-none">Status: Aprovado</span>
              <span class="text-[8px] uppercase text-green-200">Baralho pronto para jogo</span>
            </div>
          `;
        } else {
          badge.className = "flex items-center gap-2 bg-red-900/90 text-white px-3 py-1.5 shadow-lg border border-red-500 shrink-0";
          badge.innerHTML = `
            <span class="text-xl animate-pulse">⚠️</span>
            <div class="flex flex-col">
              <span class="text-[10px] font-bold uppercase leading-none">Status: Incompleto</span>
              <span class="text-[8px] uppercase text-red-200">Mínimo de 12 cartas exigido (${sortedCards.length}/12)</span>
            </div>
          `;
        }
      }

      sortedCards.forEach(card => {
        let typeColor = '';
        if(card.type === 'Suspeito') typeColor = 'bg-yellow-600';
        if(card.type === 'Arma') typeColor = 'bg-stone-600';
        if(card.type === 'Local') typeColor = 'bg-green-800';

        const cardEl = document.createElement('div');
        cardEl.className = 'evidence-card flex flex-col w-full';
        cardEl.innerHTML = `
          <div class="masking-tape"></div>
          <div class="w-full aspect-[3/4] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
            <img src="${card.image}" class="w-full h-full object-cover" alt="${card.name}">
          </div>
          <div class="flex flex-col mt-auto px-1">
            <div class="w-full h-1 ${typeColor} mb-1"></div>
            <span class="font-bold text-[10px] sm:text-[11px] leading-tight text-center line-clamp-2 uppercase">${card.name}</span>
            <span class="text-[8px] text-stone-500 uppercase font-bold text-center border-t border-stone-200 mt-1 pt-1 tracking-widest">${card.type}</span>
          </div>
          <button type="button" onclick="deleteCard(${card.id})" class="absolute -top-2 -right-2 bg-red-800 text-white w-6 h-6 rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center font-bold shadow-md z-20" title="Destruir Prova">X</button>
        `;
        grid.appendChild(cardEl);
      });
    }

    // --- DRAG & DROP ---
    function setupDragAndDrop() {
      if(!dropZone) return;
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => dropZone.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); }, false));
      ['dragenter', 'dragover'].forEach(eName => dropZone.addEventListener(eName, () => dropZone.classList.add('dragover'), false));
      ['dragleave', 'drop'].forEach(eName => dropZone.addEventListener(eName, () => dropZone.classList.remove('dragover'), false));

      dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if(file && file.type.startsWith('image/')) loadFileIntoEditor(file);
        else alert("Inválido. Apenas fotografias (imagens).");
      }, false);
      
      if (fileInput) {
        fileInput.addEventListener('change', function() {
          if(this.files && this.files[0]) loadFileIntoEditor(this.files[0]);
        });
      }
    }

    function loadFileIntoEditor(file) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          if (cropImage) cropImage.src = img.src;
          originalImageFile = img;
          cropX = 0; cropY = 0; cropScale = 1; if (zoomSlider) zoomSlider.value = '1';
          updateCropView();
          if (dropZone) dropZone.classList.add('hidden');
          if (imageEditor) imageEditor.classList.remove('hidden');
          if (btnDiscard) btnDiscard.classList.remove('hidden');
        };
        img.src = e.target.result;
      }
      reader.readAsDataURL(file);
    }

    // --- EDITOR DE IMAGEM (PAN & ZOOM) ---
    function setupCropInteractions() {
      if (zoomSlider) zoomSlider.addEventListener('input', () => { cropScale = parseFloat(zoomSlider.value); updateCropView(); });

      if (cropContainer) {
        cropContainer.addEventListener('mousedown', e => { isDragging = true; startDragX = e.clientX; startDragY = e.clientY; initialCropX = cropX; initialCropY = cropY; });
      }
      document.addEventListener('mousemove', e => { if(!isDragging) return; cropX = initialCropX + (e.clientX - startDragX); cropY = initialCropY + (e.clientY - startDragY); updateCropView(); });
      document.addEventListener('mouseup', () => isDragging = false);

      if (cropContainer) {
        cropContainer.addEventListener('touchstart', e => { if(e.touches.length > 1) return; isDragging = true; startDragX = e.touches[0].clientX; startDragY = e.touches[0].clientY; initialCropX = cropX; initialCropY = cropY; }, {passive: true});
      }
      document.addEventListener('touchmove', e => { if(!isDragging) return; cropX = initialCropX + (e.touches[0].clientX - startDragX); cropY = initialCropY + (e.touches[0].clientY - startDragY); updateCropView(); }, {passive: true});
      document.addEventListener('touchend', () => isDragging = false);
    }

    function updateCropView() {
      if (!cropImage) return;
      cropImage.style.transform = `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropScale})`;
    }

    function generateCroppedBase64() {
      if(!originalImageFile) return null;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const cw = 300; const ch = 400; canvas.width = cw; canvas.height = ch;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch);
      const nw = originalImageFile.naturalWidth; const nh = originalImageFile.naturalHeight;
      const containerAspect = cw / ch; const imgAspect = nw / nh;
      let drawW, drawH;
      if (imgAspect > containerAspect) { drawH = ch; drawW = nw * (ch / nh); } else { drawW = cw; drawH = nh * (cw / nw); }
      ctx.translate(cw/2, ch/2);
      const uiRect = cropContainer.getBoundingClientRect();
      const ratioX = cw / uiRect.width; const ratioY = ch / uiRect.height;
      ctx.translate(cropX * ratioX, cropY * ratioY);
      ctx.scale(cropScale, cropScale);
      ctx.drawImage(originalImageFile, -drawW/2, -drawH/2, drawW, drawH);
      return canvas.toDataURL('image/jpeg', 0.9);
    }

    function resetImage() {
      originalImageFile = null;
      if (fileInput) fileInput.value = '';
      if (dropZone) dropZone.classList.remove('hidden');
      if (imageEditor) imageEditor.classList.add('hidden');
      if (btnDiscard) btnDiscard.classList.add('hidden');
    }

    // Expose functions used by inline handlers (deleteCard via innerHTML/onclick)
    function deleteCard(cardId) {
      if (!confirm("Deseja destruir esta prova e removê-la do dossiê?")) return;
      const theme = themes.find(t => t.id === activeThemeId);
      if (!theme) return;
      theme.cards = theme.cards.filter(c => c.id !== cardId);
      renderThemes(); renderCards();
    }

    (window as any).deleteCard = deleteCard;
    (window as any).resetImage = resetImage;

    // --- SUBMIT E REMOÇÃO ---
    const formTheme = document.getElementById('form-theme');
    if (formTheme) {
      formTheme.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('new-theme-name');
        if (!nameInput) return;
        const newTheme = { id: Date.now(), name: (nameInput as HTMLInputElement).value, cards: [] };
        themes.push(newTheme);
        (nameInput as HTMLInputElement).value = '';
        renderThemes();
        selectTheme(newTheme.id);
      });
    }

    const formCard = document.getElementById('form-card');
    if (formCard) {
      formCard.addEventListener('submit', (e) => {
        e.preventDefault();
        if(!originalImageFile) { alert("Obrigatório enquadrar fotografia da evidência."); return; }
        const finalImageBase64 = generateCroppedBase64();
        const theme = themes.find(t => t.id === activeThemeId);
        if (!theme) return;
        const cardNameEl = document.getElementById('card-name');
        const cardTypeEl = document.getElementById('card-type');
        theme.cards.push({ id: Date.now(), name: (cardNameEl as HTMLInputElement).value, type: (cardTypeEl as HTMLSelectElement).value, image: finalImageBase64 });
        (formCard as HTMLFormElement).reset();
        resetImage(); renderThemes(); renderCards();
      });
    }

    // Inicia
    renderThemes(); setupDragAndDrop(); setupCropInteractions();

  }, []);

  return (
    <>
      <Head>
        <title>Clue Suspeitos - Arquivamento de Dossiês</title>
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Special+Elite&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen flex flex-col overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          :root { --clue-yellow: #e6d5b8; --clue-red: #8b0000; --desk-wood: #2c1e14; }
          .special-elite { font-family: 'Special Elite', cursive; }
          .paper-sheet { background-color: #fdf6e3; background-image: url('https://www.transparenttextures.com/patterns/paper.png'); }
          .crime-tape { background: repeating-linear-gradient(45deg, #facc15, #facc15 20px, #000 20px, #000 40px); }
          .theme-item { border-left: 6px solid transparent; transition: all 0.2s; }
          .theme-item.active { background-color: rgba(0,0,0,0.05); border-left-color: #8b0000; font-weight: bold; }
          .theme-item:hover:not(.active) { background-color: rgba(0,0,0,0.02); border-left-color: #666; }
          .evidence-card { background: #fff; padding: 10px 10px 25px 10px; box-shadow: 2px 4px 10px rgba(0,0,0,0.4); position: relative; transition: transform 0.2s; }
          .evidence-card:hover { transform: scale(1.05) rotate(2deg); z-index: 10; }
          .masking-tape { position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(-3deg); width: 60px; height: 25px; background-color: rgba(230, 225, 200, 0.8); box-shadow: 0 1px 3px rgba(0,0,0,0.2); z-index: 5; }
          .drop-zone { border: 3px dashed #8b7355; background-color: rgba(139, 115, 85, 0.1); transition: all 0.3s; }
          .drop-zone.dragover { border-color: #8b0000; background-color: rgba(139, 0, 0, 0.1); transform: scale(1.02); }
          #crop-container { user-select: none; touch-action: none; }
          #crop-image { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; object-fit: cover; transform: translate(-50%, -50%) scale(1); pointer-events: none; }
          ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #8b7355; border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: #8b0000; }
          .input-classic { background: transparent; border: none; border-bottom: 2px solid #8b7355; outline: none; padding: 4px; } .input-classic:focus { border-bottom-color: #8b0000; }
        `}} />

        <div className="h-10 shrink-0 crime-tape flex items-center justify-between px-6 z-50 shadow-xl border-b-2 border-black">
          <span className="text-white font-bold text-[10px] uppercase tracking-widest hidden sm:inline">SISTEMA DA DIRETORIA - LABORATÓRIO DE EVIDÊNCIAS E DOSSIÊS</span>
          <span className="text-white font-bold text-[10px] uppercase tracking-widest sm:hidden">LABORATÓRIO</span>
          <button onClick={() => router.push('/')} className="bg-black text-white text-[10px] px-4 py-1 font-bold uppercase hover:bg-red-800 transition-colors shadow-sm">Voltar à Central</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 paper-sheet border-r-4 border-stone-800 shadow-2xl flex flex-col z-20 shrink-0">
            <div className="p-6 border-b-2 border-dashed border-stone-400 bg-[#f3ebd3] shrink-0">
              <h2 className="special-elite text-xl text-stone-800 mb-4 uppercase">Novo Dossiê</h2>
              <form id="form-theme" className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Nome de Código</label>
                  <input type="text" id="new-theme-name" required placeholder="Ex: O Assassinato no Expresso" className="w-full input-classic font-bold text-sm" />
                </div>
                <button type="submit" className="bg-stone-800 text-white py-2 px-4 uppercase text-[10px] font-bold shadow-md hover:bg-red-800 transition-colors">Criar Pasta de Arquivo</button>
              </form>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 border-b border-stone-300 pb-1">Arquivos Registrados</h3>
              <ul id="themes-list" className="space-y-1"></ul>
            </div>
            <div className="p-4 text-center border-t border-stone-300 shrink-0 bg-stone-100">
              <div className="special-elite text-red-800 text-lg border-2 border-red-800 inline-block px-4 py-1 rotate-[-2deg]">ACESSO ADMIN</div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
            <div id="empty-state" className="absolute inset-0 flex items-center justify-center flex-col z-10 p-8 text-center">
              <span className="special-elite text-6xl text-stone-500/30 mb-4">CONFIDENCIAL</span>
              <p className="text-stone-400 font-bold uppercase tracking-widest">Selecione um Dossiê na pasta lateral para gerenciar as evidências</p>
            </div>

            <div id="theme-workspace" className="hidden flex-col h-full z-20">
              <div className="p-6 pb-2 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-700/30 gap-4">
                <div className="flex-1 min-w-0">
                  <h1 id="active-theme-title" className="special-elite text-3xl sm:text-4xl text-stone-200 uppercase tracking-tighter drop-shadow-lg truncate">Nome do Tema</h1>
                  <p className="text-stone-400 text-xs uppercase tracking-widest mt-1">Anexe as provas visuais ao arquivo</p>
                </div>
                <div id="theme-status-badge" className="flex items-center gap-2 bg-red-900/90 text-white px-3 py-1.5 shadow-lg border border-red-500 shrink-0">
                  <span className="text-xl">⚠️</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase leading-none">Status: Incompleto</span>
                    <span id="theme-status-text" className="text-[8px] uppercase text-red-200">Mínimo de 12 cartas exigido</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start relative z-0">
                <div className="paper-sheet p-5 w-full lg:w-80 xl:w-96 shrink-0 shadow-2xl relative sticky lg:top-0 border border-stone-400">
                  <div className="absolute -top-4 right-10 w-8 h-20 bg-zinc-400 opacity-50 rounded-full border-4 border-gray-500 hidden lg:block pointer-events-none"></div>
                  <h2 className="special-elite text-2xl text-stone-800 border-b border-stone-400 pb-2 mb-4">Revelar Prova</h2>
                  <form id="form-card" className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Identificação</label>
                      <input type="text" id="card-name" required placeholder="Ex: Revólver" className="w-full input-classic font-bold text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Categoria da Prova</label>
                      <select id="card-type" required defaultValue="" className="w-full input-classic font-bold text-sm cursor-pointer appearance-none bg-transparent">
                        <option value="" disabled>Selecione...</option>
                        <option value="Suspeito">👤 Suspeito</option>
                        <option value="Arma">⚔️ Arma</option>
                        <option value="Local">🏠 Local</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex justify-between">Fotografia da Evidência
                        <span id="btn-discard" onClick={() => (window as any).resetImage?.()} className="text-red-800 hover:underline cursor-pointer hidden">Descartar</span>
                      </label>
                      <div id="drop-zone" className="drop-zone p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] relative">
                        <input type="file" id="file-input" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <span className="text-3xl mb-1 grayscale">📷</span>
                        <p className="text-[9px] text-stone-600 font-bold uppercase">Clique ou Arraste a imagem</p>
                      </div>
                      <div id="image-editor" className="hidden mt-2 bg-stone-200 border-2 border-stone-800 p-2 shadow-inner">
                        <div className="text-[8px] uppercase font-bold text-stone-500 mb-1 text-center tracking-widest border-b border-stone-300 pb-1">Arraste para enquadrar a prova</div>
                        <div id="crop-container" className="w-full aspect-[3/4] bg-black relative overflow-hidden cursor-move border border-stone-400">
                          <img id="crop-image" src="" alt="Edição" />
                          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                            <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                            <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                            <div className="border-r border-white"></div><div className="border-r border-white"></div><div></div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs">🔍-</span>
                          <input type="range" id="zoom-slider" min="1" max="4" step="0.05" defaultValue="1" className="w-full accent-red-800" />
                          <span className="text-xs">🔍+</span>
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-red-900 text-white py-3 px-4 font-bold special-elite hover:bg-stone-900 transition-colors duration-300 shadow-xl mt-4 text-lg border-2 border-red-950">CARIMBAR</button>
                  </form>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 border-b border-stone-500/50 pb-2 gap-2">
                    <h2 className="text-sm text-stone-300 font-bold uppercase tracking-widest">Evidências Coletadas</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 text-[9px] font-bold uppercase">
                        <span className="text-yellow-600" id="count-suspect">👤 0</span>
                        <span className="text-stone-400" id="count-weapon">⚔️ 0</span>
                        <span className="text-green-500" id="count-location">🏠 0</span>
                      </div>
                      <span id="card-count" className="text-stone-200 bg-stone-800 px-2 py-0.5 text-xs font-bold tabular-nums rounded">0 Total</span>
                    </div>
                  </div>
                  <div id="cards-grid" className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 pb-12"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
