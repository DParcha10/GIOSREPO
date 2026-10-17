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
  calculateRpcTiePointAlignment,
  calculateOdmStageProgress,
  calculateQualityMosaicPixelSelection,
  dispatchSimulatedHazardAlert,
  calculateDamBreakHydrodynamicSimulation,
  calculatePhreaticSurfaceSeepage,
  calculateSwrcInversionCurve,
  calculateBishopsSimplifiedFs,
  searchCriticalCircularSlipSurface,
  calculateGreenAmptInfiltration,
  calculateApparentThermalInertia,
  calculateTailingsLiquefactionAnalysis,
  calculateDynamicPorePressure,
  calculateVs30Proxy,
  calculateSptSoundingProfile,
  calculateFlowSlideRunoutDistance,
  calculatePostLiquefactionSettlementAnalysis,
  calculateAngularDistortion,
  calculateStratigraphicSettlement,
  calculateInSARDisplacementFusion,
  calculateClothSimulationFilter,
  calculateCutAndFillDifferencing,
  calculateCrestSlumpingProfile,
  calculateTopographicTransectDelta,
  calculateDroneEpipolarDifferential,
  calculateFroehlichBreachParameters,
  generateBreachOutflowHydrograph,
  calculateDeSaintVenantDownstreamRouting,
  calculateDamBreachInundationAnalysis,
  calculateInternalErosionPipingAnalysis,
  calculateInSARPersistentScattererAnalysis,
  decomposeDualOrbitInSARVelocities,
  calculateSarCoherenceLoss,
  calculateDamageProxyMappingAnalysis,
  calculatePhenologyDecompositionAnalysis,
  simulateSTACHarvesterCycle,
  solveGcpAffineTransform,
  calculateDroneFlightPlan,
  simulateNodeODMTaskProgression,
  validateBandMathFormula,
  evaluateBandMathFormula,
  parseBandMathAst,
  BAND_MATH_PRESETS,
  buildCustomExpressionTileUrlTemplate,
  calculateElevationTransectProfile,
  buildDemTileUrlTemplate,
  MGRS_GRANULE_PRESETS,
  MOSAIC_BLEND_METHOD_CONFIGS,
  SEAMLINE_TIER_CONFIGS,
  MGRS_TILE_DIMENSIONS,
  calculateMgrsGranuleOverlap,
  generateVrtXmlDefinition,
  buildMosaicTileUrlTemplate,
  buildMosaicFeatherTileUrlTemplate,
  buildMosaicSeamlineTileUrlTemplate,
  TEMPORAL_REDUCER_CONFIGS,
  TEMPORAL_QUALITY_TIER_CONFIGS,
  TEMPORAL_BENCHMARK_SCENES,
  buildTemporalCompositeTileUrlTemplate,
  buildTemporalQualityMosaicTileUrlTemplate,
  SPECKLE_FILTER_CONFIGS,
  SAR_POLARIZATION_CONFIGS,
  SAR_BACKSCATTER_CALIBRATIONS,
  SAR_FLOOD_TIER_CONFIGS,
  buildSarBackscatterTileUrlTemplate,
  buildSarSpeckleFilterTileUrlTemplate,
  buildSarFloodTileUrlTemplate,
  buildCoregistrationTileUrlTemplate,
  buildCoregistrationVectorFieldTileUrlTemplate,
  buildAquaticTileUrlTemplate,
  buildAquaticHabTileUrlTemplate,
  buildTopographicTileUrlTemplate,
  buildTopographicIlluminationTileUrlTemplate,
  HLS_BANDPASS_COEFFICIENTS,
  buildHlsTileUrlTemplate,
  buildHlsNbarTileUrlTemplate,
  calculateSobrinoFractionalVegetationCover,
  calculateSobrinoLandSurfaceEmissivity,
  classifyThermalAnomalySeverity,
  buildThermalLstTileUrlTemplate,
  buildThermalAnomalyTileUrlTemplate,
  ExportFormat,
  EXPORT_FORMATS,
  ExportJobStatus,
  EXPORT_JOB_STATUSES,
  ExportCrs,
  EXPORT_CRS_OPTIONS,
  ExportLayerType,
  EXPORT_LAYER_TYPES,
  EXPORT_FORMAT_CONFIGS,
  EXPORT_CRS_CONFIGS,
  EXPORT_LAYER_CONFIGS,
  EXPORT_BENCHMARK_SCENES,
  generateQgisIngestionSnippet,
  buildExportDownloadUrl,
  PHENOLOGY_BENCHMARK_SITES,
  PHENOLOGY_METRIC_CONFIGS,
  buildPhenologyTileUrl,
  SharpeningMethod,
  SHARPENING_METHODS,
  SharpeningTargetBand,
  SHARPENING_TARGET_BANDS,
  SharpeningGuidanceBand,
  SHARPENING_GUIDANCE_BANDS,
  SharpeningIndexTarget,
  SHARPENING_INDEX_TARGETS,
  HPFKernelType,
  HPF_KERNEL_TYPES,
  SharpeningQualityRating,
  SHARPENING_METHOD_CONFIGS,
  SHARPENING_BAND_CONFIGS,
  SYNTHETIC_PAN_WEIGHTS,
  HPF_KERNELS,
  SHARPENING_BENCHMARK_SCENES,
  normalizeSharpeningMethod,
  buildSharpenedTileUrlTemplate,
  SensorPlatform,
  SENSOR_PLATFORMS,
  CalibrationQualityRating,
  SENSOR_CALIBRATION_MODEL_CONFIGS,
  CROSS_SENSOR_BAND_COEFFICIENTS,
  CROSS_SENSOR_BENCHMARK_SCENES,
  CROSS_SENSOR_TILE_METRICS,
  normalizeSensorCalibrationModel,
  normalizeCrossSensorBand,
  applyCrossSensorBandCalibration,
  buildCrossCalibratedTileUrlTemplate,
  TrendModel,
  TREND_MODELS,
  TrendSignificanceClass,
  TREND_SIGNIFICANCE_CLASSES,
  TrendTileMetric,
  TREND_TILE_METRICS,
  TrendTargetIndex,
  TREND_TARGET_INDICES,
  TrendConfidenceRating,
  TREND_CONFIDENCE_RATINGS,
  TREND_MODEL_CONFIGS,
  TREND_SIGNIFICANCE_CONFIGS,
  TREND_BENCHMARK_SCENES,
  normalizeTrendModel,
  normalizeTrendMetric,
  normalizeTrendTargetIndex,
  calculateTheilSenSlope,
  calculateMannKendallStatistics,
  calculateYuePilonPrewhitening,
  classifyTrendSignificance,
  buildTrendTileUrl,
  buildTrendTileUrlTemplate
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
  buildTiePointRpcTileUrl,
  ODM_TASK_STATUSES,
  ODM_PROCESSING_STAGES,
  ODM_STAGE_CONFIGS,
  calculateOdmStageProgress,
  buildOdmTileUrl,
  QUALITY_MOSAIC_METHODS,
  QUALITY_MOSAIC_TIERS,
  QUALITY_MOSAIC_TIER_CONFIGS,
  classifyQualityMosaicTier,
  calculateQualityMosaicPixelSelection,
  buildQualityMosaicTileUrl,
  HAZARD_SEVERITY_TIERS,
  HAZARD_ALERT_TYPES,
  ALERT_DELIVERY_CHANNELS,
  ALERT_DELIVERY_STATUSES,
  HAZARD_SEVERITY_TIER_CONFIGS,
  HAZARD_ALERT_TYPE_CONFIGS,
  classifyHazardSeverityTier,
  dispatchSimulatedHazardAlert,
  BREACH_MECHANISMS,
  RHEOLOGY_MODELS,
  HAZARD_INTENSITY_TIERS,
  HAZARD_INTENSITY_TIER_CONFIGS,
  EVACUATION_URGENCY_TIERS,
  EVACUATION_URGENCY_TIER_CONFIGS,
  INFRASTRUCTURE_EXPOSURE_TYPES,
  INFRASTRUCTURE_EXPOSURE_CONFIGS,
  BREACH_MECHANISM_CONFIGS,
  calculateDamBreachPeakDischarge,
  classifyHazardIntensityTier,
  classifyEvacuationUrgency,
  calculateDownstreamWaveAttenuation,
  calculateInfrastructureVulnerabilityScore,
  calculateDamBreakHydrodynamicSimulation,
  buildDamBreakTileUrl,
  buildDamBreakTileUrlTemplate,
  SOIL_TEXTURE_TYPES,
  SEEPAGE_HAZARD_TIERS,
  PIEZOMETER_TYPES,
  PIEZOMETER_ANOMALY_STATUSES,
  SOIL_TEXTURE_CONFIGS,
  SEEPAGE_HAZARD_TIER_CONFIGS,
  PIEZOMETER_ANOMALY_CONFIGS,
  calculateVanGenuchtenSwrc,
  calculateSwrcInversionCurve,
  classifySeepageHazardTier,
  classifyPiezometerAnomaly,
  calculatePhreaticSurfaceSeepage,
  buildPhreaticSeepageTileUrl,
  buildPhreaticSeepageTileUrlTemplate,
  SLOPE_STABILITY_METHODS,
  SLOPE_HAZARD_TIERS,
  INSAR_CREEP_STATUSES,
  SLOPE_HAZARD_TIER_CONFIGS,
  INSAR_CREEP_CONFIGS,
  classifySlopeHazardTier,
  classifyInSARCreepStatus,
  calculateBishopsSimplifiedFs,
  calculateJanbuSimplifiedFs,
  searchCriticalCircularSlipSurface,
  buildGeotechnicalSlopeStabilityTileUrl,
  buildSlopeStabilityBishopTileUrl,
  buildGeotechnicalSlopeStabilityTileUrlTemplate,
  buildSlopeStabilityBishopTileUrlTemplate,
  INFILTRATION_PONDING_REGIMES,
  RAINFALL_HAZARD_TIERS,
  ATI_ANOMALY_CLASSES,
  GREEN_AMPT_SOIL_CONFIGS,
  RAINFALL_HAZARD_TIER_CONFIGS,
  ATI_ANOMALY_CONFIGS,
  classifyInfiltrationHazardTier,
  classifyAtiAnomaly,
  calculateFredlundApparentShearStrength,
  calculateGreenAmptInfiltration,
  calculateApparentThermalInertia,
  LIQUEFACTION_TRIGGER_MODES,
  LIQUEFACTION_HAZARD_TIERS,
  STATIC_BRITTLENESS_TIERS,
  LATERAL_SPREADING_HAZARD_TIERS,
  NEHRP_SITE_CLASSES,
  FLOW_SLIDE_MOBILITY_TIERS,
  LIQUEFACTION_HAZARD_CONFIGS,
  STATIC_BRITTLENESS_CONFIGS,
  LATERAL_SPREADING_CONFIGS,
  TAILINGS_LIQUEFACTION_CONFIGS,
  NEHRP_SITE_CLASS_CONFIGS,
  FLOW_SLIDE_MOBILITY_CONFIGS,
  classifyLiquefactionHazardTier,
  classifyStaticBrittlenessTier,
  classifyLateralSpreadingHazardTier,
  classifyNehrpSiteClass,
  classifyFlowSlideMobilityTier,
  calculateSeedIdrissCsr,
  calculateRobertsonCrr75,
  calculateLiquefactionFactorOfSafety,
  calculateMagnitudeScalingFactor,
  calculateSptN160cs,
  calculateSptCrr75,
  calculateVs30FromTopographicSlope,
  calculateVsCrr75,
  calculateVs30Proxy,
  calculateExcessPorePressureRatio,
  calculateDynamicPorePressure,
  calculateFlowSlideRunoutDistance,
  calculateSptSoundingProfile,
  calculateStaticFlowLiquefaction,
  calculateLateralSpreadingDisplacement,
  calculateTailingsLiquefactionAnalysis,
  buildLiquefactionTileUrl,
  buildLiquefactionTileUrlTemplate,
  SETTLEMENT_METHODS,
  ANGULAR_DISTORTION_HAZARD_TIERS,
  SETTLEMENT_HAZARD_TIERS,
  ANGULAR_DISTORTION_HAZARD_CONFIGS,
  SETTLEMENT_HAZARD_CONFIGS,
  SETTLEMENT_TILE_METRICS,
  calculateRelativeDensityFromSpt,
  calculatePostLiquefactionVolumetricStrain,
  classifyAngularDistortionHazardTier,
  classifySettlementHazardTier,
  calculateStratigraphicSettlement,
  calculateAngularDistortion,
  calculateInSARDisplacementFusion,
  calculateTimeConsolidationDissipation,
  calculatePostLiquefactionSettlementAnalysis,
  buildSettlementTileUrl,
  buildSettlementTileUrlTemplate,
  CUT_FILL_CALCULATION_MODES,
  TOPOGRAPHIC_DELTA_HAZARD_TIERS,
  CREST_SLUMP_HAZARD_TIERS,
  EPIPOLAR_DISPARITY_QUALITIES,
  TOPOGRAPHIC_DELTA_HAZARD_CONFIGS,
  CREST_SLUMP_HAZARD_CONFIGS,
  TOPOGRAPHIC_DELTA_TILE_METRICS,
  classifyTopographicDeltaHazardTier,
  classifyCrestSlumpHazardTier,
  classifyEpipolarDisparityQuality,
  calculateCutAndFillDifferencing,
  calculateCrestSlumpingProfile,
  calculateTopographicTransectDelta,
  calculateDroneEpipolarDifferential,
  buildTopographicElevationDeltaTileUrl,
  buildTopographicElevationDeltaTileUrlTemplate,
  BREACH_METHODOLOGIES,
  HYDRODYNAMIC_ROUTING_METHODS,
  INUNDATION_HAZARD_RATINGS,
  DAM_BREACH_MATERIAL_TYPES,
  DAM_BREACH_HAZARD_CONFIGS,
  BREACH_METHOD_CONFIGS,
  MANNING_ROUGHNESS_CONFIGS,
  HYDRODYNAMIC_TILE_METRICS,
  calculateFroehlichBreachParameters,
  calculateMacDonaldMonopolisBreachParameters,
  classifyInundationHazardRating,
  generateBreachOutflowHydrograph,
  calculateDeSaintVenantDownstreamRouting,
  calculateDamBreachInundationAnalysis,
  buildHydrodynamicTileUrl,
  buildHydrodynamicTileUrlTemplate,
  PipingFailureMechanism,
  SellmeijerSoilClassification,
  FlownetBoundaryCondition,
  InternalErosionHazardTier,
  INTERNAL_EROSION_HAZARD_CONFIGS,
  SELLMEIJER_SOIL_PRESETS,
  FLOWNET_TILE_METRICS,
  calculateTerzaghiCriticalGradient,
  calculateSellmeijerCriticalHead,
  calculateSeepageFlownetPotentialGrid,
  classifyInternalErosionHazardTier,
  calculateInternalErosionPipingAnalysis,
  buildFlownetTileUrl,
  buildFlownetTileUrlTemplate
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
      else if (url.includes('/api/v1/analysis/export/request') || url.includes('/analysis/export/request')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const jobId = `EXP-JOB-${Date.now()}`;
        const format = parsed.format || 'geotiff_cog';
        const layerType = parsed.layer_type || 'surface_reflectance';
        const collection = parsed.collection || 'sentinel-2-l2a';
        const crs = parsed.target_crs || 'EPSG:4326';
        const bbox = parsed.aoi_bbox ? [parsed.aoi_bbox.min_lon || -122.52, parsed.aoi_bbox.min_lat || 37.70, parsed.aoi_bbox.max_lon || -122.35, parsed.aoi_bbox.max_lat || 37.85] : [-122.52, 37.70, -122.35, 37.85];
        data = {
          job_id: jobId,
          status: 'queued',
          progress_pct: 0.0,
          message: 'Asynchronous geospatial export job queued for processing',
          request: {
            aoi_bbox: { min_lon: bbox[0], min_lat: bbox[1], max_lon: bbox[2], max_lat: bbox[3] },
            format,
            layer_type: layerType,
            collection,
            target_crs: crs,
            resolution_m: parsed.resolution_m || 10.0
          },
          download_url: `/api/v1/analysis/export/download/${jobId}`,
          created_at: new Date().toISOString()
        };
      }
      else if (url.includes('/api/v1/analysis/export/status') || url.includes('/analysis/export/status')) {
        const parts = url.split('/');
        const jobId = parts[parts.length - 1] || 'EXP-JOB-2026-001';
        data = {
          job_id: jobId,
          status: 'completed',
          progress_pct: 100.0,
          message: 'Export artifact generated successfully and ready for ingestion',
          request: {
            aoi_bbox: { min_lon: -122.52, min_lat: 37.70, max_lon: -122.35, max_lat: 37.85 },
            format: 'geotiff_cog',
            layer_type: 'surface_reflectance',
            collection: 'sentinel-2-l2a',
            target_crs: 'EPSG:4326',
            resolution_m: 10.0
          },
          artifact: {
            filename: `gios_sentinel_2_l2a_surface_reflectance_${jobId}.tif`,
            format: 'geotiff_cog',
            mime_type: 'image/tiff; application=geotiff',
            file_size_bytes: 8388608,
            crs: 'EPSG:4326',
            width_px: 1512,
            height_px: 1670,
            band_count: 4,
            affine_transform: [0.00008983, 0.0, -122.52, 0.0, -0.00008983, 37.85],
            bbox: [-122.52, 37.70, -122.35, 37.85],
            checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            qgis_instructions: generateQgisIngestionSnippet(`gios_sentinel_2_l2a_surface_reflectance_${jobId}.tif`, 'geotiff_cog', 'EPSG:4326')
          },
          download_url: `/api/v1/analysis/export/download/${jobId}`,
          created_at: new Date(Date.now() - 15000).toISOString(),
          completed_at: new Date().toISOString(),
          execution_time_seconds: 14.8
        };
      }
      else if (url.includes('/api/v1/analysis/export/download') || url.includes('/analysis/export/download')) {
        const parts = url.split('/');
        const jobId = parts[parts.length - 1] || 'EXP-JOB-2026-001';
        data = new Blob(['mock GeoTIFF binary byte array content for ' + jobId], { type: 'image/tiff' });
      }
      else if (url.includes('/api/v1/analysis/export/formats') || url.includes('/analysis/export/formats')) {
        data = {
          formats: EXPORT_FORMAT_CONFIGS,
          crs_options: EXPORT_CRS_CONFIGS,
          layer_types: EXPORT_LAYER_CONFIGS,
          benchmark_scenes: EXPORT_BENCHMARK_SCENES
        };
      }
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
      else if (url.includes('/api/v1/drone/odm-tasks') || url.includes('/drone/odm-tasks')) {
        if (config.method === 'get') {
          const parts = url.split('?')[0].split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart !== 'odm-tasks') {
            data = calculateOdmStageProgress('orthophoto_mosaicing', 180.0, 120, 2.5);
            data.task_id = lastPart;
          } else {
            const task1 = calculateOdmStageProgress('orthophoto_mosaicing', 180.0, 120, 2.5);
            const task2 = calculateOdmStageProgress('completed', 420.0, 150, 2.0);
            task2.task_id = 'ODM_TASK_20261001_002';
            task2.project_name = 'Spillway_Drone_Inspection_2026';
            data = {
              total_count: 2,
              tasks: [task1, task2]
            };
          }
        } else {
          let parsed = {};
          try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
          data = calculateOdmStageProgress(parsed.stage || 'dataset_initialization', 120.0, parsed.image_count || parsed.imageCount || 120, parsed.gsd_target_cm || parsed.gsdTargetCm || 2.5);
        }
      }
      else if (url.includes('/api/v1/mosaic/quality-mosaic') || url.includes('/mosaic/quality-mosaic')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculateQualityMosaicPixelSelection(parsed);
      }
      else if (url.includes('/api/v1/alerts/subscriptions') || url.includes('/alerts/subscriptions')) {
        if (config.method === 'get') {
          data = [
            {
              subscription_id: 'SUB_WEBHOOK_001',
              recipient_name: 'Geotechnical Monitoring Center',
              channel: 'webhook',
              status: 'active',
              hazard_types: ['tailings_crest_deformation', 'embankment_seepage_saturation'],
              created_at: new Date().toISOString()
            },
            {
              subscription_id: 'SUB_SSE_002',
              recipient_name: 'Dam Safety Control Room',
              channel: 'sse_stream',
              status: 'active',
              hazard_types: ['sudden_reservoir_drawdown', 'landslide_slope_instability'],
              created_at: new Date().toISOString()
            }
          ];
        } else {
          let parsed = {};
          try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
          data = {
            subscription_id: parsed.subscription_id || parsed.subscriptionId || 'SUB_WEBHOOK_001',
            recipient_name: parsed.recipient_name || parsed.recipientName || 'Geotechnical Monitoring Center',
            channel: parsed.channel || 'webhook',
            status: 'active',
            created_at: new Date().toISOString()
          };
        }
      }
      else if (url.includes('/api/v1/alerts/dispatch') || url.includes('/alerts/dispatch')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = dispatchSimulatedHazardAlert(parsed);
      }
      else if (url.includes('/api/v1/analysis/geotechnical/dam-break-hydrodynamics') || url.includes('/geotechnical/dam-break-hydrodynamics')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculateDamBreakHydrodynamicSimulation(parsed);
      }
      else if (url.includes('/evacuation-corridors')) {
        data = [
          {
            corridor_id: 'EVAC_NORTH_RIDGE',
            name: 'North Ridge High-Ground Evacuation Spine',
            assembly_point: 'Muster Station Echo (El. 785m)',
            safe_elevation_m: 785.0,
            buffer_distance_m: 150.0,
            estimated_evacuation_time_min: 18.0,
            route_status: 'open',
            coordinates: [[-44.1184, -20.1184], [-44.1114, -20.1054], [-44.1034, -20.0954]]
          },
          {
            corridor_id: 'EVAC_SOUTH_PLATEAU',
            name: 'South Valley Plateau Highway Egress',
            assembly_point: 'Civil Defense Center Bravo (El. 740m)',
            safe_elevation_m: 740.0,
            buffer_distance_m: 200.0,
            estimated_evacuation_time_min: 25.0,
            route_status: 'open',
            coordinates: [[-44.1314, -20.1434], [-44.1384, -20.1684], [-44.1454, -20.1934]]
          }
        ];
      }
      else if (url.includes('/api/v1/analysis/geotechnical/phreatic-seepage') || url.includes('/geotechnical/phreatic-seepage')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculatePhreaticSurfaceSeepage(parsed);
      }
      else if (url.includes('/api/v1/analysis/geotechnical/swrc-inversion') || url.includes('/geotechnical/swrc-inversion')) {
        let parsed = {};
        try { parsed = config.data ? JSON.parse(config.data) : {}; } catch { parsed = {}; }
        data = calculateSwrcInversionCurve(parsed);
      }
      else if (url.includes('/api/v1/analysis/geotechnical/piezometers') || url.includes('/geotechnical/piezometers')) {
        const sim = calculatePhreaticSurfaceSeepage({});
        data = sim.piezometer_fusion;
      }
      else if (url.includes('/api/v1/analysis/geotechnical/slope-stability-bishop') || url.includes('/geotechnical/slope-stability-bishop')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateBishopsSimplifiedFs(parsed);
      }
      else if (url.includes('/api/v1/analysis/geotechnical/slip-surface-search') || url.includes('/geotechnical/slip-surface-search')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = searchCriticalCircularSlipSurface(parsed);
      }
      else if (url.includes('/api/v1/geotechnical/insar-creep') || url.includes('/geotechnical/insar-creep')) {
        data = [
          {
            point_id: 'INSAR-CREEP-001',
            station_id: 'STA-0+120',
            latitude: -20.1198,
            longitude: -44.1205,
            elevation_m: 874.2,
            embankment_station_m: 120.0,
            los_velocity_mm_yr: -2.4,
            los_displacement_cumulative_mm: -12.8,
            shear_strain_rate_microstrain_yr: 48.0,
            creep_status: 'stable_negligible',
            temporal_coherence: 0.94,
            sensor_platform: 'Sentinel-1A_IW',
            last_acquisition_utc: '2026-10-07T00:00:00Z'
          },
          {
            point_id: 'INSAR-CREEP-002',
            station_id: 'STA-0+240',
            latitude: -20.1205,
            longitude: -44.1195,
            elevation_m: 866.5,
            embankment_station_m: 240.0,
            los_velocity_mm_yr: -14.6,
            los_displacement_cumulative_mm: -42.1,
            shear_strain_rate_microstrain_yr: 385.0,
            creep_status: 'linear_steady_creep',
            temporal_coherence: 0.88,
            sensor_platform: 'Sentinel-1A_IW',
            last_acquisition_utc: '2026-10-07T00:00:00Z'
          },
          {
            point_id: 'INSAR-CREEP-003',
            station_id: 'STA-0+350',
            latitude: -20.1212,
            longitude: -44.1186,
            elevation_m: 858.0,
            embankment_station_m: 350.0,
            los_velocity_mm_yr: -42.8,
            los_displacement_cumulative_mm: -115.4,
            shear_strain_rate_microstrain_yr: 1120.0,
            creep_status: 'elevated_creep_rate',
            temporal_coherence: 0.81,
            sensor_platform: 'Sentinel-1A_IW',
            last_acquisition_utc: '2026-10-07T00:00:00Z'
          }
        ];
      }
      else if (url.includes('/api/v1/analysis/geotechnical/rainfall-infiltration') || url.includes('/geotechnical/rainfall-infiltration')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateGreenAmptInfiltration(parsed);
      }
      else if (url.includes('/api/v1/analysis/thermal/apparent-inertia') || url.includes('/thermal/apparent-inertia')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateApparentThermalInertia(parsed);
      }
      else if (url.includes('/liquefaction-susceptibility') || url.includes('/geotechnical/liquefaction')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('liquefaction')) {
            parsed.simulation_id = lastPart;
          }
        }
        data = calculateTailingsLiquefactionAnalysis(parsed);
      }
      else if (url.includes('/dynamic-pore-pressure')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sEff = parsed.sigma_v0_eff_kpa || parsed.sigmaV0EffKpa || 100.0;
        const fs = parsed.factor_of_safety_liq || parsed.factorOfSafetyLiq || parsed.fs_liq || 1.0;
        const damId = parsed.dam_id || parsed.damId || 'TAILINGS_DAM_A';
        data = calculateDynamicPorePressure(sEff, fs, damId);
      }
      else if (url.includes('/vs30-proxy')) {
        const parts = url.split('/');
        const lon = parseFloat(parts[parts.length - 1]) || -121.05;
        const lat = parseFloat(parts[parts.length - 2]) || 37.05;
        data = calculateVs30Proxy({ latitude: lat, longitude: lon, ...(config.params || {}) });
      }
      else if (url.includes('/spt-sounding')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateSptSoundingProfile(parsed);
      }
      else if (url.includes('/flow-slide-runout')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const damH = parsed.dam_height_m || parsed.damHeightM || 35.0;
        const impV = parsed.impounded_volume_m3 || parsed.impoundedVolumeM3 || 12500000.0;
        const rAng = parsed.reach_angle_deg || parsed.reachAngleDeg || 5.5;
        const lat = parsed.crest_lat || parsed.crestLat || 37.05;
        const lon = parsed.crest_lon || parsed.crestLon || -121.05;
        const damId = parsed.dam_id || parsed.damId || 'TAILINGS_DAM_A';
        const damName = parsed.dam_name || parsed.damName || 'North Tailings Impoundment';
        data = calculateFlowSlideRunoutDistance(damH, impV, rAng, 1.5, lat, lon, damId, damName);
      }
      else if (url.includes('/reconsolidation-settlement') || (url.includes('/geotechnical/settlement') && !url.includes('/soil-column') && !url.includes('/insar-fusion'))) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('settlement')) {
            parsed.simulation_id = lastPart;
          }
        }
        data = calculatePostLiquefactionSettlementAnalysis(parsed);
      }
      else if (url.includes('/angular-distortion')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sA = parsed.settlement_a_m !== undefined ? parsed.settlement_a_m : (parsed.settlementAM !== undefined ? parsed.settlementAM : 0.25);
        const sB = parsed.settlement_b_m !== undefined ? parsed.settlement_b_m : (parsed.settlementBM !== undefined ? parsed.settlementBM : 0.08);
        const dist = parsed.distance_m !== undefined ? parsed.distance_m : (parsed.distanceM !== undefined ? parsed.distanceM : 40.0);
        const stA = parsed.station_a_id || parsed.stationAId || 'STA_01';
        const stB = parsed.station_b_id || parsed.stationBId || 'STA_02';
        data = calculateAngularDistortion(sA, sB, dist, stA, stB);
      }
      else if (url.includes('/settlement/soil-column')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const layers = parsed.stratigraphic_layers || parsed.stratigraphicLayers || [];
        const method = parsed.calculation_method || parsed.calculationMethod || 'ishihara_yoshimine_1992';
        data = calculateStratigraphicSettlement(layers, method);
      }
      else if (url.includes('/settlement/insar-fusion')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const modS = parsed.modeled_settlement_m !== undefined ? parsed.modeled_settlement_m : (parsed.modeledSettlementM !== undefined ? parsed.modeledSettlementM : 0.22);
        const insS = parsed.insar_displacement_m !== undefined ? parsed.insar_displacement_m : (parsed.insarDisplacementM !== undefined ? parsed.insarDisplacementM : 0.18);
        const coh = parsed.insar_coherence !== undefined ? parsed.insar_coherence : (parsed.insarCoherence !== undefined ? parsed.insarCoherence : 0.75);
        data = calculateInSARDisplacementFusion(modS, insS, coh);
      }
      else if (url.includes('/topography/csf-ground-filter')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateClothSimulationFilter(parsed);
      }
      else if (url.includes('/topography/cut-and-fill')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('cut-and-fill')) {
            parsed.simulation_id = lastPart;
          }
        }
        data = calculateCutAndFillDifferencing(parsed);
      }
      else if (url.includes('/topography/crest-slump')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateCrestSlumpingProfile(parsed);
      }
      else if (url.includes('/topography/transect-delta')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateTopographicTransectDelta(parsed);
      }
      else if (url.includes('/topography/epipolar-differential')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateDroneEpipolarDifferential(parsed);
      }
      else if (url.includes('/dam-breach-hydrograph')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const resVol = parsed.reservoir_volume_m3 || parsed.reservoirVolumeM3 || 15000000.0;
        const waterH = parsed.water_depth_above_invert_m || parsed.waterDepthAboveInvertM || 35.0;
        const mode = parsed.failure_mode || parsed.failureMode || 'overtopping';
        const params = calculateFroehlichBreachParameters(resVol, waterH, mode);
        const hydro = generateBreachOutflowHydrograph(params.peak_discharge_m3s, resVol, params.formation_time_hours);
        data = {
          simulation_id: `BREACH_SIM_${Date.now()}`,
          dam_id: parsed.dam_id || parsed.damId || 'TAILINGS_DAM_01',
          dam_name: parsed.dam_name || parsed.damName || 'Mount Polley Embankment',
          breach_geometry: params,
          peak_discharge_m3s: params.peak_discharge_m3s,
          time_to_peak_hours: Number((params.formation_time_hours * 0.35).toFixed(3)),
          total_breach_volume_m3: resVol,
          hydrograph: hydro,
          peak_discharge_bounds: { froehlich_2008: params.peak_discharge_m3s },
          analyzed_at: new Date().toISOString()
        };
      }
      else if (url.includes('/inundation-routing')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = calculateDeSaintVenantDownstreamRouting(parsed);
      }
      else if (url.includes('/dam-breach-inundation')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('dam-breach-inundation')) {
            parsed.simulation_id = lastPart;
          }
        }
        data = calculateDamBreachInundationAnalysis(parsed);
      }
      else if (url.includes('/internal-erosion-piping') || url.includes('/seepage-flownet')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('internal-erosion-piping') && !lastPart.includes('seepage-flownet')) {
            parsed.simulation_id = lastPart;
          }
        }
        data = calculateInternalErosionPipingAnalysis(parsed);
      }
      else if (url.includes('/insar-persistent-scatterers') || url.includes('/insar-velocity-field') || url.includes('/insar-dual-orbit-decomposition')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('insar-velocity-field') && !lastPart.includes('insar-persistent-scatterers') && !lastPart.includes('insar-dual-orbit-decomposition')) {
            parsed.simulation_id = lastPart;
          }
        }
        if (url.includes('/insar-dual-orbit-decomposition')) {
          data = decomposeDualOrbitInSARVelocities(parsed);
        } else {
          data = calculateInSARPersistentScattererAnalysis(parsed);
        }
      }
      else if (url.includes('/sar-coherence-damage') || url.includes('/damage-proxy-map')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('damage-proxy-map') && !lastPart.includes('sar-coherence-damage')) {
            parsed.simulation_id = lastPart;
          }
        }
        if (url.includes('/sar-coherence-damage')) {
          data = calculateSarCoherenceLoss(parsed.coherence_pre ?? parsed.coherencePre ?? 0.82, parsed.coherence_event ?? parsed.coherenceEvent ?? 0.35);
        } else {
          data = calculateDamageProxyMappingAnalysis(parsed);
        }
      }
      else if (url.includes('/harmonic-decomposition') || url.includes('/climatological-mad-anomaly')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (!parsed.simulation_id && !parsed.simulationId) {
          const parts = url.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && !lastPart.includes('harmonic-decomposition') && !lastPart.includes('climatological-mad-anomaly')) {
            parsed.simulation_id = lastPart;
          }
        }
        data = calculatePhenologyDecompositionAnalysis(parsed);
      }
      else if (url.includes('/api/v1/operations/harvester/subscriptions') || url.includes('/operations/harvester/subscriptions')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (config.method === 'post') {
          data = {
            subscription: {
              subscription_id: parsed.subscription_id || parsed.subscriptionId || `SUB-STAC-${Date.now()}`,
              name: parsed.name || 'San Luis Reservoir Perimeter Watchdog',
              description: parsed.description || 'Automated STAC satellite surveillance',
              schedule: parsed.schedule || { interval: 'hourly', cloud_cover_max: 20.0 },
              perimeter: parsed.perimeter || { fence_id: 'FENCE-01' },
              webhook_endpoints: parsed.webhook_endpoints || parsed.webhookEndpoints || [],
              trigger_conditions: parsed.trigger_conditions || ['anomaly_exceeded', 'new_scene'],
              z_score_threshold: parsed.z_score_threshold ?? 2.5,
              is_enabled: parsed.is_enabled ?? true,
              created_at: new Date().toISOString(),
              total_dispatches: 0
            },
            status: 'active',
            message: 'Subscription successfully registered.'
          };
        } else {
          data = {
            subscriptions: [
              {
                subscription_id: 'SUB-STAC-001',
                name: 'San Luis Dam & Reservoir Perimeter Watchdog',
                description: 'Automated Sentinel-2 & Landsat anomaly detection',
                schedule: { interval: 'hourly', cloud_cover_max: 20.0, collections: ['sentinel-2-l2a', 'landsat-c2-l2'] },
                perimeter: { fence_id: 'FENCE-001', name: 'San Luis Reservoir Buffer' },
                webhook_endpoints: [
                  { endpoint_id: 'EP-01', channel_type: 'custom_webhook', target_url: 'https://api.gios.internal/webhooks/incoming', is_active: true }
                ],
                trigger_conditions: ['anomaly_exceeded', 'new_scene'],
                z_score_threshold: 2.5,
                is_enabled: true,
                created_at: new Date().toISOString(),
                total_dispatches: 4
              }
            ]
          };
        }
      }
      else if (url.includes('/api/v1/operations/harvester/trigger') || url.includes('/operations/harvester/trigger')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = simulateSTACHarvesterCycle(parsed);
      }
      else if (url.includes('/api/v1/operations/webhooks') || url.includes('/operations/webhooks')) {
        if (url.includes('/test')) {
          let parsed = {};
          try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
          data = {
            endpoint_id: parsed.endpoint_id || parsed.endpointId || 'EP-001',
            channel_type: 'custom_webhook',
            target_url: 'https://api.gios.internal/webhooks/incoming',
            status_code: 200,
            delivery_status: 'delivered',
            dispatched_payload: { test: true, message: 'Test notification dispatch' },
            latency_ms: 38.4,
            dispatched_at: new Date().toISOString()
          };
        } else {
          data = {
            endpoints: [
              { endpoint_id: 'EP-01', channel_type: 'custom_webhook', target_url: 'https://api.gios.internal/webhooks/incoming', is_active: true, max_retries: 3 },
              { endpoint_id: 'EP-02', channel_type: 'slack', target_url: 'https://hooks.slack.com/services/T00/B00/X00', is_active: true, max_retries: 3 }
            ]
          };
        }
      }
      else if (url.includes('/api/v1/operations/dlq') || url.includes('/operations/dlq')) {
        if (url.includes('/retry')) {
          data = {
            replayed_count: 2,
            succeeded_count: 2,
            failed_count: 0,
            remaining_dlq_count: 0,
            replayed_at: new Date().toISOString()
          };
        } else {
          data = {
            dead_letter_items: []
          };
        }
      }
      else if (url.includes('/api/v1/drone/photogrammetry') || url.includes('/drone/photogrammetry')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (url.includes('/flight-plan')) {
          data = calculateDroneFlightPlan(parsed);
        } else if (url.includes('/solve-affine')) {
          const affine = solveGcpAffineTransform(parsed.gcps || []);
          data = { success: true, affine_geotransform: affine, message: 'Affine geotransform resolved successfully.' };
        } else if (url.includes('/cancel')) {
          data = { task_id: 'ODM-TASK-001', status: 'cancelled', message: 'Drone photogrammetry task aborted.' };
        } else if (url.includes('/restart')) {
          data = simulateNodeODMTaskProgression('ODM-TASK-001', 'queued', 0.0);
        } else if (url.includes('/gcp')) {
          const affine = solveGcpAffineTransform(parsed.gcps || []);
          data = {
            task_id: 'ODM-TASK-001',
            total_gcps: (parsed.gcps || []).length,
            enabled_gcps: (parsed.gcps || []).filter(g => g.is_enabled !== false).length,
            check_points: (parsed.gcps || []).filter(g => g.is_check_point).length,
            affine_geotransform: affine,
            message: 'GCP network updated successfully.'
          };
        } else if ((config.method === 'get' || !config.method) && (url.endsWith('/photogrammetry/tasks') || url.endsWith('/photogrammetry/tasks/'))) {
          data = [
            {
              ...simulateNodeODMTaskProgression('ODM-BENCHMARK-001', 'completed', 480.0, 120),
              project_name: 'San Luis Dam Crest High-Resolution Photogrammetry Survey'
            },
            {
              ...simulateNodeODMTaskProgression('ODM-TAILINGS-2026', 'orthophoto_mosaicing', 320.0, 150),
              project_name: 'Tailings Dam Upstream Embankment Survey'
            }
          ];
        } else if ((config.method === 'get' || !config.method) && url.includes('/tasks/')) {
          const parts = url.split('/tasks/');
          const tId = parts[1]?.split('?')[0]?.split('/')[0] || 'ODM-BENCHMARK-001';
          data = simulateNodeODMTaskProgression(tId, tId.includes('TAILINGS') ? 'orthophoto_mosaicing' : 'completed', 300.0, 120);
        } else {
          const tId = parsed.task_id || parsed.taskId || 'ODM-TASK-001';
          data = simulateNodeODMTaskProgression(tId, 'mvs_dense_point_cloud', 180.0, parsed.image_count || 120);
        }
      }
      else if (url.includes('/api/v1/analysis/custom-expression') || url.includes('/analysis/custom-expression')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (url.includes('/validate')) {
          data = validateBandMathFormula(parsed.formula || '(B08 - B04) / (B08 + B04)', null, parsed.collection);
        } else if (url.includes('/evaluate')) {
          const formula = parsed.formula || '(B08 - B04) / (B08 + B04)';
          const bandValues = parsed.band_values || parsed.bandValues || { B08: 0.5, B04: 0.1 };
          const eps = parsed.epsilon !== undefined ? Number(parsed.epsilon) : 1e-6;
          try {
            const val = evaluateBandMathFormula(formula, bandValues, eps);
            const ast = parseBandMathAst(formula);
            data = {
              is_valid: true,
              formula,
              result: val,
              bands_used: ast.variables || [],
              ast_depth: ast.depth || 1,
              node_count: ast.node_count || 1,
              execution_time_ms: 1.25,
              error_message: null
            };
          } catch (evalErr) {
            data = {
              is_valid: false,
              formula,
              result: null,
              bands_used: [],
              ast_depth: 0,
              node_count: 0,
              execution_time_ms: 0.5,
              error_message: evalErr.message || String(evalErr)
            };
          }
        } else if (url.includes('/presets')) {
          data = {
            presets: Object.values(BAND_MATH_PRESETS),
            total: Object.keys(BAND_MATH_PRESETS).length
          };
        } else {
          data = { is_valid: true, message: 'Custom expression endpoint reached.' };
        }
      }
      else if (url.includes('/api/v1/analysis/dem') || url.includes('/analysis/dem')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (url.includes('/transect')) {
          const startPt = parsed.start_point || parsed.startPoint || [37.05, -121.05];
          const endPt = parsed.end_point || parsed.endPoint || [37.045, -121.045];
          const samples = parsed.samples || 50;
          data = calculateElevationTransectProfile(startPt, endPt, {
            samples,
            collection: parsed.collection || 'cop-dem-glo-30',
            crestElevation: parsed.crest_elevation || parsed.crestElevation || 1250.0,
            toeElevation: parsed.toe_elevation || parsed.toeElevation || 1110.0
          });
        } else if (url.includes('/slope-hazard')) {
          data = {
            analysis_id: `DEM-HAZARD-${Date.now()}`,
            collection: parsed.collection || 'cop-dem-glo-30',
            total_area_hectares: 450.0,
            tier_breakdown: {
              flat: { area_ha: 120.0, percentage: 26.67, risk_level: 'low' },
              gentle: { area_ha: 155.0, percentage: 34.44, risk_level: 'low' },
              moderate: { area_ha: 110.0, percentage: 24.44, risk_level: 'moderate' },
              steep: { area_ha: 50.0, percentage: 11.11, risk_level: 'high' },
              critical_hazard: { area_ha: 15.0, percentage: 3.33, risk_level: 'severe' }
            },
            critical_slope_hectares: 15.0,
            critical_slope_percentage: 3.33,
            overall_hazard_rating: 'moderate',
            analyzed_at: new Date().toISOString()
          };
        } else {
          // /api/v1/analysis/dem/topography
          data = {
            simulation_id: `DEM-TOPO-${Date.now()}`,
            collection: parsed.collection || 'cop-dem-glo-30',
            bbox: parsed.bbox || [-121.1, 37.0, -121.0, 37.1],
            summary: {
              min_elevation_m: 840.5,
              max_elevation_m: 1395.2,
              mean_elevation_m: 1120.8,
              elevation_relief_m: 554.7,
              mean_slope_deg: 18.4,
              max_slope_deg: 41.2,
              dominant_aspect_compass: 'NW',
              mean_twi: 8.65,
              high_seepage_area_pct: 14.8,
              critical_slope_area_pct: 3.2
            },
            sun_illumination: {
              azimuth_deg: parsed.sun_azimuth_deg || 315.0,
              altitude_deg: parsed.sun_altitude_deg || 45.0,
              zenith_deg: 90.0 - (parsed.sun_altitude_deg || 45.0),
              z_factor: parsed.z_factor || 1.0
            },
            hazard_distribution: {
              flat: 26.67,
              gentle: 34.44,
              moderate: 24.44,
              steep: 11.11,
              critical_hazard: 3.34
            },
            tile_url_templates: {
              relief: '/api/v1/tiles/dem/relief/{z}/{x}/{y}.png',
              elevation: '/api/v1/tiles/dem/elevation/{z}/{x}/{y}.png',
              slope: '/api/v1/tiles/dem/slope/{z}/{x}/{y}.png',
              aspect: '/api/v1/tiles/dem/aspect/{z}/{x}/{y}.png',
              hillshade: '/api/v1/tiles/dem/hillshade/{z}/{x}/{y}.png',
              twi: '/api/v1/tiles/dem/twi/{z}/{x}/{y}.png'
            },
            analyzed_at: new Date().toISOString()
          };
        }
      }
      else if (url.includes('/api/v1/analysis/mosaic') || url.includes('/analysis/mosaic') || url.includes('/api/v1/mosaic') || url.includes('/mosaic')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        if (url.includes('/feather')) {
          const granA = parsed.granule_a || parsed.granuleA || 'T10SEG';
          const granB = parsed.granule_b || parsed.granuleB || 'T10SFG';
          const metaA = MGRS_GRANULE_PRESETS[granA] || MGRS_GRANULE_PRESETS.T10SEG;
          const metaB = MGRS_GRANULE_PRESETS[granB] || MGRS_GRANULE_PRESETS.T10SFG;
          const overlap = calculateMgrsGranuleOverlap(metaA.bbox, metaB.bbox, metaA.mean_reflectance, metaB.mean_reflectance);
          data = {
            analysis_id: `MOSAIC-FEATHER-${Date.now()}`,
            granule_a: granA,
            granule_b: granB,
            feather_width_m: parsed.feather_width_m || parsed.featherWidthM || 200.0,
            blend_method: parsed.blend_method || parsed.blendMethod || 'feather',
            mean_delta_rho: overlap.estimated_delta_rho,
            max_delta_rho: Number((overlap.estimated_delta_rho * 1.35).toFixed(4)),
            radiometric_continuity_tier: overlap.seamline_tier,
            seamline_length_km: 109.8,
            overlap_width_m: 10000.0,
            sample_points: [
              { point_index: 0, lat: 36.90, lon: overlap.seamline_mid_lon, delta_rho: overlap.estimated_delta_rho, distance_to_edge_m: 100.0, feather_weight: 0.5 },
              { point_index: 1, lat: 37.05, lon: overlap.seamline_mid_lon, delta_rho: overlap.estimated_delta_rho, distance_to_edge_m: 150.0, feather_weight: 0.5 },
              { point_index: 2, lat: 37.20, lon: overlap.seamline_mid_lon, delta_rho: overlap.estimated_delta_rho, distance_to_edge_m: 200.0, feather_weight: 0.5 }
            ],
            weight_profile_samples: [
              { distance_m: -100.0, weight_a: 1.0, weight_b: 0.0 },
              { distance_m: -50.0, weight_a: 0.85, weight_b: 0.15 },
              { distance_m: 0.0, weight_a: 0.5, weight_b: 0.5 },
              { distance_m: 50.0, weight_a: 0.15, weight_b: 0.85 },
              { distance_m: 100.0, weight_a: 0.0, weight_b: 1.0 }
            ],
            tile_url_template: `/api/v1/tiles/mosaic/feather/{z}/{x}/{y}.png?collection=${parsed.collection || 'sentinel-2-l2a'}`,
            analyzed_at: new Date().toISOString()
          };
        } else if (url.includes('/granules') || url.includes('/overlap-analysis')) {
          data = {
            collection: parsed.collection || 'sentinel-2-l2a',
            bbox: parsed.bbox || [-121.20, 36.90, -120.65, 37.45],
            granules: Object.values(MGRS_GRANULE_PRESETS),
            adjacent_pairs: [
              {
                granule_a: 'T10SEG',
                granule_b: 'T10SFG',
                overlap: calculateMgrsGranuleOverlap(MGRS_GRANULE_PRESETS.T10SEG.bbox, MGRS_GRANULE_PRESETS.T10SFG.bbox, MGRS_GRANULE_PRESETS.T10SEG.mean_reflectance, MGRS_GRANULE_PRESETS.T10SFG.mean_reflectance)
              },
              {
                granule_a: 'T10SEG',
                granule_b: 'T10TEK',
                overlap: calculateMgrsGranuleOverlap(MGRS_GRANULE_PRESETS.T10SEG.bbox, MGRS_GRANULE_PRESETS.T10TEK.bbox, MGRS_GRANULE_PRESETS.T10SEG.mean_reflectance, MGRS_GRANULE_PRESETS.T10TEK.mean_reflectance)
              }
            ]
          };
        } else if (url.includes('/presets')) {
          data = {
            presets: MGRS_GRANULE_PRESETS,
            blend_methods: MOSAIC_BLEND_METHOD_CONFIGS,
            seamline_tiers: SEAMLINE_TIER_CONFIGS,
            mgrs_dimensions: MGRS_TILE_DIMENSIONS
          };
        } else {
          // /api/v1/analysis/mosaic/vrt or /mosaic/vrt/generate
          const mosaicId = parsed.mosaic_id || parsed.mosaicId || `VRT-MOSAIC-${Date.now()}`;
          const collection = parsed.collection || 'sentinel-2-l2a';
          const granules = Object.values(MGRS_GRANULE_PRESETS);
          const vrtXml = generateVrtXmlDefinition(mosaicId, collection, granules);
          data = {
            mosaic_id: mosaicId,
            collection,
            target_crs: parsed.target_crs || 'EPSG:3857',
            target_resolution_m: parsed.target_resolution_m || 10.0,
            blend_method: parsed.blend_method || parsed.blendMethod || 'feather',
            granules: granules.map((g) => ({
              granule_id: g.granule_id,
              source_uri: `stac://${collection}/${g.granule_id}`,
              bbox: g.bbox,
              overlap_area_sqkm: 55.4,
              overlap_percentage: 12.5,
              weight_contribution: 0.333
            })),
            seamlines: [
              {
                seamline_id: 'SEAM-T10SEG-T10SFG',
                granule_a: 'T10SEG',
                granule_b: 'T10SFG',
                length_km: 109.8,
                mean_delta_rho: 0.003,
                max_delta_rho: 0.0045,
                radiometric_tier: 'seamless',
                coordinates: [[-120.925, 36.90], [-120.925, 37.20]]
              }
            ],
            summary: {
              total_mosaic_area_sqkm: 24500.0,
              overlap_area_sqkm: 110.8,
              overlap_percentage: 4.52,
              mean_seamline_delta_rho: 0.003,
              radiometric_continuity_tier: 'seamless',
              feather_buffer_width_m: parsed.feather_width_m || 200.0,
              active_granule_count: granules.length
            },
            vrt_xml: vrtXml,
            tile_url_template: `/api/v1/tiles/mosaic/${collection}/{z}/{x}/{y}.png`,
            created_at: new Date().toISOString()
          };
        }
      }
      else if (url.includes('/api/v1/analysis/temporal') || url.includes('/analysis/temporal')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const collection = parsed.collection || 'sentinel-2-l2a';
        const reducer = parsed.reducer || 'median';
        const startDate = parsed.start_date || parsed.startDate || '2026-06-01';
        const endDate = parsed.end_date || parsed.endDate || '2026-08-31';

        if (url.includes('/reducers')) {
          data = {
            reducers: TEMPORAL_REDUCER_CONFIGS,
            quality_tiers: TEMPORAL_QUALITY_TIER_CONFIGS
          };
        } else if (url.includes('/stack')) {
          data = {
            collection,
            bbox: parsed.bbox || [-121.20, 36.90, -120.65, 37.45],
            start_date: startDate,
            end_date: endDate,
            total_scenes: TEMPORAL_BENCHMARK_SCENES.length,
            scenes: TEMPORAL_BENCHMARK_SCENES,
            mean_cloud_cover_pct: 5.1,
            recommended_reducer: 'median'
          };
        } else {
          // /api/v1/analysis/temporal/composite
          const compId = parsed.composite_id || parsed.compositeId || `COMP-${Date.now()}`;
          const isQuality = reducer === 'max_ndvi' || reducer === 'min_cloud';
          data = {
            composite_id: compId,
            collection,
            reducer,
            metadata: {
              composite_id: compId,
              collection,
              reducer,
              start_date: startDate,
              end_date: endDate,
              temporal_window_days: 91,
              total_scenes_evaluated: 12,
              scenes_included: TEMPORAL_BENCHMARK_SCENES.length,
              mean_cloud_cover_pct: 5.1,
              clear_pixel_fraction: 0.965,
              quality_tier: 'excellent',
              preserves_covariance: isQuality,
              quality_band: parsed.quality_band || (isQuality ? (reducer === 'max_ndvi' ? 'NDVI' : 'cloud_prob') : null),
              bbox: parsed.bbox || [-121.20, 36.90, -120.65, 37.45],
              target_crs: parsed.target_crs || 'EPSG:3857',
              created_at: new Date().toISOString()
            },
            scenes: TEMPORAL_BENCHMARK_SCENES,
            summary: {
              clear_pixel_pct: 96.5,
              scenes_count: TEMPORAL_BENCHMARK_SCENES.length,
              temporal_window_days: 91
            },
            tile_url_template: `/api/v1/tiles/temporal/${collection}/${reducer}/{z}/{x}/{y}.png?start_date=${startDate}&end_date=${endDate}`,
            created_at: new Date().toISOString()
          };
        }
      }
      else if (url.includes('/api/v1/analysis/sar/backscatter') || url.includes('/analysis/sar/backscatter')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const pol = parsed.polarization || 'vv';
        const filter = parsed.speckle_filter || parsed.speckleFilter || 'refined_lee';
        const cal = parsed.calibration || 'gamma0';
        const anaId = `SAR-ANA-${Date.now()}`;
        data = {
          analysis_id: anaId,
          collection: parsed.collection || 'sentinel-1-rtc',
          polarization: pol,
          speckle_filter: filter,
          calibration: cal,
          filter_kernel_size: parsed.filter_kernel_size || 5,
          summary: {
            mean_backscatter_db: pol === 'vh' ? -18.4 : (pol === 'ratio_vh_vv' ? -6.6 : -11.8),
            median_backscatter_db: pol === 'vh' ? -18.9 : (pol === 'ratio_vh_vv' ? -6.8 : -12.1),
            min_backscatter_db: -28.4,
            max_backscatter_db: 4.2,
            std_backscatter_db: 3.8,
            equivalent_number_of_looks: 4.4,
            speckle_variance_reduction_ratio: 4.25,
            water_fraction: 0.084,
            water_area_ha: 142.5,
            dominant_tier: 'calm_water'
          },
          tile_url_template: `/api/v1/tiles/sar/${parsed.collection || 'sentinel-1-rtc'}/${pol}/{z}/{x}/{y}.png?filter=${filter}`,
          flood_tile_url_template: `/api/v1/tiles/sar/flood/{z}/{x}/{y}.png?collection=${parsed.collection || 'sentinel-1-rtc'}&threshold_db=${parsed.water_threshold_db || -16.5}`,
          created_at: new Date().toISOString(),
          status: 'completed'
        };
      }
      else if (url.includes('/api/v1/analysis/sar/speckle-filters') || url.includes('/analysis/sar/speckle-filters')) {
        data = {
          filters: SPECKLE_FILTER_CONFIGS,
          polarizations: SAR_POLARIZATION_CONFIGS,
          calibrations: SAR_BACKSCATTER_CALIBRATIONS,
          flood_tiers: SAR_FLOOD_TIER_CONFIGS
        };
      }
      else if (url.includes('/api/v1/analysis/coregistration/tie-points') || url.includes('/analysis/coregistration/tie-points')) {
        data = {
          tie_points: [
            { point_id: 'TP-001', reference_x: 120.0, reference_y: 150.0, target_x: 119.68, target_y: 150.44, shift_x: -0.32, shift_y: 0.44, correlation_score: 0.94, is_inlier: true, residual_pixels: 0.08 },
            { point_id: 'TP-002', reference_x: 240.0, reference_y: 150.0, target_x: 239.71, target_y: 150.42, shift_x: -0.29, shift_y: 0.42, correlation_score: 0.91, is_inlier: true, residual_pixels: 0.11 },
            { point_id: 'TP-003', reference_x: 120.0, reference_y: 300.0, target_x: 119.65, target_y: 300.46, shift_x: -0.35, shift_y: 0.46, correlation_score: 0.88, is_inlier: true, residual_pixels: 0.09 },
            { point_id: 'TP-004', reference_x: 240.0, reference_y: 300.0, target_x: 239.69, target_y: 300.45, shift_x: -0.31, shift_y: 0.45, correlation_score: 0.93, is_inlier: true, residual_pixels: 0.07 }
          ],
          total_points: 4,
          inlier_count: 4
        };
      }
      else if (url.includes('/api/v1/analysis/coregistration') || url.includes('/analysis/coregistration')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const refId = parsed.reference_scene_id || 'S2A_MSIL2A_20260701T183921_T10SEJ';
        const tgtId = parsed.target_scene_id || 'S2B_MSIL2A_20260716T183919_T10SEJ';
        const anaId = `COREG-ANA-${Date.now()}`;
        data = {
          analysis_id: anaId,
          reference_scene_id: refId,
          target_scene_id: tgtId,
          method: parsed.method || 'fft_phase_correlation',
          kernel: parsed.kernel || 'cubic_convolution',
          affine_matrix: {
            a: 1.000012,
            b: -0.000008,
            c: 0.000006,
            d: 0.999994,
            tx: -0.32,
            ty: 0.44,
            rmse_pixels: 0.16,
            inlier_count: 32,
            total_tie_points: 36
          },
          summary: {
            mean_shift_x_pixels: -0.32,
            mean_shift_y_pixels: 0.44,
            rmse_pixels: 0.16,
            max_shift_pixels: 0.54,
            mean_correlation: 0.91,
            inlier_fraction: 0.8889,
            quality_tier: 'subpixel_excellent',
            false_change_risk_pct: 3.2
          },
          tile_url_template: `/api/v1/tiles/coregistration/${refId}/${tgtId}/{z}/{x}/{y}.png?mode=aligned&kernel=${parsed.kernel || 'cubic_convolution'}`,
          vector_field_tile_url_template: `/api/v1/tiles/coregistration/vector-field/${anaId}/{z}/{x}/{y}.png`,
          created_at: new Date().toISOString(),
          status: 'completed'
        };
      }
      else if (url.includes('/api/v1/analysis/aquatic/quality') || url.includes('/analysis/aquatic/quality')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sceneId = parsed.scene_id || 'S2A_MSIL2A_20260814T160901_T17TNE';
        const anaId = `AQUA-ANA-${Date.now()}`;
        data = {
          analysis_id: anaId,
          scene_id: sceneId,
          collection: parsed.collection || 'sentinel-2-l2a',
          algorithm: parsed.algorithm || 'ndci_mishra_2012',
          water_masking_method: parsed.water_masking_method || 'mndwi_threshold',
          mndwi_threshold: parsed.mndwi_threshold !== undefined ? parsed.mndwi_threshold : 0.0,
          summary: {
            water_pixels: 42150,
            water_surface_area_ha: 421.5,
            mean_ndci: 0.28,
            mean_fai: 0.045,
            mean_chla_ug_l: 52.4,
            mean_turbidity_ntu: 18.6,
            dominant_eutrophication_tier: 'hypertrophic',
            bloom_extent_ha: 298.4,
            bloom_risk_level: 'severe',
            floating_scum_detected: true,
            tier_distribution: {
              oligotrophic: 4.2,
              mesotrophic: 12.8,
              eutrophic: 28.5,
              hypertrophic: 54.5
            }
          },
          tile_url_template: `/api/v1/tiles/aquatic/${parsed.collection || 'sentinel-2-l2a'}/ndci/{z}/{x}/{y}.png`,
          hab_tile_url_template: `/api/v1/tiles/aquatic/hab/${parsed.collection || 'sentinel-2-l2a'}/{z}/{x}/{y}.png`,
          created_at: new Date().toISOString(),
          status: 'completed'
        };
      }
      else if (url.includes('/api/v1/analysis/aquatic/hab') || url.includes('/analysis/aquatic/hab')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sceneId = parsed.scene_id || 'S2A_MSIL2A_20260814T160901_T17TNE';
        const anaId = `HAB-ANA-${Date.now()}`;
        data = {
          analysis_id: anaId,
          scene_id: sceneId,
          dominant_tier: 'hypertrophic',
          alert_level: 'Alert Level 2 (Scum Hazard)',
          mean_ndci: 0.28,
          mean_fai: 0.045,
          scum_detected: true,
          bloom_extent_ha: 298.4,
          advisory: 'Acute hazard from toxic surface scums; restrict livestock access and drinking water intake; post public warnings.',
          tile_url_template: `/api/v1/tiles/aquatic/hab/${parsed.collection || 'sentinel-2-l2a'}/{z}/{x}/{y}.png`,
          created_at: new Date().toISOString()
        };
      }
      else if (url.includes('/api/v1/analysis/topographic/correction') || url.includes('/analysis/topographic/correction')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sceneId = parsed.scene_id || 'S2A_MSIL2A_20260815_MT_SHASTA';
        const anaId = `TOPO-ANA-${Date.now()}`;
        const method = parsed.method || 'c_correction';
        data = {
          analysis_id: anaId,
          scene_id: sceneId,
          collection: parsed.collection || 'sentinel-2-l2a',
          dem_collection: parsed.dem_collection || 'cop-dem-glo-30',
          method: method,
          solar_geometry: {
            solar_zenith_deg: 34.2,
            solar_azimuth_deg: 148.5,
            solar_elevation_deg: 55.8,
            earth_sun_distance_au: 1.013
          },
          summary: {
            mean_cos_i: 0.7842,
            min_cos_i: -0.1824,
            max_cos_i: 0.9982,
            sunlit_pixel_pct: 82.5,
            shaded_pixel_pct: 12.8,
            self_shadow_pixel_pct: 4.7,
            estimated_c_factors: { B02: 0.12, B03: 0.09, B04: 0.08, B08: 0.06, B11: 0.04 },
            estimated_minnaert_k: { B02: 0.58, B03: 0.62, B04: 0.65, B08: 0.72, B11: 0.78 },
            mean_radiance_uncalibrated: 0.1845,
            mean_radiance_corrected: 0.2012,
            radiance_std_reduction_pct: 41.8
          },
          tile_url_template: `/api/v1/tiles/topographic/${parsed.collection || 'sentinel-2-l2a'}/${sceneId}/{z}/{x}/{y}.png?method=${method}`,
          illumination_tile_url_template: `/api/v1/tiles/topographic/illumination/${parsed.collection || 'sentinel-2-l2a'}/${sceneId}/{z}/{x}/{y}.png`,
          created_at: new Date().toISOString(),
          status: 'completed'
        };
      }
      else if (url.includes('/api/v1/analysis/topographic/solar-geometry') || url.includes('/analysis/topographic/solar-geometry')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = {
          solar_zenith_deg: 34.2,
          solar_azimuth_deg: 148.5,
          solar_elevation_deg: 55.8,
          earth_sun_distance_au: 1.013,
          scene_id: parsed.scene_id || 'S2A_MSIL2A_20260815_MT_SHASTA'
        };
      }
      else if (url.includes('/api/v1/analysis/hls/harmonization') || url.includes('/analysis/hls/harmonization')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sceneId = parsed.scene_id || 'LC09_L2SP_044034_20260718_02_T1';
        const mgrsTile = parsed.mgrs_tile || '10TFK';
        const anaId = `HLS-ANA-${Date.now()}`;
        const collection = parsed.collection || 'landsat-c2-l2';
        data = {
          analysis_id: anaId,
          scene_id: sceneId,
          mgrs_tile: mgrsTile,
          source_sensor: parsed.sensor || 'landsat_oli',
          target_sensor: 'sentinel_msi',
          geometry: {
            solar_zenith_deg: 28.5,
            solar_azimuth_deg: 134.2,
            view_zenith_deg: 4.8,
            view_azimuth_deg: 102.5,
            relative_azimuth_deg: 31.7,
            target_solar_zenith_deg: 45.0,
            target_view_zenith_deg: 0.0
          },
          config: parsed.config || {
            source_sensor: 'landsat_oli',
            target_sensor: 'sentinel_msi',
            brdf_model: 'rossthick_lisparse_r',
            target_solar_zenith_deg: 45.0,
            target_view_zenith_deg: 0.0,
            apply_bandpass_adjustment: true,
            bands: ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']
          },
          summary: {
            source_sensor: 'landsat_oli',
            target_sensor: 'sentinel_msi',
            mgrs_tile: mgrsTile,
            bands_processed: ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'],
            mean_brdf_adjustment_factor: 0.942,
            mean_source_reflectance: 0.185,
            mean_nbar_reflectance: 0.174,
            mean_harmonized_reflectance: 0.171,
            cross_sensor_rmse: 0.0054,
            mean_volumetric_kernel: -0.038,
            mean_geometric_kernel: -0.842
          },
          tile_url_template: `/api/v1/tiles/hls/${collection}/${sceneId}/{z}/{x}/{y}.png?stage=harmonized`,
          nbar_tile_url_template: `/api/v1/tiles/hls/nbar/${collection}/${sceneId}/{z}/{x}/{y}.png`,
          created_at: new Date().toISOString(),
          status: 'completed'
        };
      }
      else if (url.includes('/api/v1/analysis/hls/brdf-geometry') || url.includes('/analysis/hls/brdf-geometry')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = {
          solar_zenith_deg: parsed.solar_zenith_deg || 28.5,
          view_zenith_deg: parsed.view_zenith_deg || 4.8,
          relative_azimuth_deg: parsed.relative_azimuth_deg || 31.7,
          target_solar_zenith_deg: 45.0,
          target_view_zenith_deg: 0.0,
          k_vol: -0.0382,
          k_geo: -0.8421,
          c_factors: { blue: 0.945, green: 0.941, red: 0.938, nir: 0.949, swir1: 0.952, swir2: 0.948 }
        };
      }
      else if (url.includes('/api/v1/analysis/hls/bandpass') || url.includes('/analysis/hls/bandpass')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        data = {
          source_sensor: parsed.source_sensor || 'landsat_oli',
          target_sensor: parsed.target_sensor || 'sentinel_msi',
          coefficients: HLS_BANDPASS_COEFFICIENTS,
          adjusted_reflectances: {
            blue: 0.19586,
            green: 0.20186,
            red: 0.19720,
            nir: 0.19956,
            swir1: 0.20014,
            swir2: 0.20060
          }
        };
      }
      else if (url.includes('/api/v1/analysis/thermal/lst') || url.includes('/analysis/thermal/lst')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const sceneId = parsed.scene_id || 'LC09_L2SP_039037_20260715_02_T1';
        const collection = parsed.collection || 'landsat-c2-l2';
        const sensor = parsed.sensor || 'landsat_tirs';
        const method = parsed.method || 'radiative_transfer_equation';
        const baseline = parsed.ambient_baseline_temp_c !== undefined ? Number(parsed.ambient_baseline_temp_c) : 25.0;
        const meanLst = 42.8;
        const deltaT = Math.round((meanLst - baseline) * 10) / 10;
        data = {
          analysis_id: `LST-ANA-${Date.now()}`,
          scene_id: sceneId,
          sensor,
          method,
          summary: {
            sensor,
            method,
            mean_lst_c: meanLst,
            min_lst_c: 26.2,
            max_lst_c: 54.1,
            mean_brightness_temp_c: 38.6,
            mean_emissivity: 0.974,
            mean_fvc: 0.28,
            ambient_baseline_temp_c: baseline,
            mean_thermal_anomaly_delta_c: deltaT,
            max_thermal_anomaly_delta_c: Math.round((54.1 - baseline) * 10) / 10,
            uhi_intensity_c: Math.max(0.0, deltaT),
            dominant_severity: deltaT >= 10.0 ? 'extreme_wildfire_hotspot' : (deltaT >= 6.0 ? 'severe_thermal_anomaly' : 'moderate_thermal_anomaly'),
            hotspot_pixel_count: 1420,
            hotspot_area_ha: 127.8
          },
          tile_url_template: `/api/v1/tiles/thermal/lst/${collection}/${sceneId}/{z}/{x}/{y}.png`,
          anomaly_tile_url_template: `/api/v1/tiles/thermal/anomaly/${collection}/${sceneId}/{z}/{x}/{y}.png?ambient_baseline_temp_c=${baseline}`,
          status: 'completed',
          created_at: new Date().toISOString()
        };
      }
      else if (url.includes('/api/v1/analysis/thermal/emissivity') || url.includes('/analysis/thermal/emissivity')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const ndvi = parsed.ndvi !== undefined ? Number(parsed.ndvi) : 0.45;
        const fvc = calculateSobrinoFractionalVegetationCover(ndvi);
        const eps = calculateSobrinoLandSurfaceEmissivity(ndvi, fvc);
        data = {
          ndvi,
          fvc,
          emissivity: eps,
          soil_endmember: 0.970,
          veg_endmember: 0.990,
          cavity_factor: 0.55
        };
      }
      else if (url.includes('/api/v1/analysis/thermal/anomaly') || url.includes('/analysis/thermal/anomaly')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const lstC = parsed.lst_celsius !== undefined ? Number(parsed.lst_celsius) : 48.5;
        const baseline = parsed.ambient_baseline_temp_c !== undefined ? Number(parsed.ambient_baseline_temp_c) : 34.0;
        const delta = Math.round((lstC - baseline) * 10) / 10;
        data = {
          lst_celsius: lstC,
          ambient_baseline_temp_c: baseline,
          thermal_anomaly_delta_c: delta,
          uhi_intensity_c: Math.max(0.0, delta),
          severity: classifyThermalAnomalySeverity(delta)
        };
      }
      else if (url.includes('/api/v1/analysis/sharpening/methods') || url.includes('/analysis/sharpening/methods')) {
        data = {
          methods: SHARPENING_METHOD_CONFIGS,
          benchmark_scenes: SHARPENING_BENCHMARK_SCENES,
          pan_weights: SYNTHETIC_PAN_WEIGHTS,
          supported_target_bands: SHARPENING_TARGET_BANDS,
          supported_guidance_bands: SHARPENING_GUIDANCE_BANDS
        };
      }
      else if (url.includes('/api/v1/analysis/sharpening/sharpen') || url.includes('/analysis/sharpening/sharpen')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const method = normalizeSharpeningMethod(parsed.method);
        const targetBands = parsed.target_bands || ['B05', 'B06', 'B07', 'B8A', 'B11', 'B12'];
        const reqId = `SHARP-${Date.now()}`;
        data = {
          request_id: reqId,
          aoi_name: parsed.aoi_name || 'San Joaquin Valley Agricultural Mosaic',
          collection: parsed.collection || 'sentinel-2-l2a',
          item_id: parsed.item_id || 'S2A_MSIL2A_20260815_T10SEJ',
          method,
          native_resolution_m: 20.0,
          sharpened_resolution_m: 10.0,
          bands_sharpened: targetBands,
          quality_summary: {
            method,
            sam_rad: 0.024,
            sam_deg: 1.375,
            ergas: 1.85,
            uiqi_q4: 0.94,
            mtf_high_freq_gain: 1.45,
            radiometric_energy_conservation_ratio: 1.002,
            rmse: 0.012,
            quality_rating: SharpeningQualityRating.EXCELLENT,
            preserves_radiometry: method !== 'brovey'
          },
          tile_url_template: `/api/v1/tiles/sharpened/${method}/{target}/{z}/{x}/{y}.png`,
          derived_indices: {
            ndmi_10m: `/api/v1/tiles/sharpened/${method}/ndmi/{z}/{x}/{y}.png`,
            ndci_10m: `/api/v1/tiles/sharpened/${method}/ndci/{z}/{x}/{y}.png`
          },
          processed_at: new Date().toISOString(),
          status: 'success'
        };
      }
      else if (url.includes('/api/v1/analysis/sharpening/evaluate') || url.includes('/analysis/sharpening/evaluate')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const method = normalizeSharpeningMethod(parsed.method);
        data = {
          method,
          sam_rad: 0.024,
          sam_deg: 1.375,
          ergas: 1.85,
          uiqi_q4: 0.94,
          mtf_high_freq_gain: 1.45,
          radiometric_energy_conservation_ratio: 1.002,
          rmse: 0.012,
          quality_rating: SharpeningQualityRating.EXCELLENT,
          preserves_radiometry: method !== 'brovey'
        };
      }
      else if (url.includes('/api/v1/analysis/cross-calibration/models') || url.includes('/analysis/cross-calibration/models')) {
        data = {
          models: SENSOR_CALIBRATION_MODEL_CONFIGS,
          benchmark_scenes: CROSS_SENSOR_BENCHMARK_SCENES,
          band_coefficients: CROSS_SENSOR_BAND_COEFFICIENTS,
          supported_platforms: SENSOR_PLATFORMS,
          supported_metrics: CROSS_SENSOR_TILE_METRICS
        };
      }
      else if (url.includes('/api/v1/analysis/cross-calibration/calibrate') || url.includes('/analysis/cross-calibration/calibrate')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const model = normalizeSensorCalibrationModel(parsed.calibration_model);
        const sourceSensor = parsed.source_sensor || SensorPlatform.LANDSAT_8_OLI;
        const targetSensor = parsed.target_sensor || SensorPlatform.SENTINEL_2A_MSI;
        const reqId = `XCAL-${Date.now()}`;
        const bands = parsed.bands || ['blue', 'green', 'red', 'nir_narrow', 'swir_1', 'swir_2'];
        const calibratedBands = {};
        bands.forEach((b) => {
          const normB = normalizeCrossSensorBand(b);
          const rawRef = 0.20;
          const calRef = applyCrossSensorBandCalibration(rawRef, normB, model, sourceSensor, targetSensor);
          calibratedBands[normB] = {
            band: normB,
            source_reflectance: rawRef,
            calibrated_reflectance: calRef,
            delta_reflectance: Number((calRef - rawRef).toFixed(4)),
            applied_slope: 0.9983,
            applied_intercept: 0.0003
          };
        });
        data = {
          request_id: reqId,
          aoi_name: parsed.aoi_name || 'Lake Tahoe Sub-Alpine Calibration Target',
          source_sensor: sourceSensor,
          target_sensor: targetSensor,
          calibration_model: model,
          calibrated_bands: calibratedBands,
          quality_summary: {
            model,
            mean_rmse: 0.0055,
            mean_r_squared: 0.998,
            mean_bias: 0.0004,
            energy_conservation_ratio: 1.001,
            quality_rating: CalibrationQualityRating.EXCELLENT,
            preserves_radiometry: model !== 'quac_empirical'
          },
          tile_url_template: `/api/v1/tiles/cross-calibrated/${model}/{metric}/{z}/{x}/{y}.png`,
          daily_stack_count: 14,
          processed_at: new Date().toISOString(),
          status: 'success'
        };
      }
      else if (url.includes('/api/v1/analysis/cross-calibration/evaluate') || url.includes('/analysis/cross-calibration/evaluate')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const model = normalizeSensorCalibrationModel(parsed.calibration_model);
        data = {
          model,
          mean_rmse: 0.0055,
          mean_r_squared: 0.998,
          mean_bias: 0.0004,
          energy_conservation_ratio: 1.001,
          quality_rating: CalibrationQualityRating.EXCELLENT,
          preserves_radiometry: model !== 'quac_empirical'
        };
      }
      else if (url.includes('/api/v1/analysis/trend/models') || url.includes('/analysis/trend/models')) {
        data = {
          models: TREND_MODEL_CONFIGS,
          benchmark_scenes: TREND_BENCHMARK_SCENES,
          significance_classes: TREND_SIGNIFICANCE_CONFIGS,
          supported_indices: TREND_TARGET_INDICES,
          supported_metrics: TREND_TILE_METRICS
        };
      }
      else if (url.includes('/api/v1/analysis/trend/analyze') || url.includes('/analysis/trend/analyze')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const model = normalizeTrendModel(parsed.model);
        const targetIndex = normalizeTrendTargetIndex(parsed.target_index);
        const reqId = `TREND-${Date.now()}`;
        
        const startYear = 2016;
        const totalMonths = 120;
        const timestamps = [];
        const values = [];
        const trajectoryPoints = [];
        
        for (let i = 0; i < totalMonths; i++) {
          const year = startYear + Math.floor(i / 12);
          const month = (i % 12) + 1;
          const monthStr = month < 10 ? `0${month}` : `${month}`;
          const date = `${year}-${monthStr}-15`;
          const tYears = year + (month - 1) / 12.0;
          const seasonal = 0.12 * Math.sin((2 * Math.PI * (month - 1)) / 12.0);
          const trend = -0.0142 * (tYears - startYear);
          const noise = 0.02 * Math.sin(i * 1.7);
          const rawVal = Math.max(0.05, Math.min(0.95, 0.55 + trend + seasonal + noise));
          
          timestamps.push(tYears);
          values.push(rawVal);
        }

        const ts = calculateTheilSenSlope(timestamps, values);
        const mk = calculateMannKendallStatistics(values);
        const yuePilon = calculateYuePilonPrewhitening(timestamps, values);
        const sigClass = classifyTrendSignificance(yuePilon.prewhitenedZScore, yuePilon.prewhitenedPValue, yuePilon.prewhitenedSlope);

        for (let i = 0; i < totalMonths; i++) {
          const fitted = Number((ts.intercept + ts.slopePerYear * timestamps[i]).toFixed(4));
          const yr = startYear + Math.floor(i / 12);
          const mo = (i % 12) + 1;
          const dateStr = `${yr}-${mo < 10 ? '0' : ''}${mo}-15`;
          trajectoryPoints.push({
            date: dateStr,
            timestamp_years: Number(timestamps[i].toFixed(3)),
            value: Number(values[i].toFixed(4)),
            prewhitened_value: yuePilon.prewhitenedValues[i],
            fitted_value: fitted,
            residual: Number((values[i] - fitted).toFixed(4))
          });
        }

        data = {
          request_id: reqId,
          aoi_name: parsed.aoi_name || 'San Luis Reservoir Decadal Hydrological Trajectory',
          target_index: targetIndex,
          model,
          theil_sen: {
            slope_per_year: ts.slopePerYear,
            intercept: ts.intercept,
            slope_ci_lower: ts.slopeCiLower,
            slope_ci_upper: ts.slopeCiUpper,
            pairwise_count: ts.pairwiseCount,
            breakdown_point: ts.breakdownPoint
          },
          mann_kendall: {
            s_statistic: mk.sStatistic,
            variance_s: mk.varianceS,
            z_score: mk.zScore,
            p_value: mk.pValue,
            kendall_tau: mk.kendallTau,
            is_significant_95: mk.isSignificant95,
            is_significant_99: mk.isSignificant99
          },
          yue_pilon: {
            lag1_autocorrelation: yuePilon.lag1Autocorrelation,
            is_autocorrelated: yuePilon.isAutocorrelated,
            autocorrelation_critical_value: yuePilon.autocorrelationCriticalValue,
            prewhitened_slope: yuePilon.prewhitenedSlope,
            prewhitened_z_score: yuePilon.prewhitenedZScore,
            prewhitened_p_value: yuePilon.prewhitenedPValue
          },
          summary: {
            model,
            target_index: targetIndex,
            theil_sen_slope: yuePilon.prewhitenedSlope,
            mann_kendall_zscore: yuePilon.prewhitenedZScore,
            p_value: yuePilon.prewhitenedPValue,
            kendall_tau: yuePilon.prewhitenedTau,
            significance_class: sigClass,
            confidence_rating: TrendConfidenceRating.HIGH,
            is_prewhitened: true,
            annual_change_percent: Number(((yuePilon.prewhitenedSlope / 0.55) * 100.0).toFixed(2)),
            narrative: `Statistically significant multi-decadal ${sigClass.replace('_', ' ')} trajectory detected with Theil-Sen slope ${yuePilon.prewhitenedSlope}/yr (p=${yuePilon.prewhitenedPValue}, Z=${yuePilon.prewhitenedZScore}).`
          },
          trajectory_points: trajectoryPoints,
          tile_url_template: `/api/v1/tiles/trend/${model}/{metric}/{z}/{x}/{y}.png`,
          observation_count: totalMonths,
          processed_at: new Date().toISOString(),
          status: 'success'
        };
      }
      else if (url.includes('/api/v1/analysis/trend/evaluate') || url.includes('/analysis/trend/evaluate')) {
        let parsed = {};
        try { parsed = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}; } catch { parsed = {}; }
        const model = normalizeTrendModel(parsed.model);
        const targetIndex = normalizeTrendTargetIndex(parsed.target_index);
        data = {
          model,
          target_index: targetIndex,
          theil_sen_slope: -0.0142,
          mann_kendall_zscore: -2.85,
          p_value: 0.0044,
          kendall_tau: -0.34,
          significance_class: TrendSignificanceClass.SIGNIFICANT_BROWNING,
          confidence_rating: TrendConfidenceRating.HIGH,
          is_prewhitened: true,
          annual_change_percent: -2.58,
          narrative: 'Statistically significant browning trajectory detected with Theil-Sen slope -0.0142/yr (p=0.0044, Z=-2.85).'
        };
      }
      else if (url.includes('/api/v1/analysis/phenology/benchmarks') || url.includes('/analysis/phenology/benchmarks')) {
        data = {
          benchmark_sites: PHENOLOGY_BENCHMARK_SITES,
          metrics: PHENOLOGY_METRIC_CONFIGS
        };
      }
      else if (url.includes('/api/v1/analysis/phenology/curve') || url.includes('/analysis/phenology/curve')) {
        data = {
          aoi_name: 'San Joaquin Valley Agricultural Mosaic',
          metric: 'ndvi',
          fit_model: 'harmonic_hats',
          r_squared: 0.92,
          phenometrics: {
            sos_doy: 110,
            pos_doy: 190,
            eos_doy: 275,
            los_days: 165,
            seasonal_amplitude: 0.48,
            base_level: 0.22,
            peak_level: 0.70
          },
          curve_points: [],
          status: 'success'
        };
      }
      else if (url.includes('/api/v1/analysis/phenology/metrics') || url.includes('/analysis/phenology/metrics')) {
        data = {
          sos_doy: 110,
          pos_doy: 190,
          eos_doy: 275,
          los_days: 165,
          seasonal_amplitude: 0.48,
          base_level: 0.22,
          peak_level: 0.70,
          harmonic_rmse: 0.018,
          r_squared: 0.92
        };
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

/**
 * @typedef {Object} ODMTaskRequest
 * @property {string} [task_id='ODM_TASK_20261001_001'] - Unique photogrammetry task identifier
 * @property {string} [project_name='Embankment_Drone_Survey_2026'] - Mission or project name
 * @property {number} [image_count=120] - Total raw drone aerial photos staged for reconstruction
 * @property {string} [camera_model='DJI_FC6310R_8.8_5472x3648'] - UAV camera and lens model
 * @property {number} [gsd_target_cm=2.5] - Target Ground Sampling Distance in centimeters/pixel
 * @property {string} [feature_quality='high'] - OpenSfM keypoint extraction density
 * @property {number} [dem_resolution_cm=5.0] - DEM spatial resolution in centimeters/pixel
 * @property {number} [mesh_octree_depth=10] - OpenMVS Poisson surface reconstruction octree depth
 * @property {boolean} [use_gpu=true] - Enable CUDA GPU acceleration
 * @property {boolean} [dsm=true] - Generate Digital Surface Model
 * @property {boolean} [dtm=true] - Generate bare-earth Digital Terrain Model using CSF filtering
 * @property {boolean} [orthophoto=true] - Generate orthorectified mosaic
 * @property {string} [radiometric_calibration='camera+sun'] - Radiometric calibration mode
 * @property {string} [webhook_callback_url] - Optional webhook URL
 */

/**
 * @typedef {Object} ODMTaskResponse
 * @property {string} task_id - Unique photogrammetry task identifier
 * @property {string} project_name - Mission or project name
 * @property {'queued'|'running'|'completed'|'failed'|'cancelled'} status - High-level lifecycle status
 * @property {string} current_stage - Active photogrammetric pipeline sub-stage
 * @property {string} stage_label - Human-readable stage title
 * @property {number} progress_percent - Overall execution progress from 0% to 100%
 * @property {number} elapsed_seconds - Execution duration in seconds
 * @property {number} estimated_remaining_seconds - Estimated time remaining in seconds
 * @property {number} image_count - Total input drone images
 * @property {number} reconstructed_points - Total 3D points resolved
 * @property {number} gsd_achieved_cm - Achieved Ground Sampling Distance
 * @property {number} rmse_reprojection_px - Reprojection error in pixels
 * @property {Object} [artifacts] - Deliverable download URLs
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} [error_message] - Error message if task failed
 * @property {string} created_at - ISO 8601 timestamp
 * @property {string} updated_at - ISO 8601 timestamp
 */

/**
 * Submits an asynchronous NodeODM drone photogrammetry reconstruction mission.
 * 
 * @param {ODMTaskRequest} params - Photogrammetry reconstruction parameters
 * @returns {Promise<ODMTaskResponse>} Initial queued task state and tracking identifiers
 */
export const submitOdmTask = async (params) => {
  const response = await giosApi.post('/api/v1/drone/odm-tasks', params);
  return response.data;
};

/**
 * Retrieves the current status, stage progress, and deliverables of an active NodeODM mission.
 * 
 * @param {string} taskId - Task identifier
 * @returns {Promise<ODMTaskResponse>} Real-time stage progress and artifact URLs
 */
export const getOdmTaskStatus = async (taskId) => {
  const response = await giosApi.get(`/api/v1/drone/odm-tasks/${taskId}`);
  return response.data;
};

/**
 * Lists all registered NodeODM photogrammetry tasks.
 * 
 * @returns {Promise<{total_count: number, tasks: ODMTaskResponse[]}>} List of recorded tasks
 */
export const listOdmTasks = async () => {
  const response = await giosApi.get('/api/v1/drone/odm-tasks');
  return response.data;
};

/**
 * @typedef {Object} QualityMosaicRequest
 * @property {string} [mosaic_id='QUALITY_MOSAIC_2026_Q3'] - Unique composite mosaic identifier
 * @property {string} [collection='sentinel-2-l2a'] - Underlying satellite imagery collection
 * @property {string[]} [scene_ids] - Candidate scene identifiers
 * @property {string[]} [date_range] - Acquisition date range [start, end]
 * @property {number[]} [bbox] - Optional bounding box [min_lon, min_lat, max_lon, max_lat]
 * @property {'max_ndvi'|'min_cloud_probability'|'temporal_median'|'medoid'|'max_ndwi'|'min_swir'} [method='max_ndvi'] - Selection rule
 * @property {number} [cloud_threshold_percent=20.0] - Pre-filter scene cloud tolerance
 * @property {string[]} [target_bands] - Target spectral bands
 * @property {boolean} [mask_shadows=true] - Apply cloud shadow dilation mask
 * @property {boolean} [mask_snow=true] - Mask out snow/ice pixels
 */

/**
 * @typedef {Object} SceneContribution
 * @property {string} scene_id - Scene identifier
 * @property {string} acquisition_date - Acquisition date
 * @property {number} cloud_coverage_percent - Native cloud coverage
 * @property {number} pixel_contribution_percent - Contribution percentage
 * @property {number} mean_ndvi - Mean NDVI of selected pixels
 * @property {number} valid_pixels - Count of selected clear pixels
 */

/**
 * @typedef {Object} QualityMosaicResponse
 * @property {string} mosaic_id - Mosaic identifier
 * @property {string} collection - Imagery collection
 * @property {string} method - Compositing rule applied
 * @property {number} total_input_scenes - Input scene count
 * @property {number} valid_scenes_used - Valid contributing scene count
 * @property {number} total_pixels_processed - Total pixels evaluated
 * @property {number} cloud_free_coverage_percent - Achieved cloud-free percentage
 * @property {number} mean_quality_score - Mean radiometric quality score
 * @property {string} quality_tier - Composite quality tier
 * @property {Object} [tier_metadata] - Tier badge styling and labels
 * @property {SceneContribution[]} scene_contributions - Scene pixel contribution details
 * @property {string[]} bands - Spectral bands included
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} composed_at - ISO 8601 timestamp
 */

/**
 * Generates a multi-temporal cloud-free quality mosaic composite using greenest/clearest pixel criteria.
 * 
 * @param {QualityMosaicRequest} params - Mosaicing parameters
 * @returns {Promise<QualityMosaicResponse>} Composite metadata, cloud-free coverage, and tile URL template
 */
export const processQualityMosaic = async (params) => {
  const response = await giosApi.post('/api/v1/mosaic/quality-mosaic', params);
  return response.data;
};

/**
 * @typedef {Object} HazardAlertSubscriptionRequest
 * @property {string} [subscription_id='SUB_WEBHOOK_001'] - Unique subscription identifier
 * @property {string} [recipient_name='Geotechnical Monitoring Center'] - Organization title
 * @property {'webhook'|'sse_stream'|'email_digest'|'sms_urgent'} [channel='webhook'] - Dispatch channel
 * @property {string} [endpoint_url] - Webhook callback URL
 * @property {string[]} [monitored_asset_ids] - Monitored asset IDs
 * @property {string[]} [alert_types] - Subscribed hazard alert categories
 * @property {'normal'|'advisory'|'watch'|'warning'|'emergency'} [minimum_severity='warning'] - Cutoff severity
 * @property {number} [cooldown_minutes=60] - Alert storm dampening window
 * @property {boolean} [active=true] - Active listening state
 */

/**
 * @typedef {Object} HazardAlertEvent
 * @property {string} event_id - Incident identifier
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} asset_id - Asset identifier
 * @property {string} asset_name - Human-readable asset title
 * @property {string} alert_type - Hazard type category
 * @property {string} severity_tier - Threat tier
 * @property {Object} [tier_metadata] - Tier badge styling and labels
 * @property {number} z_score - Statistical anomaly z-score
 * @property {number} measured_value - Observed physical measurement
 * @property {number} threshold_value - Critical threshold limit
 * @property {string} unit - Measurement unit
 * @property {string} summary - Operational alert summary
 * @property {string} action_recommended - Recommended SOP response action
 * @property {number} latitude - WGS84 latitude coordinate
 * @property {number} longitude - WGS84 longitude coordinate
 */

/**
 * @typedef {Object} HazardAlertDispatchResponse
 * @property {string} dispatch_id - Dispatch execution ID
 * @property {string} event_id - Associated hazard event ID
 * @property {number} recipient_count - Number of endpoints notified
 * @property {string} channel - Transmission protocol
 * @property {'delivered'|'queued'|'retrying'|'failed'} delivery_status - Delivery status
 * @property {number} latency_ms - Dispatch latency in ms
 * @property {string} dispatched_at - ISO 8601 timestamp
 * @property {HazardAlertEvent} [event] - Embedded hazard event
 */

/**
 * Subscribes an endpoint or operator to automated multi-hazard early warning alert notifications.
 * 
 * @param {HazardAlertSubscriptionRequest} params - Subscription configuration
 * @returns {Promise<Object>} Created subscription record
 */
export const subscribeHazardAlerts = async (params) => {
  const response = await giosApi.post('/api/v1/alerts/subscriptions', params);
  return response.data;
};

/**
 * Lists all active multi-hazard early warning alert subscriptions.
 * 
 * @returns {Promise<Array<Object>>} List of registered alert subscriptions
 */
export const listHazardAlertSubscriptions = async () => {
  const response = await giosApi.get('/api/v1/alerts/subscriptions');
  return response.data;
};

/**
 * Manually dispatches or simulates a multi-hazard early warning alert across configured delivery channels.
 * 
 * @param {Object} params - Alert dispatch parameters
 * @returns {Promise<HazardAlertDispatchResponse>} Dispatch confirmation and recipient telemetry
 */
export const dispatchHazardAlert = async (params) => {
  const response = await giosApi.post('/api/v1/alerts/dispatch', params);
  return response.data;
};

/**
 * Returns the SSE streaming URL for multi-hazard real-time alerts.
 * 
 * @returns {string} Fully qualified or relative EventSource URL
 */
export const getHazardAlertStreamUrl = () => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/alerts/stream`;
};

/**
 * @typedef {Object} DamBreachParameters
 * @property {number} [dam_height_m=45.0] - Structural dam embankment height in meters
 * @property {number} [reservoir_volume_m3=12500000.0] - Stored reservoir impoundment water/slurry volume in m3
 * @property {number} [breach_width_m=65.0] - Average breach channel top width in meters
 * @property {number} [breach_depth_m=35.0] - Final breach bottom incision depth in meters
 * @property {number} [breach_formation_time_hr=1.5] - Time of breach development in hours
 * @property {number} [peak_discharge_m3s] - Peak breach discharge Qp in m3/s
 * @property {'overtopping'|'piping_internal_erosion'|'slope_instability_slide'|'foundation_liquefaction'|'instantaneous_collapse'} [breach_mechanism='overtopping'] - Initiating failure mechanism
 * @property {'newtonian_water'|'bingham_plastic_slurry'|'herschel_bulkley_tailings'|'dilatant_granular'} [rheology_model='herschel_bulkley_tailings'] - Slurry rheology model
 * @property {number} [manning_n_roughness=0.040] - Manning floodplain hydraulic roughness coefficient
 * @property {number} [slurry_yield_stress_pa=45.0] - Slurry yield stress in Pascals
 * @property {number} [slurry_density_kg_m3=1450.0] - Slurry bulk density in kg/m3
 */

/**
 * @typedef {Object} DownstreamReceptor
 * @property {string} receptor_id - Unique infrastructure asset identifier
 * @property {string} name - Asset title or community name
 * @property {string} exposure_type - Infrastructure vulnerability category
 * @property {number} distance_downstream_km - Thalweg distance downstream from dam in km
 * @property {number} elevation_m - Ground elevation at receptor in meters
 * @property {number} [population_at_risk=0] - Estimated resident population exposed
 * @property {number} latitude - WGS84 latitude coordinate
 * @property {number} longitude - WGS84 longitude coordinate
 * @property {number} [arrival_time_min] - Hydrodynamic flood wave front arrival time in minutes
 * @property {number} [peak_depth_m] - Maximum inundation depth at receptor in meters
 * @property {number} [peak_velocity_ms] - Peak flow velocity at receptor in m/s
 * @property {number} [hazard_intensity_product] - Hazard product v * h in m2/s
 * @property {string} [hazard_tier] - Classified hazard severity tier
 * @property {number} [vulnerability_score] - Asset structural fragility damage ratio (0.0 - 1.0)
 * @property {string} [evacuation_urgency] - Classified evacuation urgency tier
 */

/**
 * @typedef {Object} InundationTimeSlice
 * @property {number} timestep_minutes - Elapsed simulation time in minutes
 * @property {number} inundation_area_ha - Flooded footprint area in hectares
 * @property {number} max_depth_m - Maximum flood depth across simulation grid in meters
 * @property {number} mean_depth_m - Spatially averaged inundation depth in meters
 * @property {number} max_velocity_ms - Maximum flow velocity in m/s
 * @property {number} wave_front_distance_km - Leading wave front position downstream in km
 * @property {number} slurry_volume_released_m3 - Cumulative slurry volume discharged in m3
 */

/**
 * @typedef {Object} EvacuationCorridor
 * @property {string} corridor_id - Unique evacuation route identifier
 * @property {string} name - Designated emergency evacuation corridor name
 * @property {assembly_point} assembly_point - High-ground safe haven name
 * @property {number} safe_elevation_m - Minimum safe terrain elevation in meters
 * @property {number} [buffer_distance_m=150.0] - Lateral safety standoff buffer in meters
 * @property {number} estimated_evacuation_time_min - Estimated egress transit time in minutes
 * @property {string} [route_status='open'] - Route viability ('open', 'threatened_by_flood', 'impassable')
 * @property {Array<Array<number>>} coordinates - GeoJSON line coordinates [[lon, lat], ...]
 */

/**
 * @typedef {Object} DamBreakHydrodynamicRequest
 * @property {string} [simulation_id='SIM_DAM_BREAK_001'] - Simulation run identifier
 * @property {string} [dam_id='TAILINGS_DAM_A'] - Monitored dam asset ID
 * @property {string} [dam_name='North Tailings Impoundment'] - Human-readable dam asset name
 * @property {number[]} [dam_coordinates=[-44.1234, -20.1234]] - WGS84 [longitude, latitude] of dam breach axis
 * @property {DamBreachParameters} [breach_params] - Geotechnical and hydraulic breach configuration
 * @property {number} [simulation_duration_hours=6.0] - Hydrodynamic modeling duration in hours
 * @property {number} [timestep_interval_min=15.0] - Reporting interval in minutes
 * @property {number} [dem_resolution_m=10.0] - DEM spatial resolution in meters
 * @property {DownstreamReceptor[]} [receptors] - Downstream receptors to evaluate
 * @property {boolean} [generate_evacuation_corridors=true] - Whether to generate evacuation corridors
 * @property {boolean} [include_time_slices=true] - Whether to generate progressive time slices
 */

/**
 * @typedef {Object} DamBreakHydrodynamicResponse
 * @property {string} simulation_id - Simulation execution ID
 * @property {string} dam_id - Dam asset ID
 * @property {string} dam_name - Dam asset name
 * @property {string} status - Simulation execution status
 * @property {number} peak_breach_discharge_m3s - Peak breach hydrograph discharge in m3/s
 * @property {number} total_volume_discharged_m3 - Total slurry volume discharged in m3
 * @property {number} max_inundation_area_ha - Flooded surface area in hectares
 * @property {number} max_flood_depth_m - Peak flood depth across floodplain in meters
 * @property {number} max_flow_velocity_ms - Peak flow velocity in m/s
 * @property {number} max_hazard_product_m2s - Maximum hazard product v * h in m2/s
 * @property {string} overall_hazard_tier - Maximum classified floodplain hazard tier
 * @property {Object} [tier_metadata] - Styling badge and hazard impact metadata
 * @property {number} time_to_peak_hours - Time to peak discharge in hours
 * @property {number} total_receptors_impacted - Inundated receptor count
 * @property {number} total_population_at_risk - Exposed population in hazard zone
 * @property {DownstreamReceptor[]} receptors - Downstream receptors with wave arrival times
 * @property {InundationTimeSlice[]} time_slices - Progressive flood wave time slices
 * @property {EvacuationCorridor[]} evacuation_corridors - Emergency evacuation corridors
 * @property {Object} [inundation_boundary_geojson] - GeoJSON polygon geometry of maximum inundation
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} simulated_at - ISO 8601 timestamp
 */

/**
 * Simulates 2D shallow water tailings dam breach hydrodynamics, flood wave progression, and downstream receptor exposure.
 * 
 * @param {DamBreakHydrodynamicRequest} params - Dam-break hydrodynamic simulation parameters
 * @returns {Promise<DamBreakHydrodynamicResponse>} Simulation results, wave arrival times, and evacuation corridors
 */
export const simulateDamBreakHydrodynamics = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/dam-break-hydrodynamics', params);
  return response.data;
};

/**
 * Fetches designated emergency evacuation corridors and safe assembly points for a dam break simulation.
 * 
 * @param {string} simId - Dam-break simulation identifier
 * @returns {Promise<EvacuationCorridor[]>} List of evacuation corridors with muster zone coordinates
 */
export const fetchDamBreakEvacuationCorridors = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/dam-break/${simId}/evacuation-corridors`);
  return response.data;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for dam-break inundation depth or hazard product.
 * 
 * @param {string} simId - Simulation execution identifier
 * @param {string} [metric='hazard_product'] - Inundation metric ('hazard_product' | 'depth' | 'velocity')
 * @returns {string} Tile URL template
 */
