import axios from 'axios';
import {
  mockEvents,
  mockInfrastructure,
  mockDroneMissions,
  mockTimeseries,
  mockUSGS,
  mockAgentChat,
  mockBurnSeverity,
  mockPixelProbe,
  mockZonalStats,
  mockDroneOrthomosaic
} from './mockData.js';

export {
  SPECTRAL_INDICES,
  COLORMAPS,
  SATELLITE_COLLECTIONS,
  FIREMON_SEVERITY_LEVELS,
  DEFAULT_MAP_CONFIG
} from '../config/constants.js';

/**
 * ============================================================================
 * JSDOC / TYPESCRIPT TYPE DEFINITIONS (API CONTRACTS & SCHEMAS)
 * ============================================================================
 */

/**
 * @typedef {'ndvi' | 'ndmi' | 'ndci' | 'mndwi' | 'lst' | 'nbr' | 'evi' | 'savi' | 'rgb' | 'dnbr' | 'rdnbr'} SpectralIndex
 */

/**
 * @typedef {'spectral' | 'viridis' | 'turbo' | 'rdylbu' | 'terrain' | 'magma' | 'inferno' | 'cividis'} TileColormap
 */

/**
 * @typedef {'sentinel-2-l2a' | 'landsat-c2-l2' | 'drone-ortho' | 'drone' | 'wildfire'} SatelliteCollection
 */

/**
 * @typedef {'critical' | 'warning' | 'moderate' | 'low'} HazardSeverity
 */

/**
 * @typedef {'seepage' | 'inundation' | 'hab' | 'drought' | 'wildfire'} HazardCategory
 */

/**
 * @typedef {Object} DynamicTileOptions
 * @property {SpectralIndex} [index='rgb'] - Target spectral index
 * @property {string} [rescale] - Rescale range min,max (e.g. "-0.2,0.6" or "2,98")
 * @property {TileColormap} [colormap='spectral'] - Paletted colormap name
 */

/**
 * @typedef {Object} BurnSeverityRequest
 * @property {string} [aoi_id='AOI-DEFAULT'] - Area of Interest ID
 * @property {Object} [geometry] - GeoJSON Polygon geometry
 * @property {string} [pre_event_date] - Pre-fire baseline date (YYYY-MM-DD), auto-harvested if omitted
 * @property {string} post_event_date - Post-fire assessment date (YYYY-MM-DD)
 * @property {[number, number, number, number]} [bbox] - Optional bounding box [min_lon, min_lat, max_lon, max_lat]
 * @property {number[]} [nbr_values] - Optional raw/simulated NBR array
 */

/**
 * @typedef {Object} BurnSeverityCategoryDetail
 * @property {string} category - Severity classification label
 * @property {number} min_dnbr - Minimum delta-NBR cutoff
 * @property {number} percentage - Percentage of total affected area
 * @property {number} hectares - Surface area in hectares
 */

/**
 * @typedef {Object} BurnSeverityResponse
 * @property {string} aoi_id - Area of interest identifier
 * @property {string|null} pre_event_date - Pre-fire scene date
 * @property {string} post_event_date - Post-fire scene date
 * @property {number} mean_dnbr - Mean delta-NBR value across AOI
 * @property {number} mean_rdnbr - Mean relative delta-NBR value across AOI
 * @property {number} burned_area_hectares - Total burned hectares (>= Low Severity)
 * @property {BurnSeverityCategoryDetail[]} categories - USGS FIREMON severity breakdown
 * @property {string} tile_url_template - XYZ tile endpoint template for visual overlay
 * @property {number} [mean_nbr] - Legacy single-scene mean NBR
 * @property {string} [timestamp] - Evaluation timestamp
 */

/**
 * @typedef {Object} PixelProbeResponse
 * @property {{latitude: number, longitude: number}} coordinates - Point coordinates
 * @property {string} acquisition_date - ISO 8601 acquisition timestamp
 * @property {Object.<string, number>} surface_reflectance - Calibrated BOA reflectance per band
 * @property {Object.<string, number>} indices - Computed spectral indices at pixel
 * @property {Object.<string, any>} climatological_context - Baseline median, seasonal z-score, anomaly flag
 */

