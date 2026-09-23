/**
 * GIOS Shared Frontend Constants, Scientific Standards & Tile Symbology
 * 
 * Provides unified enums, color ramps, index configurations, and USGS FIREMON
 * standards across all frontend components (MapExplorer, SpectralStudio, SwipeCurtain, etc.)
 */

/**
 * Supported Biophysical Spectral Indices with recommended symbology and physical bounds.
 */
export const SPECTRAL_INDICES = [
  {
    key: 'ndmi',
    name: 'NDMI',
    label: 'Normalized Difference Moisture Index',
    domain: 'Seepage & Canopy Moisture',
    formula: '(NIR - SWIR1) / (NIR + SWIR1)',
    bands: ['B08', 'B11'],
    defaultColormap: 'spectral',
    defaultRescale: '-0.2,0.6',
    autoStretch: [0.05, 0.45],
    unit: 'dimensionless',
    description: 'Sensitive to water content in vegetation canopy and soil moisture along embankment toes.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'ndvi',
    name: 'NDVI',
    label: 'Normalized Difference Vegetation Index',
    domain: 'Vegetation Health & Biomass',
    formula: '(NIR - Red) / (NIR + Red)',
    bands: ['B08', 'B04'],
    defaultColormap: 'viridis',
    defaultRescale: '-0.1,0.85',
    autoStretch: [0.15, 0.85],
    unit: 'dimensionless',
    description: 'Evaluates live green plant biomass, chlorophyll density, and vegetative vigor.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'mndwi',
    name: 'MNDWI',
    label: 'Modified Normalized Difference Water Index',
    domain: 'Surface Inundation & Flood Extent',
    formula: '(Green - SWIR1) / (Green + SWIR1)',
    bands: ['B03', 'B11'],
    defaultColormap: 'turbo',
    defaultRescale: '-0.3,0.5',
    autoStretch: [-0.2, 0.4],
    unit: 'dimensionless',
    description: 'Suppresses built-up urban features while amplifying open water bodies and flood inundation.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'ndci',
    name: 'NDCI',
    label: 'Normalized Difference Chlorophyll Index',
    domain: 'Harmful Algae Blooms (HAB)',
    formula: '(RedEdge1 - Red) / (RedEdge1 + Red)',
    bands: ['B05', 'B04'],
    defaultColormap: 'viridis',
    defaultRescale: '-0.1,0.5',
    autoStretch: [-0.05, 0.4],
    unit: 'dimensionless',
    description: 'Quantifies chlorophyll-a concentration and microcystin bloom risk in inland reservoirs.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: true
  },
  {
    key: 'nbr',
    name: 'NBR',
    label: 'Normalized Burn Ratio',
    domain: 'Fire Scars & Fuel Moisture',
    formula: '(NIR - SWIR2) / (NIR + SWIR2)',
    bands: ['B08', 'B12'],
    defaultColormap: 'turbo',
    defaultRescale: '-0.4,0.8',
    autoStretch: [-0.2, 0.6],
    unit: 'dimensionless',
    description: 'Highlights burned areas and high-heat signatures by contrasting NIR and SWIR2 reflectance.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'evi',
    name: 'EVI',
    label: 'Enhanced Vegetation Index',
    domain: 'Dense Canopy Vegetation',
    formula: '2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)',
    bands: ['B08', 'B04', 'B02'],
    defaultColormap: 'viridis',
    defaultRescale: '-0.1,0.9',
    autoStretch: [0.1, 0.8],
    unit: 'dimensionless',
    description: 'Atmospherically corrected vegetation index that resists saturation in high-biomass regions.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'savi',
    name: 'SAVI',
    label: 'Soil-Adjusted Vegetation Index',
    domain: 'Arid & Sparse Vegetation',
    formula: '(1 + L) * (NIR - Red) / (NIR + Red + L)',
    bands: ['B08', 'B04'],
    defaultColormap: 'viridis',
    defaultRescale: '-0.1,0.8',
    autoStretch: [0.1, 0.7],
    unit: 'dimensionless',
    description: 'Incorporates a soil brightness correction factor (L=0.5) for arid soils and embankments.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'lst',
    name: 'LST',
    label: 'Land Surface Temperature',
    domain: 'Thermal & Geotechnical Hotspots',
    formula: 'Landsat B10 Radiance -> Celsius',
    bands: ['B10'],
    defaultColormap: 'magma',
    defaultRescale: '10.0,45.0',
    autoStretch: [12.0, 42.0],
    unit: '°C',
    description: 'Calibrated radiometric surface skin temperature in degrees Celsius from thermal infrared.',
    isDifferenced: false,
    requiresThermal: true,
    requiresRedEdge: false
  },
  {
    key: 'rgb',
    name: 'True Color (RGB)',
    label: 'Natural Color Composite',
    domain: 'Visual Baseline Inspection',
    formula: 'Red (B04), Green (B03), Blue (B02)',
    bands: ['B04', 'B03', 'B02'],
    defaultColormap: null,
    defaultRescale: '0,255',
    autoStretch: [10.0, 240.0],
    unit: 'reflectance',
    description: 'Calibrated surface reflectance composite simulating natural human eye perception.',
    isDifferenced: false,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'dnbr',
    name: 'ΔNBR',
    label: 'Differenced Normalized Burn Ratio',
    domain: 'USGS FIREMON Burn Severity',
    formula: 'NBR_pre - NBR_post',
    bands: ['B08', 'B12'],
    defaultColormap: 'turbo',
    defaultRescale: '-0.2,0.8',
    autoStretch: [0.1, 0.66],
    unit: 'dimensionless',
    description: 'Differenced NBR assessing fire severity and biomass loss between pre- and post-fire scenes.',
    isDifferenced: true,
    requiresThermal: false,
    requiresRedEdge: false
  },
  {
    key: 'rdnbr',
    name: 'RdNBR',
    label: 'Relative Differenced Normalized Burn Ratio',
    domain: 'High-Slope Fire Severity',
    formula: 'dNBR / sqrt(|NBR_pre|)',
    bands: ['B08', 'B12'],
    defaultColormap: 'turbo',
    defaultRescale: '-0.5,1.5',
    autoStretch: [0.15, 1.2],
    unit: 'dimensionless',
    description: 'Relative differenced NBR normalized by pre-fire canopy density for steep terrain assessment.',
    isDifferenced: true,
    requiresThermal: false,
    requiresRedEdge: false
  }
];

