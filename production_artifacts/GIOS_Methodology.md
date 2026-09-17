# GIOS Backend — Architecture & Coding Methodology

This document explains **how and why** the GIOS backend was designed, so you can walk someone through the entire thought process.

---

## 1. Problem Decomposition

Before writing any code, we broke the environmental monitoring problem into **six distinct concerns**:

| Concern | Core Question |
|---------|---------------|
| **Data Acquisition** | How do we find & load satellite imagery? |
| **Preprocessing** | How do we clean raw data (clouds, bad pixels)? |
| **Index Computation** | How do we convert bands into environmental metrics? |
| **Time-Series Analysis** | How do we track changes over time? |
| **Spatial Analysis** | How do we summarise values within geographic regions? |
| **Data Integration** | How do we bring in ground-truth weather & water data? |

Each concern became its own **service module** — completely independent, testable in isolation, and reusable.

---

## 2. Technology Stack Rationale

| Choice | Why |
|--------|-----|
| **FastAPI** | Modern, async-ready Python web framework with automatic OpenAPI docs |
| **Pydantic** | Type-safe request/response validation — catches bad input before it hits processing |
| **xarray + rioxarray** | The standard for multi-dimensional labelled raster arrays; natively handles time × y × x grids |
| **pystac-client + odc-stac** | STAC is the universal standard for searching satellite imagery catalogues; odc-stac converts search results directly into xarray datasets without downloading entire files |
| **Planetary Computer** | Microsoft's free, cloud-optimised archive of Landsat & Sentinel-2 — no downloads needed |
| **rasterstats** | Battle-tested library for computing statistics of raster values within vector polygons |
| **httpx** | Async HTTP client for calling NOAA/USGS APIs without blocking the event loop |
| **diskcache** | Lightweight disk-based cache — avoids re-querying the same satellite data repeatedly |

---

## 3. Layered Architecture Pattern

The codebase follows a **three-layer pattern** that keeps concerns separated:

```
┌─────────────────────────────────────────────┐
│              API Layer (routes/)             │  ← HTTP endpoints, validation
├─────────────────────────────────────────────┤
│           Service Layer (services/)          │  ← Business logic, computation
├─────────────────────────────────────────────┤
│     Utility Layer (utils/) + Config          │  ← Shared helpers, settings
└─────────────────────────────────────────────┘
```

**Why this matters:** A route never does computation directly — it delegates to a service. A service never knows about HTTP — it just takes data in and returns results. This means:
- You can swap the API framework without touching analysis code
- You can call services from scripts, notebooks, or tests — not just via HTTP
- Each layer can be tested independently

---

## 4. Module-by-Module Breakdown

### 4.1 Configuration ([app/config.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/config.py))

**Problem:** The app needs catalog URLs, cloud-cover thresholds, API keys, and cache settings — but these differ between development, staging, and production.