export const getDamBreakTileUrlTemplate = (simId, metric = 'hazard_product') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/dam-break/${simId}/${metric}/{z}/{x}/{y}.png`;
};

/**
 * ============================================================================
 * Task T-132: Geotechnical Embankment Phreatic Surface Seepage & SWRC Client SDK
 * ============================================================================
 */

/**
 * @typedef {Object} VanGenuchtenParameters
 * @property {number} [theta_s=0.42] - Saturated volumetric water content (m3/m3)
 * @property {number} [theta_r=0.06] - Residual volumetric water content (m3/m3)
 * @property {number} [alpha_1_kpa=0.015] - Inverse of air-entry suction (1/kPa)
 * @property {number} [n_param=1.80] - Pore size distribution parameter (n > 1.0)
 * @property {number} [ksat_m_s=1.2e-6] - Saturated hydraulic conductivity (m/s)
 * @property {string} [soil_texture='silt_tailings'] - Soil texture class identifier
 */

/**
 * @typedef {Object} PiezometerReading
 * @property {string} piezometer_id - Sensor identifier
 * @property {string} name - Sensor label
 * @property {string} [piezometer_type='vibrating_wire'] - Instrumentation type
 * @property {number} station_x_m - Distance from upstream toe (m)
 * @property {number} tip_elevation_m - Elevation of sensor tip (m)
 * @property {number} pore_water_pressure_kpa - Measured pore water pressure (kPa)
 * @property {number} [measured_head_m] - Measured total hydraulic head (m)
 * @property {number} [simulated_head_m] - Simulated total hydraulic head (m)
 * @property {number} [residual_head_m] - Residual head in meters
 * @property {string} [anomaly_status='normal_convergence'] - Convergence status
 */

/**
 * @typedef {Object} PhreaticStation
 * @property {number} station_x_m - Distance from upstream toe along base (m)
 * @property {number} phreatic_elevation_m - Elevation of phreatic water table (m)
 * @property {number} total_head_m - Total hydraulic head elevation (m)
 * @property {number} pore_pressure_kpa - Pore water pressure at base (kPa)
 * @property {number} exit_gradient - Hydraulic exit gradient at station
 * @property {number} effective_saturation - Effective soil saturation Se (0.0 - 1.0)
 * @property {number} matric_suction_kpa - Matric suction psi (kPa)
 */

/**
 * @typedef {Object} PhreaticSeepageRequest
 * @property {string} [simulation_id] - Simulation execution ID
 * @property {string} [dam_id='TAILINGS_DAM_A'] - Dam facility identifier
 * @property {string} [dam_name='North Tailings Impoundment'] - Dam name
 * @property {number} [reservoir_pool_elevation_m=812.0] - Upstream reservoir pool elevation (m)
 * @property {number} [tailwater_elevation_m=752.0] - Downstream tailwater / filter elevation (m)
 * @property {Object} [embankment] - Embankment cross-sectional geometry
 * @property {VanGenuchtenParameters} [soil_params] - Soil water retention parameters
 * @property {PiezometerReading[]} [piezometers] - In-situ piezometer readings
 * @property {number} [transect_stations_count=50] - Number of cross-section stations
 */

/**
 * @typedef {Object} PhreaticSeepageResponse
 * @property {string} simulation_id - Simulation execution ID
 * @property {string} dam_id - Dam identifier
 * @property {string} dam_name - Dam facility name
 * @property {string} status - Simulation status
 * @property {number} reservoir_head_m - Upstream water head (m)
 * @property {number} tailwater_head_m - Downstream water head (m)
 * @property {number} seepage_discharge_m3s_m - Seepage discharge per linear meter (m3/s/m)
 * @property {number} exit_gradient_max - Maximum hydraulic exit gradient
 * @property {number} factor_of_safety_piping - Factor of safety against boiling and piping
 * @property {string} hazard_tier - Seepage hazard tier identifier
 * @property {Object} [tier_metadata] - Detailed hazard config
 * @property {PhreaticStation[]} phreatic_stations - Discrete cross-section stations
 * @property {PiezometerReading[]} piezometer_fusion - Calibrated piezometer network
 * @property {Object} [cross_section_geojson] - Cross-section FeatureCollection
 * @property {string} tile_url_template - Dynamic XYZ tile URL template
 * @property {string} simulated_at - ISO timestamp
 */

/**
 * @typedef {Object} SWRCInversionRequest
 * @property {string} [soil_texture='silt_tailings'] - Soil texture class
 * @property {number[]} [matric_suction_range_kpa] - Suction values to evaluate
 * @property {VanGenuchtenParameters} [van_genuchten] - Custom Van Genuchten parameters
 */

/**
 * @typedef {Object} SWRCInversionResponse
 * @property {string} soil_texture - Soil texture identifier
 * @property {VanGenuchtenParameters} van_genuchten - Van Genuchten parameter set
 * @property {number} air_entry_suction_kpa - Inverse of alpha parameter (air-entry value)
 * @property {number} residual_water_content - Residual water content theta_r
 * @property {number} saturated_water_content - Saturated water content theta_s
 * @property {Array<{matric_suction_kpa: number, effective_saturation: number, volumetric_water_content: number, relative_conductivity: number, unsaturated_conductivity_m_s: number}>} curve_points - Points along retention curve
 * @property {string} calculated_at - ISO timestamp
 */

/**
 * Simulates 2D Dupuit-Forchheimer unconfined phreatic line seepage and in-situ piezometer head fusion.
 * 
 * @param {PhreaticSeepageRequest} params - Seepage simulation parameters
 * @returns {Promise<PhreaticSeepageResponse>} Seepage flow net, exit gradient, and piezometer fusion
 */
export const simulatePhreaticSeepage = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/phreatic-seepage', params);
  return response.data;
};

/**
 * Computes Van Genuchten Soil Water Retention Curve (SWRC) and unsaturated hydraulic conductivity.
 * 
 * @param {SWRCInversionRequest} params - SWRC parameter request
 * @returns {Promise<SWRCInversionResponse>} Soil moisture retention curve points and unsaturated conductivity
 */
export const calculateSwrcInversion = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/swrc-inversion', params);
  return response.data;
};

/**
 * Fetches in-situ piezometer sensor network and calibrated head residuals for an embankment dam.
 * 
 * @param {string} damId - Dam facility identifier
 * @returns {Promise<PiezometerReading[]>} List of piezometers with calibrated heads and anomaly status
 */
export const fetchPiezometerNetwork = async (damId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/piezometers/${damId}`);
  return response.data;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for phreatic seepage saturation or pore pressure.
 * 
 * @param {string} simId - Seepage simulation execution identifier
 * @param {string} [metric='saturation'] - Raster metric ('saturation' | 'pore_pressure' | 'gradient' | 'hydraulic_head')
 * @returns {string} Tile URL template
 */