/**
 * Colormaps supported by the dynamic XYZ raster tile renderer.
 */
export const COLORMAPS = [
  {
    key: 'spectral',
    label: 'Spectral (Moisture & Hazard Detection)',
    description: 'High-contrast diverging palette for soil moisture and seepage',
    gradientCss: 'from-blue-600 via-green-400 via-yellow-400 to-red-600',
    colorStops: ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']
  },
  {
    key: 'viridis',
    label: 'Viridis (Vegetation & Biophysical Health)',
    description: 'Perceptually uniform sequential palette for vegetation vigor',
    gradientCss: 'from-purple-900 via-teal-500 to-yellow-300',
    colorStops: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725']
  },
  {
    key: 'turbo',
    label: 'Turbo (Thermal & High-Contrast Severity)',
    description: 'Rainbow alternative with improved perceptual linearity for wildfire and inundation',
    gradientCss: 'from-blue-700 via-cyan-400 via-green-400 via-yellow-400 to-red-600',
    colorStops: ['#30123b', '#1ae4b6', '#a2fc3c', '#febb2d', '#7a0403']
  },
  {
    key: 'rdylbu',
    label: 'Red-Yellow-Blue (Diverging Water & Drought)',
    description: 'Diverging palette for drought stress and hydrological anomalies',
    gradientCss: 'from-red-600 via-yellow-300 to-blue-600',
    colorStops: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4']
  },
  {
    key: 'terrain',
    label: 'Terrain (Topography & Physical Elevation)',
    description: 'Earth-tone palette suitable for digital elevation models and bathymetry',
    gradientCss: 'from-blue-700 via-emerald-600 via-yellow-600 to-stone-200',
    colorStops: ['#333399', '#006600', '#669900', '#ffff66', '#cc6600', '#ffffff']
  },
  {
    key: 'magma',
    label: 'Magma (Thermal Infrared & Radiation)',
    description: 'High-radiance dark-to-bright palette for Land Surface Temperature',
    gradientCss: 'from-black via-purple-800 via-pink-600 to-amber-300',
    colorStops: ['#000004', '#51127c', '#b73779', '#fc8961', '#fec087']
  },
  {
    key: 'inferno',
    label: 'Inferno (High Radiance / Active Fire)',
    description: 'Saturated thermal palette for high-intensity wildfire and hotspot tracking',
    gradientCss: 'from-black via-red-800 via-amber-500 to-yellow-200',
    colorStops: ['#000004', '#57106e', '#bb3754', '#f98e09', '#fcffa4']
  },
  {
    key: 'cividis',
    label: 'Cividis (Colorblind Accessible)',
    description: 'Color-vision-deficiency optimized palette for universal accessibility',
    gradientCss: 'from-blue-950 via-teal-700 to-yellow-400',
    colorStops: ['#00204d', '#414d6b', '#7c7b78', '#c3af6d', '#ffea46']
  }
];

/**
 * Remote Sensing & Aerial Imagery Collections.
 */
export const SATELLITE_COLLECTIONS = [
  {
    id: 'sentinel-2-l2a',
    label: 'Sentinel-2 MSI Level-2A (ESA / 10m-20m)',
    description: 'Multi-spectral surface reflectance with 5-day revisit cycle.',
    resolution_m: 10.0,
    revisit_days: 5.0
  },
  {
    id: 'landsat-c2-l2',
    label: 'Landsat 8/9 Collection 2 Level-2 (USGS / 30m)',
    description: 'Multi-spectral and thermal infrared surface temperature.',
    resolution_m: 30.0,
    revisit_days: 16.0
  },
  {
    id: 'drone-ortho',
    label: 'High-Resolution UAS Orthomosaic (<3cm GSD)',
    description: 'Centimeter-scale drone survey photogrammetry Cloud-Optimized GeoTIFF.',
    resolution_m: 0.028,
    revisit_days: null
  }
];

