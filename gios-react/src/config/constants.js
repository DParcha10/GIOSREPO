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
