"use client";

import React, { FormEvent, useRef, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/services/api";
import useAuth from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folderRef = useRef<HTMLDivElement | null>(null);

  const { register } = useAuth();

  function onMouseMove(e: React.MouseEvent) {
    if (!folderRef.current) return;
    const rect = folderRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / 50;
    const y = (e.clientY - (rect.top + rect.height / 2)) / 50;
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
      await register(username, email, password);
      router.push("/home");
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Nao foi possivel criar a conta agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--clue-dark)] text-[#111827] flex items-center justify-center">
      <div className="fixed top-0 left-0 w-full h-10 crime-tape flex items-center justify-center z-50 border-b-2 border-black">
        <span className="text-white font-bold tracking-[0.3em] text-sm uppercase px-4">REGISTRO DE RECRUTA - CONFIDENCIAL - CLUE SUSPEITOS</span>
      </div>

      <div className="w-full px-4 py-8 flex items-center justify-center">
        <div className="folder-container mx-auto w-full max-w-7xl p-12 md:p-20" ref={folderRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
          {/* Clipe de papel visual */}
          <div className="absolute -top-6 left-1/4 w-10 h-24 bg-zinc-400 rounded-full opacity-40 border-4 border-zinc-500 pointer-events-none hidden md:block"></div>

          
          <div className="flex flex-col md:flex-row gap-12 items-stretch">
            <div className="flex-1 md:w-1/2 flex flex-col justify-center order-2 md:order-1">
              <div className="mb-6">
                <h1 className="special-elite text-4xl md:text-5xl text-stone-900 leading-tight mb-2 uppercase italic underline">Formulário de<br/>Alistamento</h1>
                <div className="h-1 w-32 bg-red-800" />
              </div>

              <div className="space-y-6 text-stone-700 text-base">
                <section>
                  <h3 className="font-bold text-stone-900 uppercase text-base mb-1">I. Juramento do Investigador</h3>
                  <p className="italic">"Prometo usar minhas habilidades para encontrar o culpado, o local e a arma, sem jamais ignorar uma evidência."</p>
                </section>
                <section>
                  <h3 className="font-bold text-stone-900 uppercase text-base mb-1">II. Responsabilidades</h3>
                  <ul className="list-disc list-inside space-y-1 text-base">
                    <li>Criar salas de interrogatório seguras.</li>
                    <li>Identificar blefes de outros agentes.</li>
                    <li>Manter sigilo sobre os suspeitos principais.</li>
                  </ul>
                </section>

                <div className="mt-10 flex items-center space-x-4">
                  <div className="stamp-blue inline-block text-2xl special-elite">APROVADO</div>
                  <div className="text-base text-stone-400 font-bold uppercase w-40">Agência de Investigação Federal</div>
                </div>
              </div>
            </div>

            <div className="flex-1 md:w-1/2 flex items-center justify-center order-1 md:order-2">
              <div className="enlistment-card p-8 relative bg-white border-dashed border-gray-300 shadow-lg w-full max-w-md">
                <div className="absolute -top-3 -right-3 bg-red-700 text-white text-xs font-bold px-2 py-1 urgent-tag shadow-lg uppercase">Urgente</div>

                <div className="mb-6 border-b border-stone-200 pb-2">
                  <span className="special-elite text-2xl text-stone-800">DADOS DO RECRUTA</span>
                </div>

                <form id="signup-form" className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Nome de Agente (Apelido)</label>
                    <input type="text" id="nickname" required className="input-field w-full" placeholder="Ex: Inspetor_Morse" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">E-mail para Contato</label>
                    <input type="email" id="email" required className="input-field w-full" placeholder="agente@agencia.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Senha</label>
                      <input type="password" id="password" required className="input-field w-full" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Confirmar</label>
                      <input type="password" id="confirm-password" required className="input-field w-full" placeholder="••••••••" />
                    </div>
                  </div>

                  {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</div> : null}

                  <div className="pt-4">
                    <button type="submit" className="w-full bg-red-900 text-white py-4 px-4 font-bold special-elite hover:bg-stone-900 transition-all duration-300 shadow-xl active:transform active:scale-95" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> : null}
                      ASSINAR E ALISTAR-SE
                    </button>
                  </div>
                </form>

                <div className="mt-6 text-center text-sm text-stone-400 font-bold uppercase">Já possui credenciais? <Link href="/login" className="text-stone-800 hover:underline">Retornar ao Login</Link></div>
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
