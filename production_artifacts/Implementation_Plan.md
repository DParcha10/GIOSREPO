# Implementation Plan: GIOS Scientific & Competitive Transformation

**Author:** Agent 3 — Implementation Planner (@implementation-planner)  
**Target System:** Global Intelligence & Observation System (GIOS v2.5)  
**Date:** September 2026  
**Status:** Completed — Approved for Hand-off to Agent 4 (Master)  
**Destination:** `production_artifacts/Implementation_Plan.md`  
**Inputs Synthesized:**  
- `production_artifacts/Domain_Research.md` (Agent 1: Scientific Foundations & Codebase Audit)  
- `production_artifacts/Competitive_Gap_Analysis.md` (Agent 2: Competitive Benchmark & User Value Prioritization)

---

## Executive Synthesis: Bridging Scientific Rigor & Competitive Dominance

The **Global Intelligence & Observation System (GIOS)** occupies a unique and compelling niche at the intersection of planetary remote sensing, centimeter-scale drone photogrammetry, and real-time geotechnical/environmental hazard monitoring.

However, the independent investigations conducted by **Agent 1 (Domain Researcher)** and **Agent 2 (Competitive Researcher)** reveal a stark operational dichotomy:
1. **The Scientific Reality (Agent 1):** The current processing core (`app/`) contains critical radiometric and mathematical flaws. Thermal Landsat data is corrupted by over $130^\circ\text{C}$ due to indiscriminate optical scaling; Sentinel-2 surface reflectance ignores the $+1000$ DN PB 04.00+ offset, falsifying water and moisture indices; burn severity evaluates unvalidated single-date NBR thresholds; cloud masking lacks morphological dilation; and primary spectral endpoints bypass the remote sensing engine with random number generators.
2. **The Competitive Reality (Agent 2):** Compared to industry leaders (Google Earth Engine, Planet, Sentinel Hub, QGIS, DroneDeploy), GIOS operates as a static dashboard rendering vector bounding boxes rather than real imagery. It lacks dynamic Cloud-Optimized GeoTIFF (COG) tile streaming, multi-temporal swipe curtains, real drone raster ingestion, interactive contrast stretching, and polygon-level zonal statistics.

### Strategic Objective of This Plan
This Implementation Plan unifies both perspectives into an actionable, prioritized, and phased engineering roadmap. It ensures that **every pixel rendered on the screen is physically and radiometrically accurate**, while **every interaction is responsive, intuitive, and delivers decisive operational value** to geotechnical engineers, dam safety officers, and emergency responders.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      UNIFIED ARCHITECTURAL TARGET                       │
├───────────────────────────────────┬─────────────────────────────────────┤
│      SCIENTIFIC INTEGRITY         │        OPERATIONAL SPEED & UX       │
│  (Physics, Calibration, Rigor)    │     (Streaming, Comparison, UI)     │
├───────────────────────────────────┼─────────────────────────────────────┤
│ • PB 04.00+ Baseline Correction   │ • Dynamic XYZ COG Tile Server       │
│ • Distinct Optical/Thermal Scaler │ • Multi-Temporal Swipe Curtain      │
│ • Dilated Bitwise QA/SCL Masking  │ • Real Drone GeoTIFF Centimeter Zoom│
│ • Two-Scene Differencing (ΔNBR)   │ • 2%–98% Cumulative Contrast Stretch│
│ • Resampled Multi-Band Alignment  │ • Interactive Pixel & Transect Tool │
│ • Climatological MAD Anomaly      │ • Real Polygon Zonal Statistics     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## Section 1: Explicit Tradeoff Analysis & Recommended Resolutions

Where scientific correctness (Agent 1) and competitive necessity (Agent 2) conflict, the tradeoffs must be stated explicitly and resolved with pragmatic engineering decisions.

```
                     TRADEOFF RECONCILIATION SPECTRUM
                     
   SCIENTIFIC PURISM                                 COMPETITIVE AGILITY
   (Agent 1 Extremum)                                (Agent 2 Extremum)
           │                                                 │
           ▼                                                 ▼
• 10-hour SfM point cloud                          • Mock UI dropzone with fake
  reconstruction from raw JPEGs                      centimeter numbers
• Full 6S atmospheric transfer                     • Raw uncalibrated PNG tiling
  per 256x256 viewport tile                          with false-color artifacts
• Block execution unless 2 pre-                    • Single-click instantaneous
  event cloudless scenes exist                       unvalidated burn numbers
           │                                                 │
           └───────────────────────┬─────────────────────────┘
                                   │
                                   ▼
                   ENGINEERING RESOLUTION (GIOS v2.5)
                   ──────────────────────────────────
                   1. Ingest pre-stitched Drone COGs via
                      rio-tiler; external NodeODM bridge.
                   2. Decouple Tile Path (fast scaled COG)
                      from Analytical Path (full xarray cube).
                   3. Auto-harvest pre-fire baseline from
                      historical STAC index for ΔNBR.
                   4. Fixed 8 calibrated indices with dynamic
                      interactive 2%–98% UI stretch.
```

---

### Tradeoff 1: In-House Drone Photogrammetry (SfM/MVS) vs. Cloud-Native COG Ingestion

* **Scientific Correctness (Agent 1):** Full photogrammetric reconstruction requires feature detection (SIFT), robust epipolar pruning (RANSAC), non-linear bundle adjustment (Ceres Solver), dense matching (PatchMatch/SGM), Cloth Simulation Filtering (CSF) for DTM/DSM, true orthorectification with DSM ray-tracing, and Voronoi graph-cut seamline blending.
* **Competitive Necessity (Agent 2):** Building a full SfM engine inside GIOS is a massive distraction with low operational ROI (P3). Commercial UAS operators already generate orthomosaics in Pix4D, DJI Terra, or WebODM. Operators urgently need GIOS to **ingest, tile, and display the resulting centimeter-scale GeoTIFF/COG** alongside satellite layers.
* **The Conflict:** Embedding native C++/CUDA photogrammetry libraries (COLMAP/OpenSfM) into FastAPI on Windows introduces extreme build complexity, gigabyte memory footprints, and multi-hour processing runs that block the API. However, doing nothing leaves drone functionality as a mock placeholder.
* **Recommended Resolution:**
  1. **Primary Ingestion Architecture (P0):** Implement a native Cloud-Optimized GeoTIFF (COG) ingestion and pyramidal tiling pipeline using `rasterio` and `rio-tiler`. Support drag-and-drop or URL linking of pre-computed drone orthomosaics. Automatically validate georeferencing, compute accurate metric GSD from the affine transform (resolving Bug 551 in `drone_service.py`), generate internal overviews, and stream centimeter-scale tiles directly to Leaflet.
  2. **Decoupled Photogrammetry Bridge (P2 / Extension):** Create an optional asynchronous webhook worker that interfaces with an external headless NodeODM instance via REST API. If raw drone JPEG batches are submitted, GIOS offloads processing to NodeODM and registers the resulting COG upon completion without blocking the core server.

