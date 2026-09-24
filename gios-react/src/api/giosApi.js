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
  COLLECTIONS,
  SPECTRAL_INDEX_KEYS,
  COLORMAP_KEYS,
  FIREMON_SEVERITY_LEVELS,
  classifyDnbr,
  getIndexMetadata,
  getColormapMetadata,
  getSatelliteCollectionMetadata,
  listSpectralIndices,
  listColormaps,
  listSatelliteCollections,
  parseRescale,
  validateSpectralIndex,
  validateColormap,
  formatApiRoute,
  DEFAULT_MAP_CONFIG,
  DEFAULT_MAP_VIEWPORT_CONFIG,
  HAZARD_CATEGORIES,
  HAZARD_SEVERITIES,
  ALERT_SEVERITIES,
  DRONE_STATUSES,
  PROACTIVE_ALERT_TYPES,
  API_ENDPOINTS,
  parseBbox,
  bboxToLeafletBounds,
  formatBbox,
  formatApiError,
  formatGsdDisplay,
  buildTileUrl,
  buildDroneTileUrl,
  buildWildfireTileUrl,
  CLIMATOLOGICAL_ANOMALY_LEVELS,
  classifyZScore,
  getAutoStretch,
  getColormapGradient,
  getColormapColorStops,
  latLonToTile,
  tileToBbox,
  tileToLeafletBounds,
  calculateMetricGsd,
  normalizeGeojsonPolygon,
  SPATIAL_LAYER_TYPES,
  SPATIAL_LAYERS,
  getSpatialLayerMetadata,
  listSpatialLayerTypes,
  BAND_SPECS,
  getBandSpec,
  listBandSpecs,
  getBandWavelength,
  SWIPE_COMPARISON_MODES,
  SWIPE_PRESET_RATIOS,
  getSwipePresetRatios,
  calculateHaversineDistance,
  calculateInitialBearing,
  calculatePolygonCentroid,
  bboxFromPoints,
  bboxExpand,
  generateTileCacheKey,
  bboxIntersects,
  bboxIntersection,
  bboxContains,
  bboxOverlapRatio,
  BAND_ALIAS_MAP,
  formatSpectralProfile,
  SPATIAL_LOD_TIERS,
  getSpatialLodTier,
  getCollectionRecommendedZoom,
  getColormapColorAtValue,
  hazardEventToGeoJsonFeature,
  hazardEventsToFeatureCollection,
  generateBoustrophedonWaypoints,
  TERRAIN_METRICS,
  SAR_POLARIZATIONS,
  TRANSECT_SAMPLE_METHODS,
  samplePolylineEquidistant,
  VOLUME_CALCULATION_MODES,
  calculateCutFillVolumes,
  EXPORT_RASTER_FORMATS,
  formatExportFilename,
  ANIMATION_PLAYBACK_MODES,
  buildAnimationKeyframes,
  COMPOSITE_REDUCERS,
  buildCompositeTileUrl,
  DEFECT_CATEGORIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  annotationToGeoJsonFeature,
  annotationsToFeatureCollection,
  SUBSCRIPTION_TRIGGER_TYPES,
  NOTIFICATION_CHANNELS,
  SEAMLINE_MODES,
  buildVrtTileUrl,
  CHANGE_DETECTION_METRICS,
  CHANGE_CATEGORIES,
  calculateChangeDetectionClasses,
  buildDifferenceTileUrl,
  GEOTECHNICAL_SENSOR_TYPES,
  SENSOR_READING_STATUSES,
  sensorToGeoJsonFeature,
  sensorsToFeatureCollection,
  calculateElevationStorageCapacity,
  calculateTilePyramidCoords,
  calculateTilePyramidCount
} from '../config/constants.js';

/**
 * ============================================================================
 * JSDOC / TYPESCRIPT TYPE DEFINITIONS (API CONTRACTS & SCHEMAS)
 * ============================================================================
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} min_lon - Westernmost longitude
 * @property {number} min_lat - Southernmost latitude
 * @property {number} max_lon - Easternmost longitude
 * @property {number} max_lat - Northernmost latitude
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {string} detail - Human-readable error message
 * @property {string|null} [error_code] - Machine-readable error code
 * @property {number} status_code - HTTP status code
 * @property {string} timestamp - ISO 8601 timestamp
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
 * @typedef {Object} SpectralIndexMetadata
 * @property {SpectralIndex} key - Spectral index key
 * @property {string} name - Short index code (e.g. 'NDMI')
 * @property {string} label - Full name
 * @property {string} domain - Biophysical application domain
 * @property {string} formula - Mathematical formula
 * @property {string[]} bands - Spectral bands utilized
 * @property {TileColormap|null} defaultColormap - Default colormap palette
 * @property {string} defaultRescale - Default rescale min,max
 * @property {[number, number]} [autoStretch] - 2%-98% cumulative auto stretch bounds [min, max]
 * @property {string} unit - Measurement unit
 * @property {string} description - Scientific and operational description
 * @property {boolean} [isDifferenced] - Multi-temporal differencing requirement
 * @property {boolean} [requiresThermal] - Thermal band requirement
 * @property {boolean} [requiresRedEdge] - Red-edge band requirement
 */

/**
 * @typedef {Object} ColormapMetadata
 * @property {TileColormap} key - Colormap palette key
 * @property {string} label - Display label
 * @property {string} [description] - Palette description
 * @property {string} [gradientCss] - Tailwind CSS gradient classes
 * @property {string[]} [colorStops] - Hex color stops defining the ramp
 */

/**
 * @typedef {Object} ClimatologicalAnomalyLevel
 * @property {string} level - Anomaly level key (e.g. CRITICAL_ANOMALY, WARNING_ANOMALY, NOMINAL)
 * @property {number} minZ - Minimum absolute z-score threshold
 * @property {string} severity - Operational severity (critical, warning, moderate, nominal)
 * @property {string} label - Human-readable label
 * @property {string} badgeClass - Tailwind CSS badge styling classes
 * @property {boolean} isAnomaly - Whether threshold constitutes actionable anomaly
 * @property {string} description - Scientific narrative
 */

/**
 * @typedef {Object} SatelliteCollectionMetadata
 * @property {SatelliteCollection} id - Collection identifier
 * @property {string} label - Descriptive collection name
 * @property {string} description - Sensor characteristics and ground resolution
 * @property {number} resolution_m - Spatial resolution in meters
 * @property {number|null} [revisit_days] - Typical temporal revisit period in days
 */

/**
 * @typedef {Object} DynamicTileOptions
 * @property {SpectralIndex} [index='rgb'] - Target spectral index
 * @property {string} [rescale] - Rescale range min,max (e.g. "-0.2,0.6" or "2,98")
 * @property {TileColormap} [colormap='spectral'] - Paletted colormap name
 * @property {string} [pre] - Pre-event baseline date (YYYY-MM-DD) for differenced burn severity tiles
 * @property {string} [post] - Post-event assessment date (YYYY-MM-DD) for differenced burn severity tiles
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
 * @typedef {Object} GeoJSONFeature
 * @property {'Feature'} type - GeoJSON object type
 * @property {Object.<string, any>} properties - Feature properties and metadata
 * @property {Object} geometry - GeoJSON geometry (Point, Polygon, etc.)
 */

/**
 * @typedef {Object} GeoJSONFeatureCollection
 * @property {'FeatureCollection'} type - FeatureCollection type
 * @property {GeoJSONFeature[]} features - Array of GeoJSON features
 */

/**
 * @typedef {GeoJSONFeatureCollection} VectorLayerResponse
 */

/**
 * @typedef {Object} SpatialBufferResponse
 * @property {string} status - Response status ("success")
 * @property {string} operation - Operation name
 * @property {number} buffer_radius_km - Radius in km
 * @property {number} area_sq_km - Buffer area in sq km
 * @property {number} area_hectares - Buffer area in hectares
 * @property {GeoJSONFeatureCollection} geojson - GeoJSON FeatureCollection
 */

/**
 * @typedef {'critical_infrastructure' | 'sensor_grid' | 'hazard_zones' | 'drone_flight_bounds'} SpatialLayerType
 */

/**
 * @typedef {Object} SpatialLayerMetadata
 * @property {SpatialLayerType} layerId - Unique vector layer type enum
 * @property {string} label - Human-readable layer display title
 * @property {string} description - Detailed content narrative
 * @property {string} icon - Lucide icon identifier for UI rendering
 * @property {string} color - Hex styling color
 * @property {boolean} defaultVisible - Whether layer is displayed on initial map load
 */

