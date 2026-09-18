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
    unit: 'dimensionless',
    description: 'Sensitive to water content in vegetation canopy and soil moisture along embankment toes.'
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
    unit: 'dimensionless',
    description: 'Evaluates live green plant biomass, chlorophyll density, and vegetative vigor.'
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
    unit: 'dimensionless',
    description: 'Suppresses built-up urban features while amplifying open water bodies and flood inundation.'
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
    unit: 'dimensionless',
    description: 'Quantifies chlorophyll-a concentration and microcystin bloom risk in inland reservoirs.'
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
    unit: 'dimensionless',
    description: 'Highlights burned areas and high-heat signatures by contrasting NIR and SWIR2 reflectance.'
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
    unit: 'dimensionless',
    description: 'Atmospherically corrected vegetation index that resists saturation in high-biomass regions.'
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
    unit: 'dimensionless',
    description: 'Incorporates a soil brightness correction factor (L=0.5) for arid soils and embankments.'
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
    unit: '°C',
    description: 'Calibrated radiometric surface skin temperature in degrees Celsius from thermal infrared.'
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
    unit: 'reflectance',
    description: 'Calibrated surface reflectance composite simulating natural human eye perception.'
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
    unit: 'dimensionless',
    description: 'Differenced NBR assessing fire severity and biomass loss between pre- and post-fire scenes.'
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
    unit: 'dimensionless',
    description: 'Relative differenced NBR normalized by pre-fire canopy density for steep terrain assessment.'
  }
];

/**
 * Colormaps supported by the dynamic XYZ raster tile renderer.
 */
export const COLORMAPS = [
  { key: 'spectral', label: 'Spectral (Moisture & Hazard Detection)' },
  { key: 'viridis', label: 'Viridis (Vegetation & Biophysical Health)' },
  { key: 'turbo', label: 'Turbo (Thermal & High-Contrast Severity)' },
  { key: 'rdylbu', label: 'Red-Yellow-Blue (Diverging Water & Drought)' },
  { key: 'terrain', label: 'Terrain (Topography & Physical Elevation)' },
  { key: 'magma', label: 'Magma (Thermal Infrared & Radiation)' },
  { key: 'inferno', label: 'Inferno (High Radiance / Active Fire)' },
  { key: 'cividis', label: 'Cividis (Colorblind Accessible)' }
];

/**
 * Remote Sensing & Aerial Imagery Collections.
 */
export const SATELLITE_COLLECTIONS = [
  {
    id: 'sentinel-2-l2a',
    label: 'Sentinel-2 MSI Level-2A (ESA / 10m-20m)',
    description: 'Multi-spectral surface reflectance with 5-day revisit cycle.'
  },
  {
    id: 'landsat-c2-l2',
    label: 'Landsat 8/9 Collection 2 Level-2 (USGS / 30m)',
    description: 'Multi-spectral and thermal infrared surface temperature.'
  },
  {
    id: 'drone-ortho',
    label: 'High-Resolution UAS Orthomosaic (<3cm GSD)',
    description: 'Centimeter-scale drone survey photogrammetry Cloud-Optimized GeoTIFF.'
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
  if (dnbr === null || dnbr === undefined || isNaN(dnbr)) {
    return FIREMON_SEVERITY_LEVELS[FIREMON_SEVERITY_LEVELS.length - 1];
  }
  for (const level of FIREMON_SEVERITY_LEVELS) {
    if (dnbr >= level.minDnbr) {
      return level;
    }
  }
  return FIREMON_SEVERITY_LEVELS[FIREMON_SEVERITY_LEVELS.length - 1];
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
  FAILED: 'FAILED'
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