---

### Tradeoff 2: Full Radiative Transfer & Deep Masking vs. Sub-Second Dynamic XYZ Tile Latency

* **Scientific Correctness (Agent 1):** Satellite processing must enforce bitwise morphological dilation ($3\times 3$ kernel) for cloud/shadow edges, Sentinel-2 PB 04.00+ offset subtraction ($-1000$ DN), multi-resolution band re-gridding (10m vs 20m), and atmospheric calibration to prevent false positives.
* **Competitive Necessity (Agent 2):** Tile streaming must maintain a sub-600ms latency to deliver a smooth pan/zoom UX in Leaflet (matching Sentinel Hub and GEE). Loading a multi-gigabyte multi-temporal xarray dataset and running morphological scipy dilation on every 256x256 web tile request causes unbearable latency and HTTP 504 gateway timeouts.
* **The Conflict:** Rigorous data cube processing is too slow for real-time interactive mapping, but serving uncalibrated raw DN tiles corrupts water indices (+10% reflectance bias) and exposes users to cloud artifacts.
* **Recommended Resolution:** **Two-Tier Decoupled Processing Architecture:**
  1. **Fast Interactive Tile Path (`/api/v1/tiles/...`):** Powered by `rio-tiler`. Reads windowed byte ranges directly from Planetary Computer COG assets via HTTP range requests. Applies lightweight, vectorized mathematical transforms on the fly:
     - PB 04.00+ offset: $\rho = (\text{DN} - 1000) \times 0.0001$
     - Landsat C2 L2 optical: $\rho = \text{DN} \times 0.0000275 - 0.2$
     - Landsat C2 L2 thermal: $T_C = (\text{DN} \times 0.00341802 + 149.0) - 273.15$
     - Fast SCL/QA pixel masking (direct bitwise filter without dilation for viewport tiles)
     - Dynamic contrast stretching (2%–98% cumulative count cut) and RGBA colormap rendering. Tile latency: **250–450ms**.
  2. **Deep Analytical Path (`/api/v1/analysis/...`):** Powered by `odc-stac` and `xarray`. When the user requests a formal report, zonal polygon statistics, or time-series anomaly detection, the system loads the full bounding data cube, executes morphological buffer dilation ($3\times 3$ kernel), performs 10m/20m band re-gridding, and calculates true statistical distributions. Latency: **1.5–3.5s**, managed via async response or background caching.

---

### Tradeoff 3: Mandatory Pre/Post Fire Differencing vs. Instant User Single-Date Query

* **Scientific Correctness (Agent 1):** Single-date NBR thresholds are scientifically invalid (Bug 3). Bare soil, rock, urban asphalt, and water bodies naturally exhibit negative NBR ($< -0.1$), causing unburned cities and dams to be flagged as "High Severity Burns". True burn severity requires differenced NBR ($\Delta\text{NBR} = \text{NBR}_{\text{pre}} - \text{NBR}_{\text{post}}$) evaluated against USGS FIREMON standards.
* **Competitive Necessity (Agent 2):** Users demand immediate analysis. Forcing an emergency responder to manually search, download, and align a pre-fire baseline scene before seeing results creates crippling friction.
* **The Conflict:** The user wants a one-click answer for a current fire, but the algorithm mathematically requires two distinct, perfectly aligned temporal acquisitions.
* **Recommended Resolution:** **Automated Baseline Harvesting & Paired Scene Contract:**
  1. **Dual-Scene API Contract:** Update `BurnSeverityRequest` to accept `post_event_date` and an optional `pre_event_date`.
  2. **Automated Baseline Resolver:** If `pre_event_date` is omitted, the backend automatically queries the Planetary Computer STAC catalog for the most cloud-free acquisition over the same AOI during the matching phenological window exactly one year prior (or 30–60 days pre-incident).
  3. **Visual Confirmation via Swipe Curtain:** The UI presents the baseline pre-fire optical image and post-fire optical image side-by-side using the interactive split-screen curtain, overlaid with the USGS FIREMON categorized $\Delta\text{NBR}$ mask. The user gets instant results without compromising scientific validity.

---

### Tradeoff 4: Absolute Physical Units vs. Dynamic Contrast Stretching & Custom Colormaps

* **Scientific Correctness (Agent 1):** Radiometric parameters must be preserved in physical SI units: Surface Reflectance $\rho \in [0.0, 1.0]$, Land Surface Temperature $T \in [^\circ\text{C}]$, and standard dimensionless index ranges $[-1.0, 1.0]$. Artificial stretches distort physical values.
* **Competitive Necessity (Agent 2):** Soil moisture anomalies on dry rock or tailings embankments often cluster within narrow bands (e.g., NDMI between $0.14$ and $0.26$). On a static $[-1.0, 1.0]$ color ramp, the entire dam looks like a uniform grey-green blur. Contrast stretching (2%–98% percentile cut) and specialized colormaps (Turbo, Viridis, RdYlBu) are essential for human visual diagnostics.
* **The Conflict:** Absolute scales hide localized hazards; stretched scales can mislead users into misinterpreting relative contrast as absolute danger.
* **Recommended Resolution:** **Strict Decoupling of the Data Layer and Symbology Layer:**
  1. **Data Layer:** All internal raster arrays, xarray datasets, pixel inspector tooltips, and zonal statistics endpoints strictly compute and return true un-stretched physical values (reflectance, Celsius, true index).
  2. **Symbology Layer:** The tile renderer and UI provide dynamic contrast stretching controls (`rescale=min,max` or `stretch=2,98`). The UI legend dynamically updates to display the mapped min/max bounds alongside a clear note: *"Display stretched for visual inspection; pixel values represent true biophysical metrics."*

