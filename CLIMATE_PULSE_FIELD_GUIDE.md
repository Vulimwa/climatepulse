# Climate Pulse Kenya Admin-2 (Turkana, Marsabit, Garissa) - Field Guide

## 1. What this dataset is

- **One row per sub-county (Admin-2):** 16 rows - Garissa (6), Marsabit (4), Turkana (6). Boundaries: FAO GAUL 2025 level 2, WGS 84 (EPSG:4326).
- **One column per indicator, 225 data columns** (the `FID` column in the .xls is just a row counter added by the GIS export; it is not part of the dataset).
- **Every number is a single value per sub-county** (a "zonal statistic"): the satellite/climate raster is summarised over the polygon with Google Earth Engine, so one sub-county = one number per indicator.
- **Join key:** `ADM2_ID` (`KEN_` + GAUL level-2 code). Use it to join the monthly panel CSV (`ADM2_ID` + `OBS_DATE`) or any other table.
- **Built on:** 2 November 2026 (`RUN_DATE`), pipeline version `1.0.0-py`. All data are public Google Earth Engine collections; nothing was typed in by hand and no missing value was replaced by an estimate.

| ADM2_ID | County | Sub-county | Area km² |
|---|---|---|---|
| KEN_103563 | Garissa | Balambala | 4,861 |
| KEN_103564 | Garissa | Dadaab | 6,982 |
| KEN_103565 | Garissa | Dujis | 571 |
| KEN_103566 | Garissa | Fafi | 16,673 |
| KEN_103567 | Garissa | Ijara | 8,257 |
| KEN_103568 | Garissa | Lagdera | 6,484 |
| KEN_103678 | Marsabit | Laisamis | 24,187 |
| KEN_103679 | Marsabit | Moyale | 9,423 |
| KEN_103680 | Marsabit | North Horr | 40,800 |
| KEN_103681 | Marsabit | Saku | 2,056 |
| KEN_103791 | Turkana | Loima | 9,810 |
| KEN_103792 | Turkana | Turkana Central | 6,646 |
| KEN_103793 | Turkana | Turkana East | 11,235 |
| KEN_103794 | Turkana | Turkana North | 12,301 |
| KEN_103795 | Turkana | Turkana South | 7,453 |
| KEN_103796 | Turkana | Turkana West | 13,206 |

## 2. How to read a column name

| Pattern | Meaning |
|---|---|
| `..._NOW` | Value for the **latest available window** at run time (date given in the matching `OD_*` field) |
| `..._ANOM` | **Anomaly** = current value minus the average of the same period over the baseline years (positive = above normal) |
| `..._PCT` | A percentage (share of area, share of population, or % change) |
| `..._TRND` | **Trend**: Theil-Sen slope per year over 2001-2025 (robust to outliers) |
| `..._VAL` / `..._VALID` | Share of the polygon with **valid** (cloud-free, good-QA) data - a data-quality measure, not a climate variable |
| `..._MEAN`, `_MED`, `_MIN`, `_MAX` | Mean / median / min / max over the polygon |
| `..._SD`, `_ASD` | Year-to-year standard deviation |
| `OD_*` | **Observation date**: latest date of that dataset used in this run |
| `CM245_*`, `CM585_*` | Climate-model change under scenario SSP2-4.5 / SSP5-8.5 |
| `POP_*25`, `POP_*26` | WorldPop modelled estimates for 2025 / 2026 |
| `EXP_`, `EXR_`, `EXS_`, `EXH_` | Population **exposed** to vegetation stress / rainfall deficit / soil-moisture stress / heat spell |

## 3. How the numbers were obtained

**Method in one paragraph.** For each dataset, Google Earth Engine builds a raster for the indicator (for example "mean annual rainfall 2001-2025"), then `reduceRegions` summarises that raster inside each sub-county polygon (mean for most indicators, sum for population and areas, median/max where stated). Rasters are sampled at their own native resolution (or the coarser value shown below when a 100 m sampling grid was used to keep the job small). A "baseline" is a long-term reference period; a "current" value is the latest data available on the run date.

**Reference periods and current windows**

| Dataset | Baseline / reference | Current window used (from the `OD_*` / `CUR_*` fields in your file) |
|---|---|---|
| CHIRPS rainfall | 2001-2025 | last complete month **2026-09** (latest image 2026-09-30); year-to-date from 1 Jan 2026 |
| ERA5-Land | 2001-2025 | last complete month **2026-09** (latest date 2026-10-24); year-to-date |
| MODIS NDVI/EVI (MOD13Q1) | 2001-2025 | latest 17-day window ending 2026-09-30 |
| MODIS LST (MOD11A2) | 2001-2025 | latest 25-day window ending 2026-10-16 |
| VHI | same-window min/max 2001-2025 | common window ending 2026-09-30 |
| SMAP L4 soil moisture | **2016-2025** (only 10 years - record starts 2015) | last complete month **2026-10** (latest 2026-10-31) |
| JRC surface water | 1984-2021 (historical, not current) | - |
| SRTM / MERIT Hydro | static (year 2000 / compilation) | - |
| Dynamic World | change vs window 5 years earlier | 365 days ending 2026-11-02 |
| ESA WorldCover | single epoch 2021 | - |
| WorldPop | modelled vintages 25,26 (2025 and 2026) | exposure uses the 2026 vintage |
| Sentinel-2 | 2019 to last year for water-area change | 60 days ending 2026-11-02 |
| GPM IMERG | - | last complete month at 2026-11-01 (October 2026) |
| CMIP6 (8 models) | historical 1995-2014 | future 2041-2060, scenarios SSP2-4.5 and SSP5-8.5 |

**Thresholds used (fixed in the script, shown so you can reproduce them)**

| Setting | Value | Used by |
|---|---|---|
| Severe vegetation stress | VCI < 35 | `VEG_ST_PCT`, `VEG_ST_DUR`, `POP_EXP`... |
| Severe VHI stress | VHI < 35 | `VHI_ST_PCT` |
| VHI weighting alpha | 0.5 (VHI = 0.5·VCI + 0.5·TCI) | `VHI_NOW` |
| Severe rainfall deficit | SPI-3 ≤ -1.5 | `SPI3_PCT`, `EXR_*` |
| Severe soil-moisture stress | SMI ≤ 0.10 | `EXS_*` |
| Hot day | Tmax above that pixel's own 90th percentile (2001-2025) | `HOT_DAYS`, `HOT_PCT` |
| Heat spell | ≥ 3 consecutive hot days | `HEAT_DAYS`, `EXH_*` |
| Wet day | ≥ 1 mm | `CDD_MAX`, `CWD_MAX` |
| Heavy IMERG day | ≥ 20 mm | `IMG_HVY` |
| Persistent water | JRC occurrence ≥ 75 % | `W_AREA` |
| Sentinel-2 water rule | MNDWI > 0.1 and NDVI < 0.35 (uncalibrated) | `S2_W_AREA` |
| Under-18 estimate | age classes 0, 1, 5, 10 + 60 % of the 15-19 class | `POP_U18*`, `U18_EXP`... |
| Quality flag | `OK` if VALID_PCT ≥ 70, `LOW` if < 70, `NA` if no metric | `QUAL_FLAG` |

**Sampling resolution (metres) used when summarising rasters:** CHIRPS 5,566 · ERA5-Land 11,132 · MODIS NDVI 250 · MODIS LST 1,000 · SMAP 11,000 · JRC / SRTM / MERIT / WorldCover 100 · Dynamic World 100 · Sentinel-2 100 · WorldPop 100 · IMERG 11,132 · CMIP6 27,830.

