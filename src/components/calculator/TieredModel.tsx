import { Plus, Trash2, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField } from "./fields";
import { computeVolume, computeUnit, normalizeTiers, VOLUME_PRESETS, type Tier } from "@/lib/calc";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";

export function TieredModel({ api }: { api: CalculatorApi }) {
  const { inputs, update, updateTiers, issues } = api;
  const tiers = inputs.tiers;
  const unit = computeUnit(inputs);
  const tierIssues = issues.filter((i) => i.field.startsWith("tiers"));

  const setTier = (index: number, patch: Partial<Tier>) => {
    updateTiers(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };
  const removeTier = (index: number) => updateTiers(tiers.filter((_, i) => i !== index));
  const addTier = () => {
    const sorted = normalizeTiers(tiers);
    const lastClosed = [...sorted].reverse().find((t) => t.upTo !== null);
    const open = sorted.find((t) => t.upTo === null);
    const nextBound = (lastClosed?.upTo ?? 0) * 2 || 1000;
    const nextShare = Math.min(1, (lastClosed?.share ?? 0.3) + 0.1);
    const closed = sorted.filter((t) => t.upTo !== null);
    updateTiers([...closed, { upTo: nextBound, share: nextShare }, ...(open ? [open] : [])]);
  };

  const lowerBounds = (() => {
    const sorted = normalizeTiers(tiers);
    const map = new Map<Tier, number>();
    let lower = 0;
    for (const t of sorted) {
      map.set(t, lower);
      if (t.upTo !== null) lower = t.upTo;
    }
    return map;
  })();

  const tieredAtVolume = computeVolume(inputs, inputs.volume, { tiered: true });
  const flatAtVolume = computeVolume(inputs, inputs.volume, { tiered: false });
  const volumes = Array.from(new Set([...VOLUME_PRESETS, inputs.volume])).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-5 shadow-card lg:col-span-2 no-print">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="section-title">Progresivní odměňování</h3>
              <p className="section-desc">Vyšší sazba platí jen pro kusy v daném pásmu, nikoli zpětně.</p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Label htmlFor="tiered-tab" className="text-xs">
                {inputs.tieredEnabled ? "Zapnuto" : "Vypnuto"}
              </Label>
              <Switch id="tiered-tab" checked={inputs.tieredEnabled} onCheckedChange={(v) => update("tieredEnabled", v)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>Od (ks)</span>
              <span>Do (ks)</span>
              <span>Sazba</span>
              <span className="w-8" />
            </div>
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                <div className="tabular flex h-9 items-center rounded-md border bg-secondary/50 px-3 text-sm text-muted-foreground">
                  {formatNumber((lowerBounds.get(t) ?? 0) + 1)}
                </div>
                {t.upTo === null ? (
                  <button
                    type="button"
                    className="flex h-9 items-center justify-between rounded-md border bg-secondary/50 px-3 text-sm text-muted-foreground hover:bg-secondary"
                    title="Kliknutím nastavíte horní hranici"
                    onClick={() => setTier(i, { upTo: ((lowerBounds.get(t) ?? 0) || 1000) * 2 })}
                  >
                    bez limitu <InfinityIcon className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <NumberField compact label={`Horní hranice pásma ${i + 1}`} value={t.upTo} onChange={(v) => setTier(i, { upTo: v })} min={1} integer step={100} />
                )}
                <NumberField compact label={`Sazba pásma ${i + 1}`} value={t.share} onChange={(v) => setTier(i, { share: v })} min={0} max={1} percent step={1} suffix="%" />
                <div className="flex w-8 items-center justify-center">
                  {t.upTo !== null && i === tiers.length - 1 ? (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Bez horní hranice" onClick={() => setTier(i, { upTo: null })}>
                      <InfinityIcon className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Odebrat pásmo" disabled={tiers.length <= 1} onClick={() => removeTier(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-1 h-8 w-full no-print" onClick={addTier}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Přidat pásmo
            </Button>
            {tierIssues.map((i, idx) => (
              <p key={idx} className="text-[11px] text-destructive">
                {i.message}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-card lg:col-span-3 print-avoid">
          <div className="p-5 pb-3">
            <h3 className="section-title">Rozpad odměny při {formatNumber(inputs.volume)} ks</h3>
            <p className="section-desc">Marže k rozdělení {formatCZK(unit.profitPool)} na kus; každé pásmo se odměňuje vlastní sazbou.</p>
          </div>
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Pásmo</TableHead>
                <TableHead className="text-right">Sazba</TableHead>
                <TableHead className="text-right">Kusy v pásmu</TableHead>
                <TableHead className="text-right text-influencer">Odměna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tieredAtVolume.tierBreakdown.map((b, i) => (
                <TableRow key={i} className={cn(b.units === 0 && "text-muted-foreground")}>
                  <TableCell>
                    {formatNumber(b.from)} – {b.to === null ? "∞" : formatNumber(b.to)}
                  </TableCell>
                  <TableCell className="num">{formatPct(b.share)}</TableCell>
                  <TableCell className="num">{formatNumber(b.units)}</TableCell>
                  <TableCell className="num text-influencer">{formatCZK(b.earnings, 0)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell>Celkem</TableCell>
                <TableCell className="num">ef. {formatPct(tieredAtVolume.effectiveInfluencerShare)}</TableCell>
                <TableCell className="num">{formatNumber(inputs.volume)}</TableCell>
                <TableCell className="num text-influencer">{formatCZK(tieredAtVolume.influencerEarnings, 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="grid grid-cols-2 gap-3 border-t p-4 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground">Příspěvek firmy (progresivní)</p>
              <p className="tabular font-semibold text-company">{formatCZK(tieredAtVolume.companyContribution, 0)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Příspěvek firmy (pevných {formatPct(inputs.influencerShare)})</p>
              <p className="tabular font-semibold">{formatCZK(flatAtVolume.companyContribution, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-card print-avoid">
        <div className="p-5 pb-3">
          <h3 className="section-title">Progresivní vs. pevný podíl podle objemu</h3>
          <p className="section-desc">Porovnání s pevným podílem {formatPct(inputs.influencerShare)}.</p>
        </div>
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Kusy</TableHead>
                <TableHead className="text-right text-influencer">Influencer – progresivní</TableHead>
                <TableHead className="text-right">Ef. podíl</TableHead>
                <TableHead className="text-right text-influencer">Influencer – pevný</TableHead>
                <TableHead className="text-right text-company">Firma – progresivní</TableHead>
                <TableHead className="text-right text-company">Firma – pevný</TableHead>
                <TableHead className="text-right">Rozdíl pro firmu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volumes.map((q) => {
                const t = computeVolume(inputs, q, { tiered: true });
                const f = computeVolume(inputs, q, { tiered: false });
                const diff = t.companyContribution - f.companyContribution;
                return (
                  <TableRow key={q} className={cn(q === inputs.volume && "bg-secondary/60 font-medium")}>
                    <TableCell>{formatNumber(q)}</TableCell>
                    <TableCell className="num text-influencer">{formatCZK(t.influencerEarnings, 0)}</TableCell>
                    <TableCell className="num text-muted-foreground">{formatPct(t.effectiveInfluencerShare)}</TableCell>
                    <TableCell className="num text-influencer">{formatCZK(f.influencerEarnings, 0)}</TableCell>
                    <TableCell className="num text-company">{formatCZK(t.companyContribution, 0)}</TableCell>
                    <TableCell className="num text-company">{formatCZK(f.companyContribution, 0)}</TableCell>
                    <TableCell className={cn("num", diff < 0 ? "text-destructive" : diff > 0 ? "text-success" : "text-muted-foreground")}>
                      {diff >= 0 ? "+" : "−"}
                      {formatCZK(Math.abs(diff), 0)}
                    </TableCell>
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