/**
 * Satellite and aerial imagery collection identifiers matching SatelliteCollection enum.
 */
export const COLLECTIONS = {
  SENTINEL_2: 'sentinel-2-l2a',
  LANDSAT_C2_L2: 'landsat-c2-l2',
  DRONE_ORTHO: 'drone-ortho',
  DRONE: 'drone',
  WILDFIRE: 'wildfire'
};

/**
 * Spectral index identifiers matching SpectralIndex enum.
 */
export const SPECTRAL_INDEX_KEYS = {
  NDVI: 'ndvi',
  NDMI: 'ndmi',
  NDCI: 'ndci',
  MNDWI: 'mndwi',
  LST: 'lst',
  NBR: 'nbr',
  EVI: 'evi',
  SAVI: 'savi',
  RGB: 'rgb',
  DNBR: 'dnbr',
  RDNBR: 'rdnbr'
};

/**
 * Colormap identifiers matching TileColormap enum.
 */
export const COLORMAP_KEYS = {
  SPECTRAL: 'spectral',
  VIRIDIS: 'viridis',
  TURBO: 'turbo',
  RDYLBU: 'rdylbu',
  TERRAIN: 'terrain',
  MAGMA: 'magma',
  INFERNO: 'inferno',
  CIVIDIS: 'cividis'
};

/**
 * USGS FIREMON Two-Scene Differenced Burn Severity Classification Standard.
 */
export const FIREMON_SEVERITY_LEVELS = [
  {
    category: 'High Severity',
    minDnbr: 0.660,
    color: '#7f0000',
    badgeClass: 'bg-red-950/80 text-red-300 border-red-800',
    description: 'Deep canopy mortality, total ground char, high post-fire erosion susceptibility.'
  },
  {
    category: 'Moderate-High Severity',
    minDnbr: 0.440,
    color: '#d7301f',
    badgeClass: 'bg-orange-950/80 text-orange-300 border-orange-800',
    description: 'Substantial canopy scorched, understory consumed.'
  },
  {
    category: 'Moderate-Low Severity',
    minDnbr: 0.270,
    color: '#fc8d59',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800',
    description: 'Mixed surface fire, light scorch, localized duff consumption.'
  },
  {
    category: 'Low Severity',
    minDnbr: 0.100,
    color: '#fdbb84',
    badgeClass: 'bg-yellow-950/80 text-yellow-300 border-yellow-800',
    description: 'Surface char on litter, minimal crown or overstory scorch.'
  },
  {
    category: 'Unburned / Low Change',
    minDnbr: -0.100,
    color: '#2ca25f',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    description: 'No detectable fire damage or enhanced post-event vegetation regrowth.'
  }
];

/**
 * Classifies a delta-NBR value according to USGS FIREMON standards.
 * 
 * @param {number} dnbr - Calculated delta-NBR value
 * @returns {typeof FIREMON_SEVERITY_LEVELS[0]} Matching severity level configuration
 */
export const classifyDnbr = (dnbr) => {
  if (dnbr === null || dnbr === undefined || isNaN(Number(dnbr)) || !isFinite(Number(dnbr))) {
    return FIREMON_SEVERITY_LEVELS[FIREMON_SEVERITY_LEVELS.length - 1];
  }
  const val = Number(dnbr);
  for (const level of FIREMON_SEVERITY_LEVELS) {
    if (val >= level.minDnbr) {
      return level;
    }
  }
  return FIREMON_SEVERITY_LEVELS[FIREMON_SEVERITY_LEVELS.length - 1];
};

/**
 * Climatological MAD Seasonal Anomaly Levels & Watchdog Thresholds.
 * Parity implementation with CLIMATOLOGICAL_ANOMALY_LEVELS in app/models/schemas.py.
 */
export const CLIMATOLOGICAL_ANOMALY_LEVELS = [
  {
    level: 'CRITICAL_ANOMALY',
    minZ: 2.5,
    min_z: 2.5,
    severity: 'critical',
    label: 'Critical Anomaly (|z| ≥ 2.5)',
    badgeClass: 'bg-red-950/80 text-red-300 border-red-800',
    badge_class: 'bg-red-950/80 text-red-300 border-red-800',
    isAnomaly: true,
    is_anomaly: true,
    description: 'Severe statistical anomaly exceeding 2.5 MAD from historical seasonal baseline.'
  },
  {
    level: 'WARNING_ANOMALY',
    minZ: 2.0,
    min_z: 2.0,
    severity: 'warning',
    label: 'Severe Warning (2.0 ≤ |z| < 2.5)',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800',
    badge_class: 'bg-amber-950/80 text-amber-300 border-amber-800',
    isAnomaly: true,
    is_anomaly: true,
    description: 'Substantial deviation from seasonal expectation requiring operational monitoring.'
  },
  {
    level: 'MODERATE_ANOMALY',
    minZ: 1.5,
    min_z: 1.5,
    severity: 'moderate',
    label: 'Moderate Anomaly (1.5 ≤ |z| < 2.0)',
    badgeClass: 'bg-yellow-950/80 text-yellow-300 border-yellow-800',
    badge_class: 'bg-yellow-950/80 text-yellow-300 border-yellow-800',
    isAnomaly: false,
    is_anomaly: false,
    description: 'Elevated variation within acceptable seasonal boundary thresholds.'
  },
  {
    level: 'NOMINAL',
    minZ: 0.0,
    min_z: 0.0,
    severity: 'nominal',
    label: 'Nominal / Baseline (|z| < 1.5)',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    badge_class: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    isAnomaly: false,
    is_anomaly: false,
    description: 'Observations conform to climatological median baseline.'
  }
];

