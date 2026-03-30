"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";
import { formatRub } from "@/lib/money";
import { requestAuthModal } from "@/lib/authModal";

type InvItem = {
  itemId: string;
  name: string;
  image?: string;
  rarity?: string;
  sellPrice: number;
  caseSlug?: string;
};

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  rarity: string;
  image: string | null;
};

type HistRow = {
  at: string;
  win: boolean;
  chancePct: number;
  roll: number;
  threshold: number;
  inputSum: number;
  targetPrice: number;
  targetName: string;
};

function normRarityBar(r: string) {
  const k = String(r || "common").toLowerCase();
  if (k.includes("covert") || k.includes("extraordinary")) return "bg-red-600";
  if (k.includes("classified")) return "bg-fuchsia-600";
  if (k.includes("restricted")) return "bg-violet-500";
  if (k.includes("mil")) return "bg-rose-800";
  if (k.includes("rare") || k.includes("legendary")) return "bg-amber-400";
  if (k.includes("epic")) return "bg-pink-500";
  return "bg-zinc-500";
}

function rarityTint(r: string) {
  const k = String(r || "common").toLowerCase();
  if (k.includes("covert")) return "from-red-950/55 via-cb-panel/90 to-cb-void";
  if (k.includes("classified")) return "from-fuchsia-950/45 via-cb-panel/90 to-cb-void";
  if (k.includes("restricted")) return "from-violet-950/40 via-cb-panel/90 to-cb-void";
  if (k.includes("legendary")) return "from-amber-950/35 via-cb-panel/90 to-cb-void";
  return "from-zinc-950/80 via-cb-panel to-cb-void";
}

function pickTargetNearPrice(catalog: CatalogItem[], inputSum: number, targetPrice: number): string | null {
  if (inputSum <= 0 || !Number.isFinite(targetPrice)) return null;
  const cands = catalog.filter((t) => t.price > inputSum);
  if (!cands.length) return null;
  const best = cands.reduce((a, t) =>
    Math.abs(t.price - targetPrice) < Math.abs(a.price - targetPrice) ? t : a,
  cands[0]);
  return best.id;
}

function UpgradeGauge({
  chancePct,
  roll,
  spinning,
  spinKey,
  done,
}: {
  chancePct: number;
  roll: number | null;
  spinning: boolean;
  spinKey: number;
  done: boolean;
}) {
  const p = Math.min(100, Math.max(0, chancePct)) / 100;
  const greenSweep = p * 360;
  const land = roll == null ? 0 : roll * 360;
  const targetRot = 4 * 360 + land;
  const [rot, setRot] = useState(0);

  useEffect(() => {
    if (spinning) {
      setRot(0);
      const id = window.setTimeout(() => setRot(targetRot), 60);
      return () => clearTimeout(id);
    }
    if (done && roll != null) setRot(targetRot);
    else setRot(0);
  }, [spinning, spinKey, done, roll, targetRot]);

  return (
    <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center sm:max-w-[300px]">
      <div className="relative aspect-square w-full">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(36,20,24,0.9)" strokeWidth="1" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(255,49,49,0.85)"
            strokeWidth="2.5"
            strokeDasharray={`${(greenSweep / 360) * 289} 289`}
            strokeLinecap="round"
            pathLength={289}
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(94,0,0,0.55)"
            strokeWidth="2.5"
            strokeDasharray={`${((360 - greenSweep) / 360) * 289} 289`}
            strokeDashoffset={`-${(greenSweep / 360) * 289}`}
            strokeLinecap="round"
            pathLength={289}
          />
        </svg>
        <div
          key={spinKey}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            transform: `rotate(${rot}deg)`,
            transition: spinning
              ? "transform 3.2s cubic-bezier(0.12, 0.85, 0.15, 1)"
              : "transform 0.35s ease-out",
          }}
        >
          <div className="absolute top-[7%] h-[30%] w-[5px] rounded-full bg-gradient-to-b from-white via-red-400 to-cb-flame shadow-[0_0_16px_rgba(255,49,49,0.9)]" />
        </div>
        <div className="pointer-events-none absolute inset-[16%] flex items-center justify-center">
          <div className="relative h-full w-full">
            <Image
              src="/upgrade-gauge.png"
              alt=""
              fill
              className="object-contain opacity-95 drop-shadow-[0_0_28px_rgba(255,49,49,0.35)]"
              unoptimized
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-bold tracking-tight text-zinc-500">
          <span className="absolute top-[6%]">100%</span>
          <span className="absolute bottom-[6%]">0%</span>
          <span className="absolute left-[6%]">50%</span>
          <span className="absolute right-[6%]">50%</span>
        </div>
      </div>
      {done && roll != null ? (
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          roll {(roll * 100).toFixed(2)}% · шанс {chancePct.toFixed(1)}%
        </p>
      ) : null}
    </div>
  );
}

