/**
 * Výpočetní jádro kalkulačky ekonomiky spolupráce s influencery.
 *
 * Všechny funkce jsou čisté (bez vedlejších efektů) a pracují s plnou přesností
 * desetinných čísel – zaokrouhluje se až při zobrazení.
 *
 * Model (inspirace Real Geek):
 *   Revenue_net          = Selling_price / (1 + VAT_rate)
 *   Profit_pool          = Revenue_net - Production_cost
 *   Influencer_earnings  = Profit_pool × Influencer_share
 *   Company_gross_share  = Profit_pool × (1 - Influencer_share)
 *   Company_contribution = Company_gross_share - provozní náklady (logistika, handling,
 *                          skladování, platby, ostatní variabilní, marketing)
 *
 * Company_contribution je příspěvek před fixními náklady, vývojem a daní z příjmů –
 * nikoliv čistý zisk.
 */

export interface OperatingCosts {
  /** Logistika / expedice (Kč na kus, bez DPH) */
  logistics: number;
  /** Handling / fulfillment (Kč na kus) */
  handling: number;
  /** Skladování (Kč na kus) */
  warehousing: number;
  /** Poplatky za platby (Kč na kus) */
  paymentFees: number;
  /** Ostatní variabilní náklady (Kč na kus) */
  other: number;
}

export type OperatingCostMode = "summary" | "detailed";

export interface Tier {
  /** Horní hranice pásma v kusech (včetně). `null` = bez horní hranice. */
  upTo: number | null;
  /** Podíl influencera v pásmu jako zlomek (0–1). */
  share: number;
}

export interface CalculatorInputs {
  /** Prodejní cena včetně DPH (Kč) */
  sellingPrice: number;
  /** Alternativní (porovnávaná) prodejní cena včetně DPH (Kč) */
  altPrice: number;
  /** Sazba DPH jako zlomek (0.21 = 21 %) */
  vatRate: number;
  /** Výrobní náklad na kus bez DPH (Kč) */
  productionCost: number;
  /** Podíl influencera na marži jako zlomek (0.4 = 40 %) */
  influencerShare: number;
  /** Marketingové náklady na kus (Kč) – hradí firma ze svého podílu */
  marketingCost: number;
  /** Režim zadávání provozních nákladů */
  operatingCostMode: OperatingCostMode;
  /** Souhrnné provozní náklady na kus (Kč) – použito v režimu "summary" */
  operatingCostSummary: number;
  /** Rozpis provozních nákladů na kus – použito v režimu "detailed" */
  operatingCosts: OperatingCosts;
  /** Počet prodaných kusů */
  volume: number;
  /** Zapnuté progresivní (stupňovité) odměňování */
  tieredEnabled: boolean;
  /** Pásma progresivního odměňování (seřazená vzestupně podle upTo) */
  tiers: Tier[];
}

export interface UnitEconomics {
  sellingPrice: number;
  vatRate: number;
  revenueNet: number;
  vatAmount: number;
  productionCost: number;
  profitPool: number;
  /** Marže k rozdělení je záporná – produkt se při této ceně prodává pod výrobní náklady. */
  poolNegative: boolean;
  influencerShare: number;
  influencerEarnings: number;
  companyGrossShare: number;
  operatingCost: number;
  marketingCost: number;
  companyContribution: number;
  /** Příspěvková marže firmy = příspěvek / tržby bez DPH */
  contributionMarginPct: number;
  /** Podíl influencera z tržby bez DPH */
  influencerMarginPct: number;
}

export interface VolumeEconomics {
  volume: number;
  revenueGross: number;
  revenueNet: number;
  vatAmount: number;
  productionCost: number;
  influencerEarnings: number;
  companyGrossShare: number;
  operatingCost: number;
  marketingCost: number;
  companyContribution: number;
  contributionMarginPct: number;
  /** Efektivní podíl influencera na celkové marži (při progresivním modelu se liší od nominálního) */
  effectiveInfluencerShare: number;
  poolNegative: boolean;
  /** Rozpad odměny influencera po pásmech (jen u progresivního modelu) */
  tierBreakdown: TierBreakdownRow[];
}

export interface TierBreakdownRow {
  from: number;
  to: number | null;
  share: number;
  units: number;
  earnings: number;
}

export interface UnitOverrides {
  sellingPrice?: number;
  influencerShare?: number;
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  sellingPrice: 599,
  altPrice: 499,
  vatRate: 0.21,
  productionCost: 79,
  influencerShare: 0.4,
  marketingCost: 0,
  operatingCostMode: "summary",
  operatingCostSummary: 45,
  operatingCosts: {
    logistics: 25,
    handling: 8,
    warehousing: 4,
    paymentFees: 8,
    other: 0,
  },
  volume: 1000,
  tieredEnabled: false,
  tiers: [
    { upTo: 500, share: 0.3 },
    { upTo: 2000, share: 0.4 },
    { upTo: null, share: 0.5 },
  ],
};

