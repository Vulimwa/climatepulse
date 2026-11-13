export type Hazard = "vegetation" | "rainfall" | "soilMoisture" | "heat";
export type PopulationGroup = "all" | "under5" | "women1549" | "65plus" | "under18";

export interface FilterState {
  county: string;
  subCounty: string;
  hazard: Hazard;
  populationGroup: PopulationGroup;
  selection: string;
}

export const DEFAULT_FILTERS: Readonly<FilterState> = {
  county: "",
  subCounty: "",
  hazard: "vegetation",
  populationGroup: "all",
  selection: ""
};

const validHazards = new Set<Hazard>(["vegetation", "rainfall", "soilMoisture", "heat"]);
const validGroups = new Set<PopulationGroup>(["all", "under5", "women1549", "65plus", "under18"]);

export function parseFilterHash(hash: string): FilterState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const hazard = params.get("hazard") as Hazard;
  const populationGroup = params.get("group") as PopulationGroup;
  return {
    county: params.get("county") ?? "",
    subCounty: params.get("subCounty") ?? "",
    hazard: validHazards.has(hazard) ? hazard : DEFAULT_FILTERS.hazard,
    populationGroup: validGroups.has(populationGroup) ? populationGroup : DEFAULT_FILTERS.populationGroup,
    selection: params.get("selection") ?? ""
  };
}

export function serializeFilterHash(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.county) params.set("county", state.county);
  if (state.subCounty) params.set("subCounty", state.subCounty);
  if (state.hazard !== DEFAULT_FILTERS.hazard) params.set("hazard", state.hazard);
  if (state.populationGroup !== DEFAULT_FILTERS.populationGroup) params.set("group", state.populationGroup);
  if (state.selection) params.set("selection", state.selection);
  const value = params.toString();
  return value ? `#${value}` : "";
}

export function createFilterStore(initial: Partial<FilterState> = {}) {
  let state: FilterState = { ...DEFAULT_FILTERS, ...initial };
  const listeners = new Set<(next: FilterState) => void>();
  return {
    getState: () => state,
    setState: (patch: Partial<FilterState>) => {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener: (next: FilterState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
