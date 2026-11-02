import { Percent, Package, Split, Truck, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { NumberField, SliderField, FieldGroup } from "./fields";
import { VOLUME_PRESETS, sumOperatingCosts } from "@/lib/calc";
import { formatCZK, formatNumber, formatPct } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";

export function InputsPanel({ api }: { api: CalculatorApi }) {
  const { inputs, update, updateOperatingCost, unit } = api;
  const detailedTotal = sumOperatingCosts(inputs.operatingCosts);

  return (
    <div className="space-y-6">
      <FieldGroup title="Produkt a cena" description="Ceny včetně DPH, výrobní náklad bez DPH.">
        <SliderField
          label="Prodejní cena (vč. DPH)"
          value={inputs.sellingPrice}
          onChange={(v) => update("sellingPrice", v)}
          min={1}
          max={2000}
          step={1}
          suffix="Kč"
          display={(v) => `Tržba bez DPH ${formatCZK(v / (1 + inputs.vatRate))}`}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Alternativní cena" value={inputs.altPrice} onChange={(v) => update("altPrice", v)} min={0} suffix="Kč" step={1} />
          <NumberField label="DPH" value={inputs.vatRate} onChange={(v) => update("vatRate", v)} min={0} max={1} percent step={1} suffix="%" />
        </div>
        <NumberField
          label="Výrobní náklad na kus (bez DPH)"
          value={inputs.productionCost}
          onChange={(v) => update("productionCost", v)}
          min={0}
          step={1}
          suffix="Kč"
          hint={`Marže k rozdělení: ${formatCZK(unit.profitPool)} na kus`}
        />
      </FieldGroup>

      <Separator />

      <FieldGroup title="Rozdělení marže" description="Podíl influencera na marži k rozdělení.">
        <SliderField
          label="Podíl influencera"
          value={inputs.influencerShare}
          onChange={(v) => update("influencerShare", v)}
          min={0}
          max={1}
          step={0.01}
          percent
          suffix="%"
          accent="influencer"
          display={(v) => `Influencer ${formatPct(v)} / firma ${formatPct(1 - v)}`}
        />
        <div className="flex items-center justify-between rounded-md border bg-secondary/50 px-3 py-2">
          <div>
            <Label htmlFor="tiered" className="text-xs font-medium">
              Progresivní odměňování
            </Label>
            <p className="text-[11px] text-muted-foreground">Sazba podle pásem objemu (nastavení v záložce)</p>
          </div>
          <Switch id="tiered" checked={inputs.tieredEnabled} onCheckedChange={(v) => update("tieredEnabled", v)} />
        </div>
      </FieldGroup>

      <Separator />

      <FieldGroup
        title="Provozní náklady firmy"
        description="Hradí firma ze svého podílu, influencerovi se neodečítají."
        action={
          <div className="flex rounded-md border bg-secondary p-0.5 text-[11px]">
            {(["summary", "detailed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update("operatingCostMode", m)}
                className={cn(
                  "rounded px-2 py-1 font-medium transition-colors",
                  inputs.operatingCostMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "summary" ? "Souhrnně" : "Jednotlivě"}
              </button>
            ))}
          </div>
        }
      >
        {inputs.operatingCostMode === "summary" ? (
          <NumberField
            label="Logistika, handling, skladování a platby"
            value={inputs.operatingCostSummary}
            onChange={(v) => update("operatingCostSummary", v)}
            min={0}
            step={1}
            suffix="Kč/ks"
            hint="Orientační předpoklad – upřesněte podle nabídek fulfillment partnera."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Logistika / expedice" value={inputs.operatingCosts.logistics} onChange={(v) => updateOperatingCost("logistics", v)} min={0} step={1} suffix="Kč" />
            <NumberField label="Handling / fulfillment" value={inputs.operatingCosts.handling} onChange={(v) => updateOperatingCost("handling", v)} min={0} step={1} suffix="Kč" />
            <NumberField label="Skladování" value={inputs.operatingCosts.warehousing} onChange={(v) => updateOperatingCost("warehousing", v)} min={0} step={1} suffix="Kč" />
            <NumberField label="Platební poplatky" value={inputs.operatingCosts.paymentFees} onChange={(v) => updateOperatingCost("paymentFees", v)} min={0} step={1} suffix="Kč" />
            <NumberField label="Ostatní variabilní" value={inputs.operatingCosts.other} onChange={(v) => updateOperatingCost("other", v)} min={0} step={1} suffix="Kč" />
            <div className="flex flex-col justify-end rounded-md border bg-secondary/50 px-3 py-2">
              <span className="text-[11px] text-muted-foreground">Celkem na kus</span>
              <span className="tabular text-sm font-semibold">{formatCZK(detailedTotal)}</span>
            </div>
          </div>
        )}
        <NumberField label="Marketingové náklady" value={inputs.marketingCost} onChange={(v) => update("marketingCost", v)} min={0} step={1} suffix="Kč/ks" hint="Např. placená podpora obsahu. Hradí firma." />
      </FieldGroup>

      <Separator />

      <FieldGroup title="Objem prodeje" description="Počet prodaných kusů pro výpočet celkových výsledků.">
        <NumberField label="Počet prodaných kusů" value={inputs.volume} onChange={(v) => update("volume", v)} min={0} integer step={100} suffix="ks" />
        <div className="flex flex-wrap gap-1.5">
          {VOLUME_PRESETS.map((q) => (
            <Button
              key={q}
              type="button"
              variant={inputs.volume === q ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => update("volume", q)}
            >
              {formatNumber(q)}
            </Button>
          ))}
        </div>
      </FieldGroup>

      <div className="rounded-lg border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
          <Split className="h-3.5 w-3.5" /> Jak se počítá
        </p>
        <ol className="list-decimal space-y-0.5 pl-4">
          <li className="flex items-center gap-1"><Percent className="h-3 w-3" /> Z ceny odečteme DPH</li>
          <li className="flex items-center gap-1"><Package className="h-3 w-3" /> Odečteme výrobní náklad = marže k rozdělení</li>
          <li className="flex items-center gap-1"><Split className="h-3 w-3" /> Marži rozdělíme podle podílu</li>
          <li className="flex items-center gap-1"><Truck className="h-3 w-3" /> Z podílu firmy odečteme provoz a marketing</li>
          <li className="flex items-center gap-1"><Hash className="h-3 w-3" /> Výsledek = příspěvek firmy před fixními náklady a daní</li>
        </ol>
      </div>
    </div>
  );
}
