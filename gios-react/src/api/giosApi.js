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
import {
  getCameraCalibrationPreset,
  listCameraCalibrationPresets,
  listSoilPresets,
  calculateSbasNetworkInversion,
  calculateTopographicRadiometricCorrection,
  calculateRpcTiePointAlignment
} from '../config/constants.js';

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
  calculateTilePyramidCount,
  GCP_ROLES,
  GCP_TARGET_TYPES,
  calculateGcpResidualsAndRmse,
  gcpToGeoJsonFeature,
  gcpsToFeatureCollection,
  SLOPE_STABILITY_TIERS,
  calculateTopographicWetnessIndex,
  calculateSlopeFactorOfSafety,
  classifySlopeStabilityTier,
  HLS_PLATFORMS,
  HLS_TRANSFORMATION_COEFFICIENTS,
  crossCalibrateSpectralBand,
  WATER_QUALITY_METRICS,
  TROPHIC_STATES,
  calculateNdci,
  calculateNdti,
  classifyTrophicState,
  CYANOBACTERIA_ALERT_LEVELS,
  classifyCyanobacteriaAlert,
  CAMERA_CALIBRATION_PRESETS,
  getCameraCalibrationPreset,
  listCameraCalibrationPresets,
  SOIL_MECHANICS_PRESETS,
  getSoilPreset,
  listSoilPresets,
  buildTwiTileUrl,
  buildSlopeStabilityTileUrl,
  buildWaterQualityTileUrl,
  HEAT_HAZARD_LEVELS,
  LST_CALCULATION_MODELS,
  calculateFractionalVegetationCover,
  calculateLandSurfaceEmissivity,
  calculateLstSingleChannel,
  classifyHeatHazardLevel,
  buildLstTileUrl,
  TOPOGRAPHIC_CORRECTION_MODELS,
  calculateIlluminationAngle,
  applyTopographicCCorrection,
  INSAR_DEFORMATION_TIERS,
  calculateInSarDisplacementMm,
  calculateInSarVelocityMmYr,
  classifyInSarDeformationTier,
  buildInsarTileUrl,
  PHENOLOGY_FIT_MODELS,
  fitHarmonicPhenology,
  COREGISTRATION_RESAMPLING_KERNELS,
  COREGISTRATION_STATUSES,
  calculatePhaseCorrelationShift,
  ELEVATION_MODEL_TYPES,
  POINT_CLOUD_FORMATS,
  POINT_CLASSIFICATION_CODES,
  buildChmTileUrl,
  SEAMLINE_ALGORITHMS,
  RADIOMETRIC_BLENDING_MODES,
  calculateSeamlineEnergy,
  buildTrueOrthoTileUrl,
  BYOC_STORAGE_PROVIDERS,
  BYOC_SYNC_STATUSES,
  buildByocTileUrl,
  TREND_SIGNIFICANCE_TIERS,
  TREND_DIRECTIONS,
  calculateMannKendallTrend,
  ATMOSPHERIC_CORRECTION_MODELS,
  calculateDos1SurfaceReflectance,
  CVA_MAGNITUDE_TIERS,
  CVA_DIRECTION_SECTORS,
  calculateChangeVector,
  buildCvaTileUrl,
  SALINITY_INDEX_TYPES,
  SALINITY_HAZARD_TIERS,
  calculateSalinityIndices,
  classifySalinityHazard,
  buildSalinityTileUrl,
  THERMAL_HOTSPOT_CONFIDENCES,
  calculateFireRadiativePower,
  detectThermalHotspots,
  buildThermalHotspotTileUrl,
  INUNDATION_HAZARD_TIERS,
  DAM_BREACH_FAILURE_MODES,
  calculateDamBreachInundation,
  buildFloodInundationTileUrl,
  LANDSLIDE_SUSCEPTIBILITY_TIERS,
  LANDSLIDE_TRIGGER_TYPES,
  calculateLandslideSusceptibility,
  buildLandslideTileUrl,
  DROUGHT_SEVERITY_TIERS,
  calculateVegetationHealthIndex,
  classifyDroughtTier,
  buildDroughtVhiTileUrl,
  MINERAL_ENDMEMBER_TYPES,
  MINERAL_ENDMEMBER_LIBRARY,
  calculateSpectralAngleMapper,
  getMineralEndmemberSpec,
  buildSamMineralTileUrl,
  GEOSPATIAL_SERIALIZATION_FORMATS,
  buildVectorTileUrl,
  formatVectorExportFilename,
  FSC_MODEL_TYPES,
  SNOWPACK_RUNOFF_TIERS,
  classifySnowpackRunoffTier,
  calculateFractionalSnowCover,
  buildSnowCoverTileUrl,
  TSM_ALGORITHMS,
  AQUATIC_TURBIDITY_TIERS,
  classifyAquaticTurbidityTier,
  calculateAquaticTsmTurbidity,
  buildTurbidityTsmTileUrl,
  DISTURBANCE_MODELS,
  DISTURBANCE_TYPES,
  BREAK_SIGNIFICANCE_TIERS,
  classifyDisturbanceType,
  detectStructuralDisturbanceBreaks,
  buildDisturbanceTileUrl,
  CWSI_MODEL_TYPES,
  WATER_STRESS_TIERS,
  classifyWaterStressTier,
  calculateCropWaterStressIndex,
  buildCwsiTileUrl,
  PYRAMID_BLEND_MODES,
  SEAM_RADIOMETRIC_QUALITIES,
  classifySeamRadiometricQuality,
  calculateLaplacianPyramidBlend,
  buildSplineMosaicTileUrl,
  TRUE_ORTHO_OCCLUSION_TYPES,
  TRUE_ORTHO_QUALITY_TIERS,
  classifyTrueOrthoQualityTier,
  calculateTrueOrthoZBuffer,
  buildTrueOrthoZBufferTileUrl,
  SEAMLINE_COST_FUNCTIONS,
  SEAMLINE_BLEND_METHODS,
  SEAMLINE_RADIOMETRIC_TIERS,
  classifySeamlineRadiometricTier,
  calculateGraphCutSeamlines,
  buildGraphCutSeamlineTileUrl,
  BRDF_KERNEL_MODELS,
  BRDF_STANDARD_BAND_PARAMS,
  BRDF_NORMALIZATION_TIERS,
  classifyBrdfNormalizationTier,
  calculateRossThickKernel,
  calculateLiSparseKernel,
  calculateBrdfNbarCorrection,
  buildBrdfNbarTileUrl,
  SBAS_INVERSION_METHODS,
  SBAS_DEFORMATION_TIERS,
  SBAS_PAIR_STATUSES,
  classifySbasDeformationTier,
  calculateSbasNetworkInversion,
  buildSbasTileUrl,
  TOPOGRAPHIC_CORRECTION_METHODS,
  ILLUMINATION_CONDITION_TIERS,
  classifyIlluminationTier,
  calculateLocalIncidenceAngle,
  calculateTopographicRadiometricCorrection,
  buildTopographicMinnaertTileUrl,
  RPC_ADJUSTMENT_MODELS,
  RPC_GEOMETRIC_ACCURACY_TIERS,
  classifyRpcAccuracyTier,
  calculateRpcTiePointAlignment,
  buildTiePointRpcTileUrl
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
      else if (url.includes('/api/v1/drone/gcp/quality') || url.includes('/api/v1/drone/gcp-quality')) data = {
        ortho_id: 'ORTHO-DAM-01',
        control_rmse: { rmse_x_m: 0.021, rmse_y_m: 0.019, rmse_z_m: 0.034, rmse_horizontal_m: 0.028, rmse_3d_m: 0.044, point_count: 5 },
        check_rmse: { rmse_x_m: 0.024, rmse_y_m: 0.022, rmse_z_m: 0.038, rmse_horizontal_m: 0.033, rmse_3d_m: 0.050, point_count: 3 },
        residuals: [
          { point_id: 'GCP-01', role: 'control', delta_x_m: 0.015, delta_y_m: 0.012, delta_z_m: 0.022, residual_horizontal_m: 0.019, residual_3d_m: 0.029, image_pixel_reprojection_error_px: 0.42 },
          { point_id: 'GCP-02', role: 'control', delta_x_m: -0.018, delta_y_m: 0.016, delta_z_m: -0.025, residual_horizontal_m: 0.024, residual_3d_m: 0.035, image_pixel_reprojection_error_px: 0.38 }
        ],
        survey_grade_achieved: true,
        camera_calibration: { camera_id: 'CAM-DJI-P1-01', focal_length_mm: 35.0, focal_length_px: 7954.5, principal_point_x_px: 4096.0, principal_point_y_px: 2730.0, radial_distortion_k1: -0.012, radial_distortion_k2: 0.005, radial_distortion_k3: 0.0, tangential_distortion_p1: 0.0001, tangential_distortion_p2: -0.0001, sensor_width_mm: 35.9, sensor_height_mm: 24.0 },
        assessed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/drone/gcp/geojson')) data = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', id: 'GCP-01', geometry: { type: 'Point', coordinates: [-121.082, 37.054] }, properties: { point_id: 'GCP-01', role: 'control', target_type: 'checkerboard', x_east: 670500.0, y_north: 4102500.0, z_elev: 154.2, crs: 'EPSG:32610', is_enabled: true } },
          { type: 'Feature', id: 'GCP-02', geometry: { type: 'Point', coordinates: [-121.078, 37.058] }, properties: { point_id: 'GCP-02', role: 'control', target_type: 'checkerboard', x_east: 670850.0, y_north: 4102950.0, z_elev: 156.8, crs: 'EPSG:32610', is_enabled: true } },
          { type: 'Feature', id: 'CHK-01', geometry: { type: 'Point', coordinates: [-121.080, 37.056] }, properties: { point_id: 'CHK-01', role: 'check', target_type: 'cross', x_east: 670680.0, y_north: 4102720.0, z_elev: 155.1, crs: 'EPSG:32610', is_enabled: true } }
        ]
      };
      else if (url.endsWith('/api/v1/drone/camera/calibration') || url.endsWith('/api/v1/drone/camera/calibration/') || url.endsWith('/api/v1/drone/camera-calibration') || url.endsWith('/api/v1/drone/camera-calibration/')) data = listCameraCalibrationPresets();
      else if (url.includes('/api/v1/drone/camera/calibration/') || url.includes('/api/v1/drone/camera-calibration/')) {
        const parts = url.includes('/api/v1/drone/camera/calibration/')
          ? url.split('/api/v1/drone/camera/calibration/')
          : url.split('/api/v1/drone/camera-calibration/');
        const cid = parts[1] ? parts[1].split('?')[0] : '';
        data = getCameraCalibrationPreset(cid) || {
          camera_id: cid || 'CAM-DJI-P1-01',
          focal_length_mm: 35.0,
          focal_length_px: 7954.5,
          principal_point_x_px: 4096.0,
          principal_point_y_px: 2730.0,
          radial_distortion_k1: -0.012,
          radial_distortion_k2: 0.005,
          radial_distortion_k3: 0.0,
          tangential_distortion_p1: 0.0001,
          tangential_distortion_p2: -0.0001,
          sensor_width_mm: 35.9,
          sensor_height_mm: 24.0
        };
      }
      else if (url.includes('/api/v1/analysis/terrain/soil-presets')) data = listSoilPresets();
      else if (url.includes('/api/v1/analysis/terrain/twi') || url.includes('/api/v1/analysis/twi')) data = {
        asset_id: 'SAN-LUIS-DAM-01',
        mean_twi: 6.84,
        min_twi: 2.15,
        max_twi: 13.42,
        saturated_area_hectares: 14.8,
        saturation_percentage: 12.4,
        tile_url_template: '/api/v1/tiles/terrain/twi/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/terrain/slope-stability') || url.includes('/api/v1/analysis/slope-stability')) data = {
        asset_id: 'SAN-LUIS-DAM-01',
        mean_factor_of_safety: 1.68,
        min_factor_of_safety: 1.18,
        critical_area_hectares: 3.2,
        stability_tier: 'stable',
        tier_breakdown: { stable: 85.5, marginally_stable: 11.3, advisory: 3.2, failure_critical: 0.0 },
        tile_url_template: '/api/v1/tiles/terrain/slope-stability/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/hls/calibrate') || url.includes('/api/v1/analysis/hls-calibrate')) data = {
        source_platform: 'landsat_oli',
        target_platform: 'sentinel_msi',
        band_name: 'nir',
        calibrated_values: [0.324, 0.355, 0.412],
        mean_calibrated: 0.364,
        bias_correction_applied: -0.015,
        formula_applied: 'MSI = 0.9825 * OLI - 0.0183'
      };
      else if (url.includes('/api/v1/analysis/water-quality') || url.includes('/api/v1/analysis/water_quality')) data = {
        asset_id: 'SAN-LUIS-RESERVOIR',
        item_id: 'S2A_MSIL2A_20260820',
        primary_metric: 'ndci',
        mean_value: 0.084,
        estimated_chlorophyll_a_ugl: 5.6,
        dominant_trophic_state: 'mesotrophic',
        bloom_detected: false,
        bloom_area_hectares: 12.4,
        trophic_breakdown: [
          { state: 'oligotrophic', label: 'Oligotrophic', min_ndci: null, max_ndci: 0.0, area_hectares: 1850.0, percentage: 38.1, chl_a_range_ugl: '< 2.6' },
          { state: 'mesotrophic', label: 'Mesotrophic', min_ndci: 0.0, max_ndci: 0.12, area_hectares: 2540.0, percentage: 52.4, chl_a_range_ugl: '2.6 - 7.3' },
          { state: 'eutrophic', label: 'Eutrophic', min_ndci: 0.12, max_ndci: 0.25, area_hectares: 440.0, percentage: 9.1, chl_a_range_ugl: '7.3 - 20.0' },
          { state: 'hypereutrophic', label: 'Hypereutrophic', min_ndci: 0.25, max_ndci: null, area_hectares: 20.0, percentage: 0.4, chl_a_range_ugl: '>= 20.0' }
        ],
        tile_url_template: '/api/v1/tiles/water-quality/ndci/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/lst/radiative-transfer')) data = {
        item_id: 'LC09_L2SP_044034_20260810',
        method: 'single_channel',
        mean_lst_c: 32.8,
        min_lst_c: 24.5,
        max_lst_c: 44.1,
        mean_lst_k: 305.95,
        mean_emissivity: 0.982,
        mean_fvc: 0.42,
        uhi_intensity_c: 4.8,
        heat_hazard_level: 'high_heat',
        pixel_count: 54200,
        tile_url_template: '/api/v1/tiles/thermal/lst/landsat-c2-l2/LC09_L2SP_044034_20260810/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/topographic-correction')) data = {
        item_id: 'S2A_MSIL2A_20260820',
        model: 'c_correction',
        solar_zenith_deg: 38.5,
        solar_azimuth_deg: 142.0,
        c_parameter_used: 0.18,
        minnaert_k_used: 0.75,
        mean_illumination_cos: 0.742,
        mean_reflectance_before: 0.284,
        mean_reflectance_after: 0.221,
        topographic_shadow_area_pct: 4.2,
        status: 'corrected',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/insar/displacement')) data = {
        pair_id: 'PAIR-S1-20260808-20260820',
        primary_scene_id: 'S1A_IW_SLC__1SDV_20260808',
        secondary_scene_id: 'S1A_IW_SLC__1SDV_20260820',
        temporal_baseline_days: 12.0,
        perpendicular_baseline_m: 45.0,
        mean_coherence: 0.68,
        mean_displacement_mm: -3.2,
        max_subsidence_mm: -18.4,
        max_uplift_mm: 2.1,
        mean_velocity_mm_yr: -97.3,
        deformation_tier: 'moderate_subsidence',
        stable_area_pct: 78.4,
        tile_url_template: '/api/v1/tiles/sar/insar/PAIR-S1-20260808-20260820/{z}/{x}/{y}.png',
        evaluated_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/insar/coherence')) data = {
        pair_id: 'PAIR-S1-20260808-20260820',
        mean_coherence: 0.68,
        high_coherence_pct: 64.2,
        decorrelated_pct: 12.8,
        structural_stability_score: 87.5,
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/phenology/extract')) data = {
        aoi_name: 'San Luis Reservoir Watershed',
        metric: 'ndvi',
        fit_model: 'harmonic_hats',
        phenometrics: {
          base_level: 0.22,
          peak_level: 0.68,
          amplitude: 0.46,
          sos_doy: 95,
          pos_doy: 195,
          eos_doy: 295,
          los_days: 200
        },
        r_squared: 0.91,
        climatological_anomaly_z: -0.42,
        curve_points: [],
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/composites/bap')) data = {
        composite_id: 'BAP-S2-2026-DOY200',
        collection: 'sentinel-2-l2a',
        scenes_evaluated: 6,
        target_doy: 200,
        mean_pixel_score: 0.88,
        valid_pixel_pct: 99.4,
        tile_url_template: '/api/v1/tiles/composite/BAP-S2-2026-DOY200/{z}/{x}/{y}.png',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/geometric/coregistration') || url.includes('/api/v1/analysis/coregistration')) data = {
        reference_scene_id: 'S2A_10SEJ_20260715',
        target_scene_id: 'S2B_10SEJ_20260720',
        status: 'sub_pixel_aligned',
        shift_x_px: 0.142,
        shift_y_px: -0.085,
        shift_x_m: 1.42,
        shift_y_m: -0.85,
        total_shift_m: 1.66,
        rmse_px: 0.045,
        valid_tie_points: 128,
        resampling_applied: 'cubic',
        aligned_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/point-cloud/filter')) data = {
        point_cloud_id: 'PC-SLD-2026-01',
        total_points: 12450000,
        ground_points: 7850000,
        non_ground_points: 4600000,
        ground_ratio_pct: 63.05,
        dtm_resolution_m: 1.0,
        classified_copc_url: '/api/v1/point-cloud/copc/PC-SLD-2026-01.copc.laz',
        processed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/point-cloud/chm')) data = {
        asset_id: 'SAN-LUIS-DAM-01',
        mean_height_m: 3.45,
        max_height_m: 18.2,
        vegetation_area_ha: 14.8,
        infrastructure_encroachment_ha: 1.25,
        height_percentiles: { p50: 2.1, p75: 4.8, p90: 9.6, p95: 14.2 },
        tile_url_template: '/api/v1/tiles/terrain/chm/SAN-LUIS-DAM-01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/ortho/occlusion')) data = {
        ortho_id: 'DRONE-SL-EMBANKMENT-01',
        occluded_pixel_count: 14200,
        occluded_area_pct: 2.45,
        true_ortho_ready: true,
        evaluated_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/ortho/seamlines')) data = {
        mosaic_id: 'MOSAIC-DRONE-SL-2026',
        seamline_count: 8,
        total_seamline_length_m: 1450.0,
        algorithm_applied: 'graph_cut_energy',
        mean_radiometric_gradient_difference: 0.018,
        tile_url_template: '/api/v1/tiles/ortho/true/MOSAIC-DRONE-SL-2026/{z}/{x}/{y}.png',
        generated_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/byoc/buckets') && config.method === 'post' && url.includes('/sync')) data = {
        bucket_id: 'byoc-s3-drone-vault-01',
        status: 'ready',
        total_cogs_discovered: 24,
        total_valid_cogs: 24,
        synced_items: [
          {
            item_id: 'byoc-cog-sl-toe-01',
            bucket_id: 'byoc-s3-drone-vault-01',
            relative_path: 'surveys/san_luis/sl_toe_2cm.tif',
            file_size_bytes: 482000000,
            crs: 'EPSG:32610',
            bbox: [-121.085, 37.052, -121.065, 37.068],
            resolution_m: 0.025,
            band_count: 4,
            is_valid_cog: true
          }
        ],
        last_synced_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/byoc/buckets') && config.method === 'post') data = {
        bucket_id: 'byoc-s3-drone-vault-01',
        bucket_name: 'my-drone-surveys-bucket',
        provider: 'aws_s3',
        status: 'connected',
        registered_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/byoc/buckets')) data = [
        {
          bucket_id: 'byoc-s3-drone-vault-01',
          bucket_name: 'my-drone-surveys-bucket',
          provider: 'aws_s3',
          status: 'ready',
          registered_at: new Date().toISOString()
        }
      ];
      else if (url.includes('/api/v1/analysis/timeseries/mann-kendall') || url.includes('/api/v1/analysis/mann-kendall')) data = {
        metric_name: 'ndvi',
        sample_size: 24,
        s_statistic: -84.0,
        variance_s: 1610.0,
        z_score: -2.0686,
        p_value: 0.038584,
        kendall_tau: -0.3043,
        sens_slope: -0.0042,
        annual_change_rate: -0.0504,
        direction: 'decreasing',
        significance_tier: 'significant',
        is_significant: true,
        evaluated_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/atmospheric/dos1') || url.includes('/api/v1/analysis/dos1')) data = {
        item_id: 'S2A_MSIL2A_20260820T184211',
        model_applied: 'dos1',
        sun_zenith_deg: 35.0,
        earth_sun_distance_au: 1.0,
        band_haze_values: { blue: 0.042, green: 0.028, red: 0.019, nir: 0.008, swir1: 0.004, swir2: 0.002 },
        mean_surface_reflectance: { blue: 0.038, green: 0.052, red: 0.041, nir: 0.320, swir1: 0.142, swir2: 0.081 },
        atmospheric_transmittance: 1.0,
        corrected_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/change/cva') || url.includes('/api/v1/analysis/cva')) data = {
        pre_scene_id: 'S2A_MSIL2A_20250815',
        post_scene_id: 'S2A_MSIL2A_20260820',
        mean_magnitude: 0.245,
        max_magnitude: 0.682,
        magnitude_threshold: 0.15,
        changed_area_hectares: 184.5,
        changed_area_pct: 28.4,
        magnitude_tier: 'moderate_change',
        sector_breakdown: { vegetation_growth: 12.4, soil_drying: 45.2, water_inundation: 8.6, defoliation_burn: 33.8 },
        tile_url_template: '/api/v1/tiles/change/cva/S2A_MSIL2A_20250815/S2A_MSIL2A_20260820/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/soil/salinity') || url.includes('/api/v1/analysis/salinity')) data = {
        item_id: 'S2A_MSIL2A_20260820T184211',
        index_type: 'ndsi',
        mean_salinity_index: 0.112,
        saline_area_hectares: 86.4,
        saline_area_pct: 18.2,
        primary_hazard_tier: 'moderately_saline',
        hazard_tiers: [
          { tier: 'non_saline', label: 'Non-Saline (< 2 dS/m)', percentage: 62.4, hectares: 296.0 },
          { tier: 'slightly_saline', label: 'Slightly Saline (2-4 dS/m)', percentage: 19.4, hectares: 92.0 },
          { tier: 'moderately_saline', label: 'Moderately Saline (4-8 dS/m)', percentage: 12.2, hectares: 57.9 },
          { tier: 'strongly_saline', label: 'Strongly Saline (8-16 dS/m)', percentage: 4.8, hectares: 22.8 },
          { tier: 'extremely_saline', label: 'Extremely Saline (>= 16 dS/m)', percentage: 1.2, hectares: 5.7 }
        ],
        tile_url_template: '/api/v1/tiles/soil/salinity/sentinel-2-l2a/S2A_MSIL2A_20260820T184211/ndsi/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/thermal/hotspots') || url.includes('/api/v1/analysis/hotspots')) data = {
        item_id: 'LC09_L2SP_043034_20260820',
        total_hotspots_detected: 8,
        total_frp_mw: 142.8,
        mean_frp_mw: 17.85,
        max_brightness_temp_k: 368.5,
        high_confidence_count: 6,
        hotspots: [
          { lat: 37.058, lng: -121.074, t_mir_k: 368.5, t_tir_k: 312.4, delta_t_k: 56.1, frp_mw: 42.5, confidence: 'high' },
          { lat: 37.062, lng: -121.070, t_mir_k: 345.2, t_tir_k: 310.8, delta_t_k: 34.4, frp_mw: 28.1, confidence: 'high' }
        ],
        tile_url_template: '/api/v1/tiles/thermal/hotspots/landsat-c2-l2/LC09_L2SP_043034_20260820/{z}/{x}/{y}.png',
        detected_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/hazard/dam-breach') || url.includes('/api/v1/analysis/dam-breach')) data = {
        simulation_id: 'SIM-BREACH-2026-001',
        aoi_id: 'TAILINGS-DAM-04',
        failure_mode: 'piping_seepage',
        peak_breach_discharge_m3s: 14820.5,
        total_inundation_area_ha: 324.8,
        max_flood_depth_m: 35.0,
        wave_front_velocity_ms: 8.42,
        points: [
          { distance_km: 0.0, elevation_m: 220.0, max_depth_m: 35.0, peak_discharge_m3s: 14820.5, arrival_time_min: 0.0, velocity_ms: 8.42, hazard_tier: 'extreme_hazard' },
          { distance_km: 2.5, elevation_m: 182.5, max_depth_m: 18.2, peak_discharge_m3s: 13580.0, arrival_time_min: 4.9, velocity_ms: 6.85, hazard_tier: 'extreme_hazard' },
          { distance_km: 5.0, elevation_m: 145.0, max_depth_m: 9.8, peak_discharge_m3s: 12450.0, arrival_time_min: 10.2, velocity_ms: 5.40, hazard_tier: 'extreme_hazard' },
          { distance_km: 10.0, elevation_m: 70.0, max_depth_m: 4.2, peak_discharge_m3s: 10450.0, arrival_time_min: 22.5, velocity_ms: 4.10, hazard_tier: 'extreme_hazard' },
          { distance_km: 15.0, elevation_m: 35.0, max_depth_m: 2.1, peak_discharge_m3s: 8760.0, arrival_time_min: 36.8, velocity_ms: 3.20, hazard_tier: 'high_hazard' },
          { distance_km: 20.0, elevation_m: 15.0, max_depth_m: 1.1, peak_discharge_m3s: 7340.0, arrival_time_min: 52.4, velocity_ms: 2.45, hazard_tier: 'moderate_hazard' },
          { distance_km: 25.0, elevation_m: 5.0, max_depth_m: 0.45, peak_discharge_m3s: 6150.0, arrival_time_min: 69.2, velocity_ms: 1.80, hazard_tier: 'low_hazard' }
        ],
        hazard_summary: { extreme_hazard: 57.1, high_hazard: 14.3, moderate_hazard: 14.3, low_hazard: 14.3 },
        tile_url_template: '/api/v1/tiles/hazard/flood-inundation/SIM-BREACH-2026-001/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/hazard/landslide-susceptibility') || url.includes('/api/v1/analysis/landslide')) data = {
        aoi_id: 'SLOPE-SECTOR-01',
        static_fs: 1.145,
        critical_accel_g: 0.0681,
        newmark_displacement_cm: 6.84,
        runout_distance_m: 76.5,
        susceptibility_tier: 'high',
        hazard_probability: 0.65,
        failure_warning: true,
        tile_url_template: '/api/v1/tiles/hazard/landslide/SLOPE-SECTOR-01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/drought/vhi') || url.includes('/api/v1/analysis/vhi')) data = {
        item_id: 'S2A_MSIL2A_20260820T184211',
        mean_vci: 32.4,
        mean_tci: 24.8,
        mean_vhi: 28.6,
        drought_tier: 'moderate_drought',
        affected_area_ha: 142.5,
        affected_area_pct: 34.8,
        tier_breakdown: { extreme_drought: 5.2, severe_drought: 14.6, moderate_drought: 34.8, mild_drought: 26.4, no_drought: 19.0 },
        tile_url_template: '/api/v1/tiles/drought/vhi/sentinel-2-l2a/S2A_MSIL2A_20260820T184211/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/geology/sam') || url.includes('/api/v1/analysis/sam')) data = {
        target_endmember: 'pyrite',
        spectral_angle_rad: 0.0745,
        spectral_angle_deg: 4.27,
        is_match: true,
        match_confidence: 'high',
        similarity_score: 0.9526,
        classified_area_ha: 48.2,
        classified_area_pct: 14.6,
        tile_url_template: '/api/v1/tiles/geology/sam/sentinel-2-l2a/S2A_MSIL2A_20260820T184211/pyrite/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/vector/export')) data = {
        export_id: 'EXP-VEC-2026-901',
        layer_id: 'critical_infrastructure',
        format: 'geoparquet',
        feature_count: 142,
        file_size_bytes: 48520,
        download_url: '/api/v1/analysis/vector/export/EXP-VEC-2026-901/download',
        mime_type: 'application/vnd.apache.parquet',
        created_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/cryosphere/snow-cover') || url.includes('/analysis/snow-cover')) data = {
        collection: 'sentinel-2-l2a',
        item_id: 'S2A_MSIL2A_20260820T184211',
        model_type: 'salomonson_appel',
        ndsi: 0.625,
        fractional_snow_cover: 0.8962,
        fractional_snow_cover_pct: 89.62,
        runoff_hazard_tier: 'extreme_accumulation',
        estimated_swe_mm: 134.43,
        estimated_melt_volume_m3: 114265.5,
        transient_snowline_elevation_m: 2779.2,
        snow_covered_area_ha: 89.62,
        total_area_ha: 100.0,
        tile_url_template: '/api/v1/tiles/cryosphere/snow-cover/sentinel-2-l2a/S2A_MSIL2A_20260820T184211/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/water/turbidity-tsm') || url.includes('/analysis/turbidity-tsm')) data = {
        collection: 'sentinel-2-l2a',
        item_id: 'S2A_MSIL2A_20260820T184211',
        algorithm_used: 'dogliotti_switching',
        total_suspended_matter_g_m3: 20.03,
        turbidity_ntu: 13.97,
        hazard_tier: 'moderate_sediment',
        sediment_plume_detected: false,
        plume_area_ha: 37.5,
        plume_area_pct: 15.0,
        mean_water_reflectance_red: 0.045,
        mean_water_reflectance_nir: 0.015,
        tile_url_template: '/api/v1/tiles/water/turbidity-tsm/sentinel-2-l2a/S2A_MSIL2A_20260820T184211/turbidity/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/disturbance/breaks') || url.includes('/analysis/disturbance-breaks')) data = {
        metric_name: 'ndvi',
        model_used: 'bfast_lite',
        total_observations: 12,
        breakpoints_detected: 1,
        primary_break: {
          break_index: 7,
          break_date: '2026-06-15',
          pre_break_slope: 0.0125,
          post_break_slope: -0.0452,
          jump_magnitude: -0.215,
          p_value: 0.0035,
          significance_tier: 'critical_break',
          disturbance_type: 'abrupt_collapse'
        },
        all_breakpoints: [
          {
            break_index: 7,
            break_date: '2026-06-15',
            pre_break_slope: 0.0125,
            post_break_slope: -0.0452,
            jump_magnitude: -0.215,
            p_value: 0.0035,
            significance_tier: 'critical_break',
            disturbance_type: 'abrupt_collapse'
          }
        ],
        overall_disturbance_type: 'abrupt_collapse',
        structural_instability_detected: true,
        tile_url_template: '/api/v1/tiles/disturbance/breaks/sentinel-2-l2a/S2A_MSIL2A_20260820T184211/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/agriculture/cwsi') || url.includes('/analysis/cwsi')) data = {
        collection: 'landsat-c2-l2',
        item_id: 'LC09_L2SP_044033_20260818',
        model_used: 'empirical_idso',
        cwsi: 0.725,
        evaporative_fraction: 0.275,
        actual_et_mm_day: 1.38,
        water_stress_tier: 'severe_deficit',
        canopy_air_temp_diff_c: 6.2,
        lower_baseline_temp_diff_c: -0.7,
        upper_baseline_temp_diff_c: 5.0,
        irrigation_priority: 'high',
        tile_url_template: '/api/v1/tiles/agriculture/cwsi/landsat-c2-l2/LC09_L2SP_044033_20260818/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/mosaic/spline-blend') || url.includes('/analysis/spline-blend')) data = {
        mosaic_id: 'drone_mosaic_01',
        blend_mode: 'multiresolution_spline',
        pyramid_levels: 5,
        seam_transition_width_px: 64,
        mean_gradient_discontinuity_dn: 0.938,
        radiometric_quality: 'seamless',
        is_seamless: true,
        high_frequency_feather_px: 4.0,
        low_frequency_feather_px: 128.0,
        tile_url_template: '/api/v1/tiles/mosaic/spline/drone_mosaic_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/drone/direct-georeferencing') || url.includes('/drone/direct-georeferencing')) data = {
        mission_id: 'drone_mission_01',
        camera_latitude: 36.953215,
        camera_longitude: -121.082412,
        camera_altitude_m: 450.25,
        corrected_roll_deg: 0.125,
        corrected_pitch_deg: -0.450,
        corrected_yaw_deg: 89.850,
        flight_height_agl_m: 100.25,
        gsd_cm_px: 2.51,
        footprint_width_m: 150.38,
        footprint_height_m: 100.25,
        footprint_polygon: [
          [36.953665, -121.083256],
          [36.953665, -121.081568],
          [36.952765, -121.081568],
          [36.952765, -121.083256],
          [36.953665, -121.083256]
        ],
        horizontal_cep95_m: 0.042,
        quality_tier: 'survey_grade',
        tile_url_template: '/api/v1/tiles/drone/direct-georeferencing/drone_mission_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/geotechnical/crest-alignment') || url.includes('/geotechnical/crest-alignment')) data = {
        alignment_id: 'crest_tsf_01',
        total_length_m: 480.0,
        station_count: 25,
        design_elevation_m: 350.0,
        min_measured_elevation_m: 349.78,
        max_measured_elevation_m: 350.05,
        max_settlement_m: 0.22,
        mean_settlement_m: 0.085,
        worst_settlement_station: 'STA 2+60.00',
        overall_severity_tier: 'moderate_settlement',
        overtopping_risk_detected: false,
        stations: [
          {
            station_m: 0.0,
            station_code: 'STA 0+00.00',
            lat: 36.9540,
            lon: -121.0830,
            measured_elevation_m: 350.02,
            design_elevation_m: 350.0,
            settlement_m: 0.02,
            normal_azimuth_deg: 355.0,
            left_shoulder: [36.95405, -121.08301],
            right_shoulder: [36.95395, -121.08299],
            settlement_tier: 'normal'
          },
          {
            station_m: 260.0,
            station_code: 'STA 2+60.00',
            lat: 36.9552,
            lon: -121.0808,
            measured_elevation_m: 349.78,
            design_elevation_m: 350.0,
            settlement_m: -0.22,
            normal_azimuth_deg: 352.0,
            left_shoulder: [36.95525, -121.08081],
            right_shoulder: [36.95515, -121.08079],
            settlement_tier: 'moderate_settlement'
          }
        ],
        tile_url_template: '/api/v1/tiles/geotechnical/crest-alignment/crest_tsf_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/sar/ps-insar-stack') || url.includes('/sar/ps-insar-stack')) data = {
        stack_id: 'ps_stack_tsf_01',
        aps_filter_mode: 'spatiotemporal_gaussian',
        master_date: '2026-01-10',
        slave_count: 8,
        temporal_baseline_days: 250,
        total_candidates: 7,
        accepted_ps_count: 6,
        mean_temporal_coherence: 0.893,
        mean_los_velocity_mm_yr: -5.02,
        max_subsidence_mm_yr: -16.20,
        max_uplift_mm_yr: 0.40,
        overall_stability_tier: 'severe_subsidence',
        critical_subsidence_detected: true,
        ps_points: [
          {
            point_id: 'PS-CREST-01',
            lat: 36.9542,
            lon: -121.0821,
            elevation_m: 352.4,
            amplitude_dispersion: 0.18,
            temporal_coherence: 0.88,
            mean_velocity_mm_yr: -8.4,
            total_displacement_mm: -5.75,
            stability_tier: 'moderate_subsidence',
            time_series_displacements: [
              { date: '2026-01-10', days_from_master: 0, displacement_mm: 0.0, aps_phase_rad: 0.0 },
              { date: '2026-09-17', days_from_master: 250, displacement_mm: -5.75, aps_phase_rad: 1.303 }
            ]
          },
          {
            point_id: 'PS-CREST-02',
            lat: 36.9555,
            lon: -121.0805,
            elevation_m: 351.9,
            amplitude_dispersion: 0.21,
            temporal_coherence: 0.84,
            mean_velocity_mm_yr: -16.2,
            total_displacement_mm: -11.09,
            stability_tier: 'severe_subsidence',
            time_series_displacements: [
              { date: '2026-01-10', days_from_master: 0, displacement_mm: 0.0, aps_phase_rad: 0.0 },
              { date: '2026-09-17', days_from_master: 250, displacement_mm: -11.09, aps_phase_rad: 2.513 }
            ]
          }
        ],
        tile_url_template: '/api/v1/tiles/sar/ps-insar/ps_stack_tsf_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/geotechnical/soil-moisture') || url.includes('/geotechnical/soil-moisture')) data = {
        asset_id: 'TSF_DAM_04',
        collection: 'sentinel-1-rtc',
        item_id: 'S1A_IW_GRDH_1SDV_20260915',
        model_type: 'dubois',
        dielectric_permittivity_real: 14.85,
        volumetric_soil_moisture_m3m3: 0.2850,
        soil_moisture_percentage: 28.50,
        estimated_rms_roughness_cm: 1.50,
        pore_water_pressure_proxy_kpa: -12.45,
        hazard_tier: 'optimal_unsaturated',
        liquefaction_warning: false,
        tile_url_template: '/api/v1/tiles/geotechnical/soil-moisture/sentinel-1-rtc/S1A_IW_GRDH_1SDV_20260915/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/water/satellite-bathymetry') || url.includes('/water/satellite-bathymetry')) data = {
        asset_id: 'SAN_LUIS_RES_01',
        collection: 'sentinel-2-l2a',
        item_id: 'S2A_MSIL2A_20260815',
        model_type: 'stumpf_log_ratio',
        mean_depth_m: 18.42,
        max_depth_m: 35.42,
        estimated_volume_m3: 21500000.0,
        estimated_volume_acre_feet: 17430.3,
        design_capacity_m3: 25000000.0,
        siltation_volume_loss_m3: 3500000.0,
        siltation_loss_percentage: 14.0,
        estimated_remaining_years: 71.7,
        severity_tier: 'minor_siltation',
        critical_siltation_warning: false,
        tile_url_template: '/api/v1/tiles/water/bathymetry/sentinel-2-l2a/S2A_MSIL2A_20260815/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/geotechnical/gpr-profile') || url.includes('/geotechnical/gpr-profile')) data = {
        profile_id: 'GPR_CREST_TRANSECT_01',
        medium_type: 'embankment_fill',
        antenna_frequency_mhz: 400.0,
        em_wave_velocity_m_ns: 0.0925,
        max_penetration_depth_m: 5.55,
        total_stations_scanned: 76,
        anomalies_detected_count: 2,
        critical_void_detected: true,
        overall_severity: 'severe_piping_void',
        scan_stations: [
          { station_m: 0.0, twt_ns: 42.0, estimated_depth_m: 1.94, amplitude_mv: 52.0, reflection_coefficient: 0.08, anomaly_detected: false, anomaly_type: null, severity: 'nominal' },
          { station_m: 50.0, twt_ns: 45.0, estimated_depth_m: 2.08, amplitude_mv: 280.0, reflection_coefficient: 0.528, anomaly_detected: true, anomaly_type: 'void_cavity', severity: 'severe_piping_void' },
          { station_m: 104.0, twt_ns: 44.0, estimated_depth_m: 2.03, amplitude_mv: -195.0, reflection_coefficient: -0.272, anomaly_detected: true, anomaly_type: 'moisture_plume', severity: 'moderate_risk' }
        ],
        tile_url_template: '/api/v1/tiles/geotechnical/gpr/GPR_CREST_TRANSECT_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/structural/modal-vibration') || url.includes('/structural/modal-vibration')) data = {
        asset_id: 'OROVILLE_SPILLWAY_01',
        sensor_location: 'Crest Monolith 12 - Chute Station 4+20',
        method: 'peak_picking_fdd',
        sampling_rate_hz: 100.0,
        fundamental_frequency_hz: 3.01,
        frequency_shift_percentage: -5.94,
        peak_particle_velocity_mm_s: 8.40,
        usbm_limit_ppv_mm_s: 12.70,
        risk_tier: 'caution_monitoring',
        structural_damage_warning: false,
        frequency_drop_detected: false,
        modes: [
          { mode_index: 1, frequency_hz: 3.01, damping_ratio_pct: 2.9, peak_particle_velocity_mm_s: 8.40, mode_shape_description: '1st Transverse Monolith Bending', resonance_amplification_q: 17.2 },
          { mode_index: 2, frequency_hz: 8.28, damping_ratio_pct: 3.5, peak_particle_velocity_mm_s: 3.78, mode_shape_description: '2nd Vertical Chute Slab Flexure', resonance_amplification_q: 14.3 },
          { mode_index: 3, frequency_hz: 15.65, damping_ratio_pct: 4.8, peak_particle_velocity_mm_s: 1.85, mode_shape_description: '1st Torsional Abutment Coupling', resonance_amplification_q: 10.4 }
        ],
        tile_url_template: '/api/v1/tiles/structural/vibration/OROVILLE_SPILLWAY_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/ortho/true-orthorectification') || url.includes('/ortho/true-orthorectification')) data = {
        ortho_id: 'ORTHO_URBAN_HIGHRISE_01',
        dsm_source: 'lidar_dsm_1m',
        sensor_altitude_m: 650.0,
        ground_resolution_m: 0.05,
        total_building_polygons: 142,
        building_footprint_area_m2: 48500.0,
        occlusion_area_m2: 8950.0,
        occlusion_percentage: 18.45,
        shadow_occlusion_area_m2: 5200.0,
        shadow_occlusion_percentage: 10.72,
        max_building_displacement_m: 14.8,
        quality_tier: 'production_grade',
        secondary_fill_scenes: ['SCENE_ADJACENT_RUN_02', 'SCENE_CROSS_TIE_03'],
        unfilled_void_area_m2: 120.0,
        processing_duration_s: 3.42,
        tile_url_template: '/api/v1/tiles/ortho/true-ortho/ORTHO_URBAN_HIGHRISE_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/mosaic/graphcut-seamlines') || url.includes('/mosaic/graphcut-seamlines')) data = {
        mosaic_id: 'MOSAIC_REGIONAL_SEAM_01',
        input_scene_count: 4,
        scene_ids: ['SCENE_NORTH_01', 'SCENE_SOUTH_02', 'SCENE_EAST_03', 'SCENE_WEST_04'],
        cost_function: 'gradient_radiometric_hybrid',
        blend_method: 'multiresolution_spline',
        multiresolution_levels: 5,
        total_seamline_length_m: 4250.0,
        mean_gradient_magnitude: 0.082,
        mean_radiometric_difference_dn: 4.15,
        seamline_radiometric_tier: 'seamless_grade',
        segments: [
          { segment_id: 'SEAM_SEG_01', left_scene_id: 'SCENE_NORTH_01', right_scene_id: 'SCENE_SOUTH_02', length_m: 2150.0, mean_energy_cost: 0.075, max_energy_cost: 0.142, coordinates: [[-121.085, 37.052], [-121.082, 37.056], [-121.079, 37.060]] },
          { segment_id: 'SEAM_SEG_02', left_scene_id: 'SCENE_EAST_03', right_scene_id: 'SCENE_WEST_04', length_m: 2100.0, mean_energy_cost: 0.089, max_energy_cost: 0.165, coordinates: [[-121.080, 37.050], [-121.076, 37.055], [-121.072, 37.059]] }
        ],
        unblended_energy: 1420.5,
        optimized_energy: 348.2,
        energy_reduction_percentage: 75.49,
        processing_duration_s: 4.12,
        tile_url_template: '/api/v1/tiles/mosaic/graphcut-seamlines/MOSAIC_REGIONAL_SEAM_01/{z}/{x}/{y}.png',
        analyzed_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/preprocessing/brdf-nbar') || url.includes('/preprocessing/brdf-nbar')) data = {
        item_id: 'HLS.L30.T10SEH.2026210T184230.v2.0',
        platform: 'landsat_8',
        target_solar_zenith_deg: 45.0,
        target_view_zenith_deg: 0.0,
        observed_solar_zenith_deg: 32.5,
        observed_view_zenith_deg: 5.2,
        observed_relative_azimuth_deg: 64.0,
        kernel_model: 'ross_thick_li_sparse',
        normalization_tier: 'tier_1_nbar_calibrated',
        band_results: {
          blue: { f_iso: 0.0774, f_geo: 0.0079, f_vol: 0.0372, observed_reflectance: 0.082, c_factor: 0.985, nbar_reflectance: 0.0808 },
          green: { f_iso: 0.1306, f_geo: 0.0178, f_vol: 0.0580, observed_reflectance: 0.125, c_factor: 0.982, nbar_reflectance: 0.1228 },
          red: { f_iso: 0.1690, f_geo: 0.0227, f_vol: 0.0574, observed_reflectance: 0.158, c_factor: 0.981, nbar_reflectance: 0.1550 },
          nir: { f_iso: 0.3093, f_geo: 0.0330, f_vol: 0.1535, observed_reflectance: 0.342, c_factor: 0.978, nbar_reflectance: 0.3345 },
          swir1: { f_iso: 0.3430, f_geo: 0.0453, f_vol: 0.1154, observed_reflectance: 0.310, c_factor: 0.980, nbar_reflectance: 0.3038 },
          swir2: { f_iso: 0.2658, f_geo: 0.0387, f_vol: 0.0639, observed_reflectance: 0.220, c_factor: 0.982, nbar_reflectance: 0.2160 }
        },
        mean_relative_adjustment_pct: 1.95,
        max_relative_adjustment_pct: 2.20,
        shadow_attenuation_applied: false,
        tile_url_template: '/api/v1/tiles/preprocessing/brdf-nbar/HLS.L30.T10SEH.2026210T184230.v2.0/{z}/{x}/{y}.png',
        corrected_at: new Date().toISOString()
      };
      else if (url.includes('/api/v1/analysis/sar/sbas-stack') || url.includes('/sar/sbas-stack')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculateSbasNetworkInversion(parsed);
      }
      else if (url.includes('/api/v1/analysis/preprocessing/topographic-minnaert') || url.includes('/preprocessing/topographic-minnaert')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculateTopographicRadiometricCorrection(parsed);
      }
      else if (url.includes('/api/v1/ortho/tie-point-rpc') || url.includes('/ortho/tie-point-rpc')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculateRpcTiePointAlignment(parsed);
      }
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

