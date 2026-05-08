import {
  ArrowRight,
  Bot,
  Fingerprint,
  LockKeyhole,
  NotebookTabs,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const highlights = [
  { title: "JWT", detail: "Login e cadastro conectados", Icon: ShieldCheck },
  { title: "Lobby", detail: "Criar, entrar e iniciar salas", Icon: Users },
  { title: "Bots", detail: "Slots de bot para testar partidas", Icon: Bot },
];

export default function Home() {
  const tokenCookie = cookies().get('detetive_access_token');
  if (tokenCookie && tokenCookie.value) {
    // If server-side cookie exists, redirect to the authenticated dashboard route
    // The dashboard UI lives under the 'home' route (grouped under (dashboard)), so use '/home'
    redirect('/home');
  }
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.18),transparent_32rem),linear-gradient(135deg,#10261c,#1a3b2b_42%,#2c1e16)] text-noir-paper">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-5 py-8 md:grid-cols-[1.02fr_0.98fr] md:px-8 lg:px-10">
        <div className="flex min-h-[42rem] flex-col justify-between">
          <nav className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-noir-gold/40 bg-black/20">
                <Fingerprint className="h-5 w-5 text-noir-gold" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-noir-paper/75">
                Arquivo Secreto
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-noir-paper/15 px-3 text-sm font-semibold text-noir-paper/85 transition hover:border-noir-gold/70 hover:text-noir-gold"
            >
              <LockKeyhole className="h-4 w-4" />
              Entrar
            </Link>
          </nav>

          <div className="max-w-2xl py-16 md:py-20">
            <p className="mb-5 inline-flex items-center gap-2 rounded-md border border-noir-orange/30 bg-noir-orange/10 px-3 py-2 text-sm font-semibold text-orange-200">
              <Search className="h-4 w-4" />
              Dedução multiplayer por turnos
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] text-noir-paper md:text-7xl">
              Detetive: Arquivo Secreto
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-noir-paper/72">
              Interface inicial para autenticação, salas e lobby do jogo,
              pronta para consumir a API NestJS com JWT e evoluir para o fluxo
              em tempo real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-noir-orange px-5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-orange-500"
              >
                Criar investigador
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/home"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-noir-paper/18 bg-noir-paper/8 px-5 text-sm font-bold text-noir-paper transition hover:border-noir-gold/70"
              >
                Ver salas
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {highlights.map(({ title, detail, Icon }) => (
              <div
                key={title}
                className="rounded-md border border-white/10 bg-black/18 p-4 backdrop-blur"
              >
                <Icon className="mb-4 h-5 w-5 text-noir-gold" />
                <h2 className="text-sm font-bold text-noir-paper">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-noir-paper/62">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center pb-8 md:pb-0">
          <div className="relative aspect-[4/5] w-full max-w-[34rem]">
            <div className="absolute inset-0 rounded-[2rem] border border-noir-gold/20 bg-[linear-gradient(160deg,rgba(244,238,220,0.16),rgba(244,238,220,0.04))] p-5 shadow-2xl shadow-black/35">
              <div className="h-full rounded-xl border border-black/30 bg-[#122319] p-4">
                <div className="flex h-full flex-col justify-between rounded-lg border border-noir-gold/30 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.14),transparent_18rem),#163523] p-5">
                  <div className="flex items-center justify-between">
                    <div className="rounded-md bg-noir-paper px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-noir-red">
                      Confidencial
                    </div>
                    <NotebookTabs className="h-6 w-6 text-noir-gold" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {["Suspeito", "Arma", "Local"].map((label) => (
                      <div
                        key={label}
                        className="flex aspect-[2/3] flex-col justify-between rounded-md border border-noir-wood/40 bg-noir-paper p-3 text-noir-wood shadow-lg"
                      >
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-noir-red">
                          {label}
                        </span>
                        <div className="grid place-items-center">
                          <Search className="h-8 w-8 text-noir-orange" />
                        </div>
                        <span className="h-2 rounded-full bg-noir-gold/70" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {[
                      "Green perguntou sobre Faca e Cozinha.",
                      "Plum mostrou uma prova em segredo.",
                      "Scarlet marcou uma suspeita no bloco.",
                    ].map((line) => (
                      <div
                        key={line}
                        className="rounded-md border border-white/8 bg-black/20 px-3 py-2 text-sm text-noir-paper/72"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
