"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getRouletteSoundMuted,
  setRouletteSoundMuted,
  startRouletteSpinTicks,
} from "@/lib/rouletteSound";
import {
  normRarity,
  rarityBar,
  rarityCardFill,
  type RouletteItem,
} from "@/components/CaseRoulette";

/** Висота картки + gap-2 (8px), узгоджено з tailwind keyframes caseRouletteWaitY */
const CARD_STEP_Y = 112;
const HALF_CARD_Y = 52;
const TRACK_PAD = 6;
const REPEAT = 48;
const SPIN_ROUNDS = 26;
const SPIN_MS = 4800;
const START_OFFSET_Y = 2400;

function BatchVerticalCard({
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
      className={`relative h-[6.5rem] w-full max-w-[92px] shrink-0 overflow-hidden rounded-lg border border-cb-stroke/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform duration-500 ease-out will-change-transform sm:max-w-[104px] ${fill} ${
        isWinner ? "z-10 scale-[1.06] shadow-[0_0_22px_rgba(255,49,49,0.3)]" : "z-0 scale-100"
      }`}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col p-1 pb-0.5">
        <div className="relative mx-auto min-h-0 flex-1 basis-0 w-full">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className="object-contain drop-shadow-md"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-lg text-zinc-300/80">?</div>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-center text-[8px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[9px]">
          {item.name}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 z-[2] h-1 ${bar}`} />
    </div>
  );
}

function VerticalColumn({
  items,
  spinWaiting,
  landOnIndex,
  landEpoch,
  accentWinner,
  onStripTransitionEnd,
}: {
  items: RouletteItem[];
  spinWaiting: boolean;
  landOnIndex: number | null;
  landEpoch: number;
  accentWinner: boolean;
  onStripTransitionEnd: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ty, setTy] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const landedRef = useRef(false);

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
      setTransitionMs(0);
      setTy(0);
      return;
    }

    if (landOnIndex == null) {
      const vh = viewportRef.current.clientHeight;
      const idleIdx = items.length * 3;
      setTransitionMs(0);
      setTy(vh / 2 - HALF_CARD_Y - TRACK_PAD - idleIdx * CARD_STEP_Y);
      landedRef.current = false;
      return;
    }

    if (landEpoch === 0) return;

    landedRef.current = false;

    const vh = viewportRef.current.clientHeight;
    const n = items.length;
    const finalSlot = SPIN_ROUNDS * n + landOnIndex;
    const endTy = vh / 2 - HALF_CARD_Y - TRACK_PAD - finalSlot * CARD_STEP_Y;
    const startTy = endTy + START_OFFSET_Y;

    setTransitionMs(0);
    setTy(startTy);

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionMs(SPIN_MS);
        setTy(endTy);
      });
    });

    return () => cancelAnimationFrame(id);
  }, [items, spinWaiting, landOnIndex, landEpoch]);

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform" || transitionMs === 0) return;
    if (landOnIndex == null || landedRef.current) return;
    landedRef.current = true;
    onStripTransitionEnd();
  }

  const useWaitMotion = spinWaiting && landOnIndex == null;
  const n = items.length;
  const winnerStripIndex =
    landOnIndex != null && n > 0 ? SPIN_ROUNDS * n + landOnIndex : -1;

  return (
    <div
      ref={viewportRef}
      className="relative h-[11.5rem] min-w-0 flex-1 overflow-hidden rounded-xl border border-cb-stroke/50 bg-[#05080f]/95 shadow-[inset_0_0_28px_rgba(0,0,0,0.45)] sm:h-[13rem] sm:max-w-[120px] sm:flex-none"
    >
      <div
        className={`flex flex-col items-center gap-2 px-1 pb-24 pt-2 will-change-transform ${
          useWaitMotion ? "animate-case-roulette-wait-y" : ""
        }`}
        style={
          useWaitMotion
            ? undefined
            : {
                transform: `translate3d(0,${ty}px,0)`,
                transition:
                  transitionMs > 0
                    ? `transform ${transitionMs}ms cubic-bezier(0.06, 0.75, 0.2, 1)`
                    : "none",
              }
        }
        onTransitionEnd={onTransitionEnd}
      >
        {strip.map((it) => (
          <BatchVerticalCard
            key={it.key}
            item={it}
            isWinner={accentWinner && it.key === winnerStripIndex}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-0 -translate-y-1/2"
        aria-hidden
      >
        <div className="absolute -left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 border-y-[6px] border-l-[8px] border-y-transparent border-l-orange-400/90 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)] sm:h-3.5 sm:w-3.5 sm:border-y-[7px] sm:border-l-[9px]" />
        <div className="absolute -right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 border-y-[6px] border-r-[8px] border-y-transparent border-r-orange-400/90 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)] sm:h-3.5 sm:w-3.5 sm:border-y-[7px] sm:border-r-[9px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#05080f] to-transparent sm:h-12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#05080f] to-transparent sm:h-12"
        aria-hidden
      />
    </div>
  );
}

type Props = {
  items: RouletteItem[];
  columnCount: number;
  spinWaiting: boolean;
  landIndices: number[] | null;
  landEpoch: number;
  onLandComplete: () => void;
  accentWinner?: boolean;
};

export function CaseBatchVerticalRoulette({
  items,
  columnCount,
  spinWaiting,
  landIndices,
  landEpoch,
  onLandComplete,
  accentWinner = false,
}: Props) {
  const [soundMuted, setSoundMuted] = useState(false);
  const endedRef = useRef(0);
  const completionFiredRef = useRef(false);

  useEffect(() => {
    setSoundMuted(getRouletteSoundMuted());
  }, []);

  useEffect(() => {
    if (soundMuted || spinWaiting || !landIndices?.length || landEpoch === 0) return;
    return startRouletteSpinTicks(SPIN_MS, false);
  }, [landEpoch, landIndices, soundMuted, spinWaiting]);

  useEffect(() => {
    endedRef.current = 0;
    completionFiredRef.current = false;
  }, [landIndices, landEpoch, spinWaiting, columnCount]);

  const safeCount = Math.max(2, Math.min(5, columnCount));
  const indices =
    landIndices && landIndices.length >= safeCount
      ? landIndices.slice(0, safeCount)
      : landIndices;

  function handleColumnEnd() {
    if (completionFiredRef.current) return;
    endedRef.current += 1;
    if (endedRef.current >= safeCount) {
      completionFiredRef.current = true;
      onLandComplete();
    }
  }

  if (!items.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-cb-stroke/60 bg-black/30 text-sm text-zinc-500">
        В кейсе нет предметов
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-5xl">
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

      <div className="flex w-full justify-center gap-1.5 sm:gap-2.5">
        {Array.from({ length: safeCount }, (_, i) => (
          <VerticalColumn
            key={i}
            items={items}
            spinWaiting={spinWaiting}
            landOnIndex={indices?.[i] ?? null}
            landEpoch={landEpoch}
            accentWinner={accentWinner}
            onStripTransitionEnd={handleColumnEnd}
          />
        ))}
      </div>
    </div>
  );
}
