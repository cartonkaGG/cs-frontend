"use client";

import { useEffect, useState } from "react";
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
  codes: { id: string; code: string; label: string; active: boolean }[];
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

export default function PartnerDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
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

  if (err) {
    return <p className="text-red-300">{err}</p>;
  }
  if (!data?.partner) {
    return <p className="text-zinc-500">Загрузка…</p>;
  }

  const p = data.partner;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Статистика</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ваша ставка: <span className="font-mono text-emerald-300">{p.percentDisplay}%</span> от чистого
          депозита (без бонуса по промокоду сайта).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Активаций по коду" value={p.usersActivated} />
        <Stat label="Депозитов (счётчик)" value={p.depositsCount} />
        <Stat
          label="Оборот депозитов"
          money
          value={p.depositsVolumeRub}
        />
        <Stat label="Ожидает одобрения и зачисления" money value={p.totalEarnedPendingRub} />
        <Stat label="Зачислено на баланс (всего)" money value={p.totalPaidOutRub} />
        {p.totalEarnedConfirmedRub > 0 ? (
          <Stat label="Ранее подтверждено (архив)" money value={p.totalEarnedConfirmedRub} />
        ) : null}
      </div>

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
                <span className="font-mono text-lg text-white">{c.code}</span>
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
          История начислений
        </h2>
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
      </div>
    </div>
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
