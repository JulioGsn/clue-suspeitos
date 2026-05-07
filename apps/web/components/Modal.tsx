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
      <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Fechar</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
