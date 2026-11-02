import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: "default" | "influencer" | "company" | "cost" | "warning";
  icon?: ReactNode;
  className?: string;
}

const toneStyles: Record<NonNullable<KpiCardProps["tone"]>, { ring: string; chip: string; value: string }> = {
  default: { ring: "", chip: "bg-secondary text-muted-foreground", value: "text-foreground" },
  influencer: { ring: "border-influencer/30", chip: "bg-influencer-soft text-influencer", value: "text-influencer" },
  company: { ring: "border-company/30", chip: "bg-company-soft text-company", value: "text-company" },
  cost: { ring: "", chip: "bg-cost-soft text-cost", value: "text-foreground" },
  warning: { ring: "border-warning/40", chip: "bg-warning-soft text-warning", value: "text-warning" },
};

export function KpiCard({ label, value, sub, tone = "default", icon, className }: KpiCardProps) {
  const t = toneStyles[tone];
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover print-avoid", t.ring, className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <span className={cn("flex h-6 w-6 items-center justify-center rounded-md [&>svg]:h-3.5 [&>svg]:w-3.5", t.chip)}>{icon}</span>}
      </div>
      <p className={cn("kpi-value mt-2", t.value)}>{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function RoleBadge({ role }: { role: "influencer" | "company" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        role === "influencer" ? "bg-influencer-soft text-influencer" : "bg-company-soft text-company",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", role === "influencer" ? "bg-influencer" : "bg-company")} />
      {role === "influencer" ? "Influencer" : "Firma"}
    </span>
  );
}