/**
 * @typedef {Object} GCPCoordinate
 * @property {string} point_id - Unique GCP point identifier
 * @property {'control'|'check'} role - Survey network role
 * @property {'checkerboard'|'circular'|'cross'|'natural_feature'} target_type - Target geometry
 * @property {number} x_east - Easting X in meters
 * @property {number} y_north - Northing Y in meters
 * @property {number} z_elev - Elevation Z in meters
 * @property {string} [crs='EPSG:32610'] - Coordinate reference system
 * @property {number|null} [lat] - Optional WGS84 latitude
 * @property {number|null} [lng] - Optional WGS84 longitude
 * @property {boolean} [is_enabled=true] - Active flag
 */

/**
 * @typedef {Object} GCPResidual
 * @property {string} point_id - Point identifier
 * @property {'control'|'check'} role - Network role
 * @property {number} delta_x_m - Residual in X
 * @property {number} delta_y_m - Residual in Y
 * @property {number} delta_z_m - Residual in Z
 * @property {number} residual_horizontal_m - Planar horizontal error
 * @property {number} residual_3d_m - 3D Euclidean error
 * @property {number|null} [image_pixel_reprojection_error_px] - Reprojection error in px
 */

/**
 * @typedef {Object} RMSEMetrics
 * @property {number} rmse_x_m - RMSE in X
 * @property {number} rmse_y_m - RMSE in Y
 * @property {number} rmse_z_m - RMSE in Z
 * @property {number} rmse_horizontal_m - Horizontal RMSE
 * @property {number} rmse_3d_m - 3D RMSE
 * @property {number} point_count - Total points
 */