export const SHARE_VARIANTS = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6];
export const VOLUME_PRESETS = [100, 500, 1000, 2500, 5000, 10000, 25000];
export const CHART_SHARE_VARIANTS = [0.3, 0.4, 0.5];

/** Celkové provozní náklady na kus (bez marketingu) podle zvoleného režimu. */
export function operatingCostPerUnit(inputs: CalculatorInputs): number {
  if (inputs.operatingCostMode === "summary") return inputs.operatingCostSummary;
  return sumOperatingCosts(inputs.operatingCosts);
}

export function sumOperatingCosts(c: OperatingCosts): number {
  return c.logistics + c.handling + c.warehousing + c.paymentFees + c.other;
}

/** Jednotková ekonomika (na jeden prodaný kus). */
export function computeUnit(inputs: CalculatorInputs, overrides: UnitOverrides = {}): UnitEconomics {
  const sellingPrice = overrides.sellingPrice ?? inputs.sellingPrice;
  const influencerShare = overrides.influencerShare ?? inputs.influencerShare;
  const vatRate = inputs.vatRate;

  const revenueNet = sellingPrice / (1 + vatRate);
  const vatAmount = sellingPrice - revenueNet;
  const profitPool = revenueNet - inputs.productionCost;
  const poolNegative = profitPool < 0;

  // Při záporné marži influencer nenese ztrátu – jeho odměna je 0 a ztrátu nese firma.
  const influencerEarnings = poolNegative ? 0 : profitPool * influencerShare;
  const companyGrossShare = profitPool - influencerEarnings;

  const operatingCost = operatingCostPerUnit(inputs);
  const marketingCost = inputs.marketingCost;
  const companyContribution = companyGrossShare - operatingCost - marketingCost;

  return {
    sellingPrice,
    vatRate,
    revenueNet,
    vatAmount,
    productionCost: inputs.productionCost,
    profitPool,
    poolNegative,
    influencerShare,
    influencerEarnings,
    companyGrossShare,
    operatingCost,
    marketingCost,
    companyContribution,
    contributionMarginPct: revenueNet > 0 ? companyContribution / revenueNet : 0,
    influencerMarginPct: revenueNet > 0 ? influencerEarnings / revenueNet : 0,
  };
}

/** Normalizuje pásma: seřadí podle horní hranice, otevřené pásmo (null) je poslední. */
export function normalizeTiers(tiers: Tier[]): Tier[] {
  const closed = tiers.filter((t) => t.upTo !== null).sort((a, b) => (a.upTo as number) - (b.upTo as number));
  const open = tiers.filter((t) => t.upTo === null);
  return [...closed, ...open];
}

/**
 * Odměna influencera v progresivním modelu. Vyšší sazba se vztahuje pouze na kusy
 * v příslušném pásmu (mezní, nikoliv zpětně na všechny kusy).
 */
export function computeTieredEarnings(tiers: Tier[], volume: number, profitPoolPerUnit: number): {
  earnings: number;
  breakdown: TierBreakdownRow[];
} {
  const sorted = normalizeTiers(tiers);
  const breakdown: TierBreakdownRow[] = [];
  let lower = 0;
  let earnings = 0;
  const pool = profitPoolPerUnit < 0 ? 0 : profitPoolPerUnit;

  for (const tier of sorted) {
    const upper = tier.upTo;
    const bandWidth = upper === null ? Infinity : Math.max(0, upper - lower);
    const units = Math.max(0, Math.min(volume - lower, bandWidth));
    const tierEarnings = units * pool * tier.share;
    earnings += tierEarnings;
    breakdown.push({ from: lower + 1, to: upper, share: tier.share, units, earnings: tierEarnings });
    if (upper === null) break;
    lower = upper;
  }

  // Kusy nad posledním uzavřeným pásmem (pokud chybí otevřené pásmo) se odměňují sazbou posledního pásma.
  const last = sorted[sorted.length - 1];
  if (last && last.upTo !== null && volume > last.upTo) {
    const units = volume - last.upTo;
    const tierEarnings = units * pool * last.share;
    earnings += tierEarnings;
    breakdown.push({ from: last.upTo + 1, to: null, share: last.share, units, earnings: tierEarnings });
  }

  return { earnings, breakdown };
}

