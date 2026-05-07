"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/services/api";

export default function RequireAuthRoot() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
