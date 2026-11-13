import Map from "https://js.arcgis.com/4.31/@arcgis/core/Map.js";
      import Basemap from "https://js.arcgis.com/4.31/@arcgis/core/Basemap.js";
      import MapView from "https://js.arcgis.com/4.31/@arcgis/core/views/MapView.js";
      import FeatureLayer from "https://js.arcgis.com/4.31/@arcgis/core/layers/FeatureLayer.js";
      import TileLayer from "https://js.arcgis.com/4.31/@arcgis/core/layers/TileLayer.js";
      import FeatureEffect from "https://js.arcgis.com/4.31/@arcgis/core/layers/support/FeatureEffect.js";
      import ClassBreaksRenderer from "https://js.arcgis.com/4.31/@arcgis/core/renderers/ClassBreaksRenderer.js";
      import SimpleFillSymbol from "https://js.arcgis.com/4.31/@arcgis/core/symbols/SimpleFillSymbol.js";
      import VectorTileLayer from "https://js.arcgis.com/4.31/@arcgis/core/layers/VectorTileLayer.js";
      import * as geometryEngine from "https://js.arcgis.com/4.31/@arcgis/core/geometry/geometryEngine.js";
      import Legend from "https://js.arcgis.com/4.31/@arcgis/core/widgets/Legend.js";
      import * as reactiveUtils from "https://js.arcgis.com/4.31/@arcgis/core/core/reactiveUtils.js";
      import { calculateCdrs, calculateDerived, evaluateEarlySignal } from "../src/lib/calculations/index.ts";

      const SERVICE_URL =
        "https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/climate_pulse_admin2/FeatureServer/0";

      const DATA_URL = new URL("../data/climatepulse.json", import.meta.url).href;
      const PANEL_DATA_URL = new URL("../data/CLIMATE_PULSE_KENYA_ADMIN2_PANEL.csv", import.meta.url).href;
      const UNAVAILABLE_FIELDS = new Set(["LST_NIGHT", "LSTN_ANOM", "FACC_MAX"]);
      const GROUPS = {
        "Drought & rainfall": ["SPI_01", "SPI_03", "SPI_06", "SPI_12", "SPI3_PCT", "RAIN_ANOM", "RAIN_PCT", "RSEAS_PCT", "RAIN_ANN", "RAIN_TRND", "CDD_MAX", "RX1DAY"],
        Vegetation: ["VCI_NOW", "NDVI_NOW", "NDVI_ANOM", "VEG_ST_PCT", "VEG_ST_DUR", "VEG_RECOV"],
        "Vegetation health": ["VHI_NOW", "TCI_NOW", "VHI_ANOM", "VHI_ST_PCT"],
        "Soil moisture": ["SMI_NOW", "SM_ROOT", "SM_R_AN", "RZ_DEF", "ERA_SM_AN"],
        Heat: ["TEMP_ANOM", "HOT_DAYS", "HEAT_DAYS", "HOT_PCT", "LST_HIGH", "LSTD_NOW", "T2M_MEAN"],
        Water: ["W_OCCUR", "W_PCT", "S2_W_AREA", "S2_W_CHG", "DW_WATER"],
        "Land & terrain": ["DW_CROP", "DW_TREE", "DW_SHRUB", "DW_BARE", "DW_BUILT", "WC_CROP", "ELEV_MEAN", "SLOPE_MEAN", "TWI_MEAN"],
        "People & exposure": ["POP_T26", "POP_D2626", "POP_U526", "POP_WRA26", "POP_6526", "EXP_PCT", "EXR_PCT", "EXS_PCT", "EXH_PCT", "POP_EXP", "EXR_POP", "EXS_POP", "U5_EXP", "EXR_U5", "EXS_U5"],
        "Climate futures": ["CM245_TAS", "CM585_TAS", "CM245_PR", "CM585_PR"],
        Derived: ["DPI", "EXP_MAX_PCT"]
      };
      const SPI_BREAKS = [
        { min: -Infinity, max: -2, label: "Extremely dry (<= -2)" },
        { min: -2, max: -1.5, label: "Severely dry (-2 to -1.5)" },
        { min: -1.5, max: -1, label: "Moderately dry (-1.5 to -1)" },
        { min: -1, max: 1, label: "Near normal (-1 to 1)" },
        { min: 1, max: 1.5, label: "Moderately wet (1 to 1.5)" },
        { min: 1.5, max: 2, label: "Very wet (1.5 to 2)" },
        { min: 2, max: Infinity, label: "Extremely wet (>= 2)" }
      ];
      const STRESS_BREAKS = [
        { min: -Infinity, max: 10, label: "Extreme stress (< 10)" },
        { min: 10, max: 20, label: "Severe stress (10-20)" },
        { min: 20, max: 30, label: "Moderate stress (20-30)" },
        { min: 30, max: 40, label: "Mild stress (30-40)" },
        { min: 40, max: Infinity, label: "No stress (>= 40)" }
      ];
      const PERCENT_BREAKS = [
        { min: 0, max: 10, label: "0-10%" },
        { min: 10, max: 25, label: "10-25%" },
        { min: 25, max: 50, label: "25-50%" },
        { min: 50, max: 75, label: "50-75%" },
        { min: 75, max: 100, label: "75-100%" }
      ];
      const labelFor = (field) => field.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const INDICATORS = {};
      Object.entries(GROUPS).forEach(([group, fields]) => fields.forEach((field) => {
        const isSpi = field.startsWith("SPI");
        const isStress = ["VCI_NOW", "VHI_NOW", "TCI_NOW"].includes(field);
        const isPercent = field.endsWith("_PCT") || field === "SPI3_PCT";
        const isAnomaly = field.includes("ANOM") || field.endsWith("_R_AN");
        const isDerived = group === "Derived";
        INDICATORS[field] = {
          field,
          label: field === "DPI" ? "Drought Pressure Index" : labelFor(field),
          group,
          unit: isPercent || field === "EXP_MAX_PCT" ? "%" : field.includes("POP") ? "people" : "value",
          source: isDerived ? "Calculated from Climate Pulse fields" : "Climate Pulse Kenya field guide",
          asOf: isDerived ? "RUN_DATE" : "OD_CHIRPS",
          direction: isSpi || isAnomaly ? "diverging" : isStress || isDerived ? "higherIsWorse" : "neutral",
          breaks: field === "DPI"
            ? [{ min: 0, max: 25, label: "Low (0-25)" }, { min: 25, max: 50, label: "Moderate (25-50)" }, { min: 50, max: 75, label: "High (50-75)" }, { min: 75, max: Infinity, label: "Very high (75-100)" }]
            : isSpi ? SPI_BREAKS : isStress ? STRESS_BREAKS : isPercent ? PERCENT_BREAKS : [],
          colors: isSpi || isAnomaly ? ["#8c510a", "#d8b365", "#f5f5f5", "#5ab4ac", "#01665e"] : isStress || isDerived ? ["#b2182b", "#ef8a62", "#fddbc7", "#1a9850", "#006837"] : ["#f5f0e6", "#e7c9a9", "#d98245", "#a63603"],
          caveat: field === "LST_ANOM" ? "Unreliable when LST_VAL is low; check the quality fields." : field === "DPI" ? "Hazard pressure indicator - not a risk or damage estimate." : ""
        };
      }));

      const appState = {
        activeCounty: "",
        activeSubCounty: "",
        activeHazard: "vegetation",
        activePopulationGroup: "all",
        activeIndicator: "VHI_NOW",
        classificationMode: "standard",
        dataRows: [],
        panelRows: []
      };

      const pageActions = [
        ["navMap", "mapPage"],
        ["navDashboard", "dashboardPage"],
        ["navHazards", "hazardsPage"],
        ["navEarlySignal", "earlySignalPage"],
        ["navPeople", "peoplePage"],
        ["navRiskScore", "riskScorePage"],
        ["navDataMethod", "dataMethodPage"],
        ["navFutures", "futuresPage"]
      ];

      const countySelect = document.querySelector("#countySelect");
      const subCountySelect = document.querySelector("#subCountySelect");
      const indicatorSelect = document.querySelector("#mapIndicatorSelect");
      const classificationMode = document.querySelector("#classificationMode");
      const indicatorLegend = document.querySelector("#indicatorLegend");
      const dataDateChip = document.querySelector("#dataDateChip");
      const spatialReadout = document.querySelector("#spatialReadout");
      const dashboardCountySelect = document.querySelector("#dashboardCountySelect");
      const dashboardCards = document.querySelector("#dashboardCards");
      const dashboardTable = document.querySelector("#dashboardTable");
      const dashboardScope = document.querySelector("#dashboardScope");
      const countyExposureChart = document.querySelector("#countyExposureChart");
      const countyRateChart = document.querySelector("#countyRateChart");
      const adminRankingChart = document.querySelector("#adminRankingChart");
      const dpiDistribution = document.querySelector("#dpiDistribution");
      const dpiScatter = document.querySelector("#dpiScatter");
      const areaProfile = document.querySelector("#areaProfile");
      const climateComparisons = document.querySelector("#climateComparisons");
      const rankingMetricSelect = document.querySelector("#rankingMetricSelect");
      const scatterMetricSelect = document.querySelector("#scatterMetricSelect");
      const resetDashboardButton = document.querySelector("#resetDashboardButton");
      const globalSubCountySelect = document.querySelector("#globalSubCountySelect");
      const hazardSelect = document.querySelector("#hazardSelect");
      const populationGroupSelect = document.querySelector("#populationGroupSelect");
      const resetGlobalFilters = document.querySelector("#resetGlobalFilters");
      const pages = ["mapPage", "dashboardPage", "futuresPage"].map((id) =>
        document.querySelector(`#${id}`)
      ).concat(["hazardsPage", "earlySignalPage", "peoplePage", "riskScorePage", "dataMethodPage"].map((id) => document.querySelector(`#${id}`)));

      function syncFilterHash() {
        const params = new URLSearchParams();
        if (appState.activeCounty) params.set("county", appState.activeCounty);
        if (appState.activeSubCounty) params.set("subCounty", appState.activeSubCounty);
        if (appState.activeHazard !== "vegetation") params.set("hazard", appState.activeHazard);
        if (appState.activePopulationGroup !== "all") params.set("group", appState.activePopulationGroup);
        if (appState.activeSubCounty) params.set("selection", appState.activeSubCounty);
        const hash = params.toString();
        history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
      }

      function restoreFilterHash() {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        appState.activeCounty = params.get("county") || "";
        appState.activeSubCounty = params.get("subCounty") || "";
        appState.activeHazard = ["vegetation", "rainfall", "soilMoisture", "heat"].includes(params.get("hazard")) ? params.get("hazard") : "vegetation";
        appState.activePopulationGroup = ["all", "under5", "women1549", "65plus", "under18"].includes(params.get("group")) ? params.get("group") : "all";
      }
      restoreFilterHash();
      dashboardCountySelect.value = appState.activeCounty;
      hazardSelect.value = appState.activeHazard;
      populationGroupSelect.value = appState.activePopulationGroup;

      const masterLayer = new FeatureLayer({
        url: SERVICE_URL,
        title: "Climate Pulse Kenya Admin-2",
        outFields: ["*"],
        popupEnabled: true
      });
      masterLayer.blendMode = "multiply";
      const countyOutlineLayer = new FeatureLayer({
        url: "https://services8.arcgis.com/oTalEaSXAuyNT7xf/arcgis/rest/services/climate_pulse_admin2/FeatureServer/1",
        title: "County outlines",
        outFields: ["*"],
        renderer: {
          type: "simple",
          symbol: new SimpleFillSymbol({
            color: [0, 0, 0, 0],
            outline: { color: [0, 0, 0, 0.8], width: 2 }
          })
        },
        popupEnabled: false
      });
      const referenceVectorLayer = new VectorTileLayer({
        url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer",
        title: "Vector reference labels",
        opacity: 0.35,
        blendMode: "multiply"
      });

      const lightGrayBasemap = new Basemap({
        title: "Light Gray",
        baseLayers: [
          new TileLayer({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer",
            title: "Public Light Gray Base"
          })
        ]
      });
      const map = new Map({
        basemap: lightGrayBasemap,
        layers: [referenceVectorLayer, countyOutlineLayer, masterLayer]
      });

      const view = new MapView({
        container: "viewDiv",
        map,
        center: [38.5, 2.5],
        zoom: 6,
        popup: {
          autoOpenEnabled: false,
          dockEnabled: false,
          visibleElements: {
            closeButton: true,
            collapseButton: false,
            featureNavigation: true
          }
        },
        ui: {
          components: ["attribution"]
        }
      });
      const legend = new Legend({
        view,
        container: "legendDiv",
        layerInfos: [{ layer: masterLayer, title: "Active indicator" }]
      });

      function populateIndicatorOptions() {
        indicatorSelect.innerHTML = "";
        Object.entries(GROUPS).forEach(([group, fields]) => {
          const groupElement = document.createElement("calcite-option-group");
          groupElement.label = group;
          fields.filter((field) => !UNAVAILABLE_FIELDS.has(field)).forEach((field) => {
            const option = document.createElement("calcite-option");
            option.value = field;
            option.textContent = INDICATORS[field].label;
            groupElement.appendChild(option);
          });
          indicatorSelect.appendChild(groupElement);
        });
        indicatorSelect.value = appState.activeIndicator;
      }

      function formatDate(value) {
        if (!value) return "not available";
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      }

      function updateDataDateChip() {
        const dates = [
          ["CHIRPS", appState.dataRows[0]?.OD_CHIRPS],
          ["ERA5-Land", appState.dataRows[0]?.OD_ERA5],
          ["MODIS", appState.dataRows[0]?.OD_MVEG],
          ["SMAP", appState.dataRows[0]?.OD_SMAP]
        ].filter(([, value]) => value);
        dataDateChip.textContent = dates.map(([label, value]) => `${label} to ${formatDate(value)}`).join(" | ") || "Observation dates unavailable";
      }

      const numericValue = (row, field) => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? value : null;
      };

      function calculateRowDpi(row) {
        const components = [
          [numericValue(row, "SPI_03") === null ? null : Math.min(100, Math.max(0, (-numericValue(row, "SPI_03") + 2) / 4 * 100)), 0.25],
          [numericValue(row, "VCI_NOW") === null ? null : 100 - numericValue(row, "VCI_NOW"), 0.25],
          [numericValue(row, "SMI_NOW") === null ? null : Math.min(100, Math.max(0, (1 - numericValue(row, "SMI_NOW")) * 100)), 0.2],
          [numericValue(row, "VHI_NOW") === null ? null : 100 - numericValue(row, "VHI_NOW"), 0.15],
          [numericValue(row, "HOT_PCT"), 0.15]
        ].filter(([value]) => value !== null);
        const weight = components.reduce((total, [, itemWeight]) => total + itemWeight, 0);
        return components.length < 3 || weight === 0
          ? null
          : components.reduce((total, [value, itemWeight]) => total + value * itemWeight, 0) / weight;
      }

      const formatMetric = (value, decimals = 0) =>
        value === null ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: decimals });

      function parsePanelCsv(text) {
        const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
        if (lines.length < 2) throw new Error("Early-signal panel is empty.");
        const headers = lines[0].split(",");
        const numericFields = new Set(headers.filter((field) => !["ADM2_ID", "OBS_DATE"].includes(field)));
        return lines.slice(1).filter(Boolean).map((line) => {
          const values = line.split(",");
          return headers.reduce((row, field, index) => {
            const value = values[index] ?? "";
            row[field] = numericFields.has(field) ? (value === "" ? null : Number(value)) : value;
            return row;
          }, {});
        });
      }

      function percentile(values, proportion) {
        const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
        if (!sorted.length) return null;
        const index = (sorted.length - 1) * proportion;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
      }

      function buildSignalSeries(panelRows) {
        const monthThresholds = new globalThis.Map();
        for (let month = 1; month <= 12; month += 1) {
          monthThresholds.set(month, percentile(
            panelRows.filter((row) => row.MONTH === month).map((row) => row.SM_ROOT),
            0.1
          ));
        }
        const grouped = new globalThis.Map();
        panelRows.forEach((row) => {
          const threshold = monthThresholds.get(row.MONTH);
          const observation = {
            ADM2_ID: row.ADM2_ID,
            OBS_DATE: row.OBS_DATE,
            SPI_03: numericValue(row, "SPI_03"),
            VCI: numericValue(row, "VCI"),
            SM_ROOT: numericValue(row, "SM_ROOT"),
            SM_ROOT_ANOM: row.SM_ROOT === null || threshold === null ? null : row.SM_ROOT - threshold
          };
          if (!grouped.has(row.ADM2_ID)) grouped.set(row.ADM2_ID, []);
          grouped.get(row.ADM2_ID).push(observation);
        });
        grouped.forEach((series) => series.sort((a, b) => a.OBS_DATE.localeCompare(b.OBS_DATE)));
        return { grouped, monthThresholds };
      }

      function signalForSeries(series, index) {
        return evaluateEarlySignal(series[index], series[index - 1] ?? null, series[index - 2] ?? null);
      }

      function signalLevel(result) {
        return result.alert ? "Alert" : result.warning ? "Warning" : result.watch ? "Watch" : "Clear";
      }

      function renderSignalTrend(series, label, monthThresholds) {
        const chart = document.querySelector("#signalTrend");
        if (!series?.length) {
          chart.innerHTML = '<div class="empty-state">No monthly observations for the selected area.</div>';
          return;
        }
        const points = series.slice(-18);
        const width = 760;
        const height = 270;
        const left = 46;
        const right = 12;
        const top = 24;
        const panelHeight = 68;
        const gap = 12;
        const x = (index) => left + index * ((width - left - right) / Math.max(points.length - 1, 1));
        const rows = [
          { field: "SPI_03", title: "SPI-3", min: -3.2, max: 3.2, threshold: -1, color: "#C9772B", format: (value) => value.toFixed(1) },
          { field: "VCI", title: "VCI", min: 0, max: 100, threshold: null, color: "#2E8B7A", format: (value) => value.toFixed(0) },
          { field: "SM_ROOT", title: "Root-zone soil moisture", min: 0, max: 0.36, threshold: null, color: "#1F4E79", format: (value) => value.toFixed(2) }
        ];
        const y = (value, rowIndex, min, max) => top + rowIndex * (panelHeight + gap) + panelHeight - ((value - min) / (max - min)) * panelHeight;
        const svgRows = rows.map((row, rowIndex) => {
          const valid = points.map((point, index) => ({ point, index })).filter(({ point }) => point[row.field] !== null);
          const path = valid.length > 1 ? `<path class="signal-line" d="${valid.map(({ point, index }, pathIndex) => `${pathIndex ? "L" : "M"}${x(index).toFixed(1)},${y(point[row.field], rowIndex, row.min, row.max).toFixed(1)}`).join(" ")}" stroke="${row.color}"/>` : "";
          const circles = valid.map(({ point, index }) => `<circle cx="${x(index).toFixed(1)}" cy="${y(point[row.field], rowIndex, row.min, row.max).toFixed(1)}" r="2.7" fill="${row.color}"><title>${point.OBS_DATE}: ${row.format(point[row.field])}</title></circle>`).join("");
          const threshold = row.threshold === null ? "" : `<line class="signal-threshold" x1="${left}" x2="${width - right}" y1="${y(row.threshold, rowIndex, row.min, row.max)}" y2="${y(row.threshold, rowIndex, row.min, row.max)}"/>`;
          const baseline = row.field === "SM_ROOT" ? monthThresholds.get(Number(points[points.length - 1].OBS_DATE.slice(5, 7))) : null;
          const baselineLine = baseline === null || baseline === undefined ? "" : `<line class="signal-threshold soil" x1="${left}" x2="${width - right}" y1="${y(baseline, rowIndex, row.min, row.max)}" y2="${y(baseline, rowIndex, row.min, row.max)}"/>`;
          return `<g><text class="signal-axis-label" x="0" y="${top + rowIndex * (panelHeight + gap) + 10}">${row.title}</text><line class="signal-gridline" x1="${left}" x2="${width - right}" y1="${y(row.min, rowIndex, row.min, row.max)}" y2="${y(row.min, rowIndex, row.min, row.max)}"/>${threshold}${baselineLine}${path}${circles}</g>`;
        }).join("");
        const labels = points.map((point, index) => index % 3 === 0 ? `<text class="signal-date" x="${x(index)}" y="${height - 4}">${point.OBS_DATE.slice(0, 7)}</text>` : "").join("");
        chart.innerHTML = `<div class="trend-heading"><b>${label}</b><span>Latest 18 months · hover points for values</span></div><svg class="signal-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly SPI-3, vegetation condition, and root-zone soil moisture trend">${svgRows}${labels}</svg><div class="signal-legend"><span><i style="background:#C9772B"></i>SPI-3 (threshold −1)</span><span><i style="background:#2E8B7A"></i>VCI</span><span><i style="background:#1F4E79"></i>Root-zone soil moisture</span><span class="threshold-key">Dashed = trigger threshold</span></div>`;
      }

      function rowsForDashboard(county = dashboardCountySelect.value) {
        return appState.dataRows.filter((row) =>
          (!county || row.COUNTY === county) &&
          (!appState.activeSubCounty || row.SUB_COUNTY === appState.activeSubCounty)
        );
      }

      function dashboardSummary(rows) {
        const totalPopulation = rows.reduce((total, row) => total + (numericValue(row, "POP_T26") ?? 0), 0);
        const exposure = exposureFields(appState.activeHazard);
        const exposedPopulation = rows.reduce((total, row) => total + (numericValue(row, exposure.population) ?? 0), 0);
        const dpiValues = rows.map(calculateRowDpi).filter((value) => value !== null);
        return {
          totalPopulation,
          exposedPopulation,
          exposureRate: totalPopulation ? exposedPopulation / totalPopulation * 100 : null,
          dpi: dpiValues.length ? dpiValues.reduce((total, value) => total + value, 0) / dpiValues.length : null
        };
      }

      function exposureFields(hazard) {
        return {
          vegetation: { population: "POP_EXP", rate: "EXP_PCT", label: "Vegetation stress" },
          rainfall: { population: "EXR_POP", rate: "EXR_PCT", label: "Rainfall deficit" },
          soilMoisture: { population: "EXS_POP", rate: "EXS_PCT", label: "Soil-moisture stress" },
          heat: { population: "EXH_POP", rate: "EXH_PCT", label: "Heat exposure" }
        }[hazard] ?? { population: "POP_EXP", rate: "EXP_PCT", label: "Vegetation stress" };
      }

      function rowMetrics(row) {
        const population = numericValue(row, "POP_T26");
        const exposure = exposureFields(appState.activeHazard);
        const exposedPopulation = numericValue(row, exposure.population);
        return {
          population,
          exposedPopulation,
          exposureRate: population && exposedPopulation !== null ? exposedPopulation / population * 100 : null,
          dpi: calculateRowDpi(row)
        };
      }

      function chartBar(label, value, max, suffix, areaId, className = "") {
        if (value === null) return "";
        const width = max > 0 ? Math.max(1.5, value / max * 100) : 0;
        return `<button class="chart-bar ${className} ${areaId === appState.activeSubCounty ? "selected" : ""}" data-area-id="${areaId}" title="Select ${label}"><span class="chart-bar-label"><span>${label}</span><span>${formatMetric(value, suffix === "%" ? 1 : 0)}${suffix}</span></span><span class="chart-bar-track"><span class="chart-bar-fill ${className}" style="width:${width}%"></span></span></button>`;
      }

      function renderBarChart(container, rows, valueGetter, suffix, className = "") {
        if (!rows.length) {
          container.innerHTML = '<div class="chart-empty">No data for this scope.</div>';
          return;
        }
        const values = rows.map(valueGetter).filter((value) => value !== null);
        const max = Math.max(...values, 1);
        container.innerHTML = rows.map((row) =>
          chartBar(row.SUB_COUNTY, valueGetter(row), max, suffix, row.SUB_COUNTY, className)
        ).join("") + `<div class="chart-axis"><span>0</span><span>${formatMetric(max, suffix === "%" ? 1 : 0)}${suffix}</span></div>`;
      }

      function renderDpiDistribution(rows) {
        const valid = rows.map((row) => ({ row, dpi: rowMetrics(row).dpi })).filter((item) => item.dpi !== null);
        if (!valid.length) {
          dpiDistribution.innerHTML = '<div class="chart-empty">DPI unavailable for this scope.</div>';
          return;
        }
        dpiDistribution.innerHTML = `<div class="dot-plot">${valid.sort((a, b) => a.dpi - b.dpi).map(({ row, dpi }) => {
          const countyClass = row.COUNTY.toLowerCase();
          return `<button class="chart-bar ${row.SUB_COUNTY === appState.activeSubCounty ? "selected" : ""}" data-area-id="${row.SUB_COUNTY}" title="Select ${row.SUB_COUNTY}"><span class="dot-row"><span class="dot-label">${row.SUB_COUNTY}</span><span class="dot-track"><span class="dot ${countyClass}" style="left:${Math.min(98, Math.max(0, dpi))}%"></span></span><span>${formatMetric(dpi, 1)}</span></span></button>`;
        }).join("")}</div><div class="chart-axis"><span>0 Low pressure</span><span>100 High pressure</span></div>`;
      }

      function renderDpiScatter(rows, metric) {
        const points = rows.map((row) => ({ row, ...rowMetrics(row) }))
          .filter((item) => item.dpi !== null && item[metric] !== null);
        if (!points.length) {
          dpiScatter.innerHTML = '<div class="chart-empty">No comparable observations for this scope.</div>';
          return;
        }
        const width = 560;
        const height = 250;
        const xMax = Math.max(...points.map((item) => item.dpi), 100);
        const yMax = Math.max(...points.map((item) => item[metric]), metric === "exposureRate" ? 100 : 1);
        const yScale = metric === "exposureRate" ? 100 : yMax;
        const circles = points.map(({ row, dpi, [metric]: y }) => {
          const x = 35 + dpi / xMax * 500;
          const cy = 215 - y / yScale * 180;
          const color = { Garissa: "#287c8e", Marsabit: "#d98245", Turkana: "#7a5195" }[row.COUNTY] ?? "#5e5e5e";
          return `<circle cx="${x}" cy="${cy}" r="6" fill="${color}" stroke="#fff" stroke-width="2" data-area-id="${row.SUB_COUNTY}"><title>${row.SUB_COUNTY}, ${row.COUNTY}: DPI ${formatMetric(dpi, 1)}, ${metric === "exposureRate" ? "rate" : "exposed population"} ${formatMetric(y, metric === "exposureRate" ? 1 : 0)}${metric === "exposureRate" ? "%" : ""}</title></circle>`;
        }).join("");
        dpiScatter.innerHTML = `<svg class="scatter-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Drought pressure scatter plot"><line x1="35" y1="215" x2="535" y2="215" stroke="#999"/><line x1="35" y1="35" x2="35" y2="215" stroke="#999"/><text x="285" y="245" text-anchor="middle" fill="#5e5e5e" font-size="12">Drought pressure (DPI)</text><text x="12" y="125" transform="rotate(-90 12 125)" text-anchor="middle" fill="#5e5e5e" font-size="12">${metric === "exposureRate" ? "Exposure rate (%)" : "Exposed population"}</text>${circles}</svg>`;
      }

      function renderClimateComparisons(rows) {
        const indicators = [
          ["Rainfall anomaly", "RAIN_ANOM"],
          ["Soil moisture index", "SMI_NOW"],
          ["Vegetation health", "VHI_NOW"],
          ["LST anomaly", "LST_ANOM"]
        ];
        climateComparisons.innerHTML = indicators.map(([label, field]) => {
          const points = rows.map((row) => ({ row, x: numericValue(row, field), y: rowMetrics(row).exposureRate }))
            .filter((point) => point.x !== null && point.y !== null);
          if (!points.length) return `<div><h3>${label}</h3><div class="chart-empty">No valid observations.</div></div>`;
          const min = Math.min(...points.map((point) => point.x));
          const max = Math.max(...points.map((point) => point.x));
          const span = max - min || 1;
          return `<div><h3>${label}</h3><div class="dot-plot">${points.map(({ row, x, y }) => `<button class="chart-bar ${row.SUB_COUNTY === appState.activeSubCounty ? "selected" : ""}" data-area-id="${row.SUB_COUNTY}" title="Select ${row.SUB_COUNTY}"><span class="dot-row"><span class="dot-label">${row.SUB_COUNTY}</span><span class="dot-track"><span class="dot ${row.COUNTY.toLowerCase()}" style="left:${(x - min) / span * 98}%"></span></span><span>${formatMetric(y, 1)}%</span></span></button>`).join("")}</div><div class="chart-axis"><span>${formatMetric(min, 1)}</span><span>${formatMetric(max, 1)}</span></div></div>`;
        }).join("");
      }

      function renderAreaProfile(row) {
        if (!row) {
          areaProfile.innerHTML = '<div class="chart-empty">No area is available for this filter.</div>';
          return;
        }
        const metrics = rowMetrics(row);
        const dateItems = [["Observation", row.OBS_DATE], ["Rainfall", row.OD_CHIRPS], ["Soil moisture", row.OD_SMAP], ["Vegetation", row.OD_MVEG]].filter(([, value]) => value);
        areaProfile.innerHTML = `<div class="dashboard-scope">${row.SUB_COUNTY}, ${row.COUNTY}</div><div class="profile-grid">
          <div class="profile-item"><strong>Population</strong><span>${formatMetric(metrics.population)} people (2026)</span></div>
          <div class="profile-item"><strong>Exposure</strong><span>${formatMetric(metrics.exposedPopulation)} people · ${formatMetric(metrics.exposureRate, 1)}%</span></div>
          <div class="profile-item"><strong>Drought pressure</strong><span>${formatMetric(metrics.dpi, 1)} DPI; components use available fields and renormalised weights</span></div>
          <div class="profile-item"><strong>Vegetation</strong><span>VHI_NOW ${formatMetric(numericValue(row, "VHI_NOW"), 1)}</span></div>
          <div class="profile-item"><strong>Rainfall</strong><span>RAIN_ANOM ${formatMetric(numericValue(row, "RAIN_ANOM"), 1)} · SPI_03 ${formatMetric(numericValue(row, "SPI_03"), 2)} · RAIN_PCT ${formatMetric(numericValue(row, "RAIN_PCT"), 1)}%</span></div>
          <div class="profile-item"><strong>Soil moisture</strong><span>SMI_NOW ${formatMetric(numericValue(row, "SMI_NOW"), 2)}</span></div>
          <div class="profile-item"><strong>Temperature</strong><span>LST_ANOM ${formatMetric(numericValue(row, "LST_ANOM"), 1)} · validity ${formatMetric(numericValue(row, "LST_VAL"), 1)}%</span></div>
          <div class="profile-item"><strong>Geography</strong><span>${formatMetric(numericValue(row, "ADM2_AREA"), 1)} km² · ${row.COUNTY} County</span></div>
          <div class="profile-item"><strong>Data context</strong><span>Baseline ${row.BASE_START ?? "unavailable"} to ${row.BASE_END ?? "unavailable"} · source Climate Pulse Kenya</span></div>
          <div class="profile-item"><strong>Observation dates</strong><span>${dateItems.map(([label, value]) => `${label}: ${formatDate(value)}`).join(" · ") || "Unavailable"}</span></div>
        </div><div class="dashboard-actions"><calcite-button id="returnToCountyButton" appearance="outline" scale="s">Return to ${row.COUNTY}</calcite-button><calcite-button id="returnToAllButton" appearance="outline" scale="s">All pilot counties</calcite-button></div>`;
      }

      function renderDashboard() {
        if (!dashboardCards || !dashboardTable || !dashboardCountySelect) return;
        const selectedRows = rowsForDashboard();
        const summary = dashboardSummary(selectedRows);
        const exposure = exposureFields(appState.activeHazard);
        dashboardCards.innerHTML = [
          ["Population", `${formatMetric(summary.totalPopulation)} people · modelled 2026`],
          [`People exposed · ${exposure.label}`, `${formatMetric(summary.exposedPopulation)} people`],
          [`Exposure rate · ${exposure.label}`, `${formatMetric(summary.exposureRate, 1)}%`],
          ["Drought pressure · population-weighted", formatMetric(summary.dpi, 1)]
        ].map(([label, value]) => `<article class="dashboard-card"><div class="dashboard-card-label">${label}</div><div class="dashboard-card-value">${value}</div></article>`).join("");

        const counties = [...new Set(appState.dataRows.map((row) => row.COUNTY))].sort();
        const countyRowsForCharts = counties.map((county) => {
          const countyRows = appState.dataRows.filter((row) => row.COUNTY === county);
          const countySummary = dashboardSummary(countyRows);
          return { COUNTY: county, SUB_COUNTY: county, ...countySummary };
        });
        renderBarChart(countyExposureChart, countyRowsForCharts, (row) => row.exposedPopulation, " people", "");
        renderBarChart(countyRateChart, countyRowsForCharts, (row) => row.exposureRate, "%", "rate");
        const rankingRows = selectedRows.map((row) => ({ row, ...rowMetrics(row) }))
          .sort((a, b) => (b[rankingMetricSelect.value] ?? -Infinity) - (a[rankingMetricSelect.value] ?? -Infinity));
        renderBarChart(adminRankingChart, rankingRows.map((item) => ({ ...item.row, ...item })), (row) => row[rankingMetricSelect.value], rankingMetricSelect.value === "exposureRate" ? "%" : "", rankingMetricSelect.value === "exposureRate" ? "rate" : "");
        renderDpiDistribution(selectedRows);
        renderDpiScatter(selectedRows, scatterMetricSelect.value);
        renderClimateComparisons(selectedRows);
        renderPhasePages();
        renderAreaProfile(
          appState.dataRows.find((row) => row.SUB_COUNTY === appState.activeSubCounty) ??
          appState.dataRows.find((row) => !appState.activeCounty || row.COUNTY === appState.activeCounty)
        );
        const scope = appState.activeSubCounty
          ? `${appState.activeSubCounty}, ${appState.activeCounty}`
          : appState.activeCounty || "All pilot counties";
        dashboardScope.textContent = `Scope: ${scope}`;
        const tableRows = counties.map((county) => {
          const countySummary = dashboardSummary(appState.dataRows.filter((row) => row.COUNTY === county));
          return `<tr><td>${county}</td><td>${formatMetric(countySummary.totalPopulation)}</td><td>${formatMetric(countySummary.exposedPopulation)}</td><td>${formatMetric(countySummary.exposureRate, 1)}%</td><td>${formatMetric(countySummary.dpi, 1)}</td></tr>`;
        }).join("");
        dashboardTable.innerHTML = `<table class="dashboard-table"><thead><tr><th>County</th><th>Population</th><th>Exposed</th><th>Exposure rate</th><th>Avg. DPI</th></tr></thead><tbody>${tableRows}</tbody></table>`;
      }

      const countyColor = { Turkana: "#1F4E79", Marsabit: "#C9772B", Garissa: "#2E8B7A" };
      const riskColor = { Low: "#FFE8A3", Moderate: "#F6A94B", High: "#D9532F", "Very high": "#7F1D1D" };
      const phaseNumber = (row, field) => numericValue(row, field);
      const svgBar = (label, value, max, color, suffix = "", selected = false) => {
        const width = max > 0 && value !== null ? Math.max(1, value / max * 100) : 0;
        return `<div class="svg-bar-row ${selected ? "is-selected" : ""}" data-area-id="${label}"><span class="svg-bar-label">${label}</span><span class="svg-bar-track"><i style="width:${width}%;background:${color}"></i></span><b>${value === null ? "No data" : formatMetric(value, suffix === "%" ? 1 : 0)}${value === null ? "" : suffix}</b></div>`;
      };

      function renderHazardsPage(rows) {
        const indicators = [
          ["SPI_03", "SPI-3", -1.5], ["SPI_06", "SPI-6", -1.5], ["RAIN_ANOM", "Rain anomaly", 0],
          ["VCI_NOW", "VCI", 35], ["VHI_NOW", "VHI", 35], ["SMI_NOW", "SMI", 0.1],
          ["HOT_PCT", "Hot days", 10], ["TEMP_ANOM", "Temp anomaly", 0]
        ];
        const matrix = document.querySelector("#hazardMatrix");
        matrix.innerHTML = `<div class="matrix-grid matrix-head"><span>Sub-county</span>${indicators.map(([, label]) => `<button data-indicator="${label}">${label}</button>`).join("")}</div>` +
          rows.map((row) => `<div class="matrix-grid"><span class="matrix-label" data-area-id="${row.SUB_COUNTY}">${row.SUB_COUNTY}</span>${indicators.map(([field, label, threshold]) => {
            const value = phaseNumber(row, field);
            const stress = value !== null && ((field.startsWith("SPI") && value <= threshold) || (["VCI_NOW", "VHI_NOW"].includes(field) && value < threshold) || (field === "SMI_NOW" && value < threshold) || (field === "HOT_PCT" && value > threshold));
            const lowConfidence = field === "TEMP_ANOM" && (phaseNumber(row, "LST_VAL") ?? 100) < 25;
            return `<span class="matrix-cell ${stress ? "stress" : ""} ${lowConfidence ? "low-confidence" : ""}" title="${row.SUB_COUNTY}, ${label}: ${value === null ? "No data" : value.toFixed(1)}">${value === null ? "—" : value.toFixed(field === "SMI_NOW" ? 2 : 1)}</span>`;
          }).join("")}</div>`).join("");
        document.querySelector("#hazardDetail").innerHTML = "<b>Thresholds</b><br>SPI severe dryness ≤ −1.5 · VCI/VHI stress &lt; 35 · SMI stress &lt; 0.10 · heat uses HOT_PCT.<br><br><span class='muted'>Cells with diagonal hatching are low confidence or unavailable.</span>";
        const average = (fields) => fields.map((field) => rows.map((row) => phaseNumber(row, field)).filter((value) => value !== null)).flat();
        document.querySelector("#rainfallChart").innerHTML = rows.slice().sort((a, b) => (phaseNumber(a, "SPI_03") ?? 0) - (phaseNumber(b, "SPI_03") ?? 0)).map((row) => svgBar(row.SUB_COUNTY, phaseNumber(row, "SPI_03"), 3, countyColor[row.COUNTY] ?? "#1F4E79", "", row.SUB_COUNTY === appState.activeSubCounty)).join("");
        document.querySelector("#vegetationChart").innerHTML = rows.slice().sort((a, b) => (phaseNumber(a, "VCI_NOW") ?? 0) - (phaseNumber(b, "VCI_NOW") ?? 0)).map((row) => svgBar(row.SUB_COUNTY, phaseNumber(row, "VCI_NOW"), 100, countyColor[row.COUNTY] ?? "#1F4E79", "", row.SUB_COUNTY === appState.activeSubCounty)).join("");
        document.querySelector("#soilHeatChart").innerHTML = rows.slice().sort((a, b) => (phaseNumber(a, "SMI_NOW") ?? 0) - (phaseNumber(b, "SMI_NOW") ?? 0)).map((row) => svgBar(row.SUB_COUNTY, phaseNumber(row, "SMI_NOW"), 1, countyColor[row.COUNTY] ?? "#1F4E79", "", row.SUB_COUNTY === appState.activeSubCounty)).join("");
        void average;
      }

      function renderPeoplePage(rows) {
        const counties = [...new Set(rows.map((row) => row.COUNTY))];
        document.querySelector("#ageCompositionChart").innerHTML = counties.map((county) => {
          const countyRows = rows.filter((row) => row.COUNTY === county);
          const total = countyRows.reduce((sum, row) => sum + (phaseNumber(row, "POP_T26") ?? 0), 0);
          const groups = [["Under 5", "POP_U526", "#1F4E79"], ["Women 15–49", "POP_WRA26", "#C9772B"], ["65+", "POP_6526", "#2E8B7A"]];
          let cursor = 0;
          const bars = groups.map(([label, field, color]) => {
            const pct = total ? countyRows.reduce((sum, row) => sum + (phaseNumber(row, field) ?? 0), 0) / total * 100 : 0;
            const part = `<i title="${label}: ${pct.toFixed(1)}%" style="left:${cursor}%;width:${pct}%;background:${color}"></i>`;
            cursor += pct;
            return part;
          }).join("");
          return `<div class="stacked-row"><span>${county}</span><div class="stacked-track">${bars}</div><b>${formatMetric(total)} people</b></div>`;
        }).join("") + "<div class='chart-legend'><span><i style='background:#1F4E79'></i>Under 5</span><span><i style='background:#C9772B'></i>Women 15–49</span><span><i style='background:#2E8B7A'></i>65+</span></div>";
        const hazard = document.querySelector("#peopleHazardSelect")?.value || appState.activeHazard;
        const fields = exposureFields(hazard);
        document.querySelector("#peopleExposureChart").innerHTML = rows.slice().sort((a, b) => (phaseNumber(b, fields.population) ?? -1) - (phaseNumber(a, fields.population) ?? -1)).map((row) => svgBar(row.SUB_COUNTY, phaseNumber(row, fields.population), Math.max(...rows.map((item) => phaseNumber(item, fields.population) ?? 0), 1), countyColor[row.COUNTY] ?? "#1F4E79", " people", row.SUB_COUNTY === appState.activeSubCounty)).join("");
        const heatFields = [["Vegetation", "EXP_PCT"], ["Rainfall", "EXR_PCT"], ["Soil moisture", "EXS_PCT"], ["Heat", "EXH_PCT"]];
        document.querySelector("#exposureHeatmap").innerHTML = `<div class="matrix-grid matrix-head"><span>Sub-county</span>${heatFields.map(([label]) => `<span>${label}</span>`).join("")}</div>` + rows.map((row) => `<div class="matrix-grid"><span class="matrix-label" data-area-id="${row.SUB_COUNTY}">${row.SUB_COUNTY}</span>${heatFields.map(([, field]) => { const value = phaseNumber(row, field); const level = value === null ? "none" : value > 75 ? "very-high" : value > 50 ? "high" : value > 25 ? "moderate" : "low"; return `<span class="matrix-cell ${level}" title="${row.SUB_COUNTY}: ${value === null ? "No data" : value.toFixed(1) + "%"}">${value === null ? "—" : value.toFixed(0) + "%"}</span>`; }).join("")}</div>`).join("");
        document.querySelector("#vulnerableRanking").innerHTML = rows.slice().sort((a, b) => {
          const vulnerable = (row) => ["U5_EXP", "WRA_EXP", "OLD_EXP"].reduce((sum, field) => sum + (phaseNumber(row, field) ?? 0), 0);
          return vulnerable(b) - vulnerable(a);
        }).map((row) => svgBar(row.SUB_COUNTY, ["U5_EXP", "WRA_EXP", "OLD_EXP"].reduce((sum, field) => sum + (phaseNumber(row, field) ?? 0), 0), Math.max(...rows.map((item) => ["U5_EXP", "WRA_EXP", "OLD_EXP"].reduce((sum, field) => sum + (phaseNumber(item, field) ?? 0), 0)), 1), countyColor[row.COUNTY] ?? "#1F4E79", " people", row.SUB_COUNTY === appState.activeSubCounty)).join("");
        const selected = rows.find((row) => row.SUB_COUNTY === appState.activeSubCounty) ?? rows[0];
        document.querySelector("#peopleProfile").innerHTML = selected ? `<b>${selected.SUB_COUNTY}, ${selected.COUNTY}</b><br>Population: ${formatMetric(phaseNumber(selected, "POP_T26"))} people<br>Under 5: ${formatMetric(phaseNumber(selected, "POP_U526"))}<br>Women 15–49: ${formatMetric(phaseNumber(selected, "POP_WRA26"))}<br>65+: ${formatMetric(phaseNumber(selected, "POP_6526"))}` : "No data";
      }

      function renderRiskPage(rows) {
        const weights = {
          hazard: Number(document.querySelector("#weightHazard")?.value || 0.5),
          exposure: Number(document.querySelector("#weightExposure")?.value || 0.35),
          vulnerability: Number(document.querySelector("#weightVulnerability")?.value || 0.15)
        };
        const total = weights.hazard + weights.exposure + weights.vulnerability || 1;
        Object.keys(weights).forEach((key) => { weights[key] /= total; });
        const scored = rows.map((row) => ({ row, result: calculateCdrs({ ...calculateDerived(row), DPI: calculateRowDpi(row) }, rows, weights, exposureFields(appState.activeHazard).rate) })).sort((a, b) => (b.result.score ?? -1) - (a.result.score ?? -1));
        document.querySelector("#riskRanking").innerHTML = scored.map(({ row, result }) => `<div class="score-row ${row.SUB_COUNTY === appState.activeSubCounty ? "is-selected" : ""}" data-area-id="${row.SUB_COUNTY}"><span>${row.SUB_COUNTY}</span><div class="score-stack"><i style="width:${(result.hazard ?? 0)}%;background:#7F1D1D"></i><i style="width:${(result.exposure ?? 0) * 100}%;background:#D9532F"></i><i style="width:${(result.vulnerability ?? 0) * 100}%;background:#F6A94B"></i></div><b>${result.score === null ? "No data" : result.score.toFixed(1)}</b><small>${result.className ?? "Unavailable"}</small></div>`).join("");
        const maxHazard = Math.max(...scored.map((item) => item.result.hazard ?? 0), 1);
        document.querySelector("#riskBubble").innerHTML = `<div class="bubble-area"><span class="bubble-axis-x">Drought pressure (DPI)</span>${scored.map(({ row, result }) => { const x = 5 + (result.hazard ?? 0) / maxHazard * 88; const y = 90 - (result.exposure ?? 0) * 75; return `<button class="bubble" data-area-id="${row.SUB_COUNTY}" style="left:${x}%;top:${y}%;background:${countyColor[row.COUNTY] ?? "#1F4E79"}" title="${row.SUB_COUNTY}: DPI ${(result.hazard ?? 0).toFixed(1)}, exposure ${((result.exposure ?? 0) * 100).toFixed(1)}%">${row.SUB_COUNTY.slice(0, 3)}</button>`; }).join("")}</div>`;
        const selected = scored.find((item) => item.row.SUB_COUNTY === appState.activeSubCounty) ?? scored[0];
        document.querySelector("#scoreExplanation").innerHTML = selected ? `<b>${selected.row.SUB_COUNTY}</b> · ${selected.result.className ?? "Unavailable"}<div class="contribution"><span>Hazard</span><i style="width:${selected.result.hazard ?? 0}%"></i><b>${formatMetric(selected.result.hazard, 1)}</b></div><div class="contribution"><span>Exposure</span><i style="width:${(selected.result.exposure ?? 0) * 100}%"></i><b>${formatMetric((selected.result.exposure ?? 0) * 100, 1)}%</b></div><div class="contribution"><span>Vulnerability</span><i style="width:${(selected.result.vulnerability ?? 0) * 100}%"></i><b>${formatMetric((selected.result.vulnerability ?? 0) * 100, 1)}%</b></div>` : "No score data";
        ["Hazard", "Exposure", "Vulnerability"].forEach((label) => { const key = label.toLowerCase(); const output = document.querySelector(`#weight${label}Value`); if (output) output.value = weights[key].toFixed(2); });
      }

      function renderEarlySignalPage() {
        const alertBoard = document.querySelector("#alertBoard");
        if (!appState.panelRows.length) {
          alertBoard.innerHTML = '<div class="empty-state"><b>Monthly panel unavailable</b><br>No monthly observations supplied. Nulls remain gaps; no zeros are imputed.</div>';
          document.querySelector("#signalTrend").innerHTML = '<div class="empty-state">No monthly observations supplied.</div>';
          document.querySelector("#signalTimeline").innerHTML = '<div class="empty-state">Trigger dates require monthly panel observations.</div>';
          return;
        }
        const { grouped, monthThresholds } = buildSignalSeries(appState.panelRows);
        const areaRows = appState.dataRows.filter((row) =>
          (!appState.activeCounty || row.COUNTY === appState.activeCounty) &&
          (!appState.activeSubCounty || row.SUB_COUNTY === appState.activeSubCounty)
        );
        const cards = areaRows.map((area) => {
          const series = grouped.get(area.ADM2_ID) ?? [];
          const latestIndex = series.length - 1;
          const result = latestIndex >= 0 ? signalForSeries(series, latestIndex) : { watch: false, warning: false, alert: false, triggers: [] };
          return { area, series, result, latest: series[latestIndex] };
        }).sort((a, b) => {
          const level = (result) => result.alert ? 3 : result.warning ? 2 : result.watch ? 1 : 0;
          return level(b.result) - level(a.result) || (b.latest?.OBS_DATE ?? "").localeCompare(a.latest?.OBS_DATE ?? "");
        });
        const latestDate = cards.find((card) => card.latest)?.latest?.OBS_DATE ?? "";
        alertBoard.innerHTML = `<div class="signal-summary"><b>${latestDate ? `Latest panel: ${formatDate(latestDate)}` : "Latest panel unavailable"}</b><span>${cards.filter((card) => card.result.alert).length} alert · ${cards.filter((card) => card.result.warning && !card.result.alert).length} warning · ${cards.filter((card) => card.result.watch && !card.result.warning).length} watch</span></div>` +
          cards.map(({ area, result, latest }) => `<button class="alert-card ${signalLevel(result).toLowerCase()}" data-area-id="${area.SUB_COUNTY}" title="Open ${area.SUB_COUNTY} trend"><span><b>${area.SUB_COUNTY}</b><small>${area.COUNTY} · ${latest?.OBS_DATE ?? "No date"}</small></span><strong>${signalLevel(result)}</strong><em>${result.triggers.length ? result.triggers.join(" · ") : "No active trigger"}</em></button>`).join("");
        const selected = cards.find((card) => card.area.SUB_COUNTY === appState.activeSubCounty) ?? cards[0];
        renderSignalTrend(selected?.series, selected ? `${selected.area.SUB_COUNTY}, ${selected.area.COUNTY}` : "No area selected", monthThresholds);
        const timeline = selected?.series?.slice(-12).flatMap((point, index) => {
          const result = signalForSeries(selected.series, selected.series.indexOf(point));
          return result.triggers.length ? [{ date: point.OBS_DATE, level: signalLevel(result), triggers: result.triggers }] : [];
        }) ?? [];
        document.querySelector("#signalTimeline").innerHTML = timeline.length
          ? `<div class="timeline-meta">Selected area: <b>${selected.area.SUB_COUNTY}</b> · showing trigger observations from the latest 12 months</div>${timeline.reverse().map((item) => `<div class="timeline-item"><time>${formatDate(item.date)}</time><span class="timeline-dot ${item.level.toLowerCase()}"></span><div><b>${item.level}</b><p>${item.triggers.join(" · ")}</p></div></div>`).join("")}`
          : '<div class="empty-state">No trigger fired for the latest 12 months in the selected area.</div>';
      }

      function renderMethodPage(rows) {
        const first = rows[0] ?? {};
        document.querySelector("#sourceTable").innerHTML = `<table class="compact-table"><tr><th>Source</th><th>Latest date</th><th>Baseline</th></tr><tr><td>CHIRPS rainfall</td><td>${first.OD_CHIRPS ?? "Unavailable"}</td><td>2001–2025</td></tr><tr><td>ERA5-Land</td><td>${first.OD_ERA5 ?? "Unavailable"}</td><td>2001–2025</td></tr><tr><td>MODIS vegetation</td><td>${first.OD_MVEG ?? "Unavailable"}</td><td>2001–2025</td></tr><tr><td>SMAP soil moisture</td><td>${first.OD_SMAP ?? "Unavailable"}</td><td>2016–2025</td></tr><tr><td>WorldPop</td><td>2026 vintage</td><td>Modelled Admin-2</td></tr></table>`;
        document.querySelector("#qualityTable").innerHTML = `<table class="compact-table"><tr><th>Flag</th><th>Areas</th></tr><tr><td>OK</td><td>${rows.filter((row) => row.QUAL_FLAG === "OK").length}</td></tr><tr><td>LOW</td><td>${rows.filter((row) => row.QUAL_FLAG === "LOW").length}</td></tr><tr><td>Mean valid observations</td><td>${formatMetric(rows.reduce((sum, row) => sum + (phaseNumber(row, "VALID_PCT") ?? 0), 0) / Math.max(rows.length, 1), 1)}%</td></tr><tr><td>Unavailable</td><td>LST_NIGHT · LSTN_ANOM · FACC_MAX</td></tr></table>`;
      }

      function renderPhasePages() {
        const rows = appState.dataRows.filter((row) => (!appState.activeCounty || row.COUNTY === appState.activeCounty) && (!appState.activeSubCounty || row.SUB_COUNTY === appState.activeSubCounty));
        renderHazardsPage(rows);
        renderPeoplePage(rows);
        renderRiskPage(rows);
        renderEarlySignalPage();
        renderMethodPage(rows);
      }

      async function selectDashboardScope(county = "", subCounty = "") {
        appState.activeCounty = county;
        appState.activeSubCounty = subCounty;
        countySelect.value = county;
        dashboardCountySelect.value = county;
        await updateSubCounties();
        subCountySelect.value = subCounty;
        if (globalSubCountySelect) globalSubCountySelect.value = subCounty;
        syncFilterHash();
        renderDashboard();
        await applySelection();
      }

      function escapeSql(value) {
        return value.replaceAll("'", "''");
      }

      function selectionWhere() {
        if (appState.activeSubCounty) {
          return `SUB_COUNTY = '${escapeSql(appState.activeSubCounty)}'`;
        }
        if (appState.activeCounty) {
          return `COUNTY = '${escapeSql(appState.activeCounty)}'`;
        }
        return "1=1";
      }

      function applyIndicatorRenderer(indicatorId = appState.activeIndicator) {
        const config = INDICATORS[indicatorId];
        if (!config) {
          throw new Error(`Unknown indicator configuration: ${indicatorId}`);
        }

        const values = appState.dataRows
          .map((row) => Number(row[config.field]))
          .filter((value) => Number.isFinite(value))
          .sort((a, b) => a - b);
        const relativeBreaks = values.length
          ? Array.from({ length: Math.min(5, values.length) }, (_, index) => {
              const minIndex = Math.floor(index * values.length / Math.min(5, values.length));
              const maxIndex = Math.min(values.length - 1, Math.floor((index + 1) * values.length / Math.min(5, values.length)) - 1);
              return {
                min: index === 0 ? -Infinity : values[minIndex],
                max: index === Math.min(5, values.length) - 1 ? Infinity : values[maxIndex],
                label: `Relative class ${index + 1} (${values[minIndex].toFixed(2)}-${values[maxIndex].toFixed(2)})`
              };
            })
          : [];
        const breaks = appState.classificationMode === "relative"
          ? relativeBreaks
          : config.breaks.length
            ? config.breaks
            : relativeBreaks;
        const colors = config.direction === "diverging"
          ? ["#8c510a", "#d8b365", "#f5f5f5", "#5ab4ac", "#01665e"]
          : config.colors;
        const renderer = new ClassBreaksRenderer({
          field: config.field,
          defaultLabel: "No data",
          defaultSymbol: new SimpleFillSymbol({
            color: [230, 230, 230, 0.7],
            outline: { color: [80, 80, 80, 0.8], width: 0.7 }
          }),
          classBreakInfos: breaks.map((breakInfo, index) => ({
            minValue: breakInfo.min,
            maxValue: breakInfo.max,
            label: breakInfo.label,
            symbol: new SimpleFillSymbol({
              color: colors[index % colors.length],
              outline: { color: [90, 90, 90, 0.8], width: 0.7 }
            })
          }))
        });
        masterLayer.renderer = renderer;
        masterLayer.title = `${config.label} | ${config.unit}`;
        legend.layerInfos = [{ layer: masterLayer, title: `${config.label} | ${appState.classificationMode === "standard" ? "Standard" : "Relative"}` }];
        indicatorLegend.innerHTML = `<strong>${config.label}</strong> | ${config.unit} | ${config.source} | Classification: ${appState.classificationMode === "standard" ? "Standard" : "Relative"}${config.caveat ? ` | ${config.caveat}` : ""}<br>${breaks
          .map((breakInfo, index) => `<span style="color:${colors[index % colors.length]}">${breakInfo.label}</span>`)
          .join(" | ")}`;
      }

      async function applySmartMappingRenderer(indicatorId = appState.activeIndicator) {
        const config = INDICATORS[indicatorId];
        if (!config) {
          throw new Error(`Unknown indicator configuration: ${indicatorId}`);
        }
        if (appState.classificationMode === "relative" || !config.breaks.length) {
          applyIndicatorRenderer(indicatorId);
          return;
        }
        applyIndicatorRenderer(indicatorId);
      }

      const popupQualityExpression = {
        name: "climate-pulse-quality-warning",
        title: "Quality and interpretation",
        expression: `var message = "";
          if (!IsEmpty($feature.LST_VAL) && $feature.LST_VAL < 30) {
            message += "<b>CAUTION: High Cloud Interference detected during satellite overpass</b><br>Only " + Text($feature.LST_VAL, "0.##") + "% valid observations. Temperature metrics may be skewed.<br><br>";
          }
          if (!IsEmpty($feature.NDVI_VAL) && $feature.NDVI_VAL < 30) {
            message += "<b>CAUTION: Low vegetation observation validity</b><br>Only " + Text($feature.NDVI_VAL, "0.##") + "% valid vegetation observations. Vegetation metrics may be less reliable.<br><br>";
          }
          if (!IsEmpty($feature.VHI_NOW) && $feature.VHI_NOW < 35) {
            message += "<b>Active Vegetation Health Warning Area</b><br>VHI_NOW is below the critical threshold of 35.<br><br>";
          }
          if (message == "") {
            message = "No configured quality warnings for this polygon.";
          }
          return message;`
      };

      masterLayer.popupTemplate = {
        title: "{SUB_COUNTY} Sub-County ({COUNTY} County)",
        expressionInfos: [popupQualityExpression],
        content: [
          {
            type: "text",
            text: "<b>Indicator metrics</b><br>{expression/climate-pulse-quality-warning}"
          },
          {
            type: "fields",
            fieldInfos: [
              { fieldName: "ADM2_ID", label: "Admin-2 ID" },
              { fieldName: "ADM2_AREA", label: "Admin-2 area (km2)", format: { places: 2, digitSeparator: true } },
              { fieldName: "VHI_NOW", label: "Vegetation Health Index", format: { places: 2, digitSeparator: true } },
              { fieldName: "RAIN_PCT", label: "Rainfall percentile (%)", format: { places: 2, digitSeparator: true } },
              { fieldName: "LST_ANOM", label: "Land surface temperature anomaly (C)", format: { places: 2, digitSeparator: true } },
              { fieldName: "SMI_NOW", label: "Soil moisture index", format: { places: 2, digitSeparator: true } },
              { fieldName: "POP_D2626", label: "Population density (people/km2)", format: { places: 2, digitSeparator: true } },
              { fieldName: "CM585_TAS", label: "SSP5-8.5 warming (C)", format: { places: 2, digitSeparator: true } }
            ],
            description: "Published Climate Pulse Admin-2 measurements. Missing values are unavailable data, not zero."
          }
        ]
      };

      async function updateSubCounties() {
        if (!appState.activeCounty) {
          subCountySelect.disabled = true;
          subCountySelect.innerHTML =
            '<calcite-option value="">All sub-counties</calcite-option>';
          if (globalSubCountySelect) {
            globalSubCountySelect.disabled = true;
            globalSubCountySelect.innerHTML =
              '<calcite-option value="">All sub-counties</calcite-option>';
          }
          return;
        }

        const result = await masterLayer.queryFeatures({
          where: `COUNTY = '${escapeSql(appState.activeCounty)}'`,
          outFields: ["SUB_COUNTY"],
          returnGeometry: false
        });
        const names = [
          ...new Set(
            result.features.map((feature) => feature.attributes.SUB_COUNTY)
          )
        ].sort();

        subCountySelect.disabled = false;
        subCountySelect.innerHTML = `<calcite-option value="">All sub-counties</calcite-option>${names
          .map((name) => `<calcite-option value="${name}">${name}</calcite-option>`)
          .join("")}`;
        if (globalSubCountySelect) {
          globalSubCountySelect.disabled = false;
          globalSubCountySelect.innerHTML = `<calcite-option value="">All sub-counties</calcite-option>${names
            .map((name) => `<calcite-option value="${name}">${name}</calcite-option>`)
            .join("")}`;
        }
      }

      async function applySelection() {
        const where = selectionWhere();
        const result = await masterLayer.queryFeatures({
          where,
          outFields: ["ADM2_ID"],
          returnGeometry: true
        });

        if (!result.features.length) {
          return;
        }

        await view.goTo(
          result.features.length === 1
            ? result.features[0].geometry
            : result.features
        );

        const layerView = await view.whenLayerView(masterLayer);
        layerView.featureEffect = appState.activeCounty
          ? new FeatureEffect({
              filter: { where },
              includedEffect: appState.activeSubCounty
                ? "brightness(1.12) saturate(1.35) opacity(100%)"
                : "brightness(1.05) saturate(1.2) opacity(100%)",
              excludedEffect: "opacity(18%) grayscale(55%)"
            })
          : null;
        await applySmartMappingRenderer(appState.activeIndicator);
      }

      function showPage(pageId, actionId) {
        pages.forEach((page) => {
          page.classList.toggle("hidden-page", page.id !== pageId);
        });
        const page = document.querySelector(`#${pageId}`);
        if (page && pageId !== "dashboardPage" && pageId !== "mapPage" && !page.querySelector(".shared-filter-bar")) {
          page.insertAdjacentHTML("afterbegin", `<div class="shared-filter-bar" aria-label="Global filters"><calcite-label>County<calcite-select data-filter-key="county" scale="s"><calcite-option value="">All pilot counties</calcite-option><calcite-option value="Garissa">Garissa</calcite-option><calcite-option value="Marsabit">Marsabit</calcite-option><calcite-option value="Turkana">Turkana</calcite-option></calcite-select></calcite-label><calcite-label>Hazard<calcite-select data-filter-key="hazard" scale="s"><calcite-option value="vegetation">Vegetation</calcite-option><calcite-option value="rainfall">Rainfall</calcite-option><calcite-option value="soilMoisture">Soil moisture</calcite-option><calcite-option value="heat">Heat</calcite-option></calcite-select></calcite-label><calcite-label>Population group<calcite-select data-filter-key="group" scale="s"><calcite-option value="all">All</calcite-option><calcite-option value="under5">Under 5</calcite-option><calcite-option value="women1549">Women 15–49</calcite-option><calcite-option value="65plus">65+</calcite-option><calcite-option value="under18">Under 18</calcite-option></calcite-select></calcite-label><calcite-chip data-filter-reset scale="s">Reset</calcite-chip></div>`);
          syncSharedFilterControls(page);
        }
        pageActions.forEach(([id]) => {
          const action = document.querySelector(`#${id}`);
          action.active = id === actionId;
          if (id === actionId) {
            action.setAttribute("active", "");
          } else {
            action.removeAttribute("active");
          }
        });
      }

      function syncSharedFilterControls(page = document) {
        page.querySelectorAll("[data-filter-key]").forEach((control) => {
          const key = control.dataset.filterKey;
          control.value = key === "county" ? appState.activeCounty : key === "hazard" ? appState.activeHazard : appState.activePopulationGroup;
        });
      }

      pageActions.forEach(([actionId, pageId]) => {
        document
          .querySelector(`#${actionId}`)
          .addEventListener("click", () => showPage(pageId, actionId));
      });

      countySelect.addEventListener("calciteSelectChange", async (event) => {
        appState.activeCounty = event.target.value;
        appState.activeSubCounty = "";
        dashboardCountySelect.value = appState.activeCounty;
        if (globalSubCountySelect) globalSubCountySelect.value = "";
        syncFilterHash();
        renderDashboard();
        await updateSubCounties();
        await applySelection();
      });

      subCountySelect.addEventListener(
        "calciteSelectChange",
        async (event) => {
          appState.activeSubCounty = event.target.value;
          if (globalSubCountySelect) globalSubCountySelect.value = appState.activeSubCounty;
          syncFilterHash();
          await applySelection();
        }
      );

      indicatorSelect.addEventListener("calciteSelectChange", (event) => {
        appState.activeIndicator = event.target.value;
        applySmartMappingRenderer(appState.activeIndicator);
      });

      classificationMode.addEventListener("calciteSegmentedControlChange", (event) => {
        appState.classificationMode = event.target.value;
        applySmartMappingRenderer(appState.activeIndicator);
      });

      dashboardCountySelect.addEventListener("calciteSelectChange", async (event) => {
        await selectDashboardScope(event.target.value);
        syncFilterHash();
      });

      globalSubCountySelect?.addEventListener("calciteSelectChange", async (event) => {
        appState.activeSubCounty = event.target.value;
        subCountySelect.value = appState.activeSubCounty;
        syncFilterHash();
        renderDashboard();
        await applySelection();
      });

      hazardSelect?.addEventListener("calciteSelectChange", (event) => {
        appState.activeHazard = event.target.value;
        syncFilterHash();
        renderDashboard();
      });

      populationGroupSelect?.addEventListener("calciteSelectChange", (event) => {
        appState.activePopulationGroup = event.target.value;
        syncFilterHash();
      });

      resetGlobalFilters?.addEventListener("click", async () => {
        await selectDashboardScope();
        appState.activeHazard = "vegetation";
        appState.activePopulationGroup = "all";
        hazardSelect.value = appState.activeHazard;
        populationGroupSelect.value = appState.activePopulationGroup;
        syncFilterHash();
      });

      rankingMetricSelect.addEventListener("calciteSelectChange", () => renderDashboard());
      scatterMetricSelect.addEventListener("calciteSelectChange", () => renderDashboard());
      resetDashboardButton.addEventListener("click", async () => selectDashboardScope());

      document.querySelector("#dashboardPage").addEventListener("click", async (event) => {
        const chartTarget = event.target.closest("[data-area-id]");
        if (chartTarget) {
          const areaId = chartTarget.dataset.areaId;
          const area = appState.dataRows.find((row) => row.SUB_COUNTY === areaId);
          await selectDashboardScope(area?.COUNTY ?? areaId, area?.SUB_COUNTY ?? "");
          return;
        }
        if (event.target.closest("#returnToCountyButton")) {
          const row = appState.dataRows.find((item) => item.SUB_COUNTY === appState.activeSubCounty);
          await selectDashboardScope(row?.COUNTY ?? appState.activeCounty);
        }
        if (event.target.closest("#returnToAllButton")) {
          await selectDashboardScope();
        }
      });

      document.querySelector("#contentArea").addEventListener("click", async (event) => {
        const reset = event.target.closest("[data-filter-reset]");
        if (reset) {
          await selectDashboardScope();
          appState.activeHazard = "vegetation";
          appState.activePopulationGroup = "all";
          hazardSelect.value = "vegetation";
          populationGroupSelect.value = "all";
          syncFilterHash();
          renderDashboard();
          return;
        }
        const chartTarget = event.target.closest("[data-area-id]");
        if (!chartTarget || chartTarget.closest("#dashboardPage")) return;
        const area = appState.dataRows.find((row) => row.SUB_COUNTY === chartTarget.dataset.areaId);
        if (area) {
          await selectDashboardScope(area.COUNTY, area.SUB_COUNTY);
          renderPhasePages();
        }
      });

      document.querySelector("#contentArea").addEventListener("calciteSelectChange", async (event) => {
        const key = event.target.dataset?.filterKey;
        if (!key) return;
        if (key === "county") {
          await selectDashboardScope(event.target.value);
        } else if (key === "hazard") {
          appState.activeHazard = event.target.value;
        } else if (key === "group") {
          appState.activePopulationGroup = event.target.value;
        }
        syncFilterHash();
        syncSharedFilterControls();
        renderDashboard();
      });

      document.querySelector("#peopleHazardSelect")?.addEventListener("calciteSelectChange", (event) => {
        appState.activeHazard = event.target.value;
        hazardSelect.value = appState.activeHazard;
        syncFilterHash();
        renderDashboard();
      });

      ["Hazard", "Exposure", "Vulnerability"].forEach((label) => {
        document.querySelector(`#weight${label}`)?.addEventListener("input", () => renderPhasePages());
      });

      document.querySelector("#downloadCsv")?.addEventListener("click", () => {
        const rows = appState.dataRows.filter((row) => !appState.activeCounty || row.COUNTY === appState.activeCounty);
        const fields = ["ADM2_ID", "COUNTY", "SUB_COUNTY", "POP_T26", "POP_EXP", "EXR_POP", "EXS_POP", "EXH_POP", "EXP_PCT", "EXR_PCT", "EXS_PCT", "EXH_PCT", "QUAL_FLAG"];
        const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => JSON.stringify(row[field] ?? "")).join(","))].join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        link.download = "climate-pulse-filtered.csv";
        link.click();
        URL.revokeObjectURL(link.href);
      });

      document.querySelector("#downloadPng")?.addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1400;
        canvas.height = 800;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#202020";
        context.font = "28px Segoe UI";
        context.fillText(document.querySelector(".analytical-page h1")?.textContent ?? "Climate Pulse", 40, 60);
        context.font = "16px Segoe UI";
        context.fillText(`Scope: ${appState.activeCounty || "All pilot counties"} · Hazard: ${exposureFields(appState.activeHazard).label}`, 40, 95);
        context.fillText("Use the CSV download for machine-readable filtered values.", 40, 140);
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "climate-pulse-page.png";
        link.click();
      });

      view.on("click", async (event) => {
        try {
          const result = await masterLayer.queryFeatures({
            geometry: event.mapPoint,
            spatialRelationship: "intersects",
            returnGeometry: true,
            outFields: ["*"]
          });
          const feature = result.features[0];
          if (!feature) {
            view.popup.close();
            return;
          }
          feature.popupTemplate = masterLayer.popupTemplate;

          const geometry = feature.geometry;
          const area = geometryEngine.geodesicArea(geometry, "square-kilometers");
          const centroid = geometry.centroid;
          const distance = centroid
            ? geometryEngine.distance(event.mapPoint, centroid, "kilometers")
            : null;
          const inside = geometryEngine.contains(geometry, event.mapPoint);
          spatialReadout.textContent = `${feature.attributes.SUB_COUNTY}, ${feature.attributes.COUNTY}: ${area.toLocaleString(undefined, { maximumFractionDigits: 1 })} km2 geodesic area | ${distance?.toFixed(1) ?? "-"} km from centroid | click inside polygon: ${inside ? "yes" : "no"}`;
          appState.activeCounty = feature.attributes.COUNTY;
          appState.activeSubCounty = feature.attributes.SUB_COUNTY;
          syncFilterHash();
          countySelect.value = appState.activeCounty;
          dashboardCountySelect.value = appState.activeCounty;
          await updateSubCounties();
          subCountySelect.value = appState.activeSubCounty;
          if (globalSubCountySelect) globalSubCountySelect.value = appState.activeSubCounty;
          renderDashboard();
          await applySelection();
          view.popup.open({
            features: [feature],
            location: event.mapPoint
          });
        } catch (error) {
          console.error("Could not query the Admin-2 feature at the clicked location.", error);
          view.popup.close();
        }
      });

      reactiveUtils.watch(
        () => view.updating,
        (updating) => {
          if (!updating) {
            return;
          }
        }
      );

      Promise.all([
        view.when(),
        masterLayer.when(),
        countyOutlineLayer.when(),
        fetch(DATA_URL).then((response) => {
          if (!response.ok) throw new Error(`Dataset request failed (${response.status})`);
          return response.json();
        }),
        fetch(PANEL_DATA_URL).then((response) => {
          if (!response.ok) throw new Error(`Early-signal panel request failed (${response.status})`);
          return response.text();
        })
      ])
        .then(async ([, , , dataset, panelText]) => {
          if (!Array.isArray(dataset.rows) || dataset.rows.length !== 16) {
            throw new Error("Climate Pulse dataset must contain exactly 16 Admin-2 rows.");
          }
          appState.dataRows = dataset.rows.map((row) => {
            const copy = { ...row };
            UNAVAILABLE_FIELDS.forEach((field) => { copy[field] = null; });
            return copy;
          });
          appState.panelRows = parsePanelCsv(panelText);
          if (appState.panelRows.length < 16 || !appState.panelRows.every((row) => row.ADM2_ID && row.OBS_DATE)) {
            throw new Error("Early-signal panel must contain valid Admin-2 IDs and observation dates.");
          }
          updateDataDateChip();
          populateIndicatorOptions();
          renderDashboard();
          await applySmartMappingRenderer(appState.activeIndicator);
          showPage("mapPage", "navMap");
        })
        .catch((error) => {
          console.error("Climate Pulse layer initialization failed.", error);
        });
