import { DEFAULT_INPUTS, normalizeTiers, type CalculatorInputs, type Tier } from "./calc";

/**
 * Serializace stavu kalkulačky do URL parametru `s` (base64url JSON s krátkými klíči).
 * Formát je verzovaný, aby šlo v budoucnu rozšířit o více produktů / influencerů.
 */
const VERSION = 1;

interface Packed {
  v: number;
  p: number; // sellingPrice
  ap: number; // altPrice
  vat: number;
  pc: number; // productionCost
  is: number; // influencerShare
  mk: number; // marketingCost
  om: "s" | "d"; // operatingCostMode
  os: number; // operatingCostSummary
  oc: [number, number, number, number, number];
  q: number; // volume
  te: 0 | 1; // tieredEnabled
  t: Array<[number | null, number]>; // tiers
}

function pack(inputs: CalculatorInputs): Packed {
  const c = inputs.operatingCosts;
  return {
    v: VERSION,
    p: inputs.sellingPrice,
    ap: inputs.altPrice,
    vat: inputs.vatRate,
    pc: inputs.productionCost,
    is: inputs.influencerShare,
    mk: inputs.marketingCost,
    om: inputs.operatingCostMode === "summary" ? "s" : "d",
    os: inputs.operatingCostSummary,
    oc: [c.logistics, c.handling, c.warehousing, c.paymentFees, c.other],
    q: inputs.volume,
    te: inputs.tieredEnabled ? 1 : 0,
    t: inputs.tiers.map((t) => [t.upTo, t.share]),
  };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function unpack(raw: unknown): CalculatorInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<Packed>;
  if (p.v !== VERSION) return null;
  const d = DEFAULT_INPUTS;
  const oc = Array.isArray(p.oc) && p.oc.length === 5 && p.oc.every(isNum) ? p.oc : null;
  const tiers: Tier[] | null = Array.isArray(p.t)
    ? p.t
        .filter((t): t is [number | null, number] => Array.isArray(t) && t.length === 2 && (t[0] === null || isNum(t[0])) && isNum(t[1]))
        .map(([upTo, share]) => ({ upTo, share }))
    : null;

  return {
    sellingPrice: isNum(p.p) ? p.p : d.sellingPrice,
    altPrice: isNum(p.ap) ? p.ap : d.altPrice,
    vatRate: isNum(p.vat) ? p.vat : d.vatRate,
    productionCost: isNum(p.pc) ? p.pc : d.productionCost,
    influencerShare: isNum(p.is) ? p.is : d.influencerShare,
    marketingCost: isNum(p.mk) ? p.mk : d.marketingCost,
    operatingCostMode: p.om === "d" ? "detailed" : "summary",
    operatingCostSummary: isNum(p.os) ? p.os : d.operatingCostSummary,
    operatingCosts: oc
      ? { logistics: oc[0], handling: oc[1], warehousing: oc[2], paymentFees: oc[3], other: oc[4] }
      : { ...d.operatingCosts },
    volume: isNum(p.q) ? Math.max(0, Math.round(p.q)) : d.volume,
    tieredEnabled: p.te === 1,
    tiers: tiers && tiers.length > 0 ? normalizeTiers(tiers) : d.tiers.map((t) => ({ ...t })),
  };
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeInputs(inputs: CalculatorInputs): string {
  return toBase64Url(JSON.stringify(pack(inputs)));
}

export function decodeInputs(encoded: string): CalculatorInputs | null {
  try {
    return unpack(JSON.parse(fromBase64Url(encoded)));
  } catch {
    return null;
  }
}

export const SHARE_PARAM = "s";
export const NAME_PARAM = "n";

export function buildShareUrl(inputs: CalculatorInputs, name?: string, base?: string): string {
  const url = new URL(base ?? (typeof window !== "undefined" ? window.location.href : "http://localhost/"));
  url.search = "";
  url.hash = "";
  url.searchParams.set(SHARE_PARAM, encodeInputs(inputs));
  if (name) url.searchParams.set(NAME_PARAM, name);
  return url.toString();
}

export function readInputsFromUrl(search: string): { inputs: CalculatorInputs; name: string | null } | null {
  const params = new URLSearchParams(search);
  const encoded = params.get(SHARE_PARAM);
  if (!encoded) return null;
  const inputs = decodeInputs(encoded);
  if (!inputs) return null;
  return { inputs, name: params.get(NAME_PARAM) };
}