/**
 * Classifies a climatological seasonal z-score against operational anomaly thresholds.
 * Parity implementation with classify_z_score() in app/models/schemas.py.
 * 
 * @param {number|string|null|undefined} z - Seasonally normalized z-score
 * @returns {typeof CLIMATOLOGICAL_ANOMALY_LEVELS[0]} Matching anomaly classification
 */
export const classifyZScore = (z) => {
  if (z === null || z === undefined || isNaN(Number(z)) || !isFinite(Number(z))) {
    return CLIMATOLOGICAL_ANOMALY_LEVELS[CLIMATOLOGICAL_ANOMALY_LEVELS.length - 1];
  }
  const val = Math.abs(Number(z));
  for (const level of CLIMATOLOGICAL_ANOMALY_LEVELS) {
    if (val >= level.minZ) {
      return level;
    }
  }
  return CLIMATOLOGICAL_ANOMALY_LEVELS[CLIMATOLOGICAL_ANOMALY_LEVELS.length - 1];
};

/**
 * Retrieves metadata for a spectral index by key.
 * 
 * @param {string} key - Spectral index key (e.g. 'ndmi', 'ndvi')
 * @returns {typeof SPECTRAL_INDICES[0]|undefined}
 */
export const getIndexMetadata = (key) => {
  if (!key) return undefined;
  return SPECTRAL_INDICES.find((idx) => idx.key.toLowerCase() === key.toLowerCase());
};

/**
 * Retrieves metadata for a colormap by key.
 * 
 * @param {string} key - Colormap key (e.g. 'spectral', 'viridis')
 * @returns {typeof COLORMAPS[0]|undefined}
 */
export const getColormapMetadata = (key) => {
  if (!key) return undefined;
  return COLORMAPS.find((cm) => cm.key.toLowerCase() === key.toLowerCase());
};

/**
 * Retrieves metadata for a satellite/aerial collection by ID.
 * 
 * @param {string} id - Collection identifier (e.g. 'sentinel-2-l2a', 'landsat-c2-l2')
 * @returns {typeof SATELLITE_COLLECTIONS[0]|undefined}
 */
export const getSatelliteCollectionMetadata = (id) => {
  if (!id) return undefined;
  return SATELLITE_COLLECTIONS.find((col) => col.id.toLowerCase() === id.toLowerCase());
};

/**
 * Retrieves all registered spectral indices metadata.
 * 
 * @returns {typeof SPECTRAL_INDICES}
 */
export const listSpectralIndices = () => SPECTRAL_INDICES;

/**
 * Retrieves all registered colormaps metadata.
 * 
 * @returns {typeof COLORMAPS}
 */
export const listColormaps = () => COLORMAPS;

/**
 * Retrieves all supported satellite and drone collections metadata.
 * 
 * @returns {typeof SATELLITE_COLLECTIONS}
 */
export const listSatelliteCollections = () => SATELLITE_COLLECTIONS;

/**
 * Retrieves the recommended 2%-98% cumulative auto stretch bounds for an index.
 * Parity implementation with get_auto_stretch() in app/models/schemas.py.
 * 
 * @param {string} key - Spectral index key
 * @param {[number, number]} [defaultValue=[-0.2, 0.6]] - Fallback bounds
 * @returns {[number, number]} [autoMin, autoMax]
 */
export const getAutoStretch = (key, defaultValue = [-0.2, 0.6]) => {
  if (!key) return defaultValue;
  const meta = getIndexMetadata(key);
  if (meta && meta.autoStretch && Array.isArray(meta.autoStretch)) {
    return meta.autoStretch;
  }
  return defaultValue;
};

/**
 * Retrieves Tailwind CSS color gradient classes for a colormap palette.
 * Parity implementation with get_colormap_gradient() in app/models/schemas.py.
 * 
 * @param {string} key - Colormap key
 * @param {string} [defaultGradient='from-blue-600 via-green-400 via-yellow-400 to-red-600'] - Fallback gradient
 * @returns {string} Tailwind CSS gradient classes
 */
export const getColormapGradient = (key, defaultGradient = 'from-blue-600 via-green-400 via-yellow-400 to-red-600') => {
  if (!key) return defaultGradient;
  const meta = getColormapMetadata(key);
  if (meta && meta.gradientCss) {
    return meta.gradientCss;
  }
  return defaultGradient;
};

