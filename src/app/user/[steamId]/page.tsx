"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  PublicProfileActivityCard,
  type PublicProfileActivity,
} from "@/components/PublicProfileActivityCard";
import { SiteShell } from "@/components/SiteShell";
import { SiteMoney } from "@/components/SiteMoney";
import { apiFetch } from "@/lib/api";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";
import { SITE_MONEY_CTA_CLASS } from "@/lib/siteMoneyStyles";
import {
  PublicStatIconCases,
  PublicStatIconUpgrades,
  PublicStatIconWithdraw,
} from "@/components/icons/PublicProfileStatIcons";

/** 8 карток у ряд × 4 ряди на сторінці */
const ACTIVITY_PAGE_SIZE = 32;

type PublicUserPayload = {
  steamId: string;
  displayName: string;
  avatar: string;
  stats: {
    casesOpened: number;
    upgradesDone: number;
    withdrawalsCompletedCount: number;
    withdrawalsCompletedTotalRub: number;
  };
  bestEverItem?: {
    name: string;
    rarity: string;
    sellPrice: number;
    image: string | null;
    source?: string;
  } | null;
  activity: PublicProfileActivity[];
  activityTotal: number;
  activityPage: number;
  activityPageSize: number;
};

function normalizePublicResponse(
  d: PublicUserPayload & { recentActivity?: PublicProfileActivity[] },
  requestedPage: number,
) {
  const legacy = d;
  const activity = Array.isArray(d.activity)
    ? d.activity
    : Array.isArray(legacy.recentActivity)
      ? legacy.recentActivity
      : [];
  const activityTotal =
    typeof d.activityTotal === "number"
      ? d.activityTotal
      : Array.isArray(legacy.recentActivity)
        ? legacy.recentActivity.length
        : activity.length;
  const ps =
    typeof d.activityPageSize === "number" && d.activityPageSize > 0
      ? d.activityPageSize
      : ACTIVITY_PAGE_SIZE;
  const ap =
    typeof d.activityPage === "number" && d.activityPage >= 1 ? d.activityPage : requestedPage;
  return { activity, activityTotal, ps, ap };
}