/** Ekonomika při daném objemu prodeje. */
export function computeVolume(
  inputs: CalculatorInputs,
  volume: number = inputs.volume,
  overrides: UnitOverrides & { tiered?: boolean } = {},
): VolumeEconomics {
  const unit = computeUnit(inputs, overrides);
  const useTiered = overrides.tiered ?? inputs.tieredEnabled;

  let influencerEarnings: number;
  let tierBreakdown: TierBreakdownRow[] = [];
  if (useTiered && overrides.influencerShare === undefined) {
    const tiered = computeTieredEarnings(inputs.tiers, volume, unit.profitPool);
    influencerEarnings = tiered.earnings;
    tierBreakdown = tiered.breakdown;
  } else {
    influencerEarnings = unit.influencerEarnings * volume;
  }

  const revenueGross = unit.sellingPrice * volume;
  const revenueNet = unit.revenueNet * volume;
  const vatAmount = unit.vatAmount * volume;
  const productionCost = unit.productionCost * volume;
  const profitPoolTotal = unit.profitPool * volume;
  const companyGrossShare = profitPoolTotal - influencerEarnings;
  const operatingCost = unit.operatingCost * volume;
  const marketingCost = unit.marketingCost * volume;
  const companyContribution = companyGrossShare - operatingCost - marketingCost;

  return {
    volume,
    revenueGross,
    revenueNet,
    vatAmount,
    productionCost,
    influencerEarnings,
    companyGrossShare,
    operatingCost,
    marketingCost,
    companyContribution,
    contributionMarginPct: revenueNet > 0 ? companyContribution / revenueNet : 0,
    effectiveInfluencerShare: profitPoolTotal > 0 ? influencerEarnings / profitPoolTotal : 0,
    poolNegative: unit.poolNegative,
    tierBreakdown,
  };
}

/** Objem, při kterém příspěvek firmy pokryje zadané fixní náklady (bod zvratu). */
export function breakEvenVolume(inputs: CalculatorInputs, fixedCosts: number): number | null {
  const unit = computeUnit(inputs);
  if (unit.companyContribution <= 0) return null;
  return Math.ceil(fixedCosts / unit.companyContribution);
}

// ---------------------------------------------------------------------------
// Validace
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export function validateInputs(inputs: CalculatorInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const num = (v: number) => Number.isFinite(v);

  if (!num(inputs.sellingPrice) || inputs.sellingPrice <= 0) issues.push({ field: "sellingPrice", message: "Prodejní cena musí být kladné číslo.", severity: "error" });
  if (!num(inputs.altPrice) || inputs.altPrice <= 0) issues.push({ field: "altPrice", message: "Alternativní cena musí být kladné číslo.", severity: "error" });
  if (!num(inputs.vatRate) || inputs.vatRate < 0 || inputs.vatRate > 1) issues.push({ field: "vatRate", message: "DPH musí být mezi 0 a 100 %.", severity: "error" });
  if (!num(inputs.productionCost) || inputs.productionCost < 0) issues.push({ field: "productionCost", message: "Výrobní náklad nesmí být záporný.", severity: "error" });
  if (!num(inputs.influencerShare) || inputs.influencerShare < 0 || inputs.influencerShare > 1) issues.push({ field: "influencerShare", message: "Podíl influencera musí být mezi 0 a 100 %.", severity: "error" });
  if (!num(inputs.marketingCost) || inputs.marketingCost < 0) issues.push({ field: "marketingCost", message: "Marketingové náklady nesmí být záporné.", severity: "error" });
  if (!num(inputs.operatingCostSummary) || inputs.operatingCostSummary < 0) issues.push({ field: "operatingCostSummary", message: "Provozní náklady nesmí být záporné.", severity: "error" });
  for (const [key, value] of Object.entries(inputs.operatingCosts)) {
    if (!num(value) || value < 0) issues.push({ field: `operatingCosts.${key}`, message: "Provozní náklad nesmí být záporný.", severity: "error" });
  }
  if (!num(inputs.volume) || inputs.volume < 0 || !Number.isInteger(inputs.volume)) issues.push({ field: "volume", message: "Počet kusů musí být celé nezáporné číslo.", severity: "error" });

  if (inputs.tieredEnabled) {
    const sorted = normalizeTiers(inputs.tiers);
    if (sorted.length === 0) issues.push({ field: "tiers", message: "Progresivní model musí mít alespoň jedno pásmo.", severity: "error" });
    let prev = 0;
    sorted.forEach((t, i) => {
      if (!num(t.share) || t.share < 0 || t.share > 1) issues.push({ field: `tiers.${i}.share`, message: "Sazba pásma musí být mezi 0 a 100 %.", severity: "error" });
      if (t.upTo !== null) {
        if (!num(t.upTo) || t.upTo <= prev) issues.push({ field: `tiers.${i}.upTo`, message: "Hranice pásem musí být rostoucí.", severity: "error" });
        else prev = t.upTo;
      }
    });
    if (sorted.filter((t) => t.upTo === null).length > 1) issues.push({ field: "tiers", message: "Pouze jedno pásmo může být bez horní hranice.", severity: "error" });
  }

  const unit = computeUnit(inputs);
  if (unit.poolNegative) issues.push({ field: "profitPool", message: "Marže k rozdělení je záporná – prodejní cena bez DPH nepokryje výrobní náklad. Odměna influencera je nastavena na 0 Kč.", severity: "warning" });
  else if (unit.companyContribution < 0) issues.push({ field: "companyContribution", message: "Příspěvek firmy je záporný – provozní náklady převyšují podíl firmy na marži.", severity: "warning" });

  return issues;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