/**
 * Retrieves hex color stops defining the ramp for a colormap palette.
 * Parity implementation with get_colormap_color_stops() in app/models/schemas.py.
 * 
 * @param {string} key - Colormap key
 * @param {string[]} [defaultStops=['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']] - Fallback stops
 * @returns {string[]} Hex color stops array
 */
export const getColormapColorStops = (key, defaultStops = ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']) => {
  if (!key) return defaultStops;
  const meta = getColormapMetadata(key);
  if (meta && meta.colorStops && Array.isArray(meta.colorStops)) {
    return meta.colorStops;
  }
  return defaultStops;
};

/**
 * Parses a comma-separated rescale range string (e.g. "-0.2,0.6") or array into a [min, max] numeric pair.
 * 
 * @param {string|number[]|null|undefined} rescale - Formatted rescale string or array
 * @param {[number, number]} [defaultValue=[-1.0, 1.0]] - Fallback default
 * @returns {[number, number]} Parsed min and max numeric values
 */
export const parseRescale = (rescale, defaultValue = [-1.0, 1.0]) => {
  if (!rescale) return defaultValue;
  if (Array.isArray(rescale) && rescale.length === 2) {
    const min = parseFloat(rescale[0]);
    const max = parseFloat(rescale[1]);
    if (!isNaN(min) && !isNaN(max)) return [min, max];
    return defaultValue;
  }
  if (typeof rescale !== 'string') return defaultValue;
  const parts = rescale.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return defaultValue;
};

/**
 * Validates and normalizes a spectral index key with fallback.
 * 
 * @param {string} [indexKey] - Spectral index key (e.g. 'ndmi', 'ndvi')
 * @param {string} [defaultKey='rgb'] - Fallback spectral index
 * @returns {string} Validated spectral index key
 */
export const validateSpectralIndex = (indexKey, defaultKey = 'rgb') => {
  if (!indexKey || typeof indexKey !== 'string') return defaultKey;
  const normalized = indexKey.toLowerCase().trim();
  const exists = SPECTRAL_INDICES.some((idx) => idx.key === normalized);
  return exists ? normalized : defaultKey;
};

/**
 * Validates and normalizes a colormap palette key with fallback.
 * 
 * @param {string} [colormapKey] - Colormap key (e.g. 'spectral', 'viridis')
 * @param {string} [defaultKey='spectral'] - Fallback colormap key
 * @returns {string} Validated colormap key
 */
export const validateColormap = (colormapKey, defaultKey = 'spectral') => {
  if (!colormapKey || typeof colormapKey !== 'string') return defaultKey;
  const normalized = colormapKey.toLowerCase().trim();
  const exists = COLORMAPS.some((cm) => cm.key === normalized);
  return exists ? normalized : defaultKey;
};

/**
 * Map Viewport Defaults.
 */
export const DEFAULT_MAP_CONFIG = {
  center: [37.0582, -121.0744], // San Luis Dam Embankment, CA
  defaultZoom: 13,
  macroZoom: 13,
  microZoom: 19,
  minZoom: 2,
  maxZoom: 24,
  maxNativeZoom: 22
};

export const DEFAULT_MAP_VIEWPORT_CONFIG = DEFAULT_MAP_CONFIG;

/**
 * Geotechnical and environmental hazard categories matching backend HazardCategory enum.
 */
export const HAZARD_CATEGORIES = {
  SEEPAGE: 'seepage',
  INUNDATION: 'inundation',
  HAB: 'hab',
  DROUGHT: 'drought',
  WILDFIRE: 'wildfire'
};

/**
 * Hazard operational severity tiers matching backend HazardSeverity enum.
 */
export const HAZARD_SEVERITIES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  MODERATE: 'moderate',
  LOW: 'low'
};

/**
 * Automated alert severity levels matching backend AlertSeverity enum.
 */
export const ALERT_SEVERITIES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Drone orthomosaic and mission lifecycle statuses matching backend DroneStatus enum.
 */
export const DRONE_STATUSES = {
  READY: 'READY',
  PROCESSING: 'PROCESSING',
  FAILED: 'FAILED',
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING'
};

/**
 * Proactive alert event types streamed by backend over SSE (/api/v1/agent/stream-alerts).
 */
export const PROACTIVE_ALERT_TYPES = {
  JARVIS: 'jarvis_proactive_alert',
  SATELLITE: 'satellite_anomaly_alert'
};

/**
 * Canonical GIOS API endpoint paths shared between frontend and backend.
 */
