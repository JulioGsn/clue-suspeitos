"use client";

import React, { FormEvent, useRef, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/services/api";
import useAuth from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folderRef = useRef<HTMLDivElement | null>(null);

  const { login } = useAuth();

  function onMouseMove(e: React.MouseEvent) {
    if (!folderRef.current) return;
    const rect = folderRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2 - e.clientX) / 40;
    const y = (rect.top + rect.height / 2 - e.clientY) / 40;
    try { folderRef.current.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${-y}deg)`; } catch {}
  }

  function onMouseLeave() {
    try { if (folderRef.current) folderRef.current.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)"; } catch {}
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/home");
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Nao foi possivel entrar agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--clue-dark)] text-[#111827] flex items-center justify-center">
      <div className="fixed top-0 left-0 w-full h-10 crime-tape flex items-center justify-center z-50 border-b-2 border-black">
        <span className="text-white font-bold tracking-[0.3em] text-sm uppercase px-4">CENA DO CRIME - NÃO ULTRAPASSE - CLUE SUSPEITOS - ARQUIVO DIGITAL</span>
      </div>

      <div className="w-full px-4 py-8 flex items-center justify-center">
        <div className="folder-container mx-auto w-full max-w-7xl p-12 md:p-20" ref={folderRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
          {/* Clipe de papel visual */}
          <div className="absolute -top-6 left-1/4 w-10 h-24 bg-zinc-400 rounded-full opacity-40 border-4 border-zinc-500 pointer-events-none hidden md:block"></div>

          {/* Marca de Café Decorativa */}
          <div className="absolute bottom-11 left-10 w-28 h-28 border-4 border-stone-800 rounded-full opacity-5 pointer-events-none"></div>
          <div className="flex flex-col md:flex-row gap-12 items-stretch">
            <div className="flex-1 md:w-1/2 flex flex-col justify-center">
              <div className="mb-6">
                <h1 className="special-elite text-5xl text-stone-900 leading-tight mb-2 uppercase">Acesso<br/>Restrito</h1>
                <div className="h-1 w-28 bg-stone-800" />
              </div>
              <div className="space-y-4 text-stone-700 text-base italic">
                <p><strong>CENTRAL DE CASOS:</strong> Acesse este terminal para organizar novas partidas ou juntar-se a investigações em andamento.</p>
                <p><strong>AVISO:</strong> Cada movimento é registrado. A falsificação de pistas resultará em banimento imediato da agência.</p>
              </div>
              <div className="mt-12">
                <div className="stamp inline-block text-2xl special-elite">TOP SECRET</div>
              </div>
            </div>

            <div className="flex-1 md:w-1/2 flex items-center justify-center">
              <div className="confidential-card p-8 shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-base font-bold text-stone-500 uppercase">Credenciais do Agente</span>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-600 alert-dot" />
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  </div>
                </div>

                <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">E-mail de Registro</label>
                    <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field w-full" placeholder="agente@investigacao.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Código de Segurança</label>
                    <input type="password" id="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field w-full" placeholder="••••••••" />
                  </div>

                  {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</div> : null}

                  <button type="submit" className="w-full bg-black text-white py-4 px-4 font-bold special-elite hover:bg-neutral-900 transition-colors duration-300 shadow-md active:transform active:scale-95" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> : null}
                    ACESSAR CENTRAL DE CASOS
                  </button>
                </form>

                <div className="mt-6 flex justify-between items-center text-sm text-stone-400 font-bold uppercase">
                  <Link href="/register" className="hover:text-stone-700">Novo Alistamento</Link>
                  <a href="#" className="hover:text-stone-700 underline">Recuperar Código</a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-10 crime-tape flex items-center justify-center z-50 border-t-2 border-black">
        <span className="text-white font-bold tracking-[0.2em] text-sm uppercase px-4">SUSPEITOS PRINCIPAIS: JALES MONTEIRO - JÚLIO GOMES - [DESCONHECIDO]</span>
      </div>
    </div>
  );
}
