import LobbyClient from './LobbyClient';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

type PageProps = { params: { id: string } };

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

export default async function Page({ params }: PageProps) {
  const id = params.id;
  const cookieHeader = headers().get('cookie') || '';

  const res = await fetch(`${API_URL}/partidas/${id}`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });

  if (res.status === 401) {
    redirect('/login');
  }

  if (res.status === 404) {
    redirect('/home');
  }

  if (!res.ok) {
    // fallback: redirect to home
    redirect('/home');
  }

  const partida = await res.json();

  return <LobbyClient partidaId={id} initialPartida={partida} />;
}