/**
 * @typedef {Object} CameraInteriorOrientation
 * @property {string} camera_id - Camera identifier
 * @property {number} focal_length_mm - Focal length in mm
 * @property {number} focal_length_px - Focal length in px
 * @property {number} principal_point_x_px - Principal point X
 * @property {number} principal_point_y_px - Principal point Y
 * @property {number} [radial_distortion_k1=0.0] - Distortion k1
 * @property {number} [radial_distortion_k2=0.0] - Distortion k2
 * @property {number} [radial_distortion_k3=0.0] - Distortion k3
 * @property {number} [tangential_distortion_p1=0.0] - Distortion p1
 * @property {number} [tangential_distortion_p2=0.0] - Distortion p2
 * @property {number} [sensor_width_mm=13.2] - Sensor width in mm
 * @property {number} [sensor_height_mm=8.8] - Sensor height in mm
 */

/**
 * @typedef {Object} GCPQualityAssessmentRequest
 * @property {string} ortho_id - Drone orthomosaic identifier
 * @property {Array<GCPCoordinate>} control_points - Surveyed points
 * @property {Array<Object>} estimated_positions - Estimated points
 * @property {CameraInteriorOrientation|null} [camera_calibration] - Camera calibration
 */

/**
 * @typedef {Object} GCPQualityAssessmentResponse
 * @property {string} ortho_id - Drone orthomosaic ID
 * @property {RMSEMetrics} control_rmse - Control point RMSE
 * @property {RMSEMetrics|null} [check_rmse] - Check point RMSE
 * @property {Array<GCPResidual>} residuals - Residual vectors
 * @property {boolean} survey_grade_achieved - Survey grade flag (3D RMSE <= 0.05m)
 * @property {CameraInteriorOrientation|null} [camera_calibration] - Camera calibration
 * @property {string} assessed_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} TWIAnalysisRequest
 * @property {string} asset_id - Infrastructure asset ID
 * @property {Object} [geometry] - GeoJSON Polygon
 * @property {string|number[]} [bbox] - Bounding box
 * @property {number} [grid_resolution_m=10.0] - Grid resolution in meters
 * @property {number} [min_slope_deg=0.1] - Minimum slope clamp
 */

