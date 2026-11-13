export type IndicatorDirection =
  | "higherIsWorse"
  | "higherIsBetter"
  | "neutral"
  | "diverging";

export type Classification =
  | { kind: "breaks"; breaks: readonly ClassBreak[] }
  | { kind: "relative"; classes: number };

export interface ClassBreak {
  min: number;
  max: number;
  label: string;
}

export interface IndicatorDefinition {
  id: string;
  field: string;
  label: string;
  group: string;
  unit: string;
  description: string;
  source: string;
  asOf: string;
  direction: IndicatorDirection;
  classification: Classification;
  decimals: number;
  caveat?: string;
}

const spiBreaks: readonly ClassBreak[] = [
  { min: Number.NEGATIVE_INFINITY, max: -2, label: "Extremely dry (≤ −2)" },
  { min: -2, max: -1.5, label: "Severely dry (−2 to −1.5)" },
  { min: -1.5, max: -1, label: "Moderately dry (−1.5 to −1)" },
  { min: -1, max: 1, label: "Near normal (−1 to 1)" },
  { min: 1, max: 1.5, label: "Moderately wet (1 to 1.5)" },
  { min: 1.5, max: 2, label: "Very wet (1.5 to 2)" },
  { min: 2, max: Number.POSITIVE_INFINITY, label: "Extremely wet (≥ 2)" }
];

const stressBreaks: readonly ClassBreak[] = [
  { min: Number.NEGATIVE_INFINITY, max: 10, label: "Extreme stress (< 10)" },
  { min: 10, max: 20, label: "Severe stress (10–20)" },
  { min: 20, max: 30, label: "Moderate stress (20–30)" },
  { min: 30, max: 40, label: "Mild stress (30–40)" },
  { min: 40, max: Number.POSITIVE_INFINITY, label: "No stress (≥ 40)" }
];

const percentBreaks: readonly ClassBreak[] = [
  { min: 0, max: 10, label: "0–10%" },
  { min: 10, max: 25, label: "10–25%" },
  { min: 25, max: 50, label: "25–50%" },
  { min: 50, max: 75, label: "50–75%" },
  { min: 75, max: 100, label: "75–100%" }
];

const groups: Record<string, readonly string[]> = {
  "Drought & rainfall": [
    "SPI_01", "SPI_03", "SPI_06", "SPI_12", "SPI3_PCT", "RAIN_ANOM",
    "RAIN_PCT", "RSEAS_PCT", "RAIN_ANN", "RAIN_TRND", "CDD_MAX", "RX1DAY"
  ],
  Vegetation: ["VCI_NOW", "NDVI_NOW", "NDVI_ANOM", "VEG_ST_PCT", "VEG_ST_DUR", "VEG_RECOV"],
  "Vegetation health": ["VHI_NOW", "TCI_NOW", "VHI_ANOM", "VHI_ST_PCT"],
  "Soil moisture": ["SMI_NOW", "SM_ROOT", "SM_R_AN", "RZ_DEF", "ERA_SM_AN"],
  Heat: ["TEMP_ANOM", "HOT_DAYS", "HEAT_DAYS", "HOT_PCT", "LST_HIGH", "LSTD_NOW", "T2M_MEAN"],
  Water: ["W_OCCUR", "W_PCT", "S2_W_AREA", "S2_W_CHG", "DW_WATER"],
  "Land & terrain": [
    "DW_CROP", "DW_TREE", "DW_SHRUB", "DW_BARE", "DW_BUILT", "WC_CROP",
    "ELEV_MEAN", "SLOPE_MEAN", "TWI_MEAN"
  ],
  "People & exposure": [
    "POP_T26", "POP_D2626", "POP_U526", "POP_WRA26", "POP_6526", "EXP_PCT",
    "EXR_PCT", "EXS_PCT", "EXH_PCT", "POP_EXP", "EXR_POP", "EXS_POP",
    "U5_EXP", "EXR_U5", "EXS_U5"
  ],
  "Climate futures": ["CM245_TAS", "CM585_TAS", "CM245_PR", "CM585_PR"]
};

const labelFor = (field: string): string =>
  field.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const definitionFor = (field: string, group: string): IndicatorDefinition => {
  const isSpi = field.startsWith("SPI");
  const isStress = ["VCI_NOW", "VHI_NOW", "TCI_NOW"].includes(field);
  const isPercent = field.endsWith("_PCT") || field === "SPI3_PCT";
  const isAnomaly = field.includes("ANOM") || field.endsWith("_R_AN");
  const unit = isPercent ? "%" : field.includes("POP") ? "people" : "value";
  return {
    id: field,
    field,
    label: labelFor(field),
    group,
    unit,
    description: `${labelFor(field)} for the selected Admin-2 area.`,
    source: "Climate Pulse Kenya published feature layer",
    asOf: "OD_CHIRPS",
    direction: isSpi || isAnomaly ? "diverging" : isStress ? "higherIsBetter" : "neutral",
    classification: {
      kind: "breaks",
      breaks: isSpi ? spiBreaks : isStress ? stressBreaks : isPercent ? percentBreaks : []
    },
    decimals: isPercent ? 1 : 2,
    ...(field === "LST_ANOM"
      ? { caveat: "Unreliable when LST_VAL is low; interpret with the data-quality fields." }
      : {})
  };
};

export const INDICATORS: readonly IndicatorDefinition[] = Object.entries(groups)
  .flatMap(([group, fields]) => fields.map((field) => definitionFor(field, group)));

export const DERIVED_INDICATORS: readonly IndicatorDefinition[] = [
  {
    id: "DPI",
    field: "DPI",
    label: "Drought Pressure Index",
    group: "Derived",
    unit: "0–100",
    description: "Weighted hazard pressure from available rainfall, vegetation, soil, health and heat components.",
    source: "Calculated from Climate Pulse fields",
    asOf: "RUN_DATE",
    direction: "higherIsWorse",
    classification: {
      kind: "breaks",
      breaks: [
        { min: 0, max: 25, label: "Low (0–25)" },
        { min: 25, max: 50, label: "Moderate (25–50)" },
        { min: 50, max: 75, label: "High (50–75)" },
        { min: 75, max: 100, label: "Very high (75–100)" }
      ]
    },
    decimals: 1,
    caveat: "Hazard pressure indicator — not a risk or damage estimate."
  },
  {
    id: "EXP_MAX_PCT",
    field: "EXP_MAX_PCT",
    label: "Maximum single-hazard exposure",
    group: "Derived",
    unit: "%",
    description: "Highest single-hazard exposure share across flood, river and soil hazards.",
    source: "Calculated from exposure fields",
    asOf: "RUN_DATE",
    direction: "higherIsWorse",
    classification: { kind: "breaks", breaks: percentBreaks },
    decimals: 1
  }
];

export const INDICATOR_CATALOGUE = [...INDICATORS, ...DERIVED_INDICATORS] as const;
