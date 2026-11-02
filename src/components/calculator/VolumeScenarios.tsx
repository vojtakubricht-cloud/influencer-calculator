import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField } from "./fields";
import { computeVolume, VOLUME_PRESETS } from "@/lib/calc";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";

export function VolumeScenarios({ api }: { api: CalculatorApi }) {
  const { inputs, update } = api;
  const volumes = Array.from(new Set([...VOLUME_PRESETS, inputs.volume])).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-card print-avoid">
        <div className="flex flex-col gap-3 p-5 pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="section-title">Scénáře prodejů</h3>
            <p className="section-desc">
              Cena {formatCZK(inputs.sellingPrice)}, model {formatPct(inputs.influencerShare)} / {formatPct(1 - inputs.influencerShare)}
              {inputs.tieredEnabled && " (progresivní – efektivní podíl se liší podle objemu)"}.
            </p>
          </div>
          <div className="w-full md:w-48 no-print">
            <NumberField label="Vlastní objem" value={inputs.volume} onChange={(v) => update("volume", v)} min={0} integer step={100} suffix="ks" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Kusy</TableHead>
                <TableHead className="text-right">Tržby vč. DPH</TableHead>
                <TableHead className="text-right">Tržby bez DPH</TableHead>
                <TableHead className="text-right">Výrobní náklady</TableHead>
                <TableHead className="text-right text-influencer">Odměna influencera</TableHead>
                {inputs.tieredEnabled && <TableHead className="text-right">Ef. podíl</TableHead>}
                <TableHead className="text-right">Provozní náklady</TableHead>
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
                    <TableCell className="num">{formatCZK(v.revenueNet, 0)}</TableCell>
                    <TableCell className="num">{formatCZK(v.productionCost, 0)}</TableCell>
                    <TableCell className="num text-influencer">{formatCZK(v.influencerEarnings, 0)}</TableCell>
                    {inputs.tieredEnabled && <TableCell className="num text-muted-foreground">{formatPct(v.effectiveInfluencerShare)}</TableCell>}
                    <TableCell className="num">{formatCZK(v.operatingCost + v.marketingCost, 0)}</TableCell>
                    <TableCell className={cn("num", v.companyContribution < 0 ? "text-destructive" : "text-company")}>{formatCZK(v.companyContribution, 0)}</TableCell>
                    <TableCell className="num text-muted-foreground">{formatPct(v.contributionMarginPct)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="border-t p-4 text-[11px] text-muted-foreground">
          Provozní náklady zahrnují logistiku, handling, skladování, platby, ostatní variabilní náklady a marketing. Příspěvek firmy je před fixními náklady a daní z příjmů.
        </p>
      </div>
    </div>
  );
}