## 4. Data-quality notes you should read before using the numbers

**A. Three columns are empty, not zero: `LST_NIGHT`, `LSTN_ANOM`, `FACC_MAX`.** All 16 rows show 0 in the .xls, but a shapefile/.xls cannot store a blank in a numeric field and shows it as 0. These three produced no value in the Earth Engine stage tables (they were reported as "registered but absent"). `LSTN_NOW` (night LST now) is fine and populated, which proves night data exist, so do not read 0 °C as a real baseline. For `FACC_MAX` a probable cause is that a single-band `reduceRegions` returns the property under the reducer name (`max`) rather than the band name; the cause for the two night-LST fields has not been confirmed. Treat all three as **missing** until fixed.

**B. Zeros elsewhere are real but ambiguous.** Other 0 values (e.g. `EXR_*` in five sub-counties, `W_AREA` in eleven, `RZ_DEF`, `IMG_HVY`) are plausible true zeros (no severe-deficit pixels, no persistent water, no heavy-rain days). Because a shapefile cannot show a blank, a genuine zero and a missing value look the same here - the GeoPackage / attributes CSV from the rebuild notebook keep real nulls.

**C. `LST_ANOM` is strongly negative in every sub-county (-3.3 to -13.1 °C).** The daytime LST of the latest window (25 days to 16 Oct 2026) is far below its own same-window 2001-2025 mean. `LST_VAL` for that window is as low as 2-25 % in several sub-counties (Dujis 2 %, Lagdera 14 %, Ijara 15 %, Balambala 17 %, Turkana North 22 %, Fafi 24 %), meaning few clear-sky pixels; a window with few clear-sky pixels can bias the average, so this anomaly may be unreliable. Do not interpret it as a real cooling of ~8 °C without checking `LST_VAL`.

**D. `RAIN_PCT` can be huge (up to +1,167 %).** It is (current - baseline) / baseline for the last complete month (September 2026). September is a very dry month in these counties, so a baseline of 0.4-25 mm turns small absolute differences into large percentages. Use `RAIN_ANOM` (mm) or `SPI_01` alongside it. The field is blank where the baseline is under 1 mm.

**E. `VALID_PCT` / `QUAL_FLAG`.** `VALID_PCT` is the mean of four validity shares (`NDVI_VAL`, `LST_VAL`, `SM_VALID`, `S2_VALID`). Because `LST_VAL` is often low, two sub-counties are flagged `LOW`: **Fafi (65.2)** and **Ijara (61.6)**; both also have a low `NDVI_VAL` (39 % / 32 %). `OK` therefore means "enough valid observations", not "good climate".

**F. `SM_VALID` is identical (99.19) everywhere.** It counts observed 3-hourly SMAP steps in the month (about 99 % = a couple of missing steps out of ~248), and the gaps apply to the whole product, so every polygon gets the same value.

**G. Heat-spell exposure is almost universal.** `EXH_PCT` is 94-100 % everywhere probably because a 3-day run above a pixel's own 90th percentile is easy to reach over a full year-to-date. It does not discriminate between sub-counties; use `HOT_DAYS` or `LST_HIGH` for ranking.

**H. Population is modelled, and exposure is not risk.** WorldPop 2025 and 2026 are separate model runs; `POP_GROW` (1.7-2.1 %) is the difference between them, **not measured migration**. `POP_EXP`, `EXR_*`, `EXS_*`, `EXH_*` count people living in pixels that meet the hazard test today; they say nothing about vulnerability or loss.

**I. Mixed time frames.** Climate baselines are 2001-2025, SMAP is 2016-2025, JRC water is 1984-2021, WorldCover is 2021, CMIP6 compares 1995-2014 with 2041-2060 (and is *not* a forecast). Do not compare their anomalies as if they shared a baseline.

**J. Coarse sources over small areas.** ERA5-Land (~11 km), SMAP (~11 km) and CMIP6 (~28 km) are coarser than a sub-county; neighbouring sub-counties can share grid cells and so show near-identical values (visible in `CM245_TAS`, which only ranges 1.11-1.29 °C across all 16 sub-counties).

## 5. Field reference

Value ranges in the last column are the **minimum to maximum across the 16 sub-counties in your file**.

### 5.1 Geography / keys  (`GEOGRAPHY`)

Identifies each row. The geometry itself is the shapefile polygon, not a column.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `ADM2_ID` | Stable Admin-2 id = KEN_ + GAUL level-2 code |  | Stable Admin-2 id = KEN_ + GAUL level-2 code | 16 distinct values |
| `COUNTY` | County (GAUL level-1 name) |  | County (GAUL level-1 name) | 3 distinct values |
| `SUB_COUNTY` | Sub-county (GAUL level-2 name) |  | Sub-county (GAUL level-2 name) | 16 distinct values |
| `ADM1_CD` | GAUL level-1 code |  | GAUL level-1 code | 1,359 to 1,395 |
| `ADM2_CD` | GAUL level-2 code |  | GAUL level-2 code | 1.04e+05 to 1.04e+05 |
| `ADM2_AREA` | Polygon area (geodesic, maxError 100 m) | km2 | Polygon area (geodesic, maxError 100 m) | 571 to 40,800 |
| `BND_SOURCE` | Boundary source |  | Boundary source | FAO GAUL 2025 level2 |
| `BND_YEAR` | Boundary year |  | Boundary year | 2,025 to 2,025 |

### 5.2 Provenance, dates and quality flags  (`PROVENANCE`)