export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH_TOKEN: '/api/v1/auth/token',
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_ME: '/api/v1/auth/me',
  EVENTS: '/api/v1/events',
  EVENT_DETAIL: (id) => `/api/v1/events/${id}`,
  ANALYSIS_INDICES: '/api/v1/analysis/indices',
  ANALYSIS_PIXEL_PROBE: '/api/v1/analysis/pixel-probe',
  ANALYSIS_ZONAL_STATS: '/api/v1/analysis/zonal-stats',
  TILES_DYNAMIC: (collection, itemId, z, x, y) => `/api/v1/tiles/${collection}/${itemId}/${z}/${x}/${y}.png`,
  WILDFIRE_BURN_SEVERITY: '/api/v1/wildfire/burn-severity',
  WILDFIRE_DNBR_TILE: (z, x, y) => `/api/v1/tiles/wildfire/dnbr/${z}/${x}/${y}.png`,
  DRONE_MISSIONS: '/api/v1/drone/missions',
  DRONE_SCHEDULE: '/api/v1/drone/missions/schedule',
  DRONE_ORTHOMOSAICS: '/api/v1/drone/orthomosaics',
  DRONE_REGISTER: '/api/v1/drone/register',
  DRONE_UPLOAD: '/api/v1/drone/upload',
  DRONE_TILE: (orthoId, z, x, y) => `/api/v1/drone/${orthoId}/tiles/${z}/${x}/${y}.png`,
  TIMESERIES_TREND: '/api/v1/timeseries/trend',
  AGENT_CHAT: '/api/v1/agent/chat',
  AGENT_STREAM_ALERTS: '/api/v1/agent/stream-alerts',
  AGENT_TRIGGER_MOCK_ALERT: '/api/v1/agent/trigger-mock-alert',
  SPATIAL_BUFFER: '/api/v1/spatial/buffer',
  SPATIAL_LAYERS: (layerType = 'critical_infrastructure') => `/api/v1/spatial/layers/${layerType}`,
  REPORTS_PDF: '/api/v1/reports/pdf',
  DATA_SEARCH: '/api/v1/data/search',
  INTEGRATION_USGS: (siteId) => `/api/v1/integration/usgs/${siteId}`,
  SATELLITE_GEE: '/api/v1/satellite/gee',
  SATELLITE_SENTINEL: '/api/v1/satellite/sentinel',
  IOT_INGEST: '/api/v1/iot/ingest',
  IOT_DATA: '/api/v1/iot/data'
};

/**
 * Formats an API endpoint path by name with dynamic parameters.
 * Parity implementation with format_api_route() in app/models/schemas.py.
 * 
 * @param {string} endpointKey - Key corresponding to API_ROUTE_CONTRACTS / API_ENDPOINTS
 * @param {Record<string, any>} [params={}] - Interpolation parameters
 * @returns {string} Formatted endpoint URL path
 */
export const formatApiRoute = (endpointKey, params = {}) => {
  if (!endpointKey || typeof endpointKey !== 'string') {
    throw new Error('endpointKey must be a non-empty string');
  }
  const normalizedKey = endpointKey.toUpperCase();
  const endpoint = API_ENDPOINTS[normalizedKey] || API_ENDPOINTS[endpointKey];
  if (!endpoint) {
    throw new Error(`Unknown API endpoint key: ${endpointKey}`);
  }
  if (typeof endpoint === 'function') {
    switch (normalizedKey) {
      case 'EVENT_DETAIL':
        return endpoint(params.id || params.event_id);
      case 'TILES_DYNAMIC':
        return endpoint(params.collection, params.itemId || params.item_id, params.z, params.x, params.y);
      case 'WILDFIRE_DNBR_TILE':
        return endpoint(params.z, params.x, params.y);
      case 'DRONE_TILE':
        return endpoint(params.orthoId || params.ortho_id, params.z, params.x, params.y);
      case 'SPATIAL_LAYERS':
        return endpoint(params.layerType || params.layer_id || 'critical_infrastructure');
      case 'INTEGRATION_USGS':
        return endpoint(params.siteId || params.site_id);
      default:
        return endpoint(params);
    }
  }
  return endpoint;
};

/**
 * Parses a bounding box input into [min_lon, min_lat, max_lon, max_lat] coordinates.
 * Supports comma-separated strings, 4-element arrays, and objects.
 * Parity implementation with parse_bbox() in app/models/schemas.py.
 * 
 * @param {string|number[]|Object|null|undefined} val - Bounding box input
 * @param {[number, number, number, number]} [defaultValue=[-121.2, 36.95, -120.95, 37.15]] - Default bounds
 * @returns {[number, number, number, number]} [min_lon, min_lat, max_lon, max_lat]
 */
export const parseBbox = (val, defaultValue = [-121.2, 36.95, -120.95, 37.15]) => {
  if (!val) return defaultValue;
  if (Array.isArray(val) && val.length === 4) {
    const coords = val.map(Number);
    if (coords.every((c) => !isNaN(c) && isFinite(c))) return coords;
    return defaultValue;
  }
  if (typeof val === 'object' && val !== null) {
    const min_lon = Number(val.min_lon ?? val.west ?? val.min_x);
    const min_lat = Number(val.min_lat ?? val.south ?? val.min_y);
    const max_lon = Number(val.max_lon ?? val.east ?? val.max_x);
    const max_lat = Number(val.max_lat ?? val.north ?? val.max_y);
    if (!isNaN(min_lon) && !isNaN(min_lat) && !isNaN(max_lon) && !isNaN(max_lat)) {
      return [min_lon, min_lat, max_lon, max_lat];
    }
    return defaultValue;
  }
  if (typeof val === 'string') {
    const parts = val.split(',').map((p) => Number(p.trim()));
    if (parts.length === 4 && parts.every((p) => !isNaN(p) && isFinite(p))) {
      return parts;
    }
  }
  return defaultValue;
};

