import { Tag, Layers, Users, Building2, TrendingUp, Percent, AlertTriangle } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeVolume, VOLUME_PRESETS } from "@/lib/calc";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/colors";

export function Dashboard({ api }: { api: CalculatorApi }) {
  const { inputs, unit, atVolume } = api;

  const segments = [
    { key: "vat", label: "DPH", value: unit.vatAmount, color: COLORS.vat },
    { key: "production", label: "Výroba", value: unit.productionCost, color: COLORS.production },
    { key: "influencer", label: "Influencer", value: unit.influencerEarnings, color: COLORS.influencer },
    { key: "operating", label: "Provoz + marketing", value: unit.operatingCost + unit.marketingCost, color: COLORS.cost },
    { key: "company", label: "Příspěvek firmy", value: Math.max(0, unit.companyContribution), color: COLORS.company },
  ];
  const segTotal = segments.reduce((s, x) => s + Math.max(0, x.value), 0);

  const volumes = Array.from(new Set([...VOLUME_PRESETS, inputs.volume])).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {unit.poolNegative && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Marže k rozdělení je záporná</p>
            <p className="text-muted-foreground">
              Prodejní cena bez DPH ({formatCZK(unit.revenueNet)}) nepokryje výrobní náklad ({formatCZK(unit.productionCost)}). Odměna influencera je
              nastavena na 0 Kč, ztrátu nese firma.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Prodejní cena" value={formatCZK(unit.sellingPrice)} sub={`bez DPH ${formatCZK(unit.revenueNet)}`} icon={<Tag />} />
        <KpiCard label="Marže k rozdělení" value={formatCZK(unit.profitPool)} sub={`po výrobě ${formatCZK(unit.productionCost)}`} icon={<Layers />} tone={unit.poolNegative ? "warning" : "default"} />
        <KpiCard label="Odměna influencera / ks" value={formatCZK(unit.influencerEarnings)} sub={`${formatPct(unit.influencerShare)} z marže`} icon={<Users />} tone="influencer" />
        <KpiCard label="Podíl firmy před náklady" value={formatCZK(unit.companyGrossShare)} sub={`${formatPct(1 - unit.influencerShare)} z marže`} icon={<Building2 />} />
        <KpiCard label="Příspěvek firmy / ks" value={formatCZK(unit.companyContribution)} sub={`po provozu ${formatCZK(unit.operatingCost + unit.marketingCost)}`} icon={<TrendingUp />} tone={unit.companyContribution < 0 ? "warning" : "company"} />
        <KpiCard label="Příspěvková marže firmy" value={formatPct(unit.contributionMarginPct)} sub="z tržby bez DPH" icon={<Percent />} tone={unit.companyContribution < 0 ? "warning" : "company"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-5 shadow-card lg:col-span-2 print-avoid">
          <h3 className="section-title">Rozpad jednoho kusu</h3>
          <p className="section-desc mb-4">Kam jde každá koruna z prodejní ceny {formatCZK(unit.sellingPrice)}.</p>
          <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label="Rozpad prodejní ceny">
            {segments.map((s) => (
              <div key={s.key} style={{ width: `${(Math.max(0, s.value) / segTotal) * 100}%`, background: s.color }} className="border-r-2 border-card last:border-r-0" title={`${s.label}: ${formatCZK(s.value)}`} />
            ))}
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { label: "Prodejní cena vč. DPH", value: unit.sellingPrice, strong: true },
              { label: "− DPH", value: -unit.vatAmount, color: COLORS.vat },
              { label: "= Tržba bez DPH", value: unit.revenueNet, strong: true },
              { label: "− Výrobní náklad", value: -unit.productionCost, color: COLORS.production },
              { label: "= Marže k rozdělení", value: unit.profitPool, strong: true },
              { label: `− Influencer (${formatPct(unit.influencerShare)})`, value: -unit.influencerEarnings, color: COLORS.influencer },
              { label: `= Podíl firmy (${formatPct(1 - unit.influencerShare)})`, value: unit.companyGrossShare, strong: true },
              { label: "− Provozní náklady", value: -unit.operatingCost, color: COLORS.cost },
              ...(unit.marketingCost > 0 ? [{ label: "− Marketing", value: -unit.marketingCost, color: COLORS.cost }] : []),
              { label: "= Příspěvek firmy", value: unit.companyContribution, strong: true, final: true },
            ].map((row) => (
              <li key={row.label} className={cn("flex items-center justify-between gap-3", row.strong && "font-medium", row.final && "border-t pt-2 text-company")}>
                <span className="flex items-center gap-2">
                  {row.color && <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} />}
                  {row.label}
                </span>
                <span className="tabular">{formatCZK(row.value)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Příspěvek firmy je před fixními náklady, vývojem a daní z příjmů – nejde o čistý zisk.</p>
        </div>

        <div className="rounded-lg border bg-card shadow-card lg:col-span-3 print-avoid">
          <div className="p-5 pb-3">
            <h3 className="section-title">Výsledky podle objemu prodeje</h3>
            <p className="section-desc">
              Aktuální model {formatPct(inputs.influencerShare)} / {formatPct(1 - inputs.influencerShare)}
              {inputs.tieredEnabled && " · progresivní odměňování zapnuto"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Kusy</TableHead>
                  <TableHead className="text-right">Tržby vč. DPH</TableHead>
                  <TableHead className="text-right text-influencer">Influencer</TableHead>
                  <TableHead className="text-right text-company">Příspěvek firmy</TableHead>
                  <TableHead className="text-right">Marže</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volumes.map((q) => {
                  const v = computeVolume(inputs, q);
                  const current = q === inputs.volume;
                  return (
                    <TableRow key={q} className={cn(current && "bg-secondary/60 font-medium")}>
                      <TableCell>
                        {formatNumber(q)}
                        {current && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">zvoleno</span>}
                      </TableCell>
                      <TableCell className="num">{formatCZK(v.revenueGross, 0)}</TableCell>
                      <TableCell className="num text-influencer">{formatCZK(v.influencerEarnings, 0)}</TableCell>
                      <TableCell className={cn("num", v.companyContribution < 0 ? "text-destructive" : "text-company")}>{formatCZK(v.companyContribution, 0)}</TableCell>
                      <TableCell className="num text-muted-foreground">{formatPct(v.contributionMarginPct)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t p-4 text-sm md:grid-cols-4">
            <Stat label={`Tržby bez DPH (${formatNumber(atVolume.volume)} ks)`} value={formatCZK(atVolume.revenueNet, 0)} />
            <Stat label="Výrobní náklady" value={formatCZK(atVolume.productionCost, 0)} />
            <Stat label="Odměna influencera" value={formatCZK(atVolume.influencerEarnings, 0)} tone="influencer" />
            <Stat label="Příspěvek firmy" value={formatCZK(atVolume.companyContribution, 0)} tone="company" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "influencer" | "company" }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("tabular font-semibold", tone === "influencer" && "text-influencer", tone === "company" && "text-company")}>{value}</p>
    </div>
  );
}
