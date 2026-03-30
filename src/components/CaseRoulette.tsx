"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getRouletteSoundMuted,
  setRouletteSoundMuted,
  startRouletteSpinTicks,
} from "@/lib/rouletteSound";

export type RouletteItem = {
  name: string;
  rarity: string;
  sellPrice: number;
  image: string;
};

const CARD_STEP = 136;
const HALF_CARD = 64;
const TRACK_PAD = 16;
const REPEAT = 48;
const SPIN_ROUNDS = 26;

/** Тривалість основної прокрутки (очікування API — окремо, без анімації стрічки). */
export const ROULETTE_SPIN_DURATION_MS = 5500;
export const ROULETTE_SPIN_EASE = "cubic-bezier(0.17, 0.67, 0.12, 1)";
const START_OFFSET_X = Math.round((2600 * ROULETTE_SPIN_DURATION_MS) / 4800);

export const rarityBar: Record<string, string> = {
  common: "bg-zinc-500",
  uncommon: "bg-emerald-500",
  rare: "bg-blue-500",
  epic: "bg-fuchsia-500",
  legendary: "bg-amber-400",
  consumer: "bg-zinc-400",
  industrial: "bg-slate-400",
  milspec: "bg-blue-500",
  "mil-spec": "bg-blue-500",
  restricted: "bg-violet-500",
  classified: "bg-fuchsia-500",
  covert: "bg-red-600",
  extraordinary: "bg-amber-400",
  contraband: "bg-orange-500",
};

/** Фон картки рулетки: градієнт кольору якості → темний низ */
export const rarityCardFill: Record<string, string> = {
  common: "bg-gradient-to-b from-zinc-500/55 via-zinc-700/35 to-zinc-950",
  uncommon: "bg-gradient-to-b from-emerald-500/55 via-emerald-800/35 to-zinc-950",
  rare: "bg-gradient-to-b from-blue-500/55 via-blue-900/38 to-zinc-950",
  epic: "bg-gradient-to-b from-fuchsia-500/55 via-fuchsia-900/38 to-zinc-950",
  legendary: "bg-gradient-to-b from-amber-400/60 via-amber-800/40 to-zinc-950",
  consumer: "bg-gradient-to-b from-zinc-400/55 via-zinc-700/38 to-zinc-950",
  industrial: "bg-gradient-to-b from-slate-400/55 via-slate-700/38 to-zinc-950",
  milspec: "bg-gradient-to-b from-blue-500/55 via-blue-900/38 to-zinc-950",
  "mil-spec": "bg-gradient-to-b from-blue-500/55 via-blue-900/38 to-zinc-950",
  restricted: "bg-gradient-to-b from-violet-500/55 via-violet-900/38 to-zinc-950",
  classified: "bg-gradient-to-b from-fuchsia-500/55 via-fuchsia-900/38 to-zinc-950",
  covert: "bg-gradient-to-b from-red-500/80 via-red-600/55 to-zinc-950",
  extraordinary: "bg-gradient-to-b from-amber-400/60 via-amber-900/40 to-zinc-950",
  contraband: "bg-gradient-to-b from-orange-500/58 via-orange-900/42 to-zinc-950",
};

export function normRarity(raw: string): string {
  const r = (raw || "common").toLowerCase().trim().replace(/\s+/g, "-");
  if (r === "mil_spec") return "mil-spec";
  return r;
}

function RouletteCard({
  item,
  isWinner,
}: {
  item: RouletteItem;
  isWinner?: boolean;
}) {
  const rk = normRarity(item.rarity);
  const bar = rarityBar[rk] || rarityBar.common;
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  return (
    <div
      className={`relative h-[11.25rem] w-32 shrink-0 overflow-hidden rounded-xl border border-cb-stroke/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-500 ease-out will-change-transform ${fill} ${
        isWinner ? "z-10 scale-[1.12] shadow-[0_0_28px_rgba(255,49,49,0.35)] sm:scale-[1.14]" : "z-0 scale-100"
      }`}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col p-1.5 pb-1">
        <div className="relative mx-auto min-h-0 flex-1 basis-0 w-full">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className="object-contain drop-shadow-lg"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-zinc-300/80">?</div>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {item.name}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 z-[2] h-1.5 ${bar}`} />
    </div>
  );
}

type Props = {
  items: RouletteItem[];
  spinWaiting: boolean;
  landOnIndex: number | null;
  landEpoch: number;
  onLandComplete: () => void;
  /** Після зупинки — підсвітити картку під маркером */
  accentWinner?: boolean;
};