**Solution:** A single [Settings](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/config.py#18-93) class using **Pydantic's `BaseSettings`**. Every field has a sensible default, but can be overridden by setting an environment variable prefixed with `GIOS_` (e.g., `GIOS_MAX_CLOUD_COVER=30`). A module-level `settings` singleton is created once and imported everywhere.

**Key design choice:** The `default_bbox` (default Area of Interest) is set to the New Orleans region as a placeholder. In production, every request supplies its own AOI.

---

### 4.2 Schemas ([app/models/schemas.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py))

**Problem:** The API needs strict contracts — what does a valid request look like? What does a response contain?

**Solution:** 30+ **Pydantic models** organised into three groups:

1. **Enums** — [SatelliteCollection](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#19-24), [SpectralIndex](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#26-35), [CompositeFrequency](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#37-44), [StatisticType](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#46-58). These constrain inputs to valid choices and generate dropdown menus in the Swagger UI.
2. **Request models** — [SearchParams](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#100-111), [IndexRequest](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#121-130), [ZonalStatsRequest](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#132-144), [TrendRequest](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#169-182), etc. Each has field-level validation (e.g., `max_cloud_cover` must be 0–100).
3. **Response models** — [SearchResponse](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#214-219), [IndexResultSummary](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#230-241), [TimeSeriesResponse](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#272-281), [HealthResponse](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#309-316), etc. These guarantee every API response has a consistent, predictable structure.

**Key design choice:** GeoJSON types ([GeoJSONGeometry](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#75-80), [GeoJSONFeature](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#82-88), [GeoJSONFeatureCollection](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#90-95)) are modelled explicitly so the API can accept vector boundaries directly in request bodies.

---

### 4.3 Data Acquisition Service ([app/services/data_acquisition.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/data_acquisition.py))

**Problem:** We need to search millions of satellite scenes and load only the relevant ones without downloading terabytes of data.

**Solution:** The [DataAcquisitionService](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/data_acquisition.py#54-230) does two things:

1. **[search_scenes()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/api/routes/data.py#37-64)** — Connects to Microsoft Planetary Computer's STAC API via `pystac-client`, filters by bounding box, date range, and cloud cover, and returns lightweight metadata dicts. Results are cached for 30 minutes.
2. **[load_data_cube()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/data_acquisition.py#122-193)** — Takes search results and uses `odc-stac` to create an **xarray Dataset** backed by Cloud Optimised GeoTIFFs (COGs). This is *lazy-loaded* — only the pixels you compute on are actually downloaded from the cloud.

**Key design choice:** A `BAND_MAP` dictionary maps common names (like `"nir"`, `"red"`) to the actual band identifiers for each satellite collection. This abstraction lets the rest of the codebase refer to bands generically without knowing whether it's Landsat or Sentinel-2.

---

### 4.4 Preprocessing Service ([app/services/preprocessing.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/preprocessing.py))

**Problem:** Raw satellite images contain clouds, cloud shadows, snow, and invalid pixels that would corrupt any analysis.

**Solution:** Sensor-specific masking:

- **Landsat:** The `QA_PIXEL` band encodes quality flags as bit-packed integers. We use bitwise AND operations to check bits 1 (dilated cloud), 3 (cloud), and 4 (cloud shadow). Any flagged pixel is set to `NaN`.
- **Sentinel-2:** The Scene Classification Layer (SCL) assigns each pixel a class (vegetation, water, cloud, etc.). We mask classes 0, 1, 3, 8, 9, 10 (no-data, defective, cloud shadow, cloud medium/high, cirrus).

After masking, surface reflectance is **normalised** to the 0–1 range:
- Landsat: `DN × 0.0000275 − 0.2`
- Sentinel-2: `DN × 0.0001`

**Key design choice:** The [preprocess()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/preprocessing.py#179-197) convenience method chains masking + normalisation into a single call, and automatically detects which sensor to use based on the collection name.

---

### 4.5 Index Computation Service ([app/services/indices.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/indices.py))

**Problem:** Raw reflectance bands aren't interpretable. We need derived metrics (vegetation health, water presence, temperature, algal blooms).

**Solution:** Six static methods, each implementing a well-known formula:

| Index | Formula | What It Measures |
|-------|---------|-----------------|
| **NDVI** | [(NIR − Red) / (NIR + Red)](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#63-73) | Vegetation health (−1 to 1) |
| **EVI** | `2.5 × (NIR − Red) / (NIR + C₁Red − C₂Blue + L)` | Vegetation, with atmospheric correction |
| **NDWI** | [(Green − NIR) / (Green + NIR)](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#63-73) | Surface water presence |
| **NDMI** | [(NIR − SWIR) / (NIR + SWIR)](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/models/schemas.py#63-73) | Canopy/soil moisture |
| **LST** | `DN × 0.00341802 + 149 − 273.15` | Land Surface Temperature (°C) |
| **Algal Bloom** | `RedEdge2 − 0.5 × (Red + RedEdge1)` | Cyanobacteria concentration |

**Key design choice:** Every division includes a tiny epsilon (`1e-10`) to prevent divide-by-zero errors when both bands are zero (e.g., over deep shadow). A [compute_index()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/indices.py#138-192) dispatcher maps string names to methods, so the API route can simply pass `"ndvi"` and get the right computation.

---

### 4.6 Time-Series Service ([app/services/timeseries.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/timeseries.py))

**Problem:** Individual satellite scenes are snapshots. We need to track trends, detect changes, and smooth out gaps.

**Solution:** Four capabilities:

1. **[build_composites()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/timeseries.py#26-65)** — Groups scenes by time period (monthly, bi-weekly) and takes the median to produce cloud-gap-free composites.
2. **[compute_change()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/timeseries.py#68-86)** — Diffs consecutive composites to highlight sudden changes (e.g., deforestation between months).
3. **[detect_anomalies()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/timeseries.py#143-188)** — Calculates z-scores across the time series and flags any observation exceeding a threshold (default: |z| > 2.0).
4. **[compute_trend()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/timeseries.py#191-217)** — Fits a linear regression via SciPy and returns the slope in units-per-month.

**Key design choice:** [extract_spatial_mean_series()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/timeseries.py#121-140) collapses the x/y dimensions into a single value per time step, which is what gets sent to the frontend charts.

---

### 4.7 Spatial Analysis Service ([app/services/analysis.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/analysis.py))

**Problem:** We need to summarise index values *within* specific geographic regions (counties, watersheds, lakes).

**Solution:** The [SpatialAnalysisService](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/analysis.py#26-195) uses `rasterstats` to overlay vector polygons on raster arrays and compute mean, max, min, std, count, and percentile statistics per zone. It also supports:
- **Time-aware zonal stats** — runs the computation for every time step
- **Point extraction** — uses xarray's `.sel(method="nearest")` to grab the raster value at specific longitude/latitude coordinates

**Key design choice:** An [_affine_from_xarray()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/analysis.py#200-212) fallback generates a rasterio-compatible affine transform from xarray coordinates, so the code works even when rioxarray metadata is missing.

---

### 4.8 Data Integration Service ([app/services/integration.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/integration.py))

**Problem:** Satellite data alone isn't enough — we need ground-truth weather and water data for validation and enrichment.

**Solution:** Async HTTP clients for two public APIs:

- **NOAA/NWS** — discovers weather stations in a bbox, fetches temperature, humidity, wind, pressure, and precipitation observations.
- **USGS Water Services** — discovers stream gauges and lakes, fetches real-time discharge, gage height, and water temperature.

A [spatial_join_stations_to_zones()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/services/integration.py#248-278) method assigns each ground station to the polygon it falls within, enabling direct comparison between satellite indices and in-situ measurements.

**Key design choice:** All HTTP calls use `httpx.AsyncClient` so they don't block the FastAPI event loop. The client is lazily initialised and properly closed on app shutdown.

---

### 4.9 Utility Modules

**[app/utils/geo.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/utils/geo.py)** — Shared geospatial helpers: bbox ↔ polygon ↔ GeoJSON converters, CRS reprojection via pyproj, area calculations in km², and point-in-polygon checks.

**[app/utils/cache.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/utils/cache.py)** — A thin wrapper around `diskcache` providing [cache_get()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/utils/cache.py#62-69), [cache_set()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/utils/cache.py#71-88), [cache_delete()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/utils/cache.py#90-94), and [cache_clear()](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/app/utils/cache.py#96-101). Keys are generated by SHA-256 hashing the input parameters, guaranteeing deterministic cache hits. Default TTL is 1 hour; the cache auto-creates its directory on first use.

---

### 4.10 API Routes & Entry Point

Each route file follows the same pattern:
1. Validate the incoming request (Pydantic does this automatically)
2. Delegate to the appropriate service(s)
3. Wrap the result in a response model
4. Return — FastAPI serialises to JSON automatically

**[main.py](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/main.py)** ties everything together: registers all routers, enables CORS for any frontend, configures structured logging, and uses FastAPI's [lifespan](file:///C:/Users/Dina/.gemini/antigravity/scratch/gios-backend/main.py#37-48) context manager to warm up the cache on startup and close HTTP clients + cache on shutdown.

---

## 5. Data Flow Example

Here's what happens when a user requests NDVI computation:

```
POST /analysis/indices
       │
       ▼
  analysis route validates the request (Pydantic)
       │
       ▼
  data_acquisition_service.load_data_cube()
       │  → queries Planetary Computer STAC API
       │  → returns lazy xarray Dataset (no data downloaded yet)
       │
       ▼
  preprocessing_service.preprocess()
       │  → masks clouds using QA_PIXEL / SCL
       │  → normalises reflectance to 0–1
       │  → (this triggers partial data download on-demand)
       │
       ▼
  index_computation_service.compute_index("ndvi")
       │  → applies (NIR - Red) / (NIR + Red)
       │  → returns xarray DataArray
       │
       ▼
  _summarise() aggregates stats (mean, median, min, max, std)
       │
       ▼
  IndexResponse returned as JSON
```

---

## 6. How to Explain This to Someone

> "We built a Python backend that connects to NASA/ESA satellite archives in the cloud, pulls only the imagery we need for a specific area and time range, cleans out clouds and bad pixels, computes environmental health metrics like vegetation indices and surface temperature, tracks how those metrics change over time, and can summarise values within geographic boundaries like counties or watersheds. It also pulls in real weather and water data from NOAA and USGS to cross-reference with the satellite measurements. Everything is exposed through a REST API so a frontend dashboard can call it."