function PublicUserBody({ steamId }: { steamId: string }) {
  const [data, setData] = useState<PublicUserPayload | null>(null);
  const [activityItems, setActivityItems] = useState<PublicProfileActivity[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [lastLoadedPage, setLastLoadedPage] = useState(0);
  const [resolvedPageSize, setResolvedPageSize] = useState(ACTIVITY_PAGE_SIZE);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);

  const fetchActivityPage = useCallback(
    async (page: number) => {
      const q = new URLSearchParams({
        activityPage: String(page),
        activityPageSize: String(ACTIVITY_PAGE_SIZE),
      });
      return apiFetch<PublicUserPayload>(
        `/api/users/${encodeURIComponent(steamId)}/public?${q.toString()}`,
        { cache: "no-store" },
      );
    },
    [steamId],
  );

  useEffect(() => {
    if (!steamId) {
      setErr("Не указан Steam ID");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setActivityItems([]);
    setLastLoadedPage(0);
    setActivityTotal(0);
    void (async () => {
      const r = await fetchActivityPage(1);
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setData(null);
        setErr(r.status === 404 ? "Пользователь не найден" : r.error || "Ошибка загрузки");
        return;
      }
      const d = r.data;
      if (!d) {
        setData(null);
        return;
      }
      const { activity, activityTotal: total, ps, ap } = normalizePublicResponse(
        d as PublicUserPayload & { recentActivity?: PublicProfileActivity[] },
        1,
      );
      setData({
        ...d,
        activity,
        activityTotal: total,
        activityPage: ap,
        activityPageSize: ps,
      });
      setActivityItems(activity);
      setActivityTotal(total);
      setResolvedPageSize(ps);
      setLastLoadedPage(ap);
    })();
    return () => {
      cancelled = true;
    };
  }, [steamId, fetchActivityPage]);

  const loadMore = useCallback(async () => {
    if (!steamId || !data || loadMoreBusy) return;
    if (activityItems.length >= activityTotal) return;
    const nextPage = lastLoadedPage + 1;
    setLoadMoreBusy(true);
    const r = await fetchActivityPage(nextPage);
    setLoadMoreBusy(false);
    if (!r.ok || !r.data) return;
    const { activity, ap } = normalizePublicResponse(
      r.data as PublicUserPayload & { recentActivity?: PublicProfileActivity[] },
      nextPage,
    );
    if (activity.length === 0) return;
    setActivityItems((prev) => [...prev, ...activity]);
    setLastLoadedPage(ap);
  }, [
    steamId,
    data,
    loadMoreBusy,
    activityItems.length,
    activityTotal,
    lastLoadedPage,
    fetchActivityPage,
  ]);

  const st = data?.stats;
  const hasMore = activityTotal > 0 && activityItems.length < activityTotal;

  return (
    <SiteShell>
      <div className="relative mx-auto max-w-[min(92rem,100%)] px-2.5 py-6 sm:px-5 sm:py-9">
        <div className="group/card relative overflow-hidden rounded-2xl border border-orange-500/30 bg-[#060a12] shadow-[0_0_48px_-22px_rgba(234,88,12,0.35)] transition-[box-shadow,border-color] duration-700 ease-out hover:border-orange-400/35 hover:shadow-[0_0_64px_-18px_rgba(249,115,22,0.38)] motion-reduce:transition-none sm:rounded-[1.35rem]">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/25 via-transparent to-orange-950/15"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-1/4 top-1/2 h-[min(72vw,520px)] w-[min(72vw,520px)] -translate-y-1/2 rounded-full bg-orange-600/12 blur-3xl motion-reduce:animate-none animate-pp-orb-drift"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-1/4 top-0 h-[min(58vw,440px)] w-[min(58vw,440px)] rounded-full bg-violet-600/14 blur-3xl motion-reduce:animate-none animate-pp-orb-drift-slow"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.055] motion-reduce:opacity-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse 88% 70% at 50% 22%, black, transparent 74%)",
            }}
            aria-hidden
          />

          <div className="relative p-4 sm:p-6">
            <div className="mb-3 flex justify-center sm:justify-start">
              <div className="flex items-center gap-2 motion-reduce:animate-none animate-pp-fade-up">
                <span
                  className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.9)] motion-reduce:animate-none motion-reduce:shadow-none animate-pp-label-shine"
                  aria-hidden
                />
                <p className="text-center text-[9px] font-bold uppercase tracking-[0.28em] text-orange-300/95 sm:text-left">
                  Публичный профиль
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-5 py-2 motion-reduce:animate-none animate-pp-fade-in" aria-busy>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <div className="h-[5.25rem] w-[5.25rem] shrink-0 rounded-xl bg-zinc-800/75 motion-reduce:animate-none animate-pp-skeleton sm:h-24 sm:w-24" />
                  <div className="flex w-full max-w-md flex-1 flex-col items-center space-y-2 sm:items-start">
                    <div className="h-6 w-44 max-w-full rounded-lg bg-zinc-800/65 motion-reduce:animate-none animate-pp-skeleton" />
                    <div className="h-2.5 w-52 max-w-full rounded bg-zinc-800/50 motion-reduce:animate-none animate-pp-skeleton" />
                    <div className="h-9 w-32 rounded-lg bg-zinc-800/60 motion-reduce:animate-none animate-pp-skeleton" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[4.5rem] rounded-lg bg-zinc-800/55 motion-reduce:animate-none animate-pp-skeleton"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : err ? (
              <div className="motion-reduce:animate-none animate-pp-fade-in py-8 text-center">
                <p className="text-sm text-red-300/95">{err}</p>
                <Link
                  href="/"
                  className={`${SITE_MONEY_CTA_CLASS} mt-6 inline-flex px-6 py-2.5 text-sm transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100`}
                >
                  На главную
                </Link>
              </div>
            ) : data ? (
              <>
                <div className="motion-reduce:animate-none animate-pp-fade-up flex flex-col items-center gap-3 border-b border-cb-stroke/40 pb-5 sm:flex-row sm:items-start sm:gap-5">
                  <div className="relative shrink-0">
                    <div
                      className="pointer-events-none absolute -inset-[2px] rounded-xl opacity-95 motion-reduce:hidden"
                      aria-hidden
                    >
                      <div className="h-full w-full rounded-xl bg-[conic-gradient(from_0deg,#ea5808,#a855f7,#0ea5e9,#f97316,#ea5808)] motion-reduce:animate-none animate-pp-ring-spin blur-[0.75px]" />
                    </div>
                    <div className="relative h-[5.25rem] w-[5.25rem] overflow-hidden rounded-xl border border-white/10 bg-black/55 shadow-[0_10px_32px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.06] transition-[transform,box-shadow] duration-500 group-hover/card:scale-[1.02] group-hover/card:shadow-[0_14px_40px_-10px_rgba(234,88,12,0.2)] motion-reduce:transition-none sm:h-24 sm:w-24">
                      {data.avatar ? (
                        <Image
                          src={data.avatar}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl text-zinc-600">?</div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h1 className="text-lg font-black tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.45)] sm:text-xl">
                      {data.displayName}
                    </h1>
                    <p className="mt-1 font-mono text-[10px] text-zinc-500">Steam ID: {data.steamId}</p>
                    <a
                      href={`https://steamcommunity.com/profiles/${encodeURIComponent(data.steamId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/40 bg-gradient-to-b from-sky-500/15 to-sky-950/30 px-3 py-2 text-xs font-bold text-sky-50 shadow shadow-sky-950/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-400/55 hover:shadow-md hover:shadow-sky-500/12 active:translate-y-0 motion-reduce:hover:translate-y-0 sm:justify-start sm:text-sm"
                    >
                      Профиль Steam
                      <span className="text-xs font-normal text-sky-200/90" aria-hidden>
                        ↗
                      </span>
                    </a>
                  </div>
                </div>

                {st ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="group/stat motion-reduce:animate-none animate-pp-fade-up relative overflow-hidden rounded-lg border border-cb-stroke/50 bg-gradient-to-b from-white/[0.05] to-black/25 px-2 py-2.5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-[0_10px_28px_-14px_rgba(234,88,12,0.24)] motion-reduce:hover:translate-y-0 sm:px-3">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/stat:opacity-100"
                        aria-hidden
                      />
                      <div className="mx-auto mb-0.5 flex h-8 w-8 items-center justify-center text-orange-400 motion-reduce:animate-none animate-pp-stat-bob">
                        <PublicStatIconCases className="h-5 w-5" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">Кейсы</p>
                      <p className="mt-0.5 text-base font-black tabular-nums text-white">{st.casesOpened}</p>
                    </div>
                    <div className="group/stat motion-reduce:animate-none animate-pp-fade-up relative overflow-hidden rounded-lg border border-cb-stroke/50 bg-gradient-to-b from-white/[0.05] to-black/25 px-2 py-2.5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-[0_10px_28px_-14px_rgba(139,92,246,0.2)] motion-reduce:hover:translate-y-0 sm:px-3 [animation-delay:90ms]">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/stat:opacity-100"
                        aria-hidden
                      />
                      <div className="mx-auto mb-0.5 flex h-8 w-8 items-center justify-center text-violet-300 motion-reduce:animate-none animate-pp-stat-zap [animation-delay:120ms]">
                        <PublicStatIconUpgrades className="h-5 w-5" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">Апгрейды</p>
                      <p className="mt-0.5 text-base font-black tabular-nums text-white">{st.upgradesDone}</p>
                    </div>
                    <div className="group/stat motion-reduce:animate-none animate-pp-fade-up relative col-span-2 overflow-hidden rounded-lg border border-cb-stroke/50 bg-gradient-to-b from-white/[0.05] to-black/25 px-2 py-2.5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/40 hover:shadow-[0_10px_28px_-14px_rgba(14,165,233,0.18)] motion-reduce:hover:translate-y-0 sm:col-span-1 sm:px-3 [animation-delay:180ms]">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/stat:opacity-100"
                        aria-hidden
                      />
                      <div className="mx-auto mb-0.5 flex h-8 w-8 items-center justify-center text-sky-300 motion-reduce:animate-none animate-pp-stat-send [animation-delay:240ms]">
                        <PublicStatIconWithdraw className="h-5 w-5" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">Выводы (Steam)</p>
                      <p className="mt-0.5 text-base font-black tabular-nums text-white">
                        {st.withdrawalsCompletedCount ?? 0}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center justify-center gap-1">
                        <SiteMoney
                          value={st.withdrawalsCompletedTotalRub ?? 0}
                          className="text-xs font-bold text-zinc-200"
                          iconClassName="h-3 w-3 text-orange-400"
                        />
                      </p>
                    </div>
                  </div>
                ) : null}

                {data.bestEverItem && data.bestEverItem.name ? (
                  <div className="motion-reduce:animate-none animate-pp-fade-up relative mt-4 overflow-hidden rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/35 via-amber-950/[0.07] to-black/50 p-3 shadow-[0_0_40px_-18px_rgba(245,158,11,0.32)] transition-[box-shadow,transform] duration-500 hover:shadow-[0_0_48px_-16px_rgba(251,191,36,0.26)] motion-reduce:transition-none sm:p-4 [animation-delay:220ms]">
                    <div
                      className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl motion-reduce:hidden"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-full bg-orange-600/10 blur-2xl motion-reduce:hidden"
                      aria-hidden
                    />
                    <p className="relative text-[9px] font-black uppercase tracking-[0.2em] text-amber-200/90">
                      Лучший дроп
                    </p>
                    <div className="relative mt-2 flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-amber-500/20 bg-black/30 shadow-inner transition-transform duration-500 hover:scale-105 motion-reduce:hover:scale-100">
                        {data.bestEverItem.image ? (
                          <Image
                            src={preferHighResSteamEconomyImage(data.bestEverItem.image) ?? data.bestEverItem.image}
                            alt=""
                            fill
                            className={`object-contain ${SKIN_IMG_QUALITY_CLASS}`}
                            sizes="64px"
                            quality={100}
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center rounded-lg bg-black/40 text-zinc-600">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-white">{data.bestEverItem.name}</p>
                        <p className="mt-1">
                          <SiteMoney
                            value={data.bestEverItem.sellPrice}
                            className="text-xs font-bold text-amber-200"
                            iconClassName="h-3.5 w-3.5 text-amber-400"
                          />
                        </p>
                        {data.bestEverItem.source ? (
                          <p className="mt-0.5 text-[9px] uppercase tracking-wide text-zinc-500">
                            {data.bestEverItem.source === "upgrade" ? "Апгрейд" : "Кейс"}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div id="public-activity" className="mt-6 scroll-mt-20">
                  <h2 className="text-sm font-black uppercase tracking-wide text-white">История предметов</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    8 предметов в ширину, подгружается по {resolvedPageSize} шт.
                    {activityTotal > 0 ? (
                      <>
                        {" "}
                        · показано{" "}
                        <span className="font-semibold text-zinc-400">{activityItems.length}</span> из{" "}
                        <span className="font-semibold text-zinc-400">{activityTotal}</span>
                      </>
                    ) : null}
                  </p>

                  <div className="relative mt-4">
                    {loadMoreBusy ? (
                      <div className="absolute inset-0 z-10 flex items-start justify-center bg-[#060a12]/60 pt-8 backdrop-blur-[1px]">
                        <span className="text-xs text-zinc-400">Загрузка…</span>
                      </div>
                    ) : null}
                    {activityItems.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-cb-stroke/50 bg-black/20 px-4 py-10 text-center text-sm text-zinc-500">
                        Пока нет записей в логах.
                      </p>
                    ) : (
                      <div className="-mx-2 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
                        <div
                          className="mx-auto grid w-full min-w-[36rem] grid-cols-8 gap-1.5 sm:min-w-0 sm:gap-2"
                          style={{ gridAutoRows: "minmax(0, auto)" }}
                        >
                          {activityItems.map((row, i) => (
                            <PublicProfileActivityCard
                              key={`${row.kind}-${row.at}-${i}`}
                              row={row}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {hasMore ? (
                    <div className="mt-6 flex justify-center border-t border-cb-stroke/25 pt-6">
                      <button
                        type="button"
                        disabled={loadMoreBusy}
                        onClick={() => void loadMore()}
                        className="rounded-xl border-2 border-cb-stroke/70 bg-zinc-950/80 px-8 py-3 text-sm font-bold uppercase tracking-wide text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cb-flame/50 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {loadMoreBusy ? "Загрузка…" : "Загрузить ещё"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex justify-center sm:justify-start">
                  <Link href="/" className={`${SITE_MONEY_CTA_CLASS} px-6 py-2.5 text-sm`}>
                    На главную
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

export default function PublicUserPage({ params }: { params: { steamId: string } }) {
  const steamId = decodeURIComponent(params.steamId || "").trim();
  return <PublicUserBody key={steamId} steamId={steamId} />;
}
