import type { CalculatorInputs } from "./calc";

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: CalculatorInputs;
}

const KEY = "influencer-calc:scenarios:v1";

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const probe = "__probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function loadScenarios(): SavedScenario[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedScenario[]) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedScenario[]): boolean {
  const s = safeStorage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function saveScenario(name: string, inputs: CalculatorInputs, existingId?: string): SavedScenario[] {
  const list = loadScenarios();
  const now = new Date().toISOString();
  const idx = existingId ? list.findIndex((x) => x.id === existingId) : -1;
  if (idx >= 0) {
    list[idx] = { ...list[idx], name, inputs: structuredClone(inputs), updatedAt: now };
  } else {
    list.unshift({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      name,
      createdAt: now,
      updatedAt: now,
      inputs: structuredClone(inputs),
    });
  }
  persist(list);
  return list;
}

export function deleteScenario(id: string): SavedScenario[] {
  const list = loadScenarios().filter((x) => x.id !== id);
  persist(list);
  return list;
}
