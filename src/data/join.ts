import type { FeatureAttributes } from "./schema.js";

export interface Adm2Feature<T extends FeatureAttributes = FeatureAttributes> {
  attributes: T;
}

export function joinAttributesByAdm2Id<T extends FeatureAttributes>(
  features: readonly Adm2Feature<T>[],
  rows: readonly FeatureAttributes[]
): Adm2Feature<T>[] {
  const byId = new Map(
    rows
      .filter((row) => typeof row.ADM2_ID === "string")
      .map((row) => [row.ADM2_ID as string, row])
  );
  return features.map((feature) => {
    const id = feature.attributes.ADM2_ID;
    const joined = typeof id === "string" ? byId.get(id) : undefined;
    return joined ? { ...feature, attributes: { ...feature.attributes, ...joined } as T } : feature;
  });
}
