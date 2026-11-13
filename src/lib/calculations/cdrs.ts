import type { FeatureAttributes } from "../../data/schema.js";

export type CdrsClass = "Low" | "Moderate" | "High" | "Very high";

export interface CdrsWeights {
  hazard: number;
  exposure: number;
  vulnerability: number;
}

export interface CdrsResult {
  score: number | null;
  hazard: number | null;
  exposure: number | null;
  vulnerability: number | null;
  className: CdrsClass | null;
}

const numeric = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function minMax(value: number | null, values: readonly (number | null)[]): number | null {
  const valid = values.filter((item): item is number => item !== null);
  if (value === null || valid.length < 2) return value === null ? null : 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return max === min ? 0 : (value - min) / (max - min);
}

export function classifyCdrs(score: number | null): CdrsClass | null {
  if (score === null) return null;
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 75) return "High";
  return "Very high";
}

export function calculateCdrs(
  row: FeatureAttributes,
  allRows: readonly FeatureAttributes[],
  weights: CdrsWeights = { hazard: 0.5, exposure: 0.35, vulnerability: 0.15 },
  exposureRateField = "EXP_PCT"
): CdrsResult {
  const hazard = numeric(row.DPI);
  const exposurePercent = numeric(row[exposureRateField]);
  const vulnerablePopulation = ["POP_U526", "POP_WRA26", "POP_6526"]
    .map((field) => numeric(row[field]))
    .every((value) => value !== null)
    ? ["POP_U526", "POP_WRA26", "POP_6526"].reduce((sum, field) => sum + (numeric(row[field]) as number), 0)
    : null;
  const population = numeric(row.POP_T26);
  const rawVulnerability = vulnerablePopulation !== null && population ? vulnerablePopulation / population : null;
  const vulnerabilityValues = allRows.map((item) => {
    const vulnerable = ["POP_U526", "POP_WRA26", "POP_6526"]
      .map((field) => numeric(item[field]));
    const total = numeric(item.POP_T26);
    return vulnerable.every((value) => value !== null) && total ? vulnerable.reduce((sum, value) => sum + (value as number), 0) / total : null;
  });
  const vulnerability = minMax(rawVulnerability, vulnerabilityValues);
  const exposure = exposurePercent === null ? null : exposurePercent / 100;
  const score = hazard === null || exposure === null || vulnerability === null
    ? null
    : 100 * (weights.hazard * hazard / 100 + weights.exposure * exposure + weights.vulnerability * vulnerability);
  return { score, hazard, exposure, vulnerability, className: classifyCdrs(score) };
}
