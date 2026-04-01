"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRub } from "@/lib/money";

type ItemSnap = {
  itemId?: string;
  name?: string;
  image?: string;
  rarity?: string;
  sellPrice?: number;
  dmarketTitle?: string;
  marketHashName?: string;
};

type Withdrawal = {
  id: string;
  status: string;
  userSub: string;
  steamId: string;
  displayName: string;
  tradeUrl: string;
  itemSnapshot: ItemSnap;
  createdAt: string;
  updatedAt: string;
  transferId?: string;
  lastError?: string;
  adminNote?: string;
};

type RowInputs = { marketHashName: string; maxPriceRub: string };

const statusClass: Record<string, string> = {
  pending: "text-amber-300",
  processing: "text-sky-300",
  completed: "text-emerald-300",
  cancelled: "text-zinc-500",
  failed: "text-red-300",
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [marketCsgoConfigured, setMarketCsgoConfigured] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowInputs, setRowInputs] = useState<Record<string, RowInputs>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ withdrawals: Withdrawal[]; marketCsgoConfigured?: boolean }>(
      "/api/admin/withdrawals",
    );
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не вдалося завантажити");
      setWithdrawals([]);
      return;
    }
    const list = Array.isArray(r.data?.withdrawals) ? r.data!.withdrawals : [];
    setWithdrawals(list);
    setMarketCsgoConfigured(Boolean(r.data?.marketCsgoConfigured));
    setRowInputs((prev) => {
      const next = { ...prev };
      for (const w of list) {
        if (next[w.id]) continue;
        const s = w.itemSnapshot || {};
        next[w.id] = {
          marketHashName: String(s.dmarketTitle || s.marketHashName || s.name || "").trim(),
          maxPriceRub: "",
        };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => withdrawals.filter((w) => w.status === "pending").length, [withdrawals]);

  async function approve(w: Withdrawal) {
    const inputs = rowInputs[w.id] || { marketHashName: "", maxPriceRub: "" };
    setBusyId(w.id);
    setErr(null);
    const maxRaw = inputs.maxPriceRub.trim();
    const body: Record<string, unknown> = {
      action: "approve",
      marketHashName: inputs.marketHashName.trim(),
    };
    if (maxRaw !== "") {
      const n = Number(maxRaw.replace(",", "."));
      if (Number.isFinite(n) && n > 0) body.maxPriceRub = n;
    }
    const r = await apiFetch<{ withdrawal?: Withdrawal; error?: string }>(`/api/admin/withdrawals/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Помилка");
      await load();
      return;
    }
    await load();
  }

  async function cancel(w: Withdrawal) {
    if (!window.confirm("Скасувати заявку?")) return;
    setBusyId(w.id);
    setErr(null);
    const r = await apiFetch(`/api/admin/withdrawals/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Помилка");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Вивід скінів (Market.csgo)</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Підтвердження викликає <span className="font-mono text-zinc-400">GET /api/v2/buy-for</span> з вашого
            акаунта market.csgo: купівля найдешевшого лоту за <span className="font-mono">market_hash_name</span> і
            відправка на trade URL гравця. Параметр <span className="font-mono">price</span> — максимум у копійках; якщо
            біржа пише «не знайдено за ціною» — збільшіть <span className="font-semibold text-zinc-300">Макс. ціна ₽</span>{" "}
            (прайс на сайті часто нижчий за реальний ордербук). Потрібен баланс на маркеті та{" "}
            <span className="font-mono">MARKET_CSGO_API_KEY</span> у .env. Ліміт API: не більше 5 запитів/с. Якщо біржа
            пише про закритий інвентар — у гравця в Steam має бути{" "}
            <span className="font-semibold text-zinc-300">відкритий</span> інвентар CS (Public).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-white disabled:opacity-50"
        >
          {loading ? "…" : "Оновити"}
        </button>
      </div>

      {!marketCsgoConfigured ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
          Market.csgo не налаштовано: додайте <span className="font-mono">MARKET_CSGO_API_KEY</span> у backend .env
          (ключ з розділу Creating an API key) і перезапустіть сервер.
        </p>
      ) : null}

      {pendingCount > 0 ? (
        <p className="text-xs text-zinc-500">
          Очікують: <span className="font-mono text-amber-200">{pendingCount}</span>
        </p>
      ) : null}

      {err ? (
        <p className="rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm text-red-300">{err}</p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-cb-stroke bg-cb-panel/40">
        <table className="w-full min-w-[1100px] text-left text-[12px]">
          <thead className="border-b border-cb-stroke bg-black/50 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Час</th>
              <th className="px-3 py-2.5">Статус</th>
              <th className="px-3 py-2.5">Гравець</th>
              <th className="px-3 py-2.5">Предмет</th>
              <th className="px-3 py-2.5">Trade URL</th>
              <th className="px-3 py-2.5">Market hash / макс. ₽</th>
              <th className="px-3 py-2.5">Дії</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-zinc-600">
                  Заявок ще немає.
                </td>
              </tr>
            ) : null}
            {withdrawals.map((w) => {
              const snap = w.itemSnapshot || {};
              const inputs = rowInputs[w.id] || { marketHashName: "", maxPriceRub: "" };
              const busy = busyId === w.id;
              return (
                <tr key={w.id} className="border-b border-cb-stroke/40 align-top">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500">
                    {w.createdAt?.replace("T", " ").slice(0, 19) || "—"}
                  </td>
                  <td className={`px-3 py-2.5 font-semibold ${statusClass[w.status] || "text-zinc-400"}`}>
                    {w.status}
                    {w.transferId ? (
                      <div className="mt-1 font-mono text-[10px] font-normal text-zinc-500">
                        id лоту: {w.transferId}
                      </div>
                    ) : null}
                    {w.lastError ? (
                      <div className="mt-1 max-w-[200px] text-[10px] font-normal text-red-400/90">{w.lastError}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    <div className="max-w-[140px] truncate font-medium">{w.displayName || "—"}</div>
                    <div className="font-mono text-[10px] text-zinc-600">{w.steamId || w.userSub}</div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    <div className="max-w-[180px] font-medium leading-tight">{snap.name || "—"}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-cb-flame/90">
                      {formatRub(Number(snap.sellPrice) || 0)} ₽
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={w.tradeUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[200px] break-all text-sky-400 hover:text-sky-300"
                    >
                      {w.tradeUrl ? "Посилання" : "—"}
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    {w.status === "pending" ? (
                      <div className="flex flex-col gap-1">
                        <input
                          placeholder="AK-47 | Redline (Field-Tested)"
                          value={inputs.marketHashName}
                          onChange={(e) =>
                            setRowInputs((prev) => ({
                              ...prev,
                              [w.id]: { ...inputs, marketHashName: e.target.value },
                            }))
                          }
                          className="w-full max-w-[240px] rounded border border-cb-stroke/70 bg-black/50 px-2 py-1 font-mono text-[10px] text-zinc-200"
                        />
                        <input
                          placeholder="Макс. ціна ₽ (реком.+15–40%)"
                          value={inputs.maxPriceRub}
                          onChange={(e) =>
                            setRowInputs((prev) => ({
                              ...prev,
                              [w.id]: { ...inputs, maxPriceRub: e.target.value },
                            }))
                          }
                          className="w-full max-w-[140px] rounded border border-cb-stroke/70 bg-black/50 px-2 py-1 font-mono text-[10px] text-zinc-200"
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {snap.marketHashName || inputs.marketHashName || snap.name || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {w.status === "pending" ? (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={busy || !marketCsgoConfigured}
                          onClick={() => void approve(w)}
                          className="rounded-lg border border-emerald-600/50 bg-emerald-950/30 px-2 py-1.5 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-900/40 disabled:opacity-40"
                        >
                          {busy ? "…" : "Підтвердити"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void cancel(w)}
                          className="rounded-lg border border-zinc-600 bg-black/40 px-2 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                        >
                          Скасувати
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