export const getPhreaticSeepageTileUrlTemplate = (simId, metric = 'saturation') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/phreatic-seepage/${simId}/${metric}/{z}/{x}/{y}.png`;
};

/**
 * @typedef {Object} CircularSlipSurface
 * @property {number} center_x - Horizontal center coordinate of slip arc (m)
 * @property {number} center_y - Vertical center coordinate of slip arc (m)
 * @property {number} radius_m - Radius of slip circle (m)
 * @property {number} entry_x - Slip circle crest entry coordinate (m)
 * @property {number} exit_x - Slip circle toe exit coordinate (m)
 * @property {number} arc_length_m - Total developed circular arc length (m)
 */

/**
 * @typedef {Object} SlopeSlice
 * @property {number} slice_index - 0-indexed slice order from toe to crest
 * @property {number} x_mid - Slice horizontal centroid (m)
 * @property {number} width_m - Slice horizontal width delta x (m)
 * @property {number} height_m - Mean vertical column height (m)
 * @property {number} weight_kn - Total slice gravity weight W (kN/m)
 * @property {number} alpha_rad - Base inclination angle in radians
 * @property {number} alpha_deg - Base inclination angle in degrees
 * @property {number} base_pore_pressure_kpa - Pore water pressure u at slice base (kPa)
 * @property {number} cohesion_kpa - Effective cohesion c' (kPa)
 * @property {number} friction_angle_deg - Effective friction angle phi' (deg)
 * @property {number} pore_water_force_kn - Base pore water force U = u * b / cos(alpha) (kN/m)
 * @property {number} effective_normal_force_kn - Effective normal force N' (kN/m)
 * @property {number} shear_strength_kn - Available resisting shear force (kN/m)
 * @property {number} mobilized_shear_kn - Mobilized driving shear force (kN/m)
 * @property {number} m_alpha - Bishop geometric iteration denominator term
 */

/**
 * @typedef {Object} InSARCreepVector
 * @property {string} point_id - Permanent scatterer (PS) target identifier
 * @property {string} station_id - Nearest embankment station chainage identifier
 * @property {number} latitude - Geodetic latitude (WGS84)
 * @property {number} longitude - Geodetic longitude (WGS84)
 * @property {number} elevation_m - Topographic elevation (m MASL)
 * @property {number} embankment_station_m - Chainage along longitudinal dam crest axis (m)
 * @property {number} los_velocity_mm_yr - Mean line-of-sight displacement velocity (mm/year)
 * @property {number} los_displacement_cumulative_mm - Cumulative cumulative LOS displacement (mm)
 * @property {number} shear_strain_rate_microstrain_yr - Estimated shear strain deformation rate (microstrain/yr)
 * @property {'stable_negligible' | 'linear_steady_creep' | 'elevated_creep_rate' | 'tertiary_accelerating_creep'} creep_status - Classified creep kinematics tier
 * @property {number} temporal_coherence - Interferometric phase coherence gamma [0..1]
 * @property {string} sensor_platform - Radar constellation satellite platform
 * @property {string} last_acquisition_utc - ISO UTC timestamp of latest SAR pass
 */

/**
 * @typedef {Object} BishopSlopeStabilityRequest
 * @property {string} [dam_id='DAM-BARRAGEM-B1'] - Embankment structure identifier
 * @property {string} [soil_texture='silt_tailings'] - Soil texture class for default shear parameters
 * @property {number} [friction_angle_phi_deg] - Effective internal friction angle phi' (degrees)
 * @property {number} [cohesion_c_kpa] - Effective cohesion intercept c' (kPa)
 * @property {number} [unit_weight_sat_kn_m3] - Saturated soil bulk unit weight (kN/m3)
 * @property {number} [unit_weight_dry_kn_m3] - Dry/unsaturated soil unit weight (kN/m3)
 * @property {number} [crest_height_m=42.0] - Total embankment vertical height (m)
 * @property {number} [crest_width_m=10.0] - Embankment crest horizontal width (m)
 * @property {number} [upstream_slope=2.5] - Upstream slope ratio 1:H
 * @property {number} [downstream_slope=2.0] - Downstream slope ratio 1:H
 * @property {string} [phreatic_surface_sim_id] - Optional ID of coupled phreatic seepage simulation
 * @property {Array<[number, number]>} [phreatic_stations] - 2D coordinates [[x, y], ...] defining phreatic line
 * @property {number} [seismic_coefficient_kh=0.0] - Pseudo-static horizontal seismic acceleration coefficient
 * @property {number} [num_slices=25] - Number of vertical slices for discretization
 * @property {number} [center_x=25.0] - Trial circle rotation center x (m)
 * @property {number} [center_y=65.0] - Trial circle rotation center y (m)
 * @property {number} [radius_m=45.0] - Trial circle radius R (m)
 * @property {'bishops_simplified' | 'janbu_simplified'} [method='bishops_simplified'] - Limit equilibrium solution method
 */

/**
 * @typedef {Object} BishopSlopeStabilityResponse
 * @property {string} sim_id - Simulation execution identifier
 * @property {string} dam_id - Embankment identifier
 * @property {'bishops_simplified' | 'janbu_simplified'} method - Limit equilibrium algorithm used
 * @property {number} factor_of_safety - Computed limit equilibrium Factor of Safety (FS)
 * @property {'critical_instability' | 'high_hazard' | 'marginal' | 'stable' | 'optimal_design'} hazard_tier - Classified slope hazard tier
 * @property {string} hazard_color - Hex color code for visualization
 * @property {number} iterations_converged - Iteration count to satisfy convergence tolerance
 * @property {number} convergence_tolerance_achieved - Absolute residual difference |FS_new - FS_old|
 * @property {number} driving_moment_kn_m - Sum of destabilizing overturning moments (kN*m/m)
 * @property {number} resisting_moment_kn_m - Sum of stabilizing shear resistance moments (kN*m/m)
 * @property {number} total_weight_kn - Total weight of potential sliding soil mass (kN/m)
 * @property {number} mean_pore_pressure_kpa - Average base pore water pressure across slices (kPa)
 * @property {number} seismic_coefficient_kh - Horizontal pseudo-static coefficient applied
 * @property {CircularSlipSurface} critical_slip_surface - Geometry of circular slip arc
 * @property {SlopeSlice[]} slices - Discretized slice column parameters
 * @property {Object} [insar_creep_correlation] - Coupled InSAR radar creep kinematics summary
 * @property {string} calculated_at - ISO timestamp of calculation
 */

/**
 * @typedef {Object} SlipSurfaceSearchRequest
 * @property {string} [dam_id='DAM-BARRAGEM-B1'] - Embankment structure identifier
 * @property {string} [soil_texture='silt_tailings'] - Soil texture class
 * @property {number} [crest_height_m=42.0] - Total embankment vertical height (m)
 * @property {number} [crest_width_m=10.0] - Embankment crest horizontal width (m)
 * @property {number} [downstream_slope=2.0] - Downstream slope ratio 1:H
 * @property {number} [seismic_coefficient_kh=0.0] - Horizontal seismic coefficient
 * @property {number} [num_slices=25] - Discretized slice count per trial circle
 * @property {number[]} [center_x_range=[15.0, 35.0]] - Grid search bounds for center X [min, max]
 * @property {number[]} [center_y_range=[50.0, 75.0]] - Grid search bounds for center Y [min, max]
 * @property {number[]} [radius_range=[35.0, 60.0]] - Grid search bounds for Radius R [min, max]
 * @property {number} [grid_steps=5] - Step count along each search dimension
 * @property {'bishops_simplified' | 'janbu_simplified'} [method='bishops_simplified'] - Limit equilibrium method
 */

/**
 * @typedef {Object} SlipSurfaceSearchResponse
 * @property {string} search_id - Unique search execution identifier
 * @property {string} dam_id - Embankment structure identifier
 * @property {number} surfaces_evaluated - Total number of kinematically valid trial slip circles tested
 * @property {number} min_factor_of_safety - Global minimum Factor of Safety discovered
 * @property {'critical_instability' | 'high_hazard' | 'marginal' | 'stable' | 'optimal_design'} hazard_tier - Critical hazard tier
 * @property {string} hazard_color - Hex color code for visualization
 * @property {CircularSlipSurface} critical_surface - Geometric parameters of the critical slip arc
 * @property {BishopSlopeStabilityResponse} critical_simulation - Complete slice breakdown of the critical surface
 * @property {string} calculated_at - ISO timestamp of search completion
 */

/**
 * Simulates geotechnical circular/non-circular slope stability using Bishop's Simplified or Janbu's Limit Equilibrium Method.
 * 
 * @param {BishopSlopeStabilityRequest} params - Slope geometry, shear strength, phreatic pore pressure, and slip circle parameters
 * @returns {Promise<BishopSlopeStabilityResponse>} Factor of Safety, slice breakdown, pore pressures, and hazard tier
 */
export const simulateBishopSlopeStability = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/slope-stability-bishop', params);
  return response.data;
};

/**
 * Executes a 3D grid search optimization to discover the critical minimum Factor of Safety circular slip surface.
 * 
 * @param {SlipSurfaceSearchRequest} params - Center coordinate and radius search boundaries
 * @returns {Promise<SlipSurfaceSearchResponse>} Critical slip circle geometry, minimum Factor of Safety, and slice details
 */
export const searchCriticalSlipSurface = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/slip-surface-search', params);
  return response.data;
};

/**
 * Fetches satellite InSAR line-of-sight creep displacement vectors and shear strain rates for an embankment dam.
 * 
 * @param {string} damId - Embankment dam identifier
 * @returns {Promise<InSARCreepVector[]>} List of InSAR scatterer points with velocity, strain rate, and creep kinematics tier
 */
export const fetchInSARCreepVectors = async (damId) => {
  const response = await giosApi.get(`/api/v1/geotechnical/insar-creep/${damId}`);
  return response.data;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for slope stability Factor of Safety or pore pressure maps.
 * 
 * @param {string} simId - Slope stability simulation execution identifier
 * @param {string} [metric='factor_of_safety'] - Raster metric ('factor_of_safety' | 'pore_pressure' | 'shear_stress' | 'mobilization')
 * @returns {string} Tile URL template
 */
export const getSlopeStabilityTileUrlTemplate = (simId, metric = 'factor_of_safety') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/slope-stability/${simId}/${metric}/{z}/{x}/{y}.png`;
};

