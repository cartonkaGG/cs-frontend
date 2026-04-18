"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SiteMoney } from "@/components/SiteMoney";

type Dash = {
  partner: {
    percentBps: number;
    percentDisplay: string;
    totalEarnedConfirmedRub: number;
    totalEarnedPendingRub: number;
    totalPaidOutRub: number;
    usersActivated: number;
    depositsCount: number;
    depositsVolumeRub: number;
  };
  user?: {
    steamId: string | null;
    displayName: string | null;
    username: string | null;
    avatar: string;
  } | null;
  codes: { id: string; code: string; label: string; active: boolean; depositBonusPercent?: number }[];
  earnings: {
    id: string;
    at: string;
    orderId: string;
    netDepositRub: number;
    percentBps: number;
    rewardRub: number;
    status: string;
  }[];
};

type PeriodStats = {
  from: string | null;
  to: string | null;
  series: { day: string; rewardRub: number; netDepositRub: number; count: number }[];
  totals: { rewardRub: number; netDepositRub: number; count: number };
  earnings: Dash["earnings"];
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - n);
  return { from: ymd(from), to: ymd(to) };
}

export default function PartnerDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [period, setPeriod] = useState(() => daysAgo(30));
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      const r = await apiFetch<Dash>("/api/partner/me");
      if (c) return;
      if (!r.ok) setErr(r.error || "Ошибка");
      else setData(r.data || null);
    })();
    return () => {
      c = true;
    };
  }, []);

  const loadStats = useCallback(async (from: string, to: string) => {
    setStatsErr(null);
    setLoadingStats(true);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    const r = await apiFetch<PeriodStats>(`/api/partner/stats${q ? `?${q}` : ""}`);
    setLoadingStats(false);
    if (!r.ok) {
      setStatsErr(r.error || "Ошибка загрузки статистики");
      setStats(null);
      return;
    }
    setStats(r.data || null);
  }, []);

  useEffect(() => {
    void loadStats(period.from, period.to);
  }, [period.from, period.to, loadStats]);

  const maxBar = useMemo(() => {
    const s = stats?.series || [];
    const m = Math.max(1, ...s.map((x) => x.rewardRub));
    return m;
  }, [stats?.series]);

  if (err) {
    return <p className="text-red-300">{err}</p>;
  }
  if (!data?.partner) {
    return <p className="text-zinc-500">Загрузка…</p>;
  }

  const p = data.partner;
  const u = data.user;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-cb-stroke/60 bg-gradient-to-br from-emerald-950/40 via-black/50 to-black/80 p-6 shadow-lg shadow-black/40 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-cb-stroke/70 bg-black/50 ring-2 ring-emerald-500/20">
              {u?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-zinc-600">
                  ?
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
                Партнёрский кабинет
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                {u?.displayName || u?.username || "Партнёр"}
              </h1>
              {u?.steamId ? (
                <p className="mt-0.5 font-mono text-sm text-zinc-500">Steam {u.steamId}</p>
              ) : null}
              <p className="mt-2 text-sm text-zinc-400">
                Ставка:{" "}
                <span className="font-mono font-semibold text-emerald-300">{p.percentDisplay}%</span> от чистого
                депозита (без бонуса по промокоду сайта).
              </p>
            </div>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Сводка (всё время)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Активаций по коду" value={p.usersActivated} />
          <Stat label="Депозитов (счётчик)" value={p.depositsCount} />
          <Stat label="Оборот депозитов" money value={p.depositsVolumeRub} />
          <Stat label="Ожидает одобрения и зачисления" money value={p.totalEarnedPendingRub} />
          <Stat label="Зачислено на баланс (всего)" money value={p.totalPaidOutRub} />
          {p.totalEarnedConfirmedRub > 0 ? (
            <Stat label="Ранее подтверждено (архив)" money value={p.totalEarnedConfirmedRub} />
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-cb-stroke/60 bg-black/30 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Статистика за период
            </h2>
            <p className="mt-1 text-xs text-zinc-600">
              Даты в локальном календаре; график по дням — UTC. Пустой период = всё время.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-[10px] text-zinc-500">
              С
              <input
                type="date"
                className="rounded-lg border border-cb-stroke/70 bg-black/50 px-2 py-1.5 font-mono text-sm text-white"
                value={period.from}
                onChange={(e) => setPeriod((x) => ({ ...x, from: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-[10px] text-zinc-500">
              По
              <input
                type="date"
                className="rounded-lg border border-cb-stroke/70 bg-black/50 px-2 py-1.5 font-mono text-sm text-white"
                value={period.to}
                onChange={(e) => setPeriod((x) => ({ ...x, to: e.target.value }))}
              />
            </label>
            <div className="flex flex-wrap gap-1">
              <Preset label="7 дн." onClick={() => setPeriod(daysAgo(7))} />
              <Preset label="30 дн." onClick={() => setPeriod(daysAgo(30))} />
              <Preset label="90 дн." onClick={() => setPeriod(daysAgo(90))} />
              <button
                type="button"
                className="rounded border border-zinc-600 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-500"
                onClick={() => setPeriod({ from: "", to: "" })}
              >
                Всё время
              </button>
            </div>
          </div>
        </div>

        {statsErr ? <p className="mt-4 text-sm text-red-300">{statsErr}</p> : null}
        {loadingStats ? <p className="mt-4 text-sm text-zinc-500">Загрузка периода…</p> : null}

        {stats ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Начислено за период" money value={stats.totals.rewardRub} />
              <Stat label="Сумма нетто-депозитов" money value={stats.totals.netDepositRub} />
              <Stat label="Событий (начислений)" value={stats.totals.count} />
            </div>

            {stats.series.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  По дням (начисления, ₽)
                </p>
                <div className="mt-3 flex h-36 items-end gap-px overflow-x-auto rounded-xl border border-cb-stroke/50 bg-black/40 px-2 pb-1 pt-4">
                  {stats.series.map((row) => {
                    const h = Math.max(4, Math.round((row.rewardRub / maxBar) * 100));
                    return (
                      <div
                        key={row.day}
                        className="group flex min-w-[10px] max-w-[24px] flex-1 flex-col items-center justify-end"
                        title={`${row.day}: ${row.rewardRub} ₽`}
                      >
                        <div
                          className="w-full min-h-[4px] rounded-t bg-gradient-to-t from-emerald-800/80 to-emerald-400/90 opacity-90 transition group-hover:opacity-100"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-[10px] text-zinc-600">Наведите на столбец для даты и суммы</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">Нет данных за выбранный период.</p>
            )}

            <div className="overflow-x-auto rounded-xl border border-cb-stroke/70">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-cb-stroke/60 bg-black/30 text-[10px] uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">День</th>
                    <th className="px-3 py-2">Начислено</th>
                    <th className="px-3 py-2">Нетто деп.</th>
                    <th className="px-3 py-2">Событий</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.series.map((row) => (
                    <tr key={row.day} className="border-b border-cb-stroke/30">
                      <td className="px-3 py-2 font-mono text-zinc-300">{row.day}</td>
                      <td className="px-3 py-2 font-mono text-emerald-300">
                        <SiteMoney value={row.rewardRub} className="inline text-emerald-300" />
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-400">
                        <SiteMoney value={row.netDepositRub} className="inline text-zinc-400" />
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Детализация начислений за период
              </h3>
              <div className="overflow-x-auto rounded-xl border border-cb-stroke/70">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-cb-stroke/60 bg-black/30 text-[10px] uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Дата</th>
                      <th className="px-3 py-2">Депозит (нетто ₽)</th>
                      <th className="px-3 py-2">%</th>
                      <th className="px-3 py-2">Начисление</th>
                      <th className="px-3 py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.earnings || []).map((e) => (
                      <tr key={e.id} className="border-b border-cb-stroke/40">
                        <td className="px-3 py-2 text-zinc-400">
                          {e.at ? new Date(e.at).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-300">{e.netDepositRub}</td>
                        <td className="px-3 py-2">{(e.percentBps / 100).toFixed(2)}%</td>
                        <td className="px-3 py-2 font-mono text-emerald-300">{e.rewardRub} ₽</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{earningStatusRu(e.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(stats.earnings || []).length >= 500 ? (
                <p className="mt-2 text-xs text-zinc-600">Показаны последние 500 записей за период.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
          Ваши реферальные коды
        </h2>
        <div className="space-y-2">
          {data.codes?.length ? (
            data.codes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cb-stroke/70 bg-black/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="font-mono text-lg text-white">{c.code}</span>
                  {c.label ? <p className="text-xs text-zinc-500">{c.label}</p> : null}
                  {(c.depositBonusPercent ?? 0) > 0 ? (
                    <p className="text-xs text-emerald-200/90">
                      бонус к депозиту при пополнении: {c.depositBonusPercent}%
                    </p>
                  ) : null}
                </div>
                <span className="text-xs text-zinc-500">{c.active ? "активен" : "выкл."}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">Коды выдаёт администратор.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
          Последние начисления (обзор)
        </h2>
        <p className="mb-3 text-xs text-zinc-600">До 80 последних записей без фильтра по датам.</p>
        <div className="overflow-x-auto rounded-xl border border-cb-stroke/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-cb-stroke/60 bg-black/30 text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Дата</th>
                <th className="px-3 py-2">Депозит (нетто ₽)</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">Начисление</th>
                <th className="px-3 py-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {(data.earnings || []).map((e) => (
                <tr key={e.id} className="border-b border-cb-stroke/40">
                  <td className="px-3 py-2 text-zinc-400">{e.at ? new Date(e.at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{e.netDepositRub}</td>
                  <td className="px-3 py-2">{(e.percentBps / 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 font-mono text-emerald-300">{e.rewardRub} ₽</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{earningStatusRu(e.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Preset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-[11px] text-emerald-200/90 hover:bg-emerald-950/50"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function earningStatusRu(status: string) {
  switch (status) {
    case "pending":
      return "ожидает одобрения";
    case "credited":
      return "зачислено на баланс";
    case "confirmed":
      return "подтверждено (архив)";
    case "void":
      return "отменено";
    default:
      return status;
  }
}

function Stat({
  label,
  value,
  money,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cb-stroke/70 bg-black/35 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {money ? <SiteMoney value={value} className="inline text-white" /> : value}
      </p>
    </div>
  );
}
