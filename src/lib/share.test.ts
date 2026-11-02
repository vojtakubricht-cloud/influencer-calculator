import { describe, it, expect } from "vitest";
import { DEFAULT_INPUTS, type CalculatorInputs } from "./calc";
import { encodeInputs, decodeInputs, buildShareUrl, readInputsFromUrl } from "./share";

describe("share – URL serializace", () => {
  it("round-trip výchozích vstupů", () => {
    expect(decodeInputs(encodeInputs(DEFAULT_INPUTS))).toEqual(DEFAULT_INPUTS);
  });

  it("round-trip upravených vstupů včetně pásem a desetinných hodnot", () => {
    const inputs: CalculatorInputs = {
      ...DEFAULT_INPUTS,
      sellingPrice: 649.9,
      productionCost: 83.25,
      influencerShare: 0.375,
      operatingCostMode: "detailed",
      operatingCosts: { logistics: 20.5, handling: 10, warehousing: 5, paymentFees: 7.5, other: 2 },
      volume: 12345,
      tieredEnabled: true,
      tiers: [{ upTo: 300, share: 0.25 }, { upTo: 1500, share: 0.35 }, { upTo: null, share: 0.55 }],
    };
    expect(decodeInputs(encodeInputs(inputs))).toEqual(inputs);
  });

  it("URL obsahuje parametr a dá se načíst", () => {
    const url = buildShareUrl({ ...DEFAULT_INPUTS, volume: 777 }, "Test", "https://example.com/app/?x=1#h");
    const u = new URL(url);
    expect(u.searchParams.get("n")).toBe("Test");
    expect(u.hash).toBe("");
    const read = readInputsFromUrl(u.search);
    expect(read?.inputs.volume).toBe(777);
    expect(read?.name).toBe("Test");
  });

  it("neplatný vstup vrátí null", () => {
    expect(decodeInputs("!!!")).toBeNull();
    expect(decodeInputs(btoa('{"v":99}'))).toBeNull();
    expect(readInputsFromUrl("?foo=bar")).toBeNull();
  });
});