/**
 * Converts a standard [min_lon, min_lat, max_lon, max_lat] bbox into Leaflet LatLngBounds [[south, west], [north, east]].
 * 
 * @param {string|number[]|Object} bbox - Bounding box
 * @returns {[[number, number], [number, number]]} Leaflet LatLngBounds
 */
export const bboxToLeafletBounds = (bbox) => {
  const [min_lon, min_lat, max_lon, max_lat] = parseBbox(bbox);
  return [[min_lat, min_lon], [max_lat, max_lon]];
};

/**
 * Formats a bounding box into a standard comma-delimited string "min_lon,min_lat,max_lon,max_lat".
 * 
 * @param {string|number[]|Object} bbox - Bounding box
 * @returns {string} Formatted string
 */
export const formatBbox = (bbox) => {
  const [min_lon, min_lat, max_lon, max_lat] = parseBbox(bbox);
  return `${min_lon},${min_lat},${max_lon},${max_lat}`;
};

/**
 * Normalizes an API error or exception into a standardized error object.
 * Parity implementation with ApiErrorResponse in app/models/schemas.py.
 * 
 * @param {any} error - Axios error, Fetch error, or string
 * @param {string} [fallbackMessage='An unexpected server error occurred'] - Fallback message
 * @returns {{ detail: string, error_code: string|null, status_code: number, timestamp: string }}
 */
export const formatApiError = (error, fallbackMessage = 'An unexpected server error occurred') => {
  let detail = fallbackMessage;
  let error_code = null;
  let status_code = 500;

  if (error && typeof error === 'object') {
    if (error.response) {
      status_code = error.response.status || 500;
      const data = error.response.data;
      if (typeof data === 'string') {
        detail = data;
      } else if (data && typeof data === 'object') {
        detail = data.detail || data.message || data.error || fallbackMessage;
        error_code = data.error_code || data.code || null;
      }
    } else if (error.message) {
      detail = error.message;
    }
  } else if (typeof error === 'string') {
    detail = error;
  }

  return {
    detail: String(detail),
    error_code: error_code ? String(error_code) : null,
    status_code: Number(status_code),
    timestamp: new Date().toISOString()
  };
};

/**
 * Formats a metric GSD in centimeters into a human-readable display string.
 * 
 * @param {number|null|undefined} gsdCm - Ground sample distance in centimeters
 * @returns {string} Formatted GSD string (e.g. "2.85 cm/px")
 */
export const formatGsdDisplay = (gsdCm) => {
  if (gsdCm === null || gsdCm === undefined || isNaN(Number(gsdCm))) return 'N/A';
  const val = Number(gsdCm);
  return `${val.toFixed(2)} cm/px`;
};

/**
 * Constructs a dynamic XYZ tile URL path matching backend DynamicTileParams.
 * 
 * @param {string} collection - Satellite or drone collection identifier
 * @param {string} itemId - STAC scene ID or drone orthomosaic ID
 * @param {number|string} z - Tile zoom
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {Object} [options={}] - Query options (index, rescale, colormap, pre, post)
 * @param {string} [basePrefix='/api/v1'] - API base prefix
 * @returns {string} Fully formatted tile URL
 */
export const buildTileUrl = (collection, itemId, z, x, y, options = {}, basePrefix = '/api/v1') => {
  const col = typeof collection === 'object' && collection !== null ? (collection.id || collection.value || String(collection)) : collection;
  const path = `${basePrefix}/tiles/${col}/${itemId}/${z}/${x}/${y}.png`;
  const params = new URLSearchParams();
  if (options.index) {
    const idx = typeof options.index === 'object' && options.index !== null ? (options.index.key || options.index.value || String(options.index)) : options.index;
    params.set('index', idx);
  }
  if (options.rescale) params.set('rescale', options.rescale);
  if (options.colormap) {
    const cm = typeof options.colormap === 'object' && options.colormap !== null ? (options.colormap.key || options.colormap.value || String(options.colormap)) : options.colormap;
    params.set('colormap', cm);
  }
  if (options.pre) params.set('pre', options.pre);
  if (options.post) params.set('post', options.post);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
};

/**
 * Constructs a drone orthomosaic XYZ tile URL matching backend DynamicTileParams.build_drone_tile_url.
 * 
 * @param {string} orthoId - Drone orthomosaic identifier
 * @param {number|string} z - Tile zoom
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {string} [basePrefix='/api/v1'] - API base prefix
 * @returns {string} Fully formatted drone tile URL
 */
export const buildDroneTileUrl = (orthoId, z, x, y, basePrefix = '/api/v1') => {
  return `${basePrefix}/drone/${orthoId}/tiles/${z}/${x}/${y}.png`;
};

/**
 * Constructs a wildfire dNBR differenced tile URL matching backend DynamicTileParams.build_wildfire_tile_url.
 * 
 * @param {number|string} z - Tile zoom
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {string} [pre] - Pre-fire baseline date
 * @param {string} [post] - Post-fire date
 * @param {Object} [options={}] - Additional options (colormap, rescale)
 * @param {string} [basePrefix='/api/v1'] - API base prefix
 * @returns {string} Fully formatted wildfire tile URL
 */
