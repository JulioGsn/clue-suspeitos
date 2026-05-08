"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function RequireAuthRoot() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.me();
        if (!me) {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return null;
}
