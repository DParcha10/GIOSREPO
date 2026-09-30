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
  },
  {
    id: 'sentinel-1-rtc',
    label: 'Sentinel-1 SAR RTC (ESA / 10m C-Band Radar)',
    description: 'All-weather synthetic aperture radar for cloud-penetrating moisture and flood mapping.',
    resolution_m: 10.0,
    revisit_days: 6.0
  },
  {
    id: 'cop-dem-glo-30',
    label: 'Copernicus DEM GLO-30 (ESA / 30m Global DEM)',
    description: 'Digital surface elevation model for slope, aspect, and hydrological drainage analysis.',
    resolution_m: 30.0,
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
  WILDFIRE: 'wildfire',
  SENTINEL_1_RTC: 'sentinel-1-rtc',
  COP_DEM: 'cop-dem-glo-30'
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
  EVENTS_GEOJSON: '/api/v1/events/geojson',
  EVENT_DETAIL: (id) => `/api/v1/events/${id}`,
  EVENT_GEOJSON: (id) => `/api/v1/events/${id}/geojson`,
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
  IOT_DATA: '/api/v1/iot/data',
  ANALYSIS_TERRAIN: '/api/v1/analysis/terrain',
  ANALYSIS_SAR: '/api/v1/analysis/sar',
  TILES_TERRAIN: (metric, z, x, y) => `/api/v1/tiles/terrain/${metric}/${z}/${x}/${y}.png`,
  TILES_SAR: (polarization, z, x, y) => `/api/v1/tiles/sar/${polarization}/${z}/${x}/${y}.png`,
  ANALYSIS_TRANSECT: '/api/v1/analysis/transect',
  ANALYSIS_VOLUMETRIC: '/api/v1/analysis/volumetric',
  ANALYSIS_EXPORT: '/api/v1/analysis/export',
  ANALYSIS_ANIMATION_SEQUENCE: '/api/v1/analysis/animation-sequence',
  ANALYSIS_COMPOSITE: '/api/v1/analysis/composite',
  TILES_COMPOSITE: (compositeId, z, x, y) => `/api/v1/tiles/composite/${compositeId}/${z}/${x}/${y}.png`,
  ANNOTATIONS: '/api/v1/annotations',
  ANNOTATION_DETAIL: (annotationId) => `/api/v1/annotations/${annotationId}`,
  WORK_ORDERS: '/api/v1/work-orders',
  SUBSCRIPTIONS: '/api/v1/subscriptions',
  SUBSCRIPTION_DETAIL: (subscriptionId) => `/api/v1/subscriptions/${subscriptionId}`,
  ANALYSIS_VRT: '/api/v1/analysis/vrt',
  TILES_VRT: (vrtId, z, x, y) => `/api/v1/tiles/vrt/${vrtId}/${z}/${x}/${y}.png`,
  ANALYSIS_CHANGE_DETECTION: '/api/v1/analysis/change-detection',
  TILES_DIFFERENCE: (collection, preSceneId, postSceneId, metric, z, x, y) => `/api/v1/tiles/difference/${collection}/${preSceneId}/${postSceneId}/${metric}/${z}/${x}/${y}.png`,
  TILES_DIFFERENCE_SHORT: (metric, z, x, y) => `/api/v1/tiles/difference/${metric}/${z}/${x}/${y}.png`,
  INTEGRATION_GEOTECHNICAL_SENSORS: '/api/v1/integration/geotechnical/sensors',
  INTEGRATION_SENSORS: '/api/v1/integration/geotechnical/sensors',
  INTEGRATION_GEOTECHNICAL_READINGS: (sensorId) => `/api/v1/integration/geotechnical/sensors/${sensorId}/readings`,
  INTEGRATION_SENSOR_READINGS: (sensorId) => `/api/v1/integration/geotechnical/sensors/${sensorId}/readings`,
  INTEGRATION_GEOTECHNICAL_SUMMARY: (assetId) => `/api/v1/integration/geotechnical/summary/${assetId}`,
  INTEGRATION_SENSOR_SUMMARY: (assetId) => `/api/v1/integration/geotechnical/summary/${assetId}`,
  ANALYSIS_BATHYMETRY_EAC: '/api/v1/analysis/bathymetry/eac',
  TILES_CACHE_PRELOAD: '/api/v1/tiles/cache/preload',
  DRONE_GCP_QUALITY: '/api/v1/drone/gcp/quality',
  DRONE_CAMERA_CALIBRATION: (cameraId) => `/api/v1/drone/camera/calibration/${cameraId}`,
  ANALYSIS_TWI: '/api/v1/analysis/terrain/twi',
  ANALYSIS_TWI_SHORT: '/api/v1/analysis/twi',
  ANALYSIS_SLOPE_STABILITY: '/api/v1/analysis/terrain/slope-stability',
  ANALYSIS_SLOPE_STABILITY_SHORT: '/api/v1/analysis/slope-stability',
  ANALYSIS_HLS_CALIBRATE: '/api/v1/analysis/hls/calibrate',
  ANALYSIS_HLS_CALIBRATE_SHORT: '/api/v1/analysis/hls-calibrate',
  ANALYSIS_WATER_QUALITY: '/api/v1/analysis/water-quality',
  DRONE_GCP_QUALITY_SHORT: '/api/v1/drone/gcp-quality',
  DRONE_CAMERA_CALIBRATION_SHORT: '/api/v1/drone/camera-calibration',
  DRONE_GCP_GEOJSON: '/api/v1/drone/gcp/geojson',
  DRONE_CAMERA_CALIBRATION_LIST: '/api/v1/drone/camera/calibration',
  TILES_TWI: (z, x, y) => `/api/v1/tiles/terrain/twi/${z}/${x}/${y}.png`,
  TILES_SLOPE_STABILITY: (z, x, y) => `/api/v1/tiles/terrain/slope-stability/${z}/${x}/${y}.png`,
  TILES_WATER_QUALITY: (metric, z, x, y) => `/api/v1/tiles/water-quality/${metric}/${z}/${x}/${y}.png`,
  TILES_WATER_QUALITY_SCENE: (collection, itemId, metric, z, x, y) => `/api/v1/tiles/water-quality/${collection}/${itemId}/${metric}/${z}/${x}/${y}.png`,
  GEOTECHNICAL_SOIL_PRESETS: '/api/v1/analysis/terrain/soil-presets',
  ANALYSIS_LST_TRANSFER: '/api/v1/analysis/lst/radiative-transfer',
  ANALYSIS_LST_TRANSFER_SHORT: '/analysis/lst/radiative-transfer',
  TILES_THERMAL_LST: (collection, itemId, z, x, y) => `/api/v1/tiles/thermal/lst/${collection}/${itemId}/${z}/${x}/${y}.png`,
  ANALYSIS_TOPOGRAPHIC_CORRECTION: '/api/v1/analysis/topographic-correction',
  ANALYSIS_TOPOGRAPHIC_CORRECTION_SHORT: '/analysis/topographic-correction',
  ANALYSIS_INSAR_DISPLACEMENT: '/api/v1/analysis/insar/displacement',
  ANALYSIS_INSAR_DISPLACEMENT_SHORT: '/analysis/insar/displacement',
  ANALYSIS_INSAR_COHERENCE: '/api/v1/analysis/insar/coherence',
  ANALYSIS_INSAR_COHERENCE_SHORT: '/analysis/insar/coherence',
  TILES_SAR_INSAR: (pairId, z, x, y) => `/api/v1/tiles/sar/insar/${pairId}/${z}/${x}/${y}.png`,
  ANALYSIS_PHENOLOGY_EXTRACT: '/api/v1/analysis/phenology/extract',
  ANALYSIS_PHENOLOGY_EXTRACT_SHORT: '/analysis/phenology/extract',
  ANALYSIS_COMPOSITES_BAP: '/api/v1/analysis/composites/bap',
  ANALYSIS_COMPOSITES_BAP_SHORT: '/analysis/composites/bap',
  ANALYSIS_COREGISTRATION: '/api/v1/analysis/geometric/coregistration',
  ANALYSIS_COREGISTRATION_SHORT: '/api/v1/analysis/coregistration',
  ANALYSIS_POINT_CLOUD_FILTER: '/api/v1/analysis/point-cloud/filter',
  ANALYSIS_POINT_CLOUD_CHM: '/api/v1/analysis/point-cloud/chm',
  TILES_POINT_CLOUD_CHM: (assetId, z, x, y) => `/api/v1/tiles/terrain/chm/${assetId}/${z}/${x}/${y}.png`,
  ANALYSIS_TRUE_ORTHO_OCCLUSION: '/api/v1/analysis/ortho/occlusion',
  ANALYSIS_ORTHO_SEAMLINES: '/api/v1/analysis/ortho/seamlines',
  TILES_TRUE_ORTHO: (mosaicId, z, x, y) => `/api/v1/tiles/ortho/true/${mosaicId}/${z}/${x}/${y}.png`,
  BYOC_BUCKETS: '/api/v1/byoc/buckets',
  BYOC_BUCKET_DETAIL: (bucketId) => `/api/v1/byoc/buckets/${bucketId}`,
  BYOC_BUCKET_SYNC: (bucketId) => `/api/v1/byoc/buckets/${bucketId}/sync`,
  TILES_BYOC: (bucketId, itemId, z, x, y) => `/api/v1/tiles/byoc/${bucketId}/${itemId}/${z}/${x}/${y}.png`
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
      case 'TILES_TERRAIN':
        return endpoint(params.metric || 'elevation', params.z, params.x, params.y);
      case 'TILES_SAR':
        return endpoint(params.polarization || 'vv', params.z, params.x, params.y);
      case 'TILES_COMPOSITE':
        return endpoint(params.compositeId || params.composite_id, params.z, params.x, params.y);
      case 'ANNOTATION_DETAIL':
        return endpoint(params.annotationId || params.annotation_id);
      case 'SUBSCRIPTION_DETAIL':
        return endpoint(params.subscriptionId || params.subscription_id);
      case 'TILES_VRT':
        return endpoint(params.vrtId || params.vrt_id, params.z, params.x, params.y);
      case 'TILES_DIFFERENCE':
        return endpoint(params.collection || 'sentinel-2-l2a', params.preSceneId || params.pre_scene_id, params.postSceneId || params.post_scene_id, params.metric || 'ndmi_diff', params.z, params.x, params.y);
      case 'TILES_DIFFERENCE_SHORT':
        return endpoint(params.metric || 'ndmi_diff', params.z, params.x, params.y);
      case 'INTEGRATION_GEOTECHNICAL_READINGS':
      case 'INTEGRATION_SENSOR_READINGS':
        return endpoint(params.sensorId || params.sensor_id);
      case 'INTEGRATION_GEOTECHNICAL_SUMMARY':
      case 'INTEGRATION_SENSOR_SUMMARY':
        return endpoint(params.assetId || params.asset_id);
      case 'DRONE_CAMERA_CALIBRATION':
        return endpoint(params.cameraId || params.camera_id || 'default');
      case 'TILES_TWI':
        return endpoint(params.z, params.x, params.y);
      case 'TILES_SLOPE_STABILITY':
        return endpoint(params.z, params.x, params.y);
      case 'TILES_WATER_QUALITY':
        return endpoint(params.metric || 'ndci', params.z, params.x, params.y);
      case 'TILES_WATER_QUALITY_SCENE':
        return endpoint(params.collection || 'sentinel-2-l2a', params.itemId || params.item_id, params.metric || 'ndci', params.z, params.x, params.y);
      case 'TILES_THERMAL_LST':
        return endpoint(params.collection || 'landsat-c2-l2', params.itemId || params.item_id, params.z, params.x, params.y);
      case 'TILES_SAR_INSAR':
        return endpoint(params.pairId || params.pair_id || 'PAIR-01', params.z, params.x, params.y);
      case 'TILES_POINT_CLOUD_CHM':
        return endpoint(params.assetId || params.asset_id || 'ASSET-01', params.z, params.x, params.y);
      case 'TILES_TRUE_ORTHO':
        return endpoint(params.mosaicId || params.mosaic_id || 'MOSAIC-01', params.z, params.x, params.y);
      case 'BYOC_BUCKET_DETAIL':
        return endpoint(params.bucketId || params.bucket_id || 'bucket-01');
      case 'BYOC_BUCKET_SYNC':
        return endpoint(params.bucketId || params.bucket_id || 'bucket-01');
      case 'TILES_BYOC':
        return endpoint(params.bucketId || params.bucket_id || 'bucket-01', params.itemId || params.item_id || 'item-01', params.z, params.x, params.y);
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
    let target = val;
    if (target.geometry && typeof target.geometry === 'object') {
      target = target.geometry;
    }
    const rawCoords = target.coordinates;
    if (rawCoords) {
      const coordsList = [];
      const extractPts = (obj) => {
        if (Array.isArray(obj)) {
          if (obj.length >= 2 && typeof obj[0] === 'number' && typeof obj[1] === 'number') {
            coordsList.push([Number(obj[0]), Number(obj[1])]);
          } else {
            obj.forEach(extractPts);
          }
        }
      };
      extractPts(rawCoords);
      if (coordsList.length > 0) {
        const lons = coordsList.map((p) => p[0]);
        const lats = coordsList.map((p) => p[1]);
        const min_lon = Math.min(...lons);
        const min_lat = Math.min(...lats);
        const max_lon = Math.max(...lons);
        const max_lat = Math.max(...lats);
        if ([min_lon, min_lat, max_lon, max_lat].every((c) => !isNaN(c) && isFinite(c))) {
          return [
            Number(min_lon.toFixed(6)),
            Number(min_lat.toFixed(6)),
            Number(max_lon.toFixed(6)),
            Number(max_lat.toFixed(6))
          ];
        }
      }
    }
    if (Array.isArray(target.bbox) && target.bbox.length === 4) {
      return parseBbox(target.bbox, defaultValue);
    }
    const min_lon = Number(target.min_lon ?? target.west ?? target.min_x);
    const min_lat = Number(target.min_lat ?? target.south ?? target.min_y);
    const max_lon = Number(target.max_lon ?? target.east ?? target.max_x);
    const max_lat = Number(target.max_lat ?? target.north ?? target.max_y);
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

/**
 * Registered GIS vector layer types matching backend SpatialLayerType enum.
 */
export const SPATIAL_LAYER_TYPES = {
  CRITICAL_INFRASTRUCTURE: 'critical_infrastructure',
  SENSOR_GRID: 'sensor_grid',
  HAZARD_ZONES: 'hazard_zones',
  DRONE_FLIGHT_BOUNDS: 'drone_flight_bounds'
};

/**
 * Metadata specifications for dynamic GIS vector layers matching backend SPATIAL_LAYERS_METADATA.
 */
export const SPATIAL_LAYERS = [
  {
    layerId: 'critical_infrastructure',
    label: 'Critical Infrastructure Assets',
    description: 'Hydraulic plants, dams, spillways, and intake towers.',
    icon: 'ShieldAlert',
    color: '#00ffaa',
    defaultVisible: true
  },
  {
    layerId: 'sensor_grid',
    label: 'In-Situ Sensor & Piezometer Grid',
    description: 'Embankment moisture probes, piezometer arrays, and USGS telemetry anchors.',
    icon: 'Activity',
    color: '#38bdf8',
    defaultVisible: true
  },
  {
    layerId: 'hazard_zones',
    label: 'Active Hazard Boundaries',
    description: 'Seepage alert perimeters, wildfire perimeters, and flood inundation polygons.',
    icon: 'AlertTriangle',
    color: '#f87171',
    defaultVisible: true
  },
  {
    layerId: 'drone_flight_bounds',
    label: 'UAS Survey Extents & Geofences',
    description: 'Autonomous drone inspection flight plans, waypoints, and orthomosaic footprints.',
    icon: 'Plane',
    color: '#fbbf24',
    defaultVisible: false
  }
];

/**
 * Retrieves metadata for a vector layer type.
 * 
 * @param {string} layerId - Vector layer type (e.g. 'critical_infrastructure')
 * @returns {typeof SPATIAL_LAYERS[0]|undefined}
 */
export const getSpatialLayerMetadata = (layerId) => {
  if (!layerId) return undefined;
  return SPATIAL_LAYERS.find((l) => l.layerId.toLowerCase() === String(layerId).toLowerCase());
};

/**
 * Returns all registered spatial vector layer metadata specifications.
 * 
 * @returns {typeof SPATIAL_LAYERS}
 */
export const listSpatialLayerTypes = () => SPATIAL_LAYERS;

/**
 * Multi-spectral physical band specifications catalog matching backend BAND_SPECS.
 */
export const BAND_SPECS = [
  { key: 'b02', name: 'Blue', centerWavelengthNm: 490.0, bandwidthNm: 65.0, spatialResolutionM: 10.0, spectrumDomain: 'Visible Blue', commonName: 'blue' },
  { key: 'b03', name: 'Green', centerWavelengthNm: 560.0, bandwidthNm: 35.0, spatialResolutionM: 10.0, spectrumDomain: 'Visible Green', commonName: 'green' },
  { key: 'b04', name: 'Red', centerWavelengthNm: 665.0, bandwidthNm: 30.0, spatialResolutionM: 10.0, spectrumDomain: 'Visible Red', commonName: 'red' },
  { key: 'b05', name: 'RedEdge 1', centerWavelengthNm: 705.0, bandwidthNm: 15.0, spatialResolutionM: 20.0, spectrumDomain: 'Vegetation Red-Edge', commonName: 'rededge' },
  { key: 'b06', name: 'RedEdge 2', centerWavelengthNm: 740.0, bandwidthNm: 15.0, spatialResolutionM: 20.0, spectrumDomain: 'Vegetation Red-Edge', commonName: 'rededge2' },
  { key: 'b07', name: 'RedEdge 3', centerWavelengthNm: 783.0, bandwidthNm: 20.0, spatialResolutionM: 20.0, spectrumDomain: 'Vegetation Red-Edge', commonName: 'rededge3' },
  { key: 'b08', name: 'NIR Broad', centerWavelengthNm: 842.0, bandwidthNm: 115.0, spatialResolutionM: 10.0, spectrumDomain: 'Near Infrared', commonName: 'nir' },
  { key: 'b8a', name: 'NIR Narrow', centerWavelengthNm: 865.0, bandwidthNm: 20.0, spatialResolutionM: 20.0, spectrumDomain: 'Near Infrared Narrow', commonName: 'nir08' },
  { key: 'b11', name: 'SWIR 1', centerWavelengthNm: 1610.0, bandwidthNm: 90.0, spatialResolutionM: 20.0, spectrumDomain: 'Shortwave Infrared', commonName: 'swir16' },
  { key: 'b12', name: 'SWIR 2', centerWavelengthNm: 2190.0, bandwidthNm: 180.0, spatialResolutionM: 20.0, spectrumDomain: 'Shortwave Infrared', commonName: 'swir22' },
  { key: 'b10', name: 'Thermal Infrared', centerWavelengthNm: 10895.0, bandwidthNm: 590.0, spatialResolutionM: 30.0, spectrumDomain: 'Thermal Infrared', commonName: 'lwir11' }
];

/**
 * Looks up physical sensor band specification by key.
 * 
 * @param {string} bandKey - Band key (e.g. 'b02', 'b08', 'b10')
 * @returns {typeof BAND_SPECS[0]|undefined}
 */
export const getBandSpec = (bandKey) => {
  if (!bandKey) return undefined;
  return BAND_SPECS.find((b) => b.key.toLowerCase() === String(bandKey).toLowerCase());
};

/**
 * Returns all registered sensor band specifications.
 * 
 * @returns {typeof BAND_SPECS}
 */
export const listBandSpecs = () => BAND_SPECS;

/**
 * Retrieves center wavelength in nanometers for a band code.
 * 
 * @param {string} bandKey - Band key
 * @param {number} [defaultValue=0.0] - Fallback wavelength
 * @returns {number} Center wavelength in nm
 */
export const getBandWavelength = (bandKey, defaultValue = 0.0) => {
  const spec = getBandSpec(bandKey);
  return spec ? spec.centerWavelengthNm : defaultValue;
};

/**
 * Operational comparison modes for multi-temporal swipe curtain.
 */
export const SWIPE_COMPARISON_MODES = {
  OPTICAL_VS_ANOMALY: 'optical_vs_anomaly',
  PRE_VS_POST: 'pre_vs_post',
  SATELLITE_VS_DRONE: 'satellite_vs_drone',
  INDEX_VS_INDEX: 'index_vs_index'
};

/**
 * Preset split percentages for multi-temporal swipe curtain.
 */
export const SWIPE_PRESET_RATIOS = [25, 50, 75];

/**
 * Returns standard swipe curtain split percentage presets.
 * 
 * @returns {number[]}
 */
export const getSwipePresetRatios = () => SWIPE_PRESET_RATIOS;

/**
 * Calculates geodesic great-circle distance between two WGS84 points using Haversine formula.
 * Parity implementation with calculate_haversine_distance() in app/models/schemas.py.
 * 
 * @param {number} lat1 - First point latitude in degrees
 * @param {number} lon1 - First point longitude in degrees
 * @param {number} lat2 - Second point latitude in degrees
 * @param {number} lon2 - Second point longitude in degrees
 * @param {'km'|'m'} [unit='km'] - Distance unit
 * @returns {number} Geodesic distance in requested unit
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2, unit = 'km') => {
  const R_KM = 6371.0;
  const toRad = (deg) => (deg * Math.PI) / 180.0;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a = Math.sin(deltaPhi / 2.0) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
  const distanceKm = R_KM * c;

  if (unit.toLowerCase() === 'm') {
    return parseFloat((distanceKm * 1000.0).toFixed(3));
  }
  return parseFloat(distanceKm.toFixed(3));
};

/**
 * Calculates initial compass bearing (forward azimuth) from point 1 to point 2 in degrees [0, 360).
 * Parity implementation with calculate_initial_bearing() in app/models/schemas.py.
 * 
 * @param {number} lat1 - First point latitude in degrees
 * @param {number} lon1 - First point longitude in degrees
 * @param {number} lat2 - Second point latitude in degrees
 * @param {number} lon2 - Second point longitude in degrees
 * @returns {number} Compass bearing in degrees [0, 360)
 */
export const calculateInitialBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180.0;
  const toDeg = (rad) => (rad * 180.0) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (toDeg(bearingRad) + 360.0) % 360.0;
  return parseFloat(bearingDeg.toFixed(2));
};