---

### Tradeoff 5: Complex Phenological Decomposition vs. Real-Time Anomaly Alerting

* **Scientific Correctness (Agent 1):** Simple static z-scores fail in temperate climates because seasonal phenology causes large cyclical shifts. Normal winter NDVI is $0.25$ while summer NDVI is $0.75$. Evaluating against an annual mean creates false winter anomalies and misses severe summer droughts. BFAST or monthly climatological baselines ($z_{\text{seasonal}} = \frac{x_t - \text{Median}(X_{\text{month}})}{1.4826 \times \text{MAD}(X_{\text{month}})}$) are required.
* **Competitive Necessity (Agent 2):** Automated alerting and dashboard sparklines must compute instantly when new scenes arrive without requiring 10-year dense pixel re-fits.
* **The Conflict:** Full pixel-by-pixel harmonic BFAST decomposition across decades of data requires massive compute and time, conflicting with real-time alert dispatch.
* **Recommended Resolution:**
  1. **Zonal Climatological Baselines:** Pre-compute and store monthly climatological medians and MAD values for monitored infrastructure polygons (dam footprints, reservoir bounds) in the database.
  2. When a new satellite scene arrives, compute the zonal median for the asset and evaluate against the pre-indexed monthly climatological baseline in $<50\text{ ms}$.
  3. Reserve deep pixel-level non-parametric trend analysis (Theil-Sen / Mann-Kendall) for on-demand inspection in the Analytics tab.

---

### Tradeoff 6: Custom JavaScript Sandboxing (Evalscripts) vs. Verified Core Formulas

* **Scientific Correctness (Agent 1):** Remote sensing indices have strict mathematical formulations and band-wavelength dependencies (e.g., NDCI requires 705nm RedEdge1 and 665nm Red; MNDWI requires SWIR1, not SWIR2). Unconstrained user band math leads to bogus formulas.
* **Competitive Necessity (Agent 2):** Sentinel Hub is famous for its custom Evalscript sandbox. However, Agent 2's gap analysis deprioritized arbitrary JS sandboxing to P3 due to extreme security complexity (V8 isolate overhead) and recognized that 8 core industry indices satisfy 95% of operational needs.
* **The Conflict:** Full custom scripting provides flexibility but creates security attack vectors and invalid science.
* **Recommended Resolution:** **Standardized Verified Spectral Library with Parameter Tuning:**
  - Build a curated, mathematically certified catalog of 8 core biophysical indices: `NDVI`, `EVI`, `SAVI`, `NDWI`, `MNDWI`, `NDMI`, `NDCI`, and `NBR` / `ΔNBR`, plus `LST`.
  - Allow user parameter customization (e.g., modifying $L_{\text{soil}}$ in SAVI or threshold cutoffs in NDMI) via verified parameters rather than arbitrary code execution.

---

## Section 2: Prioritized, Ordered Implementation Plan

The plan is organized into **6 chronological phases** with strict dependency enforcement. Each phase is broken into discrete work packages assigned to specific agents.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PHASED EXECUTION GANTT / DEPENDENCY                     │
├─────────┬─────────────────────────────────────────────────┬────────────────┤
│ Phase 0 │ Foundational Scaffolding & Scientific Bug Fixes │ P0 (Day 1)     │
├─────────┼─────────────────────────────────────────────────┼────────────────┤
│ Phase 1 │ Dynamic COG Tile Engine & STAC Pipeline         │ P0 (Day 2-3)   │
├─────────┼─────────────────────────────────────────────────┼────────────────┤
│ Phase 2 │ Centimeter-Scale Drone Ingestion & Pyramids     │ P0 (Day 3-4)   │
├─────────┼─────────────────────────────────────────────────┼────────────────┤
│ Phase 3 │ Interactive Diagnostic Command Center UX        │ P1 (Day 4-5)   │
├─────────┼─────────────────────────────────────────────────┼────────────────┤
│ Phase 4 │ Phenological Seasonality & Automated Alerts     │ P1/P2 (Day 6)  │
├─────────┼─────────────────────────────────────────────────┼────────────────┤
│ Phase 5 │ Verification, Health Daemon & Release Archival  │ P0 (Day 7)     │
└─────────┴─────────────────────────────────────────────────┴────────────────┘
```

---

### Phase 0: Foundational Scaffolding & Critical Scientific Remediations (P0 — Immediate Blockers)

*Goal: Fix breaking radiometric bugs in `app/services/` and establish shared API schemas and config for both frontend and backend.*

#### Task 0.1: Shared Data Models, Enums, and API Contracts
- **Assigned Agent:** `@core-engineer`
- **Files Modified:** `app/models/schemas.py`, `gios-react/src/api/giosApi.js`
- **Actions:**
  1. Define unified Pydantic models for spectral index requests, burn severity differencing (`pre_event_date`, `post_event_date`), dynamic tile configuration (`rescale`, `colormap`), and drone COG registration.
  2. Define `SpectralIndex` enum: `NDVI`, `EVI`, `SAVI`, `NDWI`, `MNDWI`, `NDMI`, `NDCI`, `NBR`, `LST`.
  3. Export TypeScript/JSDoc type contracts so `@frontend` consumes exact API structures without ad-hoc mocking.
- **Verification:** Import models across tests without circular dependencies.

#### Task 0.2: Landsat Optical vs. Thermal Radiometric Calibration Fix
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/preprocessing.py`, `app/services/indices.py`
- **Actions:**
  1. Refactor `PreprocessingService.normalise_reflectance()` to inspect band names.
  2. Apply optical scaling ($\text{DN} \times 0.0000275 - 0.2$) strictly to Landsat bands 1–7.
  3. Apply thermal calibration ($T_C = (\text{DN} \times 0.00341802 + 149.0) - 273.15$) strictly to thermal Band 10 (`lwir11` / `b10`).
  4. Ensure `indices.py` consumes calibrated thermal arrays without double-scaling.
- **Verification:** Test Landsat thermal DN of $40,000$ resolves to $+12.57^\circ\text{C}$ instead of $-124.1^\circ\text{C}$.

