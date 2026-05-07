"use client";
import Link from "next/link";
import React from "react";

type HeaderProps = { children?: React.ReactNode };

export default function Header({ children }: HeaderProps) {
  return (
    <header className="w-full bg-white border-b shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-600">Clue Suspeitos</Link>
        <nav className="flex items-center gap-3">{children}</nav>
      </div>
    </header>
  );
}
