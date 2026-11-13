# Climate Pulse Kenya

Climate Pulse Kenya is a browser-based Admin-2 climate and resilience intelligence MVP for the pilot counties of **Garissa, Marsabit, and Turkana**.

The application combines climate indicators, population estimates, hazard exposure, early-signal rules, and derived prioritisation scores in an interactive map and dashboard. It is a static front-end application: the supplied datasets are loaded in the browser and the map uses the ArcGIS Maps SDK for JavaScript.

## What is included

- Interactive Admin-2 map with county and sub-county filtering.
- Indicator selection with standard and relative classification modes.
- Situation dashboard for hazard exposure, exposure rates, rankings, and DPI comparisons.
- Hazard analysis for rainfall, vegetation, soil moisture, and heat.
- Early Signal page with monthly SPI-3, VCI, and root-zone soil-moisture trends.
- People & Exposure views by hazard and population group.
- Climate-Demographic Risk Score (CDRS) ranking with adjustable weights.
- Data & Method page with provenance, quality information, formulas, caveats, and downloads.
- URL hash filters so selected dashboard state can be shared or bookmarked.

## Requirements

- Node.js 18 or newer
- npm

## Local development

Install dependencies:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

Open [http://localhost:5174](http://localhost:5174). Port `5174` is intentional because port `5173` is reserved for another application in the local setup.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm test` | Run the Vitest test suite |

No environment variables are required for the current MVP. The application does require network access to load the ArcGIS and Calcite assets declared in [`index.html`](./index.html).

## Project structure

```text
.
├── index.html                         Application shell and page layout
├── css/app.css                        Layout and visualization styles
├── js/app.js                          Browser application, map, interactions, and rendering
├── data/
│   ├── climatepulse.json              16-row Admin-2 feature dataset
│   └── CLIMATE_PULSE_KENYA_ADMIN2_PANEL.csv
│                                      Monthly panel used by Early Signal
├── src/
│   ├── config/indicators.ts           Indicator catalogue and classifications
│   ├── data/                          Schema and Admin-2 joins
│   ├── lib/calculations/              DPI, CDRS, and early-signal calculations
│   ├── selectors/                     Dashboard data selectors
│   └── store/                         Filter state and URL hash serialization
├── tests/phase1.test.ts               Data-contract and calculation tests
├── CLIMATE_PULSE_FIELD_GUIDE.md       Field definitions, sources, and caveats
├── climatepulse.xls                   Preserved source export
├── package.json                       Scripts and dependencies
├── tsconfig.json                      TypeScript configuration
├── vite.config.ts                     Vite development and preview configuration
└── vercel.json                        Vercel deployment configuration
```

## Data and methodology

The supplied [`climatepulse.xls`](./climatepulse.xls) export is represented at runtime by [`data/climatepulse.json`](./data/climatepulse.json). Rows are joined to map features using `ADM2_ID`.

The dataset contains 16 Admin-2 areas and includes climate, land, water, population, exposure, quality, provenance, and climate-futures fields. The monthly panel CSV provides the historical observations used to render Early Signal trends.

The application deliberately preserves the following fields as unavailable because the source field guide identifies their zero values as missing:

- `LST_NIGHT`
- `LSTN_ANOM`
- `FACC_MAX`

Derived calculations are implemented as pure TypeScript functions:

- **DPI** combines available rainfall, vegetation, soil-moisture, vegetation-health, and heat components. Weights are renormalized when components are missing.
- **Maximum single-hazard exposure** is the largest available exposure percentage across the supported hazards.
- **CDRS** combines hazard pressure, exposure, and a min-max-scaled vulnerable population component. It is a prioritisation index, not a probability of displacement or damage.
- **Early Signal** reports transparent watch, warning, and alert triggers from climate indicators. It is not a displacement forecast.

For field definitions, source dates, quality flags, formulas, and limitations, see the [Climate Pulse field guide](./CLIMATE_PULSE_FIELD_GUIDE.md).

## Testing and validation

Run the tests:

```powershell
npm test
```

Run the type check and production build:

```powershell
npm run build
```

The tests cover the Phase 1 data contract, missing-value handling, indicator metadata, Admin-2 joins, derived calculations, county rollups, population-weighted exposure, URL filters, CDRS classification, and early-signal triggers.

## Scope and limitations

- This is an MVP for the supplied pilot data, not a general-purpose national monitoring system.
- The current Climate Futures navigation item is reserved for transparent SSP2-4.5 and SSP5-8.5 comparison views.
- Population values are modelled estimates and should not be interpreted as a census.
- Exposure is shown by hazard and should not be summed across hazards without an explicit analytical justification.
- Results depend on the source data dates, valid-pixel coverage, and caveats documented in the field guide.