export function CaseRoulette({
  items,
  spinWaiting,
  landOnIndex,
  landEpoch,
  onLandComplete,
  accentWinner = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const landedRef = useRef(false);
  const [soundMuted, setSoundMuted] = useState(false);

  useEffect(() => {
    setSoundMuted(getRouletteSoundMuted());
  }, []);

  useEffect(() => {
    if (
      soundMuted ||
      transitionMs !== ROULETTE_SPIN_DURATION_MS ||
      spinWaiting ||
      landOnIndex == null
    ) {
      return;
    }
    return startRouletteSpinTicks(ROULETTE_SPIN_DURATION_MS, false);
  }, [transitionMs, landEpoch, soundMuted, spinWaiting, landOnIndex]);

  const strip = useMemo(() => {
    if (!items.length) return [];
    const len = Math.max(items.length * REPEAT, items.length * (SPIN_ROUNDS + 4));
    return Array.from({ length: len }, (_, i) => ({
      ...items[i % items.length],
      key: i,
    }));
  }, [items]);

  useLayoutEffect(() => {
    if (!viewportRef.current || !items.length) return;

    if (spinWaiting) {
      const vw = viewportRef.current.clientWidth;
      const idleIdx = items.length * 3;
      setTransitionMs(0);
      setTx(vw / 2 - HALF_CARD - TRACK_PAD - idleIdx * CARD_STEP);
      return;
    }

    if (landOnIndex == null) {
      const vw = viewportRef.current.clientWidth;
      const idleIdx = items.length * 3;
      setTransitionMs(0);
      setTx(vw / 2 - HALF_CARD - TRACK_PAD - idleIdx * CARD_STEP);
      landedRef.current = false;
      return;
    }

    if (landEpoch === 0) {
      return;
    }

    landedRef.current = false;

    const vw = viewportRef.current.clientWidth;
    const n = items.length;
    const finalSlot = SPIN_ROUNDS * n + landOnIndex;
    const endTx = vw / 2 - HALF_CARD - TRACK_PAD - finalSlot * CARD_STEP;
    const startTx = endTx + START_OFFSET_X;

    setTransitionMs(0);
    setTx(startTx);

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionMs(ROULETTE_SPIN_DURATION_MS);
        setTx(endTx);
      });
    });

    return () => cancelAnimationFrame(id);
  }, [items, spinWaiting, landOnIndex, landEpoch]);

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform" || transitionMs === 0) return;
    if (landOnIndex == null || landedRef.current) return;
    landedRef.current = true;
    onLandComplete();
  }

  if (!items.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-cb-stroke/60 bg-black/30 text-sm text-zinc-500">
        В кейсе нет предметов
      </div>
    );
  }

  const n = items.length;
  const winnerStripIndex =
    landOnIndex != null && n > 0 ? SPIN_ROUNDS * n + landOnIndex : -1;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => {
          const next = !soundMuted;
          setSoundMuted(next);
          setRouletteSoundMuted(next);
        }}
        className="absolute -right-1 -top-10 z-30 flex items-center gap-1.5 rounded-lg border border-cb-stroke/70 bg-[#0a0e14]/90 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 shadow-md transition hover:border-zinc-600 hover:text-zinc-200 sm:-top-11 sm:text-xs"
        title={soundMuted ? "Увімкнути звук рулетки" : "Вимкнути звук рулетки"}
        aria-pressed={!soundMuted}
      >
        <span className="text-base leading-none" aria-hidden>
          {soundMuted ? "🔇" : "🔊"}
        </span>
        <span className="hidden sm:inline">{soundMuted ? "Звук вимк." : "Звук увімк."}</span>
      </button>

      <div
        ref={viewportRef}
        className="relative h-[12rem] overflow-hidden rounded-2xl border border-cb-stroke/55 bg-[#05080f]/95 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] sm:h-[13.5rem]"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2"
          aria-hidden
        >
          <div className="h-4 w-4 -translate-y-1/2 rotate-45 border-2 border-orange-400/85 bg-orange-500/35 shadow-[0_0_18px_rgba(249,115,22,0.55)] sm:h-5 sm:w-5 sm:border-[2.5px]" />
        </div>

        <div
          className="flex h-full items-center gap-2 pl-4 pr-32 will-change-transform"
          style={{
            transform: `translate3d(${tx}px,0,0)`,
            transition:
              transitionMs > 0
                ? `transform ${transitionMs}ms ${ROULETTE_SPIN_EASE}`
                : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {strip.map((it) => (
            <RouletteCard
              key={it.key}
              item={it}
              isWinner={accentWinner && it.key === winnerStripIndex}
            />
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#05080f] to-transparent sm:w-24"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#05080f] to-transparent sm:w-24"
          aria-hidden
        />
      </div>
    </div>
  );
}
