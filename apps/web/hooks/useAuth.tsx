"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  getToken,
  getUser as getStoredUser,
  clearSession,
  AuthUser,
} from "@/services/api";

export default function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function login(email: string, password: string) {
    const auth = await api.login({ email, password });
    // Persist handled by api.saveSession in caller if desired; keep sync with storage
    if (typeof window !== "undefined") {
      localStorage.setItem("detetive_access_token", auth.accessToken);
      localStorage.setItem("detetive_user", JSON.stringify(auth.user));
      document.cookie = `detetive_access_token=${auth.accessToken}; path=/; max-age=604800; SameSite=Lax`;
    }
    setUser(auth.user);
    return auth;
  }

  async function register(username: string, email: string, password: string) {
    const auth = await api.register({ username, email, password });
    if (typeof window !== "undefined") {
      localStorage.setItem("detetive_access_token", auth.accessToken);
      localStorage.setItem("detetive_user", JSON.stringify(auth.user));
      document.cookie = `detetive_access_token=${auth.accessToken}; path=/; max-age=604800; SameSite=Lax`;
    }
    setUser(auth.user);
    return auth;
  }

  function logout(redirect = "/login") {
    clearSession();
    setUser(null);
    try {
      router.push(redirect);
    } catch {
      // ignore server-side routing errors
    }
  }

  return {
    user,
    token: getToken(),
    login,
    register,
    logout,
  } as const;
}