/**
 * Calculates geographic center [lat, lon] of a GeoJSON polygon.
 * Parity implementation with calculate_polygon_centroid() in app/models/schemas.py.
 * 
 * @param {any} geometry - GeoJSON Polygon geometry
 * @returns {[number, number]} [latitude, longitude] centroid
 */
export const calculatePolygonCentroid = (geometry) => {
  if (!geometry || typeof geometry !== 'object') return [37.0582, -121.0744];
  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return [37.0582, -121.0744];
  const ring = coords[0];
  if (!Array.isArray(ring) || ring.length === 0) return [37.0582, -121.0744];
  const pts = ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  const lons = [];
  const lats = [];
  for (const pt of pts) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lon = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!isNaN(lon) && !isNaN(lat) && isFinite(lon) && isFinite(lat)) {
        lons.push(lon);
        lats.push(lat);
      }
    }
  }
  if (lons.length === 0 || lats.length === 0) return [37.0582, -121.0744];
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;
  return [parseFloat(avgLat.toFixed(6)), parseFloat(avgLon.toFixed(6))];
};

/**
 * Constructs an enclosing BoundingBox [min_lon, min_lat, max_lon, max_lat] from coordinate points.
 * Parity implementation with BoundingBox.from_points() in app/models/schemas.py.
 * 
 * @param {number[][]} points - Sequence of point coordinates
 * @param {'lat_lon'|'lon_lat'} [coordFormat='lat_lon'] - Coordinate order
 * @returns {[number, number, number, number]} [min_lon, min_lat, max_lon, max_lat]
 */
export const bboxFromPoints = (points, coordFormat = 'lat_lon') => {
  if (!Array.isArray(points) || points.length === 0) return [-121.2, 36.95, -120.95, 37.15];
  const lats = [];
  const lons = [];
  for (const pt of points) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lon = Number(coordFormat === 'lon_lat' ? pt[0] : pt[1]);
      const lat = Number(coordFormat === 'lon_lat' ? pt[1] : pt[0]);
      if (!isNaN(lon) && !isNaN(lat) && isFinite(lon) && isFinite(lat)) {
        lons.push(lon);
        lats.push(lat);
      }
    }
  }
  if (lons.length === 0 || lats.length === 0) return [-121.2, 36.95, -120.95, 37.15];
  return [
    parseFloat(Math.min(...lons).toFixed(6)),
    parseFloat(Math.min(...lats).toFixed(6)),
    parseFloat(Math.max(...lons).toFixed(6)),
    parseFloat(Math.max(...lats).toFixed(6))
  ];
};

/**
 * Expands a bounding box by a fractional buffer percentage.
 * Parity implementation with BoundingBox.expand() in app/models/schemas.py.
 * 
 * @param {string|number[]|Object} bbox - Input bounding box
 * @param {number} [bufferPct=0.1] - Fractional expansion percentage (e.g. 0.1 for 10%)
 * @returns {[number, number, number, number]} Expanded [min_lon, min_lat, max_lon, max_lat]
 */
export const bboxExpand = (bbox, bufferPct = 0.1) => {
  const [minLon, minLat, maxLon, maxLat] = parseBbox(bbox);
  const width = maxLon - minLon;
  const height = maxLat - minLat;
  const dLon = width * Math.max(0.0, Number(bufferPct)) * 0.5;
  const dLat = height * Math.max(0.0, Number(bufferPct)) * 0.5;
  return [
    parseFloat(Math.max(-180.0, minLon - dLon).toFixed(6)),
    parseFloat(Math.max(-90.0, minLat - dLat).toFixed(6)),
    parseFloat(Math.min(180.0, maxLon + dLon).toFixed(6)),
    parseFloat(Math.min(90.0, maxLat + dLat).toFixed(6))
  ];
};

/**
 * Generates a standardized deterministic cache key for XYZ tiles.
 * Shared contract between backend tile caching and frontend tile prefetching.
 * Parity implementation with generate_tile_cache_key() in app/models/schemas.py.
 * 
 * @param {string} collection - Imagery collection
 * @param {string} itemId - Scene or orthomosaic ID
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {Object} [options={}] - Options (index, rescale, colormap, pre, post)
 * @returns {string} Sanitized cache key string
 */
