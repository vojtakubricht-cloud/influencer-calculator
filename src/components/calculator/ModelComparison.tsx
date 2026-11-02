import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeUnit, computeVolume, SHARE_VARIANTS } from "@/lib/calc";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";

export function ModelComparison({ api }: { api: CalculatorApi }) {
  const { inputs, update } = api;
  const shares = Array.from(new Set([...SHARE_VARIANTS, inputs.influencerShare])).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-card print-avoid">
        <div className="p-5 pb-3">
          <h3 className="section-title">Porovnání obchodních modelů</h3>
          <p className="section-desc">
            Pevný podíl na marži při ceně {formatCZK(inputs.sellingPrice)} a objemu {formatNumber(inputs.volume)} ks. Kliknutím na řádek nastavíte model.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right text-influencer">Influencer / ks</TableHead>
                <TableHead className="text-right">Firma před náklady / ks</TableHead>
                <TableHead className="text-right text-company">Příspěvek firmy / ks</TableHead>
                <TableHead className="text-right">Marže firmy</TableHead>
                <TableHead className="text-right text-influencer">Influencer celkem</TableHead>
                <TableHead className="text-right text-company">Příspěvek firmy celkem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shares.map((s) => {
                const u = computeUnit(inputs, { influencerShare: s });
                const v = computeVolume(inputs, inputs.volume, { influencerShare: s, tiered: false });
                const current = Math.abs(s - inputs.influencerShare) < 1e-9;
                return (
                  <TableRow
                    key={s}
                    role="button"
                    tabIndex={0}
                    onClick={() => update("influencerShare", s)}
                    onKeyDown={(e) => e.key === "Enter" && update("influencerShare", s)}
                    className={cn("cursor-pointer", current && "bg-secondary/60 font-medium")}
                  >
                    <TableCell>
                      <span className="text-influencer">{formatPct(s)}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-company">{formatPct(1 - s)}</span>
                      {current && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">aktuální</span>}
                    </TableCell>
                    <TableCell className="num text-influencer">{formatCZK(u.influencerEarnings)}</TableCell>
                    <TableCell className="num">{formatCZK(u.companyGrossShare)}</TableCell>
                    <TableCell className={cn("num", u.companyContribution < 0 ? "text-destructive" : "text-company")}>{formatCZK(u.companyContribution)}</TableCell>
                    <TableCell className="num text-muted-foreground">{formatPct(u.contributionMarginPct)}</TableCell>
                    <TableCell className="num text-influencer">{formatCZK(v.influencerEarnings, 0)}</TableCell>
                    <TableCell className={cn("num", v.companyContribution < 0 ? "text-destructive" : "text-company")}>{formatCZK(v.companyContribution, 0)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="border-t p-4 text-[11px] text-muted-foreground">
          Provozní náklady {formatCZK(computeUnit(inputs).operatingCost + inputs.marketingCost)} na kus jdou vždy z podílu firmy – proto se s rostoucím podílem
          influencera příspěvek firmy snižuje rychleji než její hrubý podíl.
        </p>
      </div>
    </div>
  );
}
