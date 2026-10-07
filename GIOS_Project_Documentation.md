# GIOS: Global Intelligence & Observation System
**Project Dossier & Scientific Specification (v2.5.12 Enterprise Release)**  
*Live Production: [https://gios-react.vercel.app](https://gios-react.vercel.app)*  
*Backend Engine: FastAPI + rio-tiler + odc-stac + Leaflet Web GIS*

---

## 1. Executive Summary

The **Global Intelligence & Observation System (GIOS v2.5)** is an enterprise geospatial intelligence platform designed for critical infrastructure hazard monitoring, environmental anomaly detection, and real-time disaster response.

GIOS bridges planetary satellite remote sensing (10m Sentinel-2, 30m Landsat-8/9) with centimeter-scale drone photogrammetry (2.8cm orthomosaics). Releases **v2.5.10**, **v2.5.11**, and **v2.5.12** deliver breakthrough remote sensing physics, photogrammetry algorithms, and geotechnical hazard simulation engines:
- **v2.5.10**: NodeODM Distributed Photogrammetry Processing Queue with 9-stage asynchronous state machine and stage-weighted progress telemetry, Multi-Temporal Quality Mosaic Cloud-Free Compositor Studio with pixel-rank temporal reductions (median, greenest, clearest, max-NDMI, min-LST) and dynamic XYZ tile streaming, and Multi-Hazard Live Telemetry Alert System with resilient USGS NWIS event bus and Server-Sent Events (SSE).
- **v2.5.11**: Geotechnical Tailings Dam Hydrodynamic Inundation Simulation Engine with 2D shallow water Saint-Venant wave front routing, Froehlich (2008) peak breach discharge formulation ($Q_p = 0.607 \cdot V_w^{0.295} \cdot h_w^{1.24} \cdot \mu_{\text{mech}}$), Bingham plastic and Herschel-Bulkley non-Newtonian tailings slurry yield stress routing, Australian/USBR velocity-depth hazard intensity cross-product tiering ($v \cdot h$), dynamic downstream evacuation corridor buffer vectorization, critical infrastructure exposure scoring, and interactive Tailings Dam Breach Simulation Studio (`DamBreakModal.jsx`) with dynamic XYZ tile streaming (`/api/v1/tiles/geotechnical/dam-break/{sim_id}/{z}/{x}/{y}.png`).
- **v2.5.12**: Geotechnical Embankment Phreatic Surface Seepage Inversion, 2D Dupuit-Forchheimer unconfined seepage flow, Casagrande top-seepage line inversion, Van Genuchten (1980) Soil Water Retention Curve (SWRC) parameter optimization ($\theta(\psi) = \theta_r + \frac{\theta_s - \theta_r}{[1 + (\alpha \psi)^n]^m}$), Terzaghi critical piping Factor of Safety ($FS_{\text{piping}} = i_{\text{crit}} / i_{\text{exit}}$), in-situ multi-depth piezometer residual fusion, and interactive Phreatic Surface Seepage Studio (`PhreaticSeepageModal.jsx`) with dynamic hydrogeological XYZ tile streaming (`/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/{z}/{x}/{y}.png`).
- **v2.5.13 (Scaffolding Operational)**: Embankment Limit Equilibrium Slope Stability (Bishop's Simplified Picard iteration & Janbu empirical curvature correction $f_0$), 3D circular & non-circular critical slip surface grid search, Dupuit phreatic pore water pressure coupling ($u_i = \gamma_w \cdot \max(0, z_{\text{phreatic}} - y_{b,i})$), and Sentinel-1 InSAR satellite radar line-of-sight creep displacement vector fusion.

---

## 2. Scientific Foundations & Physics Calibration

Every pixel rendered on screen adheres to strict remote sensing physics, orbital geometry, and biophysical calibration standards:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GIOS v2.5 RADIOMETRIC PIPELINE                     │
├───────────────────────────────────┬─────────────────────────────────────┤
│      SATELLITE / SENSOR           │        CALIBRATION & MASKING        │
├───────────────────────────────────┼─────────────────────────────────────┤
│ Landsat-8/9 C2 L2 Optical (B1–B7) │ ρ = DN × 0.0000275 - 0.2           │
│ Landsat-8/9 C2 L2 Thermal (B10)   │ Tc = (DN × 0.00341802 + 149) - 273.15│
│ Sentinel-2 L2A (PB ≥ 04.00)       │ ρ = (DN - 1000) × 0.0001           │
│ Sentinel-2 SCL Cloud Masking      │ Classes 0,1,3,8,9,10,11 + 3x3 Dilation │
│ Wildfire Burn Severity            │ ΔNBR = NBRpre - NBRpost (FIREMON)   │
│ Climatological Baseline           │ z = (x - Median) / (1.4826 × MAD)   │
│ BRDF Kernel Normalization (NBAR)  │ c_brdf = ρ_tgt(θs0, 0, 0) / ρ_obs   │
│ Topographic Minnaert Correction   │ ρ_cor = ρ × (cos θs / cos i)^k      │
│ SBAS Multi-Baseline InSAR         │ B v = Δφ,  d = Δφ × (λ / 4π) × 1000 │
└───────────────────────────────────┴─────────────────────────────────────┘
```

1. **Landsat Optical vs. Thermal Decoupling (Bug 1 Remediated)**:
   - Optical surface reflectance scaled to $[0.0, 1.0]$ physical units.
   - Thermal Band 10 calibrated to degrees Celsius ($T_c$), eliminating the $-130^\circ\text{C}$ distortion.
2. **Sentinel-2 Processing Baseline 04.00+ Offset (Bug 2 Remediated)**:
   - Modern acquisitions ($\ge$ Jan 25, 2022) subtract the $+1000$ DN baseline offset before index math, preventing severe false-positive moisture artifacts on dark water bodies.
3. **Morphological Cloud/Shadow Dilation (Bug 4 Remediated)**:
   - Bitwise QA/SCL cloud masks apply `scipy.ndimage.binary_dilation` with a $3\times 3$ structuring element (30–60m buffer), eliminating edge contamination and semi-transparent penumbras.
4. **Pre/Post Differenced Burn Severity ($\Delta\text{NBR}$ / $\text{RdNBR}$) (Bug 3 Remediated)**:
   - Evaluates multi-temporal differencing against USGS FIREMON standards: High Severity ($\ge 0.660$), Moderate-High ($0.440–0.660$), Moderate-Low ($0.270–0.440$), Low ($0.100–0.270$), and Unburned ($< 0.100$).
5. **Seasonal Phenological Normalization (MAD Anomaly)**:
   - Replaced static z-scores with monthly climatological medians and Median Absolute Deviation ($\text{MAD}$), preventing false winter vegetation alarms.
6. **True Orthorectification & Z-Buffer Occlusion Ray-Tracing (v2.5.8)**:
   - Evaluates digital surface model (DSM) heights against digital terrain models (DTM) via off-nadir line-of-sight ray tracing.
   - Computes radial building lean displacement $\Delta r = r \cdot (h / H) \cdot \cos(\text{tilt})$ and cast shadow length $L = h \cdot \tan \theta_{\text{sun}}$.
   - Classifies ortho coverage into `SURVEY_GRADE_TRUE_ORTHO` (<2%), `MAPPING_GRADE` (2–10%), `MODERATE_OCCLUSION` (10–25%), and `HIGH_OCCLUSION_DEFICIT` ($\ge 25\%$).
7. **Multiresolution Seamline Graph-Cut Energy Minimization (v2.5.8)**:
   - Optimizes seamline placement using graph cuts: $E = \omega_{\text{color}} E_{\text{color}} + \omega_{\text{grad}} E_{\text{grad}} + \omega_{\text{elev}} E_{\text{elev}}$.
   - Avoids high-gradient structural features via Dijkstra boundary cost routing and applies Laplacian multiresolution feathering to eliminate photometric discontinuities across flight strips.
8. **BRDF Ross-Thick Li-Sparse Kernel Normalization (HLS NBAR) (v2.5.8)**:
   - Formulates Roujean, Wanner, and Schaaf semi-empirical scattering models via volumetric $K_{\text{vol}}(\theta_s, \theta_v, \Delta\phi)$ and geometric $K_{\text{geo}}(\theta_s, \theta_v, \Delta\phi)$ kernels.
   - Adjusts view/solar geometry to Nadir BRDF-Adjusted Reflectance ($c_{\text{brdf}} = \frac{\rho(\theta_{s0}, 0, 0)}{\rho(\theta_s, \theta_v, \Delta\phi)}$) and triggers retroreflective hotspot alarms when $\theta_s \approx \theta_v$ and $\Delta\phi \approx 0$.
9. **Small Baseline Subset (SBAS) Multi-Temporal InSAR (v2.5.9)**:
   - Filters interferogram pairs using perpendicular baseline ($|B_\perp| \le B_{\perp,\max}$), temporal baseline ($B_T \le B_{T,\max}$), and coherence ($\gamma \ge \gamma_{\text{thresh}}$).
   - Formulates the baseline design matrix and computes Singular Value Decomposition (SVD) with Tikhonov regularization ($\mathbf{B}\mathbf{v} = \Delta\boldsymbol{\phi}$) to solve disconnected subsets.
   - Produces cumulative Line-Of-Sight (LOS) displacement time series ($d = \Delta\phi \cdot \frac{\lambda}{4\pi} \cdot 1000\text{ mm}$) and categorizes risk from `RAPID_UPLIFT` to `SEVERE_SUBSIDENCE`.
10. **Topographic Solar Radiometric Normalization (Minnaert & C-Correction) (v2.5.9)**:
    - Derives local solar incidence angle $\cos i = \cos\theta_s \cos\theta_n + \sin\theta_s \sin\theta_n \cos(\phi_s - \phi_n)$ using COP-DEM GLO-30 slope and aspect.
    - Applies Minnaert non-Lambertian empirical factor $(\cos\theta_s / \max(0.05, \cos i))^k$ and Teillet empirical $C$-correction factor $(\cos\theta_s + c) / (\max(0.05, \cos i) + c)$.
    - Enforces automatic self-shadow masking for unilluminated slopes ($\cos i \le 0$).
11. **Automated Sub-Pixel Tie-Point RPC Alignment (v2.5.9)**:
    - Performs Normalized Cross-Correlation (NCC) sub-pixel peak localization between satellite imagery and ground references.
    - Estimates a 6-parameter affine bias shift ($\Delta c, \Delta r$) with RANSAC robust outlier elimination.
    - Quantifies posterior Root Mean Square Error in sub-pixel and ground metric distance ($\text{RMSE}_m = \text{RMSE}_{\text{post}} \times \text{GSD}$).
12. **NodeODM Distributed Photogrammetry Processing Queue (v2.5.10)**:
    - Asynchronous 9-stage state machine (`QUEUED`, `INITIALIZING`, `DATASET_EXTRACTION`, `SPARSE_RECONSTRUCTION`, `DENSE_MATCHING`, `MESHING`, `ORTHOPHOTO_GENERATION`, `EXPORTING`, `COMPLETED`, `FAILED`).
    - Cluster worker load balancing, live stage-weighted progress estimation, and graceful cancellation guards for high-resolution UAS orthomosaic pipelines.
13. **Multi-Temporal Quality Mosaic Cloud-Free Compositor Studio (v2.5.10)**:
    - Multi-scene temporal pixel reduction across Planetary Computer STAC collections using statistical and biophysical selectors (`median`, `greenest_pixel`, `clearest_pixel`, `max_ndmi`, `min_lst`).
    - Automated cloud and shadow masking with morphological dilation and sub-500ms dynamic XYZ tile streaming (`/api/v1/tiles/mosaic/quality-mosaic/...`).
14. **Multi-Hazard Live Telemetry Alert System & Real-Time Event Bus (v2.5.10)**:
    - Resilient ingestion bus interfacing USGS NWIS stream gauges with 4.5s socket budget, transient retry backoff, and non-numeric reading parsing guards.
    - Real-time Server-Sent Events (`/api/v1/alerts/stream`) and multi-channel notification dispatch (webhook, email, SMS).
15. **Tailings Dam Hydrodynamic Inundation Simulation (v2.5.11)**:
    - Formulates 2D shallow water wave front propagation and Froehlich (2008) empirical peak breach discharge: $Q_p = 0.607 \cdot V_w^{0.295} \cdot h_w^{1.24} \cdot \mu_{\text{mech}}$.
    - Models non-Newtonian Bingham plastic and Herschel-Bulkley tailings slurry yield stress attenuation: $\tau = \tau_y + K \dot{\gamma}^n$.
    - Computes Australian/USBR flood risk velocity-depth hazard intensity product ($v \cdot h$) categorized into `LOW_HAZARD` ($< 0.5\text{ m}^2/\text{s}$), `SIGNIFICANT_HAZARD` ($0.5–1.5\text{ m}^2/\text{s}$), `HIGH_HAZARD` ($1.5–3.0\text{ m}^2/\text{s}$), and `EXTREME_HAZARD` ($\ge 3.0\text{ m}^2/\text{s}$).
    - Vectorizes downstream evacuation corridor buffers with distance-dependent evacuation clearance times and scores critical infrastructure exposure vulnerability.
16. **Embankment Phreatic Surface Seepage Inversion & SWRC Modeling (v2.5.12)**:
    - Solves 2D Dupuit-Forchheimer unconfined seepage flow across zoned and homogenous embankments: $q_{\text{seep}} = \frac{K_{\text{sat}} (h_1^2 - h_2^2)}{2 L}$.
    - Inverts Casagrande top-seepage line and computes maximum exit gradient $i_{\text{exit}} = \sin\beta$ and Terzaghi critical piping heave gradient $i_{\text{crit}} = \frac{G_s - 1}{1 + e}$.
    - Inverts Van Genuchten (1980) Soil Water Retention Curve (SWRC) parameters $(\alpha, n, \theta_r, \theta_s)$ and Mualem unsaturated relative hydraulic conductivity $k_r(S_e) = S_e^l [1 - (1 - S_e^{1/m})^m]^2$.
    - Fuses multi-depth in-situ vibrating wire piezometer heads ($h_{\text{meas}} = z_{\text{tip}} + \frac{u}{\gamma_w}$) with numerical simulated heads ($h_{\text{sim}}$), identifying residual deviations and classifying anomalies (`NORMAL_CONVERGENCE`, `ELEVATED_PRESSURE`, `EXCESS_PORE_PRESSURE`, `SENSOR_FAULT_DRIFT`).
17. **Limit Equilibrium Slope Stability & InSAR Creep Fusion (v2.5.13 Scaffolding)**:
    - Formulates Bishop's Simplified method with Picard iterative solver ($m_\alpha \ge 0.10$, downstream sliding sign convention $\sin\alpha = (x_c - x_i)/R$, convergence tolerance $10^{-4}$): $FS = \frac{\sum [c' b_i + (W_i - u_i b_i) \tan\phi'] / m_\alpha}{\sum W_i \sin\alpha_i + \sum k_h W_i (y_i - y_c)/R}$.
    - Formulates Janbu's Simplified force equilibrium method with empirical curvature correction factor $f_0 = 1.0 + 0.5(d/L - 1.4(d/L)^2)$.
    - Optimizes circular slip surface geometry $(x_c, y_c, R)$ via 3D grid search minimizing Factor of Safety.
    - Fuses Sentinel-1 satellite radar line-of-sight InSAR creep vectors ($v_{\text{LOS}}$) to detect accelerating shear deformation across embankment crests and downstream slopes.

---

## 3. System Architecture & High-Performance Tile Engine

```
                             GIOS v2.5 ARCHITECTURE
                             
    [ Microsoft Planetary Computer ]         [ High-Res Drone Orthomosaics ]
                 │                                        │
                 ▼ (Signed STAC COGs)                     ▼ (Centimeter GeoTIFFs)
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    FASTAPI DYNAMIC TILE & ANALYTICAL CORE               │
  │                                                                         │
  │  • Interactive Tile Path (/api/v1/tiles/...):                           │
  │    rio-tiler HTTP range requests → On-the-fly Index Math →              │
  │    True Ortho / Seamline / BRDF / SBAS / Quality Mosaic Dynamic Tiles → │
  │    Dam Break Inundation / Phreatic Seepage / Slope Stability Tiles →    │
  │    2%–98% Contrast Stretch → 256x256 RGBA PNG (Latency < 500ms)         │
  │                                                                         │
  │  • Analytical Path (/api/v1/analysis/..., /photogrammetry/..., /alerts):│
  │    odc-stac Data Cube → SCL Masking → NodeODM Distributed Queue →       │
  │    Quality Mosaic Compositor → Multi-Hazard SSE Real-Time Event Bus →   │
  │    2D Shallow Water Dam Break → Dupuit Phreatic Seepage Inversion →     │
  │    Bishop/Janbu Limit Equilibrium Slice Solvers & InSAR Creep Fusion    │
  └───────────────────────────────────┬─────────────────────────────────────┘
                                      │ (Dynamic XYZ Stream & SSE)
                                      ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                       GIOS REACT WEB GIS COMMAND CENTER                 │
  │                                                                         │
  │  • Multi-Temporal Swipe Curtain (Split-screen pre/post comparison)     │
  │  • Centimeter-Zoom UAS Engine (Smooth Zoom 13 Macro → Zoom 22 Micro)    │
  │  • NodeODM Photogrammetry Processing Queue Dashboard (9-stage tracker)  │
  │  • Quality Mosaic Cloud-Free Compositor Studio (Temporal pixel reducers)│
  │  • Multi-Hazard Live Telemetry Alert Drawer & Severity Map Markers     │
  │  • Tailings Dam Breach Simulation Studio & Evacuation Corridors         │
  │  • Phreatic Surface Seepage Studio, SWRC Curve & Piezometer Drawer      │
  │  • Interactive Pixel Inspector & Polygon Zonal Analysis Drawer          │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints Specification

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tiles/{collection}/{item_id}/{z}/{x}/{y}.png` | Sub-500ms dynamic XYZ COG tile stream with index & colormap |
| `POST` | `/api/v1/wildfire/burn-severity` | Differenced $\Delta\text{NBR}$ & $\text{RdNBR}$ burn severity analysis |
| `GET` | `/api/v1/analysis/pixel-probe` | Interactive coordinate probe returning spectral profile & anomaly status |
| `POST` | `/api/v1/analysis/zonal-stats` | Real polygon zonal statistics, hectare area, and 10-bin histogram |
| `POST` | `/api/v1/analysis/transect` | Geotechnical embankment transect cross-sections & elevation profiles |
| `POST` | `/api/v1/analysis/volumetric` | 3D volumetric cut/fill earthworks & reservoir volume calculation |
| `POST` | `/api/v1/analysis/composite` | Planetary temporal pixel composites (median, greenest, clearest) |
| `GET` | `/api/v1/tiles/composite/{composite_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for temporal composite scenes |
| `POST` | `/api/v1/analysis/vrt` | Multi-scene virtual raster (VRT) seamless mosaicing & feather blending |
| `GET` | `/api/v1/tiles/vrt/{vrt_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for virtual raster mosaics |
| `POST` | `/api/v1/analysis/change-detection` | Bitemporal change detection differencing matrix & categorical stats |
| `GET` | `/api/v1/tiles/difference/{collection}/{pre}/{post}/{metric}/{z}/{x}/{y}.png` | Dynamic XYZ differenced change detection tile stream |
| `GET` | `/api/v1/integration/geotechnical/sensors` | In-situ geotechnical sensor network listing & spatial telemetry |
| `GET` | `/api/v1/integration/geotechnical/summary` | Asset-level geotechnical sensor network health & anomaly summary |
| `POST` | `/api/v1/analysis/bathymetry/eac` | Reservoir bathymetry & Elevation-Area-Capacity (EAC) curve analytics |
| `POST` | `/api/v1/tiles/cache/preload` | Multi-scale tile pyramid cache pre-generation & warming |
| `POST` | `/api/v1/drone/gcp/quality` | Drone photogrammetry GCP residual & RMSE quality assessment |
| `GET` | `/api/v1/drone/camera/calibration` | Aerial photogrammetry interior orientation parameters |
| `POST` | `/api/v1/analysis/twi` | Beven-Kirkby Topographic Wetness Index (TWI) calculation |
| `POST` | `/api/v1/analysis/slope-stability` | Infinite slope stability Factor of Safety ($FS$) & tier classification |
| `POST` | `/api/v1/analysis/hls/calibrate` | Harmonized Landsat-Sentinel-2 (HLS) multi-sensor cross-calibration |
| `POST` | `/api/v1/analysis/water-quality` | HAB water quality indices (NDCI, NDTI) & Carlson/OECD trophic state |
| `POST` | `/api/v1/analysis/lst/radiative-transfer` | Radiometric Land Surface Temperature (LST) Artis & Carnahan Planck inversion |
| `GET` | `/api/v1/tiles/thermal/lst/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for calibrated thermal/LST raster layers |
| `POST` | `/api/v1/analysis/topographic-correction` | Rugged terrain solar illumination geometry ($\cos i$) and C-Correction / Minnaert |
| `POST` | `/api/v1/analysis/insar/displacement` | Sentinel-1 SAR interferometric phase displacement & annualized velocity |
| `POST` | `/api/v1/analysis/insar/coherence` | Sentinel-1 SAR interferometric complex coherence magnitude & decorrelation |
| `GET` | `/api/v1/tiles/sar/insar/{pair_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for SAR InSAR interferograms & deformation |
| `POST` | `/api/v1/analysis/phenology/extract` | Harmonic Analysis of Time Series (HATS) 2-term Fourier curve fitting & phenometrics |
| `POST` | `/api/v1/analysis/composites/bap` | Best Available Pixel (BAP) multi-criteria cloud/opacity scored compositing |
| `GET` | `/api/v1/tiles/composites/bap/{composite_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for Best Available Pixel (BAP) composite mosaics |
| `POST` | `/api/v1/analysis/geometric/coregistration` | Sub-pixel Fourier phase correlation co-registration (AROSICS peak shifts) |
| `POST` | `/api/v1/analysis/point-cloud/filter` | Dense point cloud progressive morphological filtering (PMF) & ground classification |
| `POST` | `/api/v1/analysis/point-cloud/chm` | Canopy Height Model ($\text{CHM} = \max(0, \text{DSM} - \text{DTM})$) and hazard buffers |
| `GET` | `/api/v1/tiles/terrain/chm/{asset_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for Canopy Height Model (CHM) rasters |
| `POST` | `/api/v1/analysis/ortho/occlusion` | True orthorectification line-of-sight ray-tracing occlusion masking |
| `POST` | `/api/v1/analysis/ortho/seamlines` | Graph-cut seamline energy optimization ($E = E_{\text{color}} + \omega \cdot E_{\text{grad}}$) |
| `GET` | `/api/v1/tiles/ortho/true/{mosaic_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for true orthorectified seamless mosaics |
| `POST` | `/api/v1/byoc/buckets` | Bring Your Own COG (BYOC) multi-cloud storage registration (AWS S3, GCS, Azure) |
| `GET` | `/api/v1/byoc/buckets` | List registered external cloud storage buckets |
| `POST` | `/api/v1/byoc/buckets/{bucket_id}/sync` | Crawl and index external cloud storage COG assets into catalog |
| `GET` | `/api/v1/tiles/byoc/{bucket_id}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming directly from external cloud storage COGs |
| `POST` | `/api/v1/analysis/trend/mann-kendall` | Non-parametric Mann-Kendall trend testing & Sen's median slope estimator |
| `POST` | `/api/v1/analysis/atmospheric/dos1` | Chavez (1988) Dark Object Subtraction (DOS1) BOA surface reflectance |
| `POST` | `/api/v1/analysis/change/cva` | Multi-spectral Change Vector Analysis (CVA) magnitude & quadrant trajectory |
| `GET` | `/api/v1/tiles/change/cva/{pre}/{post}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for multi-spectral change vector analysis |
| `POST` | `/api/v1/analysis/soil/salinity` | Soil salinity & Land Degradation Neutrality hazard index mapping (NDSI/SI/CRSI) |
| `GET` | `/api/v1/tiles/soil/salinity/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for soil salinity hazard rasters |
| `POST` | `/api/v1/analysis/wildfire/thermal-hotspots` | Active fire thermal hotspot detection & Wooster Stefan-Boltzmann FRP estimation |
| `GET` | `/api/v1/tiles/wildfire/thermal-hotspots/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ tile streaming for thermal hotspot & fire radiative power overlays |
| `POST` | `/api/v1/analysis/hazards/dam-breach` | Tailings dam breach hydrodynamic inundation runout & Froehlich peak discharge |
| `GET` | `/api/v1/tiles/hazard/flood-inundation/{model_id}/{z}/{x}/{y}.png` | Dynamic XYZ flood inundation depth & velocity hazard tile stream |
| `POST` | `/api/v1/analysis/hazards/landslide` | Limit equilibrium Factor of Safety & Newmark critical acceleration hazard zonation |
| `GET` | `/api/v1/tiles/hazard/landslide/{sector_id}/{z}/{x}/{y}.png` | Dynamic XYZ landslide susceptibility tiering tile stream |
| `POST` | `/api/v1/analysis/drought/vhi` | Kogan Vegetation Health Index (VHI) & composite agricultural drought tiers |
| `GET` | `/api/v1/tiles/drought/vhi/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ agricultural drought severity tile stream |
| `POST` | `/api/v1/analysis/spectral/sam-mineral` | Kruse Spectral Angle Mapper (SAM) & USGS/ASTER mineral endmember classification |
| `GET` | `/api/v1/tiles/spectral/sam/{collection}/{item_id}/{mineral}/{z}/{x}/{y}.png` | Dynamic XYZ mineral & tailings endmember classification tile stream |
| `POST` | `/api/v1/analysis/vector/export` | Multi-format cloud-native vector export (GeoParquet, FlatGeobuf, GeoJSON, MVT) |
| `GET` | `/api/v1/tiles/vector/{layer_id}/{z}/{x}/{y}.pbf` | Dynamic Mapbox Vector Tile (MVT PBF) streaming |
| `POST` | `/api/v1/analysis/cryosphere/snow-cover` | Salomonson & Appel (2004) sub-pixel Fractional Snow Cover (FSC) & meltwater yield |
| `GET` | `/api/v1/tiles/cryosphere/snow-cover/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ sub-pixel fractional snow cover tile streaming |
| `POST` | `/api/v1/analysis/water/turbidity-tsm` | Nechad et al. (2010) & Dogliotti et al. (2015) switching TSM & aquatic turbidity |
| `GET` | `/api/v1/tiles/water/turbidity-tsm/{collection}/{item_id}/{metric}/{z}/{x}/{y}.png` | Dynamic XYZ aquatic turbidity & total suspended matter tile streaming |
| `POST` | `/api/v1/analysis/disturbance/breaks` | BFAST / LandTrendr piecewise linear segmentation & Chow break detection |
| `GET` | `/api/v1/tiles/disturbance/breaks/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ structural disturbance breakpoint tile streaming |
| `POST` | `/api/v1/analysis/agriculture/cwsi` | Idso et al. (1981) Non-Water-Stressed Baseline Crop Water Stress Index & ETa |
| `GET` | `/api/v1/tiles/agriculture/cwsi/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ crop water stress & evapotranspiration tile streaming |
| `POST` | `/api/v1/analysis/mosaic/spline-blend` | Burt & Adelson (1983) Laplacian pyramid multi-resolution spline mosaic blending |
| `GET` | `/api/v1/tiles/mosaic/spline/{mosaic_id}/{z}/{x}/{y}.png` | Dynamic XYZ multi-resolution spline blended mosaic tile streaming |
| `POST` | `/api/v1/drone/direct-georeferencing` | Schwarz topocentric lever-arm & Mostafa boresight attitude direct georeferencing |
| `GET` | `/api/v1/tiles/drone/direct-georeferencing/{mission_id}/{z}/{x}/{y}.png` | Dynamic XYZ direct georeferenced footprint tile streaming |
| `POST` | `/api/v1/analysis/crest-alignment` | OpenDRIVE / GeoJSON cumulative chainage & differential crest settlement vectorization |
| `GET` | `/api/v1/tiles/crest-alignment/{structure_id}/{z}/{x}/{y}.png` | Dynamic XYZ embankment crest alignment & settlement tile streaming |
| `POST` | `/api/v1/analysis/ps-insar/stack` | Ferretti PS candidate selection & spatiotemporal APS Gaussian filtering stack |
| `GET` | `/api/v1/tiles/ps-insar/stack/{stack_id}/{z}/{x}/{y}.png` | Dynamic XYZ PS-InSAR displacement time series tile streaming |
| `POST` | `/api/v1/ortho/true-orthorectification` | True orthorectification Z-buffer line-of-sight ray tracing & occlusion masking |
| `GET` | `/api/v1/tiles/ortho/true-orthorectification/{ortho_id}/{z}/{x}/{y}.png` | Dynamic XYZ true ortho occlusion & cast shadow tile streaming |
| `POST` | `/api/v1/mosaic/graphcut-seamlines` | Multiresolution seamline graph-cut energy optimization ($E = \omega_c E_c + \omega_g E_g + \omega_e E_e$) |
| `GET` | `/api/v1/tiles/mosaic/graphcut-seamlines/{mosaic_id}/{z}/{x}/{y}.png` | Dynamic XYZ graph-cut seamline mosaic tile streaming |
| `POST` | `/api/v1/preprocessing/brdf-nbar` | BRDF Ross-Thick Li-Sparse semi-empirical scattering kernel normalization (HLS NBAR) |
| `GET` | `/api/v1/tiles/preprocessing/brdf-nbar/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ BRDF NBAR surface reflectance tile streaming |
| `POST` | `/api/v1/sar/sbas-stack` | Small Baseline Subset (SBAS) multi-temporal InSAR SVD matrix inversion & LOS displacement |
| `GET` | `/api/v1/tiles/sar/sbas/{stack_id}/{z}/{x}/{y}.png` | Dynamic XYZ SBAS multi-temporal interferogram & displacement rate tile streaming |
| `POST` | `/api/v1/preprocessing/topographic-minnaert` | Topographic solar radiometric normalization (Minnaert $k$ & Teillet $C$-correction) |
| `GET` | `/api/v1/tiles/preprocessing/topographic-minnaert/{collection}/{item_id}/{z}/{x}/{y}.png` | Dynamic XYZ topographic Minnaert/C-correction normalized tile streaming |
| `POST` | `/api/v1/ortho/tie-point-rpc` | Automated sub-pixel tie-point RPC alignment & affine bias correction ($\Delta c, \Delta r$) |
| `GET` | `/api/v1/tiles/ortho/tie-point-rpc/{image_id}/{z}/{x}/{y}.png` | Dynamic XYZ sub-pixel RPC tie-point vector & alignment residual tile streaming |
| `POST` | `/api/v1/photogrammetry/queue` | Dispatch drone photogrammetry mission to NodeODM distributed cluster queue |
| `GET` | `/api/v1/photogrammetry/queue/{task_id}` | Real-time 9-stage photogrammetry progress, stage telemetry & logs |
| `POST` | `/api/v1/photogrammetry/queue/{task_id}/cancel` | Gracefully terminate photogrammetry processing task |
| `POST` | `/api/v1/mosaic/quality-mosaic` | Multi-scene cloud-free quality mosaic compositor (median, greenest, clearest) |
| `GET` | `/api/v1/tiles/mosaic/quality-mosaic/{mosaic_id}/{z}/{x}/{y}.png` | Dynamic XYZ quality mosaic compositor tile streaming |
| `POST` | `/api/v1/alerts/subscriptions` | Register multi-hazard AOI monitoring subscription |
| `GET` | `/api/v1/alerts/subscriptions` | List active hazard notification subscriptions |
| `POST` | `/api/v1/alerts/dispatch` | Dispatch manual/automated critical incident alert |
| `GET` | `/api/v1/alerts/stream` | Real-time Server-Sent Events (SSE) telemetry and alert stream |
| `POST` | `/api/v1/analysis/geotechnical/dam-break-hydrodynamics` | 2D shallow water dam-break hydrodynamic wave front simulation |
| `GET` | `/api/v1/analysis/geotechnical/dam-break/corridors/{sim_id}` | Dynamic downstream evacuation corridor buffers & infrastructure exposure |
| `GET` | `/api/v1/analysis/geotechnical/dam-break/{sim_id}` | Detailed simulation results & cross-sectional flood hydrographs |
| `GET` | `/api/v1/tiles/geotechnical/dam-break/{sim_id}/{z}/{x}/{y}.png` | Dynamic XYZ dam-break inundation depth & velocity tile stream |
| `POST` | `/api/v1/analysis/geotechnical/phreatic-seepage` | 2D Dupuit-Casagrande unconfined seepage flow, exit gradient & piping Factor of Safety |
| `POST` | `/api/v1/analysis/geotechnical/swrc-inversion` | Van Genuchten (1980) soil water retention curve (SWRC) parameter inversion |
| `GET` | `/api/v1/analysis/geotechnical/piezometers` | Multi-depth in-situ piezometric sensor telemetry & residual head analysis |
| `GET` | `/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/{z}/{x}/{y}.png` | Dynamic XYZ hydrogeological phreatic seepage & water table tile stream |
| `POST` | `/api/v1/analysis/geotechnical/slope-stability/bishop` | Bishop's Simplified limit equilibrium Factor of Safety ($FS$) iteration |
| `POST` | `/api/v1/analysis/geotechnical/slope-stability/search-critical` | 3D grid search for critical circular slip surface optimizing minimum $FS$ |
| `GET` | `/api/v1/analysis/geotechnical/insar-creep/{dam_id}` | Sentinel-1 satellite radar LOS creep displacement vector fusion |
| `GET` | `/api/v1/tiles/geotechnical/slope-stability/{sim_id}/{z}/{x}/{y}.png` | Dynamic XYZ slope stability critical slip hazard tile stream |
| `GET` | `/api/v1/annotations` | Geotechnical field inspection defect annotations (RFC 7946 GeoJSON) |
| `POST` | `/api/v1/work-orders` | Automated maintenance work order dispatch & ticket tracking |
| `GET` | `/api/v1/subscriptions` | Automated continuous AOI monitoring subscriptions & alert triggers |
| `POST` | `/api/v1/drone/register` | Drone COG orthomosaic ingestion, metric GSD, and pyramidal tiling |
| `GET` | `/api/v1/drone/{ortho_id}/tiles/{z}/{x}/{y}.png` | Centimeter-scale drone XYZ tile stream up to Zoom 22 |
| `POST` | `/api/v1/timeseries/trend` | Seasonal climatological MAD anomaly timeseries & Theil-Sen slope |
| `GET` | `/health` | Live system health and service status |

---

## 5. Verification & Quality Assurance

- **Unit & Integration Test Suite**: 242 tests passing via pytest (54.67s) / 241 tests passing via unittest (44.27s) across `test_schemas.py` (159), `test_api.py` (71), `test_scientific_rigor.py` (7), `test_stac_signing.py` (1), and `test_tile_server.py` (4) with 0 failures, 0 regressions, and 0 warnings.
- **Frontend Code Quality**: Verified 0 ESLint errors/warnings (`npm run lint` exited code 0); production bundle compiled cleanly via Vite (`npm run build` transformed 2,869 modules in 7.93s with 0 errors).
- **Health Monitoring Daemon**: `health_check_daemon.py` continuously inspecting port latency, Planetary Computer STAC/SAS tokens, cache storage, database integrity, and host system RAM. Latest single-pass inspection confirms System Status **HEALTHY** with 0 active anomalies.
- **Live Production Telemetry**: Continuous surveillance confirms System Status HEALTHY with 0 active anomalies and stable headroom.

---
*GIOS v2.5.12 — Verified and Approved for Production Deployment.*
