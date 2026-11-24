# Tiepoint

**A second opinion for Earth data.** Tiepoint puts satellite measurements and ground sensors for the same place on one map, in 2D or on 3D terrain, and measures where they agree and where they don't.

**Live showcase:** https://dparcha10.github.io/GIOSREPO/

Tiepoint is a student research prototype (formerly named GIOS). It is not for safety or engineering decisions.

## What it does

- **Real map layers.** Sentinel-2 spectral indices (MNDWI, NDWI, NDVI, NDMI, NDCI, NBR), Copernicus DEM GLO-30 elevation as shaded relief, slope and hillshade, and Sentinel-1 radar backscatter (VV, VH, VH/VV, dual-pol). Layers are seamless mosaics rendered on request from Microsoft Planetary Computer, each with a legend, the exact scene and its credits.
- **3D view.** Any of those layers draped over Copernicus terrain (MapLibre GL), with vertical exaggeration and opacity controls.
- **Measured site comparisons.** Each monitored site is compared with the same season one year earlier, from the clearest Sentinel-2 scenes, over a fixed box shown on the map. Results state both scene dates, values, the change, a fixed screening threshold and a confidence flag.
- **Satellite against ground.** Monthly Sentinel-2 values over each site, plotted above the daily discharge of the nearest USGS stream gauge, with the correlation on matched days.
- **Live context.** USGS earthquakes (M2.5+, past 24 h) and gauge readings.

## What is not real yet

Most of the roughly 80 analysis tools (slope stability, liquefaction, dam breach and others) run placeholder models. Their map overlays are hidden by default and stamped **SIMULATED** by the server, and the Tools panel says so. See the Methods page in the app for the full list, the formulas and the known limitations.

## Running it

The showcase on GitHub Pages runs without a server: imagery loads straight from Planetary Computer, gauges and earthquakes from USGS, and site statistics from a dated snapshot of the server's output.

The full version needs the FastAPI backend:

```bash
pip install -r requirements.txt
export JWT_SECRET=...            # 32+ random characters
export GIOS_ADMIN_PASSWORD=...   # 12+ characters, sign in as "admin"
uvicorn main:app --port 8000
```

```bash
cd gios-react && npm ci && npm run dev
```

`render.yaml` and the `Dockerfile` deploy the backend and the built web app as one service. Tests: `pytest` (432 tests).

## Data and credits

- Contains modified Copernicus Sentinel data, processed by ESA and Microsoft Planetary Computer.
- Copernicus DEM: © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA.
- USGS water and earthquake data are in the U.S. public domain.
- Basemaps © Esri and its data contributors, including © OpenStreetMap contributors.
- MapLibre GL JS (BSD-3-Clause), Leaflet (BSD-2-Clause).