Run metadata: which data dates, baselines and versions each number refers to. Read these first - every "current" value is only as current as its OD_* date.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `RUN_DATE` | Script run date |  | Script run date | 2026-11-02 |
| `BASE_START` | Reference period start |  | Reference period start | 2001-01-01 |
| `BASE_END` | Reference period end |  | Reference period end | 2025-12-31 |
| `OBS_START` | Start of operational year window |  | Start of operational year window | 2026-01-01 |
| `OBS_DATE` | EARLIEST of the per-dataset latest observation dates (OD_*) |  | EARLIEST of the per-dataset latest observation dates (OD_*) | 2026-09-30 |
| `OBS_END` | LATEST of the per-dataset observation dates (OD_*) |  | LATEST of the per-dataset observation dates (OD_*) | 2026-11-02 |
| `VALID_PCT` | Mean of available validity metrics (NDVI_VAL, LST_VAL, SM_VALID, S2_VALID) | % | Mean of available validity metrics (NDVI_VAL, LST_VAL, SM_VALID, S2_VALID) | 61.57 to 93.67 |
| `QUAL_FLAG` | QUALITY_FLAG (shortened for the 10-char Shapefile limit): OK >= 70 % valid; LOW < 70 %; NA none |  | QUALITY_FLAG (shortened for the 10-char Shapefile limit): OK >= 70 % valid; LOW < 70 %; NA none | 2 distinct values |
| `PROC_VER` | PROCESS_VER (shortened for the 10-char Shapefile limit): pipeline version |  | PROCESS_VER (shortened for the 10-char Shapefile limit): pipeline version | 1.0.0-py |
| `OD_CHIRPS` | CHIRPS latest image date |  | CHIRPS latest image date | 2026-09-30 |
| `OD_ERA5` | ERA5-Land latest date |  | ERA5-Land latest date | 2026-10-24 |
| `OD_MVEG` | MOD13Q1 latest composite date |  | MOD13Q1 latest composite date | 2026-09-30 |
| `OD_MLST` | MOD11A2 latest composite date |  | MOD11A2 latest composite date | 2026-10-16 |
| `OD_VHI` | Common VHI window end |  | Common VHI window end | 2026-09-30 |
| `OD_SMAP` | SMAP latest date |  | SMAP latest date | 2026-10-31 |
| `OD_DW` | Dynamic World latest 2026 scene |  | Dynamic World latest 2026 scene | 2026-11-02 |
| `OD_S2` | Sentinel-2 latest 2026 scene |  | Sentinel-2 latest 2026 scene | 2026-11-02 |
| `OD_GPM` | IMERG latest |  | IMERG latest | 2026-11-01 |
| `CUR_MTH` | CHIRPS last complete month |  | CHIRPS last complete month | 2026-09 |
| `CUR_ERA5` | ERA5 last complete month |  | ERA5 last complete month | 2026-09 |
| `CUR_SMAP` | SMAP last complete month |  | SMAP last complete month | 2026-10 |
| `SEAS_YR` | Year of RAIN_SEAS (MAM) |  | Year of RAIN_SEAS (MAM) | 2,026 to 2,026 |
| `BASE_CHIRP` | CHIRPS baseline |  | CHIRPS baseline | 2001-2025 |
| `BASE_SMAP` | SMAP baseline |  | SMAP baseline | 2016-2025 |
| `DW_WIN` | Dynamic World window |  | Dynamic World window | 365d ending at OD_DW |
| `POP_VINT` | WorldPop vintages present |  | WorldPop vintages present | 25,26 |
| `POP_SRC` | WorldPop source per vintage |  | WorldPop source per vintage | 25=projects/sat-io/open-datasets/WORLDPOP/agesex ; 26=projects/sat-io/open-datasets/WORLDPOP/agesex |
| `EXP_VINT` | WorldPop vintage used for exposure |  | WorldPop vintage used for exposure | 26.00 to 26.00 |
| `CM_MODELS` | CMIP6 models |  | CMIP6 models | ACCESS-CM2,CanESM5,EC-Earth3,GFDL-ESM4,MPI-ESM1-2-HR,MRI-ESM2-0,NorESM2-MM,UKESM1-0-LL |
| `CM_HIST` | CMIP6 historical period |  | CMIP6 historical period | 1995-2014 |
| `CM_FUT` | CMIP6 future period |  | CMIP6 future period | 2041-2060 |
| `CM_SSP` | CMIP6 scenarios |  | CMIP6 scenarios | 245,585 |

### 5.3 Rainfall - CHIRPS  (`CHIRPS`)

- **Source:** `UCSB-CHG/CHIRPS/DAILY` - bands: precipitation
- **Period:** Baseline 2001-2025; current = last complete month / YTD to latest image  |  **Native resolution:** 0.05 deg (~5.5 km)  |  **Summarised by:** mean over polygon (fractional pixel weights)
- **Limitations:** SPI uses zero-inflated 2-parameter gamma (method of moments, Thom approximation) on 2001-2025 samples; windows of SPI-n reach back into 2000. 25-yr reference is not a WMO normal.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `RAIN_ANN` | Mean annual rainfall 2001-2025 | mm/yr | sum daily P per year, mean over years | 207 to 820 |
| `RAIN_ASD` | Interannual SD of annual rainfall | mm | SD of annual totals | 55.28 to 194 |
| `RAIN_P10` | P10 annual rainfall | mm | percentile 10 of annual totals | 139 to 618 |
| `RAIN_P50` | Median annual rainfall | mm | percentile 50 | 204 to 803 |
| `RAIN_P90` | P90 annual rainfall | mm | percentile 90 | 295 to 1,054 |
| `RAIN_TRND` | Annual rainfall trend (Sen slope) | mm/yr | Theil-Sen over annual totals | -0.283 to 4.95 |
| `RAIN_LR` | Mean long-rains (MAM) total | mm | sum Mar-May, mean over years | 99.40 to 349 |
| `RLR_SD` | SD long-rains total | mm | Standard deviation across 2001-2025 of the yearly Mar-May totals | 45.15 to 143 |
| `RAIN_SR` | Mean short-rains (OND) total | mm | sum Oct-Dec, mean over years | 43.31 to 281 |
| `RSR_SD` | SD short-rains total | mm | Standard deviation across 2001-2025 of the yearly Oct-Dec totals | 24.62 to 138 |
| `RAIN_MTH` | Rainfall, last complete month | mm | Sum of daily CHIRPS rainfall in the last complete month (CUR_MTH) (sum daily P in month) | 0.225 to 174 |
| `RMTH_BASE` | Baseline rainfall same calendar month | mm | mean 2001-2025 | 0.397 to 25.40 |
| `RAIN_ANOM` | Monthly rainfall anomaly | mm | RAIN_MTH - RMTH_BASE | -19.83 to 155 |
| `RAIN_PCT` | Monthly rainfall % anomaly (null where baseline < 1 mm) | % | 100*(cur-base)/base | -94.88 to 1,167 |
| `RAIN_SEAS` | Latest completed MAM season rainfall | mm | sum Mar-May of SEAS_YR | 122 to 295 |
| `RSEAS_PCT` | MAM % anomaly vs 2001-2025 MAM mean | % | 100*(cur-base)/base | -28.45 to 46.81 |
| `SPI_01` | SPI-1 (last complete month), polygon mean | z | Phi^-1(H(P)) | -1.93 to 3.22 |
| `SPI_03` | SPI-3 | z | Same as SPI_01, but rainfall is accumulated over the 3 months ending with the last complete month | -2.83 to 3.03 |
| `SPI_06` | SPI-6 | z | Same as SPI_01, accumulated over 6 months | -2.41 to 1.40 |
| `SPI_12` | SPI-12 | z | Same as SPI_01, accumulated over 12 months | -0.735 to 0.865 |
| `SPI3_PCT` | Area share with SPI-3 <= SPI_SEVERE (of valid area) | % | mean(SPI3<=-1.5)*100 | 0 to 100 |
| `RX1DAY` | Max 1-day rainfall, current YTD | mm | max daily P | 21.94 to 122 |
| `RX5DAY` | Max 5-day rainfall, current YTD | mm | max rolling 5-day sum | 37.09 to 141 |
| `CDD_MAX` | Longest dry spell, current YTD (P < WET_DAY_MM) | days | Longest dry spell, current YTD (P < WET_DAY_MM) | 46.28 to 154 |
| `CWD_MAX` | Longest wet spell, current YTD (P >= WET_DAY_MM) | days | Longest wet spell, current YTD (P >= WET_DAY_MM) | 3.34 to 6.93 |

### 5.4 Temperature, evaporation, runoff and soil water - ERA5-Land  (`ERA5`)