/**
 * @typedef {Object} ZonalStatsRealRequest
 * @property {Object} geometry - GeoJSON Polygon geometry
 * @property {string} collection - Satellite collection identifier (sentinel-2-l2a, landsat-c2-l2)
 * @property {string} item_id - STAC Item ID
 * @property {SpectralIndex} index - Target spectral index (ndmi, ndvi, etc.)
 */

/**
 * @typedef {Object} ZonalDistributionStats
 * @property {number} mean - Arithmetic mean
 * @property {number} median - 50th percentile
 * @property {number} std_dev - Standard deviation
 * @property {number} min - Minimum value
 * @property {number} max - Maximum value
 * @property {number} percentile_10 - 10th percentile
 * @property {number} percentile_90 - 90th percentile
 */

/**
 * @typedef {Object} ZonalHistogram
 * @property {number[]} bin_edges - Histogram bin division values
 * @property {number[]} counts - Frequency counts per bin
 */

/**
 * @typedef {Object} ZonalStatsRealResponse
 * @property {string} index - Spectral index name
 * @property {number} area_hectares - Measured polygon area in hectares
 * @property {number} valid_pixels - Count of valid pixels evaluated
 * @property {number} cloud_covered_pixels - Count of masked cloud/shadow pixels
 * @property {ZonalDistributionStats} statistics - Parametric and non-parametric stats
 * @property {ZonalHistogram} histogram - Binned distribution histogram
 */

/**
 * @typedef {Object} DroneOrthomosaicMetadata
 * @property {string} ortho_id - Unique drone orthomosaic ID
 * @property {string} filename - Stored GeoTIFF filename
 * @property {string} crs - Coordinate Reference System (e.g. EPSG:3857)
 * @property {[number, number, number, number]} bounds - [min_lon, min_lat, max_lon, max_lat]
 * @property {number} metric_gsd_cm - Ground sample distance in centimeters
 * @property {number} bands - Number of raster bands
 * @property {boolean} is_cog - Whether file is Cloud-Optimized GeoTIFF
 * @property {string} status - Ingestion and tiling status (READY, PROCESSING, FAILED)
 * @property {string} [upload_timestamp] - Upload timestamp
 */

/**
 * @typedef {Object} TimeSeriesPoint
 * @property {string} date - Acquisition date YYYY-MM-DD
 * @property {number} value - Measured index value
 * @property {number} baseline_median - Monthly climatological median
 * @property {number} [baseline_mad] - Median Absolute Deviation
 * @property {number} [percentile_10] - 10th percentile bound
 * @property {number} [percentile_90] - 90th percentile bound
 * @property {number} z_score - Seasonally normalized z-score
 * @property {boolean} is_anomaly - Anomaly flag
 */

/**
 * @typedef {Object} TimeSeriesResponse
 * @property {string} index - Analyzed spectral index
 * @property {number} slope_per_month - Slope per month
 * @property {number} [theil_sen_slope] - Theil-Sen robust slope
 * @property {number} [mann_kendall_p_value] - Mann-Kendall p-value
 * @property {number} anomaly_count - Count of detected anomalies
 * @property {TimeSeriesPoint[]} data_points - Data point list
 */

/**
 * @typedef {Object} USGSStationData
 * @property {string} site_id - USGS Station Identifier
 * @property {number|null} [discharge_cfs] - Discharge in cfs
 * @property {number|null} [gage_height_ft] - Gage height in ft
 * @property {number|null} [water_temp_c] - Water temp in °C
 */

/**
 * @typedef {Object} GEEImageResponse
 * @property {string} provider - Provider ("GEE")
 * @property {string} collection - Earth Engine collection ID
 * @property {{start: string, end: string}} time_range - Start and end dates
 * @property {[number, number, number, number]} bbox - [west, south, east, north]
 * @property {string} preview_url - Preview URL
 */

/**
 * @typedef {Object} SentinelHubTileResponse
 * @property {string} provider - Provider ("SentinelHub")
 * @property {string} collection - Sentinel Hub collection ID
 * @property {string} date - Date string
 * @property {[number, number, number, number]} bbox - [west, south, east, north]
 * @property {string} tile_url - OGC WMTS tile URL
 */