/**
 * @typedef {Object} TWIAnalysisResponse
 * @property {string} asset_id - Target asset ID
 * @property {number} mean_twi - Mean TWI
 * @property {number} min_twi - Minimum TWI
 * @property {number} max_twi - Maximum TWI
 * @property {number} saturated_area_hectares - Saturated area in ha
 * @property {number} saturation_percentage - Percentage of area saturated
 * @property {string} tile_url_template - Streaming tile URL template
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} SlopeStabilityRequest
 * @property {string} asset_id - Target embankment asset ID
 * @property {Object} [geometry] - GeoJSON Polygon
 * @property {string|number[]} [bbox] - Bounding box
 * @property {number} [cohesion_kpa=12.0] - Effective soil cohesion in kPa
 * @property {number} [friction_angle_deg=30.0] - Internal friction angle
 * @property {number} [soil_unit_weight_kn_m3=19.0] - Moist soil unit weight
 * @property {number} [water_table_ratio=0.5] - Saturation ratio m
 * @property {number} [failure_depth_m=3.0] - Failure depth z
 */

/**
 * @typedef {Object} SlopeStabilityResponse
 * @property {string} asset_id - Embankment asset ID
 * @property {number} mean_factor_of_safety - Mean Factor of Safety
 * @property {number} min_factor_of_safety - Lowest Factor of Safety
 * @property {number} critical_area_hectares - Critical area in ha (FS <= 1.30)
 * @property {'stable'|'marginally_stable'|'advisory'|'failure_critical'} stability_tier - Stability tier
 * @property {Record<string, number>} tier_breakdown - Area breakdown per tier
 * @property {string} tile_url_template - Streaming tile URL template
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} HLSBandCalibrationRequest
 * @property {'landsat_oli'|'sentinel_msi'} source_platform - Source sensor platform
 * @property {'landsat_oli'|'sentinel_msi'} target_platform - Target sensor platform
 * @property {string} band_name - Spectral band name
 * @property {Array<number>} reflectance_values - Surface reflectance values
 */

/**
 * @typedef {Object} HLSBandCalibrationResponse
 * @property {'landsat_oli'|'sentinel_msi'} source_platform - Source platform
 * @property {'landsat_oli'|'sentinel_msi'} target_platform - Target platform
 * @property {string} band_name - Band name
 * @property {Array<number>} calibrated_values - Harmonized reflectance values
 * @property {number} mean_calibrated - Mean harmonized reflectance
 * @property {number} bias_correction_applied - Applied bias correction
 * @property {string} formula_applied - Formula string
 */

/**
 * @typedef {Object} WaterQualityAnalysisRequest
 * @property {string} asset_id - Reservoir or lake asset ID
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} item_id - Scene item ID
 * @property {Object} [geometry] - Optional GeoJSON Polygon
 * @property {string|number[]} [bbox] - Optional bounding box
 * @property {'ndci'|'ndti'|'fai'|'turbidity_fnu'|'chlorophyll_a_ugl'} [metric='ndci'] - Indicator
 */

/**
 * @typedef {Object} WaterQualityAnalysisResponse
 * @property {string} asset_id - Asset ID
 * @property {string} item_id - Scene item ID
 * @property {'ndci'|'ndti'|'fai'|'turbidity_fnu'|'chlorophyll_a_ugl'} primary_metric - Primary indicator
 * @property {number} mean_value - Mean metric value
 * @property {number} estimated_chlorophyll_a_ugl - Estimated Chl-a in ug/L
 * @property {'oligotrophic'|'mesotrophic'|'eutrophic'|'hypereutrophic'} dominant_trophic_state - Trophic state
 * @property {boolean} bloom_detected - Bloom threshold flag
 * @property {number} bloom_area_hectares - Bloom area in ha
 * @property {Array<{state: string, label: string, min_ndci: number|null, max_ndci: number|null, area_hectares: number, percentage: number, chl_a_range_ugl: string}>} trophic_breakdown - Breakdown
 * @property {string} tile_url_template - Dynamic XYZ tile template
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * Assesses Ground Control Point (GCP) and Check Point network accuracy for a drone orthomosaic.
 * 
 * @param {GCPQualityAssessmentRequest} params - GCP assessment parameters
 * @returns {Promise<GCPQualityAssessmentResponse>} Residual error vectors and RMSE metrics
 */
export const assessGcpQuality = async (params) => {
  const response = await giosApi.post('/api/v1/drone/gcp/quality', params);
  return response.data;
};

/**
 * Retrieves camera interior calibration parameters for a drone sensor.
 * 
 * @param {string} cameraId - Camera serial or instrument ID
 * @returns {Promise<CameraInteriorOrientation>} Camera interior calibration parameters
 */
export const fetchCameraCalibration = async (cameraId) => {
  const response = await giosApi.get(`/api/v1/drone/camera/calibration/${cameraId}`);
  return response.data;
};

/**
 * Calculates Topographic Wetness Index (TWI) over digital terrain.
 * 
 * @param {TWIAnalysisRequest} params - TWI analysis parameters
 * @returns {Promise<TWIAnalysisResponse>} TWI spatial statistics and tile template
 */
export const calculateTwiAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/terrain/twi', params);
  return response.data;
};

/**
 * Calculates geotechnical infinite slope stability Factor of Safety (FS).
 * 
 * @param {SlopeStabilityRequest} params - Slope stability parameters
 * @returns {Promise<SlopeStabilityResponse>} Factor of Safety metrics and tier breakdown
 */
export const calculateSlopeStability = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/terrain/slope-stability', params);
  return response.data;
};

/**
 * Harmonizes multi-sensor spectral reflectance values using HLS polynomial regressions.
 * 
 * @param {HLSBandCalibrationRequest} params - HLS calibration parameters
 * @returns {Promise<HLSBandCalibrationResponse>} Harmonized reflectance values
 */
export const calibrateHlsBand = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/hls/calibrate', params);
  return response.data;
};

/**
 * Analyzes reservoir water quality, turbidity, and cyanobacteria algal bloom status.
 * 
 * @param {WaterQualityAnalysisRequest} params - Water quality parameters
 * @returns {Promise<WaterQualityAnalysisResponse>} NDCI, Chl-a, and trophic state breakdown
 */
export const calculateWaterQualityAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/water-quality', params);
  return response.data;
};

/**
 * Retrieves the catalog of standard drone camera interior calibration presets.
 * 
 * @returns {Promise<Array<CameraInteriorOrientation>>} List of registered camera profiles
 */
export const fetchCameraCalibrationPresets = async () => {
  const response = await giosApi.get('/api/v1/drone/camera/calibration');
  return response.data;
};

/**
 * Retrieves standard geotechnical soil mechanics presets for slope stability analysis.
 * 
 * @returns {Promise<Array<Object>>} List of soil mechanics parameter presets
 */
export const fetchSoilPresets = async () => {
  const response = await giosApi.get('/api/v1/analysis/terrain/soil-presets');
  return response.data;
};

/**
 * Computes Land Surface Temperature (LST) and surface urban heat island metrics via radiometric transfer.
 * 
 * @param {Object} params - LST request parameters
 * @returns {Promise<Object>} Radiometric temperature results and heat hazard tier
 */
export const calculateLstRadiativeTransfer = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/lst/radiative-transfer', params);
  return response.data;
};

/**
 * Normalizes terrain illumination variations using solar angle and digital elevation models.
 * 
 * @param {Object} params - Topographic correction parameters
 * @returns {Promise<Object>} Illumination correction results and shadow coverage
 */
export const calculateTopographicCorrection = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/topographic-correction', params);
  return response.data;
};

/**
 * Computes millimetric ground displacement and velocity from SAR interferometric pairs (DInSAR).
 * 
 * @param {Object} params - InSAR displacement parameters
 * @returns {Promise<Object>} Line-of-sight displacement and deformation hazard tier
 */
export const calculateInSarDisplacement = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/insar/displacement', params);
  return response.data;
};

/**
 * Evaluates interferometric complex coherence and phase stability across SAR pairs.
 * 
 * @param {Object} params - InSAR coherence parameters
 * @returns {Promise<Object>} Coherence score and decorrelation breakdown
 */
export const calculateInSarCoherence = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/insar/coherence', params);
  return response.data;
};

/**
 * Fits multi-temporal harmonic series (HATS) to extract seasonal phenological markers.
 * 
 * @param {Object} params - Phenological extraction parameters
 * @returns {Promise<Object>} Phenometrics and fitted seasonal curve
 */
export const extractPhenologicalMetrics = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/phenology/extract', params);
  return response.data;
};

/**
 * Generates a Best Available Pixel (BAP) multi-temporal composite based on multi-criteria scoring.
 * 
 * @param {Object} params - BAP composite parameters
 * @returns {Promise<Object>} Composite metadata and dynamic tile template
 */
export const requestBapComposite = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/composites/bap', params);
  return response.data;
};

/**
 * @typedef {Object} CoRegistrationRequest
 * @property {string} reference_scene_id - Master reference scene ID
 * @property {string} target_scene_id - Slave scene ID to align
 * @property {number} [window_size_px=256] - Window size in pixels
 * @property {number} [grid_spacing_px=128] - Grid spacing in pixels
 * @property {'nearest'|'bilinear'|'cubic'|'cubicspline'|'lanczos'|'average'} [resampling_kernel='cubic'] - Resampling kernel
 * @property {number} [max_shift_px=15.0] - Maximum allowable shift
 * @property {number} [coherence_min=0.40] - Minimum coherence threshold
 * @property {Object} [bbox] - Spatial bounding box
 */

/**
 * @typedef {Object} CoRegistrationResponse
 * @property {string} reference_scene_id - Master reference scene ID
 * @property {string} target_scene_id - Slave target scene ID
 * @property {'converged'|'failed'|'low_coherence'|'sub_pixel_aligned'} status - Convergence status
 * @property {number} shift_x_px - Shift in X in pixels
 * @property {number} shift_y_px - Shift in Y in pixels
 * @property {number} shift_x_m - Shift in X in meters
 * @property {number} shift_y_m - Shift in Y in meters
 * @property {number} total_shift_m - Euclidean shift magnitude in meters
 * @property {number} rmse_px - Residual RMSE in pixels
 * @property {number} valid_tie_points - Valid tie point count
 * @property {string} resampling_applied - Applied resampling kernel
 * @property {string} aligned_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} PointFilterRequest
 * @property {string} point_cloud_id - Point cloud identifier
 * @property {'las'|'laz'|'copc'|'ept'} [format='copc'] - Format
 * @property {Object} [filter_params] - Morphological filter parameters
 * @property {Object} [bbox] - Spatial bounds
 */

/**
 * @typedef {Object} PointFilterResponse
 * @property {string} point_cloud_id - Point cloud ID
 * @property {number} total_points - Total point count
 * @property {number} ground_points - Ground point count
 * @property {number} non_ground_points - Non-ground point count
 * @property {number} ground_ratio_pct - Ground point percentage
 * @property {number} dtm_resolution_m - DTM grid resolution in meters
 * @property {string} classified_copc_url - Streaming COPC URL
 * @property {string} processed_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} CHMAnalysisRequest
 * @property {string} asset_id - Asset identifier
 * @property {string} dsm_item_id - DSM item ID
 * @property {string} dtm_item_id - DTM item ID
 * @property {number} [grid_resolution_m=1.0] - Cell size in meters
 * @property {Object} [bbox] - Spatial bounds
 */

/**
 * @typedef {Object} CHMAnalysisResponse
 * @property {string} asset_id - Asset ID
 * @property {number} mean_height_m - Mean height in meters
 * @property {number} max_height_m - Max height in meters
 * @property {number} vegetation_area_ha - Tall vegetation area in ha
 * @property {number} infrastructure_encroachment_ha - Encroachment area in ha
 * @property {Record<string, number>} height_percentiles - Height percentiles
 * @property {string} tile_url_template - Tile template URL
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} OcclusionMaskRequest
 * @property {string} ortho_id - Orthomosaic ID
 * @property {string} dsm_id - DSM ID
 * @property {number} [sun_zenith_deg=35.0] - Sun zenith angle
 * @property {number} [sun_azimuth_deg=135.0] - Sun azimuth angle
 * @property {number} [sensor_off_nadir_deg=5.0] - Sensor off-nadir angle
 * @property {Object} [bbox] - Spatial bounds
 */

/**
 * @typedef {Object} OcclusionMaskResponse
 * @property {string} ortho_id - Orthomosaic ID
 * @property {number} occluded_pixel_count - Blind pixel count
 * @property {number} occluded_area_pct - Occluded percentage
 * @property {boolean} true_ortho_ready - True ortho readiness
 * @property {string} evaluated_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} SeamlineOptimizationRequest
 * @property {Array<string>} granule_ids - Overlapping granule IDs
 * @property {'voronoi'|'dijkstra_shortest'|'graph_cut_energy'|'minimum_error_boundary'} [algorithm='graph_cut_energy'] - Algorithm
 * @property {'feather'|'multi_band_pyramid'|'no_blending'} [blending_mode='multi_band_pyramid'] - Blending mode
 * @property {number} [feather_buffer_px=15] - Feather buffer width in pixels
 * @property {Object} [bbox] - Spatial bounds
 */

/**
 * @typedef {Object} SeamlineOptimizationResponse
 * @property {string} mosaic_id - Mosaic ID
 * @property {number} seamline_count - Seamline count
 * @property {number} total_seamline_length_m - Total seamline length in meters
 * @property {string} algorithm_applied - Applied algorithm
 * @property {number} mean_radiometric_gradient_difference - Mean gradient energy
 * @property {string} tile_url_template - Tile template URL
 * @property {string} generated_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} BYOCBucketRegistrationRequest
 * @property {string} bucket_name - Bucket name
 * @property {'aws_s3'|'gcs'|'azure_blob'} [provider='aws_s3'] - Cloud provider
 * @property {string} [region='us-west-2'] - Cloud region
 * @property {string} [prefix] - Folder prefix
 * @property {string} [credentials_role_arn] - IAM role ARN
 * @property {string} display_name - Display label
 * @property {boolean} [is_public=false] - Public accessibility flag
 */

/**
 * @typedef {Object} BYOCBucketRegistrationResponse
 * @property {string} bucket_id - Bucket ID
 * @property {string} bucket_name - Bucket name
 * @property {string} provider - Cloud provider
 * @property {'connected'|'syncing'|'ready'|'access_denied'|'error'} status - Status
 * @property {string} registered_at - ISO 8601 timestamp
 */

/**
 * Executes automated sub-pixel geometric co-registration using Fourier phase correlation.
 * 
 * @param {CoRegistrationRequest} params - Co-registration parameters
 * @returns {Promise<CoRegistrationResponse>} Shift displacement and RMSE metrics
 */
export const requestCoRegistrationAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geometric/coregistration', params);
  return response.data;
};

/**
 * Classifies bare-earth ground points from 3D LiDAR/photogrammetric point clouds.
 * 
 * @param {PointFilterRequest} params - Point filter parameters
 * @returns {Promise<PointFilterResponse>} Classification statistics and COPC URL
 */
export const filterPointCloudGround = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/point-cloud/filter', params);
  return response.data;
};

/**
 * Calculates Canopy Height Model (CHM = DSM - DTM) and vegetation encroachment.
 * 
 * @param {CHMAnalysisRequest} params - CHM analysis parameters
 * @returns {Promise<CHMAnalysisResponse>} Height percentiles and streaming tile template
 */
export const calculateCanopyHeightModel = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/point-cloud/chm', params);
  return response.data;
};

/**
 * Evaluates visibility and occlusion blind spots for true orthorectification.
 * 
 * @param {OcclusionMaskRequest} params - Occlusion mask parameters
 * @returns {Promise<OcclusionMaskResponse>} Occlusion area percentage and readiness flag
 */
export const evaluateOrthorectificationOcclusion = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/ortho/occlusion', params);
  return response.data;
};

/**
 * Discovers and optimizes seamless mosaic cutlines via graph-cut energy minimization.
 * 
 * @param {SeamlineOptimizationRequest} params - Seamline parameters
 * @returns {Promise<SeamlineOptimizationResponse>} Optimized seamlines and tile template
 */
export const optimizeMosaicSeamlines = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/ortho/seamlines', params);
  return response.data;
};

/**
 * Connects an external AWS S3, GCS, or Azure Blob bucket containing Cloud-Optimized GeoTIFFs.
 * 
 * @param {BYOCBucketRegistrationRequest} params - Bucket registration parameters
 * @returns {Promise<BYOCBucketRegistrationResponse>} Registered bucket record
 */
export const registerByocBucket = async (params) => {
  const response = await giosApi.post('/api/v1/byoc/buckets', params);
  return response.data;
};

/**
 * Fetches the list of registered Bring Your Own COG cloud storage buckets.
 * 
 * @param {Object} [params={}] - Optional query filters
 * @returns {Promise<Array<Object>>} Registered BYOC buckets
 */