- **Source:** `ECMWF/ERA5_LAND/DAILY_AGGR (from ECMWF/ERA5_LAND/HOURLY)` - bands: temperature_2m, temperature_2m_max/min, potential_evaporation_sum, total_evaporation_sum, surface_runoff_sum, sub_surface_runoff_sum, volumetric_soil_water_layer_1-4
- **Period:** Baseline 2001-2025; current = last complete month / YTD  |  **Native resolution:** 0.1 deg (~11 km)  |  **Summarised by:** mean over polygon
- **Limitations:** Hot day = Tmax above the pixel P90 of 2001-2025 (local relative threshold, 10% by construction in baseline). Heat spell = >=3 consecutive hot days. Coarse 11 km grid: small sub-counties share cells.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `T2M_MEAN` | Baseline mean 2 m temperature | degC | T_K-273.15 | 25.62 to 29.62 |
| `T2M_MAX` | Baseline mean daily max 2 m temperature | degC | ERA5-Land daily max temperature, averaged over all days 2001-2025 | 30.54 to 34.17 |
| `T2M_MIN` | Baseline mean daily min 2 m temperature | degC | ERA5-Land daily min temperature, averaged over all days 2001-2025 | 20.88 to 25.74 |
| `T2M_CUR` | Mean 2 m temperature, last complete month | degC | Mean of daily mean temperature over the last complete month (OD_ERA5 -> CUR_ERA5) | 25.93 to 30.29 |
| `TEMP_ANOM` | Temperature anomaly, last complete month vs same-month baseline | degC | T2M_CUR minus the mean of the same calendar month over 2001-2025 | -0.346 to 2.25 |
| `HOT_DAYS` | Days with Tmax > local P90, current YTD | days | Count of days since 1 Jan of the current year with Tmax above that pixel's own 90th percentile (2001-2025), averaged over the polygon | 15.38 to 59.44 |
| `HOT_PCT` | Share of YTD days that are hot | % | HOT_DAYS divided by the number of days elapsed this year x 100 | 5.18 to 20.01 |
| `HEAT_DAYS` | Longest heat spell (>= HEAT_MIN_RUN days), current YTD; 0 if none | days | Longest run of consecutive hot days this year (a run must be >= 3 days to count, else 0), averaged over the polygon | 3.08 to 13.90 |
| `PET_MM` | Baseline mean annual potential evaporation | mm/yr | -sum*1000/25 | 2,886 to 4,665 |
| `AET_MM` | Baseline mean annual total (actual) evaporation | mm/yr | -sum*1000/25 | 259 to 857 |
| `RUNOFF_MM` | Baseline mean annual total runoff (surface + sub-surface) | mm/yr | (surface runoff + sub-surface runoff) x 1000 / 25 years | 3.50 to 25.97 |
| `PET_ANOM` | PET anomaly, last complete month | mm | PET of the last complete month minus the 2001-2025 mean of that month  | -39.61 to 87.36 |
| `AET_ANOM` | AET anomaly, last complete month | mm | AET of the last complete month minus the 2001-2025 mean of that month | -44.33 to 20.62 |
| `ERA_SM1` | Baseline soil water layer 1 (0-7 cm) | m3/m3 | Mean volumetric soil water, ERA5-Land layer 1, all days 2001-2025 | 0.0366 to 0.196 |
| `ERA_SM2` | Baseline soil water layer 2 (7-28 cm) | m3/m3 | Same, layer 2 | 0.122 to 0.198 |
| `ERA_SM3` | Baseline soil water layer 3 (28-100 cm) | m3/m3 | Same, layer 3 | 0.131 to 0.198 |
| `ERA_SM4` | Baseline soil water layer 4 (100-289 cm) | m3/m3 | Same, layer 4 | 0.106 to 0.178 |
| `ERA_SM_AN` | Depth-weighted (0-289 cm) soil water anomaly, last complete month | m3/m3 | Four layers combined weighted by layer depth (0-289 cm in total); last complete month minus same-month mean 2001-2025 | -0.0128 to 0.00584 |

### 5.5 Vegetation - MODIS NDVI / EVI / VCI  (`MODIS_NDVI`)

- **Source:** `MODIS/061/MOD13Q1` - bands: NDVI, EVI (x0.0001), SummaryQA, DetailedQA
- **Period:** Baseline 2001-2025; current = latest 17-day window (2 composites)  |  **Native resolution:** 250 m  |  **Summarised by:** mean over polygon; stress % = area share of valid pixels
- **Limitations:** QA: SummaryQA<=1 and DetailedQA possible-shadow bit = 0. VCI uses same-window per-year composites (2001-2025) for min/max. VEG_ST_DUR/VEG_RECOV use last 6 complete months only.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `NDVI_MEAN` | Baseline mean NDVI | index | raw*0.0001 | 0.105 to 0.567 |
| `EVI_MEAN` | Baseline mean EVI | index | raw*0.0001 | 0.0767 to 0.353 |
| `NDVI_LR` | Baseline mean NDVI in MAM | index | Mean NDVI of March-May composites 2001-2025 | 0.107 to 0.561 |
| `NDVI_SR` | Baseline mean NDVI in OND | index | Mean NDVI of Oct-Dec composites 2001-2025 | 0.131 to 0.615 |
| `NDVI_NOW` | NDVI latest valid window | index | Mean of the latest 17-day window (2 MOD13Q1 composites) after QA masking | 0.137 to 0.571 |
| `EVI_NOW` | EVI latest valid window | index | Same window as NDVI_NOW | 0.0877 to 0.41 |
| `NDVI_ANOM` | NDVI anomaly vs same-window baseline | index | NDVI_NOW minus the mean NDVI of the same 17-day window in each year 2001-2025 | -0.0671 to 0.119 |
| `EVI_ANOM` | EVI anomaly vs same-window baseline | index | Same, for EVI | -0.055 to 0.108 |
| `VCI_NOW` | Vegetation Condition Index | 0-100 | 100*(NDVI-min)/(max-min) | 20.60 to 95.33 |
| `NDVI_TRND` | NDVI trend (Sen slope of annual means) | index/yr | NDVI trend (Sen slope of annual means) | -0.00109 to 0.0046 |
| `EVI_TRND` | EVI trend (Sen slope) | index/yr | EVI trend (Sen slope) | -0.00026 to 0.00243 |
| `VEG_ST_PCT` | Area share of valid pixels with VCI < VCI_STRESS | % | Share of valid pixels in the latest window with VCI < 35, x 100 | 0.336 to 89.37 |
| `VEG_ST_DUR` | Consecutive months to date with monthly VCI < VCI_STRESS (max 6; polygon mean) | months | Consecutive months to date with monthly VCI < VCI_STRESS (max 6; polygon mean) | 0.0895 to 2.30 |
| `VEG_RECOV` | VCI gain from 6-month minimum to latest month, stressed pixels only | VCI pts | VCI gain from 6-month minimum to latest month, stressed pixels only | 1.23 to 30.72 |
| `NDVI_VAL` | Valid-pixel share in latest window | % | Valid-pixel share in latest window | 32.16 to 100 |

### 5.6 Land-surface temperature - MODIS  (`MODIS_LST`)

