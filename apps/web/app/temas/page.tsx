// @ts-nocheck
"use client";

import React, { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/services/api";
import installShowAlert from '@/utils/showAlert';
import installShowConfirm from '@/utils/showConfirm';
import Cropper from 'cropperjs';

export default function TemasPage() {
  const router = useRouter();

  useEffect(() => {
    // install custom alert/confirm hosts (provide window.showAppAlert / window.showAppConfirm)
    try { installShowAlert(); } catch (e) {}
    try { installShowConfirm(); } catch (e) {}

    const showAlert = (msg) => {
      try {
        if ((window as any).showAppAlert) {
          (window as any).showAppAlert(String(msg));
          return;
        }
      } catch (e) {}
      try { alert(msg); } catch (e) {}
    };

    // --- DADOS E ESTADO ---
    let themes = [
      {
        id: 1,
        name: "Mansão Tudor (Clássico)",
        visibilidade: 'PUBLIC',
        cards: [
          { id: 101, name: "Coronel Mustard", type: "Suspeito", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80" },
          { id: 102, name: "Castiçal", type: "Arma", image: "https://images.unsplash.com/photo-1616086782200-db81d6f7ed85?w=300&q=80" },
          { id: 103, name: "Biblioteca", type: "Local", image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&q=80" }
        ]
      },
      { id: 2, name: "Incidente no Escritório", visibilidade: 'PUBLIC', cards: [] }
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
    let editingCardId: string | null = null;
    let cropperInstance: any = null;

    // --- ORDENAÇÃO DE CARTAS ---
    function normalizeTipo(tipo) {
      if (!tipo && tipo !== 0) return 'Desconhecido';
      const key = String(tipo).trim().toUpperCase();
      if (key === 'SUSPEITO' || key === 'SUS' || key === 'SUSPECT' || key === 'SUSPECTO') return 'Suspeito';
      if (key === 'ARMA' || key === 'WEAPON') return 'Arma';
      if (key === 'LOCAL' || key === 'LOCATION' || key === 'LUGAR') return 'Local';
      // If it's already a readable form (e.g., 'Suspeito'), normalize capitalization
      const lowered = String(tipo).toLowerCase();
      if (lowered === 'suspeito' || lowered === 'sus') return 'Suspeito';
      if (lowered === 'arma' || lowered === 'weapon') return 'Arma';
      if (lowered === 'local' || lowered === 'lugar' || lowered === 'location') return 'Local';
      // fallback: capitalize first letter
      return String(tipo).charAt(0).toUpperCase() + String(tipo).slice(1).toLowerCase();
    }

    const sortCards = (cards) => {
      const typeOrder = { 'Suspeito': 1, 'Arma': 2, 'Local': 3 };
      return [...cards].sort((a, b) => {
        const ta = a.type || '';
        const tb = b.type || '';
        if (typeOrder[ta] !== typeOrder[tb]) return (typeOrder[ta] || 999) - (typeOrder[tb] || 999);
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

    async function selectTheme(id) {
      activeThemeId = id;
      renderThemes();
      const theme = themes.find(t => t.id === id);
      if (!theme) return;
      const titleEl = document.getElementById('active-theme-title');
      if (titleEl) titleEl.innerText = theme.name;
      const activeVisEl = document.getElementById('active-theme-visibility') as HTMLSelectElement | null;
      if (activeVisEl) {
        activeVisEl.value = (theme.visibilidade || 'PUBLIC');
        activeVisEl.onchange = async () => {
          const prev = theme.visibilidade || 'PUBLIC';
          const newVis = activeVisEl.value as 'PUBLIC' | 'PRIVATE';
          try {
            const updated = await api.updateTema(String(id), { visibilidade: newVis });
            theme.visibilidade = updated.visibilidade || newVis;
            renderThemes();
            try { if ((window as any).showAppAlert) (window as any).showAppAlert('Visibilidade atualizada.'); else alert('Visibilidade atualizada.'); } catch (e) { try { alert('Visibilidade atualizada.'); } catch(e){} }
          } catch (err) {
            try { console.error('updateTema failed', err); } catch {}
            try { if ((window as any).showAppAlert) (window as any).showAppAlert('Falha ao atualizar visibilidade.'); else alert('Falha ao atualizar visibilidade.'); } catch(e) { try { alert('Falha ao atualizar visibilidade.'); } catch(e){} }
            activeVisEl.value = prev;
          }
        };
      }
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.classList.add('hidden');
      const ws = document.getElementById('theme-workspace');
      if (ws) { ws.classList.remove('hidden'); ws.classList.add('flex'); }

      try {
        const cartas = await api.listCartas(String(id));
        theme.cards = (cartas || []).map(c => ({ id: c.id, name: c.nome, type: normalizeTipo(c.tipo), image: c.imageUrl }));
      } catch (err) {
        try { console.error('listCartas failed', err); } catch {}
        theme.cards = theme.cards || [];
      }

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
        let typeBarClass = '';
        let typeTextClass = '';
        if (card.type === 'Suspeito') { typeBarClass = 'bg-blue-600'; typeTextClass = 'text-blue-600'; }
        else if (card.type === 'Arma') { typeBarClass = 'bg-green-600'; typeTextClass = 'text-green-600'; }
        else if (card.type === 'Local') { typeBarClass = 'bg-purple-600'; typeTextClass = 'text-purple-600'; }
        else { typeBarClass = 'bg-stone-600'; typeTextClass = 'text-stone-500'; }

        const cardEl = document.createElement('div');
        cardEl.className = 'evidence-card flex flex-col w-full';
        cardEl.innerHTML = `
          <div class="masking-tape"></div>
          <div class="w-full aspect-[3/4] bg-stone-200 mb-2 overflow-hidden border border-stone-300">
            <img src="${card.image}" class="w-full h-full object-cover" alt="${card.name}">
          </div>
          <div class="flex flex-col mt-auto px-1">
            <div class="w-full h-1 ${typeBarClass} mb-1"></div>
            <span class="font-bold card-name text-[10px] sm:text-[11px] leading-tight text-center line-clamp-2 uppercase">${card.name}</span>
            <span class="text-[8px] ${typeTextClass} uppercase font-bold text-center border-t border-stone-200 mt-1 pt-1 tracking-widest">${card.type}</span>
          </div>
          <button type="button" onclick="editCard('${card.id}')" style="color:#fff!important" class="absolute bottom-3 left-3 bg-blue-800 text-white w-7 h-7 rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center font-bold shadow-md z-20" title="Editar Prova">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM5 12v3h3l9.586-9.586a4 4 0 00-5.657-5.657L2.343 9.343A4 4 0 005 12z"/></svg>
          </button>
          <button type="button" onclick="deleteCard('${card.id}')" style="color:#fff!important" class="absolute bottom-3 right-3 bg-red-800 text-white w-7 h-7 rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center font-bold shadow-md z-20" title="Destruir Prova">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3" aria-hidden="true"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3a1 1 0 000 2h14a1 1 0 000-2h-2V3a1 1 0 00-1-1H6zm2 6a1 1 0 00-1 1v7a1 1 0 102 0V9a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v7a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          </button>
        `;
        grid.appendChild(cardEl);
      });
    }

    // --- DRAG & DROP ---
    function setupDragAndDrop() {
      if(!dropZone) return;
      // avoid attaching handlers multiple times (HMR / re-run)
      try {
        if ((dropZone as any).dataset?.dragInit) return;
        (dropZone as any).dataset = (dropZone as any).dataset || {};
        (dropZone as any).dataset.dragInit = '1';
      } catch (e) {}

      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => dropZone.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); }, false));
      ['dragenter', 'dragover'].forEach(eName => dropZone.addEventListener(eName, () => dropZone.classList.add('dragover'), false));
      ['dragleave', 'drop'].forEach(eName => dropZone.addEventListener(eName, () => dropZone.classList.remove('dragover'), false));

      dropZone.ondrop = (e: any) => {
        const file = e.dataTransfer?.files?.[0];
        if(file && file.type && file.type.startsWith('image/')) loadFileIntoEditor(file);
        else showAlert("Inválido. Apenas fotografias (imagens).");
      };

      if (fileInput) {
        (fileInput as HTMLInputElement).onchange = function(this: HTMLInputElement) {
          if(this.files && this.files[0]) loadFileIntoEditor(this.files[0]);
        };
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
          // ensure CropperJS is loaded and initialize
          initCropper();
        };
        img.src = e.target.result;
      }
      reader.readAsDataURL(file);
    }

    // --- EDITOR DE IMAGEM (PAN & ZOOM) ---
    function setupCropInteractions() {
      // initialize Cropper loader and bind zoom slider; idempotent for HMR
      if ((window as any).__cropperInteractionsInit) return;
      (window as any).__cropperInteractionsInit = true;

      // bind zoom slider to cropper when available, fallback to previous transform
      if (zoomSlider) (zoomSlider as HTMLInputElement).oninput = () => {
        const val = parseFloat((zoomSlider as HTMLInputElement).value || '1');
        if (cropperInstance && typeof cropperInstance.zoomTo === 'function') {
          try { cropperInstance.zoomTo(val); } catch (e) { try { cropperInstance.zoom(val); } catch (e) {} }
        } else {
          cropScale = val; updateCropView();
        }
      };

      // nothing here: Cropper is imported as a dependency and initialized when needed
    }

    

    function initCropper() {
      try {
        if (!Cropper) return;
        const imgEl = document.getElementById('crop-image') as HTMLImageElement | null;
        if (!imgEl) return;
        // ensure image element has src loaded
        if (!imgEl.src) return;
        // destroy existing if any
        if (cropperInstance) {
          try { cropperInstance.replace(imgEl.src); return; } catch (e) { try { cropperInstance.destroy(); } catch (e) {} cropperInstance = null; }
        }
        // create new instance
        cropperInstance = new Cropper(imgEl, {
          viewMode: 1,
          aspectRatio: 3/4,
          autoCropArea: 1,
          movable: true,
          zoomable: true,
          background: false,
          dragMode: 'move',
          cropBoxMovable: false,
          cropBoxResizable: false,
        });
        // ensure zoom slider controls the cropper (override previous handler)
        try {
          if (zoomSlider) {
            (zoomSlider as HTMLInputElement).value = '1';
            (zoomSlider as HTMLInputElement).oninput = (ev: any) => {
              const val = parseFloat((ev.target as HTMLInputElement).value || '1');
              try { cropperInstance.zoomTo(val); } catch (e) { try { cropperInstance.zoom(val); } catch (e) {} }
            };
          }
        } catch (e) { /* ignore */ }
      } catch (e) {
        try { console.warn('initCropper failed', e); } catch (e) {}
      }
    }

    function destroyCropper() {
      try {
        if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
      } catch (e) { /* ignore */ }
    }

    function updateCropView() {
      if (!cropImage) return;
      // if cropper is active, let it control the view
      if (cropperInstance) return;
      cropImage.style.transform = `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropScale})`;
    }

    function generateCroppedBase64() {
      try {
        if (cropperInstance && typeof cropperInstance.getCroppedCanvas === 'function') {
          const canvas = cropperInstance.getCroppedCanvas({ width: 300, height: 400, fillColor: '#fff' });
          if (canvas) return canvas.toDataURL('image/jpeg', 0.9);
        }
      } catch (e) {
        try { console.warn('cropper getCroppedCanvas failed', e); } catch (e) {}
      }
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
      // cancel editing mode when resetting image
      editingCardId = null;
      // destroy cropper instance to avoid stale state
      destroyCropper();
      const submitBtn = (document.getElementById('form-card') as HTMLFormElement | null)?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submitBtn) submitBtn.textContent = 'CARIMBAR';
    }

    // Expose functions used by inline handlers (deleteCard via innerHTML/onclick)
    async function deleteCard(cardId) {
      const question = 'Deseja destruir esta prova e removê-la do dossiê?';
      let ok = false;
      try {
        if ((window as any).showAppConfirm) {
          ok = await (window as any).showAppConfirm(question);
        } else {
          ok = confirm(question);
        }
      } catch (e) {
        try { ok = confirm(question); } catch (e) { ok = false; }
      }
      if (!ok) return;
      const theme = themes.find(t => t.id === activeThemeId);
      if (!theme) return;
      try {
        if ((window as any).api && (window as any).api.deleteCarta) {
          // prefer global api if exposed
          await (window as any).api.deleteCarta(cardId);
        } else {
          await api.deleteCarta(String(cardId));
        }
      } catch (err) {
        try { console.error('deleteCarta failed', err); } catch {}
        showAlert('Falha ao remover a prova no servidor.');
        return;
      }
      theme.cards = theme.cards.filter(c => String(c.id) !== String(cardId));
      renderThemes(); renderCards();
    }

    function editCard(cardId) {
      const theme = themes.find(t => t.id === activeThemeId);
      if (!theme) return;
      const card = theme.cards.find(c => String(c.id) === String(cardId));
      if (!card) return;
      editingCardId = String(cardId);
      const nameInput = document.getElementById('card-name') as HTMLInputElement | null;
      const typeSelect = document.getElementById('card-type') as HTMLSelectElement | null;
      if (nameInput) nameInput.value = card.name || '';
      if (typeSelect) typeSelect.value = card.type || '';

      // set submit button text to indicate edit
      const submitBtn = (document.getElementById('form-card') as HTMLFormElement | null)?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submitBtn) submitBtn.textContent = 'SALVAR';

      // load current image into editor for re-cropping
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cropImage) cropImage.src = img.src;
          originalImageFile = img;
          cropX = 0; cropY = 0; cropScale = 1; if (zoomSlider) (zoomSlider as HTMLInputElement).value = '1';
          updateCropView();
          if (dropZone) dropZone.classList.add('hidden');
          if (imageEditor) imageEditor.classList.remove('hidden');
          if (btnDiscard) btnDiscard.classList.remove('hidden');
          initCropper();
        };
        img.src = card.image || '';
      } catch (e) {
        // ignore load failures
      }
    }

    (window as any).deleteCard = deleteCard;
    (window as any).editCard = editCard;
    (window as any).resetImage = resetImage;

    async function deleteTheme() {
      if (!activeThemeId) return;
      const question = 'Deseja excluir este dossiê e todas as provas associadas?';
      let ok = false;
      try {
        if ((window as any).showAppConfirm) ok = await (window as any).showAppConfirm(question);
        else ok = confirm(question);
      } catch (e) {
        try { ok = confirm(question); } catch (e) { ok = false; }
      }
      if (!ok) return;
      try {
        if ((window as any).api && (window as any).api.deleteTema) await (window as any).api.deleteTema(activeThemeId);
        else await api.deleteTema(String(activeThemeId));
      } catch (err) {
        try { console.error('deleteTema failed', err); } catch {}
        showAlert('Falha ao excluir o dossiê no servidor.');
        return;
      }
      themes = themes.filter(t => t.id !== activeThemeId);
      activeThemeId = null;
      renderThemes(); renderCards();
      const emptyState = document.getElementById('empty-state');
      if (emptyState) emptyState.classList.remove('hidden');
      const ws = document.getElementById('theme-workspace');
      if (ws) { ws.classList.add('hidden'); ws.classList.remove('flex'); }
    }
    const btnDeleteTemaEl = document.getElementById('btn-delete-theme');
    if (btnDeleteTemaEl) btnDeleteTemaEl.onclick = deleteTheme;

    // --- SUBMIT E REMOÇÃO ---
    const formTheme = document.getElementById('form-theme');
    if (formTheme) {
      (formTheme as HTMLFormElement).onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('new-theme-name');
        if (!nameInput) return;
        const nome = (nameInput as HTMLInputElement).value;
        const visibilitySelect = document.getElementById('new-theme-visibility') as HTMLSelectElement | null;
        const vis = visibilitySelect ? (visibilitySelect.value as 'PUBLIC' | 'PRIVATE') : 'PUBLIC';
        const submitBtn = (formTheme as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement | null;
        try {
          if (submitBtn) submitBtn.disabled = true;
          const dono = getUser();
          const created = await api.createTema({ nome, donoId: dono?.id, visibilidade: vis });
          themes.push({ id: created.id, name: created.nome, cards: [], visibilidade: created.visibilidade || vis });
          (nameInput as HTMLInputElement).value = '';
          if (visibilitySelect) visibilitySelect.value = 'PUBLIC';
          renderThemes();
          selectTheme(created.id);
        } catch (err) {
          try { console.error('createTema failed', err); } catch {}
          showAlert('Falha ao criar o dossiê.');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }

    const formCard = document.getElementById('form-card');
    if (formCard) {
      (formCard as HTMLFormElement).onsubmit = async (e) => {
        e.preventDefault();
        if (!editingCardId && !originalImageFile) { showAlert("Obrigatório enquadrar fotografia da evidência."); return; }
        const submitBtn = (formCard as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement | null;
        const finalImageBase64 = generateCroppedBase64();
        const theme = themes.find(t => t.id === activeThemeId);
        if (!theme) { showAlert('Selecione um dossiê antes de adicionar provas.'); return; }
        const cardNameEl = document.getElementById('card-name');
        const cardTypeEl = document.getElementById('card-type');
        const nome = (cardNameEl as HTMLInputElement).value;
        const tipo = (cardTypeEl as HTMLSelectElement).value;
        try {
          if (submitBtn) submitBtn.disabled = true;
          const imagePayload = finalImageBase64 || (originalImageFile && originalImageFile.src) || '';
          if (editingCardId) {
            // update existing card
            const updateBody: any = { nome, tipo };
            if (finalImageBase64 || (originalImageFile && originalImageFile.src)) updateBody.imageUrl = imagePayload;
            const updated = await api.updateCarta(editingCardId, updateBody);
            // replace in local theme
            const idx = theme.cards.findIndex(c => String(c.id) === String(editingCardId));
            if (idx >= 0) {
              theme.cards[idx] = { id: updated.id, name: updated.nome, type: normalizeTipo(updated.tipo), image: updated.imageUrl };
            }
            editingCardId = null;
          } else {
            const created = await api.createCarta({ nome, tipo, imageUrl: imagePayload || '', temaId: String(activeThemeId) });
            // append to local theme (normalize type)
            const createdType = created?.tipo !== undefined ? created.tipo : tipo;
            theme.cards.push({ id: created.id, name: created.nome, type: normalizeTipo(createdType), image: created.imageUrl });
          }
          (formCard as HTMLFormElement).reset();
          resetImage(); renderThemes(); renderCards();
        } catch (err) {
          try { console.error('createCarta failed', err); } catch {}
          showAlert('Falha ao guardar a prova.');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }

    // Inicia: load temas from API then setup interactions
    (async () => {
      try {
        const temasList = await api.listTemas();
        if (Array.isArray(temasList)) {
          themes = temasList.map((t) => ({ id: t.id, name: t.nome, visibilidade: t.visibilidade || 'PUBLIC', cards: new Array(t.cartasCount || 0) }));
        }
      } catch (err) {
        try { console.error('listTemas failed', err); } catch {}
      }
      renderThemes();
      setupDragAndDrop(); setupCropInteractions();
    })();

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
          /* Card text legibility */
          .evidence-card .card-name { color: #111827 !important; }
          .evidence-card .text-stone-500 { color: #6b7280 !important; }
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
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Visibilidade</label>
                  <select id="new-theme-visibility" defaultValue="PUBLIC" className="w-full input-classic font-bold text-sm">
                    <option value="PUBLIC">Público</option>
                    <option value="PRIVATE">Sigiloso</option>
                  </select>
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
                  <div className="mt-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mr-2">Visibilidade</label>
                    <select id="active-theme-visibility" className="input-classic text-sm font-bold">
                      <option value="PUBLIC">Público</option>
                      <option value="PRIVATE">Sigiloso</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div id="theme-status-badge" className="flex items-center gap-2 bg-red-900/90 text-white px-3 py-1.5 shadow-lg border border-red-500 shrink-0">
                    <span className="text-xl">⚠️</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase leading-none">Status: Incompleto</span>
                      <span id="theme-status-text" className="text-[8px] uppercase text-red-200">Mínimo de 12 cartas exigido</span>
                    </div>
                  </div>
                  <button id="btn-delete-theme" title="Excluir Dossiê" className="bg-red-800 text-white px-3 py-1 rounded text-xs hover:bg-red-900 transition-colors">Excluir Dossiê</button>
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