/**
 * Simulates transient Green-Ampt rainfall infiltration, wetting front downward penetration,
 * matric suction loss, and dynamic slope Factor of Safety decay curves.
 * 
 * @param {Object} params - Infiltration simulation parameters
 * @param {string} [params.damId='TAILINGS_DAM_A'] - Dam facility identifier
 * @param {string} [params.soilTexture='silt_tailings'] - Embankment shell soil texture
 * @param {number} [params.rainfallIntensityMmHr=15.0] - Storm rainfall intensity (mm/hr)
 * @param {number} [params.stormDurationHr=24.0] - Total duration of rainfall storm (hours)
 * @param {number} [params.criticalSlipDepthM=3.5] - Depth of critical shear surface (m)
 * @param {number} [params.initialSuctionPsi0Kpa=30.0] - Antecedent unsaturated matric suction (kPa)
 * @param {number} [params.phiBDeg=14.0] - Fredlund suction friction angle (degrees)
 * @param {number} [params.baselineFactorOfSafety=1.52] - Pre-storm slope Factor of Safety
 * @returns {Promise<Object>} Infiltration response with time-steps, wetting front depth, minimum FS, and decay curve GeoJSON
 */
export const simulateRainfallInfiltration = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/rainfall-infiltration', params);
  return response.data;
};

