import { describe, it, expect } from "vitest";
import {
  DEFAULT_INPUTS,
  computeUnit,
  computeVolume,
  computeTieredEarnings,
  validateInputs,
  hasErrors,
  breakEvenVolume,
  type CalculatorInputs,
} from "./calc";

const close = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);

describe("computeUnit – výchozí vstupy (599 Kč, 21 % DPH, 79 Kč výroba, 40/60)", () => {
  const u = computeUnit(DEFAULT_INPUTS);

  it("odečte DPH správně", () => {
    close(u.revenueNet, 599 / 1.21); // 495.0413...
    close(u.vatAmount, 599 - 599 / 1.21);
    close(u.revenueNet + u.vatAmount, 599);
  });

  it("spočítá marži k rozdělení", () => {
    close(u.profitPool, 599 / 1.21 - 79); // 416.0413...
    expect(u.poolNegative).toBe(false);
  });

  it("rozdělí marži 40/60", () => {
    close(u.influencerEarnings, (599 / 1.21 - 79) * 0.4); // 166.4165...
    close(u.companyGrossShare, (599 / 1.21 - 79) * 0.6); // 249.6248...
    close(u.influencerEarnings + u.companyGrossShare, u.profitPool);
  });

  it("odečte provozní náklady pouze z podílu firmy", () => {
    close(u.operatingCost, 45);
    close(u.companyContribution, (599 / 1.21 - 79) * 0.6 - 45); // 204.6248...
    // odměna influencera zůstává nedotčena provozními náklady
    close(u.influencerEarnings, (599 / 1.21 - 79) * 0.4);
  });

  it("spočítá příspěvkovou marži vůči tržbě bez DPH", () => {
    close(u.contributionMarginPct, ((599 / 1.21 - 79) * 0.6 - 45) / (599 / 1.21));
  });

  it("nepoužívá zaokrouhlené mezivýsledky", () => {
    // Kdyby se revenueNet zaokrouhlil na 495.04, výsledek by byl jiný
    const rounded = (495.04 - 79) * 0.6 - 45;
    expect(Math.abs(u.companyContribution - rounded)).toBeGreaterThan(1e-6);
  });
});

describe("computeUnit – alternativní cena 499 Kč", () => {
  it("použije override ceny", () => {
    const u = computeUnit(DEFAULT_INPUTS, { sellingPrice: 499 });
    close(u.revenueNet, 499 / 1.21);
    close(u.profitPool, 499 / 1.21 - 79);
    close(u.influencerEarnings, (499 / 1.21 - 79) * 0.4);
    close(u.companyContribution, (499 / 1.21 - 79) * 0.6 - 45);
  });
});

describe("computeUnit – detailní provozní náklady", () => {
  it("sečte jednotlivé položky", () => {
    const inputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      operatingCostMode: "detailed",
      operatingCosts: { logistics: 20, handling: 10, warehousing: 5, paymentFees: 7.5, other: 2.5 },
    };
    const u = computeUnit(inputs);
    close(u.operatingCost, 45);
  });

  it("marketing se odečítá z podílu firmy", () => {
    const u = computeUnit({ ...DEFAULT_INPUTS, marketingCost: 30 });
    close(u.companyContribution, (599 / 1.21 - 79) * 0.6 - 45 - 30);
  });
});

describe("computeUnit – záporná marže", () => {
  it("nastaví odměnu influencera na 0 a ztrátu nese firma", () => {
    const u = computeUnit({ ...DEFAULT_INPUTS, sellingPrice: 60, productionCost: 79 });
    expect(u.poolNegative).toBe(true);
    expect(u.influencerEarnings).toBe(0);
    close(u.companyGrossShare, 60 / 1.21 - 79);
    expect(u.companyGrossShare).toBeLessThan(0);
    const issues = validateInputs({ ...DEFAULT_INPUTS, sellingPrice: 60 });
    expect(issues.find((i) => i.field === "profitPool")?.severity).toBe("warning");
  });
});

describe("computeVolume", () => {
  it("škáluje lineárně bez progresivního modelu", () => {
    const u = computeUnit(DEFAULT_INPUTS);
    const v = computeVolume(DEFAULT_INPUTS, 1000);
    close(v.revenueGross, 599000);
    close(v.revenueNet, u.revenueNet * 1000);
    close(v.productionCost, 79000);
    close(v.influencerEarnings, u.influencerEarnings * 1000);
    close(v.operatingCost, 45000);
    close(v.companyContribution, u.companyContribution * 1000);
    close(v.effectiveInfluencerShare, 0.4);
  });

  it("vrátí nuly pro objem 0", () => {
    const v = computeVolume(DEFAULT_INPUTS, 0);
    expect(v.revenueGross).toBe(0);
    expect(v.influencerEarnings).toBe(0);
    expect(v.companyContribution).toBe(0);
    expect(v.effectiveInfluencerShare).toBe(0);
  });
});

