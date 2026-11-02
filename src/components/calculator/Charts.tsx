import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { computeUnit, computeVolume, CHART_SHARE_VARIANTS } from "@/lib/calc";
import { formatCZK, formatCZKCompact, formatPct, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/colors";
import type { CalculatorApi } from "@/hooks/useCalculator";
import { cn } from "@/lib/utils";

const tickStyle = { fontSize: 11, fill: COLORS.textMuted };
const legendText = (value: string) => <span style={{ color: COLORS.textMuted }}>{value}</span>;

interface TooltipRow {
  name: string;
  value: number;
  color: string;
  decimals?: 0 | 2;
}

function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-card-hover">
      <p className="mb-1.5 font-medium">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
              {r.name}
            </span>
            <span className="tabular font-medium">{formatCZK(r.value, r.decimals ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type RechartsPayload = { payload?: Record<string, number>; dataKey?: string | number; name?: string; value?: number; color?: string }[];

function Card({ title, desc, children, className }: { title: string; desc: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-5 shadow-card", className)}>
      <h3 className="section-title">{title}</h3>
      <p className="section-desc mb-4">{desc}</p>
      {children}
    </div>
  );
}

export function Charts({ api }: { api: CalculatorApi }) {
  const { inputs, unit } = api;
  const [barMode, setBarMode] = useState<"unit" | "total">("total");

  // 1) Rozdělení marže
  const pieData = useMemo(() => {
    const costs = unit.operatingCost + unit.marketingCost;
    return [
      { name: "Odměna influencera", value: Math.max(0, unit.influencerEarnings), color: COLORS.influencer },
      { name: "Provozní náklady firmy", value: Math.max(0, Math.min(costs, unit.companyGrossShare)), color: COLORS.cost },
      { name: "Příspěvek firmy", value: Math.max(0, unit.companyContribution), color: COLORS.company },
    ];
  }, [unit]);

  // 2) Příspěvek firmy podle objemu
  const volumeData = useMemo(() => {
    const maxVol = Math.max(25000, Math.ceil((inputs.volume * 1.25) / 1000) * 1000);
    const steps = 50;
    const step = Math.max(1, Math.round(maxVol / steps));
    const points: { volume: number; company: number; influencer: number }[] = [];
    for (let q = 0; q <= maxVol; q += step) {
      const v = computeVolume(inputs, q);
      points.push({ volume: q, company: v.companyContribution, influencer: v.influencerEarnings });
    }
    const last = points[points.length - 1];
    if (last.volume !== maxVol) {
      const v = computeVolume(inputs, maxVol);
      points.push({ volume: maxVol, company: v.companyContribution, influencer: v.influencerEarnings });
    }
    return points;
  }, [inputs]);

  // 3) Porovnání 30/70, 40/60, 50/50
  const barData = useMemo(() => {
    const shares = Array.from(new Set([...CHART_SHARE_VARIANTS, inputs.influencerShare])).sort((a, b) => a - b);
    return shares.map((s) => {
      const u = computeUnit(inputs, { influencerShare: s });
      const v = computeVolume(inputs, inputs.volume, { influencerShare: s, tiered: false });
      return {
        model: `${Math.round(s * 100)}/${Math.round((1 - s) * 100)}`,
        influencer: barMode === "unit" ? u.influencerEarnings : v.influencerEarnings,
        company: barMode === "unit" ? u.companyContribution : v.companyContribution,
        current: Math.abs(s - inputs.influencerShare) < 1e-9,
      };
    });
  }, [inputs, barMode]);

  // 4) Vliv ceny
  const priceData = useMemo(() => {
    const lo = Math.max(25, Math.floor((Math.min(inputs.altPrice, inputs.sellingPrice) - 300) / 25) * 25);
    const hi = Math.ceil((Math.max(inputs.altPrice, inputs.sellingPrice) + 300) / 25) * 25;
    const points: { price: number; company: number; influencer: number }[] = [];
    for (let p = lo; p <= hi; p += 25) {
      const u = computeUnit(inputs, { sellingPrice: p });
      points.push({ price: p, company: u.companyContribution, influencer: u.influencerEarnings });
    }
    return points;
  }, [inputs]);

  const decimalsForBar: 0 | 2 = barMode === "unit" ? 2 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Rozdělení marže na kus" desc={`Marže k rozdělení ${formatCZK(unit.profitPool)} = influencer ${formatPct(unit.influencerShare)} + firma ${formatPct(1 - unit.influencerShare)} (z toho provoz a příspěvek).`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-56 w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    const p = (payload as RechartsPayload | undefined)?.[0];
                    if (!p) return null;
                    const d = p.payload as unknown as { name: string; value: number; color: string };
                    return <ChartTooltip title={d.name} rows={[{ name: "na kus", value: d.value, color: d.color, decimals: 2 }]} />;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-2 text-sm sm:w-1/2">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="tabular font-medium">
                  {formatCZK(d.value)} <span className="text-xs text-muted-foreground">({formatPct(unit.profitPool > 0 ? d.value / unit.profitPool : 0)})</span>
                </span>
              </li>
            ))}
            {unit.companyContribution < 0 && <li className="text-xs text-destructive">Příspěvek firmy je záporný ({formatCZK(unit.companyContribution)}) – v grafu zobrazen jako 0.</li>}
          </ul>
        </div>
      </Card>

      <Card title="Příspěvek firmy podle počtu prodaných kusů" desc={`Celkový příspěvek firmy a odměna influencera; svislá čára = zvolený objem ${formatNumber(inputs.volume)} ks.${inputs.tieredEnabled ? " Progresivní model mění sklon křivek na hranicích pásem." : ""}`}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="volume" tick={tickStyle} tickFormatter={(v: number) => formatNumber(v)} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
              <YAxis tick={tickStyle} tickFormatter={(v: number) => formatCZKCompact(v)} tickLine={false} axisLine={false} width={84} />
              <Tooltip
                content={({ payload, label }) => {
                  const rows = (payload as RechartsPayload | undefined) ?? [];
                  if (!rows.length) return null;
                  return (
                    <ChartTooltip
                      title={`${formatNumber(Number(label))} ks`}
                      rows={rows.map((r) => ({ name: String(r.name), value: Number(r.value), color: String(r.color) }))}
                    />
                  );
                }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
              <ReferenceLine x={inputs.volume} stroke={COLORS.muted} strokeDasharray="4 4" />
              <ReferenceLine y={0} stroke={COLORS.muted} />
              <Line type="monotone" dataKey="company" name="Příspěvek firmy" stroke={COLORS.company} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="influencer" name="Odměna influencera" stroke={COLORS.influencer} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Porovnání modelů 30/70, 40/60 a 50/50" desc={`Odměna influencera vs. příspěvek firmy ${barMode === "unit" ? "na kus" : `při ${formatNumber(inputs.volume)} ks`}.`}>
        <div className="mb-3 flex justify-end">
          <div className="flex rounded-md border bg-secondary p-0.5 text-[11px]">
            {(["total", "unit"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setBarMode(m)}
                className={cn("rounded px-2 py-1 font-medium transition-colors", barMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {m === "total" ? "Celkem" : "Na kus"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={4} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="model" tick={tickStyle} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
              <YAxis tick={tickStyle} tickFormatter={(v: number) => formatCZKCompact(v)} tickLine={false} axisLine={false} width={84} />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary))" }}
                content={({ payload, label }) => {
                  const rows = (payload as RechartsPayload | undefined) ?? [];
                  if (!rows.length) return null;
                  return (
                    <ChartTooltip
                      title={`Model ${label}`}
                      rows={rows.map((r) => ({ name: String(r.name), value: Number(r.value), color: String(r.color), decimals: decimalsForBar }))}
                    />
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
              <ReferenceLine y={0} stroke={COLORS.muted} />
              <Bar dataKey="influencer" name="Odměna influencera" fill={COLORS.influencer} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="company" name="Příspěvek firmy" fill={COLORS.company} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Vliv prodejní ceny na příspěvek firmy" desc={`Na kus při modelu ${formatPct(inputs.influencerShare)} / ${formatPct(1 - inputs.influencerShare)}; čáry označují ${formatCZK(inputs.altPrice, 0)} a ${formatCZK(inputs.sellingPrice, 0)}.`}>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="price" tick={tickStyle} tickFormatter={(v: number) => `${formatNumber(v)} Kč`} tickLine={false} axisLine={{ stroke: COLORS.grid }} />
              <YAxis tick={tickStyle} tickFormatter={(v: number) => formatCZKCompact(v)} tickLine={false} axisLine={false} width={84} />
              <Tooltip
                content={({ payload, label }) => {
                  const rows = (payload as RechartsPayload | undefined) ?? [];
                  if (!rows.length) return null;
                  return (
                    <ChartTooltip
                      title={`Cena ${formatCZK(Number(label), 0)}`}
                      rows={rows.map((r) => ({ name: String(r.name), value: Number(r.value), color: String(r.color), decimals: 2 }))}
                    />
                  );
                }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
              <ReferenceLine y={0} stroke={COLORS.muted} />
              <ReferenceLine x={inputs.altPrice} stroke={COLORS.muted} strokeDasharray="4 4" />
              <ReferenceLine x={inputs.sellingPrice} stroke={COLORS.text} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="company" name="Příspěvek firmy / ks" stroke={COLORS.company} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="influencer" name="Odměna influencera / ks" stroke={COLORS.influencer} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
