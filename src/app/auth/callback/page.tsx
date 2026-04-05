"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { setToken } from "@/lib/api";

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState("Вход…");

  useEffect(() => {
    const err = search.get("error");
    const token = search.get("token");

    if (err) {
      if (err === "legal_required") {
        setMsg("Нужно принять пользовательское соглашение, политику конфиденциальности и политику Cookie на сайте, затем войти снова.");
      } else {
        setMsg("Ошибка Steam. Попробуйте ещё раз.");
      }
      window.localStorage.removeItem("cd_next");
      setTimeout(() => router.replace("/"), 3200);
      return;
    }
    if (token) {
      setToken(token);
      const next = window.localStorage.getItem("cd_next");
      window.localStorage.removeItem("cd_next");
      router.replace(next || "/");
      return;
    }
    setMsg("Нет токена. Перейдите на главную.");
    window.localStorage.removeItem("cd_next");
    setTimeout(() => router.replace("/"), 2000);
  }, [router, search]);

  return (
    <SiteShell>
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-16 text-zinc-300">
        <p className="text-center">{msg}</p>
      </div>
    </SiteShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <SiteShell>
          <div className="flex min-h-[50vh] items-center justify-center px-4 py-16 text-zinc-300">
            Загрузка…
          </div>
        </SiteShell>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