- **Source:** `MODIS/061/MOD11A2` - bands: LST_Day_1km, LST_Night_1km, QC_Day, QC_Night (x0.02 K)
- **Period:** Baseline 2001-2025; current = latest 25-day window (up to 4 composites)  |  **Native resolution:** 1 km  |  **Summarised by:** mean over polygon
- **Limitations:** LST is land-surface temperature, not 2 m air temperature. QC: mandatory-QA bits 0-1 = 0 and LST error bits 6-7 <= 1 (<= 2 K). High-LST = share of YTD valid obs above pixel P90 of 2001-2025.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `LST_DAY` | Baseline mean daytime LST | degC | raw*0.02-273.15 | 34.44 to 43.74 |
| `LST_NIGHT` ⚠ | Baseline mean night-time LST | degC | Mean MOD11A2 night LST 2001-2025 (see data-quality note: empty in this file) | **all 0 = missing, see note A** |
| `LSTD_NOW` | Daytime LST, latest window | degC | Mean daytime LST of the latest 25-day window (up to 4 8-day composites) | 25.51 to 39.18 |
| `LSTN_NOW` | Night-time LST, latest window | degC | Mean night LST of the same window | 22.82 to 29.46 |
| `LST_ANOM` | Daytime LST anomaly vs same-window baseline | degC | LSTD_NOW minus the mean of the same 25-day window in each year 2001-2025 | -13.07 to -3.25 |
| `LSTN_ANOM` ⚠ | Night LST anomaly vs same-window baseline | degC | LSTN_NOW minus the same-window 2001-2025 mean (empty in this file) | **all 0 = missing, see note A** |
| `LST_DIF` | Day-night LST difference, latest window | degC | LSTD_NOW - LSTN_NOW | 1.12 to 10.02 |
| `LST_HIGH` | Share of YTD day-LST observations above baseline P90 | % | Share of valid daytime observations since 1 Jan that exceeded that pixel's 90th percentile (2001-2025) | 0 to 2.92 |
| `LST_TRND` | Daytime LST trend (Sen slope of annual means) | degC/yr | Theil-Sen slope of the yearly mean daytime LST, 2001-2025 | -0.161 to -0.000244 |
| `LST_VAL` | Valid-pixel share, latest window | % | Share of polygon pixels with a valid (clear-sky, good-QA) value in the latest window | 2.38 to 82.79 |

### 5.7 Vegetation Health Index (VHI, TCI)  (`VHI`)

- **Source:** `MODIS/061/MOD13Q1 + MODIS/061/MOD11A2` - bands: NDVI, LST_Day_1km
- **Period:** Same-window min/max from 2001-2025; current = common latest 17-day window  |  **Native resolution:** 1 km (NDVI aggregated from 250 m)  |  **Summarised by:** mean over polygon; stress % = valid-area share
- **Limitations:** VHI is a vegetation/thermal stress indicator, not evidence of crop failure, food insecurity or livestock mortality. alpha = VHI_ALPHA.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `TCI_NOW` | Temperature Condition Index | 0-100 | 100*(LSTmax-LST)/(LSTmax-LSTmin) | 71.91 to 99.99 |
| `VHI_NOW` | Vegetation Health Index | 0-100 | a*VCI+(1-a)*TCI | 44.61 to 97.62 |
| `VHI_ANOM` | VHI minus mean same-window baseline VHI | pts | VHI_NOW minus the mean VHI of the same window in 2001-2025 | 2.20 to 55.79 |
| `VHI_ST_PCT` | Area share of valid pixels with VHI < VHI_STRESS | % | Share of valid area with VHI < 35, x 100 | 0 to 15.78 |

### 5.8 Soil moisture - NASA SMAP L4  (`SMAP`)

- **Source:** `NASA/SMAP/SPL4SMGP/008` - bands: sm_surface, sm_rootzone (m3/m3)
- **Period:** Baseline 2016-2025 (record starts 2015-03-31; outages Jun-Jul 2019, Aug-Sep 2022); current = last complete month  |  **Native resolution:** ~9-11 km (EASE-Grid 2.0, 11 km nominal in EE)  |  **Summarised by:** mean over polygon
- **Limitations:** Baseline is only 10 years, NOT 2001-2025. SMI uses min/max of the 10 same-month monthly means. SM_VALID = observed 3-hourly steps / expected.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `SM_SURF` | Surface soil moisture, last complete month | m3/m3 | Mean SMAP L4 surface soil moisture over the last complete month | 0.0621 to 0.216 |
| `SM_ROOT` | Root-zone soil moisture, last complete month | m3/m3 | Mean SMAP L4 root-zone soil moisture over the last complete month | 0.0809 to 0.253 |
| `SM_S_AN` | Surface soil-moisture anomaly vs same-month baseline | m3/m3 | SM_SURF minus the mean of the same calendar month 2016-2025 | -0.0378 to 0.0431 |
| `SM_R_AN` | Root-zone anomaly vs same-month baseline | m3/m3 | SM_ROOT minus the mean of the same calendar month 2016-2025 | -0.0342 to 0.0165 |
| `SMI_NOW` | Root-zone Soil Moisture Index 0-1 | index | (SM-min)/(max-min) | 5.74e-05 to 0.674 |
| `RZ_DEF` | Root-zone deficit | m3/m3 | max(0, baseline-current) | 0 to 0.0342 |
| `SM_VALID` | Observed share of expected 3-hourly steps | % | Observed 3-hourly steps / expected steps in the month, x 100 | 99.19 to 99.19 |

### 5.9 Surface water history - JRC Global Surface Water  (`JRC`)

- **Source:** `JRC/GSW1_4/GlobalSurfaceWater` - bands: occurrence, seasonality, recurrence, max_extent, change_abs
- **Period:** 1984-2021 (NOT current 2026 water extent)  |  **Native resolution:** 30 m (zonal stats sampled at SC.FINE)  |  **Summarised by:** area = sum(pixelArea); others mean over water pixels
- **Limitations:** Persistent water = occurrence >= 75%. Historical product; use Sentinel-2 module for current water. Sampling at SC.FINE (100 m) approximates 30 m areas; set SC.FINE=30 for exact (slower).

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `W_OCCUR` | Mean occurrence over pixels with any water | % | JRC "occurrence" (% of 1984-2021 observations with water) averaged over pixels that ever had water | 2.09 to 94.96 |
| `W_SEASON` | Mean seasonality (months/yr) of water pixels | months | JRC "seasonality" averaged over water pixels | 1.33 to 11.87 |
| `W_RECUR` | Mean recurrence of water pixels | % | JRC "recurrence" averaged over water pixels | 43.27 to 98.41 |
| `W_AREA` | Persistent water area (occurrence >= 75%) | km2 | sum pixelArea | 0 to 2,585 |
| `W_PCT` | Persistent water share of Admin-2 area | % | W_AREA/ADM2_AREA*100 | 0 to 12.03 |
| `W_MAX` | Maximum historical water extent | km2 | sum pixelArea(max_extent==1) | 0.129 to 2,693 |
| `W_CHANGE` | Mean occurrence change (change_abs) of water pixels | % pts | JRC "change_abs" (occurrence change between epochs) averaged over water pixels | -48.14 to 16.97 |

### 5.10 Terrain - SRTM  (`SRTM`)

- **Source:** `USGS/SRTMGL1_003` - bands: elevation
- **Period:** Static (2000)  |  **Native resolution:** 30 m (stats sampled at SC.FINE)  |  **Summarised by:** mean/min/max over polygon
- **Limitations:** TWI / flow accumulation / terrain SPI are in module TERRAIN_HYD (MERIT Hydro), not from SRTM. ASPECT_DOM = circular (vector) mean direction, not modal class. TRI = Riley et al. (1999) 3x3.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `ELEV_MEAN` | Mean elevation | m | Mean of SRTM 30 m elevation in the polygon | 55.93 to 866 |
| `ELEV_MIN` | Minimum elevation | m | Minimum of SRTM elevation in the polygon | 0 to 489 |
| `ELEV_MAX` | Maximum elevation | m | Maximum of SRTM elevation in the polygon | 112 to 2,283 |
| `SLOPE_MEAN` | Mean slope | deg | ee.Terrain.slope | 0.898 to 5.84 |
| `ASPECT_DOM` | Dominant aspect (circular mean, slopes > 2 deg) | deg | atan2(mean sin, mean cos) | 22.06 to 336 |
| `TRI_MEAN` | Terrain Ruggedness Index (Riley) | m | sqrt(sum (z_i-z_0)^2) over 8 neighbours | 4.00 to 27.53 |
| `TPI_MEAN` | Topographic Position Index (3x3) | m | z - mean(neighbours) | -0.0052 to 0.00456 |