export const fetchByocBuckets = async (params = {}) => {
  const response = await giosApi.get('/api/v1/byoc/buckets', { params });
  return response.data;
};

/**
 * Triggers a catalog synchronization scan across an external BYOC storage bucket.
 * 
 * @param {string} bucketId - Bucket ID
 * @returns {Promise<Object>} Discovered and indexed COG assets
 */
export const syncByocBucketCatalog = async (bucketId) => {
  const response = await giosApi.post(`/api/v1/byoc/buckets/${bucketId}/sync`);
  return response.data;
};

/**
 * @typedef {Object} MannKendallAnalysisRequest
 * @property {Array<number>} values - Chronological time-series observation values
 * @property {Array<string>} [dates] - Optional ISO 8601 acquisition dates
 * @property {string} [metric_name='ndvi'] - Name of environmental metric
 * @property {number} [alpha=0.05] - Significance hypothesis test alpha level
 */

/**
 * @typedef {Object} MannKendallAnalysisResponse
 * @property {number} sample_size - Count of valid observations
 * @property {number} s_statistic - Mann-Kendall S statistic
 * @property {number} variance_s - Theoretical variance Var(S) with tie correction
 * @property {number} z_score - Standardized Z_MK score
 * @property {number} p_value - Two-tailed asymptotic p-value
 * @property {number} kendall_tau - Kendall rank correlation coefficient
 * @property {number} sens_slope - Sen's non-parametric median slope per timestep
 * @property {number} annual_change_rate - Estimated annualized change rate
 * @property {'increasing'|'decreasing'|'stable'} direction - Trend trajectory
 * @property {'not_significant'|'weakly_significant'|'significant'|'highly_significant'} significance_tier - Statistical significance tier
 * @property {boolean} is_significant - Whether p_value <= alpha
 */

/**
 * Executes non-parametric Mann-Kendall trend test and Sen's slope evaluation over time series.
 * 
 * @param {MannKendallAnalysisRequest} params - Mann-Kendall request parameters
 * @returns {Promise<MannKendallAnalysisResponse>} Test statistics (S, Var(S), Z, p-value, Sen's slope, significance)
 */
export const analyzeMannKendallTrend = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/timeseries/mann-kendall', params);
  return response.data;
};

/**
 * @typedef {Object} DOS1CorrectionRequest
 * @property {string} collection - Satellite collection identifier
 * @property {string} item_id - STAC Item ID
 * @property {Object} bands_dn - Map of band names to raw digital numbers
 * @property {number} [sun_elevation_deg=45.0] - Sun elevation angle in degrees
 * @property {number} [earth_sun_distance_au=1.0] - Earth-Sun distance in AU
 * @property {'dos1'|'dos2'|'dos3'|'dos4'|'apparent_reflectance'} [model='dos1'] - Atmospheric correction model
 */

/**
 * @typedef {Object} DOS1CorrectionResponse
 * @property {string} item_id - Target scene STAC ID
 * @property {string} model - Applied correction model
 * @property {number} sun_zenith_deg - Solar zenith angle in degrees
 * @property {Object} haze_path_radiance - Estimated dark-object path radiance per band
 * @property {Object} surface_reflectance - Calibrated Bottom-of-Atmosphere (BOA) surface reflectance
 * @property {string} processed_at - ISO 8601 timestamp
 */

/**
 * Executes Chavez (1988) Dark Object Subtraction (DOS1) atmospheric correction on satellite scene.
 * 
 * @param {DOS1CorrectionRequest} params - DOS1 request parameters
 * @returns {Promise<DOS1CorrectionResponse>} Atmospheric haze path radiance and BOA surface reflectance
 */
export const executeDos1Correction = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/atmospheric/dos1', params);
  return response.data;
};

/**
 * @typedef {Object} CVAAnalysisRequest
 * @property {string} pre_scene_id - Pre-event baseline STAC item ID
 * @property {string} post_scene_id - Post-event comparison STAC item ID
 * @property {Object} pre_bands - Pre-event surface reflectance values
 * @property {Object} post_bands - Post-event surface reflectance values
 * @property {number} [change_threshold=0.15] - Euclidean change magnitude cutoff
 */

/**
 * @typedef {Object} CVAAnalysisResponse
 * @property {string} pre_scene_id - Baseline scene ID
 * @property {string} post_scene_id - Comparison scene ID
 * @property {number} magnitude - Euclidean spectral change magnitude ||ΔR||
 * @property {number} direction_deg - Change trajectory vector angle in degrees
 * @property {number} delta_red - Change in red band reflectance
 * @property {number} delta_nir - Change in NIR band reflectance
 * @property {'soil_drying'|'vegetation_growth'|'water_inundation'|'defoliation_burn'} sector - Spectral quadrant sector
 * @property {'no_change'|'low_change'|'moderate_change'|'significant_change'|'extreme_change'} magnitude_tier - Change magnitude tier
 * @property {boolean} is_significant_change - Whether magnitude exceeds threshold
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 */

/**
 * Evaluates multi-spectral Change Vector Analysis (CVA) Euclidean magnitude and direction angles.
 * 
 * @param {CVAAnalysisRequest} params - CVA request parameters
 * @returns {Promise<CVAAnalysisResponse>} CVA change magnitude, affected area, and sector distribution
 */
export const analyzeChangeVector = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/change/cva', params);
  return response.data;
};

/**
 * @typedef {Object} SoilSalinityAnalysisRequest
 * @property {string} collection - Satellite collection identifier
 * @property {string} item_id - Target scene STAC ID
 * @property {number} blue - Blue band surface reflectance
 * @property {number} green - Green band surface reflectance
 * @property {number} red - Red band surface reflectance
 * @property {number} nir - NIR band surface reflectance
 */

/**
 * @typedef {Object} SoilSalinityAnalysisResponse
 * @property {string} item_id - Target scene STAC ID
 * @property {Object} indices - Computed salinity indices (ndsi, si1, si2, crsi)
 * @property {'non_saline'|'slightly_saline'|'moderately_saline'|'strongly_saline'|'extremely_saline'} hazard_tier - Agricultural salinity hazard tier
 * @property {string} hazard_label - Descriptive hazard label with ECe guidelines
 * @property {string} hazard_color - Hex color representation
 * @property {string} badge_class - Tailwind badge styling classes
 * @property {boolean} is_degraded - Whether soil exceeds degradation threshold (NDSI >= 0.0)
 * @property {string} tile_url_template - Dynamic XYZ tile URL template
 */

/**
 * Computes biophysical soil salinity indices (NDSI, SI-1, SI-2, CRSI) and land degradation hazard tiers.
 * 
 * @param {SoilSalinityAnalysisRequest} params - Soil salinity request parameters
 * @returns {Promise<SoilSalinityAnalysisResponse>} Salinity index distribution and agricultural hazard breakdown
 */
export const analyzeSoilSalinity = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/soil/salinity', params);
  return response.data;
};

/**
 * @typedef {Object} ThermalHotspotRequest
 * @property {string} [collection='landsat-c2-l2'] - Satellite collection
 * @property {string} item_id - Target scene STAC identifier
 * @property {Array<number>|Object} bbox - Target bounding box or GeoJSON geometry
 * @property {number} [min_temperature_k=310.0] - Minimum MIR brightness temperature cutoff in K
 * @property {number} [min_delta_t_k=10.0] - Minimum MIR - TIR temperature differential in K
 */

/**
 * @typedef {Object} ThermalHotspotResponse
 * @property {string} item_id - Target scene ID
 * @property {number} total_hotspots_detected - Total count of active thermal anomalies
 * @property {number} total_frp_mw - Total integrated Fire Radiative Power in Megawatts
 * @property {number} mean_frp_mw - Mean FRP per hotspot in Megawatts
 * @property {number} max_brightness_temp_k - Maximum detected MIR brightness temperature in Kelvin
 * @property {number} high_confidence_count - Number of hotspots rated as high confidence
 * @property {Array<Object>} hotspots - Georeferenced thermal hotspot anomalies
 * @property {string} tile_url_template - Dynamic XYZ tile URL pattern
 * @property {string} detected_at - ISO 8601 timestamp
 */

/**
 * Discovers active thermal fire hotspots and estimates Fire Radiative Power (FRP) in Megawatts.
 * 
 * @param {ThermalHotspotRequest} params - Thermal hotspot request parameters
 * @returns {Promise<ThermalHotspotResponse>} Hotspot anomalies list, total FRP, and maximum temperature
 */
export const detectThermalHotspotsAnalysis = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/thermal/hotspots', params);
  return response.data;
};

/**
 * @typedef {Object} DamBreachAnalysisRequest
 * @property {string} aoi_id - Target dam or tailings facility asset ID
 * @property {number} reservoir_volume_m3 - Total impounded reservoir volume in m^3
 * @property {number} breach_height_m - Height of impoundment in meters
 * @property {number} [downstream_slope=0.015] - Average valley slope gradient (m/m)
 * @property {number} [mannings_n=0.045] - Downstream channel roughness coefficient
 * @property {'overtopping'|'piping_seepage'|'foundation_slide'|'seismic_liquefaction'} [failure_mode='piping_seepage'] - Failure mode
 * @property {number} [simulation_distance_km=25.0] - Downstream reach length in km
 */

/**
 * @typedef {Object} DamBreachAnalysisResponse
 * @property {string} simulation_id - Unique simulation identifier
 * @property {string} aoi_id - Target asset ID
 * @property {string} failure_mode - Evaluated failure mode
 * @property {number} peak_breach_discharge_m3s - Maximum breach discharge at dam face via Froehlich (2008)
 * @property {number} total_inundation_area_ha - Estimated total flooded area in ha
 * @property {number} max_flood_depth_m - Maximum flood depth in meters
 * @property {number} wave_front_velocity_ms - Wave propagation speed in m/s
 * @property {Array<Object>} points - Downstream station hydrograph predictions
 * @property {Record<string, number>} hazard_summary - Inundation percentage per hazard tier
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Executes tailings dam breach flood wave runout simulation via Froehlich (2008) and Manning's hydraulics.
 * 
 * @param {DamBreachAnalysisRequest} params - Simulation parameters
 * @returns {Promise<DamBreachAnalysisResponse>} Peak discharge, flood wave propagation, and hazard zonation
 */
export const simulateDamBreachRunout = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/hazard/dam-breach', params);
  return response.data;
};

/**
 * @typedef {Object} LandslideSusceptibilityRequest
 * @property {number} slope_deg - Terrain surface slope angle in degrees
 * @property {number} [cohesion_kpa=12.5] - Effective soil cohesion c' in kPa
 * @property {number} [friction_angle_deg=32.0] - Internal friction angle phi' in degrees
 * @property {number} [soil_depth_m=3.5] - Potential slip surface depth in meters
 * @property {number} [pga_g=0.25] - Peak Ground Acceleration in g
 * @property {number} [water_table_ratio=0.40] - Phreatic surface saturation ratio m
 * @property {'seismic'|'rainfall'|'rapid_drawdown'|'excavation'} [trigger_type='seismic'] - Trigger type
 * @property {string} [aoi_id='SLOPE-SECTOR-01'] - Target slope asset ID
 */

/**
 * @typedef {Object} LandslideSusceptibilityResponse
 * @property {string} aoi_id - Target slope asset identifier
 * @property {number} static_fs - Static Factor of Safety
 * @property {number} critical_accel_g - Newmark critical yield acceleration a_c in g
 * @property {number} newmark_displacement_cm - Permanent co-seismic displacement in cm
 * @property {number} runout_distance_m - Estimated debris flow runout distance in meters
 * @property {'low'|'moderate'|'high'|'very_high'} susceptibility_tier - Landslide susceptibility tier
 * @property {number} hazard_probability - Failure probability (0.0 to 1.0)
 * @property {boolean} failure_warning - Whether slope exceeds safety intervention criteria
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates infinite slope limit equilibrium Factor of Safety, Newmark critical acceleration, and co-seismic displacement.
 * 
 * @param {LandslideSusceptibilityRequest} params - Slope stability request parameters
 * @returns {Promise<LandslideSusceptibilityResponse>} Factor of safety, Newmark displacement, and susceptibility tier
 */
export const assessLandslideSusceptibility = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/hazard/landslide-susceptibility', params);
  return response.data;
};

/**
 * @typedef {Object} DroughtAnalysisRequest
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} item_id - Target scene STAC identifier
 * @property {Array<number>|Object} [bbox] - Target bounding box or GeoJSON geometry
 * @property {number} [vci_weight=0.50] - Weight factor alpha for VCI
 * @property {number} [sample_ndvi=0.42] - Observed surface NDVI
 * @property {number} [sample_lst_c=32.5] - Observed Land Surface Temperature in Celsius
 * @property {number} [ndvi_min=0.15] - Climatological minimum multi-year NDVI
 * @property {number} [ndvi_max=0.75] - Climatological maximum multi-year NDVI
 * @property {number} [lst_min_c=18.0] - Climatological minimum multi-year LST
 * @property {number} [lst_max_c=42.0] - Climatological maximum multi-year LST
 */

/**
 * @typedef {Object} DroughtAnalysisResponse
 * @property {string} item_id - Target scene STAC identifier
 * @property {number} mean_vci - Vegetation Condition Index (VCI)
 * @property {number} mean_tci - Temperature Condition Index (TCI)
 * @property {number} mean_vhi - Vegetation Health Index (VHI)
 * @property {'no_drought'|'mild_drought'|'moderate_drought'|'severe_drought'|'extreme_drought'} drought_tier - Dominant drought tier
 * @property {number} affected_area_ha - Stressed area in hectares
 * @property {number} affected_area_pct - Percentage under drought stress
 * @property {Record<string, number>} tier_breakdown - Percentage distribution across drought tiers
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Kogan (1995) Vegetation Condition Index (VCI), Temperature Condition Index (TCI), and Vegetation Health Index (VHI).
 * 
 * @param {DroughtAnalysisRequest} params - Drought assessment request parameters
 * @returns {Promise<DroughtAnalysisResponse>} VCI, TCI, VHI indices, and drought severity classification
 */
export const analyzeDroughtVHI = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/drought/vhi', params);
  return response.data;
};

/**
 * @typedef {Object} SAMAnalysisRequest
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} item_id - Target scene STAC identifier
 * @property {'pyrite'|'chalcopyrite'|'goethite'|'hematite'|'kaolinite'|'calcite'|'acid_mine_drainage'} [target_endmember='pyrite'] - Target mineral
 * @property {number} [max_angle_rad=0.12] - Maximum angle cutoff in radians
 * @property {Array<number>|Object} [bbox] - Target bounding box or GeoJSON geometry
 * @property {Record<string, number>} [sample_pixel_reflectance] - Pixel reflectance vector
 * @property {Record<string, number>} [custom_endmember_reflectance] - Laboratory endmember vector
 */

/**
 * @typedef {Object} SAMAnalysisResponse
 * @property {string} target_endmember - Evaluated mineral endmember
 * @property {number} spectral_angle_rad - Spectral angle in radians
 * @property {number} spectral_angle_deg - Spectral angle in degrees
 * @property {boolean} is_match - Whether spectral angle is within cutoff
 * @property {'high'|'moderate'|'low'|'none'} match_confidence - Confidence tier
 * @property {number} similarity_score - Normalized similarity [0-1]
 * @property {number} classified_area_ha - Matching area in hectares
 * @property {number} classified_area_pct - Matching area percentage
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Kruse et al. (1993) Spectral Angle Mapper (SAM) for mineral and tailings identification.
 * 
 * @param {SAMAnalysisRequest} params - SAM request parameters
 * @returns {Promise<SAMAnalysisResponse>} Spectral angle, mineral match status, and classified area
 */
export const classifyMineralSAM = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geology/sam', params);
  return response.data;
};

/**
 * @typedef {Object} VectorExportRequest
 * @property {string} [layer_id='critical_infrastructure'] - Spatial vector layer ID
 * @property {'geojson'|'geoparquet'|'flatgeobuf'|'mvt_pbf'|'shapefile_zip'} [format='geoparquet'] - Output format
 * @property {Array<number>} [bbox] - Bounding box filter
 * @property {string} [filter_property] - Property key to filter
 * @property {string} [filter_value] - Property value to filter
 * @property {number} [simplify_tolerance_deg=0.0001] - Simplification tolerance
 */

/**
 * @typedef {Object} VectorExportResponse
 * @property {string} export_id - Unique export identifier
 * @property {string} layer_id - Target layer ID
 * @property {string} format - Delivered format
 * @property {number} feature_count - Total exported features
 * @property {number} file_size_bytes - File size in bytes
 * @property {string} download_url - Retrieval URL
 * @property {string} mime_type - Standard MIME content type
 * @property {string} created_at - ISO 8601 timestamp
 */

