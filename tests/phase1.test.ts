import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INDICATOR_CATALOGUE } from "../src/config/indicators.js";
import { assertCatalogueFieldsExist, FIELD_SCHEMA } from "../src/data/schema.js";
import { joinAttributesByAdm2Id, type Adm2Feature } from "../src/data/join.js";
import {
  calculateComponents,
  calculateDpi,
  calculateDerived,
  countyRollup,
  rankDescending,
  relativePosition
} from "../src/lib/calculations/index.js";
import { calculateCdrs, classifyCdrs, evaluateEarlySignal } from "../src/lib/calculations/index.js";
import { parseFilterHash, serializeFilterHash } from "../src/store/filters.js";
import { selectExposureByArea, selectPopulationWeightedExposure, selectIndicatorComparison } from "../src/selectors/dashboard.js";

describe("Phase 1 data contract", () => {
  it("uses the supplied 16-row XLS export and preserves its declared missing fields", () => {
    const dataset = JSON.parse(
      readFileSync(resolve(process.cwd(), "data", "climatepulse.json"), "utf8")
    ) as { rows: Array<Record<string, unknown>>; missingFields: string[] };
    expect(dataset.rows).toHaveLength(16);
    expect(dataset.rows.map((row) => row.ADM2_ID)).toContain("KEN_103563");
    expect(dataset.missingFields).toEqual(["FACC_MAX", "LSTN_ANOM", "LST_NIGHT"]);
    for (const row of dataset.rows) {
      expect(row.LST_NIGHT).toBeNull();
      expect(row.LSTN_ANOM).toBeNull();
      expect(row.FACC_MAX).toBeNull();
    }
  });

  it("has unique catalogue ids and schema-backed fields", () => {
    expect(new Set(INDICATOR_CATALOGUE.map((indicator) => indicator.id)).size).toBe(INDICATOR_CATALOGUE.length);
    expect(() => assertCatalogueFieldsExist(FIELD_SCHEMA)).not.toThrow();
    for (const indicator of INDICATOR_CATALOGUE) {
      expect(FIELD_SCHEMA[indicator.field]).toBeDefined();
    }
  });

  it("keeps class breaks sorted", () => {
    for (const indicator of INDICATOR_CATALOGUE) {
      if (indicator.classification.kind !== "breaks") continue;
      const breaks = indicator.classification.breaks;
      expect(breaks.every((item, index) => index === 0 || item.min >= breaks[index - 1].min)).toBe(true);
    }
  });

  it("joins only matching ADM2 ids and preserves missing values", () => {
    const features: Adm2Feature[] = [
      { attributes: { ADM2_ID: "a", VALUE: null } },
      { attributes: { ADM2_ID: "b" } }
    ];
    const joined = joinAttributesByAdm2Id(features, [{ ADM2_ID: "a", VALUE: 4 }]);
    expect(joined[0].attributes.VALUE).toBe(4);
    expect(joined[1].attributes.VALUE).toBeUndefined();
  });

  it("calculates null-aware components and re-normalised DPI", () => {
    const components = calculateComponents({ SPI_03: -2, VCI_NOW: 20, VHI_NOW: null, SMI_NOW: 0.5, HOT_PCT: null });
    expect(components).toMatchObject({ rainfall: 100, vegetation: 80, soilMoisture: 50, vegetationHealth: null, heat: null });
    expect(calculateDpi(components)).toBeCloseTo((100 * 0.25 + 80 * 0.25 + 50 * 0.2) / 0.7);
    expect(calculateDerived({ EXP_PCT: 10, EXR_PCT: null, EXS_PCT: 30 }).EXP_MAX_PCT).toBe(30);
  });

  it("ranks ties and computes relative position", () => {
    expect(rankDescending([5, null, 5, 1])).toEqual([1, null, 1, 3]);
    expect(relativePosition([1, 2, 3], 2)).toMatchObject({ percentRank: 2 / 3, diffFromMean: 0 });
  });

  it("computes county sums and weighted means", () => {
    const rows = [
      { COUNTY: "Marsabit", ADM2_AREA: 2, POP_T26: 10, W_AREA: 4, EXP_PCT: 20, SPI_03: -1 },
      { COUNTY: "Marsabit", ADM2_AREA: 3, POP_T26: 30, W_AREA: 5, EXP_PCT: 40, SPI_03: 1 },
      { COUNTY: "Turkana", ADM2_AREA: 9, POP_T26: 1, W_AREA: 1, EXP_PCT: 80, SPI_03: 0 }
    ];
    expect(countyRollup(rows, "Marsabit")).toMatchObject({
      ADM2_AREA: 5,
      POP_T26: 40,
      W_AREA: 9,
      EXP_PCT: 35,
      SPI_03: 0.2
    });
  });

  it("keeps chart labels equal to their plotted measure", () => {
      const data = selectIndicatorComparison([
        { ADM2_ID: "a", SUB_COUNTY: "Balambala", RAIN_ANOM: 12.7, SMI_NOW: 0.43 },
        { ADM2_ID: "b", SUB_COUNTY: "Dadaab", RAIN_ANOM: -2.1, SMI_NOW: 0.21 }
      ], "RAIN_ANOM");
      expect(data.every((item) => item.labelValue === item.measure)).toBe(true);
      expect(selectExposureByArea([
        { ADM2_ID: "a", SUB_COUNTY: "Balambala", POP_EXP: 42 }
      ], "vegetation")[0]).toMatchObject({ measure: 42, labelValue: 42 });
  });

  it("calculates population-weighted exposure rather than averaging area rates", () => {
      const result = selectPopulationWeightedExposure([
        { ADM2_ID: "a", SUB_COUNTY: "A", POP_T26: 100, EXS_POP: 20, EXS_PCT: 20 },
        { ADM2_ID: "b", SUB_COUNTY: "B", POP_T26: 300, EXS_POP: 180, EXS_PCT: 60 }
      ], "soilMoisture");
      expect(result).toMatchObject({ population: 400, exposed: 200, rate: 50 });
  });

  it("round-trips global filters through the URL hash", () => {
      const state = {
        county: "Marsabit",
        subCounty: "North Horr",
        hazard: "soilMoisture" as const,
        populationGroup: "women1549" as const,
        selection: "North Horr"
      };
      expect(parseFilterHash(serializeFilterHash(state))).toEqual(state);
  });

  it("calculates a bounded, classed CDRS with null propagation", () => {
      const rows = [
        { ADM2_ID: "a", POP_T26: 100, POP_U526: 10, POP_WRA26: 30, POP_6526: 10, DPI: 20, EXP_PCT: 10 },
        { ADM2_ID: "b", POP_T26: 100, POP_U526: 20, POP_WRA26: 30, POP_6526: 20, DPI: 80, EXP_PCT: 80 }
      ];
      const result = calculateCdrs(rows[1], rows);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(classifyCdrs(result.score)).toBe(result.className);
      expect(calculateCdrs({ DPI: null }, rows).score).toBeNull();
  });

  it("reports transparent early-signal triggers", () => {
      const result = evaluateEarlySignal(
        { ADM2_ID: "a", OBS_DATE: "2026-03", SPI_03: -1.2, VCI: 30, SM_ROOT_ANOM: -0.2 },
        { ADM2_ID: "a", OBS_DATE: "2026-02", SPI_03: -1.1, VCI: 40, SM_ROOT_ANOM: 0 },
        { ADM2_ID: "a", OBS_DATE: "2026-01", SPI_03: -0.2, VCI: 50, SM_ROOT_ANOM: 0 }
      );
      expect(result.triggers).toHaveLength(3);
      expect(result.alert).toBe(true);
  });
});
