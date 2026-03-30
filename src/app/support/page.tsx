"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken, steamLoginUrl } from "@/lib/api";

type TicketSummary = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
};

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [list, setList] = useState<TicketSummary[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!getToken()) {
      setList([]);
      return;
    }
    const r = await apiFetch<{ tickets: TicketSummary[] }>("/api/support/tickets");
    if (!r.ok) {
      setListErr(r.error || "Не вдалося завантажити звернення");
      return;
    }
    setList(r.data?.tickets || []);
    setListErr(null);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!getToken()) {
      window.location.href = steamLoginUrl();
      return;
    }
    setBusy(true);
    const r = await apiFetch<{ ticket?: { id: string } }>("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Помилка");
      return;
    }
    setOk("Звернення надіслано. Ми відповімо в цьому ж треді.");
    setSubject("");
    setMessage("");
    await loadTickets();
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-10 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Підтримка</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Опишіть проблему — команда перегляне звернення в панелі підтримки.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-cb-stroke bg-cb-panel/30 p-6">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Тема</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-cb-stroke bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/55"
              placeholder="Коротко, про що звернення"
              maxLength={200}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Опис</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-xl border border-cb-stroke bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/55"
              placeholder="Деталі, скріншоти можна описати текстом"
              maxLength={8000}
              required
            />
          </label>
          {err && <p className="text-sm text-red-300">{err}</p>}
          {ok && <p className="text-sm text-sky-300/90">{ok}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/30 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Надсилаємо…" : "Надіслати"}
          </button>
        </form>

        <div className="rounded-2xl border border-cb-stroke/80 bg-black/20 p-6">
          <h2 className="text-lg font-bold text-white">Мої звернення</h2>
          {!getToken() ? (
            <p className="mt-3 text-sm text-zinc-500">Увійдіть через Steam, щоб бачити історію.</p>
          ) : listErr ? (
            <p className="mt-3 text-sm text-red-300">{listErr}</p>
          ) : list.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Поки порожньо.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-cb-stroke/60 bg-cb-panel/25 px-4 py-3 text-sm transition hover:border-sky-500/40 hover:bg-cb-panel/40"
                  >
                    <span className="font-medium text-zinc-200">{t.subject}</span>
                    <span className="text-xs text-zinc-500">
                      {t.status === "open" ? (
                        <span className="text-sky-400">відкрите</span>
                      ) : (
                        <span className="text-zinc-500">закрите</span>
                      )}{" "}
                      · {new Date(t.updatedAt).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
