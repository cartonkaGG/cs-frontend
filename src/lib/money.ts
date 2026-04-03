export function formatRub(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const s = n.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, -3) : s;
}

function groupThousandsInInt(intStr: string): string {
  const neg = intStr.startsWith("-");
  const d = neg ? intStr.slice(1) : intStr;
  const grouped = d.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return (neg ? "-" : "") + grouped;
}

/** Як `formatRub`, але з розрядним розділювачем (вузький пробіл між трійками цифр). */
export function formatRubSpaced(value: number | null | undefined): string {
  const base = formatRub(value);
  const dot = base.indexOf(".");
  if (dot === -1) return groupThousandsInInt(base);
  const intPart = base.slice(0, dot);
  const frac = base.slice(dot + 1);
  return `${groupThousandsInInt(intPart)}.${frac}`;
}