#### Task 0.3: Sentinel-2 PB 04.00+ Radiometric Baseline Offset Fix
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/preprocessing.py`
- **Actions:**
  1. Implement check for Sentinel-2 Processing Baseline $\ge 04.00$ (or acquisitions after Jan 25, 2022).
  2. Apply additive offset: $\rho = (\text{DN} - 1000) \times 0.0001$.
  3. Support backward compatibility for legacy L2A scenes: $\rho = \text{DN} \times 0.0001$ if baseline $< 04.00$.
- **Verification:** Test dark water target DN of $200$ resolves to $\rho = 0.020$ instead of corrupt $\rho = 0.120$.

#### Task 0.4: Morphological Dilation for Cloud/Shadow Masking
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/preprocessing.py`
- **Actions:**
  1. Expand Landsat `mask_landsat_qa()` to check bits 0 (fill), 1 (dilated cloud), 2 (cirrus), 3 (cloud), 4 (shadow), and 5 (snow).
  2. Expand Sentinel-2 `mask_sentinel_scl()` to mask classes 0 (no data), 1 (saturated/defective), 3 (cloud shadow), 8 (medium cloud), 9 (high cloud), 10 (cirrus), and 11 (snow/ice).
  3. Apply `scipy.ndimage.binary_dilation` with a $3\times 3$ structuring element (configurable dilation buffer: default 3 pixels / 30–60m) to eliminate semi-transparent cloud margins and shadow penumbras.
- **Verification:** Unit test verifies cloudy synthetic raster has clouds and edges masked to NaN.

#### Task 0.5: Replace Single-Date Burn Severity with Pre/Post Differenced $\Delta\text{NBR}$
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/api/routes/wildfire.py`, `app/services/indices.py`
- **Actions:**
  1. Refactor `/wildfire/burn-severity` to accept paired arrays or paired scene IDs (`pre_nbr` and `post_nbr`).
  2. Compute $\Delta\text{NBR} = \text{NBR}_{\text{pre}} - \text{NBR}_{\text{post}}$.
  3. Enforce USGS FIREMON severity classification matrix (High $\ge 0.660$, Mod-High $0.440–0.660$, Mod-Low $0.270–0.440$, Low $0.100–0.270$, Unburned $< 0.100$).
  4. Provide optional RdNBR computation ($\text{RdNBR} = \Delta\text{NBR} / \sqrt{|\text{NBR}_{\text{pre}}|}$) for sparse canopy environments.
- **Verification:** Test verifies that an unburned bare soil area with static $\text{NBR} = -0.20$ computes $\Delta\text{NBR} = 0.00$ and is classified as "Unburned", eliminating false active burn alarms.

---

### Phase 1: Dynamic COG Tile Engine & Operational STAC Pipeline (P0 — Core Functionality)

*Goal: Eliminate mock/random endpoints and stream real, calibrated Cloud-Optimized GeoTIFF tiles directly to the web viewport.*

#### Task 1.1: STAC Asset Signing & Resampled Data Cube Loader
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/data_acquisition.py`, `app/config.py`
- **Actions:**
  1. Integrate `planetary_computer.sign_inplace()` in `DataAcquisitionService.search_scenes()` to sign STAC item asset URLs, resolving HTTP 403 Forbidden errors.
  2. Implement `load_data_cube()` using `odc.stac.load()` with explicit reprojection, target CRS (`EPSG:3857`), target resolution (10m for Sentinel-2, 30m for Landsat), and bilinear resampling for continuous reflectance bands.
  3. Wire `preprocessing.py` masking and radiometric calibration directly into `load_data_cube()`.
- **Verification:** Query Planetary Computer for Sentinel-2 over Lake Mead and verify 6-band calibrated xarray dataset loads into memory without dimension mismatch.

#### Task 1.2: Dynamic COG XYZ Raster Tile Server
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/api/routes/analysis.py`, `app/services/tile_service.py` (new)
- **Actions:**
  1. Implement FastAPI tile endpoint:
     `GET /api/v1/tiles/{collection}/{item_id}/{z}/{x}/{y}.png`
     Accepting query parameters: `index` (`ndmi`, `ndvi`, `mndwi`, `rgb`, etc.), `rescale` (`min,max`), and `colormap` (`viridis`, `turbo`, `rdylbu`, `spectral`, `terrain`).
  2. Leverage `rio-tiler` to read requested tile bounds from the signed COG URL using HTTP range requests.
  3. Execute on-the-fly index band arithmetic and apply dynamic linear rescaling to $[0, 255]$.
  4. Render 256x256 8-bit RGBA PNG with transparency for masked/nodata pixels.
  5. Add HTTP caching headers (`Cache-Control: public, max-age=86400`) and local tile disk cache (`.gios_cache/tiles/`).
- **Verification:** Request `/api/v1/tiles/.../12/1234/2345.png?index=ndmi&colormap=spectral` and verify valid PNG bytes returned in $<500\text{ ms}$.

#### Task 1.3: Real Multi-Spectral Index Computation & Zonal Extraction
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/api/routes/analysis.py`, `app/services/indices.py`
- **Actions:**
  1. Remove mock `np.random.normal()` code from `/analysis/indices`.
  2. Implement real computation: fetch calibrated data cube $\to$ calculate requested spectral index array $\to$ mask invalid pixels $\to$ execute summary statistics (mean, median, std, p10, p90, min, max, valid pixel percentage).
  3. Ensure Sentinel-2 20m bands (B05 RedEdge, B11 SWIR1) are resampled to 10m before computing NDCI and MNDWI.
- **Verification:** Query `/analysis/indices` for NDMI over Tailings Dam 04 and verify true deterministic statistical distribution matching physical raster.

#### Task 1.4: Frontend Leaflet TileLayer Integration
- **Assigned Agent:** `@frontend`
- **Files Modified:** `gios-react/src/pages/MapExplorer.jsx`, `gios-react/src/api/giosApi.js`
- **Actions:**
  1. Replace static vector bounding-box-only display with dynamic Leaflet `TileLayer`.
  2. When an event or hazard site is selected, fetch the active scene metadata and add the raster `TileLayer` pointing to `/api/v1/tiles/{collection}/{item_id}/{z}/{x}/{y}.png?index={active_index}&colormap={active_colormap}`.
  3. Add layer opacity slider (0% to 100%) allowing smooth fading over the satellite basemap.
  4. Display loading spinner indicator while tiles are in flight.