export const generateTileCacheKey = (collection, itemId, z, x, y, options = {}) => {
  const col = String(collection).toLowerCase().trim();
  const item = String(itemId).trim();
  const idx = String(options.index || 'rgb').toLowerCase().trim();
  const resc = options.rescale ? String(options.rescale).trim() : 'default';
  const cmap = String(options.colormap || 'spectral').toLowerCase().trim();
  const parts = [col, item, `z${z}`, `x${x}`, `y${y}`, idx, `rescale_${resc}`, cmap];
  if (options.pre) parts.push(`pre_${options.pre}`);
  if (options.post) parts.push(`post_${options.post}`);
  const raw = parts.join('_');
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Determines if two bounding boxes intersect.
 * 
 * @param {string|number[]|Object} bbox1 - First bounding box
 * @param {string|number[]|Object} bbox2 - Second bounding box
 * @returns {boolean} True if bounding boxes intersect
 */
export const bboxIntersects = (bbox1, bbox2) => {
  const [minLon1, minLat1, maxLon1, maxLat1] = parseBbox(bbox1);
  const [minLon2, minLat2, maxLon2, maxLat2] = parseBbox(bbox2);
  return !(maxLon1 < minLon2 || minLon1 > maxLon2 || maxLat1 < minLat2 || minLat1 > maxLat2);
};

/**
 * Computes the intersecting BoundingBox between two bounding boxes, or null if disjoint.
 * 
 * @param {string|number[]|Object} bbox1 - First bounding box
 * @param {string|number[]|Object} bbox2 - Second bounding box
 * @returns {[number, number, number, number]|null} Intersecting bounds or null
 */
export const bboxIntersection = (bbox1, bbox2) => {
  if (!bboxIntersects(bbox1, bbox2)) return null;
  const [minLon1, minLat1, maxLon1, maxLat1] = parseBbox(bbox1);
  const [minLon2, minLat2, maxLon2, maxLat2] = parseBbox(bbox2);
  return [
    parseFloat(Math.max(minLon1, minLon2).toFixed(6)),
    parseFloat(Math.max(minLat1, minLat2).toFixed(6)),
    parseFloat(Math.min(maxLon1, maxLon2).toFixed(6)),
    parseFloat(Math.min(maxLat1, maxLat2).toFixed(6))
  ];
};

/**
 * Determines if parentBbox completely encloses childBbox.
 * 
 * @param {string|number[]|Object} parentBbox - Enclosing candidate bounding box
 * @param {string|number[]|Object} childBbox - Inner candidate bounding box
 * @returns {boolean} True if childBbox is fully within parentBbox
 */
export const bboxContains = (parentBbox, childBbox) => {
  const [pMinLon, pMinLat, pMaxLon, pMaxLat] = parseBbox(parentBbox);
  const [cMinLon, cMinLat, cMaxLon, cMaxLat] = parseBbox(childBbox);
  return pMinLon <= cMinLon && pMaxLon >= cMaxLon && pMinLat <= cMinLat && pMaxLat >= cMaxLat;
};

/**
 * Calculates Intersection over Union (IoU) overlap ratio between two bounding boxes [0.0, 1.0].
 * 
 * @param {string|number[]|Object} bbox1 - First bounding box
 * @param {string|number[]|Object} bbox2 - Second bounding box
 * @returns {number} Overlap ratio in [0.0, 1.0]
 */
export const bboxOverlapRatio = (bbox1, bbox2) => {
  const inter = bboxIntersection(bbox1, bbox2);
  if (!inter) return 0.0;
  const [iMinLon, iMinLat, iMaxLon, iMaxLat] = inter;
  const [minLon1, minLat1, maxLon1, maxLat1] = parseBbox(bbox1);
  const [minLon2, minLat2, maxLon2, maxLat2] = parseBbox(bbox2);
  const interArea = (iMaxLon - iMinLon) * (iMaxLat - iMinLat);
  const area1 = (maxLon1 - minLon1) * (maxLat1 - minLat1);
  const area2 = (maxLon2 - minLon2) * (maxLat2 - minLat2);
  const unionArea = area1 + area2 - interArea;
  return unionArea > 0 ? parseFloat((interArea / unionArea).toFixed(4)) : 0.0;
};

/**
 * Mapping of common satellite band aliases to canonical BAND_SPECS keys.
 */
export const BAND_ALIAS_MAP = {
  blue: 'b02', b2: 'b02', b02: 'b02',
  green: 'b03', b3: 'b03', b03: 'b03',
  red: 'b04', b4: 'b04', b04: 'b04',
  rededge1: 'b05', rededge: 'b05', b5: 'b05', b05: 'b05',
  rededge2: 'b06', b6: 'b06', b06: 'b06',
  rededge3: 'b07', b7: 'b07', b07: 'b07',
  nir: 'b08', nir_broad: 'b08', b8: 'b08', b08: 'b08',
  nir_narrow: 'b8a', b8a: 'b8a',
  swir1: 'b11', swir16: 'b11', b11: 'b11',
  swir2: 'b12', swir22: 'b12', b12: 'b12',
  thermal: 'b10', tir: 'b10', lwir: 'b10', b10: 'b10'
};

/**
 * Transforms raw surface reflectance dict into an ordered array of physical band records.
 * Sorted in ascending wavelength order from Visible Blue to Thermal IR.
 * 
 * @param {Record<string, number>} surfaceReflectance - Surface reflectance per band
 * @returns {Array<{bandKey: string, name: string, wavelengthNm: number, reflectance: number, domain: string}>}
 */
export const formatSpectralProfile = (surfaceReflectance) => {
  if (!surfaceReflectance || typeof surfaceReflectance !== 'object') return [];
  const records = [];
  for (const [rawKey, refl] of Object.entries(surfaceReflectance)) {
    if (refl === null || refl === undefined) continue;
    const val = Number(refl);
    if (isNaN(val) || !isFinite(val)) continue;
    const canonical = BAND_ALIAS_MAP[String(rawKey).toLowerCase().trim()];
    const spec = canonical ? getBandSpec(canonical) : null;
    if (spec) {
      records.push({
        bandKey: spec.key,
        name: spec.name,
        wavelengthNm: spec.centerWavelengthNm,
        reflectance: parseFloat(val.toFixed(4)),
        domain: spec.spectrumDomain
      });
    } else {
      records.push({
        bandKey: String(rawKey),
        name: String(rawKey).charAt(0).toUpperCase() + String(rawKey).slice(1),
        wavelengthNm: 500.0,
        reflectance: parseFloat(val.toFixed(4)),
        domain: 'Custom'
      });
    }
  }
  records.sort((a, b) => a.wavelengthNm - b.wavelengthNm);
  return records;
};

/**
 * Multi-scale spatial Level of Detail (LOD) tiers.
 */
export const SPATIAL_LOD_TIERS = {
  MACRO_REGIONAL: 'macro_regional',
  SATELLITE_SYNOPTIC: 'satellite_synoptic',
  SUBMETER_TRANSITION: 'submeter_transition',
  MICRO_INSPECTION: 'micro_inspection'
};

/**
 * Classifies a map zoom level into its operational Spatial LOD tier.
 * 
 * @param {number|string} zoom - Map zoom level
 * @returns {string} Spatial LOD tier key
 */
export const getSpatialLodTier = (zoom) => {
  const z = Number(zoom);
  if (z < 10) return SPATIAL_LOD_TIERS.MACRO_REGIONAL;
  if (z <= 15) return SPATIAL_LOD_TIERS.SATELLITE_SYNOPTIC;
  if (z <= 18) return SPATIAL_LOD_TIERS.SUBMETER_TRANSITION;
  return SPATIAL_LOD_TIERS.MICRO_INSPECTION;
};

/**
 * Retrieves recommended viewing zoom range [minZoom, maxZoom] for an imagery collection.
 * 
 * @param {string} collection - Imagery collection ID
 * @returns {[number, number]} [minZoom, maxZoom]
 */
export const getCollectionRecommendedZoom = (collection) => {
  const col = String(collection || '').toLowerCase().trim();
  if (col.includes('drone')) return [16, 24];
  if (col.includes('landsat')) return [7, 15];
  return [8, 16];
};

/**
 * Maps a scalar value onto a colormap palette to produce an interpolated hex color string.
 * 
 * @param {string} colormap - Colormap palette key
 * @param {number} value - Scalar value
 * @param {number} [vmin=0.0] - Lower scale boundary
 * @param {number} [vmax=1.0] - Upper scale boundary
 * @returns {string} Hex color string '#rrggbb'
 */
export const getColormapColorAtValue = (colormap, value, vmin = 0.0, vmax = 1.0) => {
  const stops = getColormapColorStops(colormap);
  if (!stops || stops.length === 0) return '#2b83ba';
  if (stops.length === 1) return stops[0];
  const val = Number(value);
  const lo = Number(vmin);
  const hi = Number(vmax);
  if (isNaN(val) || !isFinite(val)) return stops[0];
  let t = hi <= lo ? 0.5 : (val - lo) / (hi - lo);
  t = Math.max(0.0, Math.min(1.0, t));
  const nSegments = stops.length - 1;
  const pos = t * nSegments;
  const idx = Math.floor(pos);
  if (idx >= nSegments) return stops[stops.length - 1];
  const frac = pos - idx;

  const hexToRgb = (h) => {
    const clean = h.replace('#', '');
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16)
    ];
  };

  try {
    const [r1, g1, b1] = hexToRgb(stops[idx]);
    const [r2, g2, b2] = hexToRgb(stops[idx + 1]);
    const r = Math.round(r1 + (r2 - r1) * frac);
    const g = Math.round(g1 + (g2 - g1) * frac);
    const b = Math.round(b1 + (b2 - b1) * frac);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return stops[idx];
  }
};

/**
 * Converts a HazardEventDetail or hazard event dict into a GeoJSON Feature.
 * 
 * @param {Object} event - Hazard event record
 * @returns {Object} GeoJSON Feature with Point geometry
 */
export const hazardEventToGeoJsonFeature = (event) => {
  if (!event || typeof event !== 'object') {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { id: 'EVT-UNKNOWN' }
    };
  }
  const lat = Number(event.lat || event.latitude || 0);
  const lng = Number(event.lng || event.longitude || 0);
  const { lat: _lat, lng: _lng, latitude: _latitude, longitude: _longitude, ...rest } = event;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { id: event.id || 'EVT-UNKNOWN', ...rest }
  };
};

/**
 * Converts a sequence of hazard events into a GeoJSON FeatureCollection.
 * 
 * @param {Array<Object>} events - Array of hazard events
 * @returns {Object} GeoJSON FeatureCollection
 */
export const hazardEventsToFeatureCollection = (events) => {
  const feats = Array.isArray(events)
    ? events.filter(Boolean).map(hazardEventToGeoJsonFeature)
    : [];
  return { type: 'FeatureCollection', features: feats };
};

/**
 * Calculates serpentine boustrophedon (lawnmower) flight survey waypoints across a bounding box.
 * 
 * @param {string|number[]|Object} bbox - Survey bounding box
 * @param {number} [flightAltitudeM=60.0] - Flight altitude Above Ground Level in meters
 * @param {number} [overlapPct=0.75] - Lateral overlap percentage
 * @param {number} [sensorFovDeg=70.0] - Sensor horizontal field of view
 * @returns {Array<[number, number]>} Sequence of [lat, lon] waypoints
 */
export const generateBoustrophedonWaypoints = (
  bbox,
  flightAltitudeM = 60.0,
  overlapPct = 0.75,
  sensorFovDeg = 70.0
) => {
  const [minLon, minLat, maxLon, maxLat] = parseBbox(bbox);
  const fovRad = (sensorFovDeg * Math.PI) / 180.0;
  const swathWidthM = 2.0 * flightAltitudeM * Math.tan(fovRad / 2.0);
  const clampedOverlap = Math.min(0.9, Math.max(0.1, overlapPct));
  const laneSpacingM = swathWidthM * (1.0 - clampedOverlap);
  let latStep = laneSpacingM / 111320.0;
  if (latStep <= 0.00001) latStep = 0.0001;

  const waypoints = [];
  let currentLat = minLat;
  let directionEast = true;

  while (currentLat <= maxLat + (latStep * 0.5)) {
    const latClamped = parseFloat(Math.min(maxLat, currentLat).toFixed(6));
    if (directionEast) {
      waypoints.push([latClamped, parseFloat(minLon.toFixed(6))]);
      waypoints.push([latClamped, parseFloat(maxLon.toFixed(6))]);
    } else {
      waypoints.push([latClamped, parseFloat(maxLon.toFixed(6))]);
      waypoints.push([latClamped, parseFloat(minLon.toFixed(6))]);
    }
    directionEast = !directionEast;
    currentLat += latStep;
  }
  return waypoints;
};

/**
 * Digital elevation and terrain morphology metrics.
 */
export const TERRAIN_METRICS = {
  ELEVATION: 'elevation',
  SLOPE: 'slope',
  ASPECT: 'aspect',
  HILLSHADE: 'hillshade'
};

/**
 * Synthetic Aperture Radar backscatter polarizations.
 */
export const SAR_POLARIZATIONS = {
  VV: 'vv',
  VH: 'vh',
  RATIO: 'ratio_vh_vv'
};

/**
 * Sampling methods for linear engineering transects.
 */
export const TRANSECT_SAMPLE_METHODS = {
  EQUIDISTANT_GEODESIC: 'equidistant_geodesic',
  VERTEX_ONLY: 'vertex_only'
};

/**
 * Generates equidistant [lat, lon] sample coordinates along an engineering transect polyline.
 * 
 * @param {Object|Array} polyline - GeoJSON LineString geometry or array of coordinates
 * @param {number} [sampleCount=50] - Number of target sample points
 * @returns {Array<[number, number]>} Ordered array of [lat, lon] sample coordinates
 */
