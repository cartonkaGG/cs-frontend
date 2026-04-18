"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerLevelHudOrb } from "@/components/PartnerLevelHudOrb";

type FaqRow = { id: string; question: string; answer: string };

function PlusMinusIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-[10px] w-[10px] items-center justify-center" aria-hidden>
      <span className="absolute h-0.5 w-2.5 rounded-full bg-current" />
      {!open ? <span className="absolute h-2.5 w-0.5 rounded-full bg-current" /> : null}
    </span>
  );
}

export function PartnerFaqAccordion() {
  const baseId = useId();
  const [items, setItems] = useState<FaqRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Какой подпункт раскрыт; повторный клик по той же строке закрывает. */
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ items: FaqRow[] }>("/api/partner/faq");
    setLoading(false);
    if (!r.ok) {
      if (r.status === 404) {
        setErr(
          "Ошибка 404: маршрут /api/partner/faq не найден. Обычно это значит, что фронт обращается не к бекенду: проверьте .env — " +
            "NEXT_PUBLIC_API_URL=http://127.0.0.1:4000, либо задайте BACKEND_PROXY_URL=http://127.0.0.1:4000 и тогда NEXT_PUBLIC_API_URL=http://localhost:3000 (см. cs-frontend/.env.example). " +
            "Убедитесь, что сервер Node запущен и после обновления кода перезапущен."
        );
      } else if (r.status === 503) {
        setErr(r.error || "Справка временно недоступна (нет MongoDB или сервер не готов).");
      } else if (r.status === 403) {
        setErr(r.error || "Нет доступа к разделу партнёра.");
      } else if (r.status === 0) {
        setErr("Нет связи с API — проверьте, что бекенд запущен на порту из NEXT_PUBLIC_API_URL.");
      } else {
        setErr(r.error || "Не удалось загрузить");
      }
      setItems([]);
      return;
    }
    setItems(r.data?.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#050505] p-5 sm:p-6">
      <div className="mb-6 space-y-4">
        <div>
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Уровни</p>
          <div className="flex min-w-0 items-end justify-center gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <PartnerLevelHudOrb key={n} level={n} />
            ))}
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Ответы на вопросы</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-10 text-sm text-zinc-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          Загрузка…
        </div>
      ) : err ? (
        <p className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">{err}</p>
      ) : !items?.length ? (
        <p className="rounded-xl border border-dashed border-white/[0.1] bg-zinc-950/80 px-4 py-8 text-center text-sm text-zinc-500">
          Пока нет подпунктов. Администратор может добавить их в админ-панели: «F.A.Q партнеров».
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5 sm:gap-3" role="list">
          {items.map((row) => {
            const open = openId === row.id;
            const panelId = `${baseId}-panel-${row.id}`;
            const headerId = `${baseId}-header-${row.id}`;
            return (
              <li key={row.id} className="overflow-hidden rounded-xl bg-[#1c1c1c] ring-1 ring-white/[0.06]">
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId((prev) => (prev === row.id ? null : row.id))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03] sm:px-5 sm:py-4"
                >
                  <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-white">
                    {row.question}
                  </span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-zinc-200 transition ${
                      open
                        ? "border-zinc-500 bg-zinc-800/90"
                        : "border-zinc-600 bg-zinc-900/80 hover:border-zinc-500"
                    }`}
                    aria-hidden
                  >
                    <PlusMinusIcon open={open} />
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-white/[0.06] bg-black/25 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{row.answer}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-center text-xs text-zinc-600">
        Нужна персональная помощь?{" "}
        <Link href="/support" className="font-medium text-cb-flame/95 underline-offset-2 hover:underline">
          Центр поддержки
        </Link>
      </p>
    </div>
  );
}
