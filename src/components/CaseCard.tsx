import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatRub } from "@/lib/money";

export type CaseSummary = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  skinImage?: string | null;
  /** % для картки каталогу (редактор); × глобальний homeCaseImageScale */
  cardCaseImageScale?: number;
  cardSkinImageScale?: number;
  category: string;
  featured?: boolean;
  accent: string;
};

export const CASE_FRAMES: Record<string, string> = {
  amber:
    "border-red-600/45 bg-gradient-to-br from-red-600/18 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(255,49,49,0.4)]",
  orange:
    "border-orange-600/45 bg-gradient-to-br from-orange-600/18 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(255,49,49,0.32)]",
  rose:
    "border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(244,63,94,0.3)]",
  violet:
    "border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]",
  emerald:
    "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(52,211,153,0.25)]",
  cyan:
    "border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)]",
  fuchsia:
    "border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(217,70,239,0.35)]",
  yellow:
    "border-yellow-500/40 bg-gradient-to-br from-yellow-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(234,179,8,0.3)]",
  sky:
    "border-sky-500/40 bg-gradient-to-br from-sky-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(56,189,248,0.3)]",
};

export type CaseCardProps = {
  c: CaseSummary;
  /** Глобальний множник з /admin/site-ui, % (100 = без змін); добуток з hero* з кейсу */
  homeCaseScalePct?: number;
  /** Глобальний множник для скінів на головній, % */
  homeSkinScalePct?: number;
};

export function CaseCard({
  c,
  homeCaseScalePct = 100,
  homeSkinScalePct = 100,
}: CaseCardProps) {
  const frame = CASE_FRAMES[c.accent] || CASE_FRAMES.amber;
  const cat = CATEGORY_LABELS[c.category] || c.category;
  const cardCase = Math.min(180, Math.max(40, Math.round(Number(c.cardCaseImageScale) || 100)));
  const cardSkin = Math.min(180, Math.max(40, Math.round(Number(c.cardSkinImageScale) || 100)));
  const homeCase = Math.min(180, Math.max(40, Math.round(Number(homeCaseScalePct) || 100)));
  const homeSkin = Math.min(180, Math.max(40, Math.round(Number(homeSkinScalePct) || 100)));
  const casePct = Math.min(180, Math.max(40, Math.round((homeCase * cardCase) / 100)));
  const skinPct = Math.min(180, Math.max(40, Math.round((homeSkin * cardSkin) / 100)));
  const caseS = casePct / 100;
  const skinS = skinPct / 100;

  return (
    <Link
      href={`/cases/${c.slug}`}
      className={`group relative overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-0.5 hover:brightness-110 ${frame}`}
    >
      {c.featured && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-red-600 to-cb-flame px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-red-900/40">
          Топ
        </span>
      )}
      <div className="relative aspect-[5/4] overflow-hidden bg-black/30">
        {c.image && c.skinImage ? (
          <div className="absolute inset-0 origin-center transition duration-500 ease-out group-hover:scale-105">
            <div
              className="absolute inset-x-0 bottom-0 top-[-4%] origin-bottom sm:top-[-5%]"
              style={{ transform: `scale(${caseS})` }}
            >
              <Image
                src={c.image}
                alt=""
                fill
                className="object-contain object-bottom opacity-95 transition duration-500 group-hover:opacity-100"
                sizes="(max-width: 768px) 100vw, 25vw"
                unoptimized
              />
            </div>
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[8%] pb-[12%]">
              <div
                className="relative aspect-square w-[72%] max-w-[220px] origin-center"
                style={{ transform: `scale(${skinS})` }}
              >
                <div className="cb-case-skin-float-y relative h-full w-full">
                  <Image
                    src={c.skinImage}
                    alt=""
                    fill
                    className="object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] [transform:translateZ(0)]"
                    sizes="(max-width: 768px) 40vw, 200px"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        ) : c.image ? (
          <div className="absolute inset-0 origin-center transition duration-500 ease-out group-hover:scale-105">
            <div
              className="absolute inset-x-0 bottom-0 top-[-4%] origin-bottom sm:top-[-5%]"
              style={{ transform: `scale(${caseS})` }}
            >
              <Image
                src={c.image}
                alt=""
                fill
                className="object-contain object-bottom opacity-95 transition duration-500 group-hover:opacity-100"
                sizes="(max-width: 768px) 100vw, 25vw"
                unoptimized
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-5xl font-black text-white/10 transition group-hover:text-white/20">
              {c.name.slice(0, 1)}
            </span>
            <span className="px-4 text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
              {cat}
            </span>
          </div>
        )}
        {c.skinImage && !c.image ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[8%]">
            <div
              className="relative aspect-square w-[72%] max-w-[220px] origin-center"
              style={{ transform: `scale(${skinS})` }}
            >
              <div className="cb-case-skin-float-y relative h-full w-full">
                <Image
                  src={c.skinImage}
                  alt=""
                  fill
                  className="object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] [transform:translateZ(0)]"
                  sizes="(max-width: 768px) 40vw, 200px"
                  unoptimized
                />
              </div>
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
      </div>
      <div className="relative border-t border-cb-stroke/40 bg-black/20 px-4 py-3 backdrop-blur-sm">
        <p className="line-clamp-1 text-base font-semibold text-white">{c.name}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">{cat}</span>
          <span className="font-mono text-sm font-bold text-cb-flame">
            {formatRub(c.price)} ₽
          </span>
        </div>
      </div>
    </Link>
  );
}