/**
 * Computes Apparent Thermal Inertia (ATI) from diurnal optical/thermal remote sensing imagery
 * and delineates anomalous high-inertia phreatic seepage daylighting zones.
 * 
 * @param {Object} params - Apparent Thermal Inertia analysis parameters
 * @param {string} [params.damId='TAILINGS_DAM_A'] - Dam facility identifier
 * @param {string} [params.daySceneId] - Daytime satellite scene identifier
 * @param {string} [params.nightSceneId] - Nighttime satellite thermal scene identifier
 * @param {number} [params.solarCorrectionFactor=1.0] - Insolation angle correction factor
 * @param {number} [params.minAtiThreshold=0.045] - Seepage anomaly threshold
 * @param {Array<Object>} [params.transectPoints] - Cross-sectional transect stations
 * @returns {Promise<Object>} ATI response with anomaly classification, points array, and seepage footprint
 */
export const analyzeApparentThermalInertia = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/thermal/apparent-inertia', params);
  return response.data;
};

export const fetchApparentThermalInertia = analyzeApparentThermalInertia;

/**
 * Constructs a dynamic XYZ tile streaming URL template for rainfall infiltration wetting front maps.
 * 
 * @param {string} simId - Infiltration simulation execution identifier
 * @param {string} [metric='factor_of_safety'] - Raster metric ('factor_of_safety' | 'wetting_front' | 'suction' | 'infiltration_rate')
 * @returns {string} Tile URL template
 */
export const getRainfallInfiltrationTileUrlTemplate = (simId, metric = 'factor_of_safety') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/rainfall-infiltration/${simId}/${metric}/{z}/{x}/{y}.png`;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for Apparent Thermal Inertia maps.
 * 
 * @param {string} analysisId - ATI analysis execution identifier
 * @param {string} [metric='thermal_inertia'] - Raster metric ('thermal_inertia' | 'seepage_anomaly' | 'dtr')
 * @returns {string} Tile URL template
 */
export const getApparentThermalInertiaTileUrlTemplate = (analysisId, metric = 'thermal_inertia') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/thermal/apparent-inertia/${analysisId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildRainfallInfiltrationTileUrlTemplate = getRainfallInfiltrationTileUrlTemplate;
export const buildApparentThermalInertiaTileUrlTemplate = getApparentThermalInertiaTileUrlTemplate;

/**
 * @typedef {Object} SPTSoundingPoint
 * @property {number} depth_m - Depth below ground surface (m)
 * @property {number} spt_n_blows - Measured raw SPT field blow count N (blows/30cm)
 * @property {number} [fines_content_pct=15.0] - Percentage fines passing #200 sieve
 * @property {number} [cn_overburden_factor] - Overburden normalization factor CN
 * @property {number} [n60_blows] - Energy-corrected blow count N60
 * @property {number} [normalized_n1_60] - Overburden-corrected blow count (N1)60
 * @property {number} [clean_sand_n1_60cs] - Clean sand equivalent (N1)60cs
 * @property {number} [cyclic_stress_ratio_csr] - Induced Cyclic Stress Ratio (CSR)
 * @property {number} [cyclic_resistance_ratio_crr75] - Cyclic Resistance Ratio (CRR7.5)
 * @property {number} [factor_of_safety_liq] - Factor of safety against liquefaction
 * @property {string} [hazard_tier] - Classified liquefaction susceptibility tier
 * @property {number} [excess_pore_pressure_ratio_ru] - Cyclic excess pore pressure ratio ru
 */

/**
 * @typedef {Object} Vs30ProxyResponse
 * @property {number} latitude - Latitude coordinate (WGS84)
 * @property {number} longitude - Longitude coordinate (WGS84)
 * @property {number} slope_deg - Topographic slope angle in degrees
 * @property {number} slope_m_m - Topographic slope gradient m/m
 * @property {string} terrain_type - Regional tectonic activity classification
 * @property {number} vs30_m_s - Estimated upper 30m shear wave velocity (m/s)
 * @property {string} nehrp_site_class - NEHRP Site Class (class_a through class_f)
 * @property {string} site_class_name - Descriptive NEHRP site class name
 * @property {number} site_amplification_fa - Short-period site amplification factor Fa
 * @property {number} normalized_vs1_m_s - Overburden-normalized shear wave velocity Vs1
 * @property {number} crr75_vs - Andrus & Stokoe (2000) Cyclic Resistance Ratio
 * @property {string} liquefaction_susceptibility - Classified qualitative susceptibility
 * @property {string} source_reference - Scientific literature citation
 * @property {string} analyzed_at - ISO 8601 calculation timestamp
 */

/**
 * @typedef {Object} DynamicPorePressureResponse
 * @property {string} dam_id - Target embankment dam identifier
 * @property {number} sigma_v0_eff_kpa - Initial effective vertical stress (kPa)
 * @property {number} factor_of_safety_liq - Factor of Safety against liquefaction
 * @property {number} excess_pore_pressure_ratio_ru - Generated excess pore pressure ratio ru
 * @property {number} excess_pore_pressure_delta_u_kpa - Dynamic excess pore water pressure (kPa)
 * @property {number} post_cyclic_effective_stress_kpa - Post-liquefaction residual effective stress (kPa)
 * @property {number} effective_stress_loss_pct - Percentage effective stress reduction
 * @property {boolean} liquefaction_triggered - Flag indicating whether full liquefaction occurred (FS < 1.0)
 * @property {string} hazard_tier - Liquefaction hazard tier
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} FlowSlideRunoutResponse
 * @property {string} dam_id - Dam facility identifier
 * @property {string} dam_name - Descriptive dam impoundment name
 * @property {number} dam_height_m - Total structural dam height (m)
 * @property {number} reach_angle_deg - Post-failure travel reach angle alpha_r (degrees)
 * @property {number} apparent_friction_coef - Apparent friction coefficient tan(alpha_r)
 * @property {number} runout_distance_m - Fahrböschung runout distance L = H / tan(alpha_r) (m)
 * @property {number} volume_scaled_runout_m - Corominas/Martin volume-scaled distance (m)
 * @property {number} evacuation_buffer_m - 1.25x safety buffer envelope distance (m)
 * @property {string} mobility_tier - Runout mobility tier
 * @property {Object} [runout_envelope_geojson] - RFC 7946 GeoJSON FeatureCollection
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} SPTSoundingRequest
 * @property {string} [damId='TAILINGS_DAM_A'] - Embankment structure identifier
 * @property {string} [sptId='SPT_BH_01'] - Borehole sounding ID
 * @property {number} [groundwaterDepthM=2.5] - Depth to phreatic water surface (m)
 * @property {number} [unitWeightKnM3=18.0] - Total moist unit weight (kN/m3)
 * @property {number} [saturatedUnitWeightKnM3=20.0] - Saturated unit weight (kN/m3)
 * @property {number} [pgaG=0.20] - Peak Ground Acceleration in g
 * @property {number} [earthquakeMagnitudeMw=7.0] - Moment magnitude Mw
 * @property {SPTSoundingPoint[]} [points] - Discrete borehole test depths and blow counts
 */

/**
 * @typedef {Object} SPTSoundingResponse
 * @property {string} dam_id - Embankment identifier
 * @property {string} spt_id - Borehole sounding identifier
 * @property {number} total_depth_m - Total explored depth of borehole (m)
 * @property {number} mean_n1_60cs - Average clean sand normalized blow count
 * @property {number} min_fs_liq - Minimum factor of safety against cyclic liquefaction
 * @property {number} critical_depth_m - Critical depth of lowest factor of safety (m)
 * @property {string} overall_hazard_tier - Classified overall borehole hazard tier
 * @property {SPTSoundingPoint[]} points - Normalized depth points with CSR, CRR, and FS
 * @property {string} analyzed_at - ISO 8601 timestamp
 */

/**
 * Evaluates comprehensive tailings dynamic liquefaction susceptibility, Robertson CPTu profile,
 * Seed-Idriss CSR/CRR, Sadrekarimi static brittleness, and Zhang lateral spreading.
 * 
 * @param {Object} params - Tailings liquefaction simulation parameters
 * @returns {Promise<Object>} Factor of safety profile, LDI, InSAR residual, and hazard GeoJSON
 */
export const analyzeLiquefactionSusceptibility = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/liquefaction-susceptibility', params);
  return response.data;
};

export const simulateTailingsLiquefaction = analyzeLiquefactionSusceptibility;

/**
 * Retrieves a previously computed tailings dynamic liquefaction simulation by ID.
 * 
 * @param {string} simId - Liquefaction simulation execution identifier
 * @returns {Promise<Object>} Stored simulation results, depth profiles, and runout envelope
 */
export const fetchLiquefactionSimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/liquefaction/${simId}`);
  return response.data;
};

/**
 * Evaluates dynamic excess pore water pressure generation, effective stress loss, and liquefaction triggering.
 * 
 * @param {Object} params - Dynamic pore pressure parameters
 * @returns {Promise<DynamicPorePressureResponse>} Dynamic pore pressure response
 */
export const analyzeDynamicPorePressure = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/dynamic-pore-pressure', params);
  return response.data;
};

/**
 * Fetches satellite DEM topographic slope proxy for average 30m shear wave velocity (Vs30) and NEHRP site classification.
 * 
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Object} [params={}] - Optional query parameters (slope_deg, terrain_type, effective_stress_kpa)
 * @returns {Promise<Vs30ProxyResponse>} Vs30 velocity, NEHRP site class, and CRR7.5
 */
export const fetchVs30Proxy = async (lat, lon, params = {}) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/vs30-proxy/${lat}/${lon}`, { params });
  return response.data;
};

/**
 * Evaluates Standard Penetration Test (SPT) borehole profile for cyclic liquefaction susceptibility.
 * 
 * @param {SPTSoundingRequest} params - SPT sounding borehole request payload
 * @returns {Promise<SPTSoundingResponse>} Standardized SPT blow counts, CRR7.5, and minimum FS
 */
export const analyzeSptSounding = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/liquefaction/spt-sounding', params);
  return response.data;
};

/**
 * Computes post-liquefaction tailings flow slide reach angle, runout distance, and evacuation safety corridor.
 * 
 * @param {Object} params - Dam height, impounded volume, and reach angle
 * @returns {Promise<FlowSlideRunoutResponse>} Runout distance, mobility tier, and envelope GeoJSON
 */
export const analyzeFlowSlideRunout = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/liquefaction/flow-slide-runout', params);
  return response.data;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for tailings liquefaction Factor of Safety maps.
 * 
 * @param {string} simId - Liquefaction simulation execution identifier
 * @param {string} [metric='factor_of_safety'] - Raster metric ('factor_of_safety' | 'cyclic_stress_ratio' | 'excess_pore_pressure' | 'lateral_displacement')
 * @returns {string} Tile URL template
 */
export const getLiquefactionTileUrlTemplate = (simId, metric = 'factor_of_safety') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/liquefaction/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildLiquefactionTileUrlTemplateInternal = getLiquefactionTileUrlTemplate;

/**
 * @typedef {Object} SoilStratigraphicSublayer
 * @property {string} layer_id - Sublayer identifier, e.g. 'LYR_01'
 * @property {string} [soil_type='tailings_sand'] - Geotechnical soil classification
 * @property {number} depth_top_m - Depth to top of sublayer (m)
 * @property {number} depth_bottom_m - Depth to bottom of sublayer (m)
 * @property {number} spt_n1_60cs - Normalized clean-sand equivalent SPT blowcount
 * @property {number} factor_of_safety_liq - Dynamic liquefaction Factor of Safety (FS_liq)
 * @property {number} [relative_density_pct] - Soil relative density Dr (%)
 */

/**
 * @typedef {Object} PostLiquefactionSettlementRequest
 * @property {string} [simulation_id] - Optional simulation execution identifier
 * @property {string} [dam_id='TAILINGS_DAM_A'] - Tailings facility asset identifier
 * @property {string} [dam_name='North Tailings Impoundment'] - Asset name
 * @property {number} [crest_length_m=500.0] - Total crest length along centerline (m)
 * @property {number} [pga_g=0.25] - Peak Ground Acceleration (g)
 * @property {number} [earthquake_magnitude_mw=7.0] - Moment magnitude Mw
 * @property {number} [groundwater_depth_m=2.5] - Depth to phreatic water table (m)
 * @property {string} [calculation_method='ishihara_yoshimine_1992'] - Volumetric strain formulation
 * @property {SoilStratigraphicSublayer[]} [stratigraphic_layers] - Multi-layer soil column definition
 * @property {number} [insar_coherence=0.72] - Satellite InSAR coherence
 * @property {number} [insar_displacement_m] - Observed InSAR vertical displacement (m)
 * @property {number} [t50_days=14.0] - Days to 50% excess pore pressure dissipation
 * @property {number} [elapsed_days=7.0] - Elapsed days since seismic event
 */

/**
 * Evaluates comprehensive post-liquefaction volumetric reconsolidation strain (Ishihara & Yoshimine 1992),
 * crest settlement stratigraphic depth integration (Tokimatsu & Seed 1987), differential angular distortion,
 * and satellite InSAR vertical displacement fusion.
 * 
 * @param {PostLiquefactionSettlementRequest} params - Post-liquefaction settlement simulation parameters
 * @returns {Promise<Object>} Cumulative crest settlement, angular distortion, InSAR fusion, and hazard GeoJSON
 */
export const analyzeReconsolidationSettlement = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/reconsolidation-settlement', params);
  return response.data;
};

export const simulateReconsolidationSettlement = analyzeReconsolidationSettlement;

/**
 * Retrieves a previously computed post-liquefaction reconsolidation settlement simulation by ID.
 * 
 * @param {string} simId - Settlement simulation execution identifier
 * @returns {Promise<Object>} Stored simulation results, stratigraphic settlement, and crest profile
 */
export const fetchSettlementSimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/reconsolidation-settlement/${simId}`);
  return response.data;
};

/**
 * Evaluates embankment crest differential settlement and angular distortion beta = Delta S / L
 * against Bjerrum (1963) and ICOLD regulatory cracking thresholds.
 * 
 * @param {Object} params - Settlement at stations A and B, and horizontal span distance
 * @returns {Promise<Object>} Angular distortion ratio, hazard tier, and mitigation action
 */
export const analyzeAngularDistortion = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/angular-distortion', params);
  return response.data;
};

/**
 * Evaluates multi-layer soil column stratigraphic depth integration for post-liquefaction reconsolidation settlement.
 * 
 * @param {Object} params - Stratigraphic sublayers and calculation method
 * @returns {Promise<Object>} Total settlement and per-sublayer strain/settlement breakdown
 */
export const analyzeStratigraphicSoilColumn = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/settlement/soil-column', params);
  return response.data;
};

/**
 * Fuses modeled geotechnical settlement with satellite InSAR observation via coherence-weighted fusion.
 * 
 * @param {Object} params - Modeled settlement, InSAR observed displacement, and coherence
 * @returns {Promise<Object>} Fused settlement, residual, and agreement quality
 */
export const analyzeInSARDisplacementFusion = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/settlement/insar-fusion', params);
  return response.data;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for post-liquefaction settlement hazard maps.
 * 
 * @param {string} simId - Settlement simulation execution identifier
 * @param {string} [metric='total_settlement'] - Raster metric ('total_settlement' | 'volumetric_strain' | 'angular_distortion' | 'differential_settlement')
 * @returns {string} Tile URL template
 */
export const getSettlementTileUrlTemplate = (simId, metric = 'total_settlement') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/settlement/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildSettlementTileUrlTemplateInternal = getSettlementTileUrlTemplate;

/**
 * Executes Cloth Simulation Filter (CSF) algorithm on 3D point cloud coordinates (Zhang et al. 2016)
 * to separate ground returns from non-ground/canopy/structure returns.
 * 
 * @param {Object} params - Point coordinates, cloth resolution, rigidness, time step, and class threshold
 * @returns {Promise<Object>} Filtered ground point indices, canopy indices, iteration count, and execution summary
 */
export const analyzeCsfGroundFilter = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/topography/csf-ground-filter', params);
  return response.data;
};

/**
 * Computes 2.5D prismatic cut-and-fill volumetric differencing between pre-event baseline (DTM/DSM)
 * and post-event survey surfaces, classifying net volume balance and hazard tiers.
 * 
 * @param {Object} params - Pre-event raster grid, post-event raster grid, cell resolution, compaction factor
 * @returns {Promise<Object>} Cut/fill volumetric totals, net balance, hazard tier, and spatial cell matrix
 */
export const analyzeCutAndFillDifferential = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/topography/cut-and-fill', params);
  return response.data;
};

export const simulateCutAndFillDifferential = analyzeCutAndFillDifferential;
export const analyzeCutAndFill = analyzeCutAndFillDifferential;
export const simulateCutAndFill = simulateCutAndFillDifferential;

/**
 * Retrieves a previously computed 2.5D cut-and-fill volumetric differential simulation by ID.
 * 
 * @param {string} simId - Cut-and-fill simulation execution identifier
 * @returns {Promise<Object>} Stored simulation results, volumetric prism summary, and grid cells
 */
export const fetchCutAndFillSimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/topography/cut-and-fill/${simId}`);
  return response.data;
};

/**
 * Evaluates embankment crest slumping profile along longitudinal survey stations,
 * calculating maximum slump, post-settlement freeboard loss, and hazard tier classification.
 * 
 * @param {Object} params - Longitudinal stations (chainage, design crest elevation, post-event elevation)
 * @returns {Promise<Object>} Max crest slump, min residual freeboard, overtopping risk, and station delta breakdown
 */
export const analyzeCrestSlump = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/topography/crest-slump', params);
  return response.data;
};

/**
 * Extracts 1D transverse/longitudinal topographic elevation profiles across multi-temporal DEMs,
 * computing point-by-point elevation difference, slope gradient, and volumetric displacement.
 * 
 * @param {Object} params - Transect polyline coordinates and DEM surface identifiers/arrays
 * @returns {Promise<Object>} Transect nodes, cumulative distance, elevation delta profile, and statistics
 */
export const analyzeTopographicTransectDelta = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/topography/transect-delta', params);
  return response.data;
};

/**
 * Analyzes drone stereo-pair epipolar geometry and disparity residuals to evaluate
 * multi-temporal photogrammetric deformation and reconstruction alignment quality.
 * 
 * @param {Object} params - Stereo image pair metadata, baseline distance, focal length, and disparity grid
 * @returns {Promise<Object>} Mean disparity, parallax shift, depth error bounds, and reconstruction quality tier
 */
export const analyzeDroneEpipolarDifferential = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/topography/epipolar-differential', params);
  return response.data;
};

/**
 * Constructs a dynamic XYZ tile streaming URL template for 2.5D topographic elevation delta and cut/fill raster maps.
 * 
 * @param {string} simId - Topographic simulation execution identifier
 * @param {string} [metric='elevation_delta'] - Raster metric ('elevation_delta' | 'cut_depth' | 'fill_depth' | 'hazard_tier')
 * @returns {string} Tile URL template
 */
export const getTopographicElevationDeltaTileUrlTemplate = (simId, metric = 'elevation_delta') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/topography/elevation-delta/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildTopographicElevationDeltaTileUrlTemplateInternal = getTopographicElevationDeltaTileUrlTemplate;

/**
 * Simulates or computes empirical tailings dam breach outflow peak discharge and time-series hydrograph.
 * 
 * @param {Object} params - Reservoir volume, water height, failure mode, and embankment geometry
 * @returns {Promise<Object>} Peak discharge, breach dimensions, formation time, and outflow hydrograph
 */
export const calculateDamBreachHydrograph = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/hydrodynamic/dam-breach-hydrograph', params);
  return response.data;
};

export const simulateDamBreachHydrograph = calculateDamBreachHydrograph;

/**
 * Executes 2D De Saint-Venant shallow water wave routing along downstream river valley stations.
 * 
 * @param {Object} params - Inflow peak discharge, reach length, slope, Manning n, and station interval
 * @returns {Promise<Object>} Downstream stations, wave arrival times, peak depths, velocities, and hazard ratings
 */
export const calculateInundationRouting = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/hydrodynamic/inundation-routing', params);
  return response.data;
};

export const simulateInundationRouting = calculateInundationRouting;

/**
 * Unified analytical solver uniting breach hydrograph generation and 2D downstream flood routing.
 * 
 * @param {Object} params - Dam geometry, impoundment volume, valley parameters, and routing settings
 * @returns {Promise<Object>} Complete unified simulation response with breach geometry, hydrograph, and downstream stations
 */
export const analyzeDamBreachInundation = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/hydrodynamic/dam-breach-inundation', params);
  return response.data;
};

export const simulateDamBreachInundation = analyzeDamBreachInundation;

/**
 * Retrieves a previously computed dam breach inundation simulation by execution ID.
 * 
 * @param {string} simId - Simulation identifier
 * @returns {Promise<Object>} Stored simulation results, hydrograph, and downstream inundation stations
 */
export const fetchDamBreachSimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/hydrodynamic/dam-breach-inundation/${simId}`);
  return response.data;
};

/**
 * Constructs dynamic XYZ tile streaming URL template for hydrodynamic flood inundation raster maps.
 * 
 * @param {string} simId - Simulation identifier
 * @param {string} [metric='inundation_depth'] - Raster metric ('inundation_depth' | 'flow_velocity' | 'wave_arrival_time' | 'depth_velocity_product')
 * @returns {string} Dynamic tile URL template
 */
export const getHydrodynamicTileUrlTemplate = (simId, metric = 'inundation_depth') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/hydrodynamic/inundation/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildHydrodynamicTileUrlTemplateInternal = getHydrodynamicTileUrlTemplate;

/**
 * @typedef {Object} SoilPipingParameters
 * @property {number} [specific_gravity=2.65] - Specific gravity of soil solids Gs
 * @property {number} [void_ratio=0.65] - Void ratio e
 * @property {number} [d70_m=0.000208] - 70th percentile grain diameter in meters (d70m)
 * @property {number} [d10_m=0.00008] - 10th percentile grain diameter in meters (d10m)
 * @property {number} [cu=2.5] - Coefficient of uniformity Cu = d60 / d10
 * @property {number} [hydraulic_conductivity_ms=5.0e-5] - Darcy hydraulic conductivity K (m/s)
 * @property {number} [friction_angle_deg=34.0] - Effective internal friction angle (degrees)
 * @property {number} [submerged_unit_weight_kn_m3] - Submerged unit weight gamma' (kN/m3)
 */