- **Verification:** Select "Tailings Dam 04" in Map Explorer; verify real NDMI moisture raster renders over the satellite imagery.

---

### Phase 2: Centimeter-Scale Drone Ingestion & Multi-Scale Fusion (P0/P1 — Key Differentiator)

*Goal: Deliver on the "Macro-to-Micro: 10m Satellite Screening → 2.8cm Drone Inspection" mission by ingesting and rendering real drone COG orthomosaics.*

#### Task 2.1: Drone COG Ingestion, Validation & Pyramidal Tiling Engine
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/drone_service.py`, `app/api/routes/drone.py`
- **Actions:**
  1. Upgrade `DroneService.register_orthomosaic()`:
     - Accept uploaded `.tif` / `.tiff` or external S3/HTTP URL.
     - Validate georeferencing using `rasterio`: extract CRS, affine transform, bounding box, and band count.
     - Fix GSD calculation: if coordinates are in EPSG:4326, project bounding center to UTM or compute metric distance using Great Circle distance ($1^\circ \text{ lat} \approx 111.32\text{ km}$, $1^\circ \text{ lon} \approx 111.32\text{ km} \cdot \cos\phi$).
  2. If file is not internally tiled, generate Cloud-Optimized GeoTIFF with internal tiling (256x256) and overviews (`rio cogeo` / `rasterio.shutil.copy`).
  3. Expose drone tile endpoint:
     `GET /api/v1/drone/{ortho_id}/tiles/{z}/{x}/{y}.png`
     Supporting zoom levels up to Zoom 22 (centimeter resolution).
- **Verification:** Ingest a drone orthomosaic GeoTIFF; verify tiles serve correctly at Zoom 20 with sub-second response.

#### Task 2.2: Drone Multi-Scale Inspection UI & Centimeter Zoom
- **Assigned Agent:** `@frontend`
- **Files Modified:** `gios-react/src/pages/MapExplorer.jsx`, `gios-react/src/components/DroneUploadModal.jsx` (new)
- **Actions:**
  1. Replace the mock drag-and-drop placeholder with an active file upload / URL registration modal.
  2. When a drone survey is active, add the drone COG tile layer to Leaflet with `maxNativeZoom: 22` and `maxZoom: 24`.
  3. Add a "Macro/Micro Zoom Toggle" button:
     - "Macro View (10m)": Centers camera on regional Sentinel-2 watershed (Zoom 13).
     - "Micro View (2.8cm)": Smoothly zooms camera directly into the high-resolution drone survey bounds (Zoom 19).
- **Verification:** Click "Inspect Drone Survey" and observe smooth camera transition into centimeter-grade imagery.

---

### Phase 3: Interactive Diagnostic Command Center UX (P1 — Professional Intelligence)

*Goal: Provide professional diagnostic tools: swipe curtain, interactive pixel inspector, embankment transect cross-sections, and dynamic contrast stretching.*

#### Task 3.1: Multi-Temporal Swipe & Split-Screen Curtain Slider
- **Assigned Agent:** `@frontend`
- **Files Modified:** `gios-react/src/pages/MapExplorer.jsx`, `gios-react/src/components/SwipeCurtain.jsx` (new)
- **Actions:**
  1. Implement a draggable vertical curtain slider over the Leaflet map container using CSS `clip-path: polygon(...)`.
  2. Synchronize two raster layers:
     - Left Pane: Baseline Optical Imagery or Pre-Event Date (e.g., Dry Season Baseline).
     - Right Pane: Anomaly Spectral Index or Post-Event Date (e.g., Post-Storm Seepage).
  3. Support keyboard arrow navigation and touch drag for tablet/field use.
  4. Include date/sensor badges on both left and right panes.
- **Verification:** Drag slider across Oroville Dam; verify clear visual division between baseline satellite imagery and high-saturation NDMI moisture layer.

#### Task 3.2: Interactive Pixel Inspector & Coordinate Probe
- **Assigned Agent:** `@core-engineer` (contract) & `@backend` & `@frontend`
- **Files Modified:** `app/api/routes/analysis.py`, `gios-react/src/pages/MapExplorer.jsx`
- **Actions:**
  1. Backend (`@backend`): Implement `GET /api/v1/analysis/pixel-probe?lat={lat}&lng={lng}&collection={col}&item_id={id}`.
     - Extract raw reflectance values for all bands, compute calibrated spectral indices, and query 6-month historical values at that coordinate.
  2. Frontend (`@frontend`): Add an "Inspect Pixel" tool in Map Explorer. Clicking anywhere on the map opens a floating glassmorphic inspection card showing:
     - Exact lat/long and elevation
     - Spectral profile bar chart (Blue, Green, Red, NIR, SWIR1, SWIR2, Thermal)
     - Computed indices table (NDVI, NDMI, MNDWI)
     - 6-month historical sparkline indicating whether current moisture is anomalous.
- **Verification:** Click dam embankment toe; verify popover displays valid physical reflectance values and NDMI score.

#### Task 3.3: Dynamic Contrast Stretching & Custom Colormap Studio
- **Assigned Agent:** `@frontend`
- **Files Modified:** `gios-react/src/pages/MapExplorer.jsx`, `gios-react/src/components/SpectralStudioControls.jsx`
- **Actions:**
  1. In "Orthomosaic Spectral Studio", add dynamic range slider controls for `min` and `max` rescale values.
  2. Provide a "2%–98% Cumulative Cut" auto-stretch button that calculates optimal visual contrast.
  3. Add colormap selector dropdown: `Spectral` (default for moisture), `Viridis` (vegetation), `Turbo` (thermal/burn), `RdYlBu`, and `Magma`.
  4. Pass updated `rescale` and `colormap` parameters to the tile URL, triggering instant visual restyling.
- **Verification:** Adjust NDMI rescale from standard `[-0.2, 0.5]` to `[0.10, 0.30]`; verify subtle dam moisture gradients become vividly discernible.

#### Task 3.4: Real Polygon Zonal Statistics over Custom AOIs
- **Assigned Agent:** `@backend` & `@frontend`
- **Files Modified:** `app/api/routes/analysis.py`, `gios-react/src/pages/MapExplorer.jsx`
- **Actions:**
  1. Frontend: Enable Leaflet draw polygon / rectangle tool in Map Explorer.
  2. Backend: Implement `POST /api/v1/analysis/zonal-stats`:
     - Accept GeoJSON Polygon geometry, collection, item ID, and spectral index.
     - Clip xarray raster cube to geometry using `rioxarray.clip()`.
     - Calculate true area (hectares), pixel count, histogram distribution (20 bins), mean, median, standard deviation, and percentiles (p10, p25, p75, p90).
  3. Frontend: Render distribution histogram and summary statistics card in the slide-out analytical drawer.
- **Verification:** Draw polygon around tailings holding pond; verify calculated area in hectares matches true ground truth within 2%.

---

### Phase 4: Phenological Seasonality, Dynamic Climatology & Automated Alerting (P1/P2)

*Goal: Replace flawed static z-scores with seasonal climatological baselines and automate hazard anomaly alerting.*

#### Task 4.1: Seasonal Climatological Baseline & Non-Parametric Trend Engine
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/timeseries.py`, `app/api/routes/timeseries.py`
- **Actions:**
  1. Replace global static z-score with monthly climatological Median Absolute Deviation (MAD):
     $$z_{\text{seasonal}}(t) = \frac{x_t - \text{Median}\left(X_{\text{month}(t)}\right)}{1.4826 \times \text{MAD}\left(X_{\text{month}(t)}\right)}$$
  2. Implement non-parametric Theil-Sen median slope estimator and Mann-Kendall test for multi-year trend significance, replacing flawed ordinary least squares (OLS) regression.
  3. Return seasonal baseline envelope (p10 to p90 band) alongside historical points in Chart.js timeseries endpoints.
