export interface MonthlyObservation {
  ADM2_ID: string;
  OBS_DATE: string;
  SPI_03: number | null;
  VCI: number | null;
  SM_ROOT_ANOM: number | null;
}

export interface SignalResult {
  watch: boolean;
  warning: boolean;
  alert: boolean;
  triggers: string[];
}

export function evaluateEarlySignal(current: MonthlyObservation, previous: MonthlyObservation | null, previousPrevious: MonthlyObservation | null): SignalResult {
  const triggers: string[] = [];
  const spiConsecutive = current.SPI_03 !== null && current.SPI_03 <= -1 &&
    previous?.SPI_03 !== null && previous?.SPI_03 !== undefined && previous.SPI_03 <= -1;
  const vciDrop = current.VCI !== null && previousPrevious !== null && previousPrevious.VCI !== null && previousPrevious.VCI !== undefined &&
    previousPrevious.VCI - current.VCI >= 15;
  const soilStress = current.SM_ROOT_ANOM !== null && current.SM_ROOT_ANOM <= 0;
  if (spiConsecutive) triggers.push("SPI-3 ≤ −1 for two months");
  if (vciDrop) triggers.push("VCI fell ≥ 15 points over two months");
  if (soilStress) triggers.push("Root-zone soil moisture anomaly below threshold");
  return {
    watch: triggers.length > 0,
    warning: triggers.length >= 2,
    alert: triggers.length >= 3,
    triggers
  };
}
