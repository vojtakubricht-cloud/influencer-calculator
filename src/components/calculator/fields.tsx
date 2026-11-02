import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { parseNumberInput } from "@/lib/format";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** Hodnota je zobrazena vynásobená 100 (procenta), uložena jako zlomek */
  percent?: boolean;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  compact?: boolean;
}

function toDisplay(value: number, percent?: boolean): string {
  const v = percent ? value * 100 : value;
  if (!Number.isFinite(v)) return "";
  // max 4 desetinná místa, bez zbytečných nul
  return String(Math.round(v * 10000) / 10000).replace(".", ",");
}

/**
 * Číselné pole, které při psaní drží textovou podobu (akceptuje čárku i tečku)
 * a do stavu propisuje jen validní čísla.
 */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  min,
  max,
  step,
  integer,
  percent,
  className,
  inputClassName,
  disabled,
  compact,
}: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(() => toDisplay(value, percent));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(toDisplay(value, percent));
      setInvalid(false);
    }
  }, [value, percent, focused]);

  const commit = (raw: string) => {
    setText(raw);
    const parsed = parseNumberInput(raw);
    if (parsed === null) {
      setInvalid(raw.trim() !== "");
      return;
    }
    let next = percent ? parsed / 100 : parsed;
    if (integer) next = Math.round(next);
    if (min !== undefined && next < min) {
      setInvalid(true);
      return;
    }
    if (max !== undefined && next > max) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(next);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact && (
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          aria-label={label}
          aria-invalid={invalid || undefined}
          value={text}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setText(toDisplay(value, percent));
            setInvalid(false);
          }}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (step === undefined) return;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const dir = e.key === "ArrowUp" ? 1 : -1;
              const s = percent ? step / 100 : step;
              let next = value + dir * s;
              next = Math.round(next * 1e6) / 1e6;
              if (min !== undefined) next = Math.max(min, next);
              if (max !== undefined) next = Math.min(max, next);
              onChange(next);
              setText(toDisplay(next, percent));
            }
          }}
          className={cn(
            "tabular h-9 text-right", suffix ? (suffix.length > 2 ? "pr-14" : "pr-9") : "pr-3",
            invalid && "border-destructive focus-visible:ring-destructive",
            inputClassName,
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && !compact && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  percent?: boolean;
  hint?: string;
  display?: (value: number) => string;
  accent?: "influencer" | "company" | "default";
}

export function SliderField({ label, value, onChange, min, max, step, suffix, percent, hint, display, accent = "default" }: SliderFieldProps) {
  const id = useId();
  const sliderValue = percent ? value * 100 : value;
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <div className="w-28 shrink-0">
          <NumberField
            compact
            label={label}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            percent={percent}
            suffix={suffix}
          />
        </div>
      </div>
      <Slider
        id={id}
        aria-label={label}
        value={[Math.min(Math.max(sliderValue, percent ? min * 100 : min), percent ? max * 100 : max)]}
        min={percent ? min * 100 : min}
        max={percent ? max * 100 : max}
        step={percent ? step * 100 : step}
        onValueChange={([v]) => onChange(percent ? v / 100 : v)}
        className={cn(
          accent === "influencer" && "[&_[role=slider]]:border-influencer [&_.bg-primary]:bg-influencer",
          accent === "company" && "[&_[role=slider]]:border-company [&_.bg-primary]:bg-company",
        )}
      />
      {(hint || display) && (
        <p className="text-[11px] leading-tight text-muted-foreground">{display ? display(value) : hint}</p>
      )}
    </div>
  );
}

export function FieldGroup({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