- **Verification:** Run timeseries on 3 years of synthetic seasonal NDVI; verify winter values are not falsely flagged as anomalies, while genuine mid-summer moisture drops are flagged at $z > +2.5\sigma$.

#### Task 4.2: Automated Ingestion Watchdog & Persistent Anomaly Webhook Engine
- **Assigned Agent:** `@backend`
- **Files Modified:** `app/services/alerting.py`, `app/services/event_service.py`
- **Actions:**
  1. Implement background monitoring task (invoked via `health_check_daemon.py` or scheduler):
     - Query STAC catalog for newly published scenes over registered asset bounding boxes.
     - When a new scene is detected, execute cloud-masked zonal stats for the asset.
     - If seasonal anomaly exceeds threshold ($|z| \ge 2.5$), automatically generate a new system Alert record in SQLite.
  2. Support outgoing webhook dispatch (Slack/Email/HTTP POST) with alert payload and crop thumbnail.
- **Verification:** Simulate arrival of new high-moisture scene; verify system creates an alert in `gios.db` without manual user initiation.

---

### Phase 5: Verification, Quality Assurance, Health Monitoring & Release Archival (P0/P2)

*Goal: Ensure end-to-end stability, performance benchmarks, continuous health monitoring, and clean artifact handoff.*

#### Task 5.1: Test Suite Expansion & Scientific Verification
- **Assigned Agent:** `@debugger`
- **Files Modified:** `tests/test_scientific_rigor.py` (new), `tests/test_tile_server.py` (new)
- **Actions:**
  1. Create comprehensive unit tests verifying:
     - Optical vs. thermal Landsat calibration values.
     - Sentinel-2 PB 04.00+ offset application.
     - Differenced NBR calculation against USGS FIREMON categories.
     - Bitwise QA/SCL cloud mask dilation.
     - Tile server XYZ bounds calculation and 256x256 PNG encoding.
  2. Verify all existing tests in `tests/` pass with zero regressions.
- **Verification:** Run `pytest tests/` and verify 100% pass rate.

#### Task 5.2: Production Health Monitor Daemon Upgrade
- **Assigned Agent:** `@health-monitor`
- **Files Modified:** `health_check_daemon.py`, `production_artifacts/Health_Status.md`
- **Actions:**
  1. Update `health_check_daemon.py` to monitor:
     - FastAPI backend responsiveness (`/health`, `/api/v1/tiles/...` latency)
     - STAC endpoint reachability (Planetary Computer SAS signing)
     - Tile cache storage utilization (`.gios_cache/`)
     - Memory footprint during xarray raster operations
  2. Continuously update `production_artifacts/Health_Status.md`.
- **Verification:** Daemon executes check cycle without error and reports healthy status.

#### Task 5.3: Documentation, Version Tagging & Milestone Archival
- **Assigned Agent:** `@archivist`
- **Files Modified:** `GIOS_Project_Documentation.md`, `README.md`, `production_artifacts/Task_Board.md`
- **Actions:**
  1. Update system documentation reflecting the new COG tile architecture, scientific formulas, and drone ingestion capabilities.
  2. Ensure all completed tasks on `production_artifacts/Task_Board.md` are documented with git commit hashes and verification proofs.
  3. Create release archive tag `v2.5.0-scientific-core`.
- **Verification:** Task board reflects complete status and documentation is in sync.

---

## Section 3: Agent Assignment Matrix

Every task is mapped to exactly one primary agent with explicit prerequisites, inputs, deliverables, and acceptance criteria.