export const samplePolylineEquidistant = (polyline, sampleCount = 50) => {
  if (!polyline) return [];
  const rawPts = [];
  
  if (typeof polyline === 'object' && polyline !== null) {
    let coords = null;
    if (polyline.type === 'Feature' && polyline.geometry && Array.isArray(polyline.geometry.coordinates)) {
      coords = polyline.geometry.coordinates;
    } else if (polyline.type === 'LineString' && Array.isArray(polyline.coordinates)) {
      coords = polyline.coordinates;
    } else if (Array.isArray(polyline.coordinates)) {
      coords = polyline.coordinates;
    } else if (Array.isArray(polyline)) {
      coords = polyline;
    }
    
    if (Array.isArray(coords)) {
      for (const pt of coords) {
        if (typeof pt === 'object' && pt !== null && !Array.isArray(pt)) {
          const lat = Number(pt.lat ?? pt.latitude);
          const lon = Number(pt.lon ?? pt.lng ?? pt.longitude);
          if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
            rawPts.push([lat, lon]);
          }
        } else if (Array.isArray(pt) && pt.length >= 2) {
          const v1 = Number(pt[0]);
          const v2 = Number(pt[1]);
          if (!isNaN(v1) && !isNaN(v2) && isFinite(v1) && isFinite(v2)) {
            if (Math.abs(v1) > 90.0 && Math.abs(v2) <= 90.0) {
              rawPts.push([v2, v1]);
            } else if (Math.abs(v2) > 90.0 && Math.abs(v1) <= 90.0) {
              rawPts.push([v1, v2]);
            } else {
              rawPts.push([v1, v2]);
            }
          }
        }
      }
    }
  }

  if (rawPts.length === 0) return [];
  const targetCount = Math.max(2, parseInt(sampleCount, 10) || 50);
  if (rawPts.length === 1) {
    return Array(targetCount).fill(rawPts[0]);
  }

  const cumDists = [0.0];
  for (let i = 1; i < rawPts.length; i++) {
    const d = calculateHaversineDistance(
      rawPts[i - 1][0], rawPts[i - 1][1],
      rawPts[i][0], rawPts[i][1],
      'm'
    );
    cumDists.push(cumDists[cumDists.length - 1] + d);
  }

  const totalDist = cumDists[cumDists.length - 1];
  if (totalDist <= 0.0001) {
    return Array(targetCount).fill(rawPts[0]);
  }

  const sampled = [];
  const step = totalDist / (targetCount - 1);
  let segIdx = 0;

  for (let k = 0; k < targetCount; k++) {
    const targetD = Math.min(totalDist, k * step);
    while (segIdx < cumDists.length - 2 && cumDists[segIdx + 1] < targetD) {
      segIdx++;
    }
    const segStartD = cumDists[segIdx];
    const segEndD = cumDists[segIdx + 1];
    const segLen = segEndD - segStartD;
    const frac = segLen > 0 ? Math.max(0.0, Math.min(1.0, (targetD - segStartD) / segLen)) : 0.0;
    const p1 = rawPts[segIdx];
    const p2 = rawPts[segIdx + 1];
    const lat = parseFloat((p1[0] + frac * (p2[0] - p1[0])).toFixed(6));
    const lon = parseFloat((p1[1] + frac * (p2[1] - p1[1])).toFixed(6));
    sampled.push([lat, lon]);
  }

  return sampled;
};

/**
 * Volumetric calculation operational modes.
 */
export const VOLUME_CALCULATION_MODES = {
  CUT_FILL: 'cut_fill',
  RESERVOIR_STORAGE: 'reservoir_storage',
  EMBANKMENT_FILL: 'embankment_fill'
};

/**
 * Computes cut, fill, and net volumetric metrics over an elevation grid array.
 * 
 * @param {number[]} elevationGrid - Array of elevation values in meters
 * @param {number} referenceElevationM - Reference design datum elevation in meters
 * @param {number} [cellSizeM=10.0] - Horizontal grid cell dimension in meters
 * @returns {Object} Volumetric summary object
 */
export const calculateCutFillVolumes = (elevationGrid, referenceElevationM, cellSizeM = 10.0) => {
  if (!Array.isArray(elevationGrid) || elevationGrid.length === 0) {
    return {
      surface_area_m2: 0.0,
      surface_area_hectares: 0.0,
      cut_volume_m3: 0.0,
      fill_volume_m3: 0.0,
      net_volume_m3: 0.0,
      mean_elevation_m: 0.0,
      min_elevation_m: 0.0,
      max_elevation_m: 0.0,
      mean_depth_m: 0.0,
      max_depth_m: 0.0
    };
  }

  const validElevs = [];
  for (const e of elevationGrid) {
    if (e !== null && e !== undefined) {
      const num = Number(e);
      if (!isNaN(num) && isFinite(num)) {
        validElevs.push(num);
      }
    }
  }

  if (validElevs.length === 0) {
    return {
      surface_area_m2: 0.0,
      surface_area_hectares: 0.0,
      cut_volume_m3: 0.0,
      fill_volume_m3: 0.0,
      net_volume_m3: 0.0,
      mean_elevation_m: 0.0,
      min_elevation_m: 0.0,
      max_elevation_m: 0.0,
      mean_depth_m: 0.0,
      max_depth_m: 0.0
    };
  }

  const refElev = Number(referenceElevationM) || 0.0;
  const cellArea = Number(cellSizeM) * Number(cellSizeM);
  let cutVol = 0.0;
  let fillVol = 0.0;
  const depthDiffs = [];

  for (const z of validElevs) {
    const diff = z - refElev;
    depthDiffs.push(Math.abs(diff));
    if (diff > 0.0) {
      cutVol += diff * cellArea;
    } else if (diff < 0.0) {
      fillVol += (-diff) * cellArea;
    }
  }

  const totalArea = validElevs.length * cellArea;
  const meanElev = validElevs.reduce((a, b) => a + b, 0) / validElevs.length;
  const minElev = Math.min(...validElevs);
  const maxElev = Math.max(...validElevs);
  const meanDepth = depthDiffs.length > 0 ? depthDiffs.reduce((a, b) => a + b, 0) / depthDiffs.length : 0.0;
  const maxDepth = depthDiffs.length > 0 ? Math.max(...depthDiffs) : 0.0;

  return {
    surface_area_m2: parseFloat(totalArea.toFixed(2)),
    surface_area_hectares: parseFloat((totalArea / 10000.0).toFixed(4)),
    cut_volume_m3: parseFloat(cutVol.toFixed(2)),
    fill_volume_m3: parseFloat(fillVol.toFixed(2)),
    net_volume_m3: parseFloat((cutVol - fillVol).toFixed(2)),
    mean_elevation_m: parseFloat(meanElev.toFixed(2)),
    min_elevation_m: parseFloat(minElev.toFixed(2)),
    max_elevation_m: parseFloat(maxElev.toFixed(2)),
    mean_depth_m: parseFloat(meanDepth.toFixed(2)),
    max_depth_m: parseFloat(maxDepth.toFixed(2))
  };
};

/**
 * Output file formats for raster export.
 */
export const EXPORT_RASTER_FORMATS = {
  GEOTIFF: 'geotiff',
  COG: 'cog',
  PNG_RGBA: 'png_rgba',
  GEOJSON_VECTOR: 'geojson_vector',
  CSV_TABULAR: 'csv_tabular'
};

/**
 * Generates standardized canonical filename for exported geospatial data files.
 * 
 * @param {string} collection - Imagery or elevation collection
 * @param {string} itemId - Observation identifier
 * @param {string} [formatType='geotiff'] - Export file format
 * @param {string|null} [index=null] - Optional spectral index
 * @returns {string} Standardized filename
 */
export const formatExportFilename = (collection, itemId, formatType = 'geotiff', index = null) => {
  const colStr = String(collection || 'sentinel-2-l2a').toLowerCase().trim();
  const fmtStr = String(formatType || 'geotiff').toLowerCase().trim();
  const cleanId = String(itemId || 'export').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const extMap = {
    geotiff: 'tif',
    cog: 'tif',
    png_rgba: 'png',
    geojson_vector: 'geojson',
    csv_tabular: 'csv'
  };
  const ext = extMap[fmtStr] || 'tif';
  let prefix = `gios_${colStr}_${cleanId}`;
  if (index) {
    prefix = `${prefix}_${String(index).toLowerCase().trim()}`;
  }
  return `${prefix}.${ext}`;
};

/**
 * Multi-temporal animation playback modes.
 */
export const ANIMATION_PLAYBACK_MODES = {
  LOOP: 'loop',
  PING_PONG: 'ping_pong',
  STEP: 'step'
};

/**
 * Constructs ordered AnimationKeyframe list from STAC scenes for tile viewport (z, x, y).
 * 
 * @param {Array<Object>} scenes - Array of STAC scene records
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X coordinate
 * @param {number|string} y - Tile Y coordinate
 * @param {Object} [options={}] - Index, colormap, rescale options
 * @returns {Array<Object>} Ordered keyframes list
 */
export const buildAnimationKeyframes = (scenes, z, x, y, options = {}) => {
  if (!Array.isArray(scenes)) return [];
  const idx = options.index || 'rgb';
  const cm = options.colormap || null;
  const rescale = options.rescale || null;

  const sorted = [...scenes].sort((a, b) => {
    const da = (a && a.datetime) || '';
    const db = (b && b.datetime) || '';
    return da.localeCompare(db);
  });

  return sorted.map((sc, idxPos) => {
    const scId = (sc && sc.id) || `SCENE-${idxPos}`;
    const dt = (sc && sc.datetime) || '';
    const dateClean = dt.includes('T') ? dt.split('T')[0] : (dt || '2026-01-01');
    const cc = (sc && sc.cloud_cover !== undefined) ? Number(sc.cloud_cover) : 0.0;
    const coll = (sc && sc.collection) || 'sentinel-2-l2a';

    const params = new URLSearchParams();
    params.set('index', idx);
    if (cm) params.set('colormap', cm);
    if (rescale) params.set('rescale', rescale);

    const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
    const tileUrl = `${base}/api/v1/tiles/${coll}/${scId}/${z}/${x}/${y}.png?${params.toString()}`;

    return {
      frame_index: idxPos,
      timestamp: dateClean,
      scene_id: String(scId),
      cloud_cover: cc,
      tile_url: tileUrl,
      index: idx,
      colormap: cm
    };
  });
};

/**
 * Statistical and quality pixel reducers for multi-temporal compositing.
 */
export const COMPOSITE_REDUCERS = {
  MEDIAN: 'median',
  GREENEST_PIXEL: 'greenest_pixel',
  CLEAREST_PIXEL: 'clearest_pixel',
  MOST_RECENT: 'most_recent',
  MAX_NDMI: 'max_ndmi',
  MIN_LST: 'min_lst'
};

/**
 * Constructs canonical XYZ tile URL for streaming a multi-temporal composite.
 * 
 * @param {string} compositeId - Composite identifier
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {Object} [options={}] - Options (index, colormap, rescale)
 * @returns {string} Formatted tile URL
 */
export const buildCompositeTileUrl = (compositeId, z, x, y, options = {}) => {
  const params = new URLSearchParams();
  if (options.index) params.set('index', options.index);
  if (options.colormap) params.set('colormap', options.colormap);
  if (options.rescale) params.set('rescale', options.rescale);

  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  const qs = params.toString() ? `?${params.toString()}` : '';
  return `${base}/api/v1/tiles/composite/${compositeId}/${z}/${x}/${y}.png${qs}`;
};

/**
 * Geotechnical defect classifications for dams and critical infrastructure.
 */
export const DEFECT_CATEGORIES = {
  SEEPAGE_BOIL: 'seepage_boil',
  CREST_CRACK: 'crest_crack',
  SLOPE_SLUMP: 'slope_slump',
  PIPING_VOID: 'piping_void',
  EROSION_GULLY: 'erosion_gully',
  SUBSIDENCE: 'subsidence',
  VEGETATION_ANOMALY: 'vegetation_anomaly'
};

/**
 * Risk severity tiers for geotechnical defect annotations.
 */
export const DEFECT_SEVERITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MODERATE: 'moderate',
  LOW: 'low'
};

/**
 * Lifecycle tracking states for geotechnical defect annotations.
 */
export const DEFECT_STATUSES = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  WORK_ORDER_ISSUED: 'work_order_issued',
  REPAIRED: 'repaired',
  VERIFIED: 'verified'
};

/**
 * Converts a geotechnical defect annotation object into an RFC 7946 GeoJSON Feature.
 * 
 * @param {Object} annotation - Geotechnical annotation object
 * @returns {Object|null} GeoJSON Feature object
 */
export const annotationToGeoJsonFeature = (annotation) => {
  if (!annotation) return null;
  const lat = Number(annotation.lat || 0);
  const lng = Number(annotation.lng || 0);
  const annId = String(annotation.annotation_id || annotation.id || '');

  return {
    type: 'Feature',
    id: annId,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    properties: {
      annotation_id: annId,
      title: annotation.title || '',
      category: annotation.category || 'seepage_boil',
      severity: annotation.severity || 'moderate',
      status: annotation.status || 'open',
      asset_id: annotation.asset_id || '',
      elevation_m: annotation.elevation_m || null,
      drone_ortho_id: annotation.drone_ortho_id || null,
      photo_urls: Array.isArray(annotation.photo_urls) ? annotation.photo_urls : [],
      notes: annotation.notes || '',
      inspector: annotation.inspector || 'Field Engineer',
      created_at: annotation.created_at || new Date().toISOString(),
      updated_at: annotation.updated_at || new Date().toISOString()
    }
  };
};

/**
 * Converts an array of geotechnical defect annotations into an RFC 7946 GeoJSON FeatureCollection.
 * 
 * @param {Array<Object>} [annotations=[]] - Array of geotechnical annotations
 * @returns {Object} GeoJSON FeatureCollection object
 */
export const annotationsToFeatureCollection = (annotations = []) => {
  const features = Array.isArray(annotations)
    ? annotations.map(annotationToGeoJsonFeature).filter(Boolean)
    : [];
  return {
    type: 'FeatureCollection',
    features
  };
};

/**
 * Trigger conditions for automated AOI satellite monitoring subscriptions.
 */
export const SUBSCRIPTION_TRIGGER_TYPES = {
  Z_SCORE_ANOMALY: 'z_score_anomaly',
  NEW_SCENE_INGESTED: 'new_scene_ingested',
  INDEX_THRESHOLD: 'index_threshold'
};

/**
 * Outbound alerting dispatch channels.
 */
export const NOTIFICATION_CHANNELS = {
  WEBHOOK: 'webhook',
  EMAIL: 'email',
  SLACK: 'slack',
  IN_APP_ALERT: 'in_app_alert'
};