/**
 * @typedef {Object} BandSpecMetadata
 * @property {string} key - Canonical band identifier code (e.g. 'b02', 'b08', 'b10')
 * @property {string} name - Descriptive band name (e.g. 'Blue', 'NIR Broad', 'Thermal')
 * @property {number} centerWavelengthNm - Center spectral wavelength in nanometers
 * @property {number} bandwidthNm - Full width at half maximum (FWHM) in nanometers
 * @property {number} spatialResolutionM - Native ground sampling distance in meters
 * @property {string} spectrumDomain - Electromagnetic spectrum region
 * @property {string} commonName - STAC common band name
 */

/**
 * @typedef {'optical_vs_anomaly' | 'pre_vs_post' | 'satellite_vs_drone' | 'index_vs_index'} SwipeComparisonMode
 */

/**
 * @typedef {Object} SwipePaneLayer
 * @property {string} title - Display title for pane header
 * @property {SatelliteCollection} collection - Imagery collection
 * @property {string|null} [item_id] - Scene or orthomosaic ID
 * @property {string} date - Acquisition date (YYYY-MM-DD)
 * @property {string} [sensor='Sentinel-2 L2A'] - Sensor label
 * @property {SpectralIndex} [index='rgb'] - Spectral index
 * @property {TileColormap|null} [colormap] - Tile colormap
 */

/**
 * @typedef {Object} SwipeCurtainConfig
 * @property {SwipeComparisonMode} mode - Comparison mode
 * @property {number} slider_pos - Curtain split percentage [2.0, 98.0]
 * @property {SwipePaneLayer} left_layer - Baseline / pre-event layer
 * @property {SwipePaneLayer} right_layer - Anomaly / post-event layer
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
 * @typedef {'jarvis_proactive_alert' | 'satellite_anomaly_alert'} ProactiveAlertType
 */

/**
 * @typedef {Object} ProactiveJarvisAlert
 * @property {ProactiveAlertType} type - Alert event type
 * @property {string} message - Emergency briefing narrative
 * @property {string} site - Monitored site name
 * @property {Object.<string, any>} [data] - Associated sensor telemetry payload
 */

/**
 * @typedef {Object} SatelliteAnomalyAlert
 * @property {ProactiveAlertType} type - Alert event type
 * @property {AlertRecord} data - Detected anomaly record
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

/**
 * @typedef {Object} DroneRegisterRequest
 * @property {string} file_path - Local file path or cloud URI to drone GeoTIFF
 * @property {string} [mission_name='UAV Orthomosaic Survey'] - Mission identifier
 * @property {string} [sensor_payload='RGB + Multispectral'] - Sensor or camera payload description
 * @property {string} [ortho_id] - Optional unique orthomosaic ID
 */

/**
 * @typedef {Object} DroneScheduleMissionRequest
 * @property {string} [event_id='MANUAL'] - Associated hazard event ID
 * @property {number} [lat=0.0] - Target survey latitude
 * @property {number} [lng=0.0] - Target survey longitude
 * @property {number} [radius_km=1.0] - Coverage radius in kilometers
 */

/**
 * @typedef {Object} SensorData
 * @property {string} sensor_id - Unique sensor identifier
 * @property {number} location_lat - Sensor latitude coordinate
 * @property {number} location_lon - Sensor longitude coordinate
 * @property {number} soil_moisture_pct - Volumetric soil moisture percentage
 * @property {number} temperature_c - Soil / ambient temperature in °C
 * @property {string} [timestamp] - ISO 8601 measurement timestamp
 */

/**
 * @typedef {Object} UserLoginRequest
 * @property {string} username - User account username
 * @property {string} password - User account password
 */

/**
 * @typedef {Object} UserRegisterRequest
 * @property {string} username - Desired account username
 * @property {string} password - Account password
 * @property {'viewer' | 'admin' | string} [role='viewer'] - Assigned user role
 */

/**
 * @typedef {Object} TokenResponse
 * @property {string} access_token - JWT Bearer access token
 * @property {string} token_type - Token authorization scheme
 */

/**
 * @typedef {Object} UserResponse
 * @property {number} id - User database ID
 * @property {string} username - User login name
 * @property {string} role - Authorization role ('viewer' | 'admin')
 * @property {string} status - Authentication status ('authenticated')
 */

/**
 * @typedef {Object} UserRegisterResponse
 * @property {string} msg - Registration outcome message
 * @property {string} username - Created account username
 */

/**
 * @typedef {Object} SearchParams
 * @property {[number, number, number, number]} bbox - Bounding box [min_lon, min_lat, max_lon, max_lat]
 * @property {string} start_date - Start date (YYYY-MM-DD)
 * @property {string} end_date - End date (YYYY-MM-DD)
 * @property {SatelliteCollection} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {number} [max_cloud_cover=30.0] - Maximum cloud cover percentage (0-100)
 */

/**
 * @typedef {Object} SceneMetadata
 * @property {string} id - Scene identifier
 * @property {string} datetime - ISO 8601 acquisition timestamp
 * @property {number} cloud_cover - Cloud coverage percentage
 * @property {string} collection - Satellite collection
 * @property {string|null} [thumbnail_url] - Preview thumbnail URL
 */

/**
 * @typedef {Object} SearchResponse
 * @property {number} count - Total scenes found
 * @property {SceneMetadata[]} scenes - Matching STAC scenes
 */

/**
 * @typedef {Object} IndexRequest
 * @property {[number, number, number, number]} bbox - Bounding box [min_lon, min_lat, max_lon, max_lat]
 * @property {string} start_date - Start date (YYYY-MM-DD)
 * @property {string} end_date - End date (YYYY-MM-DD)
 * @property {SpectralIndex} [index='ndmi'] - Spectral index
 * @property {SatelliteCollection} [collection='sentinel-2-l2a'] - Collection
 * @property {number} [resolution=10.0] - Spatial resolution in meters
 */

/**
 * @typedef {Object} IndexResultSummary
 * @property {string} index - Evaluated index name
 * @property {number} mean - Arithmetic mean
 * @property {number} median - Median value
 * @property {number} min - Minimum value
 * @property {number} max - Maximum value
 * @property {number} std - Standard deviation
 * @property {number} valid_pixels - Valid pixel count
 * @property {string} timestamp - ISO 8601 evaluation timestamp
 */

/**
 * @typedef {Object} EventCreateRequest
 * @property {string} id - Unique event identifier
 * @property {string} title - Event title
 * @property {string} subtitle - Event subtitle
 * @property {HazardCategory} category - Hazard category
 * @property {HazardSeverity} severity - Severity level
 * @property {string} severity_label - Formatted label (e.g. "CRITICAL")
 * @property {number} lat - Latitude coordinate
 * @property {number} lng - Longitude coordinate
 * @property {number} [zoom=13] - Zoom level
 * @property {SpectralIndex} metric - Primary biophysical metric
 * @property {SatelliteCollection} [sensor='sentinel-2-l2a'] - Primary sensor
 * @property {string} start_date - Start date (YYYY-MM-DD)
 * @property {string} end_date - End date (YYYY-MM-DD)
 * @property {string} [usgs_station] - Associated USGS station
 * @property {string} impact_area - Impact area string
 * @property {string} peak_zscore - Peak anomaly z-score
 * @property {string} hazard_type - Hazard type
 * @property {string} drone_status - UAS status
 * @property {string} description - Event narrative
 */

/**
 * @typedef {Object} ReportPdfParams
 * @property {string} bbox - Bounding box formatted as "min_lon,min_lat,max_lon,max_lat"
 * @property {SpectralIndex|string} [index_type='ndmi'] - Spectral index for compliance report
 */

/**
 * @typedef {HazardEvent} HazardEventDetail
 */

/**
 * @typedef {Object} DroneUploadResponse
 * @property {string} status - Upload status ('success')
 * @property {DroneOrthomosaicMetadata} orthomosaic - Registered orthomosaic metadata
 */

/**
 * @typedef {Object} DroneMissionScheduleResponse
 * @property {string} status - Scheduling status ('success')
 * @property {Object} mission - Scheduled drone mission details
 */

/**
 * @typedef {Object} DroneMissionsListResponse
 * @property {Array.<Object>} missions - Active drone fleet missions
 */

/**
 * @typedef {Object} DroneOrthomosaicsListResponse
 * @property {DroneOrthomosaicMetadata[]} orthomosaics - Registered drone orthomosaics
 */

/**
 * @typedef {Object} SensorIngestResponse
 * @property {string} status - Ingestion status ('success')
 * @property {string} message - Telemetry processing message
 */

/**
 * @typedef {Object} MockAlertResponse
 * @property {string} status - Execution status ('success')
 * @property {string} message - Alert dispatch message
 */

