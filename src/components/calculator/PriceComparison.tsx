import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField } from "./fields";
import { computeUnit, computeVolume } from "@/lib/calc";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";

export function PriceComparison({ api }: { api: CalculatorApi }) {
  const { inputs, update } = api;
  const [extraPrices, setExtraPrices] = useState<number[]>([]);
  const [newPrice, setNewPrice] = useState<number>(699);

  const prices = Array.from(new Set([inputs.altPrice, inputs.sellingPrice, ...extraPrices].filter((p) => p > 0))).sort((a, b) => a - b);
  const base = computeUnit(inputs);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prices.map((p) => {
          const u = computeUnit(inputs, { sellingPrice: p });
          const v = computeVolume(inputs, inputs.volume, { sellingPrice: p });
          const isCurrent = p === inputs.sellingPrice;
          const isAlt = p === inputs.altPrice;
          const extra = !isCurrent && !isAlt;
          return (
            <div key={p} className={cn("relative rounded-lg border bg-card p-4 shadow-card print-avoid", isCurrent && "border-primary/40 ring-1 ring-primary/20")}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{isCurrent ? "Aktuální cena" : isAlt ? "Alternativní cena" : "Vlastní cena"}</p>
                  <p className="tabular text-xl font-semibold">{formatCZK(p, 0)}</p>
                </div>
                <div className="flex gap-1">
                  {!isCurrent && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => update("sellingPrice", p)}>
                      Použít
                    </Button>
                  )}
                  {extra && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Odebrat cenu" onClick={() => setExtraPrices((xs) => xs.filter((x) => x !== p))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <dl className="space-y-1.5 text-sm">
                <Row label="Tržba bez DPH" value={formatCZK(u.revenueNet)} />
                <Row label="Marže k rozdělení" value={formatCZK(u.profitPool)} warn={u.poolNegative} />
                <Row label="Influencer / ks" value={formatCZK(u.influencerEarnings)} tone="influencer" />
                <Row label="Příspěvek firmy / ks" value={formatCZK(u.companyContribution)} tone="company" warn={u.companyContribution < 0} />
                <Row label="Marže firmy" value={formatPct(u.contributionMarginPct)} />
                <div className="border-t pt-1.5" />
                <Row label={`Influencer (${formatNumber(inputs.volume)} ks)`} value={formatCZK(v.influencerEarnings, 0)} tone="influencer" />
                <Row label={`Firma (${formatNumber(inputs.volume)} ks)`} value={formatCZK(v.companyContribution, 0)} tone="company" warn={v.companyContribution < 0} />
              </dl>
              {!isCurrent && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Oproti {formatCZK(inputs.sellingPrice, 0)}: influencer {delta(u.influencerEarnings - base.influencerEarnings)}, firma {delta(u.companyContribution - base.companyContribution)} na kus
                </p>
              )}
            </div>
          );
        })}
        <div className="flex flex-col justify-center gap-2 rounded-lg border border-dashed p-4 no-print">
          <p className="text-xs font-medium">Přidat další cenu</p>
          <div className="flex items-end gap-2">
            <NumberField compact label="Nová cena" value={newPrice} onChange={setNewPrice} min={1} step={10} suffix="Kč" className="flex-1" />
            <Button size="sm" className="h-9" onClick={() => newPrice > 0 && setExtraPrices((xs) => (xs.includes(newPrice) ? xs : [...xs, newPrice]))}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Přidat
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-card print-avoid">
        <div className="p-5 pb-3">
          <h3 className="section-title">Vliv ceny na výdělky</h3>
          <p className="section-desc">Jednotková ekonomika při modelu {formatPct(inputs.influencerShare)} / {formatPct(1 - inputs.influencerShare)}.</p>
        </div>
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Cena vč. DPH</TableHead>
                <TableHead className="text-right">Bez DPH</TableHead>
                <TableHead className="text-right">Marže k rozdělení</TableHead>
                <TableHead className="text-right text-influencer">Influencer / ks</TableHead>
                <TableHead className="text-right">Firma před náklady</TableHead>
                <TableHead className="text-right text-company">Příspěvek firmy / ks</TableHead>
                <TableHead className="text-right">Marže firmy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((p) => {
                const u = computeUnit(inputs, { sellingPrice: p });
                return (
                  <TableRow key={p} className={cn(p === inputs.sellingPrice && "bg-secondary/60 font-medium")}>
                    <TableCell>{formatCZK(p, 0)}</TableCell>
                    <TableCell className="num">{formatCZK(u.revenueNet)}</TableCell>
                    <TableCell className={cn("num", u.poolNegative && "text-destructive")}>{formatCZK(u.profitPool)}</TableCell>
                    <TableCell className="num text-influencer">{formatCZK(u.influencerEarnings)}</TableCell>
                    <TableCell className="num">{formatCZK(u.companyGrossShare)}</TableCell>
                    <TableCell className={cn("num", u.companyContribution < 0 ? "text-destructive" : "text-company")}>{formatCZK(u.companyContribution)}</TableCell>
                    <TableCell className="num text-muted-foreground">{formatPct(u.contributionMarginPct)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function delta(n: number): string {
  const s = formatCZK(Math.abs(n));
  return n >= 0 ? `+${s}` : `−${s}`;
}

function Row({ label, value, tone, warn }: { label: string; value: string; tone?: "influencer" | "company"; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular font-medium", tone === "influencer" && "text-influencer", tone === "company" && "text-company", warn && "text-destructive")}>{value}</dd>
    </div>
  );
}