describe("computeTieredEarnings – mezní pásma", () => {
  const tiers = DEFAULT_INPUTS.tiers; // 0–500: 30 %, 501–2000: 40 %, 2001+: 50 %
  const pool = 100; // jednoduchá marže na kus pro čitelnost

  it("objem uvnitř prvního pásma", () => {
    const r = computeTieredEarnings(tiers, 300, pool);
    close(r.earnings, 300 * 100 * 0.3);
    expect(r.breakdown[0].units).toBe(300);
    expect(r.breakdown[1].units).toBe(0);
  });

  it("přesně na hranici pásma", () => {
    const r = computeTieredEarnings(tiers, 500, pool);
    close(r.earnings, 500 * 100 * 0.3);
  });

  it("vyšší sazba platí jen pro kusy v pásmu, ne zpětně", () => {
    const r = computeTieredEarnings(tiers, 1000, pool);
    close(r.earnings, 500 * 100 * 0.3 + 500 * 100 * 0.4);
    // zpětné uplatnění 40 % na vše by dalo 40 000 – to nechceme
    expect(r.earnings).not.toBeCloseTo(1000 * 100 * 0.4, 6);
  });

  it("tři pásma", () => {
    const r = computeTieredEarnings(tiers, 2500, pool);
    close(r.earnings, 500 * 100 * 0.3 + 1500 * 100 * 0.4 + 500 * 100 * 0.5);
    expect(r.breakdown.map((b) => b.units)).toEqual([500, 1500, 500]);
  });

  it("neseřazená pásma se normalizují", () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    const r = computeTieredEarnings(shuffled, 2500, pool);
    close(r.earnings, 500 * 100 * 0.3 + 1500 * 100 * 0.4 + 500 * 100 * 0.5);
  });

  it("bez otevřeného pásma použije sazbu posledního pásma", () => {
    const r = computeTieredEarnings([{ upTo: 500, share: 0.3 }, { upTo: 2000, share: 0.4 }], 3000, pool);
    close(r.earnings, 500 * 100 * 0.3 + 1500 * 100 * 0.4 + 1000 * 100 * 0.4);
  });

  it("záporná marže => 0", () => {
    const r = computeTieredEarnings(tiers, 1000, -10);
    expect(r.earnings).toBe(0);
  });

  it("integrace s computeVolume – výchozí vstupy, 2 500 ks", () => {
    const inputs = { ...DEFAULT_INPUTS, tieredEnabled: true };
    const u = computeUnit(inputs);
    const v = computeVolume(inputs, 2500);
    const expected = u.profitPool * (500 * 0.3 + 1500 * 0.4 + 500 * 0.5);
    close(v.influencerEarnings, expected);
    close(v.companyGrossShare, u.profitPool * 2500 - expected);
    close(v.companyContribution, u.profitPool * 2500 - expected - 45 * 2500);
    close(v.effectiveInfluencerShare, (500 * 0.3 + 1500 * 0.4 + 500 * 0.5) / 2500);
  });
});

describe("validateInputs", () => {
  it("výchozí vstupy jsou validní", () => {
    expect(hasErrors(validateInputs(DEFAULT_INPUTS))).toBe(false);
  });
  it("detekuje záporné a nesmyslné hodnoty", () => {
    const issues = validateInputs({ ...DEFAULT_INPUTS, sellingPrice: -1, influencerShare: 1.5, volume: 10.5 });
    expect(issues.map((i) => i.field)).toEqual(expect.arrayContaining(["sellingPrice", "influencerShare", "volume"]));
    expect(hasErrors(issues)).toBe(true);
  });
  it("detekuje nerostoucí hranice pásem", () => {
    const issues = validateInputs({ ...DEFAULT_INPUTS, tieredEnabled: true, tiers: [{ upTo: 500, share: 0.3 }, { upTo: 500, share: 0.4 }] });
    expect(hasErrors(issues)).toBe(true);
  });
});

describe("breakEvenVolume", () => {
  it("spočítá bod zvratu pro fixní náklady", () => {
    const u = computeUnit(DEFAULT_INPUTS);
    expect(breakEvenVolume(DEFAULT_INPUTS, 100000)).toBe(Math.ceil(100000 / u.companyContribution));
  });
  it("vrátí null při nekladném příspěvku", () => {
    expect(breakEvenVolume({ ...DEFAULT_INPUTS, operatingCostSummary: 10000 }, 100000)).toBeNull();
  });
});