/**
 * @typedef {Object} HealthResponse
 * @property {string} status - System health status
 * @property {string} [platform='GIOS'] - Platform name
 * @property {string} version - Semantic version
 * @property {string[]} [active_services] - Active services
 * @property {string[]} [active_modules] - Active processing modules
 */

/**
 * @typedef {Object} TransectPoint
 * @property {number} distance_m - Cumulative distance from start in meters
 * @property {number} lat - Latitude in WGS84
 * @property {number} lon - Longitude in WGS84
 * @property {number|null} [elevation_m] - Surface elevation in meters ASL
 * @property {number|null} [slope_deg] - Topographic slope in degrees
 * @property {number|null} [metric_value] - Biophysical or spectral index value
 */

/**
 * @typedef {Object} TransectProfileSummary
 * @property {number} total_distance_m - Total length in meters
 * @property {number|null} [min_elevation_m] - Minimum elevation in meters
 * @property {number|null} [max_elevation_m] - Maximum elevation in meters
 * @property {number|null} [elevation_gain_m] - Cumulative positive elevation gain
 * @property {number|null} [elevation_loss_m] - Cumulative negative elevation drop
 * @property {number|null} [mean_slope_deg] - Average slope in degrees
 * @property {number|null} [max_slope_deg] - Maximum slope in degrees
 * @property {number|null} [min_metric_value] - Minimum metric value
 * @property {number|null} [max_metric_value] - Maximum metric value
 */

/**
 * @typedef {Object} TransectAnalysisRequest
 * @property {Array<[number, number]>|Object} polyline - Sequence of coordinates or GeoJSON LineString
 * @property {string} [metric='elevation'] - Indicator metric (elevation, slope, ndmi, etc.)
 * @property {number} [sample_count=50] - Number of equidistant sample points
 * @property {string} [collection='cop-dem-glo-30'] - Elevation or sensor collection
 * @property {string|null} [item_id] - Optional scene or orthomosaic ID
 */

/**
 * @typedef {Object} TransectAnalysisResponse
 * @property {string} metric - Analyzed indicator metric
 * @property {number} total_distance_m - Total length in meters
 * @property {number} sample_count - Evaluation points count
 * @property {TransectProfileSummary} summary - Summary statistics
 * @property {TransectPoint[]} points - Sampled profile points
 */

/**
 * @typedef {Object} VolumetricAnalysisRequest
 * @property {string|number[]|Object} bbox - Target AOI bounds or GeoJSON geometry
 * @property {number} reference_elevation_m - Design datum elevation in meters
 * @property {'cut_fill'|'reservoir_storage'|'embankment_fill'} [mode='cut_fill'] - Operational calculation mode
 * @property {number} [grid_resolution_m=10.0] - Horizontal cell dimension in meters
 * @property {string} [collection='cop-dem-glo-30'] - Elevation collection
 */

/**
 * @typedef {Object} VolumetricAnalysisResponse
 * @property {string} mode - Calculation mode
 * @property {number} reference_elevation_m - Reference datum elevation
 * @property {number} surface_area_m2 - Footprint area in m2
 * @property {number} surface_area_hectares - Footprint area in hectares
 * @property {number} cut_volume_m3 - Excavation volume in m3
 * @property {number} fill_volume_m3 - Fill volume in m3
 * @property {number} net_volume_m3 - Net volume (cut - fill) in m3
 * @property {number} mean_elevation_m - Mean elevation in meters
 * @property {number} min_elevation_m - Minimum elevation in meters
 * @property {number} max_elevation_m - Maximum elevation in meters
 * @property {number} [mean_depth_m] - Average depth or height relative to datum
 * @property {number} [max_depth_m] - Maximum depth or height relative to datum
 */

/**
 * @typedef {Object} DataExportRequest
 * @property {string|number[]} bbox - Spatial bounds [min_lon, min_lat, max_lon, max_lat]
 * @property {string} [collection='sentinel-2-l2a'] - Imagery or elevation collection
 * @property {string|null} [item_id] - Specific observation ID
 * @property {string|null} [index] - Spectral index
 * @property {string|null} [metric] - Terrain metric
 * @property {'geotiff'|'cog'|'png_rgba'|'geojson_vector'|'csv_tabular'} [format='geotiff'] - Export file format
 * @property {string} [crs='EPSG:4326'] - Spatial reference system
 * @property {number|null} [resolution_m] - Target resolution in meters
 * @property {string|null} [rescale] - Rescale min,max
 * @property {string|null} [colormap] - Colormap palette
 */

/**
 * @typedef {Object} DataExportResponse
 * @property {string} export_id - Unique export identifier
 * @property {string} status - Processing status
 * @property {string} format - Output format
 * @property {string} download_url - Download URL
 * @property {string} filename - Output filename
 * @property {number|null} [file_size_bytes] - File size in bytes
 * @property {string} crs - Spatial reference system
 * @property {[number, number, number, number]} bbox - Bounding box
 * @property {string} created_at - ISO 8601 generation timestamp
 * @property {string} expires_at - ISO 8601 URL expiration timestamp
 */

/**
 * @typedef {Object} AnimationKeyframe
 * @property {number} frame_index - Sequence frame index
 * @property {string} timestamp - Acquisition date (YYYY-MM-DD)
 * @property {string} scene_id - Observation ID
 * @property {number} cloud_cover - Cloud coverage percentage
 * @property {string} tile_url - Rendered XYZ tile URL
 * @property {string} index - Spectral index
 * @property {string|null} [colormap] - Colormap palette
 */