/**
 * @typedef {Object} FlownetStreamlineNode
 * @property {number} streamline_index - Flow channel index (0 to Nf)
 * @property {number} x_m - Horizontal distance from upstream toe (m)
 * @property {number} z_m - Elevation relative to foundation datum (m)
 * @property {number} head_m - Total hydraulic head at node (m)
 * @property {number} velocity_ms - Seepage velocity v = K * i (m/s)
 */

/**
 * @typedef {Object} FlownetEquipotentialNode
 * @property {number} equipotential_index - Equipotential drop index (0 to Nd)
 * @property {number} x_m - Horizontal distance from upstream toe (m)
 * @property {number} z_m - Elevation relative to foundation datum (m)
 * @property {number} head_m - Total hydraulic head along equipotential (m)
 */

/**
 * @typedef {Object} ExitGradientStation
 * @property {string} station_id - Identifier of the exit station
 * @property {number} x_m - Distance from upstream toe along profile (m)
 * @property {number} exit_gradient - Upward hydraulic exit gradient i_exit
 * @property {number} critical_gradient - Terzaghi critical heave gradient i_crit
 * @property {number} factor_of_safety - Factor of safety against boiling FS = i_crit / i_exit
 * @property {string} hazard_tier - Piping hazard tier classification
 * @property {boolean} boil_risk_detected - Boolean flag indicating sand boiling condition
 */

/**
 * @typedef {Object} TerzaghiCriticalGradientResult
 * @property {number} critical_gradient - Terzaghi critical gradient i_crit = (Gs - 1) / (1 + e)
 * @property {number} submerged_unit_weight_kn_m3 - Submerged unit weight gamma' (kN/m3)
 * @property {number} saturated_unit_weight_kn_m3 - Saturated unit weight gamma_sat (kN/m3)
 * @property {number} water_unit_weight_kn_m3 - Unit weight of water (kN/m3)
 * @property {number} specific_gravity - Specific gravity Gs
 * @property {number} void_ratio - Void ratio e
 * @property {number} porosity - Porosity n = e / (1 + e)
 */

/**
 * @typedef {Object} SellmeijerCriticalHeadResult
 * @property {number} critical_head_m - Critical hydraulic head difference Delta H_c (m)
 * @property {number} critical_gradient - Critical average piping gradient Delta H_c / L
 * @property {number} applied_head_m - Applied hydraulic head difference Delta H (m)
 * @property {number} applied_gradient - Applied average gradient Delta H / L
 * @property {number} factor_of_safety - Piping factor of safety Delta H_c / Delta H
 * @property {number} resistance_factor_fr - Sellmeijer resistance factor F_R
 * @property {number} scale_factor_fs - Sellmeijer scale factor F_S
 * @property {number} geometry_factor_fg - Sellmeijer geometry factor F_G
 * @property {number} pipe_progression_length_m - Estimated backward erosion pipe length (m)
 * @property {number} pipe_length_ratio - Normalized pipe penetration ratio l_pipe / L
 * @property {boolean} breakthrough_risk - Flag indicating imminent piping breakthrough
 */

/**
 * @typedef {Object} SeepageFlownetResult
 * @property {number} upstream_head_m - Upstream reservoir head (m)
 * @property {number} downstream_head_m - Downstream tailwater head (m)
 * @property {number} total_head_loss_m - Total head loss Delta H (m)
 * @property {number} potential_drops_nd - Number of equipotential drops Nd
 * @property {number} flow_channels_nf - Number of flow channels Nf
 * @property {number} shape_factor - Flownet shape factor Nf / Nd
 * @property {number} unit_seepage_flow_rate_m3s_m - Seepage discharge per unit width q (m3/s/m)
 * @property {number} max_exit_gradient - Peak exit gradient at toe i_exit_max
 * @property {number} critical_exit_gradient - Critical heave gradient i_crit
 * @property {number} min_factor_of_safety - Minimum Factor of Safety against boiling along toe
 * @property {string} worst_hazard_tier - Worst piping hazard tier across all exit stations
 * @property {number} streamlines_count - Number of computed streamline paths
 * @property {number} equipotentials_count - Number of computed equipotential contour lines
 * @property {number} grid_resolution_m - Spatial grid cell spacing (m)
 * @property {ExitGradientStation[]} exit_stations - Downstream toe monitoring stations
 * @property {FlownetEquipotentialNode[]} equipotentials - Discrete equipotential lines
 * @property {FlownetStreamlineNode[]} streamlines - Discrete streamline flow paths
 * @property {Object} flownet_geojson - GeoJSON feature collection of streamlines and equipotentials
 * @property {string} tile_url_template - XYZ tile template for dynamic flownet layers
 */

/**
 * @typedef {Object} InternalErosionPipingAnalysisRequest
 * @property {string} [simulation_id] - Optional simulation identifier
 * @property {string} [dam_id='DAM_TAILINGS_01'] - Dam asset identifier
 * @property {string} [dam_name='Tailings Embankment Facility'] - Dam asset name
 * @property {string} [soil_classification='medium_sand'] - Soil classification preset
 * @property {string} [failure_mechanism='backward_erosion'] - Primary piping mechanism
 * @property {SoilPipingParameters} [soil_parameters] - Custom soil parameters
 * @property {number} [upstream_head_m=24.0] - Upstream reservoir head (m)
 * @property {number} [downstream_head_m=4.0] - Downstream tailwater head (m)
 * @property {number} [embankment_base_length_m=60.0] - Seepage path / base length L (m)
 * @property {number} [aquifer_depth_m=18.0] - Pervious foundation aquifer thickness D (m)
 * @property {number} [potential_drops_nd=12] - Number of equipotential drops Nd
 * @property {number} [flow_channels_nf=4] - Number of flow channels Nf
 * @property {number} [grid_nx=25] - Horizontal mesh resolution Nx
 * @property {number} [grid_nz=15] - Vertical mesh resolution Nz
 * @property {number} [toe_filter_permeability_ratio=10.0] - Permeability multiplier of downstream toe filter
 */

/**
 * @typedef {Object} InternalErosionPipingAnalysisResponse
 * @property {string} simulation_id - Unique simulation identifier
 * @property {string} dam_id - Dam asset identifier
 * @property {string} dam_name - Dam asset name
 * @property {string} soil_preset_used - Soil preset identifier used for analysis
 * @property {TerzaghiCriticalGradientResult} terzaghi_gradient - Terzaghi critical hydraulic gradient metrics
 * @property {SellmeijerCriticalHeadResult} sellmeijer_bep - Sellmeijer backward erosion piping results
 * @property {SeepageFlownetResult} flownet_seepage - 2D Laplace seepage flownet and exit gradient results
 * @property {number} global_factor_of_safety - Governing factor of safety against internal erosion
 * @property {string} overall_hazard_tier - Overall internal erosion hazard tier
 * @property {boolean} sand_boiling_imminent - Flag indicating imminent sand boiling or piping breach
 * @property {string} tile_url_template - Dynamic XYZ tile URL template for flownet layers
 * @property {string} analyzed_at - ISO 8601 UTC analysis timestamp
 */

/**
 * Analyzes internal erosion and backward erosion piping (BEP) susceptibility
 * using Terzaghi critical gradient, Sellmeijer (1988) critical head, and 2D Laplace seepage flownet.
 * 
 * @param {InternalErosionPipingAnalysisRequest} params - Internal erosion analysis request parameters
 * @returns {Promise<InternalErosionPipingAnalysisResponse>} Complete piping analysis and flownet response
 */
export const analyzeInternalErosionPiping = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/internal-erosion-piping', params);
  return response.data;
};

export const simulateInternalErosionPiping = analyzeInternalErosionPiping;

/**
 * Solves 2D Laplace steady seepage potential grid, stream function, and exit gradient distribution.
 * 
 * @param {Object} params - Seepage domain geometry, reservoir/tailwater heads, and grid discretization
 * @returns {Promise<SeepageFlownetResult>} Equipotentials, streamlines, exit stations, and shape factor
 */
export const calculateSeepageFlownet = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/seepage-flownet', params);
  return response.data;
};

export const simulateSeepageFlownet = calculateSeepageFlownet;

/**
 * Retrieves a previously computed internal erosion piping simulation by execution ID.
 * 
 * @param {string} simId - Simulation identifier
 * @returns {Promise<InternalErosionPipingAnalysisResponse>} Stored internal erosion simulation results
 */
export const fetchInternalErosionSimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/internal-erosion-piping/${simId}`);
  return response.data;
};

/**
 * Constructs dynamic XYZ tile streaming URL template for geotechnical seepage flownet raster layers.
 * 
 * @param {string} simId - Simulation identifier
 * @param {string} [metric='hydraulic_head'] - Raster metric ('hydraulic_head' | 'hydraulic_gradient' | 'exit_gradient' | 'factor_of_safety' | 'streamline_potential' | 'pore_pressure')
 * @returns {string} Dynamic tile URL template
 */
export const getFlownetTileUrlTemplate = (simId, metric = 'hydraulic_head') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/flownet/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildFlownetTileUrlTemplateInternal = getFlownetTileUrlTemplate;

/**
 * @typedef {Object} InSARTimeSeriesPoint
 * @property {string} date - Acquisition date (YYYY-MM-DD)
 * @property {number} displacement_mm - Cumulative displacement in mm
 * @property {number} [displacement_uncertainty_mm=1.5] - Measurement 1-sigma uncertainty (mm)
 */

/**
 * @typedef {Object} PersistentScattererPoint
 * @property {string} point_id - Scatterer station identifier (e.g. PS_01)
 * @property {number} latitude - WGS84 latitude
 * @property {number} longitude - WGS84 longitude
 * @property {number} elevation_m - Surface elevation (m)
 * @property {number} temporal_coherence - Multi-temporal phase coherence gamma in [0, 1]
 * @property {number} amplitude_dispersion - Amplitude dispersion index D_A
 * @property {number} velocity_los_mm_yr - Line-of-sight velocity (mm/yr)
 * @property {number} velocity_vertical_mm_yr - Projected quasi-vertical velocity (mm/yr)
 * @property {number} [velocity_east_west_mm_yr] - Decomposed East-West velocity (mm/yr)
 * @property {number} [height_residual_m=0.0] - DEM height error residual correction (m)
 * @property {string} hazard_tier - Classified deformation hazard tier
 * @property {InSARTimeSeriesPoint[]} [time_series] - Multi-temporal displacement series
 */

/**
 * @typedef {Object} InterferometricBaselineGeometry
 * @property {number} perpendicular_baseline_m - Perpendicular baseline B_perp (m)
 * @property {number} parallel_baseline_m - Parallel baseline B_par (m)
 * @property {number} total_baseline_m - Total baseline magnitude (m)
 * @property {number} height_of_ambiguity_m - Height of ambiguity h_a (m/2pi)
 * @property {number} critical_baseline_m - Critical baseline threshold B_crit (m)
 * @property {number} topographic_phase_sensitivity_rad_m - Phase change per meter elevation (rad/m)
 */

/**
 * @typedef {Object} AtmosphericPhaseScreenResult
 * @property {number} elevation_delay_coefficient_rad_m - Stratified troposphere gradient k_elev (rad/m)
 * @property {number} spatial_ramp_a0 - Spatial planar ramp offset a0 (rad)
 * @property {number} spatial_ramp_a1 - Spatial planar ramp X-gradient a1 (rad/m)
 * @property {number} spatial_ramp_a2 - Spatial planar ramp Y-gradient a2 (rad/m)
 * @property {number} aps_variance_rad - Variance of APS phase contribution (rad^2)
 * @property {number} residual_std_dev_rad - Residual phase noise standard deviation (rad)
 */

/**
 * @typedef {Object} DualOrbitDecompositionResult
 * @property {string} point_id - Scatterer target point identifier
 * @property {number} velocity_asc_mm_yr - Ascending track LOS velocity (mm/yr)
 * @property {number} velocity_desc_mm_yr - Descending track LOS velocity (mm/yr)
 * @property {number} velocity_vertical_mm_yr - True vertical velocity (mm/yr)
 * @property {number} velocity_east_west_mm_yr - True East-West horizontal velocity (mm/yr)
 * @property {number} total_magnitude_mm_yr - 2D velocity vector magnitude (mm/yr)
 * @property {string} hazard_tier - Governing deformation hazard tier
 */

/**
 * @typedef {Object} InSARPersistentScattererAnalysisRequest
 * @property {string} [simulation_id] - Simulation execution identifier
 * @property {string} [asset_id='EMBANKMENT_CREST_A'] - Embankment asset identifier
 * @property {string} [asset_name='North Tailings Dam Crest'] - Embankment asset name
 * @property {string} [satellite_mission='sentinel-1'] - Satellite SAR mission ('sentinel-1' | 'alos-2' | 'terrasar-x')
 * @property {string} [sensor_band='c_band'] - Radar frequency band ('c_band' | 'l_band' | 'x_band')
 * @property {string} [orbit_direction='ascending'] - Orbit pass flight direction ('ascending' | 'descending')
 * @property {number} [incidence_angle_deg=38.5] - Nominal incidence angle in degrees
 * @property {number} [heading_angle_deg=348.0] - Satellite heading angle in degrees
 * @property {number} [temporal_coherence_threshold=0.65] - Minimum temporal coherence threshold
 * @property {number} [amplitude_dispersion_threshold=0.25] - Maximum amplitude dispersion threshold
 * @property {number} [perpendicular_baseline_m=45.0] - Interferometric perpendicular baseline B_perp (m)
 * @property {number} [parallel_baseline_m=5.0] - Interferometric parallel baseline B_par (m)
 * @property {number} [ps_points_count=24] - Number of synthetic PS stations along asset
 */

/**
 * @typedef {Object} InSARPersistentScattererAnalysisResponse
 * @property {string} simulation_id - Simulation run identifier
 * @property {string} asset_id - Target asset identifier
 * @property {string} asset_name - Target asset name
 * @property {string} satellite_mission - Satellite radar mission
 * @property {string} sensor_band - Radar band used
 * @property {string} orbit_direction - Orbit pass direction
 * @property {number} incidence_angle_deg - Radar incidence angle
 * @property {number} heading_angle_deg - Satellite heading angle
 * @property {InterferometricBaselineGeometry} baseline_geometry - Baseline geometry metrics
 * @property {AtmosphericPhaseScreenResult} atmospheric_phase_screen - APS decomposition
 * @property {number} ps_candidates_evaluated - Total candidate scatterers tested
 * @property {number} ps_points_retained - High-coherence persistent scatterers retained
 * @property {number} coherence_threshold - Applied temporal coherence threshold
 * @property {number} mean_temporal_coherence - Mean coherence across retained scatterers
 * @property {number} max_subsidence_velocity_mm_yr - Maximum downward vertical velocity (negative mm/yr)
 * @property {number} max_uplift_velocity_mm_yr - Maximum upward vertical velocity (positive mm/yr)
 * @property {string} critical_ps_point_id - Identifier of point with peak deformation rate
 * @property {string} worst_hazard_tier - Governing deformation hazard tier
 * @property {PersistentScattererPoint[]} ps_points - Retained persistent scatterers
 * @property {DualOrbitDecompositionResult[]} [dual_orbit_decomposition] - Optional dual-orbit decomposition
 * @property {Object} ps_geojson - RFC 7946 GeoJSON FeatureCollection
 * @property {string} tile_url_template - Dynamic XYZ tile URL template
 * @property {string} analyzed_at - ISO 8601 UTC analysis timestamp
 */

/**
 * Analyzes satellite InSAR Persistent Scatterer (PSI) time series, temporal coherence filtering,
 * baseline geometry, APS decomposition, and 1D LOS to 3D vertical displacement inversion.
 * 
 * @param {InSARPersistentScattererAnalysisRequest} params - InSAR persistent scatterer request payload
 * @returns {Promise<InSARPersistentScattererAnalysisResponse>} PSI analysis results and scatterers
 */
export const analyzeInSARPersistentScatterers = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/insar-persistent-scatterers', params);
  return response.data;
};

export const analyzeInSARVelocityField = analyzeInSARPersistentScatterers;
export const simulateInSARPersistentScatterers = analyzeInSARPersistentScatterers;

/**
 * Retrieves a previously computed InSAR persistent scatterer velocity simulation by execution ID.
 * 
 * @param {string} simId - Simulation identifier
 * @returns {Promise<InSARPersistentScattererAnalysisResponse>} Stored InSAR simulation results
 */
export const fetchInSARSimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/insar-velocity-field/${simId}`);
  return response.data;
};

/**
 * Solves 2D (Vertical, East-West) velocity decomposition from Ascending and Descending InSAR tracks.
 * 
 * @param {Object} params - Ascending/descending LOS velocities, incidence angles, and headings
 * @returns {Promise<Object>} Decomposed vertical and East-West velocities and hazard tier
 */
export const decomposeDualOrbitInSAR = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/insar-dual-orbit-decomposition', params);
  return response.data;
};

/**
 * Constructs dynamic XYZ tile streaming URL template for geotechnical InSAR velocity deformation layers.
 * 
 * @param {string} simId - Simulation identifier
 * @param {string} [metric='velocity_vertical'] - Raster metric ('velocity_vertical' | 'velocity_los' | 'velocity_east_west' | 'temporal_coherence' | 'height_residual' | 'hazard_tier')
 * @returns {string} Dynamic tile URL template
 */
export const getInSARVelocityTileUrlTemplate = (simId, metric = 'velocity_vertical') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/insar-velocity/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildInSARVelocityTileUrlTemplateInternal = getInSARVelocityTileUrlTemplate;
export const buildInSARVelocityTileUrlTemplate = getInSARVelocityTileUrlTemplate;

/**
 * @typedef {Object} BuildingFootprintExposure
 * @property {string} building_id - Unique building or structure identifier
 * @property {string} building_name - Human-readable building name or description
 * @property {string} building_type - Structure classification (residential, commercial, hospital, etc.)
 * @property {number} latitude - WGS84 centroid latitude
 * @property {number} longitude - WGS84 centroid longitude
 * @property {number} footprint_area_m2 - Building footprint area in square meters
 * @property {number} mean_coherence_pre - Pre-event baseline coherence
 * @property {number} mean_coherence_event - Co-event interferometric coherence
 * @property {number} mean_coherence_loss - Interferometric coherence loss Delta gamma
 * @property {string} damage_severity_tier - Copernicus/ARIA damage tier
 * @property {number} structural_damage_ratio - Estimated loss ratio in [0, 1]
 * @property {string} collapse_risk - Risk level (safe, low, moderate, high, extreme)
 * @property {number} estimated_loss_usd - Estimated direct structural economic loss in USD
 * @property {number} replacement_value_usd - Total structural replacement asset value in USD
 * @property {number} [criticality_weight=1.0] - Criticality weighting factor
 * @property {boolean} [is_critical_infrastructure=false] - Flag for emergency/critical infrastructure
 */

/**
 * @typedef {Object} SARCoherenceDamageRequest
 * @property {number} coherence_pre - Pre-event baseline interferometric coherence [0, 1]
 * @property {number} coherence_event - Co-event interferometric coherence [0, 1]
 * @property {string} [building_type='residential'] - Structure occupancy / asset type
 * @property {number} [footprint_area_m2=250.0] - Footprint area in m2
 * @property {number} [replacement_cost_per_m2=1200.0] - Replacement cost per square meter in USD
 */

/**
 * @typedef {Object} SARCoherenceDamageResponse
 * @property {number} coherence_pre - Pre-event baseline coherence
 * @property {number} coherence_event - Co-event interferometric coherence
 * @property {number} coherence_loss - Delta gamma coherence loss
 * @property {number} relative_loss_percent - Relative coherence reduction percentage
 * @property {string} damage_severity_tier - ARIA damage tier (negligible, moderate, severe, catastrophic_collapse)
 * @property {number} structural_damage_ratio - Vulnerability loss ratio in [0, 1]
 * @property {number} collapse_probability - Estimated structural collapse probability
 * @property {number|null} [estimated_loss_usd] - Direct structural economic loss in USD
 * @property {string} analyzed_at - ISO 8601 UTC timestamp
 */

/**
 * @typedef {Object} DamageProxySimulationSummary
 * @property {number} total_footprints_evaluated - Total footprints evaluated
 * @property {number} damaged_footprints_count - Count of buildings with damage >= moderate
 * @property {number} critical_facilities_affected - Count of critical facilities with damage
 * @property {number} total_estimated_loss_usd - Sum of direct structural economic loss
 * @property {number} mean_coherence_loss - Spatial average coherence loss
 * @property {number} max_coherence_loss - Peak coherence loss
 * @property {string} worst_damage_tier - Highest damage severity level observed
 * @property {Record<string, number>} tier_distribution - Distribution of buildings across damage tiers
 */

/**
 * @typedef {Object} DamageProxyMapRequest
 * @property {string} [simulation_id] - Simulation execution identifier
 * @property {string} [event_id='EVENT_2026_01'] - Disaster or incident identifier
 * @property {string} [event_name='Co-Seismic SAR Coherence Decorrelation Event'] - Event description
 * @property {string} [pre_event_date='2026-08-10'] - Pre-event baseline acquisition date (YYYY-MM-DD)
 * @property {string} [event_date='2026-08-22'] - Co-event / post-event acquisition date (YYYY-MM-DD)
 * @property {string} [satellite_mission='sentinel-1'] - Satellite SAR mission ('sentinel-1' | 'alos-2' | 'terrasar-x')
 * @property {string} [orbit_direction='descending'] - Orbit pass direction ('ascending' | 'descending')
 * @property {string} [polarization='VV'] - SAR polarization ('VV' | 'VH' | 'HH' | 'HV')
 * @property {string} [aoi_name='Mine Infrastructure Valley'] - Area of interest label
 * @property {number} [latitude=37.05] - Center WGS84 latitude
 * @property {number} [longitude=-120.85] - Center WGS84 longitude
 * @property {number} [coherence_threshold_negligible=0.15] - ARIA negligible threshold
 * @property {number} [coherence_threshold_moderate=0.35] - ARIA moderate threshold
 * @property {number} [coherence_threshold_severe=0.55] - ARIA severe threshold
 * @property {number} [footprint_sample_count=20] - Number of synthetic building footprints
 */

/**
 * @typedef {Object} DamageProxyMapResponse
 * @property {string} simulation_id - Simulation identifier
 * @property {string} event_id - Disaster event identifier
 * @property {string} event_name - Disaster event label
 * @property {string} pre_event_date - Pre-disaster acquisition date
 * @property {string} event_date - Post-disaster acquisition date
 * @property {string} satellite_mission - Satellite radar platform
 * @property {string} orbit_direction - Orbit pass flight direction
 * @property {string} polarization - Radar antenna polarization
 * @property {DamageProxySimulationSummary} summary - Aggregated simulation metrics
 * @property {BuildingFootprintExposure[]} building_footprints - Evaluated building structures
 * @property {Object} footprints_geojson - RFC 7946 GeoJSON FeatureCollection
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 UTC timestamp
 */

/**
 * Calculates point or asset SAR interferometric coherence loss and structural damage fragility.
 * 
 * @param {SARCoherenceDamageRequest} params - Pre and co-event coherence values
 * @returns {Promise<SARCoherenceDamageResponse>} Coherence loss and damage severity metrics
 */
export const analyzeSarCoherenceDamage = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/sar-coherence-damage', params);
  return response.data;
};

/**
 * Simulates or computes full-scene Copernicus / ARIA Damage Proxy Mapping (DPM).
 * 
 * @param {DamageProxyMapRequest} params - DPM request payload
 * @returns {Promise<DamageProxyMapResponse>} DPM simulation results and GeoJSON polygons
 */
export const simulateDamageProxyMapping = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/geotechnical/damage-proxy-map', params);
  return response.data;
};

export const calculateDamageProxyMapAnalysis = simulateDamageProxyMapping;

/**
 * Retrieves a previously computed Damage Proxy Mapping simulation by execution ID.
 * 
 * @param {string} simId - Simulation identifier
 * @returns {Promise<DamageProxyMapResponse>} Stored DPM simulation results
 */