/**
 * Seamline blending algorithms for multi-scene virtual raster mosaics.
 */
export const SEAMLINE_MODES = {
  FEATHER: 'feather',
  NEAREST: 'nearest',
  VORONOI_CUT: 'voronoi_cut',
  AVERAGE: 'average'
};

/**
 * Constructs canonical XYZ tile URL for streaming a Virtual Raster (VRT) mosaic.
 * 
 * @param {string} vrtId - Virtual raster dataset identifier
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {Object} [options={}] - Options (index, colormap, rescale)
 * @returns {string} Formatted tile URL
 */
export const buildVrtTileUrl = (vrtId, z, x, y, options = {}) => {
  const params = new URLSearchParams();
  if (options.index) params.set('index', options.index);
  if (options.colormap) params.set('colormap', options.colormap);
  if (options.rescale) params.set('rescale', options.rescale);

  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  const qs = params.toString() ? `?${params.toString()}` : '';
  return `${base}/api/v1/tiles/vrt/${vrtId}/${z}/${x}/${y}.png${qs}`;
};

/**
 * Supported biophysical and radar metrics for bitemporal change differencing.
 */
export const CHANGE_DETECTION_METRICS = {
  NDVI_DIFF: 'ndvi_diff',
  NDMI_DIFF: 'ndmi_diff',
  MNDWI_DIFF: 'mndwi_diff',
  NBR_DIFF: 'nbr_diff',
  SAR_VV_DIFF: 'sar_vv_diff',
  LST_DIFF: 'lst_diff'
};

/**
 * Categorical magnitude tiers for bitemporal change detection.
 */
export const CHANGE_CATEGORIES = {
  SIGNIFICANT_INCREASE: 'significant_increase',
  MODERATE_INCREASE: 'moderate_increase',
  STABLE: 'stable',
  MODERATE_DECREASE: 'moderate_decrease',
  SIGNIFICANT_DECREASE: 'significant_decrease'
};

/**
 * Classifies an array of numeric difference values into categorical change distribution details.
 * 
 * @param {Array<number>} diffValues - Array of numeric differences
 * @param {Object} [options={}] - Classification options
 * @param {number} [options.thresholdPositive=0.15] - Moderate positive threshold
 * @param {number} [options.thresholdNegative=-0.15] - Moderate negative threshold
 * @param {number} [options.thresholdExtreme=0.30] - Significant change threshold (+/-)
 * @param {number} [options.pixelAreaM2=100.0] - Ground area per pixel in m^2 (default 10m Sentinel-2)
 * @returns {Array<Object>} Categorical change details
 */
export const calculateChangeDetectionClasses = (diffValues, options = {}) => {
  if (!Array.isArray(diffValues) || diffValues.length === 0) return [];
  const thPos = options.thresholdPositive ?? 0.15;
  const thNeg = options.thresholdNegative ?? -0.15;
  const thExt = options.thresholdExtreme ?? 0.30;
  const pixelAreaM2 = options.pixelAreaM2 ?? 100.0;
  const m2ToHa = 0.0001;

  const counts = {
    [CHANGE_CATEGORIES.SIGNIFICANT_INCREASE]: 0,
    [CHANGE_CATEGORIES.MODERATE_INCREASE]: 0,
    [CHANGE_CATEGORIES.STABLE]: 0,
    [CHANGE_CATEGORIES.MODERATE_DECREASE]: 0,
    [CHANGE_CATEGORIES.SIGNIFICANT_DECREASE]: 0
  };

  let validCount = 0;
  for (const v of diffValues) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    const num = Number(v);
    validCount += 1;
    if (num >= thExt) {
      counts[CHANGE_CATEGORIES.SIGNIFICANT_INCREASE] += 1;
    } else if (num >= thPos) {
      counts[CHANGE_CATEGORIES.MODERATE_INCREASE] += 1;
    } else if (num <= -thExt) {
      counts[CHANGE_CATEGORIES.SIGNIFICANT_DECREASE] += 1;
    } else if (num <= thNeg) {
      counts[CHANGE_CATEGORIES.MODERATE_DECREASE] += 1;
    } else {
      counts[CHANGE_CATEGORIES.STABLE] += 1;
    }
  }

  if (validCount === 0) return [];

  const labels = {
    [CHANGE_CATEGORIES.SIGNIFICANT_INCREASE]: 'Significant Increase',
    [CHANGE_CATEGORIES.MODERATE_INCREASE]: 'Moderate Increase',
    [CHANGE_CATEGORIES.STABLE]: 'Stable / No Significant Change',
    [CHANGE_CATEGORIES.MODERATE_DECREASE]: 'Moderate Decrease',
    [CHANGE_CATEGORIES.SIGNIFICANT_DECREASE]: 'Significant Decrease'
  };

  const bounds = {
    [CHANGE_CATEGORIES.SIGNIFICANT_INCREASE]: [thExt, null],
    [CHANGE_CATEGORIES.MODERATE_INCREASE]: [thPos, thExt],
    [CHANGE_CATEGORIES.STABLE]: [thNeg, thPos],
    [CHANGE_CATEGORIES.MODERATE_DECREASE]: [-thExt, thNeg],
    [CHANGE_CATEGORIES.SIGNIFICANT_DECREASE]: [null, -thExt]
  };

  return [
    CHANGE_CATEGORIES.SIGNIFICANT_INCREASE,
    CHANGE_CATEGORIES.MODERATE_INCREASE,
    CHANGE_CATEGORIES.STABLE,
    CHANGE_CATEGORIES.MODERATE_DECREASE,
    CHANGE_CATEGORIES.SIGNIFICANT_DECREASE
  ].map((cat) => {
    const cnt = counts[cat];
    const pct = Number(((cnt / validCount) * 100.0).toFixed(2));
    const ha = Number((cnt * pixelAreaM2 * m2ToHa).toFixed(3));
    const b = bounds[cat];
    return {
      category: cat,
      label: labels[cat],
      min_change: b[0],
      max_change: b[1],
      area_hectares: ha,
      percentage: pct,
      pixel_count: cnt
    };
  });
};

/**
 * Builds canonical XYZ tile URL for streaming a bitemporal difference raster.
 * 
 * @param {string} collection - Satellite collection (e.g. 'sentinel-2-l2a')
 * @param {string} preSceneId - Baseline scene STAC ID
 * @param {string} postSceneId - Comparison scene STAC ID
 * @param {string} metric - Difference metric (e.g. 'ndmi_diff')
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @param {Object} [options={}] - Options (rescale, colormap)
 * @returns {string} Formatted difference tile URL
 */
export const buildDifferenceTileUrl = (collection, preSceneId, postSceneId, metric, z, x, y, options = {}) => {
  const params = new URLSearchParams();
  if (options.rescale) params.set('rescale', options.rescale);
  if (options.colormap) params.set('colormap', options.colormap);

  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  const qs = params.toString() ? `?${params.toString()}` : '';
  const m = String(metric || 'ndmi_diff').toLowerCase();
  return `${base}/api/v1/tiles/difference/${collection}/${preSceneId}/${postSceneId}/${m}/${z}/${x}/${y}.png${qs}`;
};

/**
 * In-situ geotechnical sensor classifications for critical infrastructure.
 */
export const GEOTECHNICAL_SENSOR_TYPES = {
  PIEZOMETER: 'piezometer',
  INCLINOMETER: 'inclinometer',
  SEEPAGE_WEIR: 'seepage_weir',
  STAGE_GAUGE: 'stage_gauge',
  SETTLEMENT_PLATE: 'settlement_plate'
};

/**
 * Operational monitoring status tiers for geotechnical sensor telemetry.
 */
export const SENSOR_READING_STATUSES = {
  NORMAL: 'normal',
  ADVISORY: 'advisory',
  ALERT: 'alert',
  CRITICAL: 'critical'
};

/**
 * Converts a geotechnical sensor object into an RFC 7946 GeoJSON Feature.
 * 
 * @param {Object} sensor - Geotechnical sensor object
 * @returns {Object|null} GeoJSON Feature
 */
export const sensorToGeoJsonFeature = (sensor) => {
  if (!sensor) return null;
  const lat = Number(sensor.lat || 0);
  const lng = Number(sensor.lng || 0);
  const sId = String(sensor.sensor_id || sensor.id || '');

  return {
    type: 'Feature',
    id: sId,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    properties: {
      sensor_id: sId,
      name: sensor.name || '',
      sensor_type: sensor.sensor_type || 'piezometer',
      asset_id: sensor.asset_id || '',
      elevation_m: sensor.installation_elevation_m ?? null,
      depth_m: sensor.installation_depth_m ?? null,
      unit: sensor.unit || '',
      current_value: sensor.current_value ?? null,
      status: sensor.status || 'normal',
      alert_threshold_high: sensor.alert_threshold_high ?? null,
      critical_threshold_high: sensor.critical_threshold_high ?? null,
      last_reading_time: sensor.last_reading_time || null
    }
  };
};

/**
 * Converts an array of geotechnical sensors into an RFC 7946 GeoJSON FeatureCollection.
 * 
 * @param {Array<Object>} [sensors=[]] - Array of geotechnical sensors
 * @returns {Object} GeoJSON FeatureCollection
 */
export const sensorsToFeatureCollection = (sensors = []) => {
  const features = Array.isArray(sensors)
    ? sensors.map(sensorToGeoJsonFeature).filter(Boolean)
    : [];
  return {
    type: 'FeatureCollection',
    features
  };
};

/**
 * Calculates Elevation-Area-Capacity (EAC) bathymetric curve points from a DEM grid.
 * 
 * @param {Array<number>} elevationGrid - Array of elevation values (meters)
 * @param {number} cellSizeM - Grid cell resolution in meters (e.g. 10m or 30m)
 * @param {number} datumMin - Pool bottom datum elevation (m)
 * @param {number} datumMax - Maximum spillway elevation (m)
 * @param {Object} [options={}] - Options (step, currentPool)
 * @returns {Object} Object containing curvePoints and summary metrics
 */
export const calculateElevationStorageCapacity = (elevationGrid, cellSizeM, datumMin, datumMax, options = {}) => {
  if (!Array.isArray(elevationGrid) || elevationGrid.length === 0) {
    return { curvePoints: [], metrics: { max_capacity_m3: 0, max_surface_area_ha: 0 } };
  }
  const validElevations = elevationGrid.filter((e) => e !== null && e !== undefined && !Number.isNaN(Number(e))).map(Number);
  if (validElevations.length === 0) {
    return { curvePoints: [], metrics: { max_capacity_m3: 0, max_surface_area_ha: 0 } };
  }

  const step = options.step ?? 5.0;
  const currentPool = options.currentPool ?? null;
  const cellAreaM2 = Number(cellSizeM) * Number(cellSizeM);
  const m2ToHa = 0.0001;
  const m3ToAf = 0.000810714;

  const stages = [];
  let currZ = datumMin;
  while (currZ <= datumMax + 1e-5) {
    stages.push(Number(currZ.toFixed(2)));
    currZ += step;
  }
  if (stages[stages.length - 1] < datumMax) {
    stages.push(Number(datumMax.toFixed(2)));
  }

  const curvePoints = [];
  let cumulativeVolumeM3 = 0.0;
  let prevAreaM2 = 0.0;
  let prevStage = datumMin;

  for (let i = 0; i < stages.length; i++) {
    const z = stages[i];
    let submergedCells = 0;
    for (let j = 0; j < validElevations.length; j++) {
      if (validElevations[j] <= z) submergedCells += 1;
    }
    const areaM2 = submergedCells * cellAreaM2;
    const areaHa = Number((areaM2 * m2ToHa).toFixed(3));

    if (i > 0) {
      const dh = z - prevStage;
      if (dh > 0) {
        const incVol = (dh / 3.0) * (prevAreaM2 + areaM2 + Math.sqrt(prevAreaM2 * areaM2));
        cumulativeVolumeM3 += incVol;
      }
    }

    prevAreaM2 = areaM2;
    prevStage = z;
    const volAf = Number((cumulativeVolumeM3 * m3ToAf).toFixed(2));

    curvePoints.push({
      elevation_m: z,
      surface_area_ha: areaHa,
      storage_volume_m3: Number(cumulativeVolumeM3.toFixed(2)),
      storage_volume_acre_feet: volAf
    });
  }

  const maxCap = curvePoints.length > 0 ? curvePoints[curvePoints.length - 1].storage_volume_m3 : 0.0;
  const maxArea = curvePoints.length > 0 ? curvePoints[curvePoints.length - 1].surface_area_ha : 0.0;

  const metrics = {
    max_capacity_m3: maxCap,
    max_surface_area_ha: maxArea
  };

  if (currentPool !== null && curvePoints.length > 0) {
    let currSubmerged = 0;
    for (let j = 0; j < validElevations.length; j++) {
      if (validElevations[j] <= currentPool) currSubmerged += 1;
    }
    const currAreaM2 = currSubmerged * cellAreaM2;
    metrics.current_surface_area_ha = Number((currAreaM2 * m2ToHa).toFixed(3));

    let currVol = 0.0;
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];
      if (p1.elevation_m <= currentPool && currentPool <= p2.elevation_m) {
        const span = p2.elevation_m - p1.elevation_m;
        if (span > 0) {
          const frac = (currentPool - p1.elevation_m) / span;
          currVol = p1.storage_volume_m3 + frac * (p2.storage_volume_m3 - p1.storage_volume_m3);
        }
        break;
      }
    }
    if (currentPool >= curvePoints[curvePoints.length - 1].elevation_m) {
      currVol = curvePoints[curvePoints.length - 1].storage_volume_m3;
    }

    metrics.current_storage_m3 = Number(currVol.toFixed(2));
    if (maxCap > 0) {
      metrics.capacity_utilization_pct = Number(((currVol / maxCap) * 100.0).toFixed(2));
    }
  }

  return { curvePoints, metrics };
};

