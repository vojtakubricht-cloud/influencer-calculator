import { computeUnit, computeVolume, SHARE_VARIANTS, VOLUME_PRESETS, type CalculatorInputs } from "./calc";

/** CSV s oddělovačem ";" (Excel v českém prostředí) a desetinnou čárkou. */
function csvNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace(".", ",");
}

function csvRow(cells: Array<string | number>): string {
  return cells
    .map((c) => (typeof c === "number" ? csvNumber(c) : `"${String(c).replace(/"/g, '""')}"`))
    .join(";");
}

export function buildCsv(inputs: CalculatorInputs, scenarioName = "Scénář"): string {
  const lines: string[] = [];
  const unit = computeUnit(inputs);
  const push = (cells: Array<string | number>) => lines.push(csvRow(cells));

  push(["Influencer Business Model Calculator"]);
  push(["Scénář", scenarioName]);
  push(["Vygenerováno", new Date().toLocaleString("cs-CZ")]);
  push([]);

  push(["VSTUPY"]);
  push(["Prodejní cena vč. DPH (Kč)", inputs.sellingPrice]);
  push(["Alternativní cena vč. DPH (Kč)", inputs.altPrice]);
  push(["DPH (%)", inputs.vatRate * 100]);
  push(["Výrobní náklad bez DPH (Kč/ks)", inputs.productionCost]);
  push(["Podíl influencera (%)", inputs.influencerShare * 100]);
  push(["Podíl firmy (%)", (1 - inputs.influencerShare) * 100]);
  push(["Marketing (Kč/ks)", inputs.marketingCost]);
  push(["Provozní náklady (Kč/ks)", unit.operatingCost]);
  if (inputs.operatingCostMode === "detailed") {
    push(["  Logistika", inputs.operatingCosts.logistics]);
    push(["  Handling", inputs.operatingCosts.handling]);
    push(["  Skladování", inputs.operatingCosts.warehousing]);
    push(["  Platby", inputs.operatingCosts.paymentFees]);
    push(["  Ostatní", inputs.operatingCosts.other]);
  }
  push(["Počet kusů", inputs.volume]);
  push(["Progresivní odměňování", inputs.tieredEnabled ? "ano" : "ne"]);
  if (inputs.tieredEnabled) {
    inputs.tiers.forEach((t, i) => push([`  Pásmo ${i + 1} do (ks)`, t.upTo === null ? "bez limitu" : t.upTo, "sazba (%)", t.share * 100]));
  }
  push([]);

  push(["JEDNOTKOVÁ EKONOMIKA (Kč/ks)"]);
  push(["Prodejní cena vč. DPH", unit.sellingPrice]);
  push(["DPH", unit.vatAmount]);
  push(["Tržba bez DPH", unit.revenueNet]);
  push(["Výrobní náklad", unit.productionCost]);
  push(["Marže k rozdělení", unit.profitPool]);
  push(["Odměna influencera", unit.influencerEarnings]);
  push(["Podíl firmy před provozními náklady", unit.companyGrossShare]);
  push(["Provozní náklady", unit.operatingCost]);
  push(["Marketing", unit.marketingCost]);
  push(["Příspěvek firmy", unit.companyContribution]);
  push(["Příspěvková marže firmy (%)", unit.contributionMarginPct * 100]);
  push([]);

  push(["SCÉNÁŘE PRODEJŮ"]);
  push(["Kusy", "Tržby vč. DPH", "Tržby bez DPH", "Výrobní náklady", "Odměna influencera", "Provozní náklady", "Marketing", "Příspěvek firmy", "Efektivní podíl influencera (%)"]);
  const volumes = Array.from(new Set([...VOLUME_PRESETS, inputs.volume])).sort((a, b) => a - b);
  for (const q of volumes) {
    const v = computeVolume(inputs, q);
    push([q, v.revenueGross, v.revenueNet, v.productionCost, v.influencerEarnings, v.operatingCost, v.marketingCost, v.companyContribution, v.effectiveInfluencerShare * 100]);
  }
  push([]);

  push(["POROVNÁNÍ MODELŮ (pevný podíl, objem " + inputs.volume + " ks)"]);
  push(["Influencer (%)", "Firma (%)", "Odměna influencera/ks", "Příspěvek firmy/ks", "Odměna influencera celkem", "Příspěvek firmy celkem"]);
  for (const s of SHARE_VARIANTS) {
    const u = computeUnit(inputs, { influencerShare: s });
    const v = computeVolume(inputs, inputs.volume, { influencerShare: s, tiered: false });
    push([s * 100, (1 - s) * 100, u.influencerEarnings, u.companyContribution, v.influencerEarnings, v.companyContribution]);
  }
  push([]);

  push(["POROVNÁNÍ CEN (na kus)"]);
  push(["Cena vč. DPH", "Tržba bez DPH", "Marže k rozdělení", "Odměna influencera", "Příspěvek firmy"]);
  for (const price of Array.from(new Set([inputs.altPrice, inputs.sellingPrice])).sort((a, b) => a - b)) {
    const u = computeUnit(inputs, { sellingPrice: price });
    push([price, u.revenueNet, u.profitPool, u.influencerEarnings, u.companyContribution]);
  }

  return "﻿" + lines.join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