| Task ID | Work Package | Assigned Agent | Dependencies | Deliverables & Files | Acceptance Criteria |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **T-01** | Shared Schemas, API Contracts & Config | `@core-engineer` | None | `app/models/schemas.py`<br>`gios-react/src/api/giosApi.js` | Full TypeScript/Pydantic type parity; no circular imports. |
| **T-02** | Landsat Optical vs. Thermal Calibration | `@backend` | T-01 | `app/services/preprocessing.py`<br>`app/services/indices.py` | Band 10 DN 40,000 yields $+12.57^\circ\text{C}$ ($285.7\text{ K}$). |
| **T-03** | Sentinel-2 PB 04.00+ Offset Correction | `@backend` | T-01 | `app/services/preprocessing.py` | PB $\ge 04.00$ subtracts 1000 DN; dark water reflectance is valid. |
| **T-04** | Bitwise QA/SCL Cloud Mask Dilation | `@backend` | T-01 | `app/services/preprocessing.py` | $3\times 3$ morphological dilation masks cloud edges and shadows. |
| **T-05** | Pre/Post $\Delta\text{NBR}$ Burn Severity Differencing | `@backend` | T-01 | `app/api/routes/wildfire.py`<br>`app/services/indices.py` | Static unburned soil ($\text{NBR} = -0.2$) yields $\Delta\text{NBR} = 0.0$ (Unburned). |
| **T-06** | STAC SAS Signing & Resampled Data Cube | `@backend` | T-01, T-04 | `app/services/data_acquisition.py` | Planetary Computer loads multi-band cube at 10m without 403 error. |
| **T-07** | Dynamic XYZ COG Tile Server Endpoint | `@backend` | T-02, T-03, T-06 | `app/services/tile_service.py`<br>`app/api/routes/analysis.py` | Serves 256x256 PNG tiles on demand in $<500\text{ ms}$. |
| **T-08** | Real Multi-Spectral Zonal Indices Endpoint | `@backend` | T-06, T-07 | `app/api/routes/analysis.py` | Replaces random numbers with real deterministic raster stats. |
| **T-09** | Dynamic Leaflet TileLayer Integration | `@frontend` | T-01, T-07 | `gios-react/src/pages/MapExplorer.jsx` | Map Explorer renders live COG tiles with opacity slider. |
| **T-10** | Drone COG Ingestion & Metric GSD Fix | `@backend` | T-01 | `app/services/drone_service.py`<br>`app/api/routes/drone.py` | Accepts GeoTIFF; computes correct metric GSD; generates overviews. |
| **T-11** | Drone Centimeter-Zoom UI & Ingestion Modal | `@frontend` | T-01, T-10 | `gios-react/src/pages/MapExplorer.jsx`<br>`gios-react/src/components/DroneUploadModal.jsx` | Uploads drone GeoTIFF; zooms smoothly to Zoom 20–22. |
| **T-12** | Multi-Temporal Swipe Curtain Component | `@frontend` | T-09 | `gios-react/src/components/SwipeCurtain.jsx`<br>`gios-react/src/pages/MapExplorer.jsx` | Draggable split curtain compares baseline vs. anomaly layer. |
| **T-13** | Interactive Pixel Inspector Tool | `@backend`<br>`@frontend` | T-07, T-09 | `app/api/routes/analysis.py`<br>`gios-react/src/pages/MapExplorer.jsx` | Clicking map displays multi-band spectral chart and true value. |
| **T-14** | Dynamic Contrast Stretch & Colormap Controls | `@frontend` | T-07, T-09 | `gios-react/src/components/SpectralStudioControls.jsx` | 2%–98% auto-stretch dynamically updates tile rendering. |
| **T-15** | Real Polygon Zonal Statistics Endpoint & Tool | `@backend`<br>`@frontend` | T-06, T-08 | `app/api/routes/analysis.py`<br>`gios-react/src/pages/MapExplorer.jsx` | User-drawn polygon returns real hectare area and histogram. |
| **T-16** | Seasonal Climatological MAD & Theil-Sen | `@backend` | T-01 | `app/services/timeseries.py` | Seasonally normalized anomaly eliminates false winter alarms. |
| **T-17** | Automated Anomaly Watchdog & Webhooks | `@backend` | T-16 | `app/services/alerting.py` | Automated background check detects anomalies $\ge 2.5\sigma$. |
| **T-18** | End-to-End Scientific Verification Suite | `@debugger` | T-02 to T-15 | `tests/test_scientific_rigor.py`<br>`tests/test_tile_server.py` | 100% test pass rate across all mathematical modules. |
| **T-19** | Health Daemon Watchdog & Tile Cache Monitor | `@health-monitor` | T-07, T-10 | `health_check_daemon.py`<br>`production_artifacts/Health_Status.md` | Continuous watchdog monitoring tile latency and cache health. |
| **T-20** | System Documentation, Tagging & Milestone Archival | `@archivist` | All Tasks | `GIOS_Project_Documentation.md`<br>`production_artifacts/Task_Board.md` | Complete documentation and clean `v2.5.0` tag. |

---

## Section 4: Concrete API Contracts & Schemas (For Agent 5 Core Engineer)

To ensure seamless parallel implementation between `@backend` (Agent 6) and `@frontend` (Agent 7), the following API contracts are formally specified.

### Contract 1: Dynamic XYZ Tile Server
```http
GET /api/v1/tiles/{collection}/{item_id}/{z}/{x}/{y}.png
    ?index={index_name}
    &rescale={min},{max}
    &colormap={palette}
```
* **Path Parameters:**
  - `collection` (string): e.g., `sentinel-2-l2a`, `landsat-c2-l2`, `drone`
  - `item_id` (string): STAC Item ID or registered Drone Orthomosaic ID
  - `z`, `x`, `y` (integers): Standard Web Mercator tile coordinates
* **Query Parameters:**
  - `index` (optional, default `rgb`): `ndmi`, `ndvi`, `mndwi`, `ndci`, `nbr`, `lst`, `rgb`
  - `rescale` (optional, string): e.g., `-0.2,0.6` or `2,98` (percentile stretch)
  - `colormap` (optional, default `spectral`): `viridis`, `turbo`, `rdylbu`, `spectral`, `terrain`, `magma`
* **Response:** Binary image (`image/png`), 256x256 pixels, RGBA format, transparent for nodata/masked.

### Contract 2: Pre/Post Differenced Burn Severity
```json
POST /api/v1/wildfire/burn-severity
{
  "aoi_id": "TAILINGS-04",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-121.5, 39.5], [-121.4, 39.5], [-121.4, 39.6], [-121.5, 39.6], [-121.5, 39.5]]]
  },
  "pre_event_date": "2025-08-15",
  "post_event_date": "2026-08-20"
}
```
* **Response (200 OK):**
```json
{
  "aoi_id": "TAILINGS-04",
  "pre_event_date": "2025-08-15",
  "post_event_date": "2026-08-20",
  "mean_dnbr": 0.482,
  "mean_rdnbr": 0.612,
  "burned_area_hectares": 1420.5,
  "categories": [
    { "category": "High Severity", "min_dnbr": 0.660, "percentage": 28.4, "hectares": 403.4 },
    { "category": "Moderate-High Severity", "min_dnbr": 0.440, "percentage": 34.1, "hectares": 484.4 },
    { "category": "Moderate-Low Severity", "min_dnbr": 0.270, "percentage": 22.0, "hectares": 312.5 },
    { "category": "Low Severity", "min_dnbr": 0.100, "percentage": 11.2, "hectares": 159.1 },
    { "category": "Unburned / Low Change", "min_dnbr": -0.100, "percentage": 4.3, "hectares": 61.1 }
  ],
  "tile_url_template": "/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png?pre=2025-08-15&post=2026-08-20"
}
```

