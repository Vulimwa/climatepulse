import type { FeatureAttributes } from "../../data/schema.js";

export type NullableNumber = number | null;
export type HazardComponents = {
  rainfall: NullableNumber;
  vegetation: NullableNumber;
  soilMoisture: NullableNumber;
  vegetationHealth: NullableNumber;
  heat: NullableNumber;
};
export type HazardWeights = Record<keyof HazardComponents, number>;

const number = (value: unknown): NullableNumber =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

export function calculateComponents(attributes: FeatureAttributes): HazardComponents {
  const spi = number(attributes.SPI_03);
  const vci = number(attributes.VCI_NOW);
  const vhi = number(attributes.VHI_NOW);
  const smi = number(attributes.SMI_NOW);
  const hotPct = number(attributes.HOT_PCT);
  return {
    rainfall: spi === null ? null : clamp((-spi + 2) / 4 * 100),
    vegetation: vci === null ? null : 100 - vci,
    soilMoisture: smi === null ? null : clamp((1 - smi) * 100),
    vegetationHealth: vhi === null ? null : 100 - vhi,
    heat: hotPct,
  };
}

export function calculateDpi(
  components: HazardComponents,
  weights: HazardWeights = {
    rainfall: 0.25,
    vegetation: 0.25,
    soilMoisture: 0.2,
    vegetationHealth: 0.15,
    heat: 0.15
  }
): NullableNumber {
  const available = (Object.keys(components) as (keyof HazardComponents)[])
    .filter((key) => components[key] !== null);
  if (available.length < 3) return null;
  const totalWeight = available.reduce((sum, key) => sum + Math.max(0, weights[key]), 0);
  if (totalWeight === 0) return null;
  return available.reduce((sum, key) => {
    const component = components[key];
    return sum + (component === null ? 0 : component) * Math.max(0, weights[key]);
  }, 0) / totalWeight;
}

export function calculateDerived(attributes: FeatureAttributes): FeatureAttributes {
  const components = calculateComponents(attributes);
  const dpi = calculateDpi(components);
  const exposureValues = ["EXP_PCT", "EXR_PCT", "EXS_PCT"]
    .map((field) => number(attributes[field]))
    .filter((value): value is number => value !== null);
  return {
    ...attributes,
    DPI: dpi,
    EXP_MAX_PCT: exposureValues.length ? Math.max(...exposureValues) : null,
    DPI_CLASS: dpi === null ? null : dpi < 25 ? "Low" : dpi < 50 ? "Moderate" : dpi < 75 ? "High" : "Very high",
    LOW_LST_COVER: number(attributes.LST_VAL) !== null && (number(attributes.LST_VAL) as number) < 25
  };
}

export function rankDescending(values: readonly NullableNumber[]): (number | null)[] {
  const ranked = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null)
    .sort((a, b) => b.value - a.value);
  const ranks = values.map(() => null as number | null);
  ranked.forEach((entry, index) => {
    const previous = ranked[index - 1];
    ranks[entry.index] = previous && previous.value === entry.value ? ranks[previous.index] : index + 1;
  });
  return ranks;
}

export function relativePosition(values: readonly NullableNumber[], value: NullableNumber) {
  const valid = values.filter((entry): entry is number => entry !== null);
  if (value === null || valid.length === 0) return { z: null, percentRank: null, diffFromMean: null };
  const mean = valid.reduce((sum, entry) => sum + entry, 0) / valid.length;
  const variance = valid.reduce((sum, entry) => sum + (entry - mean) ** 2, 0) / valid.length;
  const sd = Math.sqrt(variance);
  const belowOrEqual = valid.filter((entry) => entry <= value).length;
  return {
    z: sd === 0 ? 0 : (value - mean) / sd,
    percentRank: belowOrEqual / valid.length,
    diffFromMean: value - mean
  };
}

export * from "./cdrs.js";
export * from "./earlySignal.js";

export function countyRollup(
  features: readonly FeatureAttributes[],
  county: string
): { ADM2_AREA: NullableNumber; [field: string]: NullableNumber } {
  const rows = features.filter((feature) => feature.COUNTY === county);
  const sum = (field: string) => {
    const values = rows.map((row) => number(row[field])).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  const weightedMean = (field: string, weightField: string) => {
    let numerator = 0;
    let denominator = 0;
    rows.forEach((row) => {
      const value = number(row[field]);
      const weight = number(row[weightField]);
      if (value !== null && weight !== null) {
        numerator += value * weight;
        denominator += weight;
      }
    });
    return denominator ? numerator / denominator : null;
  };
  const result: { ADM2_AREA: NullableNumber; [field: string]: NullableNumber } = {
    ADM2_AREA: sum("ADM2_AREA")
  };
  ["POP_T26", "POP_U526", "POP_WRA26", "POP_6526", "POP_D2626", "POP_EXP", "EXR_POP", "EXS_POP", "W_AREA"].forEach(
    (field) => { result[field] = sum(field); }
  );
  ["EXP_PCT", "EXR_PCT", "EXS_PCT", "EXH_PCT"].forEach(
    (field) => { result[field] = weightedMean(field, "POP_T26"); }
  );
  ["SPI_03", "RAIN_ANOM", "TEMP_ANOM", "DPI"].forEach(
    (field) => { result[field] = weightedMean(field, "ADM2_AREA"); }
  );
  return result;
}