/**
 * @typedef {Object} SpatialBufferRequest
 * @property {number} [distance_km=2.0] - Buffer distance in km
 * @property {Object} [geometry] - GeoJSON Point or Polygon
 * @property {number} [lat] - Center latitude
 * @property {number} [lng] - Center longitude
 */

/**
 * @typedef {Object} SpatialBufferResponse
 * @property {string} status - Response status ("success")
 * @property {string} operation - Operation name
 * @property {number} buffer_radius_km - Radius in km
 * @property {number} area_sq_km - Buffer area in sq km
 * @property {number} area_hectares - Buffer area in hectares
 * @property {Object} geojson - GeoJSON FeatureCollection
 */

/**
 * @typedef {Object} AlertRecord
 * @property {string} id - Unique alert identifier
 * @property {string} site_id - Monitored site / asset ID
 * @property {string} site_name - Human-readable asset name
 * @property {string} metric - Trigger metric (e.g. NDMI, discharge_cfs)
 * @property {string} severity - Severity level (critical, warning, info)
 * @property {number} z_score - Detected anomaly z-score
 * @property {string} message - Emergency notification or briefing message
 * @property {string} timestamp - Trigger timestamp (ISO 8601)
 * @property {string} [status='active'] - Alert lifecycle state
 */

/**
 * @typedef {Object} HazardEvent
 * @property {string} id - Unique event identifier
 * @property {string} title - Human-readable event title
 * @property {string} subtitle - Event subtitle or location description
 * @property {HazardCategory} category - Hazard category
 * @property {HazardSeverity} severity - Operational severity tier
 * @property {string} severity_label - Formatted label (e.g. "CRITICAL")
 * @property {number} lat - Latitude coordinate
 * @property {number} lng - Longitude coordinate
 * @property {number} [zoom=13] - Default focus zoom level
 * @property {SpectralIndex} metric - Primary biophysical indicator
 * @property {SatelliteCollection} sensor - Primary EO sensor
 * @property {string} start_date - Incident start date (YYYY-MM-DD)
 * @property {string} end_date - Incident end date (YYYY-MM-DD)
 * @property {string} [usgs_station] - Associated USGS streamgage station
 * @property {string} impact_area - Impacted surface area description
 * @property {string} peak_zscore - Peak anomaly z-score
 * @property {string} hazard_type - Hazard type classification
 * @property {string} drone_status - UAS mission status
 * @property {string} description - Detailed situational description
 */

/**
 * @typedef {Object} AgentChatMessage
 * @property {'user' | 'assistant' | 'system'} role - Message author role
 * @property {string} content - Message textual content
 */

/**
 * @typedef {Object} AgentToolAction
 * @property {string} tool - Tool or action name invoked
 * @property {Object.<string, any>} args - Tool invocation arguments
 * @property {Object.<string, any>} output - Tool execution results
 */

/**
 * @typedef {Object} MapAction
 * @property {'MARK' | 'FLY_TO' | 'CLEAR_MARKS'} action - Map interaction action
 * @property {number} lat - Target latitude
 * @property {number} lng - Target longitude
 * @property {number} [zoom=14] - Viewport zoom level
 * @property {string} label - Marker label or callout
 * @property {string} [event_id] - Associated hazard event ID
 * @property {string} [color='#00ffaa'] - Hex color for pin or highlight
 */

/**
 * @typedef {Object} NavigationAction
 * @property {'/map' | '/dashboard' | '/analytics' | '/methodology'} target_path - Target view route
 * @property {string} reason - Rationalization for view switch
 * @property {boolean} [auto_switch=true] - Whether client should automatically route
 */

/**
 * @typedef {Object} AgentChatResponse
 * @property {string} response - JARVIS assistant textual response
 * @property {AgentToolAction[]} [tool_calls] - Tool invocations executed
 * @property {MapAction|null} [map_action] - Map camera navigation or pinning action
 * @property {NavigationAction|null} [navigation] - Tab routing action
 * @property {string[]} [memory_updates] - Learned contextual facts
 * @property {string[]} [suggested_prompts] - Follow-up suggested prompt chips
 * @property {Array.<Object>} [sources] - Knowledge sources consulted
 * @property {Object} [data_analysis] - Structured analytic data
 * @property {string} [thinking] - Internal chain-of-thought
 */