/**
 * @typedef {Object} AnimationSequenceConfig
 * @property {string} collection - Satellite collection
 * @property {string} start_date - Start date (YYYY-MM-DD)
 * @property {string} end_date - End date (YYYY-MM-DD)
 * @property {number} [fps=2.0] - Playback frame rate
 * @property {'loop'|'ping_pong'|'step'} [playback_mode='loop'] - Playback mode
 * @property {AnimationKeyframe[]} [frames] - Animation keyframes
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
      else if (url.includes('/api/v1/drone/missions/schedule')) data = { status: 'success', mission: mockDroneMissions[0] };
      else if (url.includes('/api/v1/drone/missions')) data = mockDroneMissions;
      else if (url.includes('/api/v1/drone/orthomosaics')) data = { orthomosaics: [mockDroneOrthomosaic] };
      else if (url.includes('/api/v1/drone/upload') || url.includes('/api/v1/drone/register') || url.includes('/api/v1/drone/ortho')) data = mockDroneOrthomosaic;
      else if (url.includes('/api/v1/wildfire/burn-severity')) data = mockBurnSeverity;
      else if (url.includes('/api/v1/analysis/pixel-probe')) data = mockPixelProbe;
      else if (url.includes('/api/v1/analysis/zonal-stats')) data = mockZonalStats;
      else if (url.includes('/api/v1/timeseries/trend')) data = mockTimeseries;
      else if (url.includes('/api/v1/integration/usgs')) data = mockUSGS;
      else if (url.includes('/api/v1/satellite/gee')) data = { provider: 'GEE', collection: 'COPERNICUS/S2_SR', time_range: { start: '2023-01-01', end: '2023-01-31' }, bbox: [-121.2, 36.95, -120.95, 37.15], preview_url: 'https://earthengine.googleapis.com/preview' };
      else if (url.includes('/api/v1/satellite/sentinel')) data = { provider: 'SentinelHub', collection: 'sentinel-2-l2a', date: '2023-01-15', bbox: [-121.2, 36.95, -120.95, 37.15], tile_url: 'https://services.sentinel-hub.com/ogc/wmts/mock' };
      else if (url.includes('/api/v1/iot/ingest')) data = { status: 'success', message: 'Data ingested' };
      else if (url.includes('/api/v1/iot/data')) data = [{ sensor_id: 'SENS-01', location_lat: 37.058, location_lon: -121.074, soil_moisture_pct: 22.4, temperature_c: 24.1, timestamp: new Date().toISOString() }];
      else if (url.includes('/api/v1/auth/token')) data = { access_token: 'mock-jwt-token-gios', token_type: 'bearer' };
      else if (url.includes('/api/v1/auth/register')) data = { msg: 'User created successfully', username: 'demo_user' };
      else if (url.includes('/api/v1/auth/me')) data = { id: 1, username: 'admin', role: 'admin', status: 'authenticated' };
      else if (url.includes('/api/v1/agent/chat')) data = mockAgentChat;
      else if (url.includes('/api/v1/data/search')) data = { count: 1, scenes: [{ id: 'S2A_MSIL2A_20260820T184211', datetime: '2026-08-20T18:42:11Z', cloud_cover: 4.2, collection: 'sentinel-2-l2a', thumbnail_url: null }] };
      else if (url.includes('/api/v1/analysis/indices')) data = { index: 'ndmi', mean: 0.312, median: 0.298, min: 0.051, max: 0.684, std: 0.084, valid_pixels: 38420, timestamp: new Date().toISOString() };
      else if (url.includes('/api/v1/analysis/transect')) data = {
        metric: 'elevation',
        total_distance_m: 1250.0,
        sample_count: 50,
        summary: {
          total_distance_m: 1250.0,
          min_elevation_m: 145.2,
          max_elevation_m: 230.8,
          elevation_gain_m: 85.6,
          elevation_loss_m: 0.0,
          mean_slope_deg: 4.8,
          max_slope_deg: 14.2
        },
        points: []
      };
      else if (url.includes('/api/v1/analysis/volumetric')) data = {
        mode: 'cut_fill',
        reference_elevation_m: 200.0,
        surface_area_m2: 125000.0,
        surface_area_hectares: 12.5,
        cut_volume_m3: 45000.0,
        fill_volume_m3: 12000.0,
        net_volume_m3: 33000.0,
        mean_elevation_m: 204.5,
        min_elevation_m: 188.0,
        max_elevation_m: 235.0,
        mean_depth_m: 6.8,
        max_depth_m: 35.0
      };
      else if (url.includes('/api/v1/analysis/export')) data = {
        export_id: 'EXP-DEMO-01',
        status: 'ready',
        format: 'geotiff',
        download_url: 'http://localhost:8000/data/exports/gios_export_demo.tif',
        filename: 'gios_sentinel-2-l2a_demo.tif',
        file_size_bytes: 4194304,
        crs: 'EPSG:4326',
        bbox: [-121.2, 36.95, -120.95, 37.15],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      };
      else if (url.includes('/api/v1/analysis/animation-sequence')) data = {
        collection: 'sentinel-2-l2a',
        start_date: '2026-06-01',
        end_date: '2026-08-30',
        fps: 2.0,
        playback_mode: 'loop',
        frames: []
      };
      else if (url.includes('/api/v1/analysis/composite')) data = {
        composite_id: 'COMP-DEMO-01',
        status: 'ready',
        reducer: 'median',
        collection: 'sentinel-2-l2a',
        scene_count: 5,
        contributing_scenes: ['S2A_20260601', 'S2A_20260615', 'S2A_20260701', 'S2A_20260715', 'S2A_20260801'],
        bbox: [-121.2, 36.95, -120.95, 37.15],
        time_window: '2026-06-01 to 2026-08-30',
        tile_url_template: '/api/v1/tiles/composite/COMP-DEMO-01/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/annotations')) {
        data = [
          {
            annotation_id: 'ANN-SAN-LUIS-01',
            title: 'Downstream Embankment Toe Seepage Boil',
            category: 'seepage_boil',
            severity: 'critical',
            status: 'investigating',
            lat: 37.0582,
            lng: -121.0744,
            elevation_m: 154.2,
            asset_id: 'SAN-LUIS-DAM-01',
            drone_ortho_id: 'ORTHO-SLD-202609',
            photo_urls: ['/assets/inspection_toe_boil.jpg'],
            notes: 'High-turbidity sand boil detected 15m downstream of toe berm. Piezometer P-04 shows +1.8m pressure head surge.',
            inspector: 'Senior Geotechnical Engineer',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
      }
      else if (url.includes('/api/v1/work-orders')) {
        data = [
          {
            work_order_id: 'WO-2026-0042',
            annotation_id: 'ANN-SAN-LUIS-01',
            asset_id: 'SAN-LUIS-DAM-01',
            priority: 'critical',
            description: 'Deploy weighted gravel inverted filter ring around boil perimeter; monitor piezometric relief wells.',
            assigned_crew: 'Heavy Dam Safety Response Crew 2',
            target_completion_date: '2026-09-26',
            status: 'dispatched',
            estimated_hours: 18.0,
            created_at: new Date().toISOString()
          }
        ];
      }
      else if (url.includes('/api/v1/subscriptions')) {
        data = [
          {
            subscription_id: 'SUB-SLD-MOISTURE',
            name: 'San Luis Dam Toe Moisture Anomaly Watch',
            asset_id: 'SAN-LUIS-DAM-01',
            collection: 'sentinel-2-l2a',
            indices: ['ndmi', 'mndwi'],
            trigger_type: 'z_score_anomaly',
            z_score_threshold: 2.5,
            channels: ['webhook', 'in_app_alert'],
            webhook_url: 'https://emergency.ca.gov/webhooks/dams/san-luis',
            is_active: true,
            created_at: new Date(Date.now() - 604800000).toISOString(),
            last_checked_at: new Date().toISOString(),
            alerts_triggered_count: 2
          }
        ];
      }
      else if (url.includes('/api/v1/analysis/vrt')) data = {
        vrt_id: 'VRT-DEMO-MGRS-01',
        status: 'ready',
        source_scene_count: 2,
        source_scenes: ['S2A_10SEJ_20260820', 'S2A_10SEK_20260820'],
        seamline_mode: 'feather',
        bbox: [-121.5, 36.8, -120.8, 37.3],
        target_crs: 'EPSG:3857',
        tile_url_template: '/api/v1/tiles/vrt/VRT-DEMO-MGRS-01/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/change-detection')) data = {
        request_id: 'CHG-DEMO-01',
        collection: 'sentinel-2-l2a',
        pre_scene_id: 'S2A_MSIL2A_20260515',
        post_scene_id: 'S2A_MSIL2A_20260820',
        metric: 'ndmi_diff',
        mean_difference: 0.142,
        median_difference: 0.128,
        std_difference: 0.088,
        total_area_hectares: 245.8,
        area_increased_ha: 84.2,
        area_decreased_ha: 18.5,
        area_stable_ha: 143.1,
        categories: [
          { category: 'significant_increase', label: 'Significant Increase', min_change: 0.30, max_change: null, area_hectares: 32.4, percentage: 13.18, pixel_count: 3240 },
          { category: 'moderate_increase', label: 'Moderate Increase', min_change: 0.15, max_change: 0.30, area_hectares: 51.8, percentage: 21.07, pixel_count: 5180 },
          { category: 'stable', label: 'Stable / No Significant Change', min_change: -0.15, max_change: 0.15, area_hectares: 143.1, percentage: 58.22, pixel_count: 14310 },
          { category: 'moderate_decrease', label: 'Moderate Decrease', min_change: -0.30, max_change: -0.15, area_hectares: 12.5, percentage: 5.09, pixel_count: 1250 },
          { category: 'significant_decrease', label: 'Significant Decrease', min_change: null, max_change: -0.30, area_hectares: 6.0, percentage: 2.44, pixel_count: 600 }
        ],
        tile_url_template: '/api/v1/tiles/difference/sentinel-2-l2a/S2A_MSIL2A_20260515/S2A_MSIL2A_20260820/ndmi_diff/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/integration/geotechnical/summary')) data = {
        asset_id: 'SAN-LUIS-DAM-01',
        total_sensors: 12,
        sensors_normal: 10,
        sensors_advisory: 1,
        sensors_alert: 1,
        sensors_critical: 0,
        max_pore_pressure_kpa: 142.5,
        total_seepage_flow_lps: 4.82,
        phreatic_surface_warning: true,
        last_updated: new Date().toISOString()
      };
      else if (url.includes('/readings')) data = [
        { reading_id: 'RD-01', sensor_id: 'PZ-SL-101', timestamp: '2026-08-01T00:00:00Z', reading_value: 128.4, unit: 'kPa', status: 'normal', temperature_c: 18.2 },
        { reading_id: 'RD-02', sensor_id: 'PZ-SL-101', timestamp: '2026-08-05T00:00:00Z', reading_value: 131.2, unit: 'kPa', status: 'normal', temperature_c: 18.5 },
        { reading_id: 'RD-03', sensor_id: 'PZ-SL-101', timestamp: '2026-08-10T00:00:00Z', reading_value: 133.0, unit: 'kPa', status: 'normal', temperature_c: 19.1 },
        { reading_id: 'RD-04', sensor_id: 'PZ-SL-101', timestamp: '2026-08-15T00:00:00Z', reading_value: 136.8, unit: 'kPa', status: 'advisory', temperature_c: 19.4 },
        { reading_id: 'RD-05', sensor_id: 'PZ-SL-101', timestamp: '2026-08-20T00:00:00Z', reading_value: 140.5, unit: 'kPa', status: 'alert', temperature_c: 20.0 },
        { reading_id: 'RD-06', sensor_id: 'PZ-SL-101', timestamp: '2026-08-25T00:00:00Z', reading_value: 142.5, unit: 'kPa', status: 'alert', temperature_c: 20.2 }
      ];
      else if (url.includes('/api/v1/integration/geotechnical/sensors')) {
        if (config.method === 'post') {
          const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
          data = {
            sensor_id: body.sensor_id || `PZ-SL-${Date.now().toString().slice(-4)}`,
            name: body.name || 'New In-Situ Sensor',
            sensor_type: body.sensor_type || 'piezometer',
            asset_id: body.asset_id || 'SAN-LUIS-DAM-01',
            lat: Number(body.lat || 37.058),
            lng: Number(body.lng || -121.074),
            installation_elevation_m: Number(body.installation_elevation_m || 150.0),
            installation_depth_m: body.installation_depth_m ? Number(body.installation_depth_m) : null,
            unit: body.unit || 'kPa',
            current_value: Number(body.current_value || 120.0),
            alert_threshold_low: body.alert_threshold_low ? Number(body.alert_threshold_low) : null,
            alert_threshold_high: body.alert_threshold_high ? Number(body.alert_threshold_high) : null,
            critical_threshold_high: body.critical_threshold_high ? Number(body.critical_threshold_high) : null,
            status: body.status || 'normal',
            last_reading_time: new Date().toISOString()
          };
        } else {
          data = [
            {
              sensor_id: 'PZ-SL-101',
              name: 'Piezometer P-01 (Embankment Toe)',
              sensor_type: 'piezometer',
              asset_id: 'SAN-LUIS-DAM-01',
              lat: 37.0582,
              lng: -121.0744,
              installation_elevation_m: 154.2,
              installation_depth_m: 24.5,
              unit: 'kPa',
              current_value: 142.5,
              alert_threshold_low: 50.0,
              alert_threshold_high: 135.0,
              critical_threshold_high: 160.0,
              status: 'alert',
              last_reading_time: new Date().toISOString()
            },
            {
              sensor_id: 'SW-SL-01',
              name: 'Seepage Weir SW-01 (Left Toe Ditch)',
              sensor_type: 'seepage_weir',
              asset_id: 'SAN-LUIS-DAM-01',
              lat: 37.0575,
              lng: -121.0732,
              installation_elevation_m: 148.0,
              installation_depth_m: null,
              unit: 'L/s',
              current_value: 4.82,
              alert_threshold_low: 0.1,
              alert_threshold_high: 6.0,
              critical_threshold_high: 10.0,
              status: 'normal',
              last_reading_time: new Date().toISOString()
            },
            {
              sensor_id: 'IN-SL-03',
              name: 'Inclinometer I-03 (Downstream Slope)',
              sensor_type: 'inclinometer',
              asset_id: 'SAN-LUIS-DAM-01',
              lat: 37.0590,
              lng: -121.0760,
              installation_elevation_m: 162.0,
              installation_depth_m: 35.0,
              unit: 'mm',
              current_value: 3.12,
              alert_threshold_low: null,
              alert_threshold_high: 5.0,
              critical_threshold_high: 10.0,
              status: 'advisory',
              last_reading_time: new Date().toISOString()
            },
            {
              sensor_id: 'SG-SL-01',
              name: 'Stage Gauge SG-01 (Forebay Intake)',
              sensor_type: 'stage_gauge',
              asset_id: 'SAN-LUIS-DAM-01',
              lat: 37.0560,
              lng: -121.0715,
              installation_elevation_m: 165.5,
              installation_depth_m: null,
              unit: 'm',
              current_value: 152.4,
              alert_threshold_low: 125.0,
              alert_threshold_high: 164.0,
              critical_threshold_high: 165.0,
              status: 'normal',
              last_reading_time: new Date().toISOString()
            },
            {
              sensor_id: 'SP-SL-02',
              name: 'Settlement Plate SP-02 (Crest Station 24+00)',
              sensor_type: 'settlement_plate',
              asset_id: 'SAN-LUIS-DAM-01',
              lat: 37.0601,
              lng: -121.0782,
              installation_elevation_m: 167.8,
              installation_depth_m: 5.0,
              unit: 'mm',
              current_value: 12.8,
              alert_threshold_low: null,
              alert_threshold_high: 25.0,
              critical_threshold_high: 40.0,
              status: 'normal',
              last_reading_time: new Date().toISOString()
            }
          ];
        }
      }
      else if (url.includes('/api/v1/analysis/bathymetry/eac')) data = {
        asset_id: 'SAN-LUIS-RESERVOIR',
        datum_min_elevation_m: 120.0,
        datum_max_elevation_m: 165.0,
        current_pool_elevation_m: 152.4,
        current_storage_m3: 1650000000.0,
        current_surface_area_ha: 4850.0,
        max_capacity_m3: 2470000000.0,
        max_surface_area_ha: 5200.0,
        capacity_utilization_pct: 66.8,
        curve_points: [
          { elevation_m: 120.0, surface_area_ha: 0.0, storage_volume_m3: 0.0, storage_volume_acre_feet: 0.0 },
          { elevation_m: 135.0, surface_area_ha: 2100.0, storage_volume_m3: 450000000.0, storage_volume_acre_feet: 364821.3 },
          { elevation_m: 150.0, surface_area_ha: 4300.0, storage_volume_m3: 1420000000.0, storage_volume_acre_feet: 1151213.9 },
          { elevation_m: 165.0, surface_area_ha: 5200.0, storage_volume_m3: 2470000000.0, storage_volume_acre_feet: 2002463.6 }
        ],
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/tiles/cache/preload')) data = {
        job_id: 'PRELOAD-SLD-01',
        item_id: 'S2A_MSIL2A_20260820',
        total_tiles_to_cache: 145,
        estimated_size_mb: 8.7,
        zoom_breakdown: { '10': 1, '11': 4, '12': 16, '13': 44, '14': 80 },
        status: 'queued',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/agent/trigger-mock-alert')) data = { status: 'success', message: 'Mock alert triggered. JARVIS is generating the briefing and will push via SSE.' };
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
  const col = typeof collection === 'object' && collection !== null ? (collection.id || collection.value || String(collection)) : collection;
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
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${base}/api/v1/tiles/${col}/${itemId}/${z}/${x}/${y}.png${queryStr}`;
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
  const col = typeof collection === 'object' && collection !== null ? (collection.id || collection.value || String(collection)) : collection;
  const response = await giosApi.get('/api/v1/analysis/pixel-probe', {
    params: { lat, lng, collection: col, item_id: itemId }
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
  const payload = { ...params };
  if (payload.collection && typeof payload.collection === 'object') {
    payload.collection = payload.collection.id || payload.collection.value || String(payload.collection);
  }
  if (payload.index && typeof payload.index === 'object') {
    payload.index = payload.index.key || payload.index.value || String(payload.index);
  }
  const response = await giosApi.post('/api/v1/analysis/zonal-stats', payload);
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
  return response.data?.orthomosaic || response.data;
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
 * @param {HazardCategory|string|null} [category=null] - Optional hazard domain filter
 * @returns {Promise<Array>} List of hazard event objects
 */
