import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_INPUTS,
  computeUnit,
  computeVolume,
  validateInputs,
  hasErrors,
  type CalculatorInputs,
  type OperatingCosts,
  type Tier,
} from "@/lib/calc";
import { readInputsFromUrl } from "@/lib/share";

function cloneDefaults(): CalculatorInputs {
  return structuredClone(DEFAULT_INPUTS);
}

function initialState(): { inputs: CalculatorInputs; name: string | null } {
  if (typeof window === "undefined") return { inputs: cloneDefaults(), name: null };
  const fromUrl = readInputsFromUrl(window.location.search);
  if (fromUrl) return fromUrl;
  return { inputs: cloneDefaults(), name: null };
}

export function useCalculator() {
  const [{ inputs, name: initialName }] = useState(initialState);
  const [state, setState] = useState<CalculatorInputs>(inputs);
  const [scenarioName, setScenarioName] = useState<string>(initialName ?? "");
  const [loadedFromUrl] = useState<boolean>(() => initialName !== null || typeof window !== "undefined" && new URLSearchParams(window.location.search).has("s"));

  // Po načtení ze sdíleného odkazu vyčistíme URL, aby další úpravy nevedly k zastaralému odkazu.
  useEffect(() => {
    if (loadedFromUrl && typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [loadedFromUrl]);

  const update = useCallback(<K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateOperatingCost = useCallback((key: keyof OperatingCosts, value: number) => {
    setState((prev) => ({ ...prev, operatingCosts: { ...prev.operatingCosts, [key]: value } }));
  }, []);

  const updateTiers = useCallback((tiers: Tier[]) => {
    setState((prev) => ({ ...prev, tiers }));
  }, []);

  const replace = useCallback((next: CalculatorInputs, name?: string) => {
    setState(structuredClone(next));
    if (name !== undefined) setScenarioName(name);
  }, []);

  const reset = useCallback(() => {
    setState(cloneDefaults());
    setScenarioName("");
  }, []);

  const issues = useMemo(() => validateInputs(state), [state]);
  const invalid = useMemo(() => hasErrors(issues), [issues]);
  const unit = useMemo(() => computeUnit(state), [state]);
  const atVolume = useMemo(() => computeVolume(state), [state]);

  return {
    inputs: state,
    scenarioName,
    setScenarioName,
    loadedFromUrl,
    update,
    updateOperatingCost,
    updateTiers,
    replace,
    reset,
    issues,
    invalid,
    unit,
    atVolume,
  };
}

export type CalculatorApi = ReturnType<typeof useCalculator>;