### 5.11 Terrain hydrology - MERIT Hydro  (`TERRAIN_HYD`)

- **Source:** `MERIT/Hydro/v1_0_1` - bands: upa (km2), elv (m), hnd (m)
- **Period:** Static  |  **Native resolution:** 3 arcsec (92.77 m), sampled at SC.FINE  |  **Summarised by:** mean / median / max over polygon
- **Limitations:** Not SRTM-derived: MERIT Hydro slope and drainage area (D8, single flow direction; poor in deltas, braided/arid depression basins). Flow width = cell width (approximation). tan(beta) floored at tan(0.1 deg). Terrain SPI is heavy-tailed so the MEDIAN is reported. Not the climate Standardized Precipitation Index.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `TWI_MEAN` | Mean Topographic Wetness Index | ln(m) | ln(a/tan(beta)) | 9.03 to 11.61 |
| `TWI_MED` | Median Topographic Wetness Index | ln(m) | Median of the TWI pixels | 8.56 to 10.86 |
| `SPT_MED` | Median terrain Stream Power Index | m2/m | a*tan(beta) | 29.05 to 397 |
| `FACC_MAX` ⚠ | Maximum flow accumulation (upstream drainage area) in polygon | km2 | max upa | **all 0 = missing, see note A** |
| `HND_MEAN` | Mean height above nearest drainage | m | Mean MERIT Hydro "hnd" band (vertical height above the nearest drainage) | 1.29 to 32.40 |

### 5.12 Current land cover (soft shares) - Dynamic World  (`DYNAMIC_WORLD`)

- **Source:** `GOOGLE/DYNAMICWORLD/V1` - bands: crops, grass, shrub_and_scrub, trees, built, bare, water (+ flooded_vegetation, snow_and_ice) probabilities
- **Period:** Current = 365 days ending at latest scene; change vs same window DW_CHG_YRS earlier (2015+ only)  |  **Native resolution:** 10 m (stats sampled at SC.DW)  |  **Summarised by:** mean class probability over polygon x100 = probability-weighted area share
- **Limitations:** Shares are SOFT (mean of per-pixel mean probabilities), not label counts, so they sum to ~100 incl. flooded veg/snow. DW_CONF = mean of the top-class probability. Not a 2001 baseline. Sampled at 100 m.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `DW_CROP` | Cropland probability share | % | Mean per-pixel "crops" probability x 100 over the last 365 days | 6.04 to 20.24 |
| `DW_GRASS` | Grass share | % | Same, "grass" | 2.81 to 8.02 |
| `DW_SHRUB` | Shrub & scrub share | % | Same, "shrub_and_scrub" | 15.64 to 43.60 |
| `DW_TREE` | Tree share | % | Same, "trees" | 3.80 to 44.13 |
| `DW_BUILT` | Built-up share | % | Same, "built" | 3.68 to 11.11 |
| `DW_BARE` | Bare share | % | Same, "bare" | 5.24 to 40.48 |
| `DW_WATER` | Water share | % | Same, "water" | 2.83 to 14.96 |
| `DW_FLDV` | Flooded vegetation share | % | Same, "flooded_vegetation" | 2.68 to 4.13 |
| `DW_CONF` | Mean top-class probability (confidence) | % | Mean of the winning-class probability per pixel (how sure the classifier is) | 37.08 to 52.46 |
| `DW_CRP_CH` | Cropland change vs earlier window | % pts | DW_CROP now minus DW_CROP in the 365-day window 5 years earlier | -3.50 to -0.0759 |
| `DW_BLT_CH` | Built-up change vs earlier window | % pts | Same, built-up | -0.16 to 2.10 |
| `DW_TRE_CH` | Tree change vs earlier window | % pts | Same, trees | -0.978 to 5.16 |

### 5.13 Land cover 2021 - ESA WorldCover  (`WORLDCOVER`)

- **Source:** `ESA/WorldCover/v200` - bands: Map (10 tree,20 shrub,30 grass,40 crop,50 built,60 bare,70 snow,80 water,90 herbaceous wetland,95 mangrove,100 moss)
- **Period:** 2021 reference year (single epoch, not a time series)  |  **Native resolution:** 10 m (sampled at SC.FINE)  |  **Summarised by:** area share of mapped pixels
- **Limitations:** Share of valid mapped area. Sampled at 100 m.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `WC_CROP` | Cropland share | % | Pixels of class 40 / all mapped pixels x 100 | 0.000154 to 1.07 |
| `WC_GRASS` | Grassland share | % | Class 30 | 6.63 to 58.18 |
| `WC_SHRUB` | Shrubland share | % | Class 20 | 3.37 to 90.72 |
| `WC_TREE` | Tree cover share | % | Class 10 | 0.0177 to 35.31 |
| `WC_BUILT` | Built-up share | % | Class 50 | 0.000659 to 3.45 |
| `WC_BARE` | Bare/sparse share | % | Class 60 | 0.003 to 63.72 |
| `WC_WATER` | Permanent water share | % | Class 80 | 0 to 13.42 |
| `WC_WETL` | Herbaceous wetland share | % | Class 90 | 0 to 0.711 |

### 5.14 Population and hazard exposure - WorldPop  (`WORLDPOP`)

