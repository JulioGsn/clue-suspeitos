import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get('detetive_access_token')?.value;

  // Redirect unauthenticated users accessing root or /home to /login
  if (pathname === '/' || pathname === '/home') {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // If user is already authenticated, prevent access to login/register
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (token) {
      const url = req.nextUrl.clone();
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/home', '/login', '/register'],
};