/**
 * Requests cloud-native GIS vector dataset export in GeoParquet, FlatGeobuf, GeoJSON, MVT, or Shapefile.
 * 
 * @param {VectorExportRequest} params - Vector export parameters
 * @returns {Promise<VectorExportResponse>} Export record with download URL and feature statistics
 */
export const exportVectorDataset = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/vector/export', params);
  return response.data;
};

/**
 * @typedef {Object} FractionalSnowCoverRequest
 * @property {string} [collection='sentinel-2-l2a'] - Sensor constellation
 * @property {string} item_id - Target scene identifier
 * @property {Array<number>} [bbox] - AOI bounding box
 * @property {'salomonson_appel'|'hall_modis'|'linear_ndsi'} [model_type='salomonson_appel'] - Sub-pixel FSC regression algorithm
 * @property {number} [green_band_reflectance] - Green reflectance (B03 / B3)
 * @property {number} [swir1_band_reflectance] - SWIR1 reflectance (B11 / B6)
 * @property {number} [elevation_m] - Terrain elevation in meters
 * @property {number} [snow_depth_m=0.5] - Estimated snow depth in meters
 * @property {number} [snow_density_kg_m3=300.0] - Snow density in kg/m³
 * @property {number} [runoff_coefficient=0.85] - Runoff yield coefficient
 */

/**
 * @typedef {Object} FractionalSnowCoverResponse
 * @property {string} collection - Sensor collection
 * @property {string} item_id - Scene identifier
 * @property {string} model_type - Model used
 * @property {number} ndsi - Normalized Difference Snow Index
 * @property {number} fractional_snow_cover - Sub-pixel snow fraction [0-1]
 * @property {number} fractional_snow_cover_pct - Sub-pixel snow percentage
 * @property {'trace_snow'|'low_snow'|'moderate_snow'|'deep_snowpack'|'extreme_accumulation'} runoff_hazard_tier - Runoff tier
 * @property {number} estimated_swe_mm - Snow Water Equivalent in mm
 * @property {number} estimated_melt_volume_m3 - Potential meltwater volume yield
 * @property {number|null} transient_snowline_elevation_m - Estimated snowline elevation in meters
 * @property {number} snow_covered_area_ha - Snow covered area in ha
 * @property {number} total_area_ha - Total evaluated area in ha
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Cryosphere Normalized Difference Snow Index (NDSI) and sub-pixel Fractional Snow Cover (FSC).
 * 
 * @param {FractionalSnowCoverRequest} params - Snow cover request parameters
 * @returns {Promise<FractionalSnowCoverResponse>} Sub-pixel snow cover and glacial melt runoff estimation
 */
export const analyzeFractionalSnowCover = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/cryosphere/snow-cover', params);
  return response.data;
};

/**
 * @typedef {Object} AquaticTurbidityRequest
 * @property {string} [collection='sentinel-2-l2a'] - Sensor constellation
 * @property {string} item_id - Target scene identifier
 * @property {Array<number>} [bbox] - AOI bounding box
 * @property {'nechad_red'|'nechad_nir'|'dogliotti_switching'|'empirical_ratio'} [algorithm='dogliotti_switching'] - Inversion algorithm
 * @property {number} [red_reflectance] - Water leaving Red reflectance (B04)
 * @property {number} [nir_reflectance] - Water leaving NIR reflectance (B08)
 * @property {number} [green_reflectance] - Water leaving Green reflectance (B03)
 * @property {number} [water_body_area_ha=250.0] - Water surface area in ha
 */

/**
 * @typedef {Object} AquaticTurbidityResponse
 * @property {string} collection - Sensor collection
 * @property {string} item_id - Scene identifier
 * @property {string} algorithm_used - Inversion algorithm
 * @property {number} total_suspended_matter_g_m3 - Total Suspended Matter in g/m³ (mg/L)
 * @property {number} turbidity_ntu - Turbidity in NTU/FNU
 * @property {'clear_oligotrophic'|'low_turbidity'|'moderate_sediment'|'high_turbidity'|'extreme_sediment_plume'} hazard_tier - Sediment hazard tier
 * @property {boolean} sediment_plume_detected - Plume detection flag
 * @property {number} plume_area_ha - Plume area in ha
 * @property {number} plume_area_pct - Plume area percentage
 * @property {number} mean_water_reflectance_red - Mean water red reflectance
 * @property {number} mean_water_reflectance_nir - Mean water nir reflectance
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Nechad et al. and Dogliotti et al. Total Suspended Matter (TSM) and Turbidity (NTU).
 * 
 * @param {AquaticTurbidityRequest} params - Aquatic turbidity request parameters
 * @returns {Promise<AquaticTurbidityResponse>} TSM concentration, turbidity, and sediment plume extent
 */
export const analyzeAquaticTurbidity = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/water/turbidity-tsm', params);
  return response.data;
};

/**
 * @typedef {Object} DisturbanceBreakRequest
 * @property {Array<string>} time_series_dates - Chronological dates
 * @property {Array<number>} time_series_values - Chronological trajectory values
 * @property {string} [metric_name='ndvi'] - Monitored biophysical metric
 * @property {'bfast_lite'|'landtrendr_segmentation'|'piecewise_linear'} [model='bfast_lite'] - Break detection algorithm
 * @property {number} [significance_alpha=0.05] - Significance threshold
 * @property {number} [min_segment_length=2] - Minimum observations per segment
 */

/**
 * @typedef {Object} DisturbanceBreakpoint
 * @property {number} break_index - Index of breakpoint
 * @property {string} break_date - Date of breakpoint
 * @property {number} pre_break_slope - Trajectory slope prior to break
 * @property {number} post_break_slope - Trajectory slope after break
 * @property {number} jump_magnitude - Step jump magnitude delta Y
 * @property {number} p_value - Test p-value
 * @property {'not_significant'|'advisory'|'significant'|'critical_break'} significance_tier - Significance tier
 * @property {'gradual_decline'|'abrupt_collapse'|'structural_disturbance'|'stable_trajectory'|'rapid_recovery'} disturbance_type - Disturbance type
 */

/**
 * @typedef {Object} DisturbanceBreakResponse
 * @property {string} metric_name - Evaluated metric
 * @property {string} model_used - Algorithm used
 * @property {number} total_observations - Total observations evaluated
 * @property {number} breakpoints_detected - Number of breakpoints detected
 * @property {DisturbanceBreakpoint|null} primary_break - Primary detected breakpoint
 * @property {Array<DisturbanceBreakpoint>} all_breakpoints - All identified breakpoints
 * @property {string} overall_disturbance_type - Overall trajectory classification
 * @property {boolean} structural_instability_detected - Instability warning flag
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates BFAST / LandTrendr piecewise linear breakpoint detection for abrupt structural disturbances.
 * 
 * @param {DisturbanceBreakRequest} params - Disturbance break detection parameters
 * @returns {Promise<DisturbanceBreakResponse>} Identified structural shifts, slopes, and hazard classification
 */
export const detectDisturbanceBreaks = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/disturbance/breaks', params);
  return response.data;
};

/**
 * @typedef {Object} CWSIAnalysisRequest
 * @property {string} [collection='landsat-c2-l2'] - Sensor constellation
 * @property {string} item_id - Target scene identifier
 * @property {Array<number>} [bbox] - AOI bounding box
 * @property {'empirical_idso'|'trapezoid_optical_thermal'|'energy_balance_sebal'} [model_type='empirical_idso'] - CWSI formulation
 * @property {number} [canopy_temperature_c] - Canopy temperature in Celsius
 * @property {number} [air_temperature_c=25.0] - Air temperature in Celsius
 * @property {number} [relative_humidity_pct=40.0] - Relative humidity percentage
 * @property {number} [vapor_pressure_deficit_kpa] - Vapor pressure deficit in kPa
 * @property {number} [ndvi=0.65] - Optical vegetation index
 * @property {number} [reference_et0_mm_day=5.0] - Reference evapotranspiration in mm/day
 */

/**
 * @typedef {Object} CWSIAnalysisResponse
 * @property {string} collection - Sensor collection
 * @property {string} item_id - Target scene ID
 * @property {string} model_used - Formulation used
 * @property {number} cwsi - Crop Water Stress Index [0-1]
 * @property {number} evaporative_fraction - Relative evaporative fraction (1 - CWSI)
 * @property {number} actual_et_mm_day - Actual evapotranspiration in mm/day
 * @property {'no_stress'|'mild_stress'|'moderate_stress'|'severe_deficit'|'extreme_desiccation'} water_stress_tier - Water stress category
 * @property {number} canopy_air_temp_diff_c - Differential Tc - Ta in Celsius
 * @property {number} lower_baseline_temp_diff_c - Non-stressed baseline
 * @property {number} upper_baseline_temp_diff_c - Max-stress baseline
 * @property {'low'|'moderate'|'high'|'critical'} irrigation_priority - Irrigation dispatch urgency
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Idso et al. and Moran et al. Crop Water Stress Index (CWSI) and evapotranspiration deficit.
 * 
 * @param {CWSIAnalysisRequest} params - CWSI request parameters
 * @returns {Promise<CWSIAnalysisResponse>} CWSI index, actual ET rate, and irrigation priority
 */
export const analyzeCropWaterStress = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/agriculture/cwsi', params);
  return response.data;
};

/**
 * @typedef {Object} PyramidSplineRequest
 * @property {string} [mosaic_id='drone_mosaic_01'] - Target mosaic identifier
 * @property {string} left_scene_id - First overlapping scene ID
 * @property {string} right_scene_id - Second overlapping scene ID
 * @property {'multiresolution_spline'|'poisson_gradient'|'distance_transform_feather'|'linear_feather'} [blend_mode='multiresolution_spline'] - Blending mode
 * @property {number} [pyramid_levels=5] - Number of Laplacian pyramid levels
 * @property {number} [seam_transition_width_px=64] - Seam transition width in pixels
 * @property {number} [left_mean_radiance] - Left scene radiance
 * @property {number} [right_mean_radiance] - Right scene radiance
 */

/**
 * @typedef {Object} PyramidSplineResponse
 * @property {string} mosaic_id - Mosaic identifier
 * @property {string} blend_mode - Algorithm used
 * @property {number} pyramid_levels - Pyramid levels
 * @property {number} seam_transition_width_px - Transition width in px
 * @property {number} mean_gradient_discontinuity_dn - Gradient discontinuity in DN
 * @property {'seamless'|'good_continuity'|'perceptible_discontinuity'|'severe_seam_artifact'} radiometric_quality - Radiometric continuity tier
 * @property {boolean} is_seamless - Whether seam is imperceptible (< 2 DN)
 * @property {number} high_frequency_feather_px - Narrow high-frequency blend width
 * @property {number} low_frequency_feather_px - Wide low-frequency blend width
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Burt & Adelson (1983) multi-resolution spline and Laplacian pyramid seamline blending.
 * 
 * @param {PyramidSplineRequest} params - Pyramid spline parameters
 * @returns {Promise<PyramidSplineResponse>} Seamline continuity metrics, frequency bands, and quality tier
 */
export const executePyramidSplineBlend = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/mosaic/spline-blend', params);
  return response.data;
};

/**
 * @typedef {Object} LeverArmOffset
 * @property {number} [lx_m=0.0] - Lateral offset in meters
 * @property {number} [ly_m=0.0] - Longitudinal offset in meters
 * @property {number} [lz_m=0.0] - Vertical offset in meters
 */

/**
 * @typedef {Object} BoresightAngles
 * @property {number} [d_roll_deg=0.0] - Differential roll misalignment in degrees
 * @property {number} [d_pitch_deg=0.0] - Differential pitch misalignment in degrees
 * @property {number} [d_yaw_deg=0.0] - Differential yaw misalignment in degrees
 */

/**
 * @typedef {Object} CameraSensorSpec
 * @property {number} [focal_length_mm=24.0] - Focal length in mm
 * @property {number} [sensor_width_mm=35.9] - Sensor width in mm
 * @property {number} [sensor_height_mm=24.0] - Sensor height in mm
 * @property {number} [image_width_px=6000] - Image width in pixels
 * @property {number} [image_height_px=4000] - Image height in pixels
 */

/**
 * @typedef {Object} DirectGeoreferencingRequest
 * @property {string} [mission_id='drone_mission_01'] - Mission identifier
 * @property {number} gnss_latitude - GNSS WGS84 latitude
 * @property {number} gnss_longitude - GNSS WGS84 longitude
 * @property {number} gnss_altitude_m - GNSS altitude ASL in meters
 * @property {number} [ground_elevation_m=0.0] - Ground elevation ASL in meters
 * @property {number} [roll_deg=0.0] - Aircraft roll angle in degrees
 * @property {number} [pitch_deg=0.0] - Aircraft pitch angle in degrees
 * @property {number} [yaw_deg=0.0] - Aircraft yaw / true heading in degrees
 * @property {LeverArmOffset} [lever_arm] - Antenna-to-camera body lever-arm offsets
 * @property {BoresightAngles} [boresight] - IMU-to-camera boresight misalignment angles
 * @property {CameraSensorSpec} [sensor_spec] - Camera optical parameters
 * @property {number} [gnss_uncertainty_m=0.02] - GNSS 1-sigma positioning uncertainty in meters
 * @property {number} [attitude_uncertainty_deg=0.01] - IMU 1-sigma attitude uncertainty in degrees
 */

/**
 * @typedef {Object} DirectGeoreferencingResponse
 * @property {string} mission_id - UAV mission identifier
 * @property {number} camera_latitude - Corrected perspective center latitude
 * @property {number} camera_longitude - Corrected perspective center longitude
 * @property {number} camera_altitude_m - Corrected perspective center altitude in meters
 * @property {number} corrected_roll_deg - Boresight-corrected camera roll angle
 * @property {number} corrected_pitch_deg - Boresight-corrected camera pitch angle
 * @property {number} corrected_yaw_deg - Boresight-corrected camera yaw angle
 * @property {number} flight_height_agl_m - Flight height AGL in meters
 * @property {number} gsd_cm_px - Mean ground sampling distance in cm/pixel
 * @property {number} footprint_width_m - Ground footprint width in meters
 * @property {number} footprint_height_m - Ground footprint height in meters
 * @property {Array<[number, number]>} footprint_polygon - Projected 4-corner footprint polygon
 * @property {number} horizontal_cep95_m - Estimated CEP95 horizontal uncertainty in meters
 * @property {'survey_grade'|'mapping_grade'|'reconnaissance_grade'|'uncorrected_navigation'} quality_tier - Accuracy classification
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Calibrates drone direct georeferencing, antenna lever-arm offsets, and IMU boresight misalignment.
 * 
 * @param {DirectGeoreferencingRequest} params - Drone direct georeferencing parameters
 * @returns {Promise<DirectGeoreferencingResponse>} Corrected camera pose, projected footprint, and CEP95 accuracy tier
 */
export const calibrateDirectGeoreferencing = async (params) => {
  const response = await giosApi.post('/api/v1/drone/direct-georeferencing', params);
  return response.data;
};

/**
 * @typedef {Object} CrestStationPoint
 * @property {number} station_m - Cumulative station distance in meters
 * @property {string} station_code - Engineering station notation (e.g. STA 12+40.00)
 * @property {number} lat - Station latitude
 * @property {number} lon - Station longitude
 * @property {number} measured_elevation_m - Measured ground elevation ASL
 * @property {number} design_elevation_m - Target as-built design crest elevation ASL
 * @property {number} settlement_m - Differential elevation delta
 * @property {number} normal_azimuth_deg - Perpendicular cross-section normal azimuth
 * @property {[number, number]} left_shoulder - WGS84 coordinate of left shoulder
 * @property {[number, number]} right_shoulder - WGS84 coordinate of right shoulder
 * @property {'normal'|'minor_settlement'|'moderate_settlement'|'critical_overtopping_risk'} settlement_tier - Risk tier
 */

/**
 * @typedef {Object} EmbankmentCrestRequest
 * @property {string} [alignment_id='crest_tsf_01'] - Crest identifier
 * @property {Array<[number, number, number]|Object>} centerline_points - Sequence of 3D centerline points
 * @property {number} [design_elevation_m=350.0] - Design crest elevation ASL in meters
 * @property {number} [station_interval_m=20.0] - Equidistant sampling interval in meters
 * @property {number} [crest_width_m=12.0] - Crest shoulder-to-shoulder width in meters
 */