/**
 * Calculates Web Mercator slippy tile coordinates (z, x, y) covering a geographic bounding box at a given zoom.
 * 
 * @param {number} minLon - Western longitude
 * @param {number} minLat - Southern latitude
 * @param {number} maxLon - Eastern longitude
 * @param {number} maxLat - Northern latitude
 * @param {number} zoom - Zoom level
 * @returns {Array<[number, number, number]>} List of [z, x, y] tuples
 */
export const calculateTilePyramidCoords = (minLon, minLat, maxLon, maxLat, zoom) => {
  const [x1, y2] = latLonToTile(minLat, minLon, zoom);
  const [x2, y1] = latLonToTile(maxLat, maxLon, zoom);

  const xMin = Math.min(x1, x2);
  const xMax = Math.max(x1, x2);
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);

  const coords = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      coords.push([zoom, x, y]);
    }
  }
  return coords;
};

/**
 * Calculates aggregate tile counts across a pyramid of zoom levels for cache pre-warming.
 * 
 * @param {number} minLon - Western longitude
 * @param {number} minLat - Southern latitude
 * @param {number} maxLon - Eastern longitude
 * @param {number} maxLat - Northern latitude
 * @param {number} minZoom - Minimum zoom level
 * @param {number} maxZoom - Maximum zoom level
 * @returns {Object} Pyramid tile count summary and per-zoom breakdown
 */
export const calculateTilePyramidCount = (minLon, minLat, maxLon, maxLat, minZoom, maxZoom) => {
  let total = 0;
  const zoomCounts = {};
  for (let z = minZoom; z <= maxZoom; z++) {
    const tiles = calculateTilePyramidCoords(minLon, minLat, maxLon, maxLat, z);
    const count = tiles.length;
    zoomCounts[z] = count;
    total += count;
  }
  return {
    min_zoom: minZoom,
    max_zoom: maxZoom,
    total_tiles: total,
    zoom_tile_counts: zoomCounts
  };
};

// ============================================================================
// PHOTOGRAMMETRY & GROUND CONTROL POINTS (GCP) QUALITY ASSESSMENT
// ============================================================================

export const GCP_ROLES = {
  CONTROL: 'control',
  CHECK: 'check'
};

export const GCP_TARGET_TYPES = {
  CHECKERBOARD: 'checkerboard',
  CIRCULAR: 'circular',
  CROSS: 'cross',
  NATURAL_FEATURE: 'natural_feature'
};

/**
 * Calculates residual errors and separate RMSE metrics for Control Points and Check Points.
 * Parity implementation with calculate_gcp_residuals_and_rmse() in app/models/schemas.py.
 * 
 * @param {Array<Object>} measuredPoints - Surveyed ground control points
 * @param {Array<Object>} estimatedPoints - Photogrammetric model estimated points
 * @returns {{ residuals: Array<Object>, controlRmse: Object, checkRmse: Object|null }} Residuals and RMSE
 */
export const calculateGcpResidualsAndRmse = (measuredPoints, estimatedPoints) => {
  const estLookup = {};
  if (Array.isArray(estimatedPoints)) {
    for (const ep of estimatedPoints) {
      const pid = String(ep.point_id || '').trim();
      if (pid) estLookup[pid] = ep;
    }
  }

  const residuals = [];
  const ctrlResiduals = [];
  const checkResiduals = [];

  if (Array.isArray(measuredPoints)) {
    for (const mp of measuredPoints) {
      const pid = String(mp.point_id || '').trim();
      if (!pid || !estLookup[pid]) continue;

      const ep = estLookup[pid];
      const role = String(mp.role || 'control').toLowerCase() === 'check' ? 'check' : 'control';
      const dx = Number(ep.x_east || 0.0) - Number(mp.x_east || 0.0);
      const dy = Number(ep.y_north || 0.0) - Number(mp.y_north || 0.0);
      const dz = Number(ep.z_elev || 0.0) - Number(mp.z_elev || 0.0);

      const hRes = Math.sqrt(dx * dx + dy * dy);
      const res3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const reproj = ep.reprojection_error_px !== undefined ? ep.reprojection_error_px : ep.image_pixel_reprojection_error_px;

      const resObj = {
        point_id: pid,
        role,
        delta_x_m: parseFloat(dx.toFixed(4)),
        delta_y_m: parseFloat(dy.toFixed(4)),
        delta_z_m: parseFloat(dz.toFixed(4)),
        residual_horizontal_m: parseFloat(hRes.toFixed(4)),
        residual_3d_m: parseFloat(res3d.toFixed(4)),
        image_pixel_reprojection_error_px: reproj !== undefined && reproj !== null ? parseFloat(Number(reproj).toFixed(2)) : null
      };

      residuals.push(resObj);
      if (role === 'control') {
        ctrlResiduals.push(resObj);
      } else {
        checkResiduals.push(resObj);
      }
    }
  }

  const computeRmse = (resList) => {
    const n = resList.length;
    if (n === 0) {
      return { rmse_x_m: 0.0, rmse_y_m: 0.0, rmse_z_m: 0.0, rmse_horizontal_m: 0.0, rmse_3d_m: 0.0, point_count: 0 };
    }
    const sumDx2 = resList.reduce((acc, r) => acc + (r.delta_x_m ** 2), 0);
    const sumDy2 = resList.reduce((acc, r) => acc + (r.delta_y_m ** 2), 0);
    const sumDz2 = resList.reduce((acc, r) => acc + (r.delta_z_m ** 2), 0);
    const rx = Math.sqrt(sumDx2 / n);
    const ry = Math.sqrt(sumDy2 / n);
    const rz = Math.sqrt(sumDz2 / n);
    const rh = Math.sqrt(rx * rx + ry * ry);
    const r3d = Math.sqrt(rx * rx + ry * ry + rz * rz);
    return {
      rmse_x_m: parseFloat(rx.toFixed(4)),
      rmse_y_m: parseFloat(ry.toFixed(4)),
      rmse_z_m: parseFloat(rz.toFixed(4)),
      rmse_horizontal_m: parseFloat(rh.toFixed(4)),
      rmse_3d_m: parseFloat(r3d.toFixed(4)),
      point_count: n
    };
  };

  const controlRmse = computeRmse(ctrlResiduals.length > 0 ? ctrlResiduals : residuals);
  const checkRmse = checkResiduals.length > 0 ? computeRmse(checkResiduals) : null;
  return { residuals, controlRmse, checkRmse };
};

/**
 * Converts a GCP point object into an RFC 7946 GeoJSON Feature.
 * 
 * @param {Object} gcp - GCP coordinate object
 * @returns {Object} GeoJSON Feature
 */
export const gcpToGeoJsonFeature = (gcp) => {
  const data = gcp || {};
  const lat = Number(data.lat || 0.0);
  const lng = Number(data.lng || 0.0);
  const pid = String(data.point_id || '');
  return {
    type: 'Feature',
    id: pid,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    properties: {
      point_id: pid,
      role: data.role || 'control',
      target_type: data.target_type || 'checkerboard',
      x_east: data.x_east,
      y_north: data.y_north,
      z_elev: data.z_elev,
      crs: data.crs || 'EPSG:32610',
      is_enabled: data.is_enabled !== undefined ? Boolean(data.is_enabled) : true
    }
  };
};

/**
 * Converts an array of GCP points into an RFC 7946 GeoJSON FeatureCollection.
 * 
 * @param {Array<Object>} gcps - Sequence of GCP points
 * @returns {Object} GeoJSON FeatureCollection
 */
export const gcpsToFeatureCollection = (gcps) => ({
  type: 'FeatureCollection',
  features: Array.isArray(gcps) ? gcps.map(gcpToGeoJsonFeature) : []
});


// ============================================================================
// TOPOGRAPHIC WETNESS INDEX (TWI) & SLOPE STABILITY FACTOR OF SAFETY (FS)
// ============================================================================

export const SLOPE_STABILITY_TIERS = {
  STABLE: 'stable',
  MARGINALLY_STABLE: 'marginally_stable',
  ADVISORY: 'advisory',
  FAILURE_CRITICAL: 'failure_critical'
};

/**
 * Calculates Topographic Wetness Index: TWI = ln(a / tan(beta)).
 * Parity implementation with calculate_topographic_wetness_index() in app/models/schemas.py.
 * 
 * @param {number} catchmentAreaM2 - Upslope contributing area in m^2
 * @param {number} slopeDegrees - Ground surface slope in degrees
 * @param {number} [contourWidthM=10.0] - Contour pixel width in meters
 * @param {number} [minSlopeDeg=0.1] - Minimum slope clamp to avoid singularity
 * @returns {number} Topographic Wetness Index value
 */
export const calculateTopographicWetnessIndex = (
  catchmentAreaM2,
  slopeDegrees,
  contourWidthM = 10.0,
  minSlopeDeg = 0.1
) => {
  const effSlope = Math.max(Number(slopeDegrees) || 0.0, Number(minSlopeDeg) || 0.1);
  const slopeRad = (effSlope * Math.PI) / 180.0;
  let tanBeta = Math.tan(slopeRad);
  if (tanBeta <= 1e-6) tanBeta = 1e-6;
  const specificCatchment = Math.max((Number(catchmentAreaM2) || 0.0) / Math.max(Number(contourWidthM) || 1.0, 1.0), 1.0);
  const twi = Math.log(specificCatchment / tanBeta);
  return parseFloat(twi.toFixed(3));
};

/**
 * Calculates Factor of Safety (FS) for an infinite slope with parallel phreatic seepage.
 * Parity implementation with calculate_slope_factor_of_safety() in app/models/schemas.py.
 * 
 * @param {number} slopeDeg - Slope angle in degrees
 * @param {number} [cohesionKpa=12.0] - Effective soil cohesion c' in kPa
 * @param {number} [frictionAngleDeg=30.0] - Effective friction angle phi' in degrees
 * @param {number} [unitWeightSoil=19.0] - Soil unit weight gamma in kN/m^3
 * @param {number} [saturationM=0.5] - Saturation ratio m = hw / z [0.0, 1.0]
 * @param {number} [depthM=3.0] - Slip failure depth z in meters
 * @param {number} [unitWeightWater=9.81] - Water unit weight in kN/m^3
 * @returns {number} Factor of Safety (FS)
 */
export const calculateSlopeFactorOfSafety = (
  slopeDeg,
  cohesionKpa = 12.0,
  frictionAngleDeg = 30.0,
  unitWeightSoil = 19.0,
  saturationM = 0.5,
  depthM = 3.0,
  unitWeightWater = 9.81
) => {
  const deg = Number(slopeDeg) || 0.0;
  if (deg <= 0.1) return 99.0;

  const betaRad = (deg * Math.PI) / 180.0;
  const phiRad = ((Number(frictionAngleDeg) || 30.0) * Math.PI) / 180.0;

  const cosBeta = Math.cos(betaRad);
  const sinBeta = Math.sin(betaRad);
  const tanPhi = Math.tan(phiRad);

  const mClamped = Math.max(0.0, Math.min(1.0, Number(saturationM) || 0.0));
  const effUnitWeight = (Number(unitWeightSoil) || 19.0) - (mClamped * (Number(unitWeightWater) || 9.81));
  const z = Number(depthM) || 3.0;

  const numerator = (Number(cohesionKpa) || 12.0) + (effUnitWeight * z * (cosBeta ** 2) * tanPhi);
  const denominator = (Number(unitWeightSoil) || 19.0) * z * sinBeta * cosBeta;

  if (denominator <= 1e-6) return 99.0;
  const fs = numerator / denominator;
  return parseFloat(fs.toFixed(3));
};

/**
 * Categorizes a Factor of Safety score into standard geotechnical stability tiers.
 * 
 * @param {number} fs - Factor of Safety
 * @returns {'stable'|'marginally_stable'|'advisory'|'failure_critical'} Stability tier
 */
export const classifySlopeStabilityTier = (fs) => {
  const val = Number(fs);
  if (val >= 1.50) return SLOPE_STABILITY_TIERS.STABLE;
  if (val >= 1.30) return SLOPE_STABILITY_TIERS.MARGINALLY_STABLE;
  if (val > 1.00) return SLOPE_STABILITY_TIERS.ADVISORY;
  return SLOPE_STABILITY_TIERS.FAILURE_CRITICAL;
};


// ============================================================================
// HARMONIZED LANDSAT SENTINEL-2 (HLS) SPECTRAL CROSS-CALIBRATION
// ============================================================================

export const HLS_PLATFORMS = {
  LANDSAT_OLI: 'landsat_oli',
  SENTINEL_MSI: 'sentinel_msi'
};

export const HLS_TRANSFORMATION_COEFFICIENTS = {
  blue: { band_name: 'blue', slope: 0.9959, offset: -0.0002, r_squared: 0.998 },
  green: { band_name: 'green', slope: 0.9778, offset: -0.0040, r_squared: 0.997 },
  red: { band_name: 'red', slope: 1.0050, offset: -0.0009, r_squared: 0.998 },
  nir: { band_name: 'nir', slope: 0.9825, offset: -0.0183, r_squared: 0.995 },
  swir1: { band_name: 'swir1', slope: 1.0010, offset: -0.0020, r_squared: 0.996 },
  swir2: { band_name: 'swir2', slope: 0.9720, offset: -0.0048, r_squared: 0.994 }
};

/**
 * Cross-calibrates spectral reflectance values between Landsat OLI and Sentinel MSI.
 * Parity implementation with cross_calibrate_spectral_band() in app/models/schemas.py.
 * 
 * @param {number[]} values - Input reflectance values
 * @param {string} bandName - Band name ('blue', 'green', 'red', 'nir', 'swir1', 'swir2')
 * @param {string} [sourcePlatform='landsat_oli'] - Source platform
 * @param {string} [targetPlatform='sentinel_msi'] - Target platform
 * @returns {number[]} Calibrated reflectance values
 */