const isDemo = import.meta?.env?.VITE_DEMO_MODE === 'true';

const demoAdapter = async (config) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let data = {};
      const url = config.url || '';
      if (url.includes('/api/v1/events')) data = mockEvents;
      else if (url.includes('/api/v1/spatial/layers')) data = mockInfrastructure;
      else if (url.includes('/api/v1/spatial/buffer')) data = { status: 'success', operation: 'spatial_buffer', buffer_radius_km: 2.0, area_sq_km: 12.57, area_hectares: 1256.64, geojson: { type: 'FeatureCollection', features: [] } };
      else if (url.includes('/api/v1/drone/missions')) data = mockDroneMissions;
      else if (url.includes('/api/v1/drone/upload') || url.includes('/api/v1/drone/register') || url.includes('/api/v1/drone/ortho')) data = mockDroneOrthomosaic;
      else if (url.includes('/api/v1/wildfire/burn-severity')) data = mockBurnSeverity;
      else if (url.includes('/api/v1/analysis/pixel-probe')) data = mockPixelProbe;
      else if (url.includes('/api/v1/analysis/zonal-stats')) data = mockZonalStats;
      else if (url.includes('/api/v1/timeseries/trend')) data = mockTimeseries;
      else if (url.includes('/api/v1/integration/usgs')) data = mockUSGS;
      else if (url.includes('/api/v1/satellite/gee')) data = { provider: 'GEE', collection: 'COPERNICUS/S2_SR', time_range: { start: '2023-01-01', end: '2023-01-31' }, bbox: [-121.2, 36.95, -120.95, 37.15], preview_url: 'https://earthengine.googleapis.com/preview' };
      else if (url.includes('/api/v1/satellite/sentinel')) data = { provider: 'SentinelHub', collection: 'sentinel-2-l2a', date: '2023-01-15', bbox: [-121.2, 36.95, -120.95, 37.15], tile_url: 'https://services.sentinel-hub.com/ogc/wmts/mock' };
      else if (url.includes('/api/v1/agent/chat')) data = mockAgentChat;
      else if (url.includes('/api/v1/reports/pdf')) data = new Blob(['mock pdf content']);
      else if (url.includes('/health')) data = { status: 'healthy', version: '2.5.0', active_services: ['tiles', 'stac', 'drone'] };
      
      resolve({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {}
      });
    }, 300);
  });
};

export const giosApi = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  ...(isDemo && { adapter: demoAdapter })
});

giosApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('gios_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ============================================================================
 * HELPER API FUNCTIONS (EXPORTS)
 * ============================================================================
 */

/**
 * Constructs a dynamic XYZ tile URL for satellite or drone imagery streaming.
 * Compatible with Leaflet TileLayer URL template `{z}/{x}/{y}` or concrete coordinates.
 * 
 * @param {SatelliteCollection|string} collection - 'sentinel-2-l2a' | 'landsat-c2-l2' | 'drone-ortho' | 'wildfire'
 * @param {string} itemId - STAC Item ID or registered Drone Ortho ID
 * @param {number|string} z - Zoom level (or '{z}' for Leaflet)
 * @param {number|string} x - Tile X coordinate (or '{x}')
 * @param {number|string} y - Tile Y coordinate (or '{y}')
 * @param {DynamicTileOptions} [options={}] - Query options (index, rescale, colormap)
 * @returns {string} Fully qualified XYZ tile URL
 */
export const getTileUrl = (collection, itemId, z, x, y, options = {}) => {
  const params = new URLSearchParams();
  if (options.index) params.set('index', options.index);
  if (options.rescale) params.set('rescale', options.rescale);
  if (options.colormap) params.set('colormap', options.colormap);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${base}/api/v1/tiles/${collection}/${itemId}/${z}/${x}/${y}.png${queryStr}`;
};

/**
 * Constructs an XYZ tile URL for a registered drone orthomosaic.
 * 
 * @param {string} orthoId - Registered drone orthomosaic ID
 * @param {number|string} z - Zoom level (or '{z}')
 * @param {number|string} x - Tile X coordinate (or '{x}')
 * @param {number|string} y - Tile Y coordinate (or '{y}')
 * @param {DynamicTileOptions} [options={}] - Additional options (e.g. rescale, colormap)
 * @returns {string} Fully qualified drone tile URL
 */
export const getDroneTileUrl = (orthoId, z, x, y, options = {}) => {
  return getTileUrl('drone-ortho', orthoId, z, x, y, { index: 'rgb', ...options });
};

/**
 * Constructs an XYZ tile URL for USGS FIREMON differenced burn severity overlay.
 * 
 * @param {number|string} z - Zoom level (or '{z}')
 * @param {number|string} x - Tile X coordinate (or '{x}')
 * @param {number|string} y - Tile Y coordinate (or '{y}')
 * @param {string} preDate - Pre-fire baseline date (YYYY-MM-DD)
 * @param {string} postDate - Post-fire date (YYYY-MM-DD)
 * @param {DynamicTileOptions} [options={}] - Additional options
 * @returns {string} Fully qualified differenced NBR tile URL
 */
export const getWildfireDnbrTileUrl = (z, x, y, preDate, postDate, options = {}) => {
  const params = new URLSearchParams();
  if (preDate) params.set('pre', preDate);
  if (postDate) params.set('post', postDate);
  if (options.colormap) params.set('colormap', options.colormap || 'turbo');
  if (options.rescale) params.set('rescale', options.rescale || '-0.2,0.8');
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${base}/api/v1/tiles/wildfire/dnbr/${z}/${x}/${y}.png${queryStr}`;
};

/**
 * Executes USGS FIREMON two-scene differenced burn severity calculation (ΔNBR / RdNBR).
 * 
 * @param {BurnSeverityRequest} params - AOI ID, GeoJSON geometry, post_event_date, and optional pre_event_date
 * @returns {Promise<BurnSeverityResponse>} Burn severity statistics, categorized breakdown, and tile URL template
 */
export const calculateBurnSeverity = async (params) => {
  const response = await giosApi.post('/api/v1/wildfire/burn-severity', params);
  return response.data;
};

/**
 * Interactively probes a single point location for calibrated BOA surface reflectance and biophysical indices.
 * 
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @param {SatelliteCollection|string} [collection='sentinel-2-l2a'] - Satellite collection
 * @param {string} itemId - STAC scene ID
 * @returns {Promise<PixelProbeResponse>} Point surface reflectance, indices, and climatological context
 */
export const probePixel = async (lat, lng, collection = 'sentinel-2-l2a', itemId) => {
  const response = await giosApi.get('/api/v1/analysis/pixel-probe', {
    params: { lat, lng, collection, item_id: itemId }
  });
  return response.data;
};

/**
 * Calculates zonal distribution statistics and binned histograms over a GeoJSON polygon.
 * 
 * @param {ZonalStatsRealRequest} params - Polygon geometry, collection, item ID, and spectral index
 * @returns {Promise<ZonalStatsRealResponse>} True area in hectares, pixel counts, distribution stats, and histogram
 */
export const calculateZonalStats = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/zonal-stats', params);
  return response.data;
};

/**
 * Registers / uploads a drone GeoTIFF/COG for cloud-native centimeter-scale dynamic tiling.
 * 
 * @param {FormData|Object} formData - Form data with raster file and mission metadata
 * @returns {Promise<DroneOrthomosaicMetadata>} Drone orthomosaic metadata including metric GSD and bounds
 */