export const fetchDamageProxySimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/geotechnical/damage-proxy-map/${simId}`);
  return response.data;
};

/**
 * Constructs dynamic XYZ tile streaming URL template for SAR Damage Proxy Mapping layers.
 * 
 * @param {string} simId - Simulation identifier
 * @param {string} [metric='coherence_delta'] - Raster metric ('coherence_delta' | 'pre_coherence' | 'event_coherence' | 'damage_severity_tier' | 'building_loss_ratio' | 'hazard_rating_tier')
 * @returns {string} Dynamic tile URL template
 */
export const getDamageProxyTileUrlTemplate = (simId, metric = 'coherence_delta') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/geotechnical/dpm/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildDamageProxyTileUrlTemplateInternal = getDamageProxyTileUrlTemplate;
export const buildDamageProxyTileUrlTemplate = getDamageProxyTileUrlTemplate;

/**
 * @typedef {Object} HarmonicFourierComponent
 * @property {number} k - Harmonic order (1=annual, 2=semi-annual)
 * @property {number} a_k - Cosine coefficient
 * @property {number} b_k - Sine coefficient
 * @property {number} amplitude - Harmonic amplitude C_k = sqrt(A_k^2 + B_k^2)
 * @property {number} phase_rad - Phase angle in radians
 * @property {number} phase_deg - Phase angle in degrees [0, 360)
 * @property {number} peak_time_fraction - Normalized timing of annual peak within period
 */

/**
 * @typedef {Object} HarmonicFourierModelResult
 * @property {number} intercept_a0 - Model baseline intercept constant
 * @property {number} linear_slope_a1 - Linear trend slope parameter
 * @property {HarmonicFourierComponent[]} components - Fitted harmonic components
 * @property {number} rmse - Root Mean Squared Error of harmonic fit
 * @property {number} r_squared - Coefficient of determination R^2
 * @property {string} formula_string - Human-readable regression formula
 */

/**
 * @typedef {Object} TheilSenTrendResult
 * @property {number} slope_per_year - Theil-Sen robust monotonic slope per year
 * @property {number} intercept - Theil-Sen robust median intercept
 * @property {number} slope_ci_lower - Lower 95% confidence interval bound
 * @property {number} slope_ci_upper - Upper 95% confidence interval bound
 * @property {number} kendall_tau - Kendall's rank correlation coefficient tau
 * @property {number} mann_kendall_s - Mann-Kendall score S
 * @property {number} p_value - Two-tailed p-value for trend significance
 * @property {number} z_score - Standardized test statistic Z
 * @property {boolean} is_significant - True if p-value < 0.05
 * @property {string} trend_direction - 'increasing' | 'decreasing' | 'no_trend'
 */

/**
 * @typedef {Object} MonthlyClimatologyRecord
 * @property {number} month - Calendar month (1-12)
 * @property {string} month_name - Calendar month name
 * @property {number} median - Monthly historical median index value
 * @property {number} mad - Median Absolute Deviation (MAD)
 * @property {number} scale - Applied normal-consistent scale (1.4826 * MAD)
 * @property {number} p10 - 10th percentile expected lower bound
 * @property {number} p25 - 25th percentile expected lower bound
 * @property {number} p75 - 75th percentile expected upper bound
 * @property {number} p90 - 90th percentile expected upper bound
 * @property {number} sample_count - Total sample scene count
 */

/**
 * @typedef {Object} PhenologyObservationPoint
 * @property {string} date - Observation ISO date (YYYY-MM-DD)
 * @property {number} month - Calendar month (1-12)
 * @property {number} day_of_year - Day of year (1-366)
 * @property {number} decimal_year - Fractional calendar year
 * @property {number} observed_value - Observed spectral index value
 * @property {number} [harmonic_baseline] - Fitted harmonic baseline value
 * @property {number} [residual] - Difference from harmonic baseline
 * @property {number} seasonal_median - Historical monthly climatological median
 * @property {number} seasonal_mad - Historical monthly climatological MAD
 * @property {number} seasonal_scale - Scale factor
 * @property {number} seasonal_z_score - Seasonally normalized z-score
 * @property {string} anomaly_tier - Classified phenology anomaly tier
 * @property {boolean} is_anomaly - True if |seasonal_z_score| >= anomaly_threshold
 * @property {number} p10 - 10th percentile expected lower bound
 * @property {number} p90 - 90th percentile expected upper bound
 */

/**
 * @typedef {Object} PhenologySimulationSummary
 * @property {number} total_observations - Total observations evaluated
 * @property {number} years_covered - Time span in years
 * @property {number} mean_index - Mean biophysical index value
 * @property {number} trend_slope_per_year - Theil-Sen annual rate of change
 * @property {string} trend_direction - Monotonic trajectory
 * @property {number} annual_amplitude - Annual harmonic amplitude
 * @property {number} phase_angle_deg - Phase angle in degrees
 * @property {number} peak_greenup_doy - Day of year of maximum greenness
 * @property {number} r_squared - Fourier model R^2
 * @property {number} rmse - Fourier model RMSE
 * @property {number} anomaly_count - Count of observations exceeding anomaly threshold
 * @property {number} critical_anomaly_count - Count of acute anomalies (|z| >= 3.0)
 * @property {number} worst_anomaly_z - Peak absolute z-score
 * @property {string} worst_anomaly_tier - Most severe anomaly tier detected
 */

/**
 * @typedef {Object} PhenologyHarmonicAnalysisRequest
 * @property {string} [asset_id='ASSET-VEG-001'] - Asset identifier
 * @property {string} [index_name='ndvi'] - Spectral index name
 * @property {string[]} dates - Array of observation dates (YYYY-MM-DD)
 * @property {number[]} values - Array of index values
 * @property {number} [num_harmonics=2] - Number of Fourier harmonics (1-4)
 * @property {number} [period_years=1.0] - Fundamental seasonal period in years
 */

/**
 * @typedef {Object} PhenologyHarmonicAnalysisResponse
 * @property {string} asset_id - Asset identifier
 * @property {string} index_name - Spectral index evaluated
 * @property {HarmonicFourierModelResult} model_result - Fitted harmonic parameters
 * @property {number} observation_count - Number of observations analyzed
 * @property {string} analyzed_at - ISO 8601 UTC timestamp
 */

/**
 * @typedef {Object} PhenologyMADAnalysisRequest
 * @property {string} [asset_id='ASSET-VEG-001'] - Asset identifier
 * @property {string} [index_name='ndvi'] - Spectral index name
 * @property {string[]} dates - Array of observation dates (YYYY-MM-DD)
 * @property {number[]} values - Array of index values
 * @property {number} [anomaly_threshold=2.5] - MAD anomaly threshold
 * @property {number} [min_mad_scale=0.015] - Minimum MAD scale floor
 */

/**
 * @typedef {Object} PhenologyMADAnalysisResponse
 * @property {string} asset_id - Asset identifier
 * @property {string} index_name - Spectral index evaluated
 * @property {MonthlyClimatologyRecord[]} monthly_climatology - Monthly climatological baselines
 * @property {TheilSenTrendResult} theil_sen_trend - Theil-Sen monotonic slope and Mann-Kendall statistics
 * @property {PhenologyObservationPoint[]} points - Analyzed time series observation points
 * @property {number} total_observations - Total observations evaluated
 * @property {number} anomaly_count - Count of detected anomalies
 * @property {number} critical_anomaly_count - Count of critical anomalies (|z| >= 3.0)
 * @property {string} analyzed_at - ISO 8601 UTC timestamp
 */

/**
 * @typedef {Object} PhenologyDecompositionRequest
 * @property {string} [simulation_id] - Simulation execution identifier
 * @property {string} [asset_id='ASSET-VEG-001'] - Asset identifier
 * @property {string} [asset_name='Northern Embankment & Catchment Buffer'] - Asset name
 * @property {number} [latitude=37.05] - Latitude center
 * @property {number} [longitude=-120.85] - Longitude center
 * @property {string} [index_name='ndvi'] - Spectral index ('ndvi', 'ndmi', 'evi', etc.)
 * @property {number} [num_harmonics=2] - Number of harmonics (1-4)
 * @property {number} [trend_slope_per_year=0.012] - Annual trend slope
 * @property {number} [anomaly_threshold=2.5] - Z-score anomaly threshold
 */

/**
 * @typedef {Object} PhenologyDecompositionResponse
 * @property {string} simulation_id - Unique simulation identifier
 * @property {string} asset_id - Asset identifier
 * @property {string} asset_name - Asset name
 * @property {string} index_name - Spectral index name
 * @property {PhenologySimulationSummary} summary - Aggregated simulation metrics
 * @property {HarmonicFourierModelResult} harmonic_model - Fitted Fourier model
 * @property {TheilSenTrendResult} theil_sen_trend - Robust monotonic trend statistics
 * @property {MonthlyClimatologyRecord[]} monthly_climatology - 12-month baseline records
 * @property {PhenologyObservationPoint[]} observation_points - Time series observation records
 * @property {Object} geojson_collection - RFC 7946 GeoJSON FeatureCollection
 * @property {string} tile_url_template - Dynamic XYZ tile streaming URL template
 * @property {string} analyzed_at - ISO 8601 UTC timestamp
 */

/**
 * Fits multi-harmonic Fourier regression model to multi-temporal satellite observations.
 * 
 * @param {PhenologyHarmonicAnalysisRequest} params - Harmonic analysis request payload
 * @returns {Promise<PhenologyHarmonicAnalysisResponse>} Fitted harmonic model result
 */
export const analyzePhenologyHarmonic = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/phenology/harmonic-decomposition', params);
  return response.data;
};

/**
 * Computes monthly climatological Median Absolute Deviation (MAD) baselines and flags seasonal anomalies.
 * 
 * @param {PhenologyMADAnalysisRequest} params - Climatological MAD analysis request payload
 * @returns {Promise<PhenologyMADAnalysisResponse>} Monthly baseline and anomaly evaluation
 */
export const analyzePhenologyMADAnomaly = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/phenology/climatological-mad-anomaly', params);
  return response.data;
};

/**
 * Simulates or computes full multi-temporal phenology decomposition, harmonic curves, Theil-Sen trend, and MAD anomalies.
 * 
 * @param {PhenologyDecompositionRequest} params - Full phenology simulation request payload
 * @returns {Promise<PhenologyDecompositionResponse>} Complete phenology simulation results
 */
export const simulatePhenologyDecomposition = async (params) => {
  const response = await giosApi.post('/api/v1/analysis/phenology/climatological-mad-anomaly', params);
  return response.data;
};

export const calculatePhenologyDecomposition = simulatePhenologyDecomposition;

/**
 * Retrieves a previously computed multi-temporal phenology simulation by execution ID.
 * 
 * @param {string} simId - Simulation identifier
 * @returns {Promise<PhenologyDecompositionResponse>} Stored phenology simulation results
 */
export const fetchPhenologySimulation = async (simId) => {
  const response = await giosApi.get(`/api/v1/analysis/phenology/climatological-mad-anomaly/${simId}`);
  return response.data;
};

/**
 * Constructs dynamic XYZ tile streaming URL template for multi-temporal phenology anomaly layers.
 * 
 * @param {string} simId - Simulation identifier
 * @param {string} [metric='mad_anomaly_zscore'] - Raster metric ('baseline_ndvi' | 'seasonal_amplitude' | 'phase_angle' | 'theil_sen_slope' | 'mad_anomaly_zscore' | 'anomaly_tier')
 * @returns {string} Dynamic tile URL template
 */
export const getPhenologyAnomalyTileUrlTemplate = (simId, metric = 'mad_anomaly_zscore') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  return `${base}/api/v1/tiles/phenology/anomaly/${simId}/${metric}/{z}/{x}/{y}.png`;
};

export const buildPhenologyAnomalyTileUrlTemplateInternal = getPhenologyAnomalyTileUrlTemplate;
export const buildPhenologyAnomalyTileUrlTemplate = getPhenologyAnomalyTileUrlTemplate;

/**
 * @typedef {Object} STACSubscriptionSchedule
 * @property {'hourly' | '6h' | 'daily' | 'weekly' | 'custom_cron'} interval - Polling interval
 * @property {string} [cron_expression] - Cron schedule expression
 * @property {number} cloud_cover_max - Maximum allowable scene cloud cover %
 * @property {string[]} collections - STAC collections monitored
 * @property {number} lookback_hours - Hours of lookback for scene publishing
 */

/**
 * @typedef {Object} PerimeterGeoFence
 * @property {string} fence_id - Perimeter fence identifier
 * @property {string} name - Name of monitored perimeter
 * @property {number[][]} [polygon_coordinates] - Closed linear ring of [lon, lat] coordinates
 * @property {string} [asset_id] - Associated critical asset ID
 */

/**
 * @typedef {Object} WebhookEndpointConfig
 * @property {string} endpoint_id - Unique endpoint ID
 * @property {'slack' | 'ms_teams' | 'pagerduty' | 'email_smtp' | 'custom_webhook'} channel_type - Delivery channel
 * @property {string} target_url - HTTP webhook destination URL or email address
 * @property {string} secret_token - Secret key for HMAC-SHA256 signature generation
 * @property {boolean} is_active - Delivery active status
 * @property {number} max_retries - Retry attempts before dead-lettering
 */

/**
 * @typedef {Object} STACHarvesterSubscription
 * @property {string} subscription_id - Unique subscription ID
 * @property {string} name - Subscription name
 * @property {string} [description] - Description
 * @property {STACSubscriptionSchedule} schedule - Polling schedule
 * @property {PerimeterGeoFence} perimeter - Area of interest fence
 * @property {WebhookEndpointConfig[]} webhook_endpoints - Destination endpoints
 * @property {string[]} trigger_conditions - Anomaly trigger rules
 * @property {number} z_score_threshold - Climatological MAD z-score anomaly cutoff
 * @property {boolean} is_enabled - Subscription active state
 * @property {string} created_at - ISO 8601 UTC registration timestamp
 * @property {number} total_dispatches - Count of dispatched anomaly events
 */

/**
 * Fetches all registered automated STAC harvester subscriptions.
 * 
 * @returns {Promise<{ subscriptions: STACHarvesterSubscription[] }>}
 */
export const fetchHarvesterSubscriptions = async () => {
  const response = await giosApi.get('/api/v1/operations/harvester/subscriptions');
  return response.data;
};

/**
 * Registers a new automated STAC harvester subscription.
 * 
 * @param {Object} payload - Harvester subscription definition
 * @returns {Promise<{ subscription: STACHarvesterSubscription, status: string, message: string }>}
 */
export const createHarvesterSubscription = async (payload) => {
  const response = await giosApi.post('/api/v1/operations/harvester/subscriptions', payload);
  return response.data;
};

/**
 * Retrieves a specific STAC harvester subscription by ID.
 * 
 * @param {string} subscriptionId - Subscription identifier
 * @returns {Promise<{ subscription: STACHarvesterSubscription }>}
 */
export const fetchHarvesterSubscription = async (subscriptionId) => {
  const response = await giosApi.get(`/api/v1/operations/harvester/subscriptions/${subscriptionId}`);
  return response.data;
};

/**
 * Triggers a manual or scheduled execution run of an automated STAC harvester.
 * 
 * @param {Object} params - Trigger parameters
 * @returns {Promise<Object>} Execution report with evaluated scenes and dispatches
 */
export const triggerHarvesterRun = async (params = {}) => {
  const response = await giosApi.post('/api/v1/operations/harvester/trigger', params);
  return response.data;
};

/**
 * Fetches configured outbound webhook endpoints.
 * 
 * @returns {Promise<{ endpoints: WebhookEndpointConfig[] }>}
 */
export const fetchWebhookEndpoints = async () => {
  const response = await giosApi.get('/api/v1/operations/webhooks');
  return response.data;
};

/**
 * Dispatches a synthetic test notification event to a webhook endpoint.
 * 
 * @param {string} webhookId - Endpoint identifier
 * @param {Object} [payload={}] - Test parameters
 * @returns {Promise<Object>} Dispatch result with HTTP status code and latency
 */
export const testWebhookDispatch = async (webhookId, payload = {}) => {
  const response = await giosApi.post(`/api/v1/operations/webhooks/${webhookId}/test`, payload);
  return response.data;
};

/**
 * Retrieves failed deliveries currently in the Dead-Letter Queue (DLQ).
 * 
 * @returns {Promise<{ dead_letter_items: Object[] }>}
 */
export const fetchDeadLetterQueue = async () => {
  const response = await giosApi.get('/api/v1/operations/dlq');
  return response.data;
};

/**
 * Triggers replay of quarantined deliveries in the Dead-Letter Queue.
 * 
 * @param {Object} [params={}] - Retry parameters
 * @returns {Promise<{ replayed_count: number, succeeded_count: number, failed_count: number, remaining_dlq_count: number }>}
 */
export const retryDeadLetterQueue = async (params = { retry_all: true }) => {
  const response = await giosApi.post('/api/v1/operations/dlq/retry', params);
  return response.data;
};

/**
 * Dispatches an asynchronous drone photogrammetry reconstruction mission to NodeODM worker.
 * 
 * @param {Object} payload - Task configuration and staged image count
 * @returns {Promise<Object>} Task creation response with tracking identifier
 */
export const createDronePhotogrammetryTask = async (payload) => {
  const response = await giosApi.post('/api/v1/drone/photogrammetry/tasks', payload);
  return response.data;
};

/**
 * Lists all registered drone photogrammetry tasks.
 * 
 * @returns {Promise<Array<Object>>} List of recorded photogrammetry tasks
 */
export const fetchDronePhotogrammetryTasks = async () => {
  const response = await giosApi.get('/api/v1/drone/photogrammetry/tasks');
  return response.data;
};

export const listDronePhotogrammetryTasks = fetchDronePhotogrammetryTasks;

/**
 * Retrieves real-time execution status and product deliverables for a photogrammetry mission.
 * 
 * @param {string} taskId - Photogrammetry task identifier
 * @returns {Promise<Object>} Live telemetry, stage progress, GSD, and output artifacts
 */
export const fetchDronePhotogrammetryTaskStatus = async (taskId) => {
  const response = await giosApi.get(`/api/v1/drone/photogrammetry/tasks/${taskId}`);
  return response.data;
};

/**
 * Aborts an active or queued drone photogrammetry mission on the NodeODM worker.
 * 
 * @param {string} taskId - Photogrammetry task identifier
 * @returns {Promise<Object>} Cancellation confirmation
 */
export const cancelDronePhotogrammetryTask = async (taskId) => {
  const response = await giosApi.post(`/api/v1/drone/photogrammetry/tasks/${taskId}/cancel`);
  return response.data;
};

/**
 * Restarts a failed or cancelled photogrammetry task from dataset initialization stage.
 * 
 * @param {string} taskId - Photogrammetry task identifier
 * @returns {Promise<Object>} Reset task status
 */
export const restartDronePhotogrammetryTask = async (taskId) => {
  const response = await giosApi.post(`/api/v1/drone/photogrammetry/tasks/${taskId}/restart`);
  return response.data;
};

/**
 * Updates Ground Control Points (GCPs) and re-solves georeferencing for a mission.
 * 
 * @param {string} taskId - Photogrammetry task identifier
 * @param {Object} payload - List of GCPs with image and world coordinates
 * @returns {Promise<Object>} Updated GCP network and re-solved affine matrix
 */
export const updateDronePhotogrammetryGCPs = async (taskId, payload) => {
  const response = await giosApi.post(`/api/v1/drone/photogrammetry/tasks/${taskId}/gcp`, payload);
  return response.data;
};

/**
 * Calculates optimal photogrammetric flight altitude, ground footprint, and trigger spacing.
 * 
 * @param {Object} params - Target GSD, camera sensor parameters, overlap, and area
 * @returns {Promise<Object>} Detailed flight plan and camera parameters
 */
export const calculateDroneFlightPlanApi = async (params) => {
  const response = await giosApi.post('/api/v1/drone/photogrammetry/flight-plan', params);
  return response.data;
};

/**
 * Computes least-squares 2D affine geotransform matrix and residuals from Ground Control Points.
 * 
 * @param {Object} payload - List of GCPs
 * @returns {Promise<Object>} Affine matrix, resolution, rotation, and residuals
 */
export const solveDronePhotogrammetryAffine = async (payload) => {
  const response = await giosApi.post('/api/v1/drone/photogrammetry/solve-affine', payload);
  return response.data;
};

/**
 * Constructs dynamic XYZ tile streaming URL template for drone orthomosaics and DEMs.
 * 
 * @param {string} taskId - Task identifier
 * @param {string} [metric='orthophoto'] - Raster metric ('orthophoto', 'dsm', 'dtm', 'chm', 'slope', 'reprojection_error', 'point_density')
 * @returns {string} Tile URL template
 */
export const getDronePhotogrammetryTileUrlTemplate = (taskId, metric = 'orthophoto') => {
  const base = import.meta?.env?.VITE_API_BASE_URL || '';
  if (metric && metric !== 'orthophoto') {
    return `${base}/api/v1/tiles/drone/photogrammetry/${taskId}/${metric}/{z}/{x}/{y}.png`;
  }
  return `${base}/api/v1/tiles/drone/photogrammetry/${taskId}/{z}/{x}/{y}.png`;
};

export const buildDronePhotogrammetryTileUrlTemplateInternal = getDronePhotogrammetryTileUrlTemplate;

/**
 * Simulates a photogrammetry task state client-side for offline testing and demos.
 */
export const simulateDronePhotogrammetryTask = simulateNodeODMTaskProgression;

/**
 * Validates a custom band math formula syntax, detects variables, and verifies band IDs.
 * 
 * @param {string} formula - Mathematical formula, e.g. '(B08 - B04) / (B08 + B04)'
 * @param {string} [collection='sentinel-2-l2a'] - Target satellite/drone collection
 * @returns {Promise<Object>} AST and validation diagnostic report
 */
export const validateBandMathFormulaApi = async (formula, collection = 'sentinel-2-l2a') => {
  const response = await giosApi.post('/api/v1/analysis/custom-expression/validate', {
    formula,
    collection
  });
  return response.data;
};

/**
 * Safely evaluates a custom band math expression against scalar band values.
 * 
 * @param {string} formula - Formula string
 * @param {Record<string, number>} bandValues - Band reflectance mapping (e.g. { B08: 0.5, B04: 0.1 })
 * @param {string} [collection='sentinel-2-l2a'] - Sensor collection context
 * @param {number} [epsilon=1e-6] - Denominator stability clamp
 * @returns {Promise<Object>} Evaluated result, variable list, and metrics
 */
export const evaluateBandMathFormulaApi = async (formula, bandValues, collection = 'sentinel-2-l2a', epsilon = 1e-6) => {
  const response = await giosApi.post('/api/v1/analysis/custom-expression/evaluate', {
    formula,
    band_values: bandValues,
    collection,
    epsilon
  });
  return response.data;
};

/**
 * Fetches the library of verified industry-standard and custom band math presets.
 * 
 * @returns {Promise<Object>} List of formula presets
 */
export const fetchBandMathPresetsApi = async () => {
  const response = await giosApi.get('/api/v1/analysis/custom-expression/presets');
  return response.data;
};

/**
 * Constructs a dynamic Leaflet tile URL template for custom expression raster tiles.
 * 
 * @param {string} expr - Custom band math formula
 * @param {Object} [options={}] - Optional collection, itemId, colormap, rescale
 * @returns {string} Tile URL template
 */
export const getCustomExpressionTileUrlTemplate = (expr, options = {}) => {
  return buildCustomExpressionTileUrlTemplate(expr, options);
};

/**
 * @typedef {Object} DemTopographyParams
 * @property {number[]} [bbox] - Bounding box [min_lon, min_lat, max_lon, max_lat]
 * @property {string} [collection='cop-dem-glo-30'] - Source DEM collection
 * @property {number} [target_resolution_m=30.0] - Target resolution in meters
 * @property {number} [sun_azimuth_deg=315.0] - Solar azimuth in degrees
 * @property {number} [sun_altitude_deg=45.0] - Solar altitude in degrees
 * @property {number} [z_factor=1.0] - Vertical exaggeration multiplier
 * @property {number} [specific_catchment_area_m=100.0] - Specific catchment area for TWI
 */

/**
 * Fetches comprehensive DEM topography summary, relief metrics, and tile templates.
 * 
 * @param {DemTopographyParams} [params={}] - Topography request parameters
 * @returns {Promise<Object>} Summary statistics, elevation relief, slope/aspect, and tile URLs
 */
export const fetchDemTopographyAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/dem/topography', params);
  return response.data;
};

/**
 * Extracts a crest-to-toe cross-sectional elevation and slope transect profile.
 * 
 * @param {number[]} startPoint - [lat, lon] starting coordinates (crest)
 * @param {number[]} endPoint - [lat, lon] ending coordinates (toe)
 * @param {Object} [options={}] - Optional samples count, collection, z_factor
 * @returns {Promise<Object>} Transect points with elevation, slope, TWI, and hazard tiers
 */
export const fetchDemElevationTransect = async (startPoint, endPoint, options = {}) => {
  const payload = {
    start_point: startPoint,
    end_point: endPoint,
    samples: options.samples || 50,
    collection: options.collection || 'cop-dem-glo-30',
    z_factor: options.z_factor !== undefined ? options.z_factor : 1.0,
    ...options
  };
  const response = await giosApi.post('/api/v1/analysis/dem/transect', payload);
  return response.data;
};

/**
 * Evaluates geotechnical slope hazard zonification across an AOI.
 * 
 * @param {Object} [params={}] - Bounding box, critical threshold, and collection
 * @returns {Promise<Object>} Slope tier area distribution and critical slope percentage
 */
export const fetchDemSlopeHazardAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/dem/slope-hazard', params);
  return response.data;
};

/**
 * Constructs a dynamic Leaflet tile URL template for DEM relief and morphometric metrics.
 * 
 * @param {string} [metric='relief'] - Target metric ('relief', 'elevation', 'slope', 'aspect', 'hillshade', 'twi')
 * @param {Object} [options={}] - Colormap, rescale, sunAzimuth, sunAltitude, zFactor
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getDemTileUrlTemplate = (metric = 'relief', options = {}) => {
  return buildDemTileUrlTemplate(metric, options);
};

/**
 * Assembles a Virtual Raster (VRT) seamless mosaic catalog from candidate granules.
 * 
 * @param {Object} [params={}] - VRT request parameters (bbox, collection, granule_ids, blend_method, feather_width_m, bands)
 * @returns {Promise<Object>} VRT specification, seamlines, and tile streaming templates
 */
export const fetchVrtMosaic = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/mosaic/vrt', params);
  return response.data;
};

/**
 * Analyzes 2D distance-transform feathering and seamline continuity between adjacent granules.
 * 
 * @param {Object} [params={}] - Granules to blend, feather_width_m, blend_method
 * @returns {Promise<Object>} Feathering weights, profile samples, and radiometric continuity tier
 */
export const fetchSeamlineFeather = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/mosaic/feather', params);
  return response.data;
};

/**
 * Queries intersecting candidate granules and identifies overlapping adjacent pairs across an AOI.
 * 
 * @param {Object} [params={}] - Query bounding box and satellite collection
 * @returns {Promise<Object>} Intersecting granules and adjacent pairs with overlap metrics
 */
export const fetchMosaicGranules = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/mosaic/granules', params);
  return response.data;
};

/**
 * Fetches standard MGRS granule presets, blend method configs, and seamline quality tiers.
 * 
 * @returns {Promise<Object>} Presets and configurations
 */
export const fetchMosaicPresets = async () => {
  const response = await giosApi.get('/api/v1/mosaic/presets');
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for multi-tile seamless mosaic raster tiles.
 * 
 * @param {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @param {Object} [options={}] - Blending method, feather buffer width, colormap, rescale, bands
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getSeamlessMosaicTileUrlTemplate = (collection = 'sentinel-2-l2a', options = {}) => {
  return buildMosaicTileUrlTemplate({ collection, ...options });
};

/**
 * Constructs dynamic Leaflet tile URL template for mosaic feathering weight gradient tiles.
 * 
 * @param {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @param {Object} [options={}] - Feather buffer width, blend method
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getMosaicFeatherTileUrlTemplate = (collection = 'sentinel-2-l2a', options = {}) => {
  return buildMosaicFeatherTileUrlTemplate({ collection, ...options });
};

/**
 * Constructs dynamic Leaflet tile URL template for mosaic seamline boundary line overlay tiles.
 * 
 * @param {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getMosaicSeamlineTileUrlTemplate = (collection = 'sentinel-2-l2a') => {
  return buildMosaicSeamlineTileUrlTemplate(collection);
};

/**
 * Generates or queries a multi-temporal satellite image composite across an AOI.
 * 
 * @param {Object} [params={}] - bbox, collection, start_date, end_date, reducer, max_cloud_cover_pct, bands, quality_band
 * @returns {Promise<Object>} Composite metadata, contributing scenes, and tile template
 */
export const fetchTemporalComposite = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/temporal/composite', params);
  return response.data;
};

/**
 * Inspects available satellite scene acquisitions across an AOI and temporal window without reducing.
 * 
 * @param {Object} [params={}] - bbox, collection, start_date, end_date, max_cloud_cover_pct
 * @returns {Promise<Object>} Chronological scene catalog with cloud metrics and preview thumbnails
 */
export const fetchTemporalSceneStack = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/temporal/stack', params);
  return response.data;
};

/**
 * Fetches available statistical reducer methods, quality mosaic options, and tier configurations.
 * 
 * @returns {Promise<Object>} Available reducers and quality configs
 */
export const fetchTemporalReducers = async () => {
  const response = await giosApi.get('/api/v1/analysis/temporal/reducers');
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for multi-temporal composite raster tiles.
 * 
 * @param {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @param {string} [reducer='median'] - Statistical reducer method
 * @param {Object} [options={}] - Options (startDate, endDate, maxCloudCoverPct, bands, colormap, rescale, qualityBand)
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getTemporalCompositeTileUrlTemplate = (collection = 'sentinel-2-l2a', reducer = 'median', options = {}) => {
  return buildTemporalCompositeTileUrlTemplate({ collection, reducer, ...options });
};

/**
 * Constructs dynamic Leaflet tile URL template for quality mosaics (greenest-pixel / clearest-pixel).
 * 
 * @param {string} [collection='sentinel-2-l2a'] - Satellite collection
 * @param {Object} [options={}] - Options (qualityBand, startDate, endDate, maxCloudCoverPct, bands, colormap, rescale)
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getTemporalQualityMosaicTileUrlTemplate = (collection = 'sentinel-2-l2a', options = {}) => {
  return buildTemporalQualityMosaicTileUrlTemplate({ collection, ...options });
};

/**
 * Analyzes Sentinel-1 SAR dual-polarization backscatter with adaptive speckle filtering.
 * 
 * @param {Object} [params={}] - bbox, collection, polarization, speckle_filter, filter_kernel_size, calibration, water_threshold_db
 * @returns {Promise<Object>} Backscatter summary, equivalent looks, water fraction, and tile URL template
 */
export const fetchSarBackscatter = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/sar/backscatter', params);
  return response.data;
};

/**
 * Fetches available SAR speckle filtering algorithms, polarization channels, and calibration conventions.
 * 
 * @returns {Promise<Object>} Configuration metadata
 */
export const fetchSarSpeckleFilters = async () => {
  const response = await giosApi.get('/api/v1/analysis/sar/speckle-filters');
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for calibrated SAR backscatter tiles.
 * 
 * @param {Object} [options={}] - Options (collection, polarization, speckleFilter, kernelSize, calibration, colormap, rescale)
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getSarBackscatterTileUrlTemplate = (options = {}) => {
  return buildSarBackscatterTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for filtered SAR backscatter tiles.
 * 
 * @param {Object} [options={}] - Options (filterMethod, collection, polarization, kernelSize, colormap, rescale)
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getSarSpeckleFilterTileUrlTemplate = (options = {}) => {
  return buildSarSpeckleFilterTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for SAR flood inundation mask tiles.
 * 
 * @param {Object} [options={}] - Options (collection, thresholdDb, speckleFilter)
 * @returns {string} Dynamic Leaflet tile URL template
 */
export const getSarFloodTileUrlTemplate = (options = {}) => {
  return buildSarFloodTileUrlTemplate(options);
};

/**
 * Executes automated sub-pixel image co-registration between reference and target scenes.
 * 
 * @param {Object} [params={}] - Co-registration request parameters
 * @returns {Promise<Object>} Analysis response with affine transform, tie points, and tile templates
 */
export const fetchCoRegistrationAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/coregistration', params);
  return response.data;
};

/**
 * Fetches tie points with measured sub-pixel shifts between reference and target scenes.
 * 
 * @param {Object} [params={}] - Query parameters
 * @returns {Promise<Object>} Tie points catalog
 */
export const fetchCoRegistrationTiePoints = async (params = {}) => {
  const response = await giosApi.get('/api/v1/analysis/coregistration/tie-points', { params });
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for co-registered raster tiles.
 * 
 * @param {Object} [options={}] - Options (referenceSceneId, targetSceneId, mode, kernel, colormap)
 * @returns {string} Leaflet tile URL template
 */
export const getCoRegistrationTileUrlTemplate = (options = {}) => {
  return buildCoregistrationTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for displacement vector arrow overlay tiles.
 * 
 * @param {Object} [options={}] - Options (analysisId, arrowScale)
 * @returns {string} Leaflet tile URL template
 */
export const getCoRegistrationVectorFieldTileUrlTemplate = (options = {}) => {
  return buildCoregistrationVectorFieldTileUrlTemplate(options);
};

/**
 * Requests multi-spectral bio-optical water quality and algal bloom analysis.
 * 
 * @param {Object} [params={}] - Request parameters (scene_id, bbox, collection, metrics, water_masking_method, mndwi_threshold, algorithm)
 * @returns {Promise<Object>} Analysis response with water body summary and dynamic tile contracts
 */
export const fetchAquaticQualityAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/aquatic/quality', params);
  return response.data;
};

/**
 * Requests targeted Harmful Algal Bloom (HAB) and cyanobacterial risk assessment.
 * 
 * @param {Object} [params={}] - Request parameters
 * @returns {Promise<Object>} HAB risk summary and advisory tiers
 */
export const fetchAquaticHabDetection = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/aquatic/hab', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for aquatic quality metrics.
 * 
 * @param {Object} [options={}] - Options (collection, metric, colormap, rescale, mndwiThreshold, maskLand)
 * @returns {string} Leaflet tile URL template
 */
export const getAquaticTileUrlTemplate = (options = {}) => {
  return buildAquaticTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for HAB hazard tier tiles.
 * 
 * @param {Object} [options={}] - Options (collection, mndwiThreshold)
 * @returns {string} Leaflet tile URL template
 */
export const getAquaticHabTileUrlTemplate = (options = {}) => {
  return buildAquaticHabTileUrlTemplate(options);
};

/**
 * Requests topographic solar illumination correction analysis.
 * 
 * @param {Object} [params={}] - Request parameters (scene_id, collection, dem_collection, bbox, method, solar_geometry, config)
 * @returns {Promise<Object>} Topographic correction analysis response and tile templates
 */
export const fetchTopographicCorrectionAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/topographic/correction', params);
  return response.data;
};

/**
 * Requests solar illumination geometry and ephemeris angles for a scene.
 * 
 * @param {Object} [params={}] - Request parameters (scene_id, collection)
 * @returns {Promise<Object>} Solar geometry angles
 */
export const fetchTopographicSolarGeometry = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/topographic/solar-geometry', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for topographically corrected imagery.
 * 
 * @param {Object} [options={}] - Options (collection, itemId, method, metric, solarZenith, solarAzimuth, cFactor, minnaertK, colormap, rescale)
 * @returns {string} Leaflet tile URL template
 */
export const getTopographicTileUrlTemplate = (options = {}) => {
  return buildTopographicTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for topographic solar local incidence cos(i) hillshade tiles.
 * 
 * @param {Object} [options={}] - Options (collection, itemId, solarZenith, solarAzimuth)
 * @returns {string} Leaflet tile URL template
 */
export const getTopographicIlluminationTileUrlTemplate = (options = {}) => {
  return buildTopographicIlluminationTileUrlTemplate(options);
};

/**
 * Executes multi-sensor Harmonized Landsat Sentinel-2 (HLS) analysis.
 * 
 * @param {Object} [params={}] - Request parameters (scene_id, sensor, collection, mgrs_tile, geometry, config)
 * @returns {Promise<Object>} HLS harmonization analysis response and tile templates
 */
export const fetchHlsHarmonizationAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/hls/harmonization', params);
  return response.data;
};

/**
 * Requests BRDF view and illumination geometry calculation.
 * 
 * @param {Object} [params={}] - Request parameters (solar_zenith, solar_azimuth, view_zenith, view_azimuth)
 * @returns {Promise<Object>} Calculated BRDF kernel values (k_vol, k_geo, c_brdf)
 */
export const fetchHlsBrdfGeometry = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/hls/brdf-geometry', params);
  return response.data;
};

/**
 * Requests cross-sensor spectral bandpass adjustment.
 * 
 * @param {Object} [params={}] - Request parameters (reflectance, band, source_sensor, target_sensor)
 * @returns {Promise<Object>} Adjusted reflectance values and coefficients
 */
export const fetchHlsBandpassAdjustment = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/hls/bandpass', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for fully harmonized HLS imagery.
 * 
 * @param {Object} [options={}] - Options (collection, itemId, metric, stage, sensor, colormap, rescale)
 * @returns {string} Leaflet tile URL template
 */
export const getHlsTileUrlTemplate = (options = {}) => {
  return buildHlsTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for NBAR normalized surface reflectance tiles.
 * 
 * @param {Object} [options={}] - Options (collection, itemId, targetSolarZenith)
 * @returns {string} Leaflet tile URL template
 */
export const getHlsNbarTileUrlTemplate = (options = {}) => {
  return buildHlsNbarTileUrlTemplate(options);
};

/**
 * Executes Land Surface Temperature (LST) and thermal anomaly inversion analysis.
 * 
 * @param {Object} [params={}] - LST analysis parameters
 * @returns {Promise<Object>} Analysis response with kinetic temperature and tile templates
 */
export const fetchThermalLstAnalysis = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/thermal/lst', params);
  return response.data;
};

/**
 * Calculates fractional vegetation cover and surface emissivity for a given NDVI.
 * 
 * @param {Object} [params={}] - Emissivity parameters
 * @returns {Promise<Object>} Emissivity derivation result
 */
export const fetchThermalEmissivity = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/thermal/emissivity', params);
  return response.data;
};

/**
 * Evaluates thermal anomaly departure and classification tier.
 * 
 * @param {Object} [params={}] - Thermal anomaly parameters
 * @returns {Promise<Object>} Thermal anomaly assessment
 */
export const fetchThermalAnomaly = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/thermal/anomaly', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for kinetic Land Surface Temperature raster tiles.
 * 
 * @param {Object} [options={}] - Options (collection, itemId, metric, method, colormap, rescale)
 * @returns {string} Leaflet tile URL template
 */
export const getThermalLstTileUrlTemplate = (options = {}) => {
  return buildThermalLstTileUrlTemplate(options);
};

/**
 * Constructs dynamic Leaflet tile URL template for thermal anomaly departure tiles.
 * 
 * @param {Object} [options={}] - Options (collection, itemId, ambientBaselineTempC, colormap)
 * @returns {string} Leaflet tile URL template
 */
export const getThermalAnomalyTileUrlTemplate = (options = {}) => {
  return buildThermalAnomalyTileUrlTemplate(options);
};

/**
 * Submits an asynchronous geospatial data export request (GeoTIFF COG, GeoPackage, GeoJSON, CSV).
 * 
 * @param {Object} [params={}] - Export job parameters
 * @returns {Promise<Object>} Job submission response with job_id and status
 */
export const requestDatasetExport = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/export/request', params);
  return response.data;
};

/**
 * Polls the execution status and artifact metadata for an asynchronous export job.
 * 
 * @param {string} jobId - Unique export job identifier
 * @returns {Promise<Object>} Job status response with progress and artifact details
 */
export const fetchExportJobStatus = async (jobId) => {
  const response = await giosApi.get(`/api/v1/analysis/export/status/${jobId}`);
  return response.data;
};

/**
 * Retrieves the download URL for a completed export artifact.
 * 
 * @param {string} jobId - Unique export job identifier
 * @returns {string} Direct download URL
 */
export const fetchExportDownloadUrl = (jobId) => {
  return buildExportDownloadUrl(jobId);
};

/**
 * Retrieves available geospatial export formats, coordinate systems, and layer presets.
 * 
 * @returns {Promise<Object>} Formats, CRS options, and layer configurations
 */
export const fetchExportFormats = async () => {
  const response = await giosApi.get('/api/v1/analysis/export/formats');
  return response.data;
};

/**
 * Fetches multi-harmonic phenology decomposition and fitted seasonal curve.
 * 
 * @param {Object} [params={}] - Phenology analysis request parameters
 * @returns {Promise<Object>} Phenology analysis response with metrics and curve points
 */
export const fetchPhenologyCurve = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/phenology/curve', params);
  return response.data;
};

/**
 * Fetches pre-configured benchmark phenological research sites.
 * 
 * @returns {Promise<Object>} Benchmark sites dictionary and metadata
 */
export const fetchPhenologyBenchmarks = async () => {
  const response = await giosApi.get('/api/v1/analysis/phenology/benchmarks');
  return response.data;
};

/**
 * Computes or retrieves derived phenological milestone metrics (SOS, POS, EOS, LOS).
 * 
 * @param {Object} [params={}] - Phenology metrics request parameters
 * @returns {Promise<Object>} Phenological metrics summary
 */
export const fetchPhenologyMetrics = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/phenology/metrics', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for phenological metric raster tiles.
 * 
 * @param {Object} [options={}] - Options (metric, colormap)
 * @returns {string} Leaflet tile URL template
 */
export const getPhenologyTileUrlTemplate = (options = {}) => {
  return buildPhenologyTileUrl(options);
};

/**
 * Fetches available spectral sharpening methods, benchmark research scenes, and configuration options.
 * 
 * @returns {Promise<Object>} Methods, benchmark scenes, and supported bands
 */
export const fetchSharpeningMethods = async () => {
  const response = await giosApi.get('/api/v1/analysis/sharpening/methods');
  return response.data;
};

/**
 * Submits a spectral super-resolution / pan-sharpening request.
 * 
 * @param {Object} [params={}] - Sharpening request parameters
 * @returns {Promise<Object>} Sharpened dataset response with quality metrics and tile template
 */
export const requestSpectralSharpening = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/sharpening/sharpen', params);
  return response.data;
};

/**
 * Evaluates sharpening quality metrics (SAM, ERGAS, Q4) for a given algorithm and band combination.
 * 
 * @param {Object} [params={}] - Evaluation request parameters
 * @returns {Promise<Object>} Quantitative quality summary
 */
export const evaluateSharpeningQuality = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/sharpening/evaluate', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for sharpened raster tiles.
 * 
 * @param {Object} [options={}] - Options (method, target, colormap)
 * @returns {string} Leaflet tile URL template
 */
export const getSharpenedTileUrlTemplate = (options = {}) => {
  return buildSharpenedTileUrlTemplate(options);
};

/**
 * Fetches available cross-calibration models, benchmark targets, and band coefficients.
 * 
 * @returns {Promise<Object>} Cross-calibration capabilities response
 */
export const fetchCrossCalibrationModels = async () => {
  const response = await giosApi.get('/api/v1/analysis/cross-calibration/models');
  return response.data;
};

/**
 * Submits a multi-sensor radiometric cross-calibration and harmonization request.
 * 
 * @param {Object} [params={}] - Cross-calibration request parameters
 * @returns {Promise<Object>} Harmonized dataset response with quality metrics and tile template
 */
export const requestCrossCalibration = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/cross-calibration/calibrate', params);
  return response.data;
};

/**
 * Evaluates cross-sensor calibration quality metrics (RMSE, R², bias) for a given sensor pair and model.
 * 
 * @param {Object} [params={}] - Evaluation request parameters
 * @returns {Promise<Object>} Quantitative quality summary
 */
export const evaluateCrossCalibrationQuality = async (params = {}) => {
  const response = await giosApi.post('/api/v1/analysis/cross-calibration/evaluate', params);
  return response.data;
};

/**
 * Constructs dynamic Leaflet tile URL template for cross-calibrated raster tiles.
 * 
 * @param {Object} [options={}] - Options (model, metric, colormap)
 * @returns {string} Leaflet tile URL template
 */
export const getCrossCalibratedTileUrlTemplate = (options = {}) => {
  return buildCrossCalibratedTileUrlTemplate(options);
};


export {
  InSARDeformationHazardTier,
  INSAR_HAZARD_CONFIGS,
  INSAR_VELOCITY_TILE_METRICS,
  INSAR_SENSOR_WAVELENGTHS,
  calculatePsTemporalCoherence,
  calculateAmplitudeDispersionIndex,
  calculateInterferometricBaselineGeometry,
  decomposeAtmosphericPhaseScreen,
  classifyInSARDeformationHazardTier,
  projectLosToVerticalAndHorizontal,
  decomposeDualOrbitInSARVelocities,
  calculateInSARPersistentScattererAnalysis,
  calculateInSARVelocityFieldAnalysis,
  buildInSARVelocityTileUrl,
  SARCoherenceDamageTier,
  SAR_DAMAGE_TIERS,
  DamageProxyTileMetric,
  SAR_DAMAGE_TIER_CONFIGS,
  DAMAGE_PROXY_TILE_METRICS,
  DAMAGE_PROXY_TILE_METRIC_CONFIGS,
  classifySarDamageTier,
  calculateSarCoherenceLoss,
  calculateBuildingStructuralExposure,
  calculateDamageProxySummary,
  buildDamageProxyTileUrl,
  PhenologyAnomalyTier,
  PHENOLOGY_ANOMALY_TIERS,
  PhenologyTileMetric,
  PHENOLOGY_ANOMALY_TIER_CONFIGS,
  PHENOLOGY_TILE_METRICS,
  PHENOLOGY_TILE_METRIC_CONFIGS,
  classifyPhenologyAnomalyTier,
  classifyPhenologyAnomaly,
  fitHarmonicFourierRegression,
  evaluateHarmonicModel,
  calculateTheilSenSlope,
  calculateMannKendallTest,
  calculateClimatologicalMonthlyMad,
  calculateSeasonalMadAnomalies,
  calculatePhenologyDecompositionAnalysis,
  buildPhenologyAnomalyTileUrl,
  STACCollectionName,
  HarvestScheduleInterval,
  WebhookChannelType,
  WebhookDeliveryStatus,
  HarvesterAlertSeverity,
  PerimeterTriggerCondition,
  HARVEST_SCHEDULE_CONFIGS,
  WEBHOOK_CHANNEL_CONFIGS,
  generateHmacSha256Signature,
  verifyHmacSha256Signature,
  pointInPerimeterPolygon,
  calculateRetryBackoff,
  formatChannelNotificationPayload,
  simulateSTACHarvesterCycle,
  calculateSTACHarvesterSimulation,
  NODEODM_LIFECYCLE_STATUSES,
  DRONE_PHOTOGRAMMETRY_TASK_STATUSES,
  NODEODM_PIPELINE_STAGES,
  DRONE_PHOTOGRAMMETRY_TILE_METRICS,
  PHOTOGRAMMETRY_FEATURE_QUALITIES,
  RADIOMETRIC_CALIBRATION_MODES,
  NODEODM_PIPELINE_STAGE_METADATA,
  DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS,
  DRONE_CAMERA_PRESETS,
  solveGcpAffineTransform,
  calculateDroneFlightPlan,
  formatOdmGcpFile,
  parseOdmGcpFile,
  buildDronePhotogrammetryTileUrl,
  buildDronePhotogrammetryTileUrlTemplate,
  simulateNodeODMTaskProgression,
  BAND_MATH_TOKEN_TYPES,
  BAND_MATH_NODE_TYPES,
  BAND_NAME_ALIASES,
  VALID_BAND_MATH_FUNCTIONS,
  BAND_MATH_PRESETS,
  tokenizeBandMath,
  parseBandMathAst,
  validateBandMathFormula,
  evaluateBandMathAst,
  evaluateBandMathFormula,
  buildCustomExpressionTileUrl,
  buildCustomExpressionTileUrlTemplate,
  DEM_COLLECTION_IDS,
  DEM_METRIC_TYPES,
  SLOPE_UNITS,
  DEM_SLOPE_HAZARD_TIERS,
  DEM_COLLECTIONS_METADATA,
  DEM_METRIC_CONFIGS,
  DEM_SLOPE_HAZARD_CONFIGS,
  DEFAULT_DEM_SUN_ILLUMINATION,
  DEM_COLORMAPS_METADATA,
  aspectToCompassDirection,
  calculateHornGradient,
  calculateTerrainSlope,
  calculateCompassAspect,
  calculateLambertianHillshade,
  calculateDemTopographicWetnessIndex,
  classifyDemSlopeHazardTier,
  calculateElevationTransectProfile,
  buildDemTileUrl,
  buildDemTileUrlTemplate,
  MGRS_BENCHMARK_GRANULES,
  MGRS_REGIONAL_PRESETS,
  SEAMLINE_MODE_CONFIGS,
  calculateDistanceTransformWeights,
  calculateMosaicedBbox,
  buildVrtTileUrlTemplate,
  MOSAIC_BLEND_METHODS,
  MosaicBlendMethod,
  MOSAIC_SEAMLINE_TIERS,
  MosaicSeamlineTier,
  MOSAIC_GRANULE_STATUSES,
  MosaicGranuleStatus,
  MGRS_TILE_DIMENSIONS,
  MGRS_GRANULE_PRESETS,
  MOSAIC_BLEND_METHOD_CONFIGS,
  SEAMLINE_TIER_CONFIGS,
  classifyMosaicSeamlineTier,
  classifyMosaicRadiometricTier,
  calculateDistanceTransformFeatherWeights,
  calculateVoronoiSeamlineWeights,
  calculateMultiGranuleSeamlineWeights,
  calculateDistanceToEdge2d,
  calculateMgrsGranuleOverlap,
  generateVrtXmlDefinition,
  buildMosaicTileUrl,
  buildMosaicTileUrlTemplate,
  buildMosaicFeatherTileUrlTemplate,
  buildMosaicSeamlineTileUrlTemplate,
  TEMPORAL_REDUCER_METHODS,
  TemporalReducerMethod,
  TEMPORAL_QUALITY_TIERS,
  TemporalQualityTier,
  TEMPORAL_STACK_STATUSES,
  TemporalStackStatus,
  TEMPORAL_REDUCER_CONFIGS,
  TEMPORAL_QUALITY_TIER_CONFIGS,
  TEMPORAL_BENCHMARK_SCENES,
  calculatePixelQualityScore,
  classifyTemporalCompositeQuality,
  calculateNdvi,
  selectGreenestPixelIndices,
  selectClearestPixelIndices,
  applyTemporalReduction,
  buildTemporalCompositeTileUrl,
  buildTemporalCompositeTileUrlTemplate,
  buildTemporalQualityMosaicTileUrlTemplate,
  SarPolarization,
  SPECKLE_FILTER_METHODS,
  SpeckleFilterMethod,
  SAR_BACKSCATTER_CALIBRATIONS,
  SARBackscatterCalibration,
  SAR_FLOOD_DETECTION_TIERS,
  SARFloodDetectionTier,
  SAR_POLARIZATION_CONFIGS,
  SPECKLE_FILTER_CONFIGS,
  SAR_FLOOD_TIER_CONFIGS,
  SAR_BENCHMARK_SCENES,
  linearToDecibel,
  decibelToLinear,
  calculatePolarizationRatioLinear,
  calculatePolarizationRatioDb,
  calculatePolarizationRatio,
  calculateNormalizedDifferencePolarizationIndex,
  applyTerrainFlatteningGamma0,
  classifySarFloodTier,
  classifySarWaterPixels,
  calculateRefinedLeeFilterWeights,
  applySpeckleFilter,
  buildSarBackscatterTileUrl,
  buildSarBackscatterTileUrlTemplate,
  buildSarSpeckleFilterTileUrl,
  buildSarSpeckleFilterTileUrlTemplate,
  buildSarFloodTileUrl,
  buildSarFloodTileUrlTemplate,
  COREGISTRATION_METHODS,
  CoRegistrationMethod,
  GEOMETRIC_RESAMPLING_KERNELS,
  GeometricResamplingKernel,
  COREGISTRATION_QUALITY_TIERS,
  CoRegistrationQualityTier,
  COREGISTRATION_METHOD_CONFIGS,
  RESAMPLING_KERNEL_CONFIGS,
  COREGISTRATION_QUALITY_TIER_CONFIGS,
  COREGISTRATION_BENCHMARK_PAIRS,
  calculateFftPhaseCorrelationShift,
  estimateAffineTransformMatrix,
  evaluateResamplingKernelWeight,
  classifyCoregistrationQualityTier,
  calculateChangeDetectionFalsePositiveRisk,
  buildCoregistrationTileUrl,
  buildCoregistrationTileUrlTemplate,
  buildCoregistrationVectorFieldTileUrlTemplate,
  AQUATIC_METRICS,
  AquaticMetric,
  EUTROPHICATION_RISK_TIERS,
  EutrophicationRiskTier,
  BIO_OPTICAL_ALGORITHMS,
  BioOpticalAlgorithm,
  WATER_MASKING_METHODS,
  WaterMaskingMethod,
  AQUATIC_METRIC_CONFIGS,
  EUTROPHICATION_TIER_CONFIGS,
  BIO_OPTICAL_ALGORITHM_CONFIGS,
  AQUATIC_BENCHMARK_SCENES,
  calculateFai,
  calculateChlaFromNdci,
  calculateNechadTurbidity,
  calculateMndwi,
  isWaterPixel,
  classifyEutrophicationRiskTier,
  buildAquaticTileUrl,
  buildAquaticTileUrlTemplate,
  buildAquaticHabTileUrlTemplate,
  TopographicCorrectionMethod,
  ILLUMINATION_CONDITIONS,
  IlluminationCondition,
  TOPOGRAPHIC_METRICS,
  TopographicMetric,
  TOPOGRAPHIC_METHOD_CONFIGS,
  TOPOGRAPHIC_BENCHMARK_SCENES,
  DEFAULT_SOLAR_EPHEMERIS,
  calculateLocalIncidenceCosine,
  calculateCCorrectionFactor,
  calculateMinnaertCorrection,
  calculateScsCCorrection,
  classifyIlluminationCondition,
  applyTopographicCorrection,
  estimateCFactorFromLinearRegression,
  buildTopographicTileUrl,
  buildTopographicTileUrlTemplate,
  buildTopographicIlluminationTileUrlTemplate,
  HlsSensorType,
  HLS_SENSOR_TYPES,
  BrdfKernelModel,
  BRDF_KERNEL_MODEL_TYPES,
  HlsHarmonizationStage,
  HLS_HARMONIZATION_STAGES,
  HlsMetric,
  HLS_METRICS,
  HLS_BANDPASS_COEFFICIENTS,
  HLS_BRDF_SPECTRAL_PARAMETERS,
  HLS_BENCHMARK_SCENES,
  DEFAULT_HLS_GEOMETRY,
  calculateRossThickVolumetricKernel,
  calculateLiSparseGeometricKernel,
  calculateNbarBrdfFactor,
  applyNbarNormalization,
  applyCrossSensorBandpassAdjustment,
  applyHlsHarmonization,
  buildHlsTileUrl,
  buildHlsNbarTileUrlTemplate,
  ThermalSensorType,
  THERMAL_SENSOR_TYPES,
  LstAlgorithmModel,
  LST_ALGORITHM_MODELS,
  ThermalAnomalySeverity,
  THERMAL_ANOMALY_SEVERITIES,
  ThermalMetric,
  THERMAL_METRICS,
  THERMAL_CALIBRATION_COEFFICIENTS,
  THERMAL_EMISSIVITY_ENDMEMBERS,
  THERMAL_BENCHMARK_SCENES,
  calculateSobrinoFractionalVegetationCover,
  calculateSobrinoLandSurfaceEmissivity,
  calculatePlanckRadiance,
  calculatePlanckBrightnessTemperature,
  calculateRteSurfaceTemperature,
  calculateArtisCarnahanLst,
  calculateSmwLst,
  classifyThermalAnomalySeverity,
  applyLstInversion,
  buildThermalLstTileUrl,
  buildThermalLstTileUrlTemplate,
  buildThermalAnomalyTileUrlTemplate,
  ExportFormat,
  EXPORT_FORMATS,
  ExportJobStatus,
  EXPORT_JOB_STATUSES,
  ExportCrs,
  EXPORT_CRS_OPTIONS,
  ExportLayerType,
  EXPORT_LAYER_TYPES,
  EXPORT_FORMAT_CONFIGS,
  EXPORT_CRS_CONFIGS,
  EXPORT_LAYER_CONFIGS,
  EXPORT_BENCHMARK_SCENES,
  normalizeExportFormat,
  determineUtmEpsg,
  bboxToGeoJsonPolygon,
  calculateBboxAreaKm2,
  calculateAffineTransformMatrix,
  generateQgisIngestionSnippet,
  formatExportJobFilename,
  buildExportStatusUrl,
  buildExportDownloadUrl,
  PhenologyMetric,
  PHENOLOGY_METRICS,
  PHENOLOGY_METRIC_CONFIGS,
  PHENOLOGY_BENCHMARK_SITES,
  normalizePhenologyMetric,
  evaluateMultiHarmonicCurve,
  extractPhenologyTransitionMetrics,
  buildPhenologyTileUrl,
  SharpeningMethod,
  SHARPENING_METHODS,
  SharpeningTargetBand,
  SHARPENING_TARGET_BANDS,
  SharpeningGuidanceBand,
  SHARPENING_GUIDANCE_BANDS,
  SharpeningIndexTarget,
  SHARPENING_INDEX_TARGETS,
  HPFKernelType,
  HPF_KERNEL_TYPES,
  SharpeningQualityRating,
  SHARPENING_METHOD_CONFIGS,
  SHARPENING_BAND_CONFIGS,
  SYNTHETIC_PAN_WEIGHTS,
  HPF_KERNELS,
  SHARPENING_BENCHMARK_SCENES,
  normalizeSharpeningMethod,
  calculateSyntheticPanchromatic,
  calculateBroveySharpenedValue,
  calculateHighPassInjectedValue,
  calculateSharpeningSam,
  calculateErgas,
  calculateUiqiQ4,
  calculateEnergyConservationRatio,
  classifySharpeningQualityRating,
  buildSharpenedTileUrl,
  buildSharpenedTileUrlTemplate,
  SensorCalibrationModel,
  SENSOR_CALIBRATION_MODELS,
  SensorPlatform,
  SENSOR_PLATFORMS,
  CrossSensorBand,
  CROSS_SENSOR_BANDS,
  CrossSensorTileMetric,
  CROSS_SENSOR_TILE_METRICS,
  CalibrationQualityRating,
  CALIBRATION_QUALITY_RATINGS,
  SENSOR_CALIBRATION_MODEL_CONFIGS,
  CROSS_SENSOR_BAND_COEFFICIENTS,
  CROSS_SENSOR_BENCHMARK_SCENES,
  normalizeSensorCalibrationModel,
  normalizeCrossSensorBand,
  applyCrossSensorBandCalibration,
  calculateOrthogonalDistanceRegression,
  calculateCrossSensorResidualRmse,
  calculateCrossSensorRadiometricBias,
  classifyCalibrationQualityRating,
  buildCrossCalibratedTileUrl,
  buildCrossCalibratedTileUrlTemplate
} from '../config/constants.js';

export default giosApi;