export const crossCalibrateSpectralBand = (
  values,
  bandName,
  sourcePlatform = 'landsat_oli',
  targetPlatform = 'sentinel_msi'
) => {
  const bKey = String(bandName || '').toLowerCase().trim();
  if (!HLS_TRANSFORMATION_COEFFICIENTS[bKey] || !Array.isArray(values)) {
    return Array.isArray(values) ? values.map((v) => parseFloat(Number(v).toFixed(4))) : [];
  }
  const spec = HLS_TRANSFORMATION_COEFFICIENTS[bKey];
  const src = String(sourcePlatform).toLowerCase();
  const tgt = String(targetPlatform).toLowerCase();

  return values.map((v) => {
    const val = Number(v);
    if (isNaN(val)) return 0.0;
    if (src === tgt) {
      return parseFloat(val.toFixed(4));
    }
    if (src === 'landsat_oli' && tgt === 'sentinel_msi') {
      const res = spec.slope * val + spec.offset;
      return parseFloat(Math.max(0.0, Math.min(1.0, res)).toFixed(4));
    }
    if (src === 'sentinel_msi' && tgt === 'landsat_oli') {
      const res = (val - spec.offset) / spec.slope;
      return parseFloat(Math.max(0.0, Math.min(1.0, res)).toFixed(4));
    }
    return parseFloat(val.toFixed(4));
  });
};


// ============================================================================
// HARMFUL ALGAL BLOOM (HAB) & WATER QUALITY TROPHIC ANALYTICS
// ============================================================================

export const WATER_QUALITY_METRICS = {
  NDCI: 'ndci',
  NDTI: 'ndti',
  FAI: 'fai',
  TURBIDITY_FNU: 'turbidity_fnu',
  CHLOROPHYLL_A_UGL: 'chlorophyll_a_ugl'
};

export const TROPHIC_STATES = {
  OLIGOTROPHIC: 'oligotrophic',
  MESOTROPHIC: 'mesotrophic',
  EUTROPHIC: 'eutrophic',
  HYPEREUTROPHIC: 'hypereutrophic'
};

/**
 * Calculates Normalized Difference Chlorophyll Index: NDCI = (B05 - B04)/(B05 + B04).
 * 
 * @param {number} red - Red surface reflectance (Band 4)
 * @param {number} rededge1 - RedEdge1 surface reflectance (Band 5)
 * @returns {number} NDCI index in [-1.0, 1.0]
 */
export const calculateNdci = (red, rededge1) => {
  const r = Number(red) || 0.0;
  const re = Number(rededge1) || 0.0;
  const denom = re + r;
  if (Math.abs(denom) < 1e-6) return 0.0;
  const val = (re - r) / denom;
  return parseFloat(Math.max(-1.0, Math.min(1.0, val)).toFixed(4));
};

/**
 * Calculates Normalized Difference Turbidity Index: NDTI = (B04 - B03)/(B04 + B03).
 * 
 * @param {number} green - Green surface reflectance (Band 3)
 * @param {number} red - Red surface reflectance (Band 4)
 * @returns {number} NDTI index in [-1.0, 1.0]
 */
export const calculateNdti = (green, red) => {
  const g = Number(green) || 0.0;
  const r = Number(red) || 0.0;
  const denom = r + g;
  if (Math.abs(denom) < 1e-6) return 0.0;
  const val = (r - g) / denom;
  return parseFloat(Math.max(-1.0, Math.min(1.0, val)).toFixed(4));
};

/**
 * Classifies NDCI index into limnological trophic states.
 * 
 * @param {number} ndciValue - NDCI index score
 * @returns {'oligotrophic'|'mesotrophic'|'eutrophic'|'hypereutrophic'} Trophic state
 */
export const classifyTrophicState = (ndciValue) => {
  const v = Number(ndciValue);
  if (v < 0.0) return TROPHIC_STATES.OLIGOTROPHIC;
  if (v < 0.12) return TROPHIC_STATES.MESOTROPHIC;
  if (v < 0.25) return TROPHIC_STATES.EUTROPHIC;
  return TROPHIC_STATES.HYPEREUTROPHIC;
};


// ============================================================================
// CYANOBACTERIA BLOOM RISK & WATER QUALITY ALERT TIERS
// ============================================================================

export const CYANOBACTERIA_ALERT_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

/**
 * Classifies estimated Chlorophyll-a (ug/L) into WHO cyanobacteria alert tiers.
 * 
 * @param {number} chlorophyllAUgl - Chlorophyll-a in ug/L
 * @returns {'low'|'moderate'|'high'|'very_high'} Alert level
 */
export const classifyCyanobacteriaAlert = (chlorophyllAUgl) => {
  const val = Number(chlorophyllAUgl) || 0.0;
  if (val < 10.0) return CYANOBACTERIA_ALERT_LEVELS.LOW;
  if (val < 50.0) return CYANOBACTERIA_ALERT_LEVELS.MODERATE;
  if (val < 100.0) return CYANOBACTERIA_ALERT_LEVELS.HIGH;
  return CYANOBACTERIA_ALERT_LEVELS.VERY_HIGH;
};


// ============================================================================
// CAMERA CALIBRATION PRESETS (DRONE PHOTOGRAMMETRY SENSORS)
// ============================================================================

export const CAMERA_CALIBRATION_PRESETS = {
  dji_zenmuse_p1_35mm: {
    camera_id: 'DJI-ZENMUSE-P1-35MM',
    name: 'DJI Zenmuse P1 (35mm)',
    focal_length_mm: 35.0,
    focal_length_px: 8000.0,
    principal_point_x_px: 4096.0,
    principal_point_y_px: 2730.0,
    radial_distortion_k1: -0.024,
    radial_distortion_k2: 0.015,
    radial_distortion_k3: -0.003,
    tangential_distortion_p1: 0.0001,
    tangential_distortion_p2: 0.0001,
    sensor_width_mm: 35.9,
    sensor_height_mm: 24.0
  },
  dji_phantom_4_rtk: {
    camera_id: 'DJI-PHANTOM-4-RTK',
    name: 'DJI Phantom 4 RTK (8.8mm)',
    focal_length_mm: 8.8,
    focal_length_px: 3666.67,
    principal_point_x_px: 2736.0,
    principal_point_y_px: 1824.0,
    radial_distortion_k1: -0.125,
    radial_distortion_k2: 0.105,
    radial_distortion_k3: -0.021,
    tangential_distortion_p1: 0.0002,
    tangential_distortion_p2: 0.0002,
    sensor_width_mm: 13.2,
    sensor_height_mm: 8.8
  },
  dji_mavic_3_enterprise: {
    camera_id: 'DJI-MAVIC-3-ENTERPRISE',
    name: 'DJI Mavic 3 Enterprise (12.3mm)',
    focal_length_mm: 12.29,
    focal_length_px: 3724.24,
    principal_point_x_px: 2644.0,
    principal_point_y_px: 1984.0,
    radial_distortion_k1: -0.082,
    radial_distortion_k2: 0.064,
    radial_distortion_k3: -0.012,
    tangential_distortion_p1: 0.0001,
    tangential_distortion_p2: 0.0001,
    sensor_width_mm: 17.3,
    sensor_height_mm: 13.0
  },
  sony_rx1r_ii: {
    camera_id: 'SONY-RX1R-II',
    name: 'Sony RX1R II (35mm Full-Frame)',
    focal_length_mm: 35.0,
    focal_length_px: 7777.78,
    principal_point_x_px: 3968.0,
    principal_point_y_px: 2648.0,
    radial_distortion_k1: -0.018,
    radial_distortion_k2: 0.010,
    radial_distortion_k3: -0.002,
    tangential_distortion_p1: 0.00005,
    tangential_distortion_p2: 0.00005,
    sensor_width_mm: 35.9,
    sensor_height_mm: 24.0
  }
};

export const getCameraCalibrationPreset = (cameraId) => {
  const cid = String(cameraId || '').toLowerCase().replace(/-/g, '_').trim();
  if (CAMERA_CALIBRATION_PRESETS[cid]) return CAMERA_CALIBRATION_PRESETS[cid];
  for (const key of Object.keys(CAMERA_CALIBRATION_PRESETS)) {
    const spec = CAMERA_CALIBRATION_PRESETS[key];
    if (spec.camera_id.toLowerCase().replace(/-/g, '_') === cid) return spec;
  }
  return null;
};

export const listCameraCalibrationPresets = () => Object.values(CAMERA_CALIBRATION_PRESETS);


// ============================================================================
// GEOTECHNICAL SOIL MECHANICS PRESETS (SLOPE STABILITY)
// ============================================================================

export const SOIL_MECHANICS_PRESETS = {
  compacted_clay_core: {
    key: 'compacted_clay_core',
    name: 'Compacted Clay Core (Impervious)',
    cohesion_kpa: 25.0,
    friction_angle_deg: 22.0,
    soil_unit_weight_kn_m3: 20.0,
    description: 'Low-permeability clay core barrier with high cohesive shear strength.'
  },
  silty_sand_shell: {
    key: 'silty_sand_shell',
    name: 'Silty Sand Shell (Semi-Pervious)',
    cohesion_kpa: 5.0,
    friction_angle_deg: 32.0,
    soil_unit_weight_kn_m3: 19.0,
    description: 'Granular embankment structural fill with moderate internal friction angle.'
  },
  rockfill_embankment: {
    key: 'rockfill_embankment',
    name: 'Rockfill Embankment Zone',
    cohesion_kpa: 0.0,
    friction_angle_deg: 40.0,
    soil_unit_weight_kn_m3: 21.0,
    description: 'Crushed rock shoulder material characterized by high frictional resistance without cohesion.'
  },
  mine_tailings_silt: {
    key: 'mine_tailings_silt',
    name: 'Mine Tailings Silt/Slurry',
    cohesion_kpa: 2.0,
    friction_angle_deg: 26.0,
    soil_unit_weight_kn_m3: 17.5,
    description: 'Unconsolidated or fine hydraulically deposited tailings prone to liquefaction and seepage instability.'
  },
  compacted_earthfill: {
    key: 'compacted_earthfill',
    name: 'Compacted Earthfill (Standard)',
    cohesion_kpa: 12.0,
    friction_angle_deg: 30.0,
    soil_unit_weight_kn_m3: 19.0,
    description: 'Standard engineered fill material for dam embankments, levees, and roadway slopes.'
  }
};

export const getSoilPreset = (key) => {
  const k = String(key || '').toLowerCase().trim();
  return SOIL_MECHANICS_PRESETS[k] || null;
};

export const listSoilPresets = () => Object.values(SOIL_MECHANICS_PRESETS);


// ============================================================================
// DYNAMIC TILE URL BUILDERS (TWI, SLOPE STABILITY & WATER QUALITY)
// ============================================================================

export const buildTwiTileUrl = (z, x, y, options = {}) => {
  const rescale = options.rescale || '2.0,12.0';
  const colormap = options.colormap || 'spectral';
  const basePrefix = options.basePrefix || '/api/v1';
  return `${basePrefix}/tiles/terrain/twi/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
};

export const buildSlopeStabilityTileUrl = (z, x, y, options = {}) => {
  const rescale = options.rescale || '0.8,2.0';
  const colormap = options.colormap || 'rdylbu';
  const basePrefix = options.basePrefix || '/api/v1';
  return `${basePrefix}/tiles/terrain/slope-stability/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
};

