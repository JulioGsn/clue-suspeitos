"use client";
import React from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative rounded-lg shadow-lg max-w-lg w-full mx-4 p-6"
        style={{
          backgroundColor: '#fffdf6',
          backgroundImage: "url('https://www.transparenttextures.com/patterns/paper.png')",
          backgroundRepeat: 'repeat',
          color: '#111827',
          border: '1px solid rgba(0,0,0,0.06)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <button onClick={onClose} className="text-stone-800 hover:text-stone-900">Fechar</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
