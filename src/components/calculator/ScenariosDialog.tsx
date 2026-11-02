import { useEffect, useState } from "react";
import { FolderOpen, Save, Trash2, Link2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { loadScenarios, saveScenario, deleteScenario, type SavedScenario } from "@/lib/storage";
import { buildShareUrl } from "@/lib/share";
import { computeUnit } from "@/lib/calc";
import { formatCZK, formatPct, formatNumber } from "@/lib/format";
import type { CalculatorApi } from "@/hooks/useCalculator";

export function ScenariosDialog({ api }: { api: CalculatorApi }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SavedScenario[]>([]);
  const [name, setName] = useState(api.scenarioName);

  useEffect(() => {
    if (open) {
      setList(loadScenarios());
      setName(api.scenarioName || "");
    }
  }, [open, api.scenarioName]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Zadejte název scénáře.");
      return;
    }
    const existing = list.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    const next = saveScenario(trimmed, api.inputs, existing?.id);
    setList(next);
    api.setScenarioName(trimmed);
    toast.success(existing ? `Scénář „${trimmed}“ aktualizován.` : `Scénář „${trimmed}“ uložen.`);
  };

  const load = (s: SavedScenario) => {
    api.replace(s.inputs, s.name);
    setOpen(false);
    toast.success(`Načten scénář „${s.name}“.`);
  };

  const remove = (s: SavedScenario) => {
    setList(deleteScenario(s.id));
    toast(`Scénář „${s.name}“ smazán.`);
  };

  const share = async (s: SavedScenario) => {
    const url = buildShareUrl(s.inputs, s.name);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Odkaz na scénář zkopírován.");
    } catch {
      window.prompt("Zkopírujte odkaz:", url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen className="mr-1.5 h-4 w-4" /> Scénáře
          {list.length > 0 && <span className="ml-1.5 rounded-full bg-secondary px-1.5 text-[10px]">{list.length}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Uložené scénáře</DialogTitle>
          <DialogDescription>Scénáře se ukládají do prohlížeče (localStorage). Pro sdílení na jiné zařízení použijte odkaz.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="Název scénáře, např. Launch 599 Kč / 40 %" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <Button onClick={save}>
            <Save className="mr-1.5 h-4 w-4" /> Uložit
          </Button>
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Zatím žádné uložené scénáře.</p>}
          {list.map((s) => {
            const u = computeUnit(s.inputs);
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCZK(s.inputs.sellingPrice, 0)} · {formatPct(s.inputs.influencerShare)}/{formatPct(1 - s.inputs.influencerShare)}
                    {s.inputs.tieredEnabled && " · progresivní"} · {formatNumber(s.inputs.volume)} ks · firma {formatCZK(u.companyContribution)}/ks
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(s.updatedAt).toLocaleString("cs-CZ")}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Načíst" onClick={() => load(s)}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Kopírovat odkaz" onClick={() => share(s)}>
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Smazat" onClick={() => remove(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
