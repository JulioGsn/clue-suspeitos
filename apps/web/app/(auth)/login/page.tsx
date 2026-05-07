"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Fingerprint, Loader2, Mail, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, api, saveSession } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const auth = await api.login({ email, password });
      saveSession(auth);
      router.push("/home");
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Nao foi possivel entrar agora.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#10261c] text-noir-paper lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden border-r border-white/10 bg-[linear-gradient(150deg,#1a3b2b,#2c1e16)] p-10 lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/"
          className="flex w-fit items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-noir-paper/75"
        >
          <span className="grid h-10 w-10 place-items-center rounded-md border border-noir-gold/40 bg-black/20">
            <Fingerprint className="h-5 w-5 text-noir-gold" />
          </span>
          Arquivo Secreto
        </Link>
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-md border border-noir-gold/30 bg-noir-gold/10 px-3 py-2 text-sm font-semibold text-yellow-100">
            <Shield className="h-4 w-4" />
            Acesso do investigador
          </p>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight">
            Entre para consultar salas e preparar a próxima investigação.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-noir-paper/65">
            O token JWT retornado pela API fica disponível para as próximas
            chamadas de lobby e partida.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Suspeitos", "Armas", "Locais"].map((item) => (
            <div
              key={item}
              className="rounded-md border border-white/10 bg-black/20 p-4 text-sm font-semibold text-noir-paper/80"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link
              href="/"
              className="flex w-fit items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-noir-paper/75"
            >
              <Fingerprint className="h-5 w-5 text-noir-gold" />
              Arquivo Secreto
            </Link>
          </div>

          <div className="rounded-lg border border-white/10 bg-noir-paper p-6 text-[#1b1a16] shadow-2xl shadow-black/25 sm:p-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-noir-orange">
                Login
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Retomar investigação
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#615845]">
                Use as credenciais cadastradas na API NestJS.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-[#2c1e16]">
                  Email
                </span>
                <span className="mt-2 flex h-12 items-center gap-2 rounded-md border border-[#d7cab0] bg-white px-3 focus-within:border-noir-orange">
                  <Mail className="h-4 w-4 text-[#8d8066]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[#2c1e16]">
                  Senha
                </span>
                <span className="mt-2 flex h-12 items-center gap-2 rounded-md border border-[#d7cab0] bg-white px-3 focus-within:border-noir-orange">
                  <Shield className="h-4 w-4 text-[#8d8066]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md text-[#8d8066] hover:bg-[#f1eadb]"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </span>
              </label>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-noir-orange px-5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Entrar
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#615845]">
              Novo no caso?{" "}
              <Link
                href="/register"
                className="font-bold text-noir-red underline-offset-4 hover:underline"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
