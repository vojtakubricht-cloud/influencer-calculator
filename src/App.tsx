import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Share2, FileDown, FileText, RotateCcw, Calculator, AlertCircle, LayoutDashboard, GitCompare, Tags, BarChart3, TrendingUp, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalculator } from "@/hooks/useCalculator";
import { InputsPanel } from "@/components/calculator/InputsPanel";
import { Dashboard } from "@/components/calculator/Dashboard";
import { ModelComparison } from "@/components/calculator/ModelComparison";
import { PriceComparison } from "@/components/calculator/PriceComparison";
import { VolumeScenarios } from "@/components/calculator/VolumeScenarios";
import { TieredModel } from "@/components/calculator/TieredModel";
import { Charts } from "@/components/calculator/Charts";
import { ScenariosDialog } from "@/components/calculator/ScenariosDialog";
import { buildShareUrl } from "@/lib/share";
import { buildCsv, downloadTextFile } from "@/lib/export";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";

const TABS = [
  { value: "dashboard", label: "Přehled", icon: LayoutDashboard, printTitle: "Přehled" },
  { value: "models", label: "Modely", icon: GitCompare, printTitle: "Porovnání obchodních modelů" },
  { value: "prices", label: "Ceny", icon: Tags, printTitle: "Porovnání cen" },
  { value: "volumes", label: "Scénáře prodejů", icon: TrendingUp, printTitle: "Scénáře prodejů" },
  { value: "tiers", label: "Progresivní", icon: ListOrdered, printTitle: "Progresivní odměňování" },
  { value: "charts", label: "Grafy", icon: BarChart3, printTitle: "" },
] as const;

export default function App() {
  const api = useCalculator();
  const { inputs, unit, issues, invalid, scenarioName, reset } = api;
  const [tab, setTab] = useState<string>("dashboard");
  const [inputsOpen, setInputsOpen] = useState(false);
  const errors = issues.filter((i) => i.severity === "error");

  const share = async () => {
    const url = buildShareUrl(inputs, scenarioName || undefined);
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Odkaz zkopírován do schránky.", { description: "Obsahuje všechny vstupy – otevře se stejně na jiném zařízení." });
    } catch {
      window.prompt("Zkopírujte odkaz:", url);
    }
  };

  const exportCsv = () => {
    const name = scenarioName || "scenar";
    downloadTextFile(`influencer-kalkulace-${name.replace(/[^\w\dáčďéěíňóřšťúůýž-]+/gi, "-").toLowerCase()}.csv`, buildCsv(inputs, scenarioName || "Scénář"));
    toast.success("CSV export stažen.");
  };

  const exportPdf = () => {
    toast("Otevírám tiskový dialog – zvolte „Uložit jako PDF“.", { duration: 4000 });
    setTimeout(() => window.print(), 150);
  };

  const doReset = () => {
    reset();
    window.history.replaceState(null, "", window.location.pathname);
    toast("Vstupy obnoveny na výchozí hodnoty.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="bottom-right" closeButton />

      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur no-print">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Calculator className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">Influencer Business Model Calculator</h1>
              <p className="truncate text-[11px] text-muted-foreground">{scenarioName ? `Scénář: ${scenarioName}` : "Ekonomika spolupráce s influencery"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ScenariosDialog api={api} />
            <Button variant="outline" size="sm" onClick={share} disabled={invalid}>
              <Share2 className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Sdílet</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={invalid}>
              <FileDown className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={invalid}>
              <FileText className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={doReset} title="Reset na výchozí hodnoty">
              <RotateCcw className="h-4 w-4" /> <span className="ml-1.5 hidden md:inline">Reset</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hlavička pro tisk / PDF */}
      <div className="print-only mb-6">
        <h1 className="text-xl font-semibold">Influencer Business Model Calculator</h1>
        <p className="text-sm text-muted-foreground">
          {scenarioName ? `Scénář: ${scenarioName} · ` : ""}
          {new Date().toLocaleDateString("cs-CZ")}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-x-6 gap-y-1 text-xs">
          <PrintRow k="Prodejní cena vč. DPH" v={formatCZK(inputs.sellingPrice)} />
          <PrintRow k="Alternativní cena" v={formatCZK(inputs.altPrice)} />
          <PrintRow k="DPH" v={formatPct(inputs.vatRate)} />
          <PrintRow k="Výrobní náklad / ks" v={formatCZK(inputs.productionCost)} />
          <PrintRow k="Podíl influencera / firmy" v={`${formatPct(inputs.influencerShare)} / ${formatPct(1 - inputs.influencerShare)}`} />
          <PrintRow k="Provozní náklady / ks" v={formatCZK(unit.operatingCost)} />
          <PrintRow k="Marketing / ks" v={formatCZK(inputs.marketingCost)} />
          <PrintRow k="Objem" v={formatNumber(inputs.volume) + " ks"} />
          <PrintRow k="Progresivní odměňování" v={inputs.tieredEnabled ? inputs.tiers.map((t) => `${t.upTo === null ? "∞" : formatNumber(t.upTo)}: ${formatPct(t.share)}`).join(", ") : "ne"} />
        </div>
      </div>

      <main className="container grid gap-6 py-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] print:block print:py-0">
        <aside className="no-print lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          <div className="rounded-lg border bg-card p-5 shadow-card">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left lg:pointer-events-none"
              onClick={() => setInputsOpen((o) => !o)}
              aria-expanded={inputsOpen}
            >
              <div>
                <h2 className="text-sm font-semibold">Vstupy</h2>
                <p className="text-[11px] text-muted-foreground lg:hidden">
                  {formatCZK(inputs.sellingPrice, 0)} · {formatPct(inputs.influencerShare)}/{formatPct(1 - inputs.influencerShare)} · {formatNumber(inputs.volume)} ks
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform lg:hidden ${inputsOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`${inputsOpen ? "mt-4 block" : "hidden"} lg:mt-4 lg:block`}>
              <InputsPanel api={api} />
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {errors.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">Některé vstupy jsou neplatné</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {errors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="no-print mb-4 h-auto w-full flex-wrap justify-start gap-1 bg-secondary p-1">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 px-3 py-1.5 text-xs data-[state=active]:shadow-sm">
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map((t) => {
              const chart = t.value === "charts";
              return (
                <TabsContent
                  key={t.value}
                  value={t.value}
                  forceMount={chart ? undefined : true}
                  className={chart ? "mt-0 no-print" : "mt-0 data-[state=inactive]:hidden print:!block print:mb-8"}
                >
                  {!chart && <h2 className="print-only mb-3 text-base font-semibold">{t.printTitle}</h2>}
                  {t.value === "dashboard" && <Dashboard api={api} />}
                  {t.value === "models" && <ModelComparison api={api} />}
                  {t.value === "prices" && <PriceComparison api={api} />}
                  {t.value === "volumes" && <VolumeScenarios api={api} />}
                  {t.value === "tiers" && <TieredModel api={api} />}
                  {t.value === "charts" && tab === "charts" && <Charts api={api} />}
                </TabsContent>
              );
            })}
          </Tabs>
        </section>
      </main>

      <footer className="container pb-8 pt-2 text-[11px] text-muted-foreground no-print">
        Výpočty běží lokálně v prohlížeči, bez zaokrouhlování mezivýsledků. Příspěvek firmy je před fixními náklady, vývojem a daní z příjmů.
      </footer>
    </div>
  );
}

function PrintRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="tabular font-medium">{v}</span>
    </div>
  );
}