- **Source:** `WorldPop R2025A: uploaded asset | projects/sat-io/open-datasets/WORLDPOP/agesex (community) | WorldPop/GP/100m/R2025A/v1/pop (official, total only)` - bands: parsed sex/age bands
- **Period:** Modelled vintages 2025, 2026 (optional 2020)  |  **Native resolution:** ~100 m (sampled at SC.POP)  |  **Summarised by:** SUM of pixel counts; exposure = sum of pop in hazard pixels (hazard sampled at pop grid by nearest)
- **Limitations:** Separate modelled estimates: 2026-2025 difference is NOT measured migration. U18 = classes 0,1,5,10 + U18_FRACTION_OF_15_19 of class 15. Exposure uses newest vintage (EXP_VINT) and CURRENT hazard layers; exposure != vulnerability != risk. Per-age-class counts are not exported.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `POP_T25` | Total population WorldPop 2025 | persons | sum of pixel counts | 51,535 to 2.5e+05 |
| `POP_U525` | Population under 5 WorldPop 2025 | persons | sum of pixel counts | 7,456 to 36,179 |
| `POP_U1825` | Population under 18 WorldPop 2025 | persons | sum of pixel counts | 27,519 to 1.33e+05 |
| `POP_WRA25` | Women aged 15-49 WorldPop 2025 | persons | sum of pixel counts | 11,492 to 57,486 |
| `POP_6525` | Population 65+ WorldPop 2025 | persons | sum of pixel counts | 879 to 4,239 |
| `POP_M25` | Male population WorldPop 2025 | persons | sum of pixel counts | 28,167 to 1.33e+05 |
| `POP_F25` | Female population WorldPop 2025 | persons | sum of pixel counts | 23,369 to 1.17e+05 |
| `POP_D2525` | Population density WorldPop 2025 | persons/km2 | POP_T25/ADM2_AREA | 3.74 to 368 |
| `POP_T26` | Total population WorldPop 2026 | persons | sum of pixel counts | 52,627 to 2.55e+05 |
| `POP_U526` | Population under 5 WorldPop 2026 | persons | sum of pixel counts | 7,588 to 36,750 |
| `POP_U1826` | Population under 18 WorldPop 2026 | persons | sum of pixel counts | 27,801 to 1.34e+05 |
| `POP_WRA26` | Women aged 15-49 WorldPop 2026 | persons | sum of pixel counts | 11,854 to 59,182 |
| `POP_6526` | Population 65+ WorldPop 2026 | persons | sum of pixel counts | 911 to 4,386 |
| `POP_M26` | Male population WorldPop 2026 | persons | sum of pixel counts | 28,758 to 1.35e+05 |
| `POP_F26` | Female population WorldPop 2026 | persons | sum of pixel counts | 23,869 to 1.19e+05 |
| `POP_D2626` | Population density WorldPop 2026 | persons/km2 | POP_T26/ADM2_AREA | 3.82 to 375 |
| `POP_GROW` | % difference between modelled 2026 and 2025 totals (NOT measured migration) | % | 100*(T26-T25)/T25 | 1.67 to 2.12 |
| `POP_EXP` | Total population exposed to severe vegetation stress (VCI < VCI_STRESS) | persons | sum of pop in hazard pixels (raster-level) | 13.30 to 1.6e+05 |
| `U5_EXP` | Population under 5 exposed to severe vegetation stress (VCI < VCI_STRESS) | persons | sum of pop in hazard pixels (raster-level) | 1.92 to 22,211 |
| `U18_EXP` | Population under 18 exposed to severe vegetation stress (VCI < VCI_STRESS) | persons | sum of pop in hazard pixels (raster-level) | 7.02 to 78,876 |
| `WRA_EXP` | Women aged 15-49 exposed to severe vegetation stress (VCI < VCI_STRESS) | persons | sum of pop in hazard pixels (raster-level) | 3.20 to 39,672 |
| `OLD_EXP` | Population 65+ exposed to severe vegetation stress (VCI < VCI_STRESS) | persons | sum of pop in hazard pixels (raster-level) | 0.23 to 2,564 |
| `EXP_PCT` | % of total population exposed to severe vegetation stress (VCI < VCI_STRESS) | % | exposed/total*100 | 0.00621 to 68.02 |
| `EXR_POP` | Total population exposed to severe rainfall deficit (SPI-3 <= SPI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 2.35e+05 |
| `EXR_U5` | Population under 5 exposed to severe rainfall deficit (SPI-3 <= SPI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 32,653 |
| `EXR_U18` | Population under 18 exposed to severe rainfall deficit (SPI-3 <= SPI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 1.16e+05 |
| `EXR_WRA` | Women aged 15-49 exposed to severe rainfall deficit (SPI-3 <= SPI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 58,329 |
| `EXR_OLD` | Population 65+ exposed to severe rainfall deficit (SPI-3 <= SPI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 3,768 |
| `EXR_PCT` | % of total population exposed to severe rainfall deficit (SPI-3 <= SPI_SEVERE) | % | exposed/total*100 | 0 to 100 |
| `EXS_POP` | Total population exposed to severe soil-moisture stress (SMI <= SMI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 2.35e+05 |
| `EXS_U5` | Population under 5 exposed to severe soil-moisture stress (SMI <= SMI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 32,653 |
| `EXS_U18` | Population under 18 exposed to severe soil-moisture stress (SMI <= SMI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 1.16e+05 |
| `EXS_WRA` | Women aged 15-49 exposed to severe soil-moisture stress (SMI <= SMI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 58,329 |
| `EXS_OLD` | Population 65+ exposed to severe soil-moisture stress (SMI <= SMI_SEVERE) | persons | sum of pop in hazard pixels (raster-level) | 0 to 3,875 |
| `EXS_PCT` | % of total population exposed to severe soil-moisture stress (SMI <= SMI_SEVERE) | % | exposed/total*100 | 0 to 100 |
| `EXH_POP` | Total population exposed to heat spell (>= HEAT_MIN_RUN days Tmax > local P90, YTD) | persons | sum of pop in hazard pixels (raster-level) | 52,627 to 2.4e+05 |
| `EXH_U5` | Population under 5 exposed to heat spell (>= HEAT_MIN_RUN days Tmax > local P90, YTD) | persons | sum of pop in hazard pixels (raster-level) | 7,588 to 34,631 |
| `EXH_U18` | Population under 18 exposed to heat spell (>= HEAT_MIN_RUN days Tmax > local P90, YTD) | persons | sum of pop in hazard pixels (raster-level) | 27,801 to 1.27e+05 |
| `EXH_WRA` | Women aged 15-49 exposed to heat spell (>= HEAT_MIN_RUN days Tmax > local P90, YTD) | persons | sum of pop in hazard pixels (raster-level) | 11,854 to 58,329 |
| `EXH_OLD` | Population 65+ exposed to heat spell (>= HEAT_MIN_RUN days Tmax > local P90, YTD) | persons | sum of pop in hazard pixels (raster-level) | 911 to 4,371 |
| `EXH_PCT` | % of total population exposed to heat spell (>= HEAT_MIN_RUN days Tmax > local P90, YTD) | % | exposed/total*100 | 94.23 to 100 |

### 5.15 Current surface indices and open water - Sentinel-2  (`SENTINEL2`)

- **Source:** `COPERNICUS/S2_SR_HARMONIZED` - bands: B2,B3,B4,B8,B11,B12,SCL (reflectance x0.0001)
- **Period:** Latest 60 days; water change vs same window 2019..previous year (S2 L2A coverage of Africa is thin before 2019)  |  **Native resolution:** 10/20 m (sampled at SC.S2)  |  **Summarised by:** median composite, mean over polygon; water area = sum pixelArea
- **Limitations:** SCL masks 0,1,3,8,9,10,11. Water rule MNDWI > 0.1 AND NDVI < 0.35 is a documented, UNCALIBRATED threshold: S2_WJRC reports the share of S2 water pixels with JRC occurrence > 25% as a sanity test. Not a 2001 baseline.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `S2_NDVI` | Sentinel-2 NDVI | index | (B8-B4)/(B8+B4) | 0.038 to 0.527 |
| `S2_NDMI` | Sentinel-2 NDMI | index | (B8-B11)/(B8+B11) | -0.19 to 0.0609 |
| `S2_NDWI` | Sentinel-2 NDWI (green-NIR) | index | (B3-B8)/(B3+B8) | -0.481 to -0.124 |
| `S2_MNDWI` | Sentinel-2 MNDWI | index | (B3-B11)/(B3+B11) | -0.504 to -0.226 |
| `S2_NBR` | Sentinel-2 NBR | index | (B8-B12)/(B8+B12) | -0.118 to 0.28 |
| `S2_BSI` | Sentinel-2 BSI | index | ((B11+B4)-(B8+B2))/((B11+B4)+(B8+B2)) | -0.0359 to 0.242 |
| `S2_VALID` | Share of polygon with >= 1 valid observation | % | Share of the polygon with at least one cloud-free Sentinel-2 observation in the 60-day window | 99.01 to 100 |
| `S2_W_AREA` | Current open-water area (S2 rule) | km2 | Area where MNDWI > 0.1 and NDVI < 0.35 in the 60-day median composite | 0 to 2,491 |
| `S2_W_CHG` | Water area minus mean same-window area of earlier years | km2 | S2_W_AREA minus the average area of the same 60-day window in 2019..last year | -52.87 to 106 |
| `S2_WJRC` | Share of S2 water with JRC occurrence > 25% | % | Share of Sentinel-2 water pixels that also have JRC occurrence > 25% (a plausibility check) | 0 to 97.51 |

### 5.16 Sub-daily rainfall - GPM IMERG  (`GPM`)

- **Source:** `NASA/GPM_L3/IMERG_V07` - bands: precipitation (mm/hr, 30-min)
- **Period:** Last complete month  |  **Native resolution:** 0.1 deg (~11 km)  |  **Summarised by:** mean over polygon
- **Limitations:** Supporting product only; does not replace CHIRPS. Collection mixes whatever IMERG V07 runs are in the catalog (check run type/dates before operational use).

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `IMG_MTH` | IMERG monthly total, last complete month | mm | IMERG half-hourly rate (mm/hr) x 0.5 h, summed over the month (sum(mm/hr*0.5)) | 5.77 to 106 |
| `IMG_MAX30` | Max 30-min intensity in month | mm/hr | Highest half-hourly rate in the month, polygon mean | 2.22 to 15.35 |
| `IMG_DAYMX` | Max daily total in month | mm | Highest daily total in the month, polygon mean | 3.27 to 46.47 |
| `IMG_HVY` | Days >= GPM_HEAVY_MM in month | days | Days in the month with total >= 20 mm | 0 to 1.33 |

### 5.17 Climate-change projections - NASA NEX-GDDP-CMIP6  (`CMIP6`)

- **Source:** `NASA/GDDP-CMIP6` - bands: pr (kg/m2/s), tas (K)
- **Period:** Historical 1995-2014 vs future 2041-2060 (configurable CM_*)  |  **Native resolution:** 0.25 deg (~27.8 km)  |  **Summarised by:** mean over polygon of per-model changes, ensemble median/SD
- **Limitations:** Scenario projections, not forecasts. Reference is 1995-2014 (CMIP6 historical run), NOT 2001-2025. Only ssp245/ssp585 exist. Few-model ensemble understates uncertainty.

| Field | What it is | Unit | How it is obtained | Range in file |
|---|---|---|---|---|
| `CM245_PR` | SSP245 ensemble-median annual rainfall change | % | 100*(fut-hist)/hist of mean daily pr | 7.35 to 31.38 |
| `CM245_LR` | SSP245 ensemble-median MAM rainfall change | % | Same as CM245_PR but for Mar-May | -1.38 to 9.40 |
| `CM245_SR` | SSP245 ensemble-median OND rainfall change | % | Same as CM245_PR but for Oct-Dec | 14.21 to 31.90 |
| `CM245_PRSD` | SSP245 inter-model SD of annual rainfall change | % pts | Standard deviation of the per-model change across the 8 models | 15.11 to 67.72 |
| `CM245_TAS` | SSP245 ensemble-median mean temperature change | degC | tas fut - hist | 1.11 to 1.29 |
| `CM245_TSD` | SSP245 inter-model SD of temperature change | degC | Standard deviation of the per-model warming across the 8 models | 0.311 to 0.474 |
| `CM585_PR` | SSP585 ensemble-median annual rainfall change | % | 100*(fut-hist)/hist of mean daily pr | 6.54 to 33.05 |
| `CM585_LR` | SSP585 ensemble-median MAM rainfall change | % | Same as CM585_PR but for Mar-May | 3.09 to 27.59 |
| `CM585_SR` | SSP585 ensemble-median OND rainfall change | % | Same as CM585_PR but for Oct-Dec | 13.47 to 40.82 |
| `CM585_PRSD` | SSP585 inter-model SD of annual rainfall change | % pts | Standard deviation of the per-model change across the 8 models | 15.32 to 56.37 |
| `CM585_TAS` | SSP585 ensemble-median mean temperature change | degC | tas fut - hist | 1.54 to 1.81 |
| `CM585_TSD` | SSP585 inter-model SD of temperature change | degC | Standard deviation of the per-model warming across the 8 models | 0.354 to 0.651 |

## 6. Quick map: which fields answer which question

| Question | Use |
|---|---|
| Is it drier or wetter than normal now? | `SPI_01`, `SPI_03`, `SPI_06`, `SPI_12`, `RAIN_ANOM`, `RSEAS_PCT`, `SPI3_PCT` |
| Is vegetation stressed? | `VCI_NOW`, `NDVI_ANOM`, `VEG_ST_PCT`, `VEG_ST_DUR`, `VHI_NOW`, `VHI_ST_PCT` |
| Is the soil dry? | `SMI_NOW`, `SM_R_AN`, `RZ_DEF`, `ERA_SM_AN` |
| Is it unusually hot? | `TEMP_ANOM`, `HOT_DAYS`, `HEAT_DAYS`, `LST_HIGH` (avoid `LST_ANOM`, see note C) |
| How long are dry / wet spells? | `CDD_MAX`, `CWD_MAX`, `RX1DAY`, `RX5DAY` |
| Where is water? | `W_OCCUR`, `W_AREA` (history), `S2_W_AREA`, `S2_W_CHG`, `DW_WATER` (current) |
| What is the land like? | `DW_*` (current soft shares), `WC_*` (2021 map), `ELEV_*`, `SLOPE_MEAN`, `TWI_MEAN` |
| Who is affected? | `POP_T26`, `POP_U526`, `POP_WRA26`, `POP_6526`, `EXP_PCT`, `EXR_PCT`, `EXS_PCT`, `POP_EXP`... |
| What is the long-term climate signal? | `RAIN_TRND`, `NDVI_TRND`, `LST_TRND`, `CM245_*`, `CM585_*` |
| Can I trust this row? | `VALID_PCT`, `QUAL_FLAG`, `NDVI_VAL`, `LST_VAL`, `S2_VALID` |

## 7. Source datasets (all on Google Earth Engine)

| Dataset | Earth Engine ID |
|---|---|
| Boundaries | `FAO/GAUL/2025/level2` |
| CHIRPS daily rainfall | `UCSB-CHG/CHIRPS/DAILY` |
| ERA5-Land daily aggregates | `ECMWF/ERA5_LAND/DAILY_AGGR` |
| MODIS vegetation indices | `MODIS/061/MOD13Q1` |
| MODIS land-surface temperature | `MODIS/061/MOD11A2` |
| SMAP L4 soil moisture | `NASA/SMAP/SPL4SMGP/008` |
| JRC Global Surface Water | `JRC/GSW1_4/GlobalSurfaceWater` |
| SRTM elevation | `USGS/SRTMGL1_003` |
| MERIT Hydro | `MERIT/Hydro/v1_0_1` |
| Dynamic World | `GOOGLE/DYNAMICWORLD/V1` |
| ESA WorldCover | `ESA/WorldCover/v200` |
| WorldPop (age-sex, R2025A, community-hosted) | `projects/sat-io/open-datasets/WORLDPOP/agesex` |
| Sentinel-2 surface reflectance | `COPERNICUS/S2_SR_HARMONIZED` |
| GPM IMERG V07 | `NASA/GPM_L3/IMERG_V07` |
| NEX-GDDP-CMIP6 | `NASA/GDDP-CMIP6` |

*Models in the CMIP6 ensemble:* ACCESS-CM2,CanESM5,EC-Earth3,GFDL-ESM4,MPI-ESM1-2-HR,MRI-ESM2-0,NorESM2-MM,UKESM1-0-LL.