export const fetchHazardEvents = async (category = null) => {
  const cat = typeof category === 'object' && category !== null ? (category.key || category.value || String(category)) : category;
  const response = await giosApi.get('/api/v1/events', {
    params: cat ? { category: cat } : {}
  });
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
 * Retrieves the catalog of active hazard events formatted as an RFC 7946 GeoJSON FeatureCollection.
 * 
 * @param {HazardCategory|string|null} [category=null] - Optional hazard domain filter
 * @returns {Promise<Object>} RFC 7946 GeoJSON FeatureCollection
 */
export const fetchHazardEventsGeoJson = async (category = null) => {
  const cat = typeof category === 'object' && category !== null ? (category.key || category.value || String(category)) : category;
  const response = await giosApi.get('/api/v1/events/geojson', {
    params: cat ? { category: cat } : {}
  });
  return response.data;
};

/**
 * Fetches single hazard event formatted as an RFC 7946 GeoJSON Feature.
 * 
 * @param {string} eventId - Unique event identifier
 * @returns {Promise<Object>} RFC 7946 GeoJSON Feature
 */
export const fetchEventGeoJsonById = async (eventId) => {
  const response = await giosApi.get(`/api/v1/events/${eventId}/geojson`);
  return response.data;
};

/**
 * Retrieves critical infrastructure GIS vector layers.
 * 
 * @param {string} [layerType='critical_infrastructure'] - Layer category
 * @returns {Promise<GeoJSONFeatureCollection>} GeoJSON FeatureCollection
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

/**
 * Schedules an autonomous UAS flight mission.
 * 
 * @param {DroneScheduleMissionRequest} params - Mission parameters (event_id, lat, lng, radius_km)
 * @returns {Promise<{status: string, mission: Object}>} Scheduled mission status and details
 */
export const scheduleDroneMission = async (params) => {
  const response = await giosApi.post('/api/v1/drone/missions/schedule', params);
  return response.data;
};

/**
 * Retrieves the catalog of registered centimeter-resolution drone orthomosaics.
 * 
 * @returns {Promise<Array<DroneOrthomosaicMetadata>>} List of registered drone orthomosaics
 */
export const listDroneOrthomosaics = async () => {
  const response = await giosApi.get('/api/v1/drone/orthomosaics');
  return response.data.orthomosaics || [];
};

/**
 * Alias for listDroneOrthomosaics to match fetch* convention.
 */
export const fetchDroneOrthomosaics = listDroneOrthomosaics;

/**
 * Registers a pre-stitched drone GeoTIFF orthomosaic by file path or cloud URI.
 * 
 * @param {DroneRegisterRequest} params - file_path, mission_name, sensor_payload, ortho_id
 * @returns {Promise<DroneOrthomosaicMetadata>} Registered drone orthomosaic metadata
 */
export const registerDroneOrthomosaicPath = async (params) => {
  const response = await giosApi.post('/api/v1/drone/register', params);
  return response.data;
};

/**
 * Ingests live in-situ IoT sensor telemetry for multi-sensor fusion.
 * 
 * @param {SensorData} sensorData - Sensor telemetry payload
 * @returns {Promise<{status: string, message: string}>} Ingestion status
 */
export const ingestSensorData = async (sensorData) => {
  const response = await giosApi.post('/api/v1/iot/ingest', sensorData);
  return response.data;
};

/**
 * Retrieves the list of ingested IoT sensor readings.
 * 
 * @returns {Promise<Array<SensorData>>} Ingested sensor readings
 */
export const fetchSensorData = async () => {
  const response = await giosApi.get('/api/v1/iot/data');
  return response.data;
};

/**
 * Authenticates user credentials and acquires an OAuth2 Bearer token.
 * 
 * @param {string} username - User account username
 * @param {string} password - User account password
 * @returns {Promise<TokenResponse>} Access token response
 */
export const loginUser = async (username, password) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  const response = await giosApi.post('/api/v1/auth/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

/**
 * Retrieves the currently authenticated user profile.
 * 
 * @returns {Promise<UserResponse>} User profile details
 */
export const fetchUserProfile = async () => {
  const response = await giosApi.get('/api/v1/auth/me');
  return response.data;
};

/**
 * Registers a new user account.
 * 
 * @param {string} username - Desired account username
 * @param {string} password - Account password
 * @param {'viewer' | 'admin' | string} [role='viewer'] - Assigned role
 * @returns {Promise<UserRegisterResponse>} Registration response
 */
export const registerUser = async (username, password, role = 'viewer') => {
  const response = await giosApi.post('/api/v1/auth/register', null, {
    params: { username, password, role }
  });
  return response.data;
};

/**
 * Generates an environmental regulatory compliance PDF report.
 * 
 * @param {string} bbox - Bounding box formatted as "min_lon,min_lat,max_lon,max_lat"
 * @param {SpectralIndex|string} [indexType='ndmi'] - Spectral index for the report
 * @returns {Promise<Blob>} Binary PDF Blob
 */
export const downloadPdfReport = async (bbox, indexType = 'ndmi') => {
  const response = await giosApi.get('/api/v1/reports/pdf', {
    params: { bbox, index_type: indexType },
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Searches the STAC catalog for satellite scenes matching spatio-temporal filters.
 * 
 * @param {SearchParams} params - Spatial bounds, dates, and collection
 * @returns {Promise<SearchResponse>} Matching scene list and count
 */
export const searchScenes = async (params) => {
  const response = await giosApi.post('/api/v1/data/search', params);
  return response.data;
};

/**
 * Calculates real summary statistics for a spectral index over a regional bounding box.
 * 
 * @param {IndexRequest} params - AOI bounding box, dates, index, and collection
 * @returns {Promise<IndexResultSummary>} Deterministic mean, median, min, max, std, and valid pixel counts
 */
export const computeRegionalIndex = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/indices', params);
  return response.data;
};

/**
 * Creates and registers a new geotechnical or environmental hazard event.
 * 
 * @param {EventCreateRequest} eventData - Hazard event parameters
 * @returns {Promise<Object>} Created event record
 */
export const createHazardEvent = async (eventData) => {
  const response = await giosApi.post('/api/v1/events', eventData);
  return response.data;
};

/**
 * Triggers an administrative mock sensor spike to test proactive JARVIS alert streaming.
 * 
 * @returns {Promise<{status: string, message: string}>} Mock alert trigger status
 */
export const triggerMockAlert = async () => {
  const response = await giosApi.post('/api/v1/agent/trigger-mock-alert');
  return response.data;
};

/**
 * Returns the fully qualified URL for the SSE proactive alert stream.
 * 
 * @returns {string} Fully qualified stream URL
 */
export const getAlertStreamUrl = () => {
  const base = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${base}/api/v1/agent/stream-alerts`;
};

/**
 * Computes digital elevation and terrain analysis over an AOI.
 * 
 * @param {Object} params - Terrain analysis parameters
 * @param {string|number[]} params.bbox - Bounding box [min_lon, min_lat, max_lon, max_lat]
 * @param {'elevation'|'slope'|'aspect'|'hillshade'} [params.metric='elevation'] - Terrain indicator
 * @param {number} [params.sun_azimuth_deg=315.0] - Illumination azimuth
 * @param {number} [params.sun_altitude_deg=45.0] - Illumination altitude
 * @returns {Promise<Object>} Terrain analysis results and statistics
 */
export const calculateTerrainAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/terrain', params);
  return response.data;
};

/**
 * Computes Sentinel-1 SAR radar backscatter analysis over an AOI.
 * 
 * @param {Object} params - SAR analysis parameters
 * @param {string|number[]} params.bbox - Bounding box [min_lon, min_lat, max_lon, max_lat]
 * @param {'vv'|'vh'|'ratio_vh_vv'} [params.polarization='vv'] - Polarization channel
 * @param {string} params.start_date - Start date (YYYY-MM-DD)
 * @param {string} params.end_date - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Calibrated radar backscatter response
 */
export const calculateSarAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/sar', params);
  return response.data;
};

/**
 * Constructs canonical XYZ tile URL for digital terrain model visualization.
 * 
 * @param {'elevation'|'slope'|'aspect'|'hillshade'} metric - Terrain metric
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @returns {string} Formatted tile URL
 */
export const buildTerrainTileUrl = (metric, z, x, y) => {
  return `/api/v1/tiles/terrain/${metric}/${z}/${x}/${y}.png`;
};

/**
 * Constructs canonical XYZ tile URL for Sentinel-1 SAR intensity visualization.
 * 
 * @param {'vv'|'vh'|'ratio_vh_vv'} polarization - SAR polarization
 * @param {number|string} z - Zoom level
 * @param {number|string} x - Tile X
 * @param {number|string} y - Tile Y
 * @returns {string} Formatted tile URL
 */
export const buildSarTileUrl = (polarization, z, x, y) => {
  return `/api/v1/tiles/sar/${polarization}/${z}/${x}/${y}.png`;
};

/**
 * Computes an engineering transect cross-section profile along an embankment or hazard polyline.
 * 
 * @param {TransectAnalysisRequest} params - Transect polyline, metric, and sample count
 * @returns {Promise<TransectAnalysisResponse>} Sampled cross-section profile points and summary
 */
export const calculateTransectAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/transect', params);
  return response.data;
};

/**
 * Computes digital volumetric earthwork (cut/fill) or reservoir capacity over an AOI.
 * 
 * @param {VolumetricAnalysisRequest} params - AOI bounds, reference datum, and mode
 * @returns {Promise<VolumetricAnalysisResponse>} Cut, fill, and net volumetric metrics
 */
export const calculateVolumetricAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/volumetric', params);
  return response.data;
};

/**
 * Requests georeferenced raster or derived biophysical layer export.
 * 
 * @param {DataExportRequest} params - AOI bounds, collection, index, and format
 * @returns {Promise<DataExportResponse>} Export task metadata and download URL
 */
export const requestDataExport = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/export', params);
  return response.data;
};

/**
 * Retrieves temporal keyframe catalog for animated multi-temporal observation sequence.
 * 
 * @param {Object} params - Query parameters (collection, start_date, end_date, bbox, z, x, y)
 * @returns {Promise<AnimationSequenceConfig>} Ordered sequence keyframe catalog
 */
export const fetchAnimationSequence = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/animation-sequence', params);
  return response.data;
};

/**
 * @typedef {Object} TemporalCompositeRequest
 * @property {[number, number, number, number]|number[]|string} bbox - Target geographic bounding box [min_lon, min_lat, max_lon, max_lat]
 * @property {string} [collection='sentinel-2-l2a'] - Target satellite imagery collection
 * @property {string} start_date - Temporal window start date (YYYY-MM-DD)
 * @property {string} end_date - Temporal window end date (YYYY-MM-DD)
 * @property {'median'|'greenest_pixel'|'clearest_pixel'|'most_recent'|'max_ndmi'|'min_lst'} [reducer='median'] - Pixel reduction algorithm
 * @property {number} [max_cloud_cover=30.0] - Maximum allowable scene cloud cover percentage
 * @property {string} [index] - Optional spectral index
 * @property {string} [colormap] - Optional rendering colormap
 * @property {string} [rescale] - Optional display contrast rescale
 */

/**
 * @typedef {Object} TemporalCompositeResponse
 * @property {string} composite_id - Unique composite identifier
 * @property {string} status - Processing status ('ready')
 * @property {string} reducer - Applied pixel reduction algorithm
 * @property {string} collection - Source satellite collection
 * @property {number} scene_count - Number of contributing scenes
 * @property {Array<string>} contributing_scenes - List of scene IDs
 * @property {[number, number, number, number]} bbox - Spatial envelope bounds
 * @property {string} time_window - Formatted temporal interval string
 * @property {string} tile_url_template - XYZ tile template URL
 * @property {string} created_at - ISO 8601 creation timestamp
 */

/**
 * @typedef {Object} GeotechnicalAnnotation
 * @property {string} annotation_id - Unique defect annotation identifier
 * @property {string} title - Short summary title
 * @property {'seepage_boil'|'crest_crack'|'slope_slump'|'piping_void'|'erosion_gully'|'subsidence'|'vegetation_anomaly'} category - Defect category
 * @property {'critical'|'high'|'moderate'|'low'} severity - Severity tier
 * @property {'open'|'investigating'|'work_order_issued'|'repaired'|'verified'} status - Workflow state
 * @property {number} lat - Latitude coordinate
 * @property {number} lng - Longitude coordinate
 * @property {number|null} [elevation_m] - Elevation ASL in meters
 * @property {string} asset_id - Associated infrastructure asset ID
 * @property {string|null} [drone_ortho_id] - Associated drone survey ID
 * @property {Array<string>} [photo_urls] - Inspection photo URLs
 * @property {string} [notes] - Narrative notes
 * @property {string} [inspector] - Inspector identifier
 * @property {string} created_at - ISO 8601 timestamp
 * @property {string} updated_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} CreateAnnotationRequest
 * @property {string} title - Defect title
 * @property {'seepage_boil'|'crest_crack'|'slope_slump'|'piping_void'|'erosion_gully'|'subsidence'|'vegetation_anomaly'} category - Defect category
 * @property {'critical'|'high'|'moderate'|'low'} severity - Risk severity
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {number} [elevation_m] - Surface elevation
 * @property {string} asset_id - Asset identifier
 * @property {string} [drone_ortho_id] - Drone survey reference
 * @property {Array<string>} [photo_urls] - Photo evidence
 * @property {string} [notes] - Inspector observations
 * @property {string} [inspector] - Inspector name
 */

/**
 * @typedef {Object} MaintenanceWorkOrder
 * @property {string} work_order_id - Work order identifier
 * @property {string} annotation_id - Linked annotation ID
 * @property {string} asset_id - Infrastructure asset ID
 * @property {'critical'|'high'|'moderate'|'low'} priority - Work priority
 * @property {string} description - Work instructions
 * @property {string} assigned_crew - Repair team
 * @property {string} target_completion_date - Target deadline (YYYY-MM-DD)
 * @property {'draft'|'dispatched'|'completed'|'closed'} status - Order status
 * @property {number|null} [estimated_hours] - Labor hours estimate
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} AOISubscriptionRequest
 * @property {string} name - Subscription label
 * @property {[number, number, number, number]|number[]|string} bbox - Monitored bounding box
 * @property {string} [asset_id] - Optional asset ID
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {Array<string>} [indices=['ndmi']] - Spectral indices
 * @property {'z_score_anomaly'|'new_scene_ingested'|'index_threshold'} [trigger_type='z_score_anomaly'] - Trigger condition
 * @property {number} [z_score_threshold=2.5] - Z-score sensitivity
 * @property {Array<string>} [channels=['in_app_alert']] - Notification channels
 * @property {string} [webhook_url] - HTTP POST webhook URL
 * @property {boolean} [is_active=true] - Active flag
 */

/**
 * @typedef {Object} VRTAnalysisRequest
 * @property {Array<string>} source_scenes - List of STAC scene IDs to mosaic
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {'feather'|'nearest'|'voronoi_cut'|'average'} [seamline_mode='feather'] - Blending algorithm
 * @property {string} [target_crs='EPSG:3857'] - Output coordinate reference system
 * @property {string} [index] - Spectral index to compute across mosaic
 * @property {string} [colormap] - Colormap palette
 * @property {string} [rescale] - Rescale min,max
 */

/**
 * Requests multi-temporal cloud-free composite synthesis.
 * 
 * @param {TemporalCompositeRequest} params - Composite request parameters
 * @returns {Promise<TemporalCompositeResponse>} Generated composite metadata and tile template
 */
export const requestTemporalComposite = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/composite', params);
  return response.data;
};

/**
 * Fetches geotagged geotechnical defect annotations.
 * 
 * @param {Object} [params={}] - Filter parameters (asset_id, category, severity, status)
 * @returns {Promise<Array<GeotechnicalAnnotation>>} List of defect annotations
 */
export const fetchGeotechnicalAnnotations = async (params = {}) => {
  const response = await giosApi.get('/api/v1/annotations', { params });
  return response.data;
};

/**
 * Submits a new geotagged geotechnical defect annotation.
 * 
 * @param {CreateAnnotationRequest} params - Defect details
 * @returns {Promise<GeotechnicalAnnotation>} Created annotation record
 */
export const createGeotechnicalAnnotation = async (params) => {
  const response = await giosApi.post('/api/v1/annotations', params);
  return response.data;
};

/**
 * Updates lifecycle status of a geotechnical defect annotation.
 * 
 * @param {string} annotationId - Target annotation ID
 * @param {'open'|'investigating'|'work_order_issued'|'repaired'|'verified'} status - New status
 * @param {string} [notes] - Optional status remarks
 * @returns {Promise<GeotechnicalAnnotation>} Updated annotation record
 */
export const updateGeotechnicalAnnotationStatus = async (annotationId, status, notes = null) => {
  const response = await giosApi.patch(`/api/v1/annotations/${annotationId}`, { status, notes });
  return response.data;
};

/**
 * Dispatches an actionable maintenance work order from a defect annotation.
 * 
 * @param {Object} params - Work order parameters
 * @returns {Promise<MaintenanceWorkOrder>} Dispatched work order record
 */
export const createMaintenanceWorkOrder = async (params) => {
  const response = await giosApi.post('/api/v1/work-orders', params);
  return response.data;
};

/**
 * Fetches registered maintenance work orders.
 * 
 * @param {Object} [params={}] - Filter parameters (asset_id, status, priority)
 * @returns {Promise<Array<MaintenanceWorkOrder>>} List of maintenance work orders
 */
export const fetchMaintenanceWorkOrders = async (params = {}) => {
  const response = await giosApi.get('/api/v1/work-orders', { params });
  return response.data;
};

/**
 * Creates an automated continuous satellite monitoring subscription over an AOI.
 * 
 * @param {AOISubscriptionRequest} params - Subscription parameters
 * @returns {Promise<Object>} Created subscription record
 */
export const createAOISubscription = async (params) => {
  const response = await giosApi.post('/api/v1/subscriptions', params);
  return response.data;
};

/**
 * Fetches all registered automated AOI monitoring subscriptions.
 * 
 * @returns {Promise<Array<Object>>} List of active subscriptions
 */
export const fetchAOISubscriptions = async () => {
  const response = await giosApi.get('/api/v1/subscriptions');
  return response.data;
};

/**
 * Requests multi-granule Virtual Raster (VRT) mosaic configuration and analysis.
 * 
 * @param {VRTAnalysisRequest} params - VRT mosaic parameters
 * @returns {Promise<Object>} Generated VRT metadata and tile streaming template
 */
export const requestVrtAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/vrt', params);
  return response.data;
};

/**
 * @typedef {Object} ChangeCategoryDetail
 * @property {'significant_increase'|'moderate_increase'|'stable'|'moderate_decrease'|'significant_decrease'} category - Category enum
 * @property {string} label - Human-readable label
 * @property {number|null} [min_change] - Lower difference bound
 * @property {number|null} [max_change] - Upper difference bound
 * @property {number} area_hectares - Area in hectares
 * @property {number} percentage - Percentage of valid AOI
 * @property {number} [pixel_count] - Pixel count
 */

/**
 * @typedef {Object} ChangeDetectionRequest
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} pre_scene_id - Baseline STAC item ID
 * @property {string} post_scene_id - Comparison STAC item ID
 * @property {'ndvi_diff'|'ndmi_diff'|'mndwi_diff'|'nbr_diff'|'sar_vv_diff'|'lst_diff'} [metric='ndmi_diff'] - Difference metric
 * @property {Object} [geometry] - Optional GeoJSON Polygon bounding AOI
 * @property {number} [threshold_positive=0.15] - Moderate positive threshold
 * @property {number} [threshold_negative=-0.15] - Moderate negative threshold
 * @property {number} [threshold_extreme=0.30] - Significant change threshold
 */

/**
 * @typedef {Object} ChangeDetectionResponse
 * @property {string} request_id - Unique analysis ID
 * @property {string} collection - Analyzed satellite collection
 * @property {string} pre_scene_id - Baseline scene ID
 * @property {string} post_scene_id - Comparison scene ID
 * @property {string} metric - Evaluated difference metric
 * @property {number} mean_difference - Mean difference
 * @property {number} median_difference - Median difference
 * @property {number} std_difference - Standard deviation
 * @property {number} total_area_hectares - Total area in ha
 * @property {number} area_increased_ha - Area of positive change in ha
 * @property {number} area_decreased_ha - Area of negative change in ha
 * @property {number} area_stable_ha - Area of stable state in ha
 * @property {Array<ChangeCategoryDetail>} categories - Categorical distribution breakdown
 * @property {string} tile_url_template - Dynamic XYZ tile URL template
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} GeotechnicalSensor
 * @property {string} sensor_id - Unique instrument identifier
 * @property {string} name - Instrument location / station title
 * @property {'piezometer'|'inclinometer'|'seepage_weir'|'stage_gauge'|'settlement_plate'} sensor_type - Classification
 * @property {string} asset_id - Infrastructure asset ID
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {number} installation_elevation_m - Collar elevation
 * @property {number|null} [installation_depth_m] - Tip depth
 * @property {string} unit - Measurement unit
 * @property {number|null} [current_value] - Latest reading
 * @property {number|null} [alert_threshold_low] - Low warning threshold
 * @property {number|null} [alert_threshold_high] - High warning threshold
 * @property {number|null} [critical_threshold_high] - Critical limit
 * @property {'normal'|'advisory'|'alert'|'critical'} status - Operational status
 * @property {string|null} [last_reading_time] - ISO 8601 timestamp
 */

/**
 * @typedef {Object} GeotechnicalNetworkSummary
 * @property {string} asset_id - Asset identifier
 * @property {number} total_sensors - Total sensor count
 * @property {number} sensors_normal - Normal count
 * @property {number} sensors_advisory - Advisory count
 * @property {number} sensors_alert - Alert count
 * @property {number} sensors_critical - Critical count
 * @property {number|null} [max_pore_pressure_kpa] - Maximum pore pressure in kPa
 * @property {number|null} [total_seepage_flow_lps] - Total seepage flow in L/s
 * @property {boolean} phreatic_surface_warning - Elevated phreatic surface warning
 * @property {string} last_updated - ISO 8601 timestamp
 */

/**
 * @typedef {Object} EACAnalysisRequest
 * @property {string} asset_id - Target reservoir asset ID
 * @property {Object} [geometry] - Optional GeoJSON Polygon bounding pool
 * @property {number} datum_min_elevation_m - Bottom datum elevation
 * @property {number} datum_max_elevation_m - Maximum spillway elevation
 * @property {number} [step_elevation_m=5.0] - Elevation step
 * @property {number|null} [current_pool_elevation_m] - Current pool stage elevation
 */

/**
 * @typedef {Object} EACAnalysisResponse
 * @property {string} asset_id - Reservoir asset ID
 * @property {number} datum_min_elevation_m - Minimum pool bottom elevation
 * @property {number} datum_max_elevation_m - Spillway elevation
 * @property {number|null} [current_pool_elevation_m] - Current pool stage elevation
 * @property {number|null} [current_storage_m3] - Current storage volume in m^3
 * @property {number|null} [current_surface_area_ha] - Current surface water area in ha
 * @property {number} max_capacity_m3 - Maximum capacity at spillway level in m^3
 * @property {number} max_surface_area_ha - Maximum surface area at spillway level in ha
 * @property {number|null} [capacity_utilization_pct] - Capacity utilization percentage
 * @property {Array<{elevation_m: number, surface_area_ha: number, storage_volume_m3: number, storage_volume_acre_feet: number}>} curve_points - EAC curve points
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} TileCachePreloadRequest
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} item_id - Target scene item ID
 * @property {[number, number, number, number]|number[]|string} bbox - Bounding box
 * @property {number} [min_zoom=10] - Start zoom level
 * @property {number} [max_zoom=14] - Max zoom level
 * @property {Array<string>} [indices=['ndmi', 'ndvi']] - Indices to pre-render
 * @property {Array<string>} [colormaps=['spectral']] - Colormaps to pre-render
 */

/**
 * @typedef {Object} TileCachePreloadResponse
 * @property {string} job_id - Preload job identifier
 * @property {string} item_id - Target scene item ID
 * @property {number} total_tiles_to_cache - Total tile count
 * @property {number} estimated_size_mb - Estimated disk storage in MB
 * @property {Record<string, number>} zoom_breakdown - Per-zoom tile breakdown
 * @property {string} status - Job status ('queued', 'running', 'completed')
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * Requests bitemporal change detection and difference matrix analytics.
 * 
 * @param {ChangeDetectionRequest} params - Change detection parameters
 * @returns {Promise<ChangeDetectionResponse>} Computed change statistics and tile URL
 */
export const requestChangeDetectionAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/change-detection', params);
  return response.data;
};

/**
 * Fetches in-situ geotechnical sensors for an asset or category.
 * 
 * @param {Object} [params={}] - Filter parameters (asset_id, sensor_type, status)
 * @returns {Promise<Array<GeotechnicalSensor>>} List of geotechnical sensors
 */
export const fetchGeotechnicalSensors = async (params = {}) => {
  const response = await giosApi.get('/api/v1/integration/geotechnical/sensors', { params });
  return response.data;
};

/**
 * Fetches historical telemetry readings for an in-situ geotechnical sensor.
 * 
 * @param {string} sensorId - Instrument ID
 * @param {Object} [params={}] - Filter parameters (start_date, end_date, limit)
 * @returns {Promise<Array<Object>>} List of sensor readings
 */
export const fetchGeotechnicalSensorReadings = async (sensorId, params = {}) => {
  const response = await giosApi.get(`/api/v1/integration/geotechnical/sensors/${sensorId}/readings`, { params });
  return response.data;
};

/**
 * Fetches aggregated geotechnical instrumentation network summary for an infrastructure asset.
 * 
 * @param {string} assetId - Asset identifier (e.g. 'SAN-LUIS-DAM-01')
 * @returns {Promise<GeotechnicalNetworkSummary>} Geotechnical network health summary
 */
export const fetchGeotechnicalNetworkSummary = async (assetId) => {
  const response = await giosApi.get(`/api/v1/integration/geotechnical/summary/${assetId}`);
  return response.data;
};

/**
 * Registers a new in-situ geotechnical sensor for an asset.
 * 
 * @param {Object} params - Sensor registration parameters
 * @returns {Promise<GeotechnicalSensor>} Registered geotechnical sensor
 */
export const createGeotechnicalSensor = async (params) => {
  const response = await giosApi.post('/api/v1/integration/geotechnical/sensors', params);
  return response.data;
};


/**
 * Calculates reservoir bathymetric Elevation-Area-Capacity (EAC) curves.
 * 
 * @param {EACAnalysisRequest} params - EAC calculation parameters
 * @returns {Promise<EACAnalysisResponse>} Bathymetric curve points and capacity metrics
 */
export const calculateBathymetryEAC = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/bathymetry/eac', params);
  return response.data;
};

/**
 * Dispatches a tile cache pre-warm preload job over an Area of Interest.
 * 
 * @param {TileCachePreloadRequest} params - Tile cache preloading parameters
 * @returns {Promise<TileCachePreloadResponse>} Preload job status and estimated tiles
 */
export const preloadTileCache = async (params) => {
  const response = await giosApi.post('/api/v1/tiles/cache/preload', params);
  return response.data;
};

export default giosApi;


