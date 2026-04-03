/**
 * Steam economy image: розмір у шляху `/WxHf` (Steam CDN).
 * - sharp (512) — скіни в рулетці / інвентар, retina.
 * - compat (360) — коробки кейсів тощо: 512 інколи дає 404 у economy API.
 */
const STEAM_ECONOMY = /\/economy\/image\//i;
const SIZE_SUFFIX = /\/(\d+)fx(\d+)f\/?$/i;

const DIM_SHARP = 512;
const DIM_COMPAT = 360;

export type SteamEconomyImageMode = "sharp" | "compat";

export function preferHighResSteamEconomyImage(
  url: string | null | undefined,
  mode: SteamEconomyImageMode = "sharp",
): string | null {
  if (url == null || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (!STEAM_ECONOMY.test(u)) return u;

  const [pathPart, ...rest] = u.split("?");
  const query = rest.length ? `?${rest.join("?")}` : "";
  const base = pathPart.replace(/\/+$/, "");
  const m = base.match(SIZE_SUFFIX);

  if (mode === "compat") {
    const HI = DIM_COMPAT;
    if (m) {
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (Number.isFinite(w) && Number.isFinite(h) && w === HI && h === HI) return u;
      const nextPath = base.replace(SIZE_SUFFIX, `/${HI}fx${HI}f`);
      return `${nextPath}${query}`;
    }
    return `${base}/${HI}fx${HI}f${query}`;
  }

  const HI = DIM_SHARP;
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (Number.isFinite(w) && Number.isFinite(h) && w >= HI && h >= HI) {
      return u;
    }
    const nextPath = base.replace(SIZE_SUFFIX, `/${HI}fx${HI}f`);
    return `${nextPath}${query}`;
  }

  return `${base}/${HI}fx${HI}f${query}`;
}

/** Додається до `object-contain` на зображеннях скінів: чіткіший даунскейл, окремий шар для GPU. */
export const SKIN_IMG_QUALITY_CLASS =
  "[transform:translateZ(0)] backface-hidden [-webkit-backface-visibility:hidden] [image-rendering:high-quality]";
