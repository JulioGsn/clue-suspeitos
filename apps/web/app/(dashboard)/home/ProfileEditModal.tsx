"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, AuthUser } from "@/services/api";

type Props = {
  user: AuthUser;
  onClose: () => void;
  onUpdated?: (user: AuthUser) => void;
};

export default function ProfileEditModal({ user, onClose, onUpdated }: Props) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const prevObjectUrlRef = useRef<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(user?.username ?? "");
    setPreviewUrl(user?.avatarUrl ?? null);
  }, [user]);

  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current) {
        try { URL.revokeObjectURL(prevObjectUrlRef.current); } catch {};
        prevObjectUrlRef.current = null;
      }
    };
  }, []);

  const onSelectFile = useCallback((f?: FileList | File | null) => {
    let file: File | null = null;
    if (!f) {
      console.debug('[ProfileEditModal] onSelectFile called with no files');
      return;
    }
    if (f instanceof File) file = f;
    else if (f instanceof FileList && f.length) file = f[0];
    if (!file) {
      console.debug('[ProfileEditModal] no file found in FileList');
      return;
    }
    // validate image type
    if (file.type && !file.type.startsWith('image/')) {
      setError('Tipo de arquivo inválido. Use uma imagem (jpg, png, gif).');
      console.debug('[ProfileEditModal] rejected file type', file.type, file.name);
      return;
    }

    // revoke previous object URL if we created one
    if (prevObjectUrlRef.current) {
      try { URL.revokeObjectURL(prevObjectUrlRef.current); } catch {}
      prevObjectUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    prevObjectUrlRef.current = url;
    setPreviewUrl(url);
    setAvatarFile(file);
    setError(null);
    setPreviewLoaded(false);
    setPreviewError(null);

    // debug info for diagnostics
    try {
      // eslint-disable-next-line no-console
      console.debug('[ProfileEditModal] onSelectFile', { name: file.name, type: file.type, size: file.size, url });
    } catch {}

    // Try to also generate a DataURL as fallback (some environments render better)
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string | null;
        if (result && result.startsWith('data:')) {
          // revoke object URL we created earlier
          if (prevObjectUrlRef.current === url) {
            try { URL.revokeObjectURL(prevObjectUrlRef.current); } catch {}
            prevObjectUrlRef.current = null;
          }
          setPreviewUrl(result);
          setPreviewLoaded(true);
          try {
            // eslint-disable-next-line no-console
            console.debug('[ProfileEditModal] dataURL generated for preview', { name: file.name });
          } catch {}
        }
      };
      reader.onerror = (err) => {
        // keep object URL preview if DataURL fails
        console.debug('FileReader error generating dataURL', err);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.debug('FileReader not available or failed', e);
    }
  }, []);

  function removeSelectedFile() {
    if (prevObjectUrlRef.current) {
      try { URL.revokeObjectURL(prevObjectUrlRef.current); } catch {}
      prevObjectUrlRef.current = null;
    }
    setAvatarFile(null);
    setPreviewUrl(user?.avatarUrl ?? null);
    setError(null);
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer;
    const files = dt?.files;
    // debug info
    try {
      // eslint-disable-next-line no-console
      console.debug('[ProfileEditModal] handleDrop types=', dt?.types, 'filesLength=', files?.length, 'itemsLength=', dt?.items?.length);
    } catch {}

    if (files && files.length) {
      onSelectFile(files);
      return;
    }

    // Fallback: try to get files from dataTransfer.items (some environments put files there)
    const items = dt?.items;
    if (items && items.length) {
      const list: File[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const it = items[i];
          const f = (it as DataTransferItem).getAsFile();
          if (f) list.push(f);
        } catch (e) {
          // ignore
        }
      }
      if (list.length) {
        onSelectFile(list as any as FileList);
        return;
      }
    }

    // nothing usable found
    setError('Nenhum arquivo detectado no drop. Tente arrastar diretamente do Explorador de Arquivos.');
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword && !currentPassword) {
      setError("Informe a senha atual para alterar a senha.");
      return;
    }

    const fd = new FormData();
    if (username) fd.append("username", username);
    if (avatarFile) fd.append("avatar", avatarFile);
    if (newPassword) fd.append("newPassword", newPassword);
    if (currentPassword) fd.append("currentPassword", currentPassword);

    setIsSaving(true);
    try {
      const resp = await api.updateProfile(fd);
      // refresh me
      try {
        const me = await api.me();
        if (onUpdated && me) onUpdated(me);
      } catch {}
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
      onClick={(e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); return; } onClose(); }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="folder-container max-w-md w-full p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="special-elite text-2xl text-stone-900 uppercase">Editar Perfil</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-red-800 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="avatar-input" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Avatar</label>
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-dashed border-2 border-stone-400 p-4 rounded flex items-center gap-4 bg-white ${isDragging ? 'ring-2 ring-red-700 bg-yellow-50' : ''}`}
            >
              <div className="w-16 h-16 bg-stone-100 flex items-center justify-center overflow-hidden rounded-full relative">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onLoad={() => { setPreviewLoaded(true); setPreviewError(null); }}
                    onError={(e) => { console.debug('preview img error', e); setPreviewError('Falha ao carregar pré-visualização'); setPreviewLoaded(false); }}
                  />
                ) : (
                  <span className="text-xs text-stone-500">Sem foto</span>
                )}
                {previewLoaded ? (
                  <div title="Preview carregada" className="absolute top-0 right-0 w-4 h-4 rounded-full bg-green-600 border-2 border-white" />
                ) : previewError ? (
                  <div title={previewError} className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-600 border-2 border-white" />
                ) : avatarFile ? (
                  <div title="Carregando preview" className="absolute top-0 right-0 w-4 h-4 rounded-full bg-yellow-400 border-2 border-white animate-pulse" />
                ) : null}
              </div>
              <div className="flex-1">
                <input id="avatar-input" name="avatar" type="file" accept="image/*" onChange={(ev) => onSelectFile(ev.target.files)} />
                <div className="text-xs text-stone-500 mt-1">Arraste e solte ou clique para selecionar</div>
                {avatarFile ? (
                  <div className="mt-2 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <div>{avatarFile.name} • {(avatarFile.size / 1024).toFixed(0)} KB</div>
                      <button type="button" onClick={removeSelectedFile} className="text-red-700 text-[12px]">Remover</button>
                    </div>
                    {previewError ? <div className="text-red-600 text-[12px] mt-1">{previewError}</div> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="profile-username" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Nome</label>
            <input id="profile-username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full input-classic p-3 text-stone-800" />
          </div>

          <div>
            <label htmlFor="profile-newPassword" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Nova senha (opcional)</label>
            <input id="profile-newPassword" name="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full input-classic p-3 text-stone-800" />
          </div>

          <div>
            <label htmlFor="profile-currentPassword" className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Senha atual (necessária apenas se trocar senha)</label>
            <input id="profile-currentPassword" name="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full input-classic p-3 text-stone-800" />
          </div>

          {error ? <div className="text-red-600 text-sm">{error}</div> : null}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-stone-900 text-white rounded">{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