/**
 * @typedef {Object} EmbankmentCrestResponse
 * @property {string} alignment_id - Embankment alignment identifier
 * @property {number} total_length_m - Total centerline length in meters
 * @property {number} station_count - Number of evaluated station cross-sections
 * @property {number} design_elevation_m - Nominal design crest elevation in meters
 * @property {number} min_measured_elevation_m - Minimum observed crest elevation in meters
 * @property {number} max_measured_elevation_m - Maximum observed crest elevation in meters
 * @property {number} max_settlement_m - Peak settlement loss in meters
 * @property {number} mean_settlement_m - Mean settlement loss across all stations in meters
 * @property {string} worst_settlement_station - Station code with maximum loss
 * @property {'normal'|'minor_settlement'|'moderate_settlement'|'critical_overtopping_risk'} overall_severity_tier - Overall crest integrity tier
 * @property {boolean} overtopping_risk_detected - Whether peak loss exceeds freeboard tolerance (>= 0.30m)
 * @property {Array<CrestStationPoint>} stations - Resampled station cross-sections
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates embankment crest centerline vectorization, normal cross-sections, and differential settlement.
 * 
 * @param {EmbankmentCrestRequest} params - Crest alignment parameters
 * @returns {Promise<EmbankmentCrestResponse>} Station profiles, normal cross-sections, and settlement tiers
 */
export const analyzeEmbankmentCrestAlignment = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/crest-alignment', params);
  return response.data;
};

/**
 * @typedef {Object} PSPointDisplacement
 * @property {string} point_id - Persistent scatterer target identifier
 * @property {number} lat - WGS84 latitude
 * @property {number} lon - WGS84 longitude
 * @property {number} elevation_m - Surface elevation ASL in meters
 * @property {number} amplitude_dispersion - Amplitude dispersion index D_A
 * @property {number} temporal_coherence - Multi-temporal phase coherence gamma
 * @property {number} mean_velocity_mm_yr - Linear Line-Of-Sight velocity in mm/year
 * @property {number} total_displacement_mm - Cumulative LOS displacement in mm
 * @property {'uplift'|'stable'|'slight_subsidence'|'moderate_subsidence'|'severe_subsidence'} stability_tier - Geotechnical stability tier
 * @property {Array<Object>} time_series_displacements - Chronological displacement measurements
 */

/**
 * @typedef {Object} PSInSARStackRequest
 * @property {string} [stack_id='ps_stack_tsf_01'] - SAR interferometric stack identifier
 * @property {string} [master_date='2026-01-10'] - Master acquisition date (YYYY-MM-DD)
 * @property {Array<string>} [slave_dates] - Slave acquisition dates
 * @property {'spatiotemporal_gaussian'|'spatial_lowpass_temporal_highpass'|'empirical_elevation_correction'|'external_weather_era5'} [aps_filter_mode='spatiotemporal_gaussian'] - APS filtering strategy
 * @property {number} [coherence_threshold=0.70] - Coherence acceptance threshold
 * @property {number} [dispersion_threshold=0.25] - Amplitude dispersion threshold
 * @property {number} [wavelength_m=0.055465] - Radar wavelength in meters
 * @property {number} [spatial_filter_radius_m=1500.0] - Spatial low-pass filter radius in meters
 * @property {Array<Object>} [ps_candidates] - Custom candidate PS targets
 */

/**
 * @typedef {Object} PSInSARStackResponse
 * @property {string} stack_id - SAR stack identifier
 * @property {string} aps_filter_mode - Applied APS filter algorithm
 * @property {string} master_date - Master acquisition date
 * @property {number} slave_count - Number of slave acquisitions processed
 * @property {number} temporal_baseline_days - Baseline duration in days
 * @property {number} total_candidates - Initial PS candidate count
 * @property {number} accepted_ps_count - Validated persistent scatterer count
 * @property {number} mean_temporal_coherence - Average phase coherence
 * @property {number} mean_los_velocity_mm_yr - Mean ground velocity in mm/year
 * @property {number} max_subsidence_mm_yr - Peak negative ground subsidence rate in mm/year
 * @property {number} max_uplift_mm_yr - Peak positive uplift rate in mm/year
 * @property {'uplift'|'stable'|'slight_subsidence'|'moderate_subsidence'|'severe_subsidence'} overall_stability_tier - Overall stability tier
 * @property {boolean} critical_subsidence_detected - Warning flag for subsidence (< -15 mm/yr)
 * @property {Array<PSPointDisplacement>} ps_points - Validated persistent scatterer monitoring points
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Processes multi-temporal PS-InSAR interferometric stack with spatiotemporal APS filtering.
 * 
 * @param {PSInSARStackRequest} params - PS-InSAR stack processing parameters
 * @returns {Promise<PSInSARStackResponse>} Validated PS points, millimetric LOS velocities, and stability classifications
 */
export const processPsInsarStack = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/sar/ps-insar-stack', params);
  return response.data;
};

/**
 * @typedef {Object} SoilMoistureInversionRequest
 * @property {string} [asset_id='TSF_DAM_04'] - Target geotechnical asset
 * @property {string} [collection='sentinel-1-rtc'] - SAR satellite collection
 * @property {string} [item_id='S1A_IW_GRDH_1SDV_20260915'] - Scene identifier
 * @property {'dubois'|'oh'|'topp_permittivity'|'smap_sentinel_synergy'} [model_type='dubois'] - Inversion model
 * @property {number} [sigma0_vv_db=-12.5] - Mean calibrated VV backscatter in dB
 * @property {number} [sigma0_hh_db] - Mean calibrated HH backscatter in dB
 * @property {number} [sigma0_vh_db] - Mean calibrated VH cross-pol backscatter in dB
 * @property {number} [incidence_angle_deg=38.5] - Local incidence angle in degrees
 * @property {number} [rms_roughness_cm=1.5] - RMS surface roughness in cm
 * @property {number} [radar_frequency_ghz=5.405] - Radar frequency in GHz
 * @property {number} [clay_fraction=0.25] - Soil clay fraction
 * @property {Object} [geometry] - AOI geometry
 * @property {Array<number>} [bbox] - Bounding box
 */

/**
 * @typedef {Object} SoilMoistureInversionResponse
 * @property {string} asset_id - Asset identifier
 * @property {string} collection - SAR source collection
 * @property {string} item_id - SAR scene identifier
 * @property {string} model_type - Applied model
 * @property {number} dielectric_permittivity_real - Real relative dielectric permittivity
 * @property {number} volumetric_soil_moisture_m3m3 - Volumetric soil moisture in m3/m3
 * @property {number} soil_moisture_percentage - Soil moisture in volumetric percent
 * @property {number} estimated_rms_roughness_cm - Effective RMS surface roughness in cm
 * @property {number} pore_water_pressure_proxy_kpa - Estimated suction proxy in kPa
 * @property {'desiccated_cracking'|'optimal_unsaturated'|'high_moisture_seepage'|'saturated_liquefaction_risk'} hazard_tier - Risk tier
 * @property {boolean} liquefaction_warning - High saturation warning flag
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Inverts relative dielectric permittivity and volumetric soil moisture from SAR backscatter.
 * 
 * @param {SoilMoistureInversionRequest} params - Soil moisture parameters
 * @returns {Promise<SoilMoistureInversionResponse>} Inverted permittivity and volumetric moisture
 */
export const invertSarSoilMoisture = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/soil-moisture', params);
  return response.data;
};

/**
 * @typedef {Object} SatelliteBathymetryRequest
 * @property {string} [asset_id='SAN_LUIS_RES_01'] - Reservoir identifier
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} [item_id='S2A_MSIL2A_20260815'] - Scene ID
 * @property {'stumpf_log_ratio'|'lyzenga_multispectral'|'radiative_transfer'} [model_type='stumpf_log_ratio'] - Inversion model
 * @property {number} [blue_reflectance=0.065] - Blue band reflectance
 * @property {number} [green_reflectance=0.042] - Green band reflectance
 * @property {number} [red_reflectance=0.018] - Red band reflectance
 * @property {number} [design_capacity_m3=25000000.0] - Design capacity in m3
 * @property {number} [design_max_depth_m=42.0] - Nominal peak depth in meters
 * @property {number} [surface_area_ha=180.0] - Surface area in hectares
 * @property {number} [calibration_m1=28.5] - Stumpf scaling factor
 * @property {number} [calibration_m0=18.2] - Stumpf offset
 */

/**
 * @typedef {Object} SatelliteBathymetryResponse
 * @property {string} asset_id - Asset identifier
 * @property {string} collection - Source collection
 * @property {string} item_id - Scene ID
 * @property {string} model_type - Model formulation
 * @property {number} mean_depth_m - Estimated mean bathymetric depth
 * @property {number} max_depth_m - Estimated peak bathymetric depth
 * @property {number} estimated_volume_m3 - Estimated active water storage volume in m3
 * @property {number} estimated_volume_acre_feet - Estimated storage in acre-feet
 * @property {number} design_capacity_m3 - Original design capacity in m3
 * @property {number} siltation_volume_loss_m3 - Cumulative sediment volume loss in m3
 * @property {number} siltation_loss_percentage - Siltation capacity loss percentage
 * @property {number} estimated_remaining_years - Projected years before dead storage exhaustion
 * @property {'nominal_capacity'|'minor_siltation'|'moderate_siltation'|'critical_storage_exhaustion'} severity_tier - Siltation severity
 * @property {boolean} critical_siltation_warning - Critical siltation flag
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Calculates satellite-derived bathymetry, remaining reservoir water volume, and siltation capacity loss.
 * 
 * @param {SatelliteBathymetryRequest} params - Bathymetric parameters
 * @returns {Promise<SatelliteBathymetryResponse>} Inverted depths, storage volume, and siltation tiers
 */
export const analyzeSatelliteBathymetry = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/water/satellite-bathymetry', params);
  return response.data;
};

/**
 * @typedef {Object} GPRScanStation
 * @property {number} station_m - Survey station distance in meters
 * @property {number} twt_ns - Two-way travel time in nanoseconds
 * @property {number} estimated_depth_m - Calculated depth in meters
 * @property {number} amplitude_mv - Reflected signal amplitude in mV
 * @property {number} reflection_coefficient - Fresnel reflection coefficient
 * @property {boolean} anomaly_detected - Whether anomalous contrast is present
 * @property {string|null} anomaly_type - Anomaly category
 * @property {'nominal'|'low_risk'|'moderate_risk'|'severe_piping_void'} severity - Severity tier
 */

/**
 * @typedef {Object} GPRProfileRequest
 * @property {string} [profile_id='GPR_CREST_TRANSECT_01'] - Profile identifier
 * @property {'dry_sand'|'wet_sand'|'compacted_clay'|'embankment_fill'|'bedrock'|'freshwater'} [medium_type='embankment_fill'] - Host material
 * @property {number} [antenna_frequency_mhz=400.0] - GPR antenna frequency in MHz
 * @property {number} [relative_permittivity=10.5] - Relative permittivity
 * @property {number} [max_time_window_ns=120.0] - Time window in ns
 * @property {number} [transect_length_m=150.0] - Survey length in meters
 * @property {number} [station_interval_m=2.0] - Sampling interval in meters
 */

/**
 * @typedef {Object} GPRProfileResponse
 * @property {string} profile_id - Profile identifier
 * @property {string} medium_type - Host material
 * @property {number} antenna_frequency_mhz - Antenna frequency
 * @property {number} em_wave_velocity_m_ns - EM wave velocity in m/ns
 * @property {number} max_penetration_depth_m - Peak depth in meters
 * @property {number} total_stations_scanned - Number of scan stations
 * @property {number} anomalies_detected_count - Number of detected anomalies
 * @property {boolean} critical_void_detected - Piping void warning flag
 * @property {'nominal'|'low_risk'|'moderate_risk'|'severe_piping_void'} overall_severity - Severity tier
 * @property {Array<GPRScanStation>} scan_stations - Scan station records
 * @property {string} tile_url_template - Dynamic XYZ radargram tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Inverts subsurface GPR geophysical profile to detect internal dam piping voids and seepage plumes.
 * 
 * @param {GPRProfileRequest} params - GPR profiling parameters
 * @returns {Promise<GPRProfileResponse>} Inverted velocity, depth section, and detected anomalies
 */
export const processGprProfile = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/gpr-profile', params);
  return response.data;
};

/**
 * @typedef {Object} VibrationMode
 * @property {number} mode_index - Mode order
 * @property {number} frequency_hz - Resonant frequency in Hz
 * @property {number} damping_ratio_pct - Damping ratio in percent
 * @property {number} peak_particle_velocity_mm_s - Peak particle velocity in mm/s
 * @property {string} mode_shape_description - Deformation description
 * @property {number} resonance_amplification_q - Dynamic quality factor Q
 */

/**
 * @typedef {Object} StructuralModalRequest
 * @property {string} [asset_id='OROVILLE_SPILLWAY_01'] - Asset identifier
 * @property {string} [sensor_location='Crest Monolith 12 - Chute Station 4+20'] - Sensor location
 * @property {'peak_picking_fdd'|'stochastic_subspace'|'eulerian_video_magnification'} [method='peak_picking_fdd'] - OMA method
 * @property {number} [sampling_rate_hz=100.0] - Sampling rate in Hz
 * @property {number} [duration_seconds=60.0] - Sampling duration in seconds
 * @property {number} [observed_ppv_mm_s=8.4] - Measured PPV in mm/s
 * @property {string} [excitation_source='high_discharge_hydraulic_flow'] - Excitation source
 * @property {number} [design_fundamental_freq_hz=3.2] - Design frequency in Hz
 */

/**
 * @typedef {Object} StructuralModalResponse
 * @property {string} asset_id - Asset identifier
 * @property {string} sensor_location - Location
 * @property {string} method - Applied identification method
 * @property {number} sampling_rate_hz - Sampling rate in Hz
 * @property {number} fundamental_frequency_hz - 1st fundamental frequency in Hz
 * @property {number} frequency_shift_percentage - Frequency delta from design baseline (%)
 * @property {number} peak_particle_velocity_mm_s - Measured peak particle velocity in mm/s
 * @property {number} usbm_limit_ppv_mm_s - Applicable USBM RI 8507 velocity limit
 * @property {'safe_ambient'|'caution_monitoring'|'cosmetic_cracking_risk'|'structural_damage_risk'} risk_tier - Vibration damage risk tier
 * @property {boolean} structural_damage_warning - Structural damage warning flag
 * @property {boolean} frequency_drop_detected - Stiffness loss warning flag
 * @property {Array<VibrationMode>} modes - Identified vibration modes
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates Operational Modal Analysis (OMA) and structural vibration damage risk.
 * 
 * @param {StructuralModalRequest} params - Structural vibration parameters
 * @returns {Promise<StructuralModalResponse>} Identified natural frequencies, damping, and damage risk
 */
export const analyzeStructuralModalVibration = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/structural/modal-vibration', params);
  return response.data;
};

/**
 * @typedef {Object} TrueOrthoZBufferRequest
 * @property {string} [ortho_id='ORTHO_URBAN_HIGHRISE_01'] - Orthomosaic identifier
 * @property {string} [dsm_source='lidar_dsm_1m'] - Source Digital Surface Model identifier
 * @property {number} [sensor_altitude_m=650.0] - Camera altitude above terrain in meters
 * @property {number} [sensor_pitch_deg=0.0] - Camera pitch angle in degrees
 * @property {number} [sensor_roll_deg=0.0] - Camera roll angle in degrees
 * @property {number} [sun_zenith_deg=35.0] - Sun zenith angle in degrees
 * @property {number} [sun_azimuth_deg=135.0] - Sun azimuth angle in degrees
 * @property {number} [ground_resolution_m=0.05] - Target true orthophoto GSD in meters
 * @property {number} [building_threshold_height_m=2.5] - Minimum elevation difference above DTM in meters
 * @property {string} [occlusion_mode='ray_tracing_zbuffer'] - Occlusion detection method
 * @property {Array<string>} [secondary_fill_scenes=[]] - Secondary image IDs for filling occluded blind spots
 */

/**
 * @typedef {Object} TrueOrthoZBufferResponse
 * @property {string} ortho_id - Orthomosaic identifier
 * @property {string} dsm_source - Source DSM identifier
 * @property {number} sensor_altitude_m - Sensor altitude in meters
 * @property {number} ground_resolution_m - Ground sampling distance in meters
 * @property {number} total_building_polygons - Detected above-ground structure count
 * @property {number} building_footprint_area_m2 - Total building footprint in m2
 * @property {number} occlusion_area_m2 - Total hidden perspective occlusion area in m2
 * @property {number} occlusion_percentage - Occlusion percentage relative to footprint
 * @property {number} shadow_occlusion_area_m2 - Cast shadow occlusion area in m2
 * @property {number} shadow_occlusion_percentage - Shadow occlusion percentage
 * @property {number} max_building_displacement_m - Maximum relief displacement in meters
 * @property {'research_grade'|'production_grade'|'advisory_voids'|'severe_occlusion_voids'} quality_tier - True ortho quality tier
 * @property {Array<string>} secondary_fill_scenes - Candidate secondary images utilized for texture inpainting
 * @property {number} unfilled_void_area_m2 - Persistent unfillable void area in m2
 * @property {number} processing_duration_s - Execution duration in seconds
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 evaluation timestamp
 */