export const buildWildfireTileUrl = (z, x, y, pre, post, options = {}, basePrefix = '/api/v1') => {
  const path = `${basePrefix}/tiles/wildfire/dnbr/${z}/${x}/${y}.png`;
  const params = new URLSearchParams();
  if (pre) params.set('pre', pre);
  if (post) params.set('post', post);
  if (options.colormap) params.set('colormap', options.colormap);
  if (options.rescale) params.set('rescale', options.rescale);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
};

/**
 * Converts WGS84 coordinates [lat, lon] to Slippy Map XYZ tile coordinates [x, y] at given zoom level.
 * Parity implementation with lat_lon_to_tile() in app/models/schemas.py.
 * 
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} zoom - Web Mercator zoom level (0-24)
 * @returns {[number, number]} [tileX, tileY]
 */
export const latLonToTile = (lat, lon, zoom) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180.0) / 360.0) * n);
  const latRad = (lat * Math.PI) / 180.0;
  const y = Math.floor(((1.0 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2.0) * n);
  const maxTile = Math.floor(n) - 1;
  return [Math.max(0, Math.min(x, maxTile)), Math.max(0, Math.min(y, maxTile))];
};

/**
 * Calculates the WGS84 geographic bounding box [min_lon, min_lat, max_lon, max_lat] for tile (z, x, y).
 * Parity implementation with tile_to_bbox() in app/models/schemas.py.
 * 
 * @param {number} z - Zoom level
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 * @returns {[number, number, number, number]} [min_lon, min_lat, max_lon, max_lat]
 */
export const tileToBbox = (z, x, y) => {
  const n = Math.pow(2, z);
  const minLon = (x / n) * 360.0 - 180.0;
  const maxLon = ((x + 1) / n) * 360.0 - 180.0;
  const latRadTop = Math.atan(Math.sinh(Math.PI * (1.0 - (2.0 * y) / n)));
  const latRadBottom = Math.atan(Math.sinh(Math.PI * (1.0 - (2.0 * (y + 1)) / n)));
  const maxLat = (latRadTop * 180.0) / Math.PI;
  const minLat = (latRadBottom * 180.0) / Math.PI;
  return [
    parseFloat(minLon.toFixed(6)),
    parseFloat(minLat.toFixed(6)),
    parseFloat(maxLon.toFixed(6)),
    parseFloat(maxLat.toFixed(6))
  ];
};

/**
 * Converts XYZ tile coordinates into Leaflet LatLngBounds [[south, west], [north, east]].
 * 
 * @param {number} z - Zoom level
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 * @returns {[[number, number], [number, number]]} Leaflet LatLngBounds
 */
export const tileToLeafletBounds = (z, x, y) => {
  const [minLon, minLat, maxLon, maxLat] = tileToBbox(z, x, y);
  return [[minLat, minLon], [maxLat, maxLon]];
};

/**
 * Calculates Ground Sample Distance (GSD) in centimeters per pixel from flight parameters.
 * Parity implementation with calculate_metric_gsd() in app/models/schemas.py.
 * 
 * @param {number} altitudeM - Flight altitude AGL in meters
 * @param {number} [focalLengthMm=8.8] - Camera focal length in mm
 * @param {number} [sensorWidthMm=13.2] - Camera sensor physical width in mm
 * @param {number} [imageWidthPx=5472] - Image raster width in pixels
 * @returns {number} Calculated GSD in cm/px
 */
export const calculateMetricGsd = (altitudeM, focalLengthMm = 8.8, sensorWidthMm = 13.2, imageWidthPx = 5472) => {
  if (altitudeM <= 0 || focalLengthMm <= 0 || imageWidthPx <= 0) return 0.0;
  const gsdCm = (altitudeM * 100.0 * sensorWidthMm) / (focalLengthMm * imageWidthPx);
  return parseFloat(gsdCm.toFixed(3));
};

/**
 * Normalizes GeoJSON Polygon geometry, verifying closed linear rings and numeric coordinates.
 * Parity implementation with normalize_geojson_polygon() in app/models/schemas.py.
 * 
 * @param {any} geometry - Input geometry object
 * @returns {{ type: 'Polygon', coordinates: number[][][] }|null} Normalized GeoJSON Polygon or null
 */
export const normalizeGeojsonPolygon = (geometry) => {
  if (!geometry || typeof geometry !== 'object') return null;
  const gtype = geometry.type;
  const coords = geometry.coordinates;
  if (gtype !== 'Polygon' || !Array.isArray(coords) || coords.length === 0) return null;
  const ring = coords[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;

  const cleanRing = [];
  for (const pt of ring) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lon = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!isNaN(lon) && !isNaN(lat) && isFinite(lon) && isFinite(lat)) {
        cleanRing.push([lon, lat]);
      }
    }
  }
  if (cleanRing.length < 3) return null;
  // Ensure ring closure
  const first = cleanRing[0];
  const last = cleanRing[cleanRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    cleanRing.push([...first]);
  }
  return { type: 'Polygon', coordinates: [cleanRing] };
};