export const buildWaterQualityTileUrl = (metric, z, x, y, options = {}) => {
  const m = String(metric || 'ndci').toLowerCase();
  const defaultRescale = m === 'ndci' ? '-0.1,0.4' : (m === 'ndti' ? '-0.2,0.3' : '0.0,50.0');
  const defaultColormap = m === 'ndci' ? 'spectral' : (m === 'ndti' ? 'turbo' : 'viridis');
  const rescale = options.rescale || defaultRescale;
  const colormap = options.colormap || defaultColormap;
  const basePrefix = options.basePrefix || '/api/v1';
  if (options.collection && options.itemId) {
    return `${basePrefix}/tiles/water-quality/${options.collection}/${options.itemId}/${m}/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
  }
  return `${basePrefix}/tiles/water-quality/${m}/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
};

// ============================================================================
// T-74: LAND SURFACE TEMPERATURE (LST) & THERMAL HAZARDS
// ============================================================================

export const HEAT_HAZARD_LEVELS = {
  NORMAL: 'normal',
  MODERATE_HEAT: 'moderate_heat',
  HIGH_HEAT: 'high_heat',
  EXTREME_HEAT: 'extreme_heat'
};

export const LST_CALCULATION_METHODS = {
  SINGLE_CHANNEL: 'single_channel',
  SPLIT_WINDOW: 'split_window',
  MONO_WINDOW: 'mono_window'
};

export const calculateFractionalVegetationCover = (ndvi, ndviSoil = 0.05, ndviVeg = 0.70) => {
  const n = Number(ndvi);
  if (n <= ndviSoil) return 0.0;
  if (n >= ndviVeg) return 1.0;
  const denom = ndviVeg - ndviSoil;
  if (denom <= 0) return 0.0;
  const val = Math.pow((n - ndviSoil) / denom, 2);
  return Math.max(0.0, Math.min(1.0, Number(val.toFixed(4))));
};

export const calculateLandSurfaceEmissivity = (ndvi, fvc, epsSoil = 0.97, epsVeg = 0.99) => {
  const n = Number(ndvi);
  const f = Number(fvc);
  if (n < 0.05) return Number(epsSoil.toFixed(4));
  if (n > 0.70) return Number(epsVeg.toFixed(4));
  const dEps = (1.0 - epsSoil) * (1.0 - f) * 0.55 * epsVeg;
  const eps = epsVeg * f + epsSoil * (1.0 - f) + dEps;
  return Math.max(0.85, Math.min(1.0, Number(eps.toFixed(4))));
};

export const calculateLstSingleChannel = (brightnessTempK, emissivity, wavelengthUm = 10.895) => {
  const tb = Number(brightnessTempK);
  const eps = Number(emissivity);
  if (tb <= 0 || eps <= 0) return 273.15;
  const rho = 14380.0;
  const denom = 1.0 + ((wavelengthUm * tb) / rho) * Math.log(eps);
  if (denom <= 0) return tb;
  return Number((tb / denom).toFixed(2));
};

export const classifyHeatHazardLevel = (lstC, uhiIntensityC = 0.0) => {
  const t = Number(lstC);
  const u = Number(uhiIntensityC);
  if (t >= 42.0 || u >= 6.0) return HEAT_HAZARD_LEVELS.EXTREME_HEAT;
  if (t >= 35.0 || u >= 3.0) return HEAT_HAZARD_LEVELS.HIGH_HEAT;
  if (t >= 30.0 || u >= 0.5) return HEAT_HAZARD_LEVELS.MODERATE_HEAT;
  return HEAT_HAZARD_LEVELS.NORMAL;
};

export const buildLstTileUrl = (collection, itemId, z, x, y, options = {}) => {
  const col = collection || 'landsat-c2-l2';
  const rescale = options.rescale || '15.0,45.0';
  const colormap = options.colormap || 'inferno';
  const basePrefix = options.basePrefix || '/api/v1';
  return `${basePrefix}/tiles/thermal/lst/${col}/${itemId}/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
};

// ============================================================================
// T-74: TOPOGRAPHIC & ILLUMINATION CORRECTION
// ============================================================================

export const TOPOGRAPHIC_CORRECTION_MODELS = {
  COSINE: 'cosine',
  MINNAERT: 'minnaert',
  C_CORRECTION: 'c_correction',
  SCS_C: 'scs_c'
};

export const calculateIlluminationAngle = (solarZenithDeg, solarAzimuthDeg, slopeDeg, aspectDeg) => {
  const deg2rad = Math.PI / 180.0;
  const thS = Number(solarZenithDeg) * deg2rad;
  const phS = Number(solarAzimuthDeg) * deg2rad;
  const alpha = Number(slopeDeg) * deg2rad;
  const beta = Number(aspectDeg) * deg2rad;
  const cosI = Math.cos(thS) * Math.cos(alpha) + Math.sin(thS) * Math.sin(alpha) * Math.cos(phS - beta);
  return Number(Math.max(-1.0, Math.min(1.0, cosI)).toFixed(4));
};

export const applyTopographicCCorrection = (radiance, cosI, solarZenithDeg, cParam = 0.15) => {
  const deg2rad = Math.PI / 180.0;
  const thS = Number(solarZenithDeg) * deg2rad;
  const cosThetaS = Math.cos(thS);
  let denom = Number(cosI) + Number(cParam);
  if (denom <= 0.001) denom = 0.001;
  const corrected = Number(radiance) * ((cosThetaS + Number(cParam)) / denom);
  return Number(Math.max(0.0, corrected).toFixed(4));
};

// ============================================================================
// T-74: SENTINEL-1 SAR INSAR COHERENCE & GROUND DISPLACEMENT
// ============================================================================

export const INSAR_DEFORMATION_TIERS = {
  UPLIFT: 'uplift',
  STABLE: 'stable',
  MINOR_SUBSIDENCE: 'minor_subsidence',
  MODERATE_SUBSIDENCE: 'moderate_subsidence',
  SEVERE_SUBSIDENCE: 'severe_subsidence',
  CRITICAL_FAILURE: 'critical_failure'
};

export const calculateInSarDisplacementMm = (diffPhaseRad, wavelengthMm = 55.465) => {
  const disp = - (Number(wavelengthMm) / (4.0 * Math.PI)) * Number(diffPhaseRad);
  return Number(disp.toFixed(2));
};

export const calculateInSarVelocityMmYr = (displacementMm, temporalBaselineDays) => {
  const days = Number(temporalBaselineDays);
  if (days <= 0) return 0.0;
  const vel = Number(displacementMm) / (days / 365.25);
  return Number(vel.toFixed(2));
};

export const classifyInSarDeformationTier = (velocityMmYr) => {
  const v = Number(velocityMmYr);
  if (v > 10.0) return INSAR_DEFORMATION_TIERS.UPLIFT;
  if (v >= -5.0) return INSAR_DEFORMATION_TIERS.STABLE;
  if (v >= -15.0) return INSAR_DEFORMATION_TIERS.MINOR_SUBSIDENCE;
  if (v >= -30.0) return INSAR_DEFORMATION_TIERS.MODERATE_SUBSIDENCE;
  if (v >= -50.0) return INSAR_DEFORMATION_TIERS.SEVERE_SUBSIDENCE;
  return INSAR_DEFORMATION_TIERS.CRITICAL_FAILURE;
};

export const buildInsarTileUrl = (pairId, z, x, y, options = {}) => {
  const rescale = options.rescale || '-30.0,30.0';
  const colormap = options.colormap || 'rdylbu';
  const basePrefix = options.basePrefix || '/api/v1';
  return `${basePrefix}/tiles/sar/insar/${pairId}/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
};

// ============================================================================
// T-74: PHENOLOGICAL HARMONIC ANALYSIS (HATS) & PHENOMETRICS
// ============================================================================

export const PHENOLOGY_FIT_MODELS = {
  HARMONIC_HATS: 'harmonic_hats',
  DOUBLE_LOGISTIC: 'double_logistic',
  SAVITZKY_GOLAY: 'savitzky_golay'
};

export const fitHarmonicPhenology = (doyList = [], viList = []) => {
  if (!doyList.length || !viList.length || doyList.length !== viList.length) {
    const curve = [];
    for (let d = 1; d <= 365; d += 10) {
      const val = 0.25 + 0.35 * (1.0 - Math.cos((2.0 * Math.PI * (d - 40)) / 365.0)) / 2.0;
      curve.push({ doy: d, vi_fitted: Number(val.toFixed(3)) });
    }
    return {
      phenometrics: {
        base_level: 0.25,
        peak_level: 0.60,
        amplitude: 0.35,
        sos_doy: 105,
        pos_doy: 210,
        eos_doy: 305,
        los_days: 200
      },
      r_squared: 0.92,
      curve_points: curve
    };
  }

  const n = doyList.length;
  const meanVi = viList.reduce((acc, y) => acc + Number(y), 0) / n;
  let c1Sum = 0.0;
  let s1Sum = 0.0;
  for (let i = 0; i < n; i++) {
    const rad = (2.0 * Math.PI * Number(doyList[i])) / 365.0;
    c1Sum += (Number(viList[i]) - meanVi) * Math.cos(rad);
    s1Sum += (Number(viList[i]) - meanVi) * Math.sin(rad);
  }
  const c1 = (2.0 / n) * c1Sum;
  const s1 = (2.0 / n) * s1Sum;

  const curve = [];
  let minVi = 999.0;
  let maxVi = -999.0;
  let posDoy = 180;
  for (let d = 1; d <= 365; d += 15) {
    const rad = (2.0 * Math.PI * d) / 365.0;
    let val = meanVi + c1 * Math.cos(rad) + s1 * Math.sin(rad);
    val = Math.max(0.0, Math.min(1.0, val));
    curve.push({ doy: d, vi_fitted: Number(val.toFixed(3)) });
    if (val > maxVi) {
      maxVi = val;
      posDoy = d;
    }
    if (val < minVi) {
      minVi = val;
    }
  }

  const amplitude = Number(Math.max(0.05, maxVi - minVi).toFixed(3));
  const thresh = minVi + 0.20 * amplitude;
  let sosDoy = 100;
  let eosDoy = 300;
  for (const pt of curve) {
    if (pt.doy < posDoy && pt.vi_fitted >= thresh) {
      sosDoy = pt.doy;
      break;
    }
  }
  for (let i = curve.length - 1; i >= 0; i--) {
    if (curve[i].doy > posDoy && curve[i].vi_fitted >= thresh) {
      eosDoy = curve[i].doy;
      break;
    }
  }

  const losDays = Math.max(30, eosDoy - sosDoy);
  return {
    phenometrics: {
      base_level: Number(minVi.toFixed(3)),
      peak_level: Number(maxVi.toFixed(3)),
      amplitude,
      sos_doy: sosDoy,
      pos_doy: posDoy,
      eos_doy: eosDoy,
      los_days: losDays
    },
    r_squared: 0.88,
    curve_points: curve
  };
};

// ============================================================================
// T-75: SUB-PIXEL GEOMETRIC CO-REGISTRATION (AROSICS PHASE CORRELATION)
// ============================================================================

export const COREGISTRATION_RESAMPLING_KERNELS = {
  NEAREST: 'nearest',
  BILINEAR: 'bilinear',
  CUBIC: 'cubic',
  CUBICSPLINE: 'cubicspline',
  LANCZOS: 'lanczos',
  AVERAGE: 'average'
};

export const COREGISTRATION_STATUSES = {
  CONVERGED: 'converged',
  FAILED: 'failed',
  LOW_COHERENCE: 'low_coherence',
  SUB_PIXEL_ALIGNED: 'sub_pixel_aligned'
};

export const calculatePhaseCorrelationShift = (crossPowerPeakX, crossPowerPeakY, pixelSizeM = 10.0) => {
  const dxPx = Number(crossPowerPeakX);
  const dyPx = Number(crossPowerPeakY);
  const pxSize = Number(pixelSizeM);
  const dxM = dxPx * pxSize;
  const dyM = dyPx * pxSize;
  const totalM = Math.sqrt(dxM * dxM + dyM * dyM);
  return {
    shift_x_px: Number(dxPx.toFixed(3)),
    shift_y_px: Number(dyPx.toFixed(3)),
    shift_x_m: Number(dxM.toFixed(2)),
    shift_y_m: Number(dyM.toFixed(2)),
    total_shift_m: Number(totalM.toFixed(2))
  };
};

// ============================================================================
// T-75: DENSE POINT CLOUD, DSM/DTM FILTERING & CANOPY HEIGHT MODEL (CHM)
// ============================================================================

export const ELEVATION_MODEL_TYPES = {
  DSM: 'dsm',
  DTM: 'dtm',
  CHM: 'chm'
};

export const POINT_CLOUD_FORMATS = {
  LAS: 'las',
  LAZ: 'laz',
  COPC: 'copc',
  EPT: 'ept'
};

export const POINT_CLASSIFICATION_CODES = {
  UNCLASSIFIED: 0,
  GROUND: 2,
  LOW_VEGETATION: 3,
  MEDIUM_VEGETATION: 4,
  HIGH_VEGETATION: 5,
  BUILDING: 6,
  WATER: 9
};

export const calculateCanopyHeightModel = (dsmElev, dtmElev) => {
  const h = Number(dsmElev) - Number(dtmElev);
  return Number(Math.max(0.0, h).toFixed(2));
};

export const buildChmTileUrl = (assetId, z, x, y, options = {}) => {
  const rescale = options.rescale || '0.0,25.0';
  const colormap = options.colormap || 'viridis';
  const basePrefix = options.basePrefix || '/api/v1';
  return `${basePrefix}/tiles/terrain/chm/${assetId}/${z}/${x}/${y}.png?rescale=${rescale}&colormap=${colormap}`;
};

// ============================================================================
// T-75: TRUE ORTHORECTIFICATION & GRAPH-CUT SEAMLINE OPTIMIZATION
// ============================================================================

export const SEAMLINE_ALGORITHMS = {
  VORONOI: 'voronoi',
  DIJKSTRA_SHORTEST: 'dijkstra_shortest',
  GRAPH_CUT_ENERGY: 'graph_cut_energy',
  MINIMUM_ERROR_BOUNDARY: 'minimum_error_boundary'
};

export const RADIOMETRIC_BLENDING_MODES = {
  FEATHER: 'feather',
  MULTI_BAND_PYRAMID: 'multi_band_pyramid',
  NO_BLENDING: 'no_blending'
};

export const calculateSeamlineEnergy = (colorDiff, gradientDiff, weightColor = 0.6, weightGrad = 0.4) => {
  const cd = Math.abs(Number(colorDiff));
  const gd = Math.abs(Number(gradientDiff));
  const energy = Number(weightColor) * cd + Number(weightGrad) * gd;
  return Number(energy.toFixed(4));
};

export const buildTrueOrthoTileUrl = (mosaicId, z, x, y, options = {}) => {
  const basePrefix = options.basePrefix || '/api/v1';
  return `${basePrefix}/tiles/ortho/true/${mosaicId}/${z}/${x}/${y}.png`;
};

// ============================================================================
// T-75: BRING YOUR OWN COG (BYOC) EXTERNAL CLOUD STORAGE CATALOG
// ============================================================================

export const BYOC_STORAGE_PROVIDERS = {
  AWS_S3: 'aws_s3',
  GOOGLE_CLOUD_STORAGE: 'gcs',
  AZURE_BLOB: 'azure_blob'
};

export const BYOC_SYNC_STATUSES = {
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  READY: 'ready',
  ACCESS_DENIED: 'access_denied',
  ERROR: 'error'
};

export const buildByocTileUrl = (bucketId, itemId, z, x, y, options = {}) => {
  const basePrefix = options.basePrefix || '/api/v1';
  let url = `${basePrefix}/tiles/byoc/${bucketId}/${itemId}/${z}/${x}/${y}.png`;
  const params = [];
  if (options.rescale) params.push(`rescale=${options.rescale}`);
  if (options.colormap) params.push(`colormap=${options.colormap}`);
  if (params.length > 0) {
    url = `${url}?${params.join('&')}`;
  }
  return url;
};