/**
 * Executes True Orthorectification via Z-Buffer ray-tracing occlusion analysis.
 * 
 * @param {TrueOrthoZBufferRequest} params - True orthorectification parameters
 * @returns {Promise<TrueOrthoZBufferResponse>} Occlusion metrics, building lean displacement, and tile URL template
 */
export const analyzeTrueOrthoZBuffer = async (params) => {
  const response = await giosApi.post('/api/v1/ortho/true-orthorectification', params);
  return response.data;
};

/**
 * @typedef {Object} SeamlineSegment
 * @property {string} segment_id - Seam segment identifier
 * @property {string} left_scene_id - Primary adjacent scene
 * @property {string} right_scene_id - Secondary adjacent scene
 * @property {number} length_m - Segment ground distance in meters
 * @property {number} mean_energy_cost - Mean graph-cut transition energy
 * @property {number} max_energy_cost - Peak transition energy along segment
 * @property {Array<[number, number]>} coordinates - Seamline polyline coordinates [lon, lat]
 */

/**
 * @typedef {Object} GraphCutSeamlineRequest
 * @property {string} [mosaic_id='MOSAIC_REGIONAL_SEAM_01'] - Target mosaic job identifier
 * @property {Array<string>} [scene_ids=['SCENE_NORTH_01', 'SCENE_SOUTH_02']] - Contributing scene IDs
 * @property {'gradient_radiometric_hybrid'|'radiometric_difference'|'gradient_magnitude'|'chm_obstacle_penalty'|'salience_weighted'} [cost_function='gradient_radiometric_hybrid'] - Graph-cut energy cost formulation
 * @property {'multiresolution_spline'|'feather_linear'|'poisson_blending'|'laplacian_pyramid'} [blend_method='multiresolution_spline'] - Transition feathering method
 * @property {number} [multiresolution_levels=5] - Laplacian/Gaussian decomposition pyramid levels
 * @property {number} [feather_buffer_px=32] - Feathering transition buffer width in pixels
 * @property {number} [obstacle_penalty_weight=2.5] - Energy penalty multiplier for crossing tall structures or CHM obstacles
 */

/**
 * @typedef {Object} GraphCutSeamlineResponse
 * @property {string} mosaic_id - Mosaic job identifier
 * @property {number} input_scene_count - Number of input scenes
 * @property {Array<string>} scene_ids - Evaluated scene IDs
 * @property {string} cost_function - Energy cost formulation used
 * @property {string} blend_method - Radiometric transition blend method
 * @property {number} multiresolution_levels - Pyramid levels
 * @property {number} total_seamline_length_m - Total seamline length in meters
 * @property {number} mean_gradient_magnitude - Mean gradient along seam path
 * @property {number} mean_radiometric_difference_dn - Mean difference in DN across seam
 * @property {'seamless_grade'|'optimal_grade'|'visible_transitions'|'severe_radiometric_mismatch'} seamline_radiometric_tier - Seamline tier
 * @property {Array<SeamlineSegment>} segments - Computed seamline segments
 * @property {number} unblended_energy - Initial straight cut transition energy
 * @property {number} optimized_energy - Minimized graph-cut boundary energy
 * @property {number} energy_reduction_percentage - Percentage energy reduction
 * @property {number} processing_duration_s - Optimization duration in seconds
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 evaluation timestamp
 */

/**
 * Computes energy-minimizing multiresolution seamline networks using graph-cut optimization.
 * 
 * @param {GraphCutSeamlineRequest} params - Seamline optimization parameters
 * @returns {Promise<GraphCutSeamlineResponse>} Optimized seamline paths, energy reduction metrics, and tile URL template
 */
export const optimizeGraphCutSeamlines = async (params) => {
  const response = await giosApi.post('/api/v1/mosaic/graphcut-seamlines', params);
  return response.data;
};

/**
 * @typedef {Object} BRDFBandResult
 * @property {number} f_iso - Isotropic scattering kernel parameter
 * @property {number} f_geo - Li-Sparse geometric scattering kernel parameter
 * @property {number} f_vol - Ross-Thick volumetric scattering kernel parameter
 * @property {number} observed_reflectance - Raw observed TOA/BOA surface reflectance
 * @property {number} c_factor - BRDF NBAR conversion coefficient (C-factor)
 * @property {number} nbar_reflectance - Nadir BRDF-adjusted surface reflectance
 */

/**
 * @typedef {Object} BRDFNBARRequest
 * @property {string} [item_id='HLS.L30.T10SEH.2026210T184230.v2.0'] - Observation scene or tile identifier
 * @property {'landsat_8'|'landsat_9'|'sentinel_2a'|'sentinel_2b'|'modis'} [platform='landsat_8'] - Satellite sensor platform
 * @property {number} [target_solar_zenith_deg=45.0] - Target normalized solar zenith angle in degrees
 * @property {number} [target_view_zenith_deg=0.0] - Target view zenith angle in degrees (0.0 = nadir)
 * @property {number} [observed_solar_zenith_deg=35.0] - Actual observed solar zenith in degrees
 * @property {number} [observed_view_zenith_deg=6.5] - Actual observed view zenith in degrees
 * @property {number} [observed_relative_azimuth_deg=45.0] - Relative azimuth angle between solar and view azimuths in degrees
 * @property {'ross_thick_li_sparse'|'ross_thin_li_dense'|'roujean'|'walthall'} [kernel_model='ross_thick_li_sparse'] - BRDF semi-empirical kernel formulation
 * @property {Object<string, number>} [band_reflectance] - Dictionary of observed band surface reflectances
 * @property {boolean} [apply_shadow_attenuation=false] - Whether to apply terrain shadow attenuation
 */

/**
 * @typedef {Object} BRDFNBARResponse
 * @property {string} item_id - Scene or observation identifier
 * @property {string} platform - Sensor platform
 * @property {number} target_solar_zenith_deg - Target solar zenith angle
 * @property {number} target_view_zenith_deg - Target view zenith angle
 * @property {number} observed_solar_zenith_deg - Observed solar zenith angle
 * @property {number} observed_view_zenith_deg - Observed view zenith angle
 * @property {number} observed_relative_azimuth_deg - Observed relative azimuth angle
 * @property {string} kernel_model - Semi-empirical kernel model used
 * @property {'tier_1_nbar_calibrated'|'tier_2_moderate_view_angle'|'tier_3_high_view_angle'|'tier_4_extreme_zenith'} normalization_tier - Normalization tier
 * @property {Object<string, BRDFBandResult>} band_results - Per-band BRDF kernel parameters and NBAR reflectances
 * @property {number} mean_relative_adjustment_pct - Mean relative percentage correction across bands
 * @property {number} max_relative_adjustment_pct - Maximum relative percentage correction across bands
 * @property {boolean} shadow_attenuation_applied - Whether shadow attenuation was applied
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} corrected_at - ISO 8601 timestamp
 */

/**
 * Normalizes multi-angle surface reflectance to Nadir BRDF-Adjusted Reflectance (NBAR).
 * 
 * @param {BRDFNBARRequest} params - BRDF NBAR correction parameters
 * @returns {Promise<BRDFNBARResponse>} Corrected NBAR reflectances, C-factors, and tile URL template
 */
export const normalizeBrdfNbar = async (params) => {
  const response = await giosApi.post('/api/v1/preprocessing/brdf-nbar', params);
  return response.data;
};

/**
 * @typedef {Object} SBASInterferogramPair
 * @property {string} pair_id - Unique pair identifier
 * @property {string} primary_date - Master acquisition date (YYYY-MM-DD)
 * @property {string} secondary_date - Slave acquisition date (YYYY-MM-DD)
 * @property {number} perp_baseline_m - Perpendicular baseline in meters
 * @property {number} temporal_baseline_days - Temporal baseline in days
 * @property {number} mean_coherence - Mean coherence score
 * @property {number} [unwrapped_phase_rad=0.0] - Mean unwrapped phase in radians
 * @property {'accepted'|'exceeds_perp_baseline'|'exceeds_temporal_baseline'|'low_coherence'} status - Baseline gating status
 */

/**
 * @typedef {Object} SBASTimeSeriesEpoch
 * @property {string} date - Observation date (YYYY-MM-DD)
 * @property {number} days_from_start - Days elapsed from master epoch
 * @property {number} cumulative_displacement_mm - Cumulative LOS displacement in mm
 * @property {number} velocity_mm_yr - Deformation velocity in mm/yr
 * @property {number} rmse_mm - Residual uncertainty error in mm
 */

/**
 * @typedef {Object} SBASStackRequest
 * @property {string} [stack_id='SBAS_TSF_2026_STACK'] - InSAR stack dataset identifier
 * @property {string} [master_scene_id='S1A_IW_SLC__1SDV_20260115'] - Primary master acquisition scene ID
 * @property {string[]} [acquisition_dates] - Ordered array of acquisition dates
 * @property {SBASInterferogramPair[]} [candidate_pairs] - Optional custom candidate pairs
 * @property {number} [max_perp_baseline_m=200.0] - Maximum spatial baseline threshold
 * @property {number} [max_temporal_baseline_days=120] - Maximum temporal baseline threshold
 * @property {number} [coherence_threshold=0.35] - Coherence cutoff for pair inclusion
 * @property {'svd_least_squares'|'tikhonov_regularized'|'weighted_least_squares'} [inversion_method='svd_least_squares'] - Regularization method
 * @property {number} [wavelength_m=0.055465] - Radar carrier wavelength in meters
 * @property {number} [incidence_angle_deg=38.5] - Incidence angle in degrees
 */

/**
 * @typedef {Object} SBASStackResponse
 * @property {string} stack_id - Stack dataset identifier
 * @property {string} master_scene_id - Master scene identifier
 * @property {string} inversion_method - Applied inversion method
 * @property {number} num_acquisitions - Total acquisition dates count
 * @property {number} num_candidate_pairs - Candidate pairs count
 * @property {number} num_accepted_pairs - Accepted pairs count
 * @property {number} num_rejected_pairs - Rejected pairs count
 * @property {number} network_connectivity_rank - Inversion matrix rank
 * @property {boolean} is_network_connected - Whether graph is fully connected
 * @property {number} mean_coherence - Mean coherence of network
 * @property {number} mean_velocity_mm_yr - Mean deformation velocity
 * @property {number} max_subsidence_mm_yr - Maximum subsidence rate
 * @property {number} max_uplift_mm_yr - Maximum uplift rate
 * @property {string} deformation_tier - Deformation stability tier
 * @property {Object} [tier_metadata] - Tier badge styling and labels
 * @property {SBASTimeSeriesEpoch[]} time_series_epochs - Chronological displacement time series
 * @property {SBASInterferogramPair[]} interferogram_pairs - Evaluated interferograms
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} processed_at - ISO 8601 timestamp
 */

/**
 * Computes Small Baseline Subset (SBAS) multi-temporal InSAR deformation time series and velocity.
 * 
 * @param {SBASStackRequest} params - SBAS stack processing parameters
 * @returns {Promise<SBASStackResponse>} Displacement epochs, velocity fields, and tile URL template
 */
export const processSbasStack = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/sar/sbas-stack', params);
  return response.data;
};

/**
 * @typedef {Object} TopographicBandCorrection
 * @property {string} band - Band identifier
 * @property {number} observed_reflectance - Raw observed reflectance
 * @property {number} corrected_reflectance - Topographically corrected reflectance
 * @property {number} correction_factor - Multiplicative factor
 * @property {number|null} [minnaert_k] - Applied Minnaert exponent
 * @property {number|null} [c_parameter] - Applied C-parameter
 */

/**
 * @typedef {Object} TopographicMinnaertRequest
 * @property {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @property {string} [item_id='S2A_MSIL2A_20260815T183921'] - Observation granule identifier
 * @property {string} [dem_id='cop-dem-glo-30'] - DEM collection identifier
 * @property {'minnaert'|'c_correction'|'scs_plus_c'|'cosine_lambertian'} [method='minnaert'] - Correction model
 * @property {number} [solar_zenith_deg=36.5] - Solar zenith in degrees
 * @property {number} [solar_azimuth_deg=142.0] - Solar azimuth in degrees
 * @property {number} [slope_deg=24.5] - Terrain slope in degrees
 * @property {number} [aspect_deg=160.0] - Terrain aspect in degrees
 * @property {number} [minnaert_k=0.72] - Minnaert exponent k
 * @property {number} [c_parameter=0.18] - C-correction offset parameter
 * @property {string[]} [bands] - Target spectral bands
 * @property {Object<string, number>} [observed_reflectances] - Optional observed reflectances
 */

/**
 * @typedef {Object} TopographicMinnaertResponse
 * @property {string} collection - Satellite collection
 * @property {string} item_id - Granule identifier
 * @property {string} dem_id - DEM identifier
 * @property {string} method - Applied correction model
 * @property {number} solar_zenith_deg - Solar zenith angle
 * @property {number} solar_azimuth_deg - Solar azimuth angle
 * @property {number} slope_deg - Terrain slope
 * @property {number} aspect_deg - Terrain aspect
 * @property {number} local_incidence_angle_deg - Local incidence angle i
 * @property {number} cos_i - Cosine of incidence angle
 * @property {string} illumination_tier - Illumination tier
 * @property {Object} [tier_metadata] - Tier badge styling and labels
 * @property {Object<string, TopographicBandCorrection>} band_corrections - Per-band correction results
 * @property {number} mean_correction_factor - Mean factor across bands
 * @property {boolean} is_shadowed - Whether terrain is in self-shadow
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} normalized_at - ISO 8601 timestamp
 */

/**
 * Normalizes terrain slope-aspect radiometric illumination using Minnaert or C-correction.
 * 
 * @param {TopographicMinnaertRequest} params - Topographic illumination parameters
 * @returns {Promise<TopographicMinnaertResponse>} Normalized spectral reflectances and tile URL template
 */
export const correctTopographicMinnaert = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/preprocessing/topographic-minnaert', params);
  return response.data;
};

/**
 * @typedef {Object} RPCTiePoint
 * @property {string} point_id - Tie-point identifier
 * @property {number} image_col_px - Column coordinate in image
 * @property {number} image_row_px - Row coordinate in image
 * @property {number} reference_col_px - Master reference column
 * @property {number} reference_row_px - Master reference row
 * @property {number} correlation_score - NCC correlation score
 * @property {number} residual_px - Post-fit residual error in pixels
 * @property {boolean} inlier - Inlier status from RANSAC
 */

/**
 * @typedef {Object} RPCTiePointRequest
 * @property {string} [image_id='WV03_20260905_EXP01'] - Unaligned satellite image identifier
 * @property {string} [reference_ortho_id='REF_ORTHO_COMPOSITE_2026'] - Reference orthomosaic identifier
 * @property {string} [dem_id='cop-dem-glo-30'] - DEM identifier
 * @property {'translation_shift'|'affine_rpc_bias'|'second_order_polynomial'} [adjustment_model='affine_rpc_bias'] - Adjustment model
 * @property {number} [min_correlation_threshold=0.75] - Minimum NCC cutoff
 * @property {number} [ransac_threshold_px=1.5] - RANSAC inlier threshold in pixels
 * @property {number} [requested_tie_points=64] - Target tie-point count
 * @property {number} [ground_sampling_distance_m=0.31] - GSD in meters/pixel
 */

/**
 * @typedef {Object} RPCTiePointResponse
 * @property {string} image_id - Image identifier
 * @property {string} reference_ortho_id - Reference orthomosaic identifier
 * @property {string} adjustment_model - Applied model
 * @property {number} total_candidate_points - Candidate count
 * @property {number} inlier_tie_points - Inlier count
 * @property {number} outlier_points - Outlier count
 * @property {number} shift_col_px - Horizontal shift in pixels
 * @property {number} shift_row_px - Vertical shift in pixels
 * @property {number} scale_col - Horizontal scale factor
 * @property {number} scale_row - Vertical scale factor
 * @property {number} rotation_deg - Rotation angle in degrees
 * @property {number} rmse_prior_px - Pre-adjustment RMSE in pixels
 * @property {number} rmse_posterior_px - Post-adjustment RMSE in pixels
 * @property {number} rmse_posterior_meters - Post-adjustment RMSE in ground meters
 * @property {string} geometric_accuracy_tier - Accuracy tier
 * @property {Object} [tier_metadata] - Tier badge styling and labels
 * @property {RPCTiePoint[]} tie_points_sample - Representative tie-point matches
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} aligned_at - ISO 8601 timestamp
 */

/**
 * Refines Rational Polynomial Coefficients (RPCs) using automated sub-pixel tie points.
 * 
 * @param {RPCTiePointRequest} params - RPC refinement parameters
 * @returns {Promise<RPCTiePointResponse>} Inlier tie points, affine shifts, and tile URL template
 */
export const refineTiePointRpc = async (params) => {
  const response = await giosApi.post('/api/v1/ortho/tie-point-rpc', params);
  return response.data;
};

export default giosApi;





