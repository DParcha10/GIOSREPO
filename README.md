# GIOS: Geospatial Integrated Orthomosaic Systems
### Hierarchical Environmental & Geotechnical Hazard Intelligence Platform

GIOS is an end-to-end cloud-native geospatial platform designed to bridge the gap between regional satellite surveillance and ultra-high-resolution drone/in-situ geotechnical hazard inspection.

---

## Architecture Overview

```
                          ┌────────────────────────┐
                          │   GIOS Web Console     │
                          │ (Leaflet + Chart.js)   │
                          └───────────┬────────────┘
                                      │ HTTP / REST
                          ┌───────────▼────────────┐
                          │    FastAPI Gateway     │
                          └───────────┬────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐       ┌──────────────────────┐      ┌──────────────────┐
│ Planetary Comp.  │       │  Drone Micro-Survey  │      │ USGS Hydro NWIS  │
│ STAC + odc-stac  │       │ COG / Multispec      │      │ & NOAA Weather   │
├──────────────────┤       ├──────────────────────┤      ├──────────────────┤
│ Sentinel-2 (10m) │       │ MicaSense / Livox    │      │ Real-time stage  │
│ Landsat 8/9 (30m)│       │ 2.8 cm GSD Seepage   │      │ Discharge (cfs)  │
└──────────────────┘       └──────────────────────┘      └──────────────────┘
```

## Core Hazard Modules

1. **Subsurface Seepage & Slope Saturation**: Multi-temporal Normalized Difference Moisture Index (NDMI) and Land Surface Temperature (LST) correlated with drone LiDAR elevation slopes.
2. **Harmful Algal Blooms (HABs)**: Normalized Difference Chlorophyll Index (NDCI) tracking cyanobacteria and microcystin risk.
3. **Inundation & Flood Response**: Modified Normalized Difference Water Index (MNDWI) isolating surface water from cloud shadows and terrain.

---

## Quickstart

### 1. Run with Python & Uvicorn
```bash
# Install dependencies
pip install -r requirements.txt

# Start the unified backend & frontend server
uvicorn main:app --reload --port 8000
```
Open **http://localhost:8000** in your browser. The frontend is automatically served at the root, and interactive API documentation is available at **http://localhost:8000/docs**.

### 2. Run with Docker Compose
```bash
docker-compose up --build
```

---

## Repository Structure

- `app/`
  - `api/routes/`: Endpoints for data search, analysis, timeseries, USGS integration, hazard events, drone ingestion, and wildfire differencing.
  - `models/`: Pydantic validation schemas, enums, and API contracts (`schemas.py`).
  - `services/`: Planetary Computer acquisition, masking, spectral formulas, regression trends, and drone processing.
  - `utils/`: Deterministic hashing cache (`diskcache`) and geospatial geometry helpers.
  - `config.py`: Environment-driven settings and calibration constants.
- `gios-react/`: Modern React + Leaflet Web GIS application with dynamic COG tile streaming, centimeter zoom, swipe curtain, and diagnostic analytical tools.
- `frontend/`: Standalone legacy lightweight portal (`index.html`, `styles.css`, `app.js`).

