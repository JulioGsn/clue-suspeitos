"use client";
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '@/components/Modal';

type ShowOpts = { title?: string };

let mounted = false;
let resolver: ((v: boolean) => void) | null = null;

function ConfirmHost() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    (window as any).showAppConfirm = async (msg: string, opts: ShowOpts = {}) => {
      return new Promise<boolean>((resolve) => {
        setMessage(msg || '');
        setTitle(opts.title);
        resolver = (v: boolean) => resolve(v);
        setOpen(true);
      });
    };

    return () => {
      try { delete (window as any).showAppConfirm; } catch (e) {}
    };
  }, []);

  function close() {
    setOpen(false);
    if (resolver) {
      try { resolver(false); } catch (e) {}
      resolver = null;
    }
  }

  function confirm() {
    setOpen(false);
    if (resolver) {
      try { resolver(true); } catch (e) {}
      resolver = null;
    }
  }

  return (
    <Modal isOpen={open} onClose={close} title={title ?? 'Confirmação'}>
      <div className="text-sm whitespace-pre-wrap">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={close} className="bg-stone-400 text-white px-3 py-1 rounded">Cancelar</button>
        <button onClick={confirm} className="bg-red-800 text-white px-3 py-1 rounded">Confirmar</button>
      </div>
    </Modal>
  );
}

export function installShowConfirm() {
  if (typeof window === 'undefined') return;
  if (mounted) return;
  try {
    const id = 'show-confirm-root';
    if (!document.getElementById(id)) {
      const container = document.createElement('div');
      container.id = id;
      document.body.appendChild(container);
      const root = createRoot(container);
      root.render(React.createElement(ConfirmHost));
    }
    mounted = true;
  } catch (e) {
    // ignore failures
  }
}

export default installShowConfirm;
