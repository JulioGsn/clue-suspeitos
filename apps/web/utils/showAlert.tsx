"use client";
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '@/components/Modal';

type ShowOpts = { title?: string };

let mounted = false;
let resolver: (() => void) | null = null;

function AlertHost() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    // expose a function that other code can call via window.showAppAlert
    (window as any).showAppAlert = async (msg: string, opts: ShowOpts = {}) => {
      return new Promise<void>((resolve) => {
        setMessage(msg || '');
        setTitle(opts.title);
        resolver = () => resolve();
        setOpen(true);
      });
    };

    return () => {
      try { delete (window as any).showAppAlert; } catch (e) {}
    };
  }, []);

  function close() {
    setOpen(false);
    if (resolver) {
      try { resolver(); } catch (e) {}
      resolver = null;
    }
  }

  return (
    <Modal isOpen={open} onClose={close} title={title ?? 'Aviso'}>
      <div className="text-sm whitespace-pre-wrap">{message}</div>
      <div className="mt-4 flex justify-end">
        <button onClick={close} className="bg-stone-800 text-white px-3 py-1 rounded">Ok</button>
      </div>
    </Modal>
  );
}

export function installShowAlert() {
  if (typeof window === 'undefined') return;
  if (mounted) return;
  try {
    const id = 'show-alert-root';
    if (!document.getElementById(id)) {
      const container = document.createElement('div');
      container.id = id;
      document.body.appendChild(container);
      const root = createRoot(container);
      root.render(React.createElement(AlertHost));
    }
    mounted = true;
  } catch (e) {
    // ignore failures; fall back to native alert
  }
}

export function uninstallShowAlert() {
  if (typeof window === 'undefined') return;
  try {
    const id = 'show-alert-root';
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    try { delete (window as any).showAppAlert; } catch (e) {}
  } catch (e) {}
  mounted = false;
}

export default installShowAlert;
