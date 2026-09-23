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
  ANALYSIS_ANIMATION_SEQUENCE: '/api/v1/analysis/animation-sequence'
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