const panelClass =
  "rounded-2xl border border-cb-stroke/90 bg-gradient-to-br from-black/50 via-cb-panel/95 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,49,49,0.08)]";

export default function UpgradePage() {
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string>("");
  const [chancePct, setChancePct] = useState<number>(0);
  const [rtpPct, setRtpPct] = useState<number>(0);
  const [nominalPct, setNominalPct] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<"win" | "loss" | null>(null);
  const [lastOutcomeName, setLastOutcomeName] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [gridView, setGridView] = useState(true);
  const [balanceBoostPct, setBalanceBoostPct] = useState(0);

  const loadAll = useCallback(async () => {
    if (!getToken()) {
      setInventory([]);
      setBalance(0);
      return;
    }
    const [meR, catR, histR] = await Promise.all([
      apiFetch<{ inventory: InvItem[]; balance: number }>("/api/me"),
      apiFetch<{ items: CatalogItem[] }>("/api/upgrade/catalog"),
      apiFetch<{ history: HistRow[] }>("/api/upgrade/history"),
    ]);
    if (meR.ok && meR.data) {
      setInventory(Array.isArray(meR.data.inventory) ? meR.data.inventory : []);
      setBalance(Number(meR.data.balance) || 0);
    }
    if (catR.ok && catR.data?.items) setCatalog(catR.data.items);
    if (histR.ok && histR.data?.history) setHistory(histR.data.history);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const inputSum = useMemo(() => {
    let s = 0;
    for (const id of selected) {
      const it = inventory.find((x) => x.itemId === id);
      if (it) s += Number(it.sellPrice) || 0;
    }
    return s;
  }, [selected, inventory]);

  const validTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minP = priceMin === "" ? null : Number(priceMin);
    const maxP = priceMax === "" ? null : Number(priceMax);
    return catalog.filter((t) => {
      if (t.price <= inputSum) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (minP != null && Number.isFinite(minP) && t.price < minP) return false;
      if (maxP != null && Number.isFinite(maxP) && t.price > maxP) return false;
      return true;
    });
  }, [catalog, inputSum, search, priceMin, priceMax]);

  useEffect(() => {
    if (!targetId || !validTargets.some((t) => t.id === targetId)) {
      setTargetId(validTargets[0]?.id || "");
    }
  }, [validTargets, targetId]);

  const refreshPreview = useCallback(async () => {
    if (!getToken() || selected.size < 1 || !targetId) {
      setChancePct(0);
      setRtpPct(0);
      setNominalPct(0);
      return;
    }
    const r = await apiFetch<{
      chancePct: number;
      targetRtpPct: number;
      nominalPct: number;
    }>("/api/upgrade/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputItemIds: Array.from(selected), targetId }),
    });
    if (r.ok && r.data) {
      setChancePct(r.data.chancePct);
      setRtpPct(r.data.targetRtpPct);
      setNominalPct(r.data.nominalPct);
      setErr(null);
    } else {
      setChancePct(0);
      setErr(r.error || null);
    }
  }, [selected, targetId]);

  useEffect(() => {
    const t = setTimeout(() => void refreshPreview(), 320);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
    setShowResult(null);
    setLastRoll(null);
  }

  function applyQuickPick(kind: "x2" | "x5" | "x10" | "p30" | "p50" | "p75" | "shuffle") {
    if (inputSum <= 0) return;
    let id: string | null = null;
    if (kind === "shuffle") {
      const pool = catalog.filter((t) => t.price > inputSum);
      if (pool.length) id = pool[Math.floor(Math.random() * pool.length)]!.id;
    } else if (kind === "x2") id = pickTargetNearPrice(catalog, inputSum, inputSum * 2);
    else if (kind === "x5") id = pickTargetNearPrice(catalog, inputSum, inputSum * 5);
    else if (kind === "x10") id = pickTargetNearPrice(catalog, inputSum, inputSum * 10);
    else if (kind === "p30") id = pickTargetNearPrice(catalog, inputSum, inputSum / 0.3);
    else if (kind === "p50") id = pickTargetNearPrice(catalog, inputSum, inputSum / 0.5);
    else if (kind === "p75") id = pickTargetNearPrice(catalog, inputSum, inputSum / 0.75);
    if (id) {
      setTargetId(id);
      setShowResult(null);
      setLastRoll(null);
    }
  }

  async function runUpgrade() {
    if (!getToken()) {
      requestAuthModal("/upgrade");
      return;
    }
    setErr(null);
    setBusy(true);
    setShowResult(null);
    setLastRoll(null);
    setLastOutcomeName(null);
    const r = await apiFetch<{
      win: boolean;
      chancePct: number;
      roll: number;
      targetRtpPct: number;
      target?: { name: string };
    }>("/api/upgrade/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputItemIds: Array.from(selected), targetId }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Помилка");
      return;
    }
    const data = r.data!;
    setLastOutcomeName(data.win && data.target?.name ? data.target.name : null);
    setSpinKey((k) => k + 1);
    setLastRoll(data.roll);
    setChancePct(data.chancePct);
    setRtpPct(data.targetRtpPct);
    setSpinning(true);
    window.setTimeout(() => {
      setSpinning(false);
      setShowResult(data.win ? "win" : "loss");
      setSelected(new Set());
      setTargetId("");
      void loadAll();
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
    }, 3300);
  }

  const target = catalog.find((t) => t.id === targetId);
  const selectedItems = useMemo(
    () => inventory.filter((i) => selected.has(i.itemId)),
    [inventory, selected],
  );

  const quickBtn =
    "rounded-lg border border-cb-stroke/80 bg-black/40 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-cb-flame/45 hover:text-cb-flame";

  return (
    <SiteShell>
      <div className="min-h-[calc(100dvh-52px)] bg-cb-void text-zinc-200">
        <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
          {err ? (
            <p className="mb-4 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-300">{err}</p>
          ) : null}

          {/* Верхня зона: 3 колонки */}
          <div className="relative mb-6 rounded-2xl border border-cb-stroke/80 bg-cb-panel/80 bg-cb-mesh p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-5">
            <div className="absolute left-3 top-3 flex gap-1 sm:left-4 sm:top-4">
              {["i", "⚙", "♪", "⚡"].map((x, i) => (
                <span
                  key={i}
                  className="flex h-8 w-8 cursor-default items-center justify-center rounded-lg border border-cb-stroke/80 bg-black/50 text-[12px] text-zinc-500"
                  title=""
                >
                  {x}
                </span>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 pt-2 xl:mt-2 xl:grid-cols-[1fr_minmax(260px,320px)_1fr] xl:items-stretch xl:gap-6">
              {/* Ліво: внесок */}
              <div className={`flex flex-col ${panelClass} p-4`}>
                <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                  Оберіть до 6 предметів на апгрейд
                </h3>
                <div className="flex min-h-[160px] flex-1 flex-wrap content-center justify-center gap-2 rounded-xl border border-dashed border-cb-stroke/60 bg-black/40 p-3">
                  {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-zinc-600">
                      <div className="text-4xl opacity-40">⌖</div>
                      <p className="text-center text-[11px]">Оберіть предмети знизу</p>
                    </div>
                  ) : (
                    selectedItems.map((it) => (
                      <button
                        key={it.itemId}
                        type="button"
                        onClick={() => toggleSel(it.itemId)}
                        className="relative h-16 w-[4.5rem] overflow-hidden rounded-lg border border-cb-stroke/70 bg-black/60"
                      >
                        {it.image ? (
                          <Image src={it.image} alt="" fill className="object-contain p-0.5" unoptimized />
                        ) : (
                          <span className="text-xs text-zinc-600">?</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-4 border-t border-cb-stroke/50 pt-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Додати баланс до шансу</span>
                    <span className="font-mono text-cb-flame">
                      {formatRub((balance * balanceBoostPct) / 100)} ₽
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={balanceBoostPct}
                    onChange={(e) => setBalanceBoostPct(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cb-stroke/80 accent-red-600"
                  />
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Візуально (макс. {formatRub(balance)} ₽). Налаштування шансу — на сервері через RTP.
                  </p>
                </div>
              </div>

              {/* Центр: діаметр + кнопка */}
              <div className="flex flex-col items-center justify-center gap-3">
                {chancePct > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400">
                    <span>
                      Шанс: <strong className="font-mono text-cb-flame">{chancePct.toFixed(1)}%</strong>
                    </span>
                    <span className="text-cb-stroke">|</span>
                    <span>
                      база <span className="font-mono text-zinc-300">{nominalPct.toFixed(1)}%</span>
                    </span>
                    <span className="text-cb-stroke">|</span>
                    <span>
                      RTP <span className="font-mono text-red-400/95">{rtpPct.toFixed(1)}%</span>
                    </span>
                  </div>
                ) : (
                  <p className="text-center text-[11px] text-zinc-500">Оберіть предмети та ціль</p>
                )}
                <UpgradeGauge
                  chancePct={chancePct}
                  roll={lastRoll}
                  spinning={spinning}
                  spinKey={spinKey}
                  done={Boolean(showResult)}
                />
                {showResult === "win" ? (
                  <p className="max-w-[260px] text-center text-[12px] font-semibold leading-snug text-cb-flame">
                    Виграш!{lastOutcomeName ? ` ${lastOutcomeName}` : ""} додано в інвентар.
                  </p>
                ) : showResult === "loss" ? (
                  <p className="text-center text-[12px] font-semibold text-red-500">Не вдалося. Предмети втрачено.</p>
                ) : null}
                <button
                  type="button"
                  disabled={
                    busy || spinning || selected.size < 1 || !targetId || !validTargets.some((t) => t.id === targetId)
                  }
                  onClick={() => void runUpgrade()}
                  className="group flex w-full max-w-[260px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-800 to-cb-flame py-3.5 text-[13px] font-black uppercase tracking-widest text-white shadow-[0_10px_36px_rgba(255,49,49,0.35)] transition hover:brightness-110 disabled:opacity-40"
                >
                  <span className="text-lg leading-none">⇈</span>
                  {busy || spinning ? "…" : "Прокачати"}
                </button>
              </div>

              {/* Право: ціль */}
              <div className={`flex flex-col ${panelClass} p-4`}>
                <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                  Оберіть зброю, яку хочете отримати
                </h3>
                <div
                  className={`flex min-h-[160px] flex-1 items-center justify-center rounded-xl border border-dashed border-cb-stroke/60 bg-gradient-to-b ${target ? rarityTint(target.rarity) : "from-cb-panel to-black/80"}`}
                >
                  {target ? (
                    <div className="relative h-28 w-full max-w-[200px]">
                      {target.image ? (
                        <Image src={target.image} alt="" fill className="object-contain drop-shadow-lg" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-600">?</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
                      <div className="text-4xl opacity-40">◇</div>
                      <p className="text-[11px]">Ціль з’явиться тут</p>
                    </div>
                  )}
                </div>
                {target ? (
                  <p className="mt-2 truncate text-center text-[12px] font-medium text-white">{target.name}</p>
                ) : null}
                {target ? (
                  <p className="text-center font-mono text-sm text-cb-flame">{formatRub(target.price)} ₽</p>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 border-t border-cb-stroke/50 pt-3">
                  {(
                    [
                      ["x2", "x2"],
                      ["x5", "x5"],
                      ["x10", "x10"],
                      ["p30", "30%"],
                      ["p50", "50%"],
                      ["p75", "75%"],
                    ] as const
                  ).map(([k, lab]) => (
                    <button key={k} type="button" className={quickBtn} onClick={() => applyQuickPick(k)}>
                      {lab}
                    </button>
                  ))}
                  <button type="button" className={quickBtn} onClick={() => applyQuickPick("shuffle")} title="Випадкова ціль">
                    ⧈
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Низ: дві панелі */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${panelClass} flex flex-col p-4`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-white">
                  Мої предмети <span className="font-normal text-zinc-500">({inventory.length} шт.)</span>
                </h3>
                <div className="flex items-center gap-1 rounded-lg border border-cb-stroke/80 bg-black/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setGridView(true)}
                    className={`rounded-md px-2 py-1 text-[11px] ${gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridView(false)}
                    className={`rounded-md px-2 py-1 text-[11px] ${!gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {inventory.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
                  <p className="max-w-xs text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                    Немає доступних предметів для апгрейду
                  </p>
                  <Link
                    href="/#cases"
                    className="rounded-xl border-2 border-cb-flame/70 bg-red-950/25 px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-cb-flame transition hover:bg-red-950/40"
                  >
                    Відкрийте будь-який кейс
                  </Link>
                </div>
              ) : gridView ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {inventory.map((it) => {
                    const on = selected.has(it.itemId);
                    return (
                      <button
                        key={it.itemId}
                        type="button"
                        onClick={() => toggleSel(it.itemId)}
                        className={`relative overflow-hidden rounded-xl border p-2 text-left transition ${
                          on
                            ? "border-cb-flame/80 ring-1 ring-cb-flame/35"
                            : "border-cb-stroke/80 bg-black/45 hover:border-cb-stroke"
                        }`}
                      >
                        <div className="relative mx-auto mb-1 aspect-[4/3] w-full bg-black/60">
                          {it.image ? (
                            <Image src={it.image} alt="" fill className="object-contain p-1" unoptimized />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-zinc-600">?</div>
                          )}
                        </div>
                        <div className={`mb-1 h-0.5 w-full rounded ${normRarityBar(it.rarity || "common")}`} />
                        <p className="line-clamp-2 text-[10px] font-medium leading-tight text-zinc-100">{it.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-cb-flame">{formatRub(it.sellPrice)} ₽</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
                  {inventory.map((it) => {
                    const on = selected.has(it.itemId);
                    return (
                      <button
                        key={it.itemId}
                        type="button"
                        onClick={() => toggleSel(it.itemId)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left ${
                          on ? "border-cb-flame/60 bg-red-950/20" : "border-cb-stroke/80 bg-black/45 hover:border-cb-stroke"
                        }`}
                      >
                        <div className="relative h-12 w-14 shrink-0 bg-black/60">
                          {it.image ? (
                            <Image src={it.image} alt="" fill className="object-contain p-0.5" unoptimized />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] text-zinc-100">{it.name}</p>
                          <p className="font-mono text-[11px] text-cb-flame">{formatRub(it.sellPrice)} ₽</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 border-t border-cb-stroke/50 pt-2 text-[11px] text-zinc-500">
                Внесок: <span className="font-mono text-white">{formatRub(inputSum)} ₽</span> · обрано{" "}
                {selected.size}/6
              </p>
            </div>

            <div className={`${panelClass} flex flex-col p-4`}>
              <h3 className="mb-3 text-[13px] font-bold text-white">Оберіть предмет</h3>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  Ціна від
                  <input
                    type="number"
                    min={0}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="₽"
                    className="w-24 rounded-lg border border-cb-stroke bg-black/50 px-2 py-1.5 text-[12px] text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  до
                  <input
                    type="number"
                    min={0}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="₽"
                    className="w-24 rounded-lg border border-cb-stroke bg-black/50 px-2 py-1.5 text-[12px] text-white"
                  />
                </label>
                <div className="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Пошук</span>
                  <div className="flex rounded-lg border border-cb-stroke bg-black/50">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Назва…"
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white placeholder:text-zinc-600"
                    />
                    <span className="flex items-center px-2 text-zinc-500">⌕</span>
                  </div>
                </div>
              </div>
              <div className="max-h-[320px] flex-1 space-y-1 overflow-y-auto rounded-xl border border-cb-stroke/70 bg-black/35 p-2">
                {validTargets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Використайте пошук або фільтр ціни
                    </p>
                    <p className="text-[10px] text-zinc-600">Немає цілей дорожчих за внесок</p>
                  </div>
                ) : (
                  validTargets.slice(0, 100).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTargetId(t.id);
                        setShowResult(null);
                        setLastRoll(null);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition ${
                        targetId === t.id
                          ? "border-cb-flame/65 bg-red-950/25"
                          : "border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="relative h-12 w-14 shrink-0 bg-black/60">
                        {t.image ? (
                          <Image src={t.image} alt="" fill className="object-contain p-0.5" unoptimized />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-zinc-600">?</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-zinc-100">{t.name}</p>
                        <p className="font-mono text-[12px] text-cb-flame">{formatRub(t.price)} ₽</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Історія */}
          <section className="mt-8 rounded-2xl border border-cb-stroke/80 bg-cb-panel/50 p-4">
            <h2 className="mb-3 bg-gradient-to-r from-white to-cb-flame bg-clip-text text-[14px] font-bold text-transparent">
              Історія апгрейдів
            </h2>
            {history.length === 0 ? (
              <p className="text-[12px] text-zinc-600">Поки порожньо.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-cb-stroke/70">
                <table className="w-full text-left text-[12px]">
                  <thead className="border-b border-cb-stroke/80 bg-black/50 text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Час</th>
                      <th className="px-3 py-2">Результат</th>
                      <th className="px-3 py-2 text-right">Шанс</th>
                      <th className="px-3 py-2 text-right">Roll</th>
                      <th className="px-3 py-2 text-right">Внесок</th>
                      <th className="px-3 py-2">Ціль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b border-cb-stroke/40 text-zinc-400">
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">
                          {new Date(h.at).toLocaleString()}
                        </td>
                        <td className={`px-3 py-2 font-semibold ${h.win ? "text-cb-flame" : "text-red-500"}`}>
                          {h.win ? "Win" : "Loss"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[11px]">{Number(h.chancePct).toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-mono text-[11px]">{Number(h.roll).toFixed(4)}</td>
                        <td className="px-3 py-2 text-right font-mono text-[11px]">{formatRub(h.inputSum)}</td>
                        <td className="max-w-[180px] truncate px-3 py-2 text-[11px]">{h.targetName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
