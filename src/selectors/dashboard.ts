import type { FeatureAttributes } from "../data/schema.js";

export type ExposureHazard = "vegetation" | "rainfall" | "soilMoisture" | "heat";

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const exposureFields: Record<ExposureHazard, { population: string; rate: string }> = {
  vegetation: { population: "POP_EXP", rate: "EXP_PCT" },
  rainfall: { population: "EXR_POP", rate: "EXR_PCT" },
  soilMoisture: { population: "EXS_POP", rate: "EXS_PCT" },
  heat: { population: "EXH_POP", rate: "EXH_PCT" }
};

export interface ExposureDatum {
  label: string;
  measure: number | null;
  labelValue: number | null;
  unit: string;
}

export function exposureFieldFor(hazard: ExposureHazard): { population: string; rate: string } {
  return exposureFields[hazard];
}

export function selectExposureByArea(
  rows: readonly FeatureAttributes[],
  hazard: ExposureHazard
): ExposureDatum[] {
  const fields = exposureFieldFor(hazard);
  return rows.map((row) => {
    const measure = number(row[fields.population]);
    return {
      label: String(row.SUB_COUNTY ?? row.ADM2_ID ?? "Unknown area"),
      measure,
      labelValue: measure,
      unit: "people"
    };
  });
}

export function selectPopulationWeightedExposure(
  rows: readonly FeatureAttributes[],
  hazard: ExposureHazard
): { population: number | null; exposed: number | null; rate: number | null } {
  const fields = exposureFieldFor(hazard);
  const scopedRows = rows.filter((row) => row.ADM2_ID || row.SUB_COUNTY);
  const population = scopedRows.reduce((sum, row) => sum + (number(row.POP_T26) ?? 0), 0);
  const exposed = scopedRows.reduce((sum, row) => sum + (number(row[fields.population]) ?? 0), 0);
  const weightedRate = scopedRows.reduce((sum, row) => {
    const value = number(row[fields.rate]);
    const weight = number(row.POP_T26);
    return value !== null && weight !== null ? sum + value * weight : sum;
  }, 0);
  const denominator = scopedRows.reduce((sum, row) => {
    const value = number(row[fields.rate]);
    return value !== null && number(row.POP_T26) !== null ? sum + (number(row.POP_T26) as number) : sum;
  }, 0);
  return {
    population: scopedRows.length ? population : null,
    exposed: scopedRows.length ? exposed : null,
    rate: denominator ? weightedRate / denominator : null
  };
}

export function selectIndicatorComparison(
  rows: readonly FeatureAttributes[],
  field: string
): ExposureDatum[] {
  return rows.map((row) => {
    const measure = number(row[field]);
    return {
      label: String(row.SUB_COUNTY ?? row.ADM2_ID ?? "Unknown area"),
      measure,
      labelValue: measure,
      unit: field === "RAIN_ANOM" ? "mm" : field === "SMI_NOW" ? "index" : "%"
    };
  });
}
