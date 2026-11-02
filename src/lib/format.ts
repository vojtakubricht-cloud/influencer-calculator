const czk0 = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const czk2 = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const num0 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
const num2 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat("cs-CZ", { style: "percent", maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** Částka v Kč. `decimals` 0 pro celkové sumy, 2 pro jednotkové hodnoty. */
export function formatCZK(value: number, decimals: 0 | 2 = 2): string {
  if (!Number.isFinite(value)) return "–";
  return (decimals === 0 ? czk0 : czk2).format(value);
}

export function formatNumber(value: number, decimals: 0 | 2 = 0): string {
  if (!Number.isFinite(value)) return "–";
  return (decimals === 0 ? num0 : num2).format(value);
}

export function formatPct(fraction: number): string {
  if (!Number.isFinite(fraction)) return "–";
  return pct1.format(fraction);
}

/** Kompaktní formát pro osy grafů: 1 200 000 → "1,2 mil. Kč", 45 000 → "45 tis. Kč" */
export function formatCZKCompact(value: number): string {
  if (!Number.isFinite(value)) return "–";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${num1.format(abs / 1_000_000)} mil. Kč`;
  if (abs >= 10_000) return `${sign}${num0.format(abs / 1000)} tis. Kč`;
  return `${sign}${num0.format(abs)} Kč`;
}

export function formatUnits(value: number): string {
  return `${num0.format(value)} ks`;
}

/** Parsování čísla z uživatelského vstupu (akceptuje čárku i tečku, mezery jako oddělovače tisíců). */
export function parseNumberInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