export const registerDroneOrthomosaic = async (formData) => {
  const response = await giosApi.post('/api/v1/drone/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Fetches time-series trend analysis and climatological seasonal anomalies.
 * 
 * @param {Object} params - bbox, index, start_date, end_date, frequency
 * @returns {Promise<TimeSeriesResponse>} Trend slope, anomaly counts, and data points
 */
export const fetchTimeseriesTrend = async (params) => {
  const response = await giosApi.post('/api/v1/timeseries/trend', params);
  return response.data;
};

/**
 * Retrieves the catalog of active geotechnical and environmental hazard events.
 * 
 * @returns {Promise<Array>} List of hazard event objects
 */
export const fetchHazardEvents = async () => {
  const response = await giosApi.get('/api/v1/events');
  return response.data.events || [];
};

/**
 * Fetches single hazard event details by ID.
 * 
 * @param {string} eventId - Unique event identifier
 * @returns {Promise<Object>} Hazard event details
 */
export const fetchEventById = async (eventId) => {
  const response = await giosApi.get(`/api/v1/events/${eventId}`);
  return response.data;
};

/**
 * Retrieves critical infrastructure GIS vector layers.
 * 
 * @param {string} [layerType='critical_infrastructure'] - Layer category
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export const fetchInfrastructureLayers = async (layerType = 'critical_infrastructure') => {
  const response = await giosApi.get(`/api/v1/spatial/layers/${layerType}`);
  return response.data;
};

/**
 * Fetches active UAS drone missions.
 * 
 * @returns {Promise<Array>} List of active drone mission records
 */
export const fetchDroneMissions = async () => {
  const response = await giosApi.get('/api/v1/drone/missions');
  return response.data.missions || [];
};

/**
 * Dispatches a prompt to the JARVIS Agentic AI assistant.
 * 
 * @param {string} message - User query or intent
 * @param {Array} [history=[]] - Conversation history
 * @param {string|null} [eventId=null] - Optional context event ID
 * @returns {Promise<Object>} Agent response, map action, tab navigation, and memory updates
 */
export const postAgentChat = async (message, history = [], eventId = null) => {
  const response = await giosApi.post('/api/v1/agent/chat', {
    message,
    history,
    event_id: eventId
  });
  return response.data;
};

/**
 * Checks platform health and active microservice statuses.
 * 
 * @returns {Promise<Object>} Health check payload
 */
export const getHealthStatus = async () => {
  const response = await giosApi.get('/health');
  return response.data;
};

/**
 * Fetches in-situ streamflow and water quality telemetry from USGS Water Services.
 * 
 * @param {string} siteId - USGS station identifier (e.g. "11270900")
 * @returns {Promise<USGSStationData>} Telemetry record
 */
export const fetchUsgsStation = async (siteId) => {
  const response = await giosApi.get(`/api/v1/integration/usgs/${siteId}`);
  return response.data;
};

/**
 * Retrieves preview metadata for a Google Earth Engine image collection.
 * 
 * @param {string} collection - Earth Engine collection ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {[number, number, number, number]} bbox - [west, south, east, north]
 * @returns {Promise<GEEImageResponse>} GEE image preview metadata
 */
export const fetchGeeImage = async (collection, startDate, endDate, bbox) => {
  const response = await giosApi.get('/api/v1/satellite/gee', {
    params: { collection, start_date: startDate, end_date: endDate, bbox }
  });
  return response.data;
};

/**
 * Retrieves a Sentinel Hub OGC/WMTS tile URL.
 * 
 * @param {string} collection - Sentinel Hub collection ID
 * @param {string} date - Acquisition date (YYYY-MM-DD)
 * @param {[number, number, number, number]} bbox - [west, south, east, north]
 * @param {number} [zoom=12] - Zoom level
 * @returns {Promise<SentinelHubTileResponse>} Sentinel Hub tile URL and metadata
 */
export const fetchSentinelHubTile = async (collection, date, bbox, zoom = 12) => {
  const response = await giosApi.get('/api/v1/satellite/sentinel', {
    params: { collection, date, bbox, zoom }
  });
  return response.data;
};

/**
 * Computes a geodesic spatial buffer around a point or polygon.
 * 
 * @param {SpatialBufferRequest} params - Buffer parameters
 * @returns {Promise<SpatialBufferResponse>} GeoJSON FeatureCollection with buffered polygon and area metrics
 */
export const calculateSpatialBuffer = async (params) => {
  const response = await giosApi.post('/api/v1/spatial/buffer', params);
  return response.data;
};

export default giosApi;