### Contract 3: Interactive Pixel Probe
```http
GET /api/v1/analysis/pixel-probe?lat=39.521&lng=-121.482&collection=sentinel-2-l2a&item_id=S2A_MSIL2A_20260820
```
* **Response (200 OK):**
```json
{
  "coordinates": { "latitude": 39.521, "longitude": -121.482 },
  "acquisition_date": "2026-08-20T18:42:11Z",
  "surface_reflectance": {
    "blue": 0.038,
    "green": 0.052,
    "red": 0.041,
    "rededge1": 0.098,
    "nir": 0.320,
    "swir1": 0.142,
    "swir2": 0.081
  },
  "indices": {
    "ndvi": 0.773,
    "ndmi": 0.385,
    "mndwi": -0.464,
    "ndci": 0.410
  },
  "climatological_context": {
    "historical_august_median_ndmi": 0.210,
    "seasonal_z_score": 2.84,
    "anomaly_flag": "HIGH_MOISTURE_ANOMALY"
  }
}
```

### Contract 4: Real Polygon Zonal Statistics
```json
POST /api/v1/analysis/zonal-stats
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-121.49, 39.51], [-121.47, 39.51], [-121.47, 39.53], [-121.49, 39.53], [-121.49, 39.51]]]
  },
  "collection": "sentinel-2-l2a",
  "item_id": "S2A_MSIL2A_20260820",
  "index": "ndmi"
}
```
* **Response (200 OK):**
```json
{
  "index": "ndmi",
  "area_hectares": 384.2,
  "valid_pixels": 38420,
  "cloud_covered_pixels": 0,
  "statistics": {
    "mean": 0.312,
    "median": 0.298,
    "std_dev": 0.084,
    "min": 0.051,
    "max": 0.684,
    "percentile_10": 0.182,
    "percentile_90": 0.441
  },
  "histogram": {
    "bin_edges": [-0.2, -0.1, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    "counts": [0, 0, 210, 1420, 8900, 16400, 8500, 2800, 190]
  }
}
```

---

## Section 5: Risk Assessment & Mitigation Strategies

| Risk Category | Potential Failure Mode | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :---: | :---: | :--- |
| **STAC Connectivity** | Microsoft Planetary Computer rate limits or SAS token generation fails. | High | Medium | Cache signed asset URLs with TTL (1 hour); maintain pre-cached fallback rasters in `.gios_cache/` for core demo benchmark sites. |
| **Memory Exhaustion** | Loading high-resolution or multi-temporal xarray cubes exceeds server RAM. | High | Low | Enforce windowed reading (`odc-stac` with explicit bounding box chunks); stream dynamic tiles using `rio-tiler` byte-range reads without loading full rasters into memory. |
| **Drone Ingestion** | User uploads massive unprojected or corrupt GeoTIFF (e.g., in geographic degrees without CRS). | Medium | High | Rigorous CRS validation in `DroneService`; reproject to UTM/WebMercator; compute metric GSD using geodetic trigonometry; generate internal pyramids before serving. |
| **Tile Server Latency** | Client zooms rapidly, generating hundreds of simultaneous tile requests. | Medium | Medium | Implement local disk caching for rendered PNG tiles (`.gios_cache/tiles/{z}/{x}/{y}.png`); return 304 Not Modified; set browser cache headers. |
| **Frontend State Drift** | Leaflet layer out of sync with selected index/colormap in Spectral Studio. | Low | Low | Store active raster layer state in central Zustand store (`jarvisStore.js` or dedicated `layerStore.js`); trigger clean layer swap on state change. |

---

## Section 6: Execution Protocol & Handoff to Agent 4 (Master)

The planning phase is officially complete. The findings and recommendations of Agent 1 and Agent 2 have been reconciled into this prioritized, actionable implementation specification.

### Handoff Directives for Agent 4 (Master):
1. **Activate Orchestration:** Read `production_artifacts/Implementation_Plan.md`.
2. **Populate Task Board:** Initialize `production_artifacts/Task_Board.md` with tasks `T-01` through `T-20`, assigning each to its designated agent (`@core-engineer`, `@backend`, `@frontend`, `@debugger`, `@health-monitor`, `@archivist`) with status `pending`.
3. **Execution Dispatch Sequence:**
   - **Step 1:** Dispatch **Agent 5 (`@core-engineer`)** on `T-01` to lock down shared schemas and API contracts.
   - **Step 2:** Once `T-01` is done, dispatch **Agent 6 (`@backend`)** on `T-02` through `T-08`, and **Agent 7 (`@frontend`)** on `T-09` in parallel.
   - **Step 3:** Dispatch remaining Phase 2 and Phase 3 tasks across `@backend` and `@frontend`.
   - **Step 4:** Run **Agent 8 (`@health-monitor`)** and **Agent 9 (`@debugger`)** continuously throughout execution to monitor daemon stability and run the test suite.
   - **Step 5:** Dispatch **Agent 10 (`@archivist`)** on milestone completion for documentation, changelog, and tag `v2.5.0`.

```
                  ORCHESTRATION HANDOFF WORKFLOW
                  
       [Agent 3: Implementation Planner]
                      │
                      │ Generates Implementation_Plan.md
                      ▼
             [Agent 4: Master]
                      │
                      ├──────────────────────────┐
                      ▼                          ▼
           Initializes Task Board       Enforces Dispatch Sequence
           (Task_Board.md)              
                      │
                      ▼
         Phase 0: @core-engineer (Contracts & Schemas)
                      │
                      ├──────────────────────────┐
                      ▼                          ▼
         Phase 1-3: @backend            Phase 1-3: @frontend
         (Processing & Tiles)           (Map & Diagnostic UX)
                      │                          │
                      └──────────────┬───────────┘
                                     ▼
                      Continuous: @health-monitor & @debugger
                                     ▼
                      Milestone: @archivist (Release v2.5.0)
```

**Status:** Implementation Planner execution complete. Halting now. Control handed off to **Agent 4 (Master)**.
