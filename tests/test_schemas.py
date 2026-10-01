import math
import re
"""Tests for GIOS v2.5 Core Schemas, Data Models, and API Contracts.

Verifies:
1. Pydantic validation across all Section 4 contracts (Tiles, Burn Severity, Pixel Probe, Zonal Stats).
2. Drone ingestion metadata and metric GSD contracts.
3. Seasonal climatology MAD, trend, and alerting models.
4. Immunity against circular imports across the entire backend.
"""
import unittest
from app.models.schemas import (
    SatelliteCollection,
    SpectralIndex,
    TileColormap,
    HazardCategory,
    HazardSeverity,
    AlertSeverity,
    DroneStatus,
    DynamicTileParams,
    BurnSeverityRequest,
    BurnSeverityCategoryDetail,
    FIREMON_THRESHOLDS,
    BurnSeverityResponse,
    PixelCoordinates,
    ClimatologicalContext,
    PixelProbeRequest,
    PixelProbeResponse,
    ZonalStatsRealRequest,
    ZonalDistributionStats,
    ZonalHistogram,
    ZonalStatsRealResponse,
    DroneUploadMetadata,
    DroneOrthomosaicMetadata,
    DroneMissionResponse,
    TrendRequest,
    TimeSeriesPoint,
    TimeSeriesResponse,
    AlertRecord,
    AlertWebhookPayload,
    ProactiveAlertType,
    ProactiveJarvisAlert,
    SatelliteAnomalyAlert,
    HealthResponse,
    SceneMetadata,
    SearchResponse,
    SearchParams,
    IndexRequest,
    IndexResultSummary,
    EventResponse,
    USGSStationData,
    GEEImageRequest,
    GEEImageResponse,
    SentinelHubTileRequest,
    SentinelHubTileResponse,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    VectorLayerResponse,
    SpatialBufferRequest,
    SpatialBufferResponse,
    AgentChatMessage,
    AgentChatRequest,
    AgentToolAction,
    MapAction,
    NavigationAction,
    AgentChatResponse,
    EventCreateRequest,
    HazardEventDetail,
    HazardEvent,
    BurnSeverityApiRequest,
    DroneRegisterRequest,
    DroneScheduleMissionRequest,
    DroneUploadResponse,
    DroneMissionScheduleResponse,
    DroneMissionsListResponse,
    DroneOrthomosaicsListResponse,
    SensorData,
    SensorIngestResponse,
    MockAlertResponse,
    UserLoginRequest,
    UserRegisterRequest,
    TokenResponse,
    UserResponse,
    UserRegisterResponse,
    ReportPdfParams,
    SpectralIndexMetadata,
    ColormapMetadata,
    SPECTRAL_INDICES_METADATA,
    COLORMAPS_METADATA,
    get_spectral_index_metadata,
    list_spectral_indices,
    get_colormap_metadata,
    list_colormaps,
    SatelliteCollectionMetadata,
    SATELLITE_COLLECTIONS_METADATA,
    get_satellite_collection_metadata,
    list_satellite_collections,
    parse_rescale,
    classify_dnbr,
    API_ROUTE_CONTRACTS,
    format_api_route,
    validate_spectral_index,
    validate_colormap,
    BoundingBox,
    parse_bbox,
    ApiErrorResponse,
    get_auto_stretch,
    get_colormap_gradient,
    get_colormap_color_stops,
    CLIMATOLOGICAL_ANOMALY_LEVELS,
    classify_z_score,
    lat_lon_to_tile,
    tile_to_bbox,
    calculate_metric_gsd,
    normalize_geojson_polygon,
    calculate_haversine_distance,
    calculate_initial_bearing,
    calculate_polygon_centroid,
    BandSpecMetadata,
    BAND_SPECS,
    get_band_spec,
    list_band_specs,
    get_band_wavelength,
    SpatialLayerType,
    SpatialLayerMetadata,
    SPATIAL_LAYERS_METADATA,
    get_spatial_layer_metadata,
    list_spatial_layer_types,
    SwipeComparisonMode,
    SwipePaneLayer,
    SwipeCurtainConfig,
    SWIPE_PRESET_RATIOS,
    get_swipe_preset_ratios,
    generate_tile_cache_key,
    BAND_ALIAS_MAP,
    SpectralBandValue,
    format_spectral_profile,
    SpatialLODTier,
    ZOOM_LOD_TIERS,
    get_spatial_lod_tier,
    get_collection_recommended_zoom,
    get_colormap_color_at_value,
    hazard_event_to_geojson_feature,
    hazard_events_to_feature_collection,
    generate_boustrophedon_waypoints,
    TerrainMetric,
    TerrainAnalysisRequest,
    TerrainAnalysisResponse,
    SARPolarization,
    SARAnalysisRequest,
    SARAnalysisResponse,
    TransectSampleMethod,
    TransectPoint,
    TransectProfileSummary,
    TransectAnalysisRequest,
    TransectAnalysisResponse,
    sample_polyline_equidistant,
    VolumeCalculationMode,
    VolumetricAnalysisRequest,
    VolumetricAnalysisResponse,
    calculate_cut_fill_volumes,
    ExportRasterFormat,
    DataExportRequest,
    DataExportResponse,
    format_export_filename,
    AnimationPlaybackMode,
    AnimationKeyframe,
    AnimationSequenceConfig,
    build_animation_keyframes,
    CompositeReducer,
    TemporalCompositeRequest,
    TemporalCompositeResponse,
    build_composite_tile_url,
    DefectCategory,
    DefectSeverity,
    DefectStatus,
    GeotechnicalAnnotation,
    CreateAnnotationRequest,
    UpdateAnnotationStatusRequest,
    MaintenanceWorkOrder,
    CreateWorkOrderRequest,
    annotation_to_geojson_feature,
    annotations_to_feature_collection,
    SubscriptionTriggerType,
    NotificationChannel,
    AOISubscriptionRequest,
    AOISubscriptionResponse,
    SubscriptionAlertPayload,
    SeamlineMode,
    MGRSTileSpec,
    VRTDatasetSpec,
    VRTAnalysisRequest,
    VRTAnalysisResponse,
    build_vrt_tile_url,
    ChangeDetectionMetric,
    ChangeCategory,
    ChangeCategoryDetail,
    ChangeDetectionRequest,
    ChangeDetectionResponse,
    calculate_change_detection_classes,
    build_difference_tile_url,
    GeotechnicalSensorType,
    SensorReadingStatus,
    GeotechnicalSensor,
    SensorReading,
    GeotechnicalNetworkSummary,
    CreateGeotechnicalSensorRequest,
    sensor_to_geojson_feature,
    sensors_to_feature_collection,
    EACDataPoint,
    EACAnalysisRequest,
    EACAnalysisResponse,
    calculate_elevation_storage_capacity,
    TilePyramidBounds,
    TileCachePreloadRequest,
    TileCachePreloadResponse,
    calculate_tile_pyramid_coords,
    calculate_tile_pyramid_count,
    GCPRole,
    GCPTargetType,
    GCPCoordinate,
    GCPResidual,
    RMSEMetrics,
    CameraInteriorOrientation,
    GCPQualityAssessmentRequest,
    GCPQualityAssessmentResponse,
    calculate_gcp_residuals_and_rmse,
    gcp_to_geojson_feature,
    gcps_to_feature_collection,
    SlopeStabilityTier,
    TWIAnalysisRequest,
    TWIAnalysisResponse,
    SlopeStabilityRequest,
    SlopeStabilityResponse,
    calculate_topographic_wetness_index,
    calculate_slope_factor_of_safety,
    classify_slope_stability_tier,
    HLSPlatform,
    HLSBandSpec,
    HLS_TRANSFORMATION_COEFFICIENTS,
    HLSBandCalibrationRequest,
    HLSBandCalibrationResponse,
    cross_calibrate_spectral_band,
    WaterQualityMetric,
    TrophicState,
    TrophicCategoryDetail,
    WaterQualityAnalysisRequest,
    WaterQualityAnalysisResponse,
    calculate_ndci,
    calculate_ndti,
    classify_trophic_state,
    CyanobacteriaAlertLevel,
    classify_cyanobacteria_alert,
    CAMERA_CALIBRATION_PRESETS,
    get_camera_calibration_preset,
    list_camera_calibration_presets,
    SoilMechanicsPreset,
    SOIL_MECHANICS_PRESETS,
    get_soil_preset,
    list_soil_presets,
    build_twi_tile_url,
    build_slope_stability_tile_url,
    build_water_quality_tile_url,
    HeatHazardLevel,
    LSTCalculationMethod,
    LSTAnalysisRequest,
    LSTAnalysisResponse,
    calculate_fractional_vegetation_cover,
    calculate_land_surface_emissivity,
    calculate_lst_single_channel,
    classify_heat_hazard_level,
    build_lst_tile_url,
    TopographicCorrectionModel,
    TopographicCorrectionRequest,
    TopographicCorrectionResponse,
    calculate_illumination_angle,
    apply_topographic_c_correction,
    InSARDeformationTier,
    InSARDisplacementRequest,
    InSARDisplacementResponse,
    InSARCoherenceRequest,
    InSARCoherenceResponse,
    calculate_insar_displacement_mm,
    calculate_insar_velocity_mm_yr,
    classify_insar_deformation_tier,
    build_insar_tile_url,
    PhenologyFitModel,
    Phenometrics,
    PhenologyAnalysisRequest,
    PhenologyAnalysisResponse,
    fit_harmonic_phenology,
    BAPScoringWeights,
    BAPCompositeRequest,
    BAPCompositeResponse,
    CoRegistrationResamplingKernel,
    CoRegistrationStatus,
    CoRegistrationRequest,
    CoRegistrationResponse,
    calculate_phase_correlation_shift,
    ElevationModelType,
    PointCloudFormat,
    PointClassificationCode,
    PointFilterParameters,
    PointFilterRequest,
    PointFilterResponse,
    CHMAnalysisRequest,
    CHMAnalysisResponse,
    calculate_canopy_height_model,
    build_chm_tile_url,
    SeamlineAlgorithm,
    RadiometricBlendingMode,
    OcclusionMaskRequest,
    OcclusionMaskResponse,
    SeamlineOptimizationRequest,
    SeamlineOptimizationResponse,
    calculate_seamline_energy,
    build_true_ortho_tile_url,
    BYOCStorageProvider,
    BYOCSyncStatus,
    BYOCBucketRegistrationRequest,
    BYOCBucketRegistrationResponse,
    BYOCCatalogItem,
    BYOCCatalogSyncResponse,
    build_byoc_tile_url,
    TrendSignificanceTier,
    TrendDirection,
    MannKendallAnalysisRequest,
    MannKendallAnalysisResponse,
    calculate_mann_kendall_trend,
    AtmosphericCorrectionModel,
    DOS1CorrectionRequest,
    DOS1CorrectionResponse,
    calculate_dos1_surface_reflectance,
    CVAMagnitudeTier,
    CVADirectionSector,
    CVAAnalysisRequest,
    CVAAnalysisResponse,
    calculate_change_vector,
    build_cva_tile_url,
    SalinityIndexType,
    SalinityHazardTier,
    SoilSalinityAnalysisRequest,
    SoilSalinityAnalysisResponse,
    calculate_salinity_indices,
    classify_salinity_hazard,
    build_salinity_tile_url,
    ThermalHotspotConfidence,
    ThermalHotspotPoint,
    ThermalHotspotRequest,
    ThermalHotspotResponse,
    calculate_fire_radiative_power,
    detect_thermal_hotspots,
    build_thermal_hotspot_tile_url,
    InundationHazardTier,
    DamBreachFailureMode,
    DamBreachPoint,
    DamBreachAnalysisRequest,
    DamBreachAnalysisResponse,
    calculate_dam_breach_inundation,
    build_flood_inundation_tile_url,
    LandslideSusceptibilityTier,
    LandslideTriggerType,
    LandslideSusceptibilityRequest,
    LandslideSusceptibilityResponse,
    calculate_landslide_susceptibility,
    build_landslide_tile_url,
    DroughtSeverityTier,
    DroughtAnalysisRequest,
    DroughtAnalysisResponse,
    calculate_vegetation_health_index,
    classify_drought_tier,
    build_drought_vhi_tile_url,
    MineralEndmemberType,
    MINERAL_ENDMEMBER_LIBRARY,
    SAMAnalysisRequest,
    SAMAnalysisResponse,
    calculate_spectral_angle_mapper,
    get_mineral_endmember_spec,
    build_sam_mineral_tile_url,
    GeospatialSerializationFormat,
    VectorExportRequest,
    VectorExportResponse,
    VectorTileRequest,
    build_vector_tile_url,
    format_vector_export_filename
)
from app.config import settings

class TestGIOSCoreSchemas(unittest.TestCase):

    def test_enums(self):
        """Verify all essential enum values are properly defined."""
        # Spectral indices
        self.assertEqual(SpectralIndex.NDVI.value, "ndvi")
        self.assertEqual(SpectralIndex.NDMI.value, "ndmi")
        self.assertEqual(SpectralIndex.NDCI.value, "ndci")
        self.assertEqual(SpectralIndex.MNDWI.value, "mndwi")
        self.assertEqual(SpectralIndex.LST.value, "lst")
        self.assertEqual(SpectralIndex.NBR.value, "nbr")
        self.assertEqual(SpectralIndex.EVI.value, "evi")
        self.assertEqual(SpectralIndex.SAVI.value, "savi")
        self.assertEqual(SpectralIndex.RGB.value, "rgb")
        self.assertEqual(SpectralIndex.DNBR.value, "dnbr")
        self.assertEqual(SpectralIndex.RDNBR.value, "rdnbr")

        # Satellite collections
        self.assertEqual(SatelliteCollection.SENTINEL_2.value, "sentinel-2-l2a")
        self.assertEqual(SatelliteCollection.LANDSAT_C2_L2.value, "landsat-c2-l2")
        self.assertEqual(SatelliteCollection.DRONE_ORTHO.value, "drone-ortho")

        # Colormaps
        self.assertIn("spectral", [c.value for c in TileColormap])
        self.assertIn("viridis", [c.value for c in TileColormap])
        self.assertIn("turbo", [c.value for c in TileColormap])
        self.assertIn("magma", [c.value for c in TileColormap])

    def test_contract_1_dynamic_tile_params(self):
        """Verify Contract 1 dynamic XYZ tile parameters."""
        params = DynamicTileParams(
            collection="sentinel-2-l2a",
            item_id="S2A_MSIL2A_20260820T184211",
            z=13,
            x=1310,
            y=3165,
            index=SpectralIndex.NDMI,
            rescale="-0.2,0.6",
            colormap=TileColormap.SPECTRAL,
            pre="2025-08-15",
            post="2026-08-20"
        )
        self.assertEqual(params.z, 13)
        self.assertEqual(params.index, SpectralIndex.NDMI)
        self.assertEqual(params.colormap, TileColormap.SPECTRAL)
        self.assertEqual(params.pre, "2025-08-15")
        self.assertEqual(params.post, "2026-08-20")

    def test_contract_2_burn_severity_models(self):
        """Verify Contract 2 USGS FIREMON pre/post differenced burn severity models."""
        req_data = {
            "aoi_id": "TAILINGS-04",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-121.5, 39.5], [-121.4, 39.5], [-121.4, 39.6], [-121.5, 39.6], [-121.5, 39.5]]]
            },
            "pre_event_date": "2025-08-15",
            "post_event_date": "2026-08-20"
        }
        req = BurnSeverityRequest(**req_data)
        self.assertEqual(req.aoi_id, "TAILINGS-04")
        self.assertEqual(req.pre_event_date, "2025-08-15")

        resp_data = {
            "aoi_id": "TAILINGS-04",
            "pre_event_date": "2025-08-15",
            "post_event_date": "2026-08-20",
            "mean_dnbr": 0.482,
            "mean_rdnbr": 0.612,
            "burned_area_hectares": 1420.5,
            "categories": [
                { "category": "High Severity", "min_dnbr": 0.660, "percentage": 28.4, "hectares": 403.4 },
                { "category": "Moderate-High Severity", "min_dnbr": 0.440, "percentage": 34.1, "hectares": 484.4 },
                { "category": "Moderate-Low Severity", "min_dnbr": 0.270, "percentage": 22.0, "hectares": 312.5 },
                { "category": "Low Severity", "min_dnbr": 0.100, "percentage": 11.2, "hectares": 159.1 },
                { "category": "Unburned / Low Change", "min_dnbr": -0.100, "percentage": 4.3, "hectares": 61.1 }
            ],
            "tile_url_template": "/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png?pre=2025-08-15&post=2026-08-20"
        }
        resp = BurnSeverityResponse(**resp_data)
        self.assertEqual(resp.mean_dnbr, 0.482)
        self.assertEqual(len(resp.categories), 5)
        self.assertEqual(resp.categories[0].category, "High Severity")

    def test_contract_3_pixel_probe_models(self):
        """Verify Contract 3 interactive pixel probe models."""
        probe_resp_data = {
            "coordinates": { "latitude": 39.521, "longitude": -121.482 },
            "acquisition_date": "2026-08-20T18:42:11Z",
            "surface_reflectance": {
                "blue": 0.038,
                "green": 0.052,
                "red": 0.041,
                "rededge1": 0.098,
                "nir": 0.320,
                "swir1": 0.142,
                "swir2": 0.081
            },
            "indices": {
                "ndvi": 0.773,
                "ndmi": 0.385,
                "mndwi": -0.464,
                "ndci": 0.410
            },
            "climatological_context": {
                "historical_august_median_ndmi": 0.210,
                "seasonal_z_score": 2.84,
                "anomaly_flag": "HIGH_MOISTURE_ANOMALY"
            }
        }
        probe = PixelProbeResponse(**probe_resp_data)
        self.assertEqual(probe.indices["ndvi"], 0.773)
        self.assertEqual(probe.surface_reflectance["nir"], 0.320)
        self.assertAlmostEqual(probe.climatological_context.seasonal_z_score, 2.84)

    def test_contract_4_zonal_stats_models(self):
        """Verify Contract 4 real polygon zonal statistics models."""
        req_data = {
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-121.49, 39.51], [-121.47, 39.51], [-121.47, 39.53], [-121.49, 39.53], [-121.49, 39.51]]]
            },
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_MSIL2A_20260820",
            "index": "ndmi"
        }
        req = ZonalStatsRealRequest(**req_data)
        self.assertEqual(req.index, SpectralIndex.NDMI)

        resp_data = {
            "index": "ndmi",
            "area_hectares": 384.2,
            "valid_pixels": 38420,
            "cloud_covered_pixels": 0,
            "statistics": {
                "mean": 0.312,
                "median": 0.298,
                "std_dev": 0.084,
                "min": 0.051,
                "max": 0.684,
                "percentile_10": 0.182,
                "percentile_90": 0.441
            },
            "histogram": {
                "bin_edges": [-0.2, -0.1, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
                "counts": [0, 0, 210, 1420, 8900, 16400, 8500, 2800, 190]
            }
        }
        resp = ZonalStatsRealResponse(**resp_data)
        self.assertEqual(resp.area_hectares, 384.2)
        self.assertEqual(resp.statistics.median, 0.298)
        self.assertEqual(len(resp.histogram.counts), 9)

    def test_drone_orthomosaic_metadata(self):
        """Verify drone orthomosaic ingestion and GSD metadata schema."""
        ortho_data = {
            "ortho_id": "ORTHO-SLD-202609-01",
            "filename": "san_luis_dam_crest_ortho_cm.tif",
            "crs": "EPSG:3857",
            "bounds": [-121.082, 37.054, -121.066, 37.062],
            "metric_gsd_cm": 2.85,
            "bands": 4,
            "is_cog": True,
            "status": "READY"
        }
        meta = DroneOrthomosaicMetadata(**ortho_data)
        self.assertEqual(meta.ortho_id, "ORTHO-SLD-202609-01")
        self.assertEqual(meta.metric_gsd_cm, 2.85)
        self.assertTrue(meta.is_cog)

    def test_timeseries_and_climatology_models(self):
        """Verify timeseries points with seasonal baseline envelopes."""
        point = TimeSeriesPoint(
            date="2026-08-20",
            value=0.52,
            baseline_median=0.28,
            baseline_mad=0.07,
            percentile_10=0.18,
            percentile_90=0.38,
            z_score=2.91,
            is_anomaly=True
        )
        self.assertTrue(point.is_anomaly)
        self.assertEqual(point.baseline_mad, 0.07)

        resp = TimeSeriesResponse(
            index="ndmi",
            slope_per_month=0.015,
            theil_sen_slope=0.0142,
            mann_kendall_p_value=0.003,
            anomaly_count=1,
            data_points=[point]
        )
        self.assertEqual(resp.theil_sen_slope, 0.0142)

    def test_alerting_models(self):
        """Verify automated alert records and webhook payloads."""
        alert = AlertRecord(
            id="ALT-20260915-01",
            site_id="11262900",
            site_name="San Luis Dam",
            metric="NDMI",
            severity=AlertSeverity.CRITICAL,
            z_score=2.84,
            message="Critical subsurface moisture anomaly along downstream toe.",
            timestamp="2026-09-15T20:20:00Z",
            status="active"
        )
        self.assertEqual(alert.severity, AlertSeverity.CRITICAL)

        payload = AlertWebhookPayload(
            event_type="hazard_anomaly_alert",
            alert=alert,
            sent_at="2026-09-15T20:20:01Z"
        )
        self.assertEqual(payload.alert.id, "ALT-20260915-01")

        # Verify proactive SSE streaming alert models
        self.assertEqual(ProactiveAlertType.JARVIS.value, "jarvis_proactive_alert")
        self.assertEqual(ProactiveAlertType.SATELLITE.value, "satellite_anomaly_alert")

        jarvis_alert = ProactiveJarvisAlert(
            message="URGENT: Discharge threshold breached at San Luis Creek.",
            site="San Luis Dam",
            data={"discharge_cfs": 2450.0}
        )
        self.assertEqual(jarvis_alert.type, ProactiveAlertType.JARVIS)
        self.assertEqual(jarvis_alert.type, "jarvis_proactive_alert")
        self.assertEqual(jarvis_alert.site, "San Luis Dam")

        sat_alert = SatelliteAnomalyAlert(data=alert)
        self.assertEqual(sat_alert.type, ProactiveAlertType.SATELLITE)
        self.assertEqual(sat_alert.type, "satellite_anomaly_alert")
        self.assertEqual(sat_alert.data.metric, "NDMI")

    def test_settings_config(self):
        """Verify settings loaded with modern Pydantic SettingsConfigDict and paths."""
        self.assertEqual(settings.app_version, "2.5.0")
        self.assertTrue(settings.tile_cache_dir.endswith("tiles"))
        self.assertTrue(settings.drone_upload_dir.endswith("drone_orthos"))
        self.assertEqual(settings.default_colormap, "spectral")

    def test_satellite_and_insitu_models(self):
        """Verify USGS station, GEE, and Sentinel Hub request/response models."""
        usgs = USGSStationData(
            site_id="11270900",
            discharge_cfs=1420.5,
            gage_height_ft=14.82,
            water_temp_c=17.5
        )
        self.assertEqual(usgs.site_id, "11270900")
        self.assertEqual(usgs.discharge_cfs, 1420.5)

        gee_req = GEEImageRequest(
            collection="COPERNICUS/S2_SR",
            start_date="2023-01-01",
            end_date="2023-01-31",
            bbox=(-121.2, 36.95, -120.95, 37.15)
        )
        self.assertEqual(gee_req.collection, "COPERNICUS/S2_SR")

        gee_resp = GEEImageResponse(
            provider="GEE",
            collection="COPERNICUS/S2_SR",
            time_range={"start": "2023-01-01", "end": "2023-01-31"},
            bbox=(-121.2, 36.95, -120.95, 37.15),
            preview_url="https://earthengine.googleapis.com/preview"
        )
        self.assertEqual(gee_resp.provider, "GEE")

        sh_req = SentinelHubTileRequest(
            collection="sentinel-2-l2a",
            date="2023-01-15",
            bbox=(-121.2, 36.95, -120.95, 37.15),
            zoom=12
        )
        self.assertEqual(sh_req.zoom, 12)

        sh_resp = SentinelHubTileResponse(
            provider="SentinelHub",
            collection="sentinel-2-l2a",
            date="2023-01-15",
            bbox=(-121.2, 36.95, -120.95, 37.15),
            tile_url="https://services.sentinel-hub.com/ogc/wmts/test"
        )
        self.assertEqual(sh_resp.provider, "SentinelHub")

    def test_spatial_buffer_models(self):
        """Verify spatial buffer request and response models."""
        buf_req = SpatialBufferRequest(
            distance_km=1.5,
            lat=37.0582,
            lng=-121.0744
        )
        self.assertEqual(buf_req.distance_km, 1.5)

        buf_resp = SpatialBufferResponse(
            status="success",
            operation="spatial_buffer",
            buffer_radius_km=1.5,
            area_sq_km=7.07,
            area_hectares=707.0,
            geojson={
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"name": "Spatial Buffer (1.5 km)"},
                        "geometry": {"type": "Polygon", "coordinates": []}
                    }
                ]
            }
        )
        self.assertEqual(buf_resp.status, "success")
        self.assertEqual(buf_resp.area_hectares, 707.0)

    def test_drone_status_enum(self):
        """Verify DroneStatus lifecycle enum values."""
        self.assertEqual(DroneStatus.READY.value, "READY")
        self.assertEqual(DroneStatus.PROCESSING.value, "PROCESSING")
        self.assertEqual(DroneStatus.FAILED.value, "FAILED")

    def test_agent_chat_models(self):
        """Verify Agentic AI chat, tool action, map action, and response models."""
        msg = AgentChatMessage(role="user", content="Analyze San Luis Dam")
        self.assertEqual(msg.role, "user")
        
        req = AgentChatRequest(message="Hello", history=[msg], event_id="EVT-01")
        self.assertEqual(req.message, "Hello")
        self.assertEqual(len(req.history), 1)

        map_act = MapAction(action="MARK", lat=37.058, lng=-121.074, zoom=15, label="Target Dam")
        self.assertEqual(map_act.action, "MARK")
        self.assertEqual(map_act.zoom, 15)

        nav_act = NavigationAction(target_path="/analytics", reason="User requested index charts", auto_switch=True)
        self.assertEqual(nav_act.target_path, "/analytics")
        self.assertTrue(nav_act.auto_switch)

        tool_act = AgentToolAction(tool="query_hazard", args={"id": "EVT-01"}, output={"status": "critical"})
        self.assertEqual(tool_act.tool, "query_hazard")

        resp = AgentChatResponse(
            response="Hello, my name is JARVIS",
            tool_calls=[tool_act],
            map_action=map_act,
            navigation=nav_act,
            memory_updates=["User inspected San Luis Dam"],
            suggested_prompts=["Calculate NDMI", "Inspect downstream toe"],
            thinking="Analyzing geotechnical telemetry."
        )
        self.assertTrue(resp.response.startswith("Hello, my name is JARVIS"))
        self.assertEqual(resp.navigation.target_path, "/analytics")
        self.assertEqual(len(resp.tool_calls), 1)

    def test_event_create_models(self):
        """Verify Hazard Event creation request model."""
        evt_req = EventCreateRequest(
            id="EVT-TEST-01",
            title="San Luis Seepage Anomaly",
            subtitle="Embankment Toe Saturation",
            category=HazardCategory.SEEPAGE,
            severity=HazardSeverity.CRITICAL,
            severity_label="CRITICAL",
            lat=37.058,
            lng=-121.074,
            zoom=14,
            metric=SpectralIndex.NDMI,
            sensor=SatelliteCollection.SENTINEL_2,
            start_date="2026-08-01",
            end_date="2026-08-30",
            impact_area="12.4 ha",
            peak_zscore="+2.84",
            hazard_type="Seepage",
            drone_status="READY",
            description="Subsurface piping risk along toe."
        )
        self.assertEqual(evt_req.category, HazardCategory.SEEPAGE)
        self.assertEqual(evt_req.severity, HazardSeverity.CRITICAL)
        self.assertEqual(evt_req.metric, SpectralIndex.NDMI)

    def test_burn_severity_api_request_compatibility(self):
        """Verify BurnSeverityApiRequest and BurnSeverityRequest alias with paired NBR values."""
        req = BurnSeverityApiRequest(
            aoi_id="AOI-TEST",
            post_event_date="2026-08-20",
            nbr_pre=0.55,
            nbr_post=0.15
        )
        self.assertEqual(req.aoi_id, "AOI-TEST")
        self.assertEqual(req.nbr_pre, 0.55)
        self.assertEqual(req.nbr_post, 0.15)

    def test_drone_flight_and_registration_requests(self):
        """Verify DroneRegisterRequest and DroneScheduleMissionRequest schemas."""
        reg_req = DroneRegisterRequest(
            file_path="data/drone_orthos/san_luis_dam.tif",
            mission_name="San Luis Ortho Survey",
            sensor_payload="RGB + Multispectral RedEdge",
            ortho_id="ORTHO-001"
        )
        self.assertEqual(reg_req.ortho_id, "ORTHO-001")
        self.assertEqual(reg_req.mission_name, "San Luis Ortho Survey")

        sched_req = DroneScheduleMissionRequest(
            event_id="EVT-01",
            lat=37.058,
            lng=-121.074,
            radius_km=2.5
        )
        self.assertEqual(sched_req.event_id, "EVT-01")
        self.assertEqual(sched_req.radius_km, 2.5)

    def test_iot_sensor_data_schema(self):
        """Verify in-situ IoT sensor telemetry schema."""
        sensor = SensorData(
            sensor_id="PIEZOMETER-04",
            location_lat=37.0582,
            location_lon=-121.0744,
            soil_moisture_pct=31.8,
            temperature_c=22.4
        )
        self.assertEqual(sensor.sensor_id, "PIEZOMETER-04")
        self.assertEqual(sensor.soil_moisture_pct, 31.8)
        self.assertIsNotNone(sensor.timestamp)

    def test_auth_and_user_response_schemas(self):
        """Verify authentication TokenResponse, UserResponse, and UserRegisterResponse schemas."""
        login_req = UserLoginRequest(username="admin", password="secretpassword")
        self.assertEqual(login_req.username, "admin")
        self.assertEqual(login_req.password, "secretpassword")

        reg_req = UserRegisterRequest(username="new_operator", password="securepassword123", role="viewer")
        self.assertEqual(reg_req.username, "new_operator")
        self.assertEqual(reg_req.role, "viewer")

        token = TokenResponse(access_token="eyJhbGciOi...", token_type="bearer")
        self.assertEqual(token.token_type, "bearer")

        user = UserResponse(id=1, username="admin", role="admin", status="authenticated")
        self.assertEqual(user.username, "admin")
        self.assertEqual(user.role, "admin")

        reg_resp = UserRegisterResponse(msg="User created successfully", username="operator1")
        self.assertEqual(reg_resp.username, "operator1")

    def test_report_pdf_params_schema(self):
        """Verify ReportPdfParams schema for environmental compliance reporting."""
        report = ReportPdfParams(
            bbox="-121.08,37.05,-121.06,37.065",
            index_type="ndmi"
        )
        self.assertEqual(report.index_type, "ndmi")
        self.assertIn("-121.08", report.bbox)

    def test_stac_search_and_scene_models(self):
        """Verify SearchParams, SceneMetadata, and SearchResponse STAC models."""
        params = SearchParams(
            bbox=(-121.5, 37.0, -121.0, 37.5),
            start_date="2026-08-01",
            end_date="2026-08-30",
            collection=SatelliteCollection.SENTINEL_2,
            max_cloud_cover=20.0
        )
        self.assertEqual(params.collection, SatelliteCollection.SENTINEL_2)
        self.assertEqual(params.max_cloud_cover, 20.0)

        scene = SceneMetadata(
            id="S2A_MSIL2A_20260820T184211",
            datetime="2026-08-20T18:42:11Z",
            cloud_cover=3.4,
            collection="sentinel-2-l2a",
            thumbnail_url="https://planetarycomputer.microsoft.com/thumb.png"
        )
        self.assertEqual(scene.id, "S2A_MSIL2A_20260820T184211")
        self.assertEqual(scene.cloud_cover, 3.4)

        search_resp = SearchResponse(count=1, scenes=[scene])
        self.assertEqual(search_resp.count, 1)
        self.assertEqual(len(search_resp.scenes), 1)

    def test_index_request_and_summary_models(self):
        """Verify IndexRequest and IndexResultSummary schemas."""
        idx_req = IndexRequest(
            bbox=(-121.2, 36.95, -120.95, 37.15),
            start_date="2026-08-01",
            end_date="2026-08-30",
            index=SpectralIndex.NDMI,
            collection=SatelliteCollection.SENTINEL_2,
            resolution=10.0
        )
        self.assertEqual(idx_req.index, SpectralIndex.NDMI)
        self.assertEqual(idx_req.resolution, 10.0)

        idx_summary = IndexResultSummary(
            index="ndmi",
            mean=0.312,
            median=0.298,
            min=0.051,
            max=0.684,
            std=0.084,
            valid_pixels=38420,
            timestamp="2026-08-20T18:42:11Z"
        )
        self.assertEqual(idx_summary.index, "ndmi")
        self.assertEqual(idx_summary.valid_pixels, 38420)
        self.assertEqual(idx_summary.median, 0.298)

    def test_health_and_event_response_models(self):
        """Verify HealthResponse and EventResponse schemas."""
        health = HealthResponse(
            status="healthy",
            version="2.5.0",
            active_services=["tiles", "stac", "drone"]
        )
        self.assertEqual(health.status, "healthy")
        self.assertEqual(health.version, "2.5.0")
        self.assertEqual(len(health.active_services), 3)

        evt_resp = EventResponse(
            events=[{"id": "EVT-01", "title": "San Luis Seepage"}],
            total_count=1
        )
        self.assertEqual(evt_resp.total_count, 1)

    def test_hazard_event_detail_model(self):
        """Verify HazardEventDetail validation and integration with EventResponse."""
        detail = HazardEventDetail(
            id="SEEPAGE-01",
            title="San Luis Dam Embankment",
            subtitle="Santa Nella, CA | Subsurface Seepage Anomaly",
            category=HazardCategory.SEEPAGE,
            severity=HazardSeverity.CRITICAL,
            severity_label="HIGH HAZARD",
            lat=37.0582,
            lng=-121.0744,
            zoom=14,
            metric=SpectralIndex.NDMI,
            sensor=SatelliteCollection.SENTINEL_2,
            start_date="2026-06-01",
            end_date="2026-08-30",
            usgs_station="11262900",
            station_name="USGS #11262900 (San Luis Creek)",
            impact_area="34.2 Hectares",
            peak_zscore="+2.84 σ",
            hazard_type="Subsurface Embankment Seepage",
            drone_status="Drone LiDAR & Multispec Recommended",
            description="Pore-pressure and moisture anomaly detected along downstream toe."
        )
        self.assertEqual(detail.id, "SEEPAGE-01")
        self.assertEqual(detail.category, HazardCategory.SEEPAGE)
        self.assertEqual(detail.severity, HazardSeverity.CRITICAL)

        resp = EventResponse(events=[detail], total_count=1)
        self.assertEqual(resp.total_count, 1)
        self.assertEqual(resp.events[0].id, "SEEPAGE-01")

        # Verify HazardEvent alias compatibility
        self.assertIs(HazardEvent, HazardEventDetail)
        aliased_event = HazardEvent(**detail.model_dump())
        self.assertEqual(aliased_event.id, "SEEPAGE-01")

    def test_firemon_thresholds_contract(self):
        """Verify USGS FIREMON standard thresholds and severity category ordering."""
        self.assertEqual(len(FIREMON_THRESHOLDS), 5)
        self.assertEqual(FIREMON_THRESHOLDS[0]["category"], "High Severity")
        self.assertEqual(FIREMON_THRESHOLDS[0]["min_dnbr"], 0.660)
        self.assertEqual(FIREMON_THRESHOLDS[1]["category"], "Moderate-High Severity")
        self.assertEqual(FIREMON_THRESHOLDS[1]["min_dnbr"], 0.440)
        self.assertEqual(FIREMON_THRESHOLDS[2]["category"], "Moderate-Low Severity")
        self.assertEqual(FIREMON_THRESHOLDS[2]["min_dnbr"], 0.270)
        self.assertEqual(FIREMON_THRESHOLDS[3]["category"], "Low Severity")
        self.assertEqual(FIREMON_THRESHOLDS[3]["min_dnbr"], 0.100)
        self.assertEqual(FIREMON_THRESHOLDS[4]["category"], "Unburned / Low Change")
        self.assertEqual(FIREMON_THRESHOLDS[4]["min_dnbr"], -0.100)

    def test_drone_response_models(self):
        """Verify DroneUploadResponse, DroneMissionScheduleResponse, and list responses."""
        ortho = DroneOrthomosaicMetadata(
            ortho_id="ORTHO-01",
            filename="ortho.tif",
            crs="EPSG:3857",
            bounds=(-121.1, 37.0, -121.0, 37.1),
            metric_gsd_cm=2.8,
            bands=3,
            is_cog=True,
            status="READY"
        )
        upload_resp = DroneUploadResponse(status="success", orthomosaic=ortho)
        self.assertEqual(upload_resp.status, "success")
        self.assertEqual(upload_resp.orthomosaic.metric_gsd_cm, 2.8)

        mission = DroneMissionResponse(mission_id="MSN-01", status="SCHEDULED")
        sched_resp = DroneMissionScheduleResponse(status="success", mission=mission)
        self.assertEqual(sched_resp.status, "success")
        self.assertEqual(sched_resp.mission.mission_id, "MSN-01")

        missions_list = DroneMissionsListResponse(missions=[mission])
        self.assertEqual(len(missions_list.missions), 1)

        orthos_list = DroneOrthomosaicsListResponse(orthomosaics=[ortho])
        self.assertEqual(len(orthos_list.orthomosaics), 1)

    def test_sensor_ingest_and_mock_alert_responses(self):
        """Verify SensorIngestResponse and MockAlertResponse schemas."""
        sensor_resp = SensorIngestResponse(status="success", message="Telemetry recorded")
        self.assertEqual(sensor_resp.status, "success")
        self.assertEqual(sensor_resp.message, "Telemetry recorded")

        mock_alert = MockAlertResponse(status="success", message="Dispatched")
        self.assertEqual(mock_alert.status, "success")
        self.assertEqual(mock_alert.message, "Dispatched")

    def test_health_response_flexibility(self):
        """Verify HealthResponse validates both basic and extended server health outputs."""
        health = HealthResponse(
            status="healthy",
            platform="GIOS - Geospatial Integrated Orthomosaic Systems",
            version="2.5.0",
            active_modules=["stac_acquisition", "indices", "timeseries", "usgs_nwis", "drone_cogs", "event_catalog"]
        )
        self.assertEqual(health.status, "healthy")
        self.assertEqual(health.version, "2.5.0")
        self.assertIn("stac_acquisition", health.active_modules)

    def test_geojson_feature_collection_schemas(self):
        """Verify GeoJSONFeature, GeoJSONFeatureCollection, and VectorLayerResponse models."""
        feature = GeoJSONFeature(
            type="Feature",
            properties={"name": "San Luis Pumping Plant", "status": "operational"},
            geometry={"type": "Point", "coordinates": [-121.06, 37.052]}
        )
        self.assertEqual(feature.type, "Feature")
        self.assertEqual(feature.properties["name"], "San Luis Pumping Plant")

        collection = GeoJSONFeatureCollection(
            type="FeatureCollection",
            features=[feature]
        )
        self.assertEqual(collection.type, "FeatureCollection")
        self.assertEqual(len(collection.features), 1)

        vector_layer = VectorLayerResponse(
            type="FeatureCollection",
            features=[feature]
        )
        self.assertEqual(vector_layer.type, "FeatureCollection")
        self.assertEqual(vector_layer.features[0].geometry["coordinates"], [-121.06, 37.052])

    def test_spectral_indices_metadata_contract(self):
        """Verify certified biophysical spectral index metadata models and catalog lookup."""
        self.assertEqual(len(SPECTRAL_INDICES_METADATA), 11)
        for idx in SpectralIndex:
            self.assertIn(idx.value, SPECTRAL_INDICES_METADATA)
            meta = SPECTRAL_INDICES_METADATA[idx.value]
            self.assertIsInstance(meta, SpectralIndexMetadata)
            self.assertEqual(meta.key, idx)
            self.assertTrue(len(meta.bands) > 0)
            self.assertTrue(len(meta.formula) > 0)

        # Test lookup helper with string and enum
        ndmi_meta = get_spectral_index_metadata("ndmi")
        self.assertIsNotNone(ndmi_meta)
        self.assertEqual(ndmi_meta.name, "NDMI")
        self.assertEqual(ndmi_meta.default_colormap, TileColormap.SPECTRAL)
        self.assertEqual(ndmi_meta.default_rescale, "-0.2,0.6")

        ndvi_meta = get_spectral_index_metadata(SpectralIndex.NDVI)
        self.assertIsNotNone(ndvi_meta)
        self.assertEqual(ndvi_meta.name, "NDVI")
        self.assertEqual(ndvi_meta.default_colormap, TileColormap.VIRIDIS)

        self.assertIsNone(get_spectral_index_metadata("non_existent_index"))

        # Test listing helper
        all_indices = list_spectral_indices()
        self.assertEqual(len(all_indices), 11)
        self.assertIn("ndmi", [m.key.value for m in all_indices])

    def test_colormaps_metadata_contract(self):
        """Verify dynamic tile server colormap palette metadata and catalog lookup."""
        self.assertEqual(len(COLORMAPS_METADATA), 8)
        for cm in TileColormap:
            self.assertIn(cm.value, COLORMAPS_METADATA)
            meta = COLORMAPS_METADATA[cm.value]
            self.assertIsInstance(meta, ColormapMetadata)
            self.assertEqual(meta.key, cm)
            self.assertTrue(len(meta.label) > 0)

        # Test lookup helper with string and enum
        spectral_meta = get_colormap_metadata("spectral")
        self.assertIsNotNone(spectral_meta)
        self.assertEqual(spectral_meta.key, TileColormap.SPECTRAL)

        viridis_meta = get_colormap_metadata(TileColormap.VIRIDIS)
        self.assertIsNotNone(viridis_meta)
        self.assertEqual(viridis_meta.key, TileColormap.VIRIDIS)

        self.assertIsNone(get_colormap_metadata("unknown_colormap"))

        # Test listing helper
        all_colormaps = list_colormaps()
        self.assertEqual(len(all_colormaps), 8)
        self.assertIn("spectral", [m.key.value for m in all_colormaps])

    def test_classify_dnbr_scalar_parity(self):
        """Verify scalar delta-NBR classifier parity across all USGS FIREMON thresholds."""
        import numpy as np
        self.assertEqual(classify_dnbr(0.750)["category"], "High Severity")
        self.assertEqual(classify_dnbr(0.660)["category"], "High Severity")
        self.assertEqual(classify_dnbr(0.500)["category"], "Moderate-High Severity")
        self.assertEqual(classify_dnbr(0.440)["category"], "Moderate-High Severity")
        self.assertEqual(classify_dnbr(0.350)["category"], "Moderate-Low Severity")
        self.assertEqual(classify_dnbr(0.270)["category"], "Moderate-Low Severity")
        self.assertEqual(classify_dnbr(0.180)["category"], "Low Severity")
        self.assertEqual(classify_dnbr(0.100)["category"], "Low Severity")
        self.assertEqual(classify_dnbr(0.050)["category"], "Unburned / Low Change")
        self.assertEqual(classify_dnbr(-0.150)["category"], "Unburned / Low Change")
        self.assertEqual(classify_dnbr(None)["category"], "Unburned / Low Change")
        self.assertEqual(classify_dnbr(float("nan"))["category"], "Unburned / Low Change")
        self.assertEqual(classify_dnbr(float("inf"))["category"], "Unburned / Low Change")
        # Parity with numpy scalars and strings
        self.assertEqual(classify_dnbr(np.float32(0.50))["category"], "Moderate-High Severity")
        self.assertEqual(classify_dnbr(np.float64(0.70))["category"], "High Severity")
        self.assertEqual(classify_dnbr("0.35")["category"], "Moderate-Low Severity")
        self.assertEqual(classify_dnbr("invalid")["category"], "Unburned / Low Change")

    def test_parse_rescale_utility(self):
        """Verify parse_rescale utility correctly parses min,max ranges with robust fallback."""
        self.assertEqual(parse_rescale("-0.2,0.6"), (-0.2, 0.6))
        self.assertEqual(parse_rescale(" 10.0 , 45.0 "), (10.0, 45.0))
        self.assertEqual(parse_rescale("0,255"), (0.0, 255.0))
        self.assertEqual(parse_rescale("invalid"), (-1.0, 1.0))
        self.assertEqual(parse_rescale(""), (-1.0, 1.0))
        self.assertEqual(parse_rescale(None), (-1.0, 1.0))
        self.assertEqual(parse_rescale("0.5"), (-1.0, 1.0))
        self.assertEqual(parse_rescale("nan,0.5"), (-1.0, 1.0))
        self.assertEqual(parse_rescale(None, default=(0.0, 1.0)), (0.0, 1.0))

    def test_dynamic_tile_params_helper_methods(self):
        """Verify DynamicTileParams get_rescale_bounds and get_colormap_name helpers."""
        # Explicit rescale and colormap
        p1 = DynamicTileParams(
            collection="sentinel-2-l2a",
            item_id="S2A_123",
            z=12, x=100, y=200,
            index=SpectralIndex.NDMI,
            rescale="-0.1,0.5",
            colormap=TileColormap.SPECTRAL
        )
        self.assertEqual(p1.get_rescale_bounds(), (-0.1, 0.5))
        self.assertEqual(p1.get_colormap_name(), "spectral")

        # Default rescale derived from index metadata (NDMI -> -0.2, 0.6)
        p2 = DynamicTileParams(
            collection="sentinel-2-l2a",
            item_id="S2A_123",
            z=12, x=100, y=200,
            index=SpectralIndex.NDMI
        )
        self.assertEqual(p2.get_rescale_bounds(), (-0.2, 0.6))
        self.assertEqual(p2.get_colormap_name(), "spectral")

        # RGB defaults
        p3 = DynamicTileParams(
            collection="sentinel-2-l2a",
            item_id="S2A_123",
            z=12, x=100, y=200,
            index=SpectralIndex.RGB,
            colormap=None
        )
        self.assertEqual(p3.get_rescale_bounds(), (0, 255))
        self.assertEqual(p3.get_colormap_name(), "spectral")

    def test_satellite_collections_metadata_contract(self):
        """Verify satellite and aerial imagery collection metadata and catalog lookup."""
        self.assertEqual(len(SATELLITE_COLLECTIONS_METADATA), 5)
        for col_id in ["sentinel-2-l2a", "landsat-c2-l2", "drone-ortho", "sentinel-1-rtc", "cop-dem-glo-30"]:
            self.assertIn(col_id, SATELLITE_COLLECTIONS_METADATA)
            meta = SATELLITE_COLLECTIONS_METADATA[col_id]
            self.assertIsInstance(meta, SatelliteCollectionMetadata)
            self.assertTrue(meta.resolution_m > 0)
            self.assertTrue(len(meta.label) > 0)

        # Lookup helper
        s2_meta = get_satellite_collection_metadata("sentinel-2-l2a")
        self.assertIsNotNone(s2_meta)
        self.assertEqual(s2_meta.id, SatelliteCollection.SENTINEL_2)
        self.assertEqual(s2_meta.resolution_m, 10.0)

        landsat_meta = get_satellite_collection_metadata(SatelliteCollection.LANDSAT_C2_L2)
        self.assertIsNotNone(landsat_meta)
        self.assertEqual(landsat_meta.resolution_m, 30.0)

        s1_meta = get_satellite_collection_metadata(SatelliteCollection.SENTINEL_1_RTC)
        self.assertIsNotNone(s1_meta)
        self.assertEqual(s1_meta.resolution_m, 10.0)

        dem_meta = get_satellite_collection_metadata(SatelliteCollection.COP_DEM)
        self.assertIsNotNone(dem_meta)
        self.assertEqual(dem_meta.resolution_m, 30.0)

        self.assertIsNone(get_satellite_collection_metadata("non_existent_collection"))

        # Listing helper
        all_collections = list_satellite_collections()
        self.assertEqual(len(all_collections), 5)
        self.assertIn("sentinel-2-l2a", [c.id.value for c in all_collections])
        self.assertIn("sentinel-1-rtc", [c.id.value for c in all_collections])
        self.assertIn("cop-dem-glo-30", [c.id.value for c in all_collections])

    def test_api_route_contracts_coverage(self):
        """Verify canonical API route contracts dictionary matches required system routes."""
        self.assertIn("health", API_ROUTE_CONTRACTS)
        self.assertIn("tiles_dynamic", API_ROUTE_CONTRACTS)
        self.assertIn("wildfire_burn_severity", API_ROUTE_CONTRACTS)
        self.assertIn("wildfire_dnbr_tile", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_pixel_probe", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_zonal_stats", API_ROUTE_CONTRACTS)
        self.assertIn("drone_missions", API_ROUTE_CONTRACTS)
        self.assertIn("agent_chat", API_ROUTE_CONTRACTS)
        self.assertIn("spatial_buffer", API_ROUTE_CONTRACTS)
        self.assertIn("reports_pdf", API_ROUTE_CONTRACTS)

    def test_parse_rescale_enhanced_sequence_inputs(self):
        """Verify parse_rescale accepts list, tuple, and formatted string inputs."""
        self.assertEqual(parse_rescale([-0.2, 0.6]), (-0.2, 0.6))
        self.assertEqual(parse_rescale((-0.5, 1.5)), (-0.5, 1.5))
        self.assertEqual(parse_rescale(["0.1", "0.9"]), (0.1, 0.9))
        self.assertEqual(parse_rescale([10]), (-1.0, 1.0))
        self.assertEqual(parse_rescale([10, 20, 30]), (-1.0, 1.0))
        self.assertEqual(parse_rescale([float("nan"), 0.5]), (-1.0, 1.0))

    def test_format_api_route_helper(self):
        """Verify format_api_route dynamically substitutes route parameters."""
        evt_url = format_api_route("event_detail", event_id="EVT-01")
        self.assertEqual(evt_url, "/api/v1/events/EVT-01")

        tile_url = format_api_route("tiles_dynamic", collection="sentinel-2-l2a", item_id="S2A_123", z=12, x=100, y=200)
        self.assertEqual(tile_url, "/api/v1/tiles/sentinel-2-l2a/S2A_123/12/100/200.png")

        usgs_url = format_api_route("integration_usgs", site_id="11262900")
        self.assertEqual(usgs_url, "/api/v1/integration/usgs/11262900")

        with self.assertRaises(KeyError):
            format_api_route("unknown_route_key")

    def test_validate_spectral_index_and_colormap(self):
        """Verify validation and normalization of spectral indices and colormaps."""
        self.assertEqual(validate_spectral_index("ndmi"), SpectralIndex.NDMI)
        self.assertEqual(validate_spectral_index("NDVI"), SpectralIndex.NDVI)
        self.assertEqual(validate_spectral_index(SpectralIndex.LST), SpectralIndex.LST)
        self.assertEqual(validate_spectral_index("invalid_index"), SpectralIndex.RGB)
        self.assertEqual(validate_spectral_index(None, default=SpectralIndex.NDMI), SpectralIndex.NDMI)

        self.assertEqual(validate_colormap("spectral"), TileColormap.SPECTRAL)
        self.assertEqual(validate_colormap("VIRIDIS"), TileColormap.VIRIDIS)
        self.assertEqual(validate_colormap(TileColormap.TURBO), TileColormap.TURBO)
        self.assertEqual(validate_colormap("invalid_palette"), TileColormap.SPECTRAL)
        self.assertEqual(validate_colormap(None, default=TileColormap.MAGMA), TileColormap.MAGMA)

    def test_dynamic_tile_params_url_builders(self):
        """Verify DynamicTileParams to_query_params and build_tile_url methods."""
        p = DynamicTileParams(
            collection="sentinel-2-l2a",
            item_id="S2A_123",
            z=12, x=100, y=200,
            index=SpectralIndex.NDMI,
            rescale="-0.2,0.6",
            colormap=TileColormap.SPECTRAL
        )
        qp = p.to_query_params()
        self.assertEqual(qp["index"], "ndmi")
        self.assertEqual(qp["rescale"], "-0.2,0.6")
        self.assertEqual(qp["colormap"], "spectral")

        url = p.build_tile_url()
        self.assertTrue(url.startswith("/api/v1/tiles/sentinel-2-l2a/S2A_123/12/100/200.png?"))
        self.assertIn("index=ndmi", url)
        self.assertIn("rescale=-0.2%2C0.6", url)
        self.assertIn("colormap=spectral", url)

    def test_burn_severity_response_tile_url_template_builder(self):
        """Verify BurnSeverityResponse.build_tile_url_template helper."""
        tmpl = BurnSeverityResponse.build_tile_url_template(pre_date="2025-08-15", post_date="2026-08-20")
        self.assertEqual(tmpl, "/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png?pre=2025-08-15&post=2026-08-20")

        tmpl_no_pre = BurnSeverityResponse.build_tile_url_template(post_date="2026-08-20")
        self.assertEqual(tmpl_no_pre, "/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png?post=2026-08-20")

        tmpl_bare = BurnSeverityResponse.build_tile_url_template()
        self.assertEqual(tmpl_bare, "/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png")

    def test_pixel_coordinates_lat_lng_properties(self):
        """Verify PixelCoordinates lat and lng convenience properties."""
        coords = PixelCoordinates(latitude=37.0582, longitude=-121.0744)
        self.assertEqual(coords.lat, 37.0582)
        self.assertEqual(coords.lng, -121.0744)

    def test_zonal_stats_pixel_properties(self):
        """Verify ZonalStatsRealResponse total_pixels and cloud_fraction properties."""
        resp = ZonalStatsRealResponse(
            index="ndmi",
            area_hectares=100.0,
            valid_pixels=800,
            cloud_covered_pixels=200,
            statistics=ZonalDistributionStats(
                mean=0.35, median=0.34, std_dev=0.05, min=0.1, max=0.6,
                percentile_10=0.2, percentile_90=0.5
            ),
            histogram=ZonalHistogram(bin_edges=[0.0, 0.5, 1.0], counts=[400, 400])
        )
        self.assertEqual(resp.total_pixels, 1000)
        self.assertAlmostEqual(resp.cloud_fraction, 0.20, places=2)

    def test_drone_orthomosaic_contains_point(self):
        """Verify DroneOrthomosaicMetadata contains_point bounding box checker."""
        meta = DroneOrthomosaicMetadata(
            ortho_id="DRN-01",
            filename="drone.tif",
            crs="EPSG:4326",
            bounds=(-121.08, 37.05, -121.06, 37.07),
            metric_gsd_cm=2.85
        )
        self.assertTrue(meta.contains_point(37.06, -121.07))
        self.assertFalse(meta.contains_point(38.00, -121.07))
        self.assertFalse(meta.contains_point(37.06, -122.00))

    def test_firemon_thresholds_badge_classes(self):
        """Verify FIREMON_THRESHOLDS contains both badge_class and badgeClass."""
        for level in FIREMON_THRESHOLDS:
            self.assertIn("badge_class", level)
            self.assertIn("badgeClass", level)
            self.assertEqual(level["badge_class"], level["badgeClass"])

    def test_drone_status_lifecycle_expansion(self):
        """Verify DroneStatus enum covers complete lifecycle including SCHEDULED, COMPLETED, and PENDING."""
        self.assertEqual(DroneStatus.READY.value, "READY")
        self.assertEqual(DroneStatus.PROCESSING.value, "PROCESSING")
        self.assertEqual(DroneStatus.FAILED.value, "FAILED")
        self.assertEqual(DroneStatus.SCHEDULED.value, "SCHEDULED")
        self.assertEqual(DroneStatus.COMPLETED.value, "COMPLETED")
        self.assertEqual(DroneStatus.PENDING.value, "PENDING")

    def test_spectral_index_metadata_feature_flags(self):
        """Verify SpectralIndexMetadata feature flags (is_differenced, requires_thermal, requires_rededge)."""
        ndci = get_spectral_index_metadata("ndci")
        self.assertIsNotNone(ndci)
        self.assertTrue(ndci.requires_rededge)
        self.assertFalse(ndci.is_differenced)
        self.assertFalse(ndci.requires_thermal)

        lst = get_spectral_index_metadata("lst")
        self.assertIsNotNone(lst)
        self.assertTrue(lst.requires_thermal)
        self.assertFalse(lst.is_differenced)

        dnbr = get_spectral_index_metadata("dnbr")
        self.assertIsNotNone(dnbr)
        self.assertTrue(dnbr.is_differenced)

        rdnbr = get_spectral_index_metadata("rdnbr")
        self.assertIsNotNone(rdnbr)
        self.assertTrue(rdnbr.is_differenced)

        ndvi = get_spectral_index_metadata("ndvi")
        self.assertIsNotNone(ndvi)
        self.assertFalse(ndvi.is_differenced)
        self.assertFalse(ndvi.requires_thermal)
        self.assertFalse(ndvi.requires_rededge)

    def test_bounding_box_model_and_methods(self):
        """Verify BoundingBox model serialization, coordinates checking, and Leaflet bounds."""
        bbox = BoundingBox(min_lon=-121.2, min_lat=36.95, max_lon=-120.95, max_lat=37.15)
        self.assertEqual(bbox.to_tuple(), (-121.2, 36.95, -120.95, 37.15))
        self.assertEqual(bbox.to_str(), "-121.2,36.95,-120.95,37.15")
        self.assertEqual(bbox.to_leaflet_bounds(), [[36.95, -121.2], [37.15, -120.95]])
        self.assertTrue(bbox.contains_point(37.05, -121.07))
        self.assertFalse(bbox.contains_point(38.00, -121.07))

    def test_parse_bbox_utility(self):
        """Verify parse_bbox utility handles tuples, lists, strings, dicts, and fallback defaults."""
        self.assertEqual(parse_bbox([-121.2, 36.95, -120.95, 37.15]), (-121.2, 36.95, -120.95, 37.15))
        self.assertEqual(parse_bbox("-121.2,36.95,-120.95,37.15"), (-121.2, 36.95, -120.95, 37.15))
        self.assertEqual(
            parse_bbox({"min_lon": -121.2, "min_lat": 36.95, "max_lon": -120.95, "max_lat": 37.15}),
            (-121.2, 36.95, -120.95, 37.15)
        )
        self.assertEqual(
            parse_bbox({"west": -121.2, "south": 36.95, "east": -120.95, "north": 37.15}),
            (-121.2, 36.95, -120.95, 37.15)
        )
        bbox_obj = BoundingBox(min_lon=-121.2, min_lat=36.95, max_lon=-120.95, max_lat=37.15)
        self.assertEqual(parse_bbox(bbox_obj), (-121.2, 36.95, -120.95, 37.15))
        # Invalid inputs fallback to default
        self.assertEqual(parse_bbox(None, default=(0.0, 0.0, 1.0, 1.0)), (0.0, 0.0, 1.0, 1.0))
        self.assertEqual(parse_bbox("invalid_bbox", default=(0.0, 0.0, 1.0, 1.0)), (0.0, 0.0, 1.0, 1.0))
        self.assertEqual(parse_bbox([1.0, 2.0], default=(0.0, 0.0, 1.0, 1.0)), (0.0, 0.0, 1.0, 1.0))

    def test_api_error_response_model(self):
        """Verify ApiErrorResponse model defaults and serialization."""
        err = ApiErrorResponse(detail="Invalid coordinates provided", error_code="ERR_INVALID_COORDS", status_code=422)
        self.assertEqual(err.detail, "Invalid coordinates provided")
        self.assertEqual(err.error_code, "ERR_INVALID_COORDS")
        self.assertEqual(err.status_code, 422)
        self.assertIsNotNone(err.timestamp)

        # Default values
        err_def = ApiErrorResponse(detail="Server exception")
        self.assertEqual(err_def.status_code, 400)
        self.assertIsNone(err_def.error_code)

    def test_drone_orthomosaic_metadata_extensions(self):
        """Verify DroneOrthomosaicMetadata gsd_display and bbox properties."""
        meta = DroneOrthomosaicMetadata(
            ortho_id="DRN-02",
            filename="drone_highres.tif",
            crs="EPSG:4326",
            bounds=(-121.08, 37.05, -121.06, 37.07),
            metric_gsd_cm=2.85
        )
        self.assertEqual(meta.gsd_display, "2.85 cm/px")
        self.assertIsInstance(meta.bbox, BoundingBox)
        self.assertEqual(meta.bbox.min_lon, -121.08)
        self.assertEqual(meta.bbox.max_lat, 37.07)

    def test_dynamic_tile_params_classmethods(self):
        """Verify DynamicTileParams build_drone_tile_url and build_wildfire_tile_url classmethods."""
        drone_url = DynamicTileParams.build_drone_tile_url(ortho_id="DRN-01", z=18, x=500, y=600)
        self.assertEqual(drone_url, "/api/v1/drone/DRN-01/tiles/18/500/600.png")

        wf_url = DynamicTileParams.build_wildfire_tile_url(z=12, x=100, y=200, pre="2025-08-15", post="2026-08-20")
        self.assertIn("/api/v1/tiles/wildfire/dnbr/12/100/200.png?", wf_url)
        self.assertIn("pre=2025-08-15", wf_url)
        self.assertIn("post=2026-08-20", wf_url)
        self.assertIn("colormap=turbo", wf_url)
        self.assertIn("rescale=-0.2%2C0.8", wf_url)

    def test_auto_stretch_bounds_and_lookup(self):
        """Verify 2%-98% cumulative auto stretch bounds for spectral indices."""
        self.assertEqual(get_auto_stretch("ndmi"), (0.05, 0.45))
        self.assertEqual(get_auto_stretch(SpectralIndex.NDVI), (0.15, 0.85))
        self.assertEqual(get_auto_stretch("lst"), (12.0, 42.0))
        self.assertEqual(get_auto_stretch("dnbr"), (0.1, 0.66))
        self.assertEqual(get_auto_stretch("rdnbr"), (0.15, 1.2))
        self.assertEqual(get_auto_stretch(None, default=(-0.2, 0.6)), (-0.2, 0.6))
        self.assertEqual(get_auto_stretch("unknown_index", default=(-0.2, 0.6)), (-0.2, 0.6))

    def test_colormap_gradients_and_color_stops(self):
        """Verify colormap CSS gradient strings and hex color stop ramps."""
        grad = get_colormap_gradient("spectral")
        self.assertIn("from-blue-600", grad)
        stops = get_colormap_color_stops("spectral")
        self.assertEqual(len(stops), 5)
        self.assertTrue(all(s.startswith("#") for s in stops))

        viridis_grad = get_colormap_gradient(TileColormap.VIRIDIS)
        self.assertIn("from-purple-900", viridis_grad)
        viridis_stops = get_colormap_color_stops("viridis")
        self.assertEqual(len(viridis_stops), 5)

        # Fallback for unknown
        fallback_grad = get_colormap_gradient("unknown_cmap")
        self.assertIn("from-blue-600", fallback_grad)

    def test_climatological_anomaly_z_score_classification(self):
        """Verify climatological seasonal z-score anomaly tiering and metadata."""
        # Critical anomaly |z| >= 2.5
        crit = classify_z_score(2.84)
        self.assertEqual(crit["level"], "CRITICAL_ANOMALY")
        self.assertEqual(crit["severity"], "critical")
        self.assertTrue(crit["is_anomaly"])

        # Warning anomaly 2.0 <= |z| < 2.5 (negative z-score test)
        warn = classify_z_score(-2.15)
        self.assertEqual(warn["level"], "WARNING_ANOMALY")
        self.assertEqual(warn["severity"], "warning")
        self.assertTrue(warn["is_anomaly"])

        # Moderate anomaly 1.5 <= |z| < 2.0
        mod = classify_z_score(1.72)
        self.assertEqual(mod["level"], "MODERATE_ANOMALY")
        self.assertEqual(mod["severity"], "moderate")
        self.assertFalse(mod["is_anomaly"])

        # Nominal |z| < 1.5
        nom = classify_z_score(0.45)
        self.assertEqual(nom["level"], "NOMINAL")
        self.assertEqual(nom["severity"], "nominal")
        self.assertFalse(nom["is_anomaly"])

        # Edge cases: None, NaN
        self.assertEqual(classify_z_score(None)["level"], "NOMINAL")
        self.assertEqual(classify_z_score(float("nan"))["level"], "NOMINAL")

    def test_tile_math_and_bounding_box_generation(self):
        """Verify Slippy map tile coordinate conversion and bounding box generation."""
        lat, lon, zoom = 37.0582, -121.0744, 13
        x, y = lat_lon_to_tile(lat, lon, zoom)
        self.assertIsInstance(x, int)
        self.assertIsInstance(y, int)
        self.assertGreater(x, 0)
        self.assertGreater(y, 0)

        # Tile to bounding box
        bbox = tile_to_bbox(zoom, x, y)
        self.assertIsInstance(bbox, BoundingBox)
        self.assertTrue(bbox.contains_point(lat, lon))
        self.assertLess(bbox.min_lon, bbox.max_lon)
        self.assertLess(bbox.min_lat, bbox.max_lat)

    def test_metric_gsd_flight_planning_calculation(self):
        """Verify metric GSD photogrammetry resolution calculation."""
        # 60m flight with 8.8mm lens, 13.2mm sensor, 5472px width
        gsd_60 = calculate_metric_gsd(altitude_m=60.0, focal_length_mm=8.8, sensor_width_mm=13.2, image_width_px=5472)
        self.assertAlmostEqual(gsd_60, 1.645, places=2)

        # 100m flight
        gsd_100 = calculate_metric_gsd(altitude_m=100.0, focal_length_mm=8.8, sensor_width_mm=13.2, image_width_px=5472)
        self.assertAlmostEqual(gsd_100, 2.741, places=2)

        # Invalid inputs return 0.0
        self.assertEqual(calculate_metric_gsd(altitude_m=0.0), 0.0)
        self.assertEqual(calculate_metric_gsd(altitude_m=-10.0), 0.0)

    def test_geojson_polygon_normalization(self):
        """Verify GeoJSON polygon validation and closed linear ring normalization."""
        # Open ring should be closed
        open_geom = {
            "type": "Polygon",
            "coordinates": [[[-121.5, 39.5], [-121.4, 39.5], [-121.4, 39.6], [-121.5, 39.6]]]
        }
        normalized = normalize_geojson_polygon(open_geom)
        self.assertIsNotNone(normalized)
        ring = normalized["coordinates"][0]
        self.assertEqual(ring[0], ring[-1])
        self.assertEqual(len(ring), 5)

        # Already closed ring
        closed_geom = {
            "type": "Polygon",
            "coordinates": [[[-121.5, 39.5], [-121.4, 39.5], [-121.4, 39.6], [-121.5, 39.6], [-121.5, 39.5]]]
        }
        norm_closed = normalize_geojson_polygon(closed_geom)
        self.assertEqual(len(norm_closed["coordinates"][0]), 5)

        # Invalid geometry returns None
        self.assertIsNone(normalize_geojson_polygon(None))
        self.assertIsNone(normalize_geojson_polygon({"type": "Point", "coordinates": [0, 0]}))
        self.assertIsNone(normalize_geojson_polygon({"type": "Polygon", "coordinates": []}))

    def test_geodesic_math_and_centroid(self):
        """Verify Haversine distance, initial bearing, and polygon centroid calculations."""
        # Haversine distance between San Luis Reservoir points
        lat1, lon1 = 37.0582, -121.0744
        lat2, lon2 = 37.0682, -121.0744  # ~1.11 km north
        dist_km = calculate_haversine_distance(lat1, lon1, lat2, lon2, unit="km")
        self.assertAlmostEqual(dist_km, 1.112, places=2)
        dist_m = calculate_haversine_distance(lat1, lon1, lat2, lon2, unit="m")
        self.assertAlmostEqual(dist_m, 1111.95, places=0)
        # Identical points
        self.assertEqual(calculate_haversine_distance(lat1, lon1, lat1, lon1), 0.0)

        # Initial bearing
        # Due north
        bearing_n = calculate_initial_bearing(lat1, lon1, lat2, lon1)
        self.assertAlmostEqual(bearing_n, 0.0, delta=1.0)
        # Due east
        bearing_e = calculate_initial_bearing(lat1, lon1, lat1, lon1 + 0.01)
        self.assertAlmostEqual(bearing_e, 90.0, delta=1.0)

        # Polygon centroid
        polygon_geom = {
            "type": "Polygon",
            "coordinates": [[
                [-121.1, 37.0],
                [-121.0, 37.0],
                [-121.0, 37.1],
                [-121.1, 37.1],
                [-121.1, 37.0]
            ]]
        }
        lat_c, lon_c = calculate_polygon_centroid(polygon_geom)
        self.assertAlmostEqual(lat_c, 37.05, places=2)
        self.assertAlmostEqual(lon_c, -121.05, places=2)

        # Fallback for invalid geometry
        self.assertEqual(calculate_polygon_centroid(None), (37.0582, -121.0744))
        self.assertEqual(calculate_polygon_centroid({}), (37.0582, -121.0744))

    def test_bounding_box_advanced_features(self):
        """Verify BoundingBox.from_points and BoundingBox.expand functionality."""
        points = [
            (37.05, -121.10),
            (37.15, -121.00),
            (37.10, -121.05)
        ]
        bbox = BoundingBox.from_points(points, coord_format="lat_lon")
        self.assertEqual(bbox.min_lat, 37.05)
        self.assertEqual(bbox.max_lat, 37.15)
        self.assertEqual(bbox.min_lon, -121.10)
        self.assertEqual(bbox.max_lon, -121.00)

        # Lon/lat format
        lon_lat_pts = [(-121.10, 37.05), (-121.00, 37.15)]
        bbox_ll = BoundingBox.from_points(lon_lat_pts, coord_format="lon_lat")
        self.assertEqual(bbox_ll.min_lon, -121.10)
        self.assertEqual(bbox_ll.max_lat, 37.15)

        # Expand bbox
        expanded = bbox.expand(buffer_pct=0.1)
        self.assertLess(expanded.min_lon, bbox.min_lon)
        self.assertGreater(expanded.max_lon, bbox.max_lon)
        self.assertLess(expanded.min_lat, bbox.min_lat)
        self.assertGreater(expanded.max_lat, bbox.max_lat)

        # Expansion width test
        w_orig = bbox.max_lon - bbox.min_lon
        w_exp = expanded.max_lon - expanded.min_lon
        self.assertAlmostEqual(w_exp, w_orig * 1.1, places=3)

    def test_multi_spectral_band_specs_catalog(self):
        """Verify BandSpecMetadata and physical sensor band catalog."""
        self.assertEqual(len(BAND_SPECS), 11)
        self.assertIn("b02", BAND_SPECS)
        self.assertIn("b05", BAND_SPECS)
        self.assertIn("b08", BAND_SPECS)
        self.assertIn("b10", BAND_SPECS)

        # Lookup helpers
        b5 = get_band_spec("B05")
        self.assertIsNotNone(b5)
        self.assertEqual(b5.key, "b05")
        self.assertEqual(b5.center_wavelength_nm, 705.0)
        self.assertEqual(b5.spectrum_domain, "Vegetation Red-Edge")

        # Unknown band
        self.assertIsNone(get_band_spec("unknown_band"))
        self.assertIsNone(get_band_spec(""))

        # List all
        all_specs = list_band_specs()
        self.assertEqual(len(all_specs), 11)

        # Wavelength lookup
        self.assertEqual(get_band_wavelength("b04"), 665.0)
        self.assertEqual(get_band_wavelength("b10"), 10895.0)
        self.assertEqual(get_band_wavelength("unknown", default=500.0), 500.0)

    def test_spatial_layer_types_and_metadata(self):
        """Verify SpatialLayerType enum, registry, and lookup helpers."""
        self.assertEqual(SpatialLayerType.CRITICAL_INFRASTRUCTURE.value, "critical_infrastructure")
        self.assertEqual(SpatialLayerType.SENSOR_GRID.value, "sensor_grid")
        self.assertEqual(SpatialLayerType.HAZARD_ZONES.value, "hazard_zones")
        self.assertEqual(SpatialLayerType.DRONE_FLIGHT_BOUNDS.value, "drone_flight_bounds")

        self.assertEqual(len(SPATIAL_LAYERS_METADATA), 4)

        # Lookup by string and enum
        meta_str = get_spatial_layer_metadata("critical_infrastructure")
        meta_enum = get_spatial_layer_metadata(SpatialLayerType.CRITICAL_INFRASTRUCTURE)
        self.assertIsNotNone(meta_str)
        self.assertIsNotNone(meta_enum)
        self.assertEqual(meta_str.layer_id, SpatialLayerType.CRITICAL_INFRASTRUCTURE)
        self.assertEqual(meta_str.icon, "ShieldAlert")

        # Unknown layer returns None
        self.assertIsNone(get_spatial_layer_metadata("unknown_layer"))

        # List layers
        layers = list_spatial_layer_types()
        self.assertEqual(len(layers), 4)

    def test_swipe_curtain_contracts_and_presets(self):
        """Verify SwipeComparisonMode, SwipePaneLayer, and SwipeCurtainConfig."""
        self.assertEqual(SwipeComparisonMode.OPTICAL_VS_ANOMALY.value, "optical_vs_anomaly")
        self.assertEqual(SwipeComparisonMode.PRE_VS_POST.value, "pre_vs_post")
        self.assertEqual(SwipeComparisonMode.SATELLITE_VS_DRONE.value, "satellite_vs_drone")
        self.assertEqual(SwipeComparisonMode.INDEX_VS_INDEX.value, "index_vs_index")

        left = SwipePaneLayer(
            title="Pre-Fire Optical Baseline",
            collection=SatelliteCollection.SENTINEL_2,
            date="2026-07-01",
            index=SpectralIndex.RGB
        )
        right = SwipePaneLayer(
            title="Post-Fire Burn Severity",
            collection=SatelliteCollection.SENTINEL_2,
            date="2026-08-20",
            index=SpectralIndex.DNBR,
            colormap=TileColormap.SPECTRAL
        )
        curtain = SwipeCurtainConfig(
            mode=SwipeComparisonMode.PRE_VS_POST,
            slider_pos=50.0,
            left_layer=left,
            right_layer=right
        )
        self.assertEqual(curtain.mode, SwipeComparisonMode.PRE_VS_POST)
        self.assertEqual(curtain.slider_pos, 50.0)
        self.assertEqual(curtain.left_layer.title, "Pre-Fire Optical Baseline")

        # Presets
        self.assertEqual(SWIPE_PRESET_RATIOS, [25, 50, 75])
        self.assertEqual(get_swipe_preset_ratios(), [25, 50, 75])

    def test_deterministic_tile_cache_key(self):
        """Verify deterministic tile cache key generation for backend caching and frontend prefetching."""
        key1 = generate_tile_cache_key(
            collection="sentinel-2-l2a",
            item_id="S2A_MSIL2A_20260820T184211",
            z=13,
            x=1310,
            y=3165,
            index="ndmi",
            rescale="-0.2,0.6",
            colormap="spectral"
        )
        key2 = generate_tile_cache_key(
            collection="SENTINEL-2-L2A",
            item_id="S2A_MSIL2A_20260820T184211",
            z="13",
            x="1310",
            y="3165",
            index="NDMI",
            rescale="-0.2,0.6",
            colormap="SPECTRAL"
        )
        # Identical parameters must produce identical cache keys
        self.assertEqual(key1, key2)
        self.assertIn("sentinel-2-l2a", key1)
        self.assertIn("z13_x1310_y3165", key1)
        self.assertIn("ndmi", key1)

        # Pre/post differencing keys
        diff_key = generate_tile_cache_key(
            collection="wildfire",
            item_id="burn-severity",
            z=12,
            x=1310,
            y=3165,
            index="dnbr",
            pre="2026-07-01",
            post="2026-08-20"
        )
        self.assertIn("pre_2026-07-01", diff_key)
        self.assertIn("post_2026-08-20", diff_key)

    def test_spectral_profile_formatting(self):
        """Verify format_spectral_profile sorts bands by physical wavelength and normalizes aliases."""
        raw_reflectance = {
            "blue": 0.038,
            "green": 0.052,
            "red": 0.041,
            "rededge1": 0.098,
            "nir": 0.320,
            "swir1": 0.142,
            "swir2": 0.081,
            "thermal": 0.210
        }
        profile = format_spectral_profile(raw_reflectance)
        self.assertEqual(len(profile), 8)
        self.assertTrue(all(isinstance(p, SpectralBandValue) for p in profile))
        # Strictly ascending wavelengths
        wavelengths = [p.wavelength_nm for p in profile]
        self.assertEqual(wavelengths, sorted(wavelengths))
        self.assertEqual(profile[0].band_key, "b02")  # 490nm Blue
        self.assertEqual(profile[1].band_key, "b03")  # 560nm Green
        self.assertEqual(profile[2].band_key, "b04")  # 665nm Red
        self.assertEqual(profile[-1].band_key, "b10") # 10895nm Thermal

        # Empty / None handling
        self.assertEqual(format_spectral_profile({}), [])
        self.assertEqual(format_spectral_profile(None), [])

    def test_bounding_box_topology_operations(self):
        """Verify BoundingBox intersects, intersection, contains_bbox, and overlap_ratio."""
        box1 = BoundingBox(min_lon=-121.2, min_lat=36.9, max_lon=-121.0, max_lat=37.1)
        box2 = BoundingBox(min_lon=-121.1, min_lat=37.0, max_lon=-120.9, max_lat=37.2)
        box3 = BoundingBox(min_lon=-120.8, min_lat=37.3, max_lon=-120.7, max_lat=37.4)

        # Intersection test
        self.assertTrue(box1.intersects(box2))
        self.assertFalse(box1.intersects(box3))
        self.assertTrue(box1.intersects([-121.1, 37.0, -120.9, 37.2]))

        # Intersection box
        inter = box1.intersection(box2)
        self.assertIsNotNone(inter)
        self.assertAlmostEqual(inter.min_lon, -121.1, places=5)
        self.assertAlmostEqual(inter.min_lat, 37.0, places=5)
        self.assertAlmostEqual(inter.max_lon, -121.0, places=5)
        self.assertAlmostEqual(inter.max_lat, 37.1, places=5)
        self.assertIsNone(box1.intersection(box3))

        # Containment
        child_box = BoundingBox(min_lon=-121.15, min_lat=36.95, max_lon=-121.05, max_lat=37.05)
        self.assertTrue(box1.contains_bbox(child_box))
        self.assertFalse(box1.contains_bbox(box2))

        # Overlap ratio (IoU)
        iou = box1.overlap_ratio(box2)
        self.assertTrue(0.0 < iou < 1.0)
        self.assertEqual(box1.overlap_ratio(box3), 0.0)
        self.assertEqual(box1.overlap_ratio(box1), 1.0)

    def test_spatial_lod_tiers_and_zoom_ranges(self):
        """Verify SpatialLODTier classification and recommended collection zoom ranges."""
        self.assertEqual(get_spatial_lod_tier(4), SpatialLODTier.MACRO_REGIONAL)
        self.assertEqual(get_spatial_lod_tier(9), SpatialLODTier.MACRO_REGIONAL)
        self.assertEqual(get_spatial_lod_tier(10), SpatialLODTier.SATELLITE_SYNOPTIC)
        self.assertEqual(get_spatial_lod_tier(13), SpatialLODTier.SATELLITE_SYNOPTIC)
        self.assertEqual(get_spatial_lod_tier(15), SpatialLODTier.SATELLITE_SYNOPTIC)
        self.assertEqual(get_spatial_lod_tier(16), SpatialLODTier.SUBMETER_TRANSITION)
        self.assertEqual(get_spatial_lod_tier(18), SpatialLODTier.SUBMETER_TRANSITION)
        self.assertEqual(get_spatial_lod_tier(19), SpatialLODTier.MICRO_INSPECTION)
        self.assertEqual(get_spatial_lod_tier(22), SpatialLODTier.MICRO_INSPECTION)

        # Collection recommended zoom
        self.assertEqual(get_collection_recommended_zoom("drone-ortho"), (16, 24))
        self.assertEqual(get_collection_recommended_zoom(SatelliteCollection.DRONE_ORTHO), (16, 24))
        self.assertEqual(get_collection_recommended_zoom("landsat-c2-l2"), (7, 15))
        self.assertEqual(get_collection_recommended_zoom("sentinel-2-l2a"), (8, 16))

        # Catalog keys
        self.assertEqual(len(ZOOM_LOD_TIERS), 4)
        self.assertIn("macro_regional", ZOOM_LOD_TIERS)
        self.assertIn("micro_inspection", ZOOM_LOD_TIERS)

    def test_hazard_event_to_geojson_conversion(self):
        """Verify hazard event conversion to GeoJSON Feature and FeatureCollection."""
        event_dict = {
            "id": "EVT-DAM-01",
            "title": "San Luis Dam Toe Seepage",
            "lat": 37.0582,
            "lng": -121.0744,
            "category": "seepage",
            "severity": "critical",
            "peak_zscore": "+3.42",
            "metric": "ndmi"
        }
        feat = hazard_event_to_geojson_feature(event_dict)
        self.assertEqual(feat.type, "Feature")
        self.assertEqual(feat.geometry["type"], "Point")
        self.assertEqual(feat.geometry["coordinates"], [-121.0744, 37.0582])
        self.assertEqual(feat.properties["id"], "EVT-DAM-01")
        self.assertEqual(feat.properties["severity"], "critical")

        fc = hazard_events_to_feature_collection([event_dict, {"id": "EVT-02", "lat": 37.1, "lng": -121.1}])
        self.assertEqual(fc.type, "FeatureCollection")
        self.assertEqual(len(fc.features), 2)

    def test_continuous_colormap_color_interpolation(self):
        """Verify get_colormap_color_at_value interpolates hex colors smoothly across colormaps."""
        hex_min = get_colormap_color_at_value("spectral", -0.2, -0.2, 0.6)
        hex_max = get_colormap_color_at_value("spectral", 0.6, -0.2, 0.6)
        hex_mid = get_colormap_color_at_value("spectral", 0.2, -0.2, 0.6)

        self.assertTrue(re.match(r"^#[0-9a-fA-F]{6}$", hex_min))
        self.assertTrue(re.match(r"^#[0-9a-fA-F]{6}$", hex_max))
        self.assertTrue(re.match(r"^#[0-9a-fA-F]{6}$", hex_mid))
        self.assertNotEqual(hex_min, hex_max)

        # Fallback handling
        self.assertTrue(re.match(r"^#[0-9a-fA-F]{6}$", get_colormap_color_at_value("unknown", 0.5)))
        self.assertTrue(re.match(r"^#[0-9a-fA-F]{6}$", get_colormap_color_at_value("viridis", float("nan"))))

    def test_boustrophedon_survey_waypoints_generator(self):
        """Verify generate_boustrophedon_waypoints creates valid serpentine survey flight lines."""
        bbox = (-121.08, 37.05, -121.06, 37.07)
        waypoints = generate_boustrophedon_waypoints(bbox, flight_altitude_m=60.0, overlap_pct=0.75)
        self.assertTrue(len(waypoints) >= 4)
        for lat, lon in waypoints:
            self.assertTrue(37.049 <= lat <= 37.071)
            self.assertTrue(-121.081 <= lon <= -121.059)

    def test_terrain_and_sar_analysis_contracts(self):
        """Verify Terrain and SAR analysis models and canonical API routes."""
        self.assertEqual(TerrainMetric.ELEVATION.value, "elevation")
        self.assertEqual(TerrainMetric.SLOPE.value, "slope")
        self.assertEqual(SARPolarization.VV.value, "vv")
        self.assertEqual(SARPolarization.RATIO.value, "ratio_vh_vv")

        req = TerrainAnalysisRequest(bbox=[-121.1, 37.0, -121.0, 37.1], metric=TerrainMetric.SLOPE)
        self.assertEqual(req.metric, TerrainMetric.SLOPE)
        self.assertEqual(req.sun_azimuth_deg, 315.0)

        resp = TerrainAnalysisResponse(
            metric="elevation",
            min_value=120.5,
            max_value=450.2,
            mean_value=280.1,
            unit="m",
            tile_url_template="/api/v1/tiles/terrain/elevation/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.unit, "m")

        sar_req = SARAnalysisRequest(
            bbox=[-121.1, 37.0, -121.0, 37.1],
            polarization=SARPolarization.VV,
            start_date="2026-08-01",
            end_date="2026-08-20"
        )
        self.assertEqual(sar_req.polarization, SARPolarization.VV)

        # Check route resolution
        self.assertEqual(format_api_route("analysis_terrain"), "/api/v1/analysis/terrain")
        self.assertEqual(format_api_route("analysis_sar"), "/api/v1/analysis/sar")
        self.assertEqual(
            format_api_route("tiles_terrain", metric="elevation", z=13, x=1310, y=3165),
            "/api/v1/tiles/terrain/elevation/13/1310/3165.png"
        )

    def test_transect_cross_section_contracts_and_sampling(self):
        """Verify engineering transect cross-section models and equidistant geodesic sampling."""
        self.assertEqual(TransectSampleMethod.EQUIDISTANT_GEODESIC.value, "equidistant_geodesic")
        self.assertEqual(TransectSampleMethod.VERTEX_ONLY.value, "vertex_only")

        # Test polyline sampling
        polyline = [
            (37.058, -121.074),
            (37.060, -121.070),
            (37.062, -121.066)
        ]
        samples = sample_polyline_equidistant(polyline, sample_count=10)
        self.assertEqual(len(samples), 10)
        self.assertAlmostEqual(samples[0][0], 37.058, places=4)
        self.assertAlmostEqual(samples[0][1], -121.074, places=4)
        self.assertAlmostEqual(samples[-1][0], 37.062, places=4)
        self.assertAlmostEqual(samples[-1][1], -121.066, places=4)

        # Test GeoJSON LineString input
        geojson_line = {
            "type": "LineString",
            "coordinates": [[-121.074, 37.058], [-121.070, 37.060], [-121.066, 37.062]]
        }
        samples_geojson = sample_polyline_equidistant(geojson_line, sample_count=10)
        self.assertEqual(len(samples_geojson), 10)
        self.assertAlmostEqual(samples_geojson[0][0], 37.058, places=4)

        # Test models
        pt = TransectPoint(
            distance_m=125.5,
            lat=37.0585,
            lon=-121.073,
            elevation_m=182.4,
            slope_deg=5.2,
            metric_value=0.38
        )
        self.assertEqual(pt.distance_m, 125.5)
        self.assertEqual(pt.elevation_m, 182.4)

        summary = TransectProfileSummary(
            total_distance_m=1250.0,
            min_elevation_m=140.0,
            max_elevation_m=220.0,
            elevation_gain_m=80.0,
            elevation_loss_m=0.0,
            mean_slope_deg=4.2,
            max_slope_deg=12.5,
            min_metric_value=0.12,
            max_metric_value=0.55
        )
        self.assertEqual(summary.total_distance_m, 1250.0)

        req = TransectAnalysisRequest(
            polyline=[(37.058, -121.074), (37.062, -121.066)],
            metric=SpectralIndex.NDMI,
            sample_count=25
        )
        self.assertEqual(req.metric, SpectralIndex.NDMI)
        self.assertEqual(req.sample_count, 25)

        resp = TransectAnalysisResponse(
            metric="ndmi",
            total_distance_m=1250.0,
            sample_count=1,
            summary=summary,
            points=[pt]
        )
        self.assertEqual(resp.metric, "ndmi")
        self.assertEqual(len(resp.points), 1)

    def test_volumetric_cut_fill_earthwork_contracts(self):
        """Verify volumetric calculation models and cut-fill earthwork integration algorithm."""
        self.assertEqual(VolumeCalculationMode.CUT_FILL.value, "cut_fill")
        self.assertEqual(VolumeCalculationMode.RESERVOIR_STORAGE.value, "reservoir_storage")
        self.assertEqual(VolumeCalculationMode.EMBANKMENT_FILL.value, "embankment_fill")

        req = VolumetricAnalysisRequest(
            bbox=(-121.08, 37.05, -121.06, 37.07),
            reference_elevation_m=200.0,
            mode=VolumeCalculationMode.CUT_FILL,
            grid_resolution_m=10.0
        )
        self.assertEqual(req.reference_elevation_m, 200.0)
        self.assertEqual(req.grid_resolution_m, 10.0)

        # Elevation grid: 4 cells of 10m x 10m (100 m2 each)
        # 2 cells above 200m (+10m, +5m -> cut = 15m * 100m2 = 1500 m3)
        # 2 cells below 200m (-4m, -6m -> fill = 10m * 100m2 = 1000 m3)
        elev_grid = [210.0, 205.0, 196.0, 194.0]
        res = calculate_cut_fill_volumes(elev_grid, reference_elevation_m=200.0, cell_size_m=10.0)
        self.assertEqual(res["cut_volume_m3"], 1500.0)
        self.assertEqual(res["fill_volume_m3"], 1000.0)
        self.assertEqual(res["net_volume_m3"], 500.0)
        self.assertEqual(res["surface_area_m2"], 400.0)
        self.assertEqual(res["surface_area_hectares"], 0.04)
        self.assertAlmostEqual(res["mean_elevation_m"], 201.25, places=2)

        resp = VolumetricAnalysisResponse(
            mode="cut_fill",
            reference_elevation_m=200.0,
            **res
        )
        self.assertEqual(resp.net_volume_m3, 500.0)
        self.assertEqual(resp.cut_volume_m3, 1500.0)

    def test_data_export_contracts_and_filename_generator(self):
        """Verify data export requests, responses, and canonical filename formatting."""
        self.assertEqual(ExportRasterFormat.GEOTIFF.value, "geotiff")
        self.assertEqual(ExportRasterFormat.COG.value, "cog")
        self.assertEqual(ExportRasterFormat.PNG_RGBA.value, "png_rgba")
        self.assertEqual(ExportRasterFormat.GEOJSON_VECTOR.value, "geojson_vector")
        self.assertEqual(ExportRasterFormat.CSV_TABULAR.value, "csv_tabular")

        req = DataExportRequest(
            bbox=(-121.1, 37.0, -121.0, 37.1),
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_MSIL2A_20260820",
            index=SpectralIndex.NDMI,
            format=ExportRasterFormat.GEOTIFF
        )
        self.assertEqual(req.collection, SatelliteCollection.SENTINEL_2)
        self.assertEqual(req.format, ExportRasterFormat.GEOTIFF)

        fn = format_export_filename(
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_MSIL2A_20260820",
            format_type=ExportRasterFormat.GEOTIFF,
            index=SpectralIndex.NDMI
        )
        self.assertEqual(fn, "gios_sentinel-2-l2a_S2A_MSIL2A_20260820_ndmi.tif")

        resp = DataExportResponse(
            export_id="EXP-12345",
            status="ready",
            format="geotiff",
            download_url="https://api.gios.internal/exports/exp-12345.tif",
            filename=fn,
            file_size_bytes=8388608,
            crs="EPSG:4326",
            bbox=(-121.1, 37.0, -121.0, 37.1),
            created_at="2026-09-23T18:00:00Z",
            expires_at="2026-09-24T18:00:00Z"
        )
        self.assertEqual(resp.export_id, "EXP-12345")
        self.assertEqual(resp.filename, fn)

    def test_animation_sequence_and_keyframe_builder(self):
        """Verify multi-temporal animation keyframe generation and configuration."""
        self.assertEqual(AnimationPlaybackMode.LOOP.value, "loop")
        self.assertEqual(AnimationPlaybackMode.PING_PONG.value, "ping_pong")
        self.assertEqual(AnimationPlaybackMode.STEP.value, "step")

        scenes = [
            {"id": "SCENE-02", "datetime": "2026-08-15T18:00:00Z", "cloud_cover": 2.1, "collection": "sentinel-2-l2a"},
            {"id": "SCENE-01", "datetime": "2026-08-01T18:00:00Z", "cloud_cover": 0.5, "collection": "sentinel-2-l2a"}
        ]
        frames = build_animation_keyframes(
            scenes=scenes,
            z=13,
            x=1310,
            y=3165,
            index=SpectralIndex.NDMI,
            colormap=TileColormap.SPECTRAL
        )
        self.assertEqual(len(frames), 2)
        # Chronological ordering
        self.assertEqual(frames[0].scene_id, "SCENE-01")
        self.assertEqual(frames[0].timestamp, "2026-08-01")
        self.assertEqual(frames[1].scene_id, "SCENE-02")
        self.assertEqual(frames[1].timestamp, "2026-08-15")
        self.assertIn("index=ndmi", frames[0].tile_url)
        self.assertIn("colormap=spectral", frames[0].tile_url)

        seq = AnimationSequenceConfig(
            collection=SatelliteCollection.SENTINEL_2,
            start_date="2026-08-01",
            end_date="2026-08-30",
            fps=3.0,
            playback_mode=AnimationPlaybackMode.LOOP,
            frames=frames
        )
        self.assertEqual(seq.fps, 3.0)
        self.assertEqual(len(seq.frames), 2)

    def test_extended_canonical_api_route_contracts(self):
        """Verify format_api_route resolves all newly registered API route contracts."""
        self.assertEqual(format_api_route("analysis_transect"), "/api/v1/analysis/transect")
        self.assertEqual(format_api_route("analysis_volumetric"), "/api/v1/analysis/volumetric")
        self.assertEqual(format_api_route("analysis_export"), "/api/v1/analysis/export")
        self.assertEqual(format_api_route("analysis_animation_sequence"), "/api/v1/analysis/animation-sequence")
        self.assertEqual(format_api_route("analysis_composite"), "/api/v1/analysis/composite")
        self.assertEqual(format_api_route("tiles_composite", composite_id="COMP-01", z=12, x=100, y=200), "/api/v1/tiles/composite/COMP-01/12/100/200.png")
        self.assertEqual(format_api_route("annotations"), "/api/v1/annotations")
        self.assertEqual(format_api_route("annotation_detail", annotation_id="ANN-01"), "/api/v1/annotations/ANN-01")
        self.assertEqual(format_api_route("work_orders"), "/api/v1/work-orders")
        self.assertEqual(format_api_route("subscriptions"), "/api/v1/subscriptions")
        self.assertEqual(format_api_route("subscription_detail", subscription_id="SUB-01"), "/api/v1/subscriptions/SUB-01")
        self.assertEqual(format_api_route("analysis_vrt"), "/api/v1/analysis/vrt")
        self.assertEqual(format_api_route("tiles_vrt", vrt_id="VRT-01", z=12, x=100, y=200), "/api/v1/tiles/vrt/VRT-01/12/100/200.png")

    def test_temporal_composites_and_reducers(self):
        """Verify CompositeReducer and TemporalCompositeRequest/Response contracts."""
        self.assertEqual(CompositeReducer.MEDIAN.value, "median")
        self.assertEqual(CompositeReducer.GREENEST_PIXEL.value, "greenest_pixel")
        self.assertEqual(CompositeReducer.CLEAREST_PIXEL.value, "clearest_pixel")
        self.assertEqual(CompositeReducer.MOST_RECENT.value, "most_recent")
        self.assertEqual(CompositeReducer.MAX_NDMI.value, "max_ndmi")
        self.assertEqual(CompositeReducer.MIN_LST.value, "min_lst")

        req = TemporalCompositeRequest(
            bbox=(-121.2, 36.95, -120.95, 37.15),
            start_date="2026-06-01",
            end_date="2026-08-30",
            reducer=CompositeReducer.GREENEST_PIXEL,
            max_cloud_cover=20.0,
            index=SpectralIndex.NDVI,
            colormap=TileColormap.VIRIDIS
        )
        self.assertEqual(req.reducer, CompositeReducer.GREENEST_PIXEL)
        self.assertEqual(req.collection, SatelliteCollection.SENTINEL_2)

        resp = TemporalCompositeResponse(
            composite_id="COMP-001",
            status="ready",
            reducer=CompositeReducer.GREENEST_PIXEL,
            collection="sentinel-2-l2a",
            scene_count=4,
            contributing_scenes=["S2A_01", "S2A_02", "S2A_03", "S2A_04"],
            bbox=(-121.2, 36.95, -120.95, 37.15),
            time_window="2026-06-01 to 2026-08-30",
            tile_url_template="/api/v1/tiles/composite/COMP-001/{z}/{x}/{y}.png",
            created_at="2026-09-24T00:00:00Z"
        )
        self.assertEqual(resp.scene_count, 4)
        self.assertEqual(resp.composite_id, "COMP-001")

        tile_url = build_composite_tile_url("COMP-001", z=12, x=100, y=200, index="ndvi", colormap="viridis")
        self.assertIn("/api/v1/tiles/composite/COMP-001/12/100/200.png", tile_url)
        self.assertIn("index=ndvi", tile_url)
        self.assertIn("colormap=viridis", tile_url)

    def test_geotechnical_annotations_and_defect_categories(self):
        """Verify DefectCategory, GeotechnicalAnnotation, and GeoJSON conversion contracts."""
        self.assertEqual(DefectCategory.SEEPAGE_BOIL.value, "seepage_boil")
        self.assertEqual(DefectCategory.CREST_CRACK.value, "crest_crack")
        self.assertEqual(DefectCategory.SLOPE_SLUMP.value, "slope_slump")
        self.assertEqual(DefectCategory.PIPING_VOID.value, "piping_void")
        self.assertEqual(DefectSeverity.CRITICAL.value, "critical")
        self.assertEqual(DefectStatus.OPEN.value, "open")

        ann = GeotechnicalAnnotation(
            annotation_id="ANN-001",
            title="Toe Seepage Boil",
            category=DefectCategory.SEEPAGE_BOIL,
            severity=DefectSeverity.CRITICAL,
            status=DefectStatus.INVESTIGATING,
            lat=37.0582,
            lng=-121.0744,
            elevation_m=154.2,
            asset_id="SAN-LUIS-DAM-01",
            photo_urls=["https://example.com/photo1.jpg"],
            notes="Turbid boil observed 15m downstream of toe.",
            inspector="Geotechnical Lead",
            created_at="2026-09-24T00:00:00Z",
            updated_at="2026-09-24T00:00:00Z"
        )
        self.assertEqual(ann.category, DefectCategory.SEEPAGE_BOIL)
        self.assertEqual(ann.severity, DefectSeverity.CRITICAL)

        # RFC 7946 GeoJSON Feature conversion
        feature = annotation_to_geojson_feature(ann)
        self.assertEqual(feature["type"], "Feature")
        self.assertEqual(feature["geometry"]["type"], "Point")
        self.assertEqual(feature["geometry"]["coordinates"], [-121.0744, 37.0582])
        self.assertEqual(feature["properties"]["category"], "seepage_boil")
        self.assertEqual(feature["properties"]["severity"], "critical")

        fc = annotations_to_feature_collection([ann])
        self.assertEqual(fc["type"], "FeatureCollection")
        self.assertEqual(len(fc["features"]), 1)

    def test_maintenance_work_orders(self):
        """Verify MaintenanceWorkOrder and CreateWorkOrderRequest contracts."""
        req = CreateWorkOrderRequest(
            annotation_id="ANN-001",
            priority=DefectSeverity.CRITICAL,
            description="Install weighted inverted filter ring around boil perimeter.",
            assigned_crew="Dam Emergency Crew Alpha",
            target_completion_date="2026-09-26",
            estimated_hours=16.0
        )
        self.assertEqual(req.priority, DefectSeverity.CRITICAL)
        self.assertEqual(req.estimated_hours, 16.0)

        wo = MaintenanceWorkOrder(
            work_order_id="WO-2026-001",
            annotation_id="ANN-001",
            asset_id="SAN-LUIS-DAM-01",
            priority=DefectSeverity.CRITICAL,
            description="Install weighted inverted filter ring around boil perimeter.",
            assigned_crew="Dam Emergency Crew Alpha",
            target_completion_date="2026-09-26",
            status="dispatched",
            estimated_hours=16.0,
            created_at="2026-09-24T00:00:00Z"
        )
        self.assertEqual(wo.work_order_id, "WO-2026-001")
        self.assertEqual(wo.status, "dispatched")

    def test_aoi_monitoring_subscriptions_and_alert_payload(self):
        """Verify AOISubscription and SubscriptionAlertPayload contracts."""
        self.assertEqual(SubscriptionTriggerType.Z_SCORE_ANOMALY.value, "z_score_anomaly")
        self.assertEqual(NotificationChannel.WEBHOOK.value, "webhook")

        sub_req = AOISubscriptionRequest(
            name="San Luis Seepage Perimeter",
            bbox=[-121.15, 37.0, -121.0, 37.1],
            asset_id="SAN-LUIS-DAM-01",
            collection=SatelliteCollection.SENTINEL_2,
            indices=[SpectralIndex.NDMI, SpectralIndex.MNDWI],
            trigger_type=SubscriptionTriggerType.Z_SCORE_ANOMALY,
            z_score_threshold=2.5,
            channels=[NotificationChannel.WEBHOOK, NotificationChannel.IN_APP_ALERT],
            webhook_url="https://monitoring.ca.gov/webhooks"
        )
        self.assertEqual(sub_req.z_score_threshold, 2.5)
        self.assertEqual(len(sub_req.indices), 2)

        sub_resp = AOISubscriptionResponse(
            subscription_id="SUB-001",
            name="San Luis Seepage Perimeter",
            asset_id="SAN-LUIS-DAM-01",
            collection="sentinel-2-l2a",
            indices=["ndmi", "mndwi"],
            trigger_type=SubscriptionTriggerType.Z_SCORE_ANOMALY,
            z_score_threshold=2.5,
            channels=["webhook", "in_app_alert"],
            webhook_url="https://monitoring.ca.gov/webhooks",
            is_active=True,
            created_at="2026-09-24T00:00:00Z",
            alerts_triggered_count=3
        )
        self.assertEqual(sub_resp.alerts_triggered_count, 3)

        alert_payload = SubscriptionAlertPayload(
            subscription_id="SUB-001",
            asset_id="SAN-LUIS-DAM-01",
            trigger_type=SubscriptionTriggerType.Z_SCORE_ANOMALY,
            z_score=3.2,
            index=SpectralIndex.NDMI,
            message="Seasonal moisture anomaly detected at toe.",
            scene_id="S2A_MSIL2A_20260920",
            triggered_at="2026-09-24T00:00:00Z"
        )
        self.assertEqual(alert_payload.z_score, 3.2)

    def test_vrt_mosaics_and_mgrs_alignment(self):
        """Verify VRT dataset specifications and MGRS tile alignment contracts."""
        self.assertEqual(SeamlineMode.FEATHER.value, "feather")
        self.assertEqual(SeamlineMode.VORONOI_CUT.value, "voronoi_cut")

        mgrs = MGRSTileSpec(
            tile_id="10SEJ",
            utm_zone=10,
            latitude_band="S",
            square_id="EJ",
            epsg_code=32610,
            bbox=(-121.5, 36.8, -120.8, 37.3)
        )
        self.assertEqual(mgrs.tile_id, "10SEJ")
        self.assertEqual(mgrs.epsg_code, 32610)

        vrt_spec = VRTDatasetSpec(
            vrt_id="VRT-001",
            target_crs="EPSG:3857",
            resolution_m=10.0,
            source_scenes=["S2A_10SEJ_20260820", "S2A_10SEK_20260820"],
            seamline_mode=SeamlineMode.FEATHER,
            bbox=(-121.5, 36.8, -120.8, 37.3),
            band_count=4,
            created_at="2026-09-24T00:00:00Z"
        )
        self.assertEqual(vrt_spec.vrt_id, "VRT-001")
        self.assertEqual(len(vrt_spec.source_scenes), 2)

        vrt_tile_url = build_vrt_tile_url("VRT-001", z=12, x=100, y=200, index="ndmi", colormap="spectral")
        self.assertIn("/api/v1/tiles/vrt/VRT-001/12/100/200.png", vrt_tile_url)
        self.assertIn("index=ndmi", vrt_tile_url)

    def test_bitemporal_change_detection_contracts(self):
        """Verify ChangeDetectionMetric, ChangeCategory, ChangeDetectionRequest/Response, and classification utilities."""
        self.assertEqual(ChangeDetectionMetric.NDVI_DIFF.value, "ndvi_diff")
        self.assertEqual(ChangeDetectionMetric.NDMI_DIFF.value, "ndmi_diff")
        self.assertEqual(ChangeDetectionMetric.MNDWI_DIFF.value, "mndwi_diff")
        self.assertEqual(ChangeDetectionMetric.NBR_DIFF.value, "nbr_diff")
        self.assertEqual(ChangeDetectionMetric.SAR_VV_DIFF.value, "sar_vv_diff")
        self.assertEqual(ChangeDetectionMetric.LST_DIFF.value, "lst_diff")
        self.assertEqual(ChangeCategory.SIGNIFICANT_INCREASE.value, "significant_increase")
        self.assertEqual(ChangeCategory.STABLE.value, "stable")
        self.assertEqual(ChangeCategory.SIGNIFICANT_DECREASE.value, "significant_decrease")

        # ChangeDetectionRequest validation with alias resolution
        req = ChangeDetectionRequest(
            collection="sentinel-2-l2a",
            pre_item_id="S2A_MSIL2A_20250815",
            post_item_id="S2A_MSIL2A_20260815",
            metric=ChangeDetectionMetric.NDMI_DIFF,
            threshold_positive=0.15,
            threshold_negative=-0.15
        )
        self.assertEqual(req.pre_scene_id, "S2A_MSIL2A_20250815")
        self.assertEqual(req.post_scene_id, "S2A_MSIL2A_20260815")
        self.assertEqual(req.metric, ChangeDetectionMetric.NDMI_DIFF)

        # Classification helper
        values = [0.35, 0.20, 0.05, -0.02, -0.18, -0.42]
        cats = calculate_change_detection_classes(values, threshold_positive=0.15, threshold_negative=-0.15, threshold_extreme=0.30)
        self.assertEqual(len(cats), 5)
        cat_map = {c.category: c for c in cats}
        self.assertEqual(cat_map[ChangeCategory.SIGNIFICANT_INCREASE].pixel_count, 1)
        self.assertEqual(cat_map[ChangeCategory.MODERATE_INCREASE].pixel_count, 1)
        self.assertEqual(cat_map[ChangeCategory.STABLE].pixel_count, 2)
        self.assertEqual(cat_map[ChangeCategory.MODERATE_DECREASE].pixel_count, 1)
        self.assertEqual(cat_map[ChangeCategory.SIGNIFICANT_DECREASE].pixel_count, 1)

        # Test bbox auto-conversion to GeoJSON geometry
        req_bbox = ChangeDetectionRequest(
            pre_item_id="S2A_PRE",
            post_item_id="S2A_POST",
            bbox=[-121.2, 36.95, -120.95, 37.15]
        )
        self.assertIsNotNone(req_bbox.bbox)
        self.assertEqual(req_bbox.bbox.min_lon, -121.2)
        self.assertIsNotNone(req_bbox.geometry)
        self.assertEqual(req_bbox.geometry["type"], "Polygon")
        self.assertEqual(len(req_bbox.geometry["coordinates"][0]), 5)

        # Difference tile URL builder
        tile_url = build_difference_tile_url("sentinel-2-l2a", "PRE1", "POST1", "ndmi_difference", 12, 100, 200, rescale="-0.5,0.5", colormap="turbo")
        self.assertIn("/api/v1/tiles/difference/sentinel-2-l2a/PRE1/POST1/ndmi_difference/12/100/200.png", tile_url)
        self.assertIn("rescale=-0.5,0.5", tile_url)
        self.assertIn("colormap=turbo", tile_url)

    def test_geotechnical_in_situ_instrumentation_contracts(self):
        """Verify GeotechnicalSensor, SensorReading, GeotechnicalNetworkSummary, and GeoJSON converters."""
        self.assertEqual(GeotechnicalSensorType.PIEZOMETER.value, "piezometer")
        self.assertEqual(GeotechnicalSensorType.INCLINOMETER.value, "inclinometer")
        self.assertEqual(GeotechnicalSensorType.SEEPAGE_WEIR.value, "seepage_weir")
        self.assertEqual(GeotechnicalSensorType.STAGE_GAUGE.value, "stage_gauge")
        self.assertEqual(GeotechnicalSensorType.SETTLEMENT_PLATE.value, "settlement_plate")
        self.assertEqual(SensorReadingStatus.NORMAL.value, "normal")
        self.assertEqual(SensorReadingStatus.CRITICAL.value, "critical")

        sensor = GeotechnicalSensor(
            sensor_id="PZ-SL-101",
            name="Embankment Crest Piezometer 101",
            sensor_type=GeotechnicalSensorType.PIEZOMETER,
            asset_id="SAN-LUIS-DAM-01",
            lat=37.0582,
            lng=-121.0744,
            installation_elevation_m=165.0,
            installation_depth_m=35.0,
            unit="kPa",
            current_value=142.5,
            alert_threshold_high=200.0,
            critical_threshold_high=260.0,
            status=SensorReadingStatus.NORMAL,
            last_reading_time="2026-09-24T00:00:00Z"
        )
        self.assertEqual(sensor.sensor_id, "PZ-SL-101")
        self.assertEqual(sensor.unit, "kPa")

        # GeoJSON Feature conversion
        feature = sensor_to_geojson_feature(sensor)
        self.assertEqual(feature["type"], "Feature")
        self.assertEqual(feature["geometry"]["coordinates"], [-121.0744, 37.0582])
        self.assertEqual(feature["properties"]["sensor_id"], "PZ-SL-101")
        self.assertEqual(feature["properties"]["sensor_type"], "piezometer")
        self.assertEqual(feature["properties"]["current_value"], 142.5)

        fc = sensors_to_feature_collection([sensor])
        self.assertEqual(fc["type"], "FeatureCollection")
        self.assertEqual(len(fc["features"]), 1)

        # Test CreateGeotechnicalSensorRequest with optional thresholds and values
        create_req = CreateGeotechnicalSensorRequest(
            sensor_id="PZ-SL-102",
            name="Piezometer P-02",
            sensor_type=GeotechnicalSensorType.PIEZOMETER,
            asset_id="SAN-LUIS-DAM-01",
            lat=37.0585,
            lng=-121.0740,
            installation_elevation_m=160.0,
            unit="kPa",
            current_value=125.0,
            alert_threshold_low=50.0,
            alert_threshold_high=180.0
        )
        self.assertEqual(create_req.current_value, 125.0)
        self.assertEqual(create_req.alert_threshold_low, 50.0)
        self.assertEqual(create_req.status, SensorReadingStatus.NORMAL)

        summary = GeotechnicalNetworkSummary(
            asset_id="SAN-LUIS-DAM-01",
            total_sensors=12,
            sensors_normal=10,
            sensors_advisory=2,
            sensors_alert=0,
            sensors_critical=0,
            max_pore_pressure_kpa=185.0,
            total_seepage_flow_lps=14.2,
            phreatic_surface_warning=False,
            last_updated="2026-09-24T00:00:00Z"
        )
        self.assertEqual(summary.total_sensors, 12)
        self.assertFalse(summary.phreatic_surface_warning)

    def test_reservoir_bathymetry_eac_contracts(self):
        """Verify EACDataPoint, EACAnalysisRequest, EACAnalysisResponse, and frustum integration."""
        dp = EACDataPoint(
            elevation_m=150.0,
            surface_area_ha=120.5,
            storage_volume_m3=4500000.0,
            storage_volume_acre_feet=3648.2
        )
        self.assertEqual(dp.elevation_m, 150.0)
        self.assertEqual(dp.surface_area_ha, 120.5)

        req = EACAnalysisRequest(
            asset_id="SAN-LUIS-RES-01",
            datum_min_elevation_m=100.0,
            datum_max_elevation_m=200.0,
            step_elevation_m=10.0,
            current_pool_elevation_m=165.0
        )
        self.assertEqual(req.datum_min_elevation_m, 100.0)
        self.assertEqual(req.datum_max_elevation_m, 200.0)

        # Test bbox auto-conversion to GeoJSON geometry
        req_eac_bbox = EACAnalysisRequest(
            asset_id="SAN-LUIS-RES-01",
            bbox=[-121.15, 37.02, -121.05, 37.08],
            datum_min_elevation_m=100.0,
            datum_max_elevation_m=200.0
        )
        self.assertIsNotNone(req_eac_bbox.bbox)
        self.assertIsNotNone(req_eac_bbox.geometry)
        self.assertEqual(req_eac_bbox.geometry["type"], "Polygon")

        # Validation error when min >= max
        with self.assertRaises(ValueError):
            EACAnalysisRequest(
                asset_id="SAN-LUIS-RES-01",
                datum_min_elevation_m=200.0,
                datum_max_elevation_m=100.0
            )

        # Frustum integration math
        elev_grid = [105.0, 115.0, 125.0, 145.0, 160.0, 180.0, 195.0]
        curve, metrics = calculate_elevation_storage_capacity(
            elevation_grid=elev_grid,
            cell_size_m=30.0,
            datum_min=100.0,
            datum_max=200.0,
            step=20.0,
            current_pool=150.0
        )
        self.assertGreater(len(curve), 0)
        self.assertIn("max_capacity_m3", metrics)
        self.assertIn("max_surface_area_ha", metrics)
        self.assertIn("current_storage_m3", metrics)

    def test_tile_pyramid_cache_and_bounds_contracts(self):
        """Verify TilePyramidBounds, TileCachePreloadRequest, and slippy map coordinate calculations."""
        bounds = calculate_tile_pyramid_count(
            min_lon=-121.2, min_lat=36.95, max_lon=-120.95, max_lat=37.15,
            min_zoom=10, max_zoom=12
        )
        self.assertIsInstance(bounds, TilePyramidBounds)
        self.assertEqual(bounds.min_zoom, 10)
        self.assertEqual(bounds.max_zoom, 12)
        self.assertGreater(bounds.total_tiles, 0)
        self.assertIn(10, bounds.zoom_tile_counts)
        self.assertIn(11, bounds.zoom_tile_counts)
        self.assertIn(12, bounds.zoom_tile_counts)

        coords_z11 = calculate_tile_pyramid_coords(-121.2, 36.95, -120.95, 37.15, zoom=11)
        self.assertGreater(len(coords_z11), 0)
        for z, x, y in coords_z11:
            self.assertEqual(z, 11)
            self.assertIsInstance(x, int)
            self.assertIsInstance(y, int)

        preload_req = TileCachePreloadRequest(
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_MSIL2A_20260901",
            bbox=[-121.2, 36.95, -120.95, 37.15],
            min_zoom=10,
            max_zoom=12,
            indices=[SpectralIndex.NDMI],
            colormaps=[TileColormap.SPECTRAL]
        )
        self.assertEqual(preload_req.min_zoom, 10)
        self.assertEqual(preload_req.max_zoom, 12)

        # Invalid zoom range error
        with self.assertRaises(ValueError):
            TileCachePreloadRequest(
                item_id="S2A_MSIL2A_20260901",
                bbox=[-121.2, 36.95, -120.95, 37.15],
                min_zoom=14,
                max_zoom=10
            )

    def test_new_canonical_route_contracts_and_difference_tile_url(self):
        """Verify format_api_route formatting for all 7 new canonical contracts."""
        r1 = format_api_route("analysis_change_detection")
        self.assertEqual(r1, "/api/v1/analysis/change-detection")

        r2 = format_api_route(
            "tiles_difference",
            collection="sentinel-2-l2a",
            pre_scene_id="PRE",
            post_scene_id="POST",
            metric="ndmi_difference",
            z=12,
            x=10,
            y=20
        )
        self.assertEqual(r2, "/api/v1/tiles/difference/sentinel-2-l2a/PRE/POST/ndmi_difference/12/10/20.png")

        r3 = format_api_route("integration_geotechnical_sensors")
        self.assertEqual(r3, "/api/v1/integration/geotechnical/sensors")
        self.assertEqual(format_api_route("integration_sensors"), "/api/v1/integration/geotechnical/sensors")

        r4 = format_api_route("integration_geotechnical_readings", sensor_id="PZ-101")
        self.assertEqual(r4, "/api/v1/integration/geotechnical/sensors/PZ-101/readings")
        self.assertEqual(format_api_route("integration_sensor_readings", sensor_id="PZ-101"), "/api/v1/integration/geotechnical/sensors/PZ-101/readings")

        r5 = format_api_route("integration_geotechnical_summary", asset_id="DAM-01")
        self.assertEqual(r5, "/api/v1/integration/geotechnical/summary/DAM-01")
        self.assertEqual(format_api_route("integration_sensor_summary", asset_id="DAM-01"), "/api/v1/integration/geotechnical/summary/DAM-01")

        r6 = format_api_route("analysis_bathymetry_eac")
        self.assertEqual(r6, "/api/v1/analysis/bathymetry/eac")

        r7 = format_api_route("tiles_cache_preload")
        self.assertEqual(r7, "/api/v1/tiles/cache/preload")

        r8 = format_api_route("tiles_difference_short", metric="ndmi_diff", z=12, x=10, y=20)
        self.assertEqual(r8, "/api/v1/tiles/difference/ndmi_diff/12/10/20.png")

    def test_gcp_quality_assessment_and_camera_calibration_contracts(self):
        """Verify GCPCoordinate, GCPResidual, CameraInteriorOrientation, and RMSE calculations."""
        cam = CameraInteriorOrientation(
            camera_id="DJI-ZENMUSE-P1-01",
            focal_length_mm=35.0,
            focal_length_px=7954.5,
            principal_point_x_px=4096.0,
            principal_point_y_px=2730.0,
            radial_distortion_k1=-0.012,
            radial_distortion_k2=0.005,
            radial_distortion_k3=0.0,
            tangential_distortion_p1=0.0001,
            tangential_distortion_p2=-0.0001,
            sensor_width_mm=35.9,
            sensor_height_mm=24.0
        )
        self.assertEqual(cam.camera_id, "DJI-ZENMUSE-P1-01")
        self.assertEqual(cam.focal_length_mm, 35.0)

        measured = [
            GCPCoordinate(point_id="GCP-01", role=GCPRole.CONTROL, x_east=672000.0, y_north=4104000.0, z_elev=165.0, lat=37.06, lng=-121.07),
            GCPCoordinate(point_id="GCP-02", role=GCPRole.CONTROL, x_east=672500.0, y_north=4104500.0, z_elev=166.0, lat=37.065, lng=-121.065),
            GCPCoordinate(point_id="CP-01", role=GCPRole.CHECK, x_east=672200.0, y_north=4104200.0, z_elev=165.5, lat=37.062, lng=-121.068)
        ]
        estimated = [
            {"point_id": "GCP-01", "x_east": 672000.02, "y_north": 4104000.01, "z_elev": 165.03, "reprojection_error_px": 0.35},
            {"point_id": "GCP-02", "x_east": 672499.98, "y_north": 4104500.02, "z_elev": 165.98, "reprojection_error_px": 0.41},
            {"point_id": "CP-01", "x_east": 672200.03, "y_north": 4104199.97, "z_elev": 165.54, "reprojection_error_px": 0.48}
        ]

        residuals, ctrl_rmse, check_rmse = calculate_gcp_residuals_and_rmse(measured, estimated)
        self.assertEqual(len(residuals), 3)
        self.assertIsNotNone(ctrl_rmse)
        self.assertIsNotNone(check_rmse)
        self.assertEqual(ctrl_rmse.point_count, 2)
        self.assertEqual(check_rmse.point_count, 1)
        self.assertLess(ctrl_rmse.rmse_3d_m, 0.05)  # Survey grade achieved

        req = GCPQualityAssessmentRequest(
            ortho_id="ORTHO-DAM-01",
            control_points=measured,
            estimated_positions=estimated,
            camera_calibration=cam
        )
        self.assertEqual(req.ortho_id, "ORTHO-DAM-01")

        resp = GCPQualityAssessmentResponse(
            ortho_id="ORTHO-DAM-01",
            control_rmse=ctrl_rmse,
            check_rmse=check_rmse,
            residuals=residuals,
            survey_grade_achieved=(ctrl_rmse.rmse_3d_m <= 0.05),
            camera_calibration=cam,
            assessed_at="2026-09-24T12:00:00Z"
        )
        self.assertTrue(resp.survey_grade_achieved)

        # GeoJSON serialization
        feature = gcp_to_geojson_feature(measured[0])
        self.assertEqual(feature["type"], "Feature")
        self.assertEqual(feature["id"], "GCP-01")
        self.assertEqual(feature["geometry"]["coordinates"], [-121.07, 37.06])

        fc = gcps_to_feature_collection(measured)
        self.assertEqual(fc["type"], "FeatureCollection")
        self.assertEqual(len(fc["features"]), 3)

    def test_topographic_wetness_index_and_slope_stability_contracts(self):
        """Verify TWI, infinite slope Factor of Safety modeling, and stability classifications."""
        # TWI calculation
        twi_steep = calculate_topographic_wetness_index(catchment_area_m2=500.0, slope_degrees=25.0)
        twi_flat = calculate_topographic_wetness_index(catchment_area_m2=5000.0, slope_degrees=1.0)
        self.assertGreater(twi_flat, twi_steep)

        # TWI Request with bbox conversion
        twi_req = TWIAnalysisRequest(
            asset_id="DAM-01",
            bbox=[-121.2, 36.95, -120.95, 37.15],
            grid_resolution_m=10.0
        )
        self.assertIsNotNone(twi_req.geometry)
        self.assertEqual(twi_req.geometry["type"], "Polygon")

        twi_resp = TWIAnalysisResponse(
            asset_id="DAM-01",
            mean_twi=6.45,
            min_twi=1.80,
            max_twi=14.20,
            saturated_area_hectares=12.5,
            saturation_percentage=8.2,
            tile_url_template="/api/v1/tiles/terrain/twi/{z}/{x}/{y}.png",
            created_at="2026-09-24T12:00:00Z"
        )
        self.assertEqual(twi_resp.asset_id, "DAM-01")
        self.assertEqual(twi_resp.mean_twi, 6.45)

        # Slope Stability Factor of Safety
        # Moderate slope, good cohesion: expect stable (FS >= 1.5)
        fs_stable = calculate_slope_factor_of_safety(
            slope_deg=18.0,
            cohesion_kpa=15.0,
            friction_angle_deg=32.0,
            unit_weight_soil=19.5,
            saturation_m=0.3,
            depth_m=2.5
        )
        self.assertGreaterEqual(fs_stable, 1.50)
        self.assertEqual(classify_slope_stability_tier(fs_stable), SlopeStabilityTier.STABLE)

        # Flat slope (<0.1 deg): expect 99.0
        fs_flat = calculate_slope_factor_of_safety(slope_deg=0.05)
        self.assertEqual(fs_flat, 99.0)

        # Steep saturated slope: expect critical
        fs_critical = calculate_slope_factor_of_safety(
            slope_deg=45.0,
            cohesion_kpa=2.0,
            friction_angle_deg=25.0,
            unit_weight_soil=18.0,
            saturation_m=1.0,
            depth_m=4.0
        )
        self.assertLessEqual(fs_critical, 1.00)
        self.assertEqual(classify_slope_stability_tier(fs_critical), SlopeStabilityTier.FAILURE_CRITICAL)

        # Slope Stability Request with bbox conversion
        slope_req = SlopeStabilityRequest(
            asset_id="EMBANKMENT-SL-01",
            bbox=[-121.15, 37.02, -121.05, 37.08],
            cohesion_kpa=14.0
        )
        self.assertIsNotNone(slope_req.geometry)

        slope_resp = SlopeStabilityResponse(
            asset_id="EMBANKMENT-SL-01",
            mean_factor_of_safety=1.72,
            min_factor_of_safety=1.15,
            critical_area_hectares=1.8,
            stability_tier=SlopeStabilityTier.STABLE,
            tier_breakdown={"stable": 92.4, "marginally_stable": 5.8, "advisory": 1.8, "failure_critical": 0.0},
            tile_url_template="/api/v1/tiles/terrain/slope-stability/{z}/{x}/{y}.png",
            created_at="2026-09-24T12:00:00Z"
        )
        self.assertEqual(slope_resp.stability_tier, SlopeStabilityTier.STABLE)

    def test_harmonized_landsat_sentinel_hls_calibration_contracts(self):
        """Verify HLS cross-sensor spectral regression coefficients and harmonization transforms."""
        self.assertIn("blue", HLS_TRANSFORMATION_COEFFICIENTS)
        self.assertIn("green", HLS_TRANSFORMATION_COEFFICIENTS)
        self.assertIn("red", HLS_TRANSFORMATION_COEFFICIENTS)
        self.assertIn("nir", HLS_TRANSFORMATION_COEFFICIENTS)
        self.assertIn("swir1", HLS_TRANSFORMATION_COEFFICIENTS)
        self.assertIn("swir2", HLS_TRANSFORMATION_COEFFICIENTS)

        oli_nir = [0.300, 0.400, 0.500]
        # Forward transform (OLI to MSI): MSI = 0.9825 * OLI - 0.0183
        msi_nir = cross_calibrate_spectral_band(
            values=oli_nir,
            band_name="nir",
            source_platform=HLSPlatform.LANDSAT_OLI,
            target_platform=HLSPlatform.SENTINEL_MSI
        )
        self.assertEqual(len(msi_nir), 3)
        self.assertAlmostEqual(msi_nir[0], round(0.9825 * 0.300 - 0.0183, 4), places=3)

        # Inverse transform (MSI to OLI): OLI = (MSI - (-0.0183)) / 0.9825
        back_oli = cross_calibrate_spectral_band(
            values=msi_nir,
            band_name="nir",
            source_platform=HLSPlatform.SENTINEL_MSI,
            target_platform=HLSPlatform.LANDSAT_OLI
        )
        self.assertAlmostEqual(back_oli[0], 0.300, places=2)

        # Request & Response models
        hls_req = HLSBandCalibrationRequest(
            source_platform=HLSPlatform.LANDSAT_OLI,
            target_platform=HLSPlatform.SENTINEL_MSI,
            band_name="red",
            reflectance_values=[0.05, 0.12, 0.25]
        )
        self.assertEqual(hls_req.band_name, "red")

        hls_resp = HLSBandCalibrationResponse(
            source_platform=HLSPlatform.LANDSAT_OLI,
            target_platform=HLSPlatform.SENTINEL_MSI,
            band_name="red",
            calibrated_values=[0.0494, 0.1197, 0.2504],
            mean_calibrated=0.1398,
            bias_correction_applied=-0.0002,
            formula_applied="MSI = 1.0050 * OLI - 0.0009"
        )
        self.assertEqual(hls_resp.source_platform, HLSPlatform.LANDSAT_OLI)

    def test_water_quality_and_trophic_state_contracts(self):
        """Verify NDCI, NDTI, limnological trophic states, and water quality analysis schemas."""
        # NDCI formula: (B05 - B04)/(B05 + B04)
        ndci_val = calculate_ndci(red=0.040, rededge1=0.060)
        self.assertAlmostEqual(ndci_val, 0.200, places=3)

        # NDTI formula: (B04 - B03)/(B04 + B03)
        ndti_val = calculate_ndti(green=0.050, red=0.040)
        self.assertAlmostEqual(ndti_val, -0.111, places=3)

        # Trophic state classifications
        self.assertEqual(classify_trophic_state(-0.05), TrophicState.OLIGOTROPHIC)
        self.assertEqual(classify_trophic_state(0.08), TrophicState.MESOTROPHIC)
        self.assertEqual(classify_trophic_state(0.18), TrophicState.EUTROPHIC)
        self.assertEqual(classify_trophic_state(0.35), TrophicState.HYPEREUTROPHIC)

        # Request with bbox auto-conversion
        wq_req = WaterQualityAnalysisRequest(
            asset_id="SAN-LUIS-RESERVOIR",
            item_id="S2A_MSIL2A_20260901",
            bbox=[-121.15, 37.02, -121.05, 37.08],
            metric=WaterQualityMetric.NDCI
        )
        self.assertIsNotNone(wq_req.geometry)

        # Response
        wq_resp = WaterQualityAnalysisResponse(
            asset_id="SAN-LUIS-RESERVOIR",
            item_id="S2A_MSIL2A_20260901",
            primary_metric=WaterQualityMetric.NDCI,
            mean_value=0.075,
            estimated_chlorophyll_a_ugl=5.2,
            dominant_trophic_state=TrophicState.MESOTROPHIC,
            bloom_detected=False,
            bloom_area_hectares=8.5,
            trophic_breakdown=[
                TrophicCategoryDetail(state=TrophicState.OLIGOTROPHIC, label="Oligotrophic", area_hectares=1800.0, percentage=45.0, chl_a_range_ugl="< 2.6"),
                TrophicCategoryDetail(state=TrophicState.MESOTROPHIC, label="Mesotrophic", area_hectares=2000.0, percentage=50.0, chl_a_range_ugl="2.6 - 7.3"),
                TrophicCategoryDetail(state=TrophicState.EUTROPHIC, label="Eutrophic", area_hectares=200.0, percentage=5.0, chl_a_range_ugl="7.3 - 20.0")
            ],
            tile_url_template="/api/v1/tiles/water-quality/ndci/{z}/{x}/{y}.png",
            created_at="2026-09-24T12:00:00Z"
        )
        self.assertEqual(wq_resp.dominant_trophic_state, TrophicState.MESOTROPHIC)
        self.assertFalse(wq_resp.bloom_detected)

    def test_t67_canonical_route_contracts(self):
        """Verify format_api_route formatting for all 6 new T-67 canonical route contracts."""
        r1 = format_api_route("drone_gcp_quality")
        self.assertEqual(r1, "/api/v1/drone/gcp/quality")

        r2 = format_api_route("drone_camera_calibration", camera_id="DJI-P1-01")
        self.assertEqual(r2, "/api/v1/drone/camera/calibration/DJI-P1-01")

        r3 = format_api_route("analysis_twi")
        self.assertEqual(r3, "/api/v1/analysis/terrain/twi")

        r4 = format_api_route("analysis_slope_stability")
        self.assertEqual(r4, "/api/v1/analysis/terrain/slope-stability")

        r5 = format_api_route("analysis_hls_calibrate")
        self.assertEqual(r5, "/api/v1/analysis/hls/calibrate")

        r6 = format_api_route("analysis_water_quality")
        self.assertEqual(r6, "/api/v1/analysis/water-quality")

    def test_cyanobacteria_alert_and_bloom_risk(self):
        """Verify WHO / EPA cyanobacteria cell density and microcystin risk classification tiers."""
        self.assertEqual(CyanobacteriaAlertLevel.LOW.value, "low")
        self.assertEqual(CyanobacteriaAlertLevel.MODERATE.value, "moderate")
        self.assertEqual(CyanobacteriaAlertLevel.HIGH.value, "high")
        self.assertEqual(CyanobacteriaAlertLevel.VERY_HIGH.value, "very_high")

        # Classification thresholds
        self.assertEqual(classify_cyanobacteria_alert(4.5), CyanobacteriaAlertLevel.LOW)
        self.assertEqual(classify_cyanobacteria_alert(9.9), CyanobacteriaAlertLevel.LOW)
        self.assertEqual(classify_cyanobacteria_alert(10.0), CyanobacteriaAlertLevel.MODERATE)
        self.assertEqual(classify_cyanobacteria_alert(35.0), CyanobacteriaAlertLevel.MODERATE)
        self.assertEqual(classify_cyanobacteria_alert(50.0), CyanobacteriaAlertLevel.HIGH)
        self.assertEqual(classify_cyanobacteria_alert(85.0), CyanobacteriaAlertLevel.HIGH)
        self.assertEqual(classify_cyanobacteria_alert(100.0), CyanobacteriaAlertLevel.VERY_HIGH)
        self.assertEqual(classify_cyanobacteria_alert(250.0), CyanobacteriaAlertLevel.VERY_HIGH)

    def test_camera_calibration_presets(self):
        """Verify standard drone camera interior calibration parameter presets and lookup helpers."""
        self.assertIn("dji_zenmuse_p1_35mm", CAMERA_CALIBRATION_PRESETS)
        self.assertIn("dji_phantom_4_rtk", CAMERA_CALIBRATION_PRESETS)
        self.assertIn("dji_mavic_3_enterprise", CAMERA_CALIBRATION_PRESETS)
        self.assertIn("sony_rx1r_ii", CAMERA_CALIBRATION_PRESETS)

        # Lookup by key and by camera_id
        p1 = get_camera_calibration_preset("dji_zenmuse_p1_35mm")
        self.assertIsNotNone(p1)
        self.assertEqual(p1.camera_id, "DJI-ZENMUSE-P1-35MM")
        self.assertEqual(p1.focal_length_mm, 35.0)
        self.assertEqual(p1.principal_point_x_px, 4096.0)

        p1_by_id = get_camera_calibration_preset("DJI-ZENMUSE-P1-35MM")
        self.assertIsNotNone(p1_by_id)
        self.assertEqual(p1_by_id.focal_length_mm, 35.0)

        # List presets
        presets = list_camera_calibration_presets()
        self.assertEqual(len(presets), 4)
        for p in presets:
            self.assertGreater(p.focal_length_mm, 0.0)
            self.assertGreater(p.focal_length_px, 0.0)
            self.assertGreater(p.sensor_width_mm, 0.0)

    def test_soil_mechanics_presets_and_slope_stability(self):
        """Verify standard geotechnical soil mechanics presets and slope stability calculations."""
        self.assertIn("compacted_clay_core", SOIL_MECHANICS_PRESETS)
        self.assertIn("silty_sand_shell", SOIL_MECHANICS_PRESETS)
        self.assertIn("rockfill_embankment", SOIL_MECHANICS_PRESETS)
        self.assertIn("mine_tailings_silt", SOIL_MECHANICS_PRESETS)
        self.assertIn("compacted_earthfill", SOIL_MECHANICS_PRESETS)

        clay = get_soil_preset("compacted_clay_core")
        self.assertIsNotNone(clay)
        self.assertEqual(clay.cohesion_kpa, 25.0)
        self.assertEqual(clay.friction_angle_deg, 22.0)

        # Clay core on 25 degree slope: expect FS >= 1.5 (stable)
        fs_clay = calculate_slope_factor_of_safety(
            slope_deg=25.0,
            cohesion_kpa=clay.cohesion_kpa,
            friction_angle_deg=clay.friction_angle_deg,
            unit_weight_soil=clay.soil_unit_weight_kn_m3,
            saturation_m=0.3,
            depth_m=3.0
        )
        self.assertGreaterEqual(fs_clay, 1.50)

        # Mine tailings on 35 degree saturated slope: expect critical (FS <= 1.0)
        tailings = get_soil_preset("mine_tailings_silt")
        self.assertIsNotNone(tailings)
        fs_tailings = calculate_slope_factor_of_safety(
            slope_deg=35.0,
            cohesion_kpa=tailings.cohesion_kpa,
            friction_angle_deg=tailings.friction_angle_deg,
            unit_weight_soil=tailings.soil_unit_weight_kn_m3,
            saturation_m=0.9,
            depth_m=4.0
        )
        self.assertLessEqual(fs_tailings, 1.00)

        presets = list_soil_presets()
        self.assertEqual(len(presets), 5)

    def test_dynamic_tile_url_builders_for_terrain_and_water(self):
        """Verify dynamic XYZ streaming tile URL builders for TWI, slope stability, and water quality."""
        # TWI tile URL
        twi_url = build_twi_tile_url(12, 1042, 1628)
        self.assertEqual(twi_url, "/api/v1/tiles/terrain/twi/12/1042/1628.png?rescale=2.0,12.0&colormap=spectral")

        # Slope stability tile URL
        slope_url = build_slope_stability_tile_url(12, 1042, 1628)
        self.assertEqual(slope_url, "/api/v1/tiles/terrain/slope-stability/12/1042/1628.png?rescale=0.8,2.0&colormap=rdylbu")

        # Water quality generic tile URL
        wq_url = build_water_quality_tile_url("ndci", 12, 1042, 1628)
        self.assertEqual(wq_url, "/api/v1/tiles/water-quality/ndci/12/1042/1628.png?rescale=-0.1,0.4&colormap=spectral")

        # Water quality scene-specific tile URL
        wq_scene_url = build_water_quality_tile_url(
            metric=WaterQualityMetric.NDCI,
            z=12,
            x=1042,
            y=1628,
            collection="sentinel-2-l2a",
            item_id="S2A_MSIL2A_20260901"
        )
        self.assertEqual(wq_scene_url, "/api/v1/tiles/water-quality/sentinel-2-l2a/S2A_MSIL2A_20260901/ndci/12/1042/1628.png?rescale=-0.1,0.4&colormap=spectral")

    def test_canonical_route_contracts_expansion(self):
        """Verify format_api_route for all newly registered route contracts and aliases."""
        self.assertEqual(format_api_route("drone_gcp_geojson"), "/api/v1/drone/gcp/geojson")
        self.assertEqual(format_api_route("drone_gcp_quality_short"), "/api/v1/drone/gcp-quality")
        self.assertEqual(format_api_route("drone_camera_calibration_list"), "/api/v1/drone/camera/calibration")
        self.assertEqual(format_api_route("drone_camera_calibration_short"), "/api/v1/drone/camera-calibration")
        self.assertEqual(format_api_route("analysis_twi_short"), "/api/v1/analysis/twi")
        self.assertEqual(format_api_route("analysis_slope_stability_short"), "/api/v1/analysis/slope-stability")
        self.assertEqual(format_api_route("analysis_hls_calibrate_short"), "/api/v1/analysis/hls-calibrate")
        self.assertEqual(format_api_route("tiles_twi", z=12, x=100, y=200), "/api/v1/tiles/terrain/twi/12/100/200.png")
        self.assertEqual(format_api_route("tiles_slope_stability", z=12, x=100, y=200), "/api/v1/tiles/terrain/slope-stability/12/100/200.png")
        self.assertEqual(format_api_route("tiles_water_quality", metric="ndci", z=12, x=100, y=200), "/api/v1/tiles/water-quality/ndci/12/100/200.png")
        self.assertEqual(format_api_route("tiles_water_quality_scene", collection="sentinel-2-l2a", item_id="S2A_01", metric="ndci", z=12, x=100, y=200), "/api/v1/tiles/water-quality/sentinel-2-l2a/S2A_01/ndci/12/100/200.png")
        self.assertEqual(format_api_route("geotechnical_soil_presets"), "/api/v1/analysis/terrain/soil-presets")


    def test_parse_bbox_geojson_and_dict_features(self):
        """Verify parse_bbox handles GeoJSON Features, Geometries, nested bboxes, and directional keys."""
        # 1. GeoJSON Feature dictionary
        feature_dict = {
            "type": "Feature",
            "properties": {"name": "Test AOI"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.25, 37.05],
                    [-121.05, 37.05],
                    [-121.05, 37.15],
                    [-121.25, 37.15],
                    [-121.25, 37.05]
                ]]
            }
        }
        res_feat = parse_bbox(feature_dict)
        self.assertEqual(res_feat, (-121.25, 37.05, -121.05, 37.15))

        # 2. GeoJSON Geometry dictionary directly
        geom_dict = {
            "type": "Polygon",
            "coordinates": [[
                [-122.0, 38.0],
                [-121.8, 38.0],
                [-121.8, 38.2],
                [-122.0, 38.2],
                [-122.0, 38.0]
            ]]
        }
        res_geom = parse_bbox(geom_dict)
        self.assertEqual(res_geom, (-122.0, 38.0, -121.8, 38.2))

        # 3. Dict with nested bbox list
        nested_bbox_dict = {"bbox": [-120.5, 36.5, -120.0, 37.0]}
        res_nested = parse_bbox(nested_bbox_dict)
        self.assertEqual(res_nested, (-120.5, 36.5, -120.0, 37.0))

        # 4. Dict with west/south/east/north
        cardinal_dict = {"west": -121.5, "south": 37.1, "east": -121.0, "north": 37.4}
        res_card = parse_bbox(cardinal_dict)
        self.assertEqual(res_card, (-121.5, 37.1, -121.0, 37.4))

        # 5. Dict with min_x/min_y/max_x/max_y
        minmax_dict = {"min_x": -121.4, "min_y": 36.8, "max_x": -120.8, "max_y": 37.2}
        res_minmax = parse_bbox(minmax_dict)
        self.assertEqual(res_minmax, (-121.4, 36.8, -120.8, 37.2))

    def test_no_circular_imports(self):
        """Verify schemas and config can be imported alongside all application modules without cycle."""
        import app.config
        import app.models.schemas
        import app.database
        import app.api.api
        import app.services.indices
        import app.services.preprocessing
        import app.services.timeseries
        import app.services.alerting
        import main
        self.assertIsNotNone(main.app)

    def test_t74_canonical_route_contracts(self):
        """Verify all 14 T-74 API route contracts are registered in API_ROUTE_CONTRACTS."""
        t74_routes = [
            "analysis_lst_transfer",
            "analysis_lst_transfer_short",
            "tiles_thermal_lst",
            "analysis_topographic_correction",
            "analysis_topographic_correction_short",
            "analysis_insar_displacement",
            "analysis_insar_displacement_short",
            "analysis_insar_coherence",
            "analysis_insar_coherence_short",
            "tiles_sar_insar",
            "analysis_phenology_extract",
            "analysis_phenology_extract_short",
            "analysis_composites_bap",
            "analysis_composites_bap_short",
        ]
        for route_key in t74_routes:
            self.assertIn(route_key, API_ROUTE_CONTRACTS, f"Missing route contract: {route_key}")

        # Test format_api_route parameter substitution
        formatted_lst = format_api_route("tiles_thermal_lst", collection="landsat-c2-l2", item_id="LC09_044034", z=11, x=650, y=1240)
        self.assertEqual(formatted_lst, "/api/v1/tiles/thermal/lst/landsat-c2-l2/LC09_044034/11/650/1240.png")

        formatted_insar = format_api_route("tiles_sar_insar", pair_id="PAIR-S1-01", z=12, x=1300, y=2480)
        self.assertEqual(formatted_insar, "/api/v1/tiles/sar/insar/PAIR-S1-01/12/1300/2480.png")

    def test_land_surface_temperature_contracts_and_math(self):
        """Verify LST radiometric transfer formulas, emissivity, FVC, and hazard classification."""
        # 1. Fractional Vegetation Cover (FVC)
        fvc_zero = calculate_fractional_vegetation_cover(0.04, ndvi_soil=0.05, ndvi_veg=0.70)
        self.assertEqual(fvc_zero, 0.0)
        fvc_one = calculate_fractional_vegetation_cover(0.75, ndvi_soil=0.05, ndvi_veg=0.70)
        self.assertEqual(fvc_one, 1.0)
        fvc_mid = calculate_fractional_vegetation_cover(0.45, ndvi_soil=0.05, ndvi_veg=0.70)
        self.assertAlmostEqual(fvc_mid, 0.3787, places=3)

        # 2. Land Surface Emissivity (LSE)
        eps_bare = calculate_land_surface_emissivity(0.03, 0.0, eps_soil=0.97, eps_veg=0.99)
        self.assertEqual(eps_bare, 0.97)
        eps_dense = calculate_land_surface_emissivity(0.75, 1.0, eps_soil=0.97, eps_veg=0.99)
        self.assertEqual(eps_dense, 0.99)
        eps_mixed = calculate_land_surface_emissivity(0.45, fvc_mid, eps_soil=0.97, eps_veg=0.99)
        self.assertGreater(eps_mixed, 0.97)
        self.assertLess(eps_mixed, 1.0)

        # 3. Single-channel Planck inversion (Artis & Carnahan)
        ts_k = calculate_lst_single_channel(brightness_temp_k=305.15, emissivity=eps_mixed)
        self.assertGreater(ts_k, 300.0)
        self.assertLess(ts_k, 320.0)

        # 4. Thermal hazard level classification
        self.assertEqual(classify_heat_hazard_level(43.5, 7.0), HeatHazardLevel.EXTREME_HEAT)
        self.assertEqual(classify_heat_hazard_level(37.0, 3.5), HeatHazardLevel.HIGH_HEAT)
        self.assertEqual(classify_heat_hazard_level(31.5, 1.2), HeatHazardLevel.MODERATE_HEAT)
        self.assertEqual(classify_heat_hazard_level(24.0, 0.0), HeatHazardLevel.NORMAL)

        # 5. Pydantic request & response validation
        req = LSTAnalysisRequest(
            collection=SatelliteCollection.LANDSAT_C2_L2,
            item_id="LC09_L2SP_044034_20260810",
            method=LSTCalculationMethod.SINGLE_CHANNEL,
            bbox=[-121.2, 36.95, -120.95, 37.15]
        )
        self.assertEqual(req.collection, SatelliteCollection.LANDSAT_C2_L2)
        self.assertEqual(req.method, LSTCalculationMethod.SINGLE_CHANNEL)

        resp = LSTAnalysisResponse(
            item_id=req.item_id,
            method=req.method,
            mean_lst_c=32.4,
            min_lst_c=24.1,
            max_lst_c=41.8,
            mean_lst_k=305.55,
            mean_emissivity=0.985,
            mean_fvc=0.45,
            uhi_intensity_c=4.4,
            heat_hazard_level=HeatHazardLevel.HIGH_HEAT,
            pixel_count=125000,
            tile_url_template="/api/v1/tiles/thermal/lst/landsat-c2-l2/LC09_044034/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.heat_hazard_level, HeatHazardLevel.HIGH_HEAT)
        self.assertEqual(resp.pixel_count, 125000)

        # 6. Dynamic tile URL builder
        tile_url = build_lst_tile_url("landsat-c2-l2", "LC09_044034", 12, 650, 1240)
        self.assertIn("/api/v1/tiles/thermal/lst/landsat-c2-l2/LC09_044034/12/650/1240.png", tile_url)

    def test_topographic_illumination_correction_contracts_and_math(self):
        """Verify solar illumination incidence angle (cos i) and semi-empirical C-correction."""
        # 1. Illumination incidence angle
        # Flat horizontal surface (slope=0): cos(i) = cos(theta_s)
        cos_i_flat = calculate_illumination_angle(solar_zenith_deg=30.0, solar_azimuth_deg=180.0, slope_deg=0.0, aspect_deg=0.0)
        self.assertAlmostEqual(cos_i_flat, math.cos(math.radians(30.0)), places=3)

        # Sun-facing 20 degree slope: cos(i) > cos(theta_s)
        cos_i_sun = calculate_illumination_angle(solar_zenith_deg=40.0, solar_azimuth_deg=180.0, slope_deg=20.0, aspect_deg=180.0)
        self.assertGreater(cos_i_sun, math.cos(math.radians(40.0)))

        # 2. C-correction application
        rad_corrected = apply_topographic_c_correction(radiance=0.25, cos_i=cos_i_sun, solar_zenith_deg=40.0, c_param=0.18)
        self.assertGreater(rad_corrected, 0.0)
        self.assertLess(rad_corrected, 1.0)

        # 3. Pydantic request & response
        req = TopographicCorrectionRequest(
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_MSIL2A_20260820",
            model=TopographicCorrectionModel.C_CORRECTION,
            solar_zenith_deg=38.5,
            solar_azimuth_deg=142.0,
            c_parameter=0.18
        )
        self.assertEqual(req.model, TopographicCorrectionModel.C_CORRECTION)

        resp = TopographicCorrectionResponse(
            item_id=req.item_id,
            model=req.model,
            solar_zenith_deg=req.solar_zenith_deg,
            solar_azimuth_deg=req.solar_azimuth_deg,
            c_parameter_used=0.18,
            minnaert_k_used=0.75,
            mean_illumination_cos=0.745,
            mean_reflectance_before=0.280,
            mean_reflectance_after=0.225,
            topographic_shadow_area_pct=3.8
        )
        self.assertEqual(resp.status, "corrected")
        self.assertAlmostEqual(resp.mean_illumination_cos, 0.745)

    def test_sentinel1_insar_displacement_and_coherence_contracts_and_math(self):
        """Verify Sentinel-1 DInSAR displacement, deformation rate, coherence, and risk tiers."""
        # 1. Line-of-sight displacement from differential phase
        # Differential phase = +1.5 rad -> negative displacement (subsidence)
        disp_sub = calculate_insar_displacement_mm(diff_phase_rad=1.5, wavelength_mm=55.465)
        self.assertLess(disp_sub, 0.0)
        self.assertAlmostEqual(disp_sub, -6.62, places=1)

        # Differential phase = -1.5 rad -> positive displacement (uplift)
        disp_up = calculate_insar_displacement_mm(diff_phase_rad=-1.5, wavelength_mm=55.465)
        self.assertGreater(disp_up, 0.0)
        self.assertAlmostEqual(disp_up, 6.62, places=1)

        # 2. Velocity annualization
        vel_yr = calculate_insar_velocity_mm_yr(disp_sub, temporal_baseline_days=12.0)
        self.assertLess(vel_yr, -100.0)

        # 3. Deformation tier classification
        self.assertEqual(classify_insar_deformation_tier(15.0), InSARDeformationTier.UPLIFT)
        self.assertEqual(classify_insar_deformation_tier(0.0), InSARDeformationTier.STABLE)
        self.assertEqual(classify_insar_deformation_tier(-10.0), InSARDeformationTier.MINOR_SUBSIDENCE)
        self.assertEqual(classify_insar_deformation_tier(-25.0), InSARDeformationTier.MODERATE_SUBSIDENCE)
        self.assertEqual(classify_insar_deformation_tier(-45.0), InSARDeformationTier.SEVERE_SUBSIDENCE)
        self.assertEqual(classify_insar_deformation_tier(-75.0), InSARDeformationTier.CRITICAL_FAILURE)

        # 4. Pydantic request & response
        req = InSARDisplacementRequest(
            primary_scene_id="S1A_IW_SLC__1SDV_20260808",
            secondary_scene_id="S1A_IW_SLC__1SDV_20260820",
            temporal_baseline_days=12.0,
            perpendicular_baseline_m=45.0
        )
        self.assertEqual(req.temporal_baseline_days, 12.0)

        resp = InSARDisplacementResponse(
            pair_id="PAIR-S1-20260808-20260820",
            primary_scene_id=req.primary_scene_id,
            secondary_scene_id=req.secondary_scene_id,
            temporal_baseline_days=12.0,
            perpendicular_baseline_m=45.0,
            mean_coherence=0.72,
            mean_displacement_mm=-3.4,
            max_subsidence_mm=-19.2,
            max_uplift_mm=1.8,
            mean_velocity_mm_yr=-103.5,
            deformation_tier=InSARDeformationTier.MODERATE_SUBSIDENCE,
            stable_area_pct=81.2,
            tile_url_template="/api/v1/tiles/sar/insar/PAIR-S1-01/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.deformation_tier, InSARDeformationTier.MODERATE_SUBSIDENCE)

        # 5. Coherence request & response
        coh_req = InSARCoherenceRequest(primary_scene_id=req.primary_scene_id, secondary_scene_id=req.secondary_scene_id)
        coh_resp = InSARCoherenceResponse(
            pair_id="PAIR-S1-20260808-20260820",
            mean_coherence=0.72,
            high_coherence_pct=68.5,
            decorrelated_pct=9.4,
            structural_stability_score=89.2
        )
        self.assertEqual(coh_resp.high_coherence_pct, 68.5)

        # 6. Tile builder
        tile_url = build_insar_tile_url("PAIR-S1-01", 11, 650, 1240)
        self.assertIn("/api/v1/tiles/sar/insar/PAIR-S1-01/11/650/1240.png", tile_url)

    def test_phenological_harmonic_analysis_and_phenometrics(self):
        """Verify Harmonic Analysis of Time Series (HATS) Fourier fitting and phenometrics derivation."""
        # 1. Fallback fitting
        fb = fit_harmonic_phenology([], [])
        self.assertIn("phenometrics", fb)
        self.assertEqual(fb["phenometrics"]["sos_doy"], 105)
        self.assertEqual(fb["phenometrics"]["pos_doy"], 210)

        # 2. Realistic time series observations
        doys = [30, 75, 120, 165, 210, 255, 300, 345]
        vis = [0.20, 0.28, 0.52, 0.68, 0.65, 0.42, 0.25, 0.21]
        fit = fit_harmonic_phenology(doys, vis)
        p = fit["phenometrics"]
        self.assertGreater(p["peak_level"], p["base_level"])
        self.assertGreater(p["amplitude"], 0.1)
        self.assertLess(p["sos_doy"], p["pos_doy"])
        self.assertGreater(p["eos_doy"], p["pos_doy"])
        self.assertEqual(p["los_days"], p["eos_doy"] - p["sos_doy"])
        self.assertGreater(len(fit["curve_points"]), 10)

        # 3. Pydantic request & response
        req = PhenologyAnalysisRequest(
            aoi_name="San Luis Reservoir Watershed",
            metric="ndvi",
            fit_model=PhenologyFitModel.HARMONIC_HATS,
            harmonic_terms=2
        )
        self.assertEqual(req.fit_model, PhenologyFitModel.HARMONIC_HATS)

        resp = PhenologyAnalysisResponse(
            aoi_name=req.aoi_name,
            metric=req.metric,
            fit_model=req.fit_model,
            phenometrics=Phenometrics(**p),
            r_squared=0.92,
            climatological_anomaly_z=-0.35,
            curve_points=fit["curve_points"]
        )
        self.assertEqual(resp.r_squared, 0.92)
        self.assertAlmostEqual(resp.climatological_anomaly_z, -0.35)

    def test_best_available_pixel_bap_compositing_contracts(self):
        """Verify Best Available Pixel (BAP) multi-criteria scoring weights and composite request schemas."""
        weights = BAPScoringWeights(
            cloud_dist_weight=0.40,
            target_doy_weight=0.30,
            sensor_zenith_weight=0.15,
            opacity_weight=0.15
        )
        self.assertEqual(weights.cloud_dist_weight, 0.40)

        req = BAPCompositeRequest(
            collection=SatelliteCollection.SENTINEL_2,
            item_ids=["S2A_10SEJ_20260715", "S2B_10SEJ_20260720", "S2A_10SEJ_20260725"],
            target_doy=205,
            scoring_weights=weights
        )
        self.assertEqual(len(req.item_ids), 3)
        self.assertEqual(req.target_doy, 205)

        resp = BAPCompositeResponse(
            composite_id="BAP-S2-2026-DOY205",
            collection=req.collection,
            scenes_evaluated=3,
            target_doy=205,
            mean_pixel_score=0.912,
            valid_pixel_pct=99.8,
            tile_url_template="/api/v1/tiles/composite/BAP-S2-2026-DOY205/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.scenes_evaluated, 3)
        self.assertAlmostEqual(resp.valid_pixel_pct, 99.8)

    def test_t75_canonical_route_contracts(self):
        """Verify registration and dynamic formatting for all T-75 canonical API routes."""
        self.assertIn("analysis_coregistration", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_coregistration_short", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_point_cloud_filter", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_point_cloud_chm", API_ROUTE_CONTRACTS)
        self.assertIn("tiles_point_cloud_chm", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_true_ortho_occlusion", API_ROUTE_CONTRACTS)
        self.assertIn("analysis_ortho_seamlines", API_ROUTE_CONTRACTS)
        self.assertIn("tiles_true_ortho", API_ROUTE_CONTRACTS)
        self.assertIn("byoc_buckets", API_ROUTE_CONTRACTS)
        self.assertIn("byoc_bucket_detail", API_ROUTE_CONTRACTS)
        self.assertIn("byoc_bucket_sync", API_ROUTE_CONTRACTS)
        self.assertIn("tiles_byoc", API_ROUTE_CONTRACTS)

        # Test parameter substitutions
        chm_tile = format_api_route("tiles_point_cloud_chm", asset_id="DAM-01", z=14, x=2500, y=5800)
        self.assertEqual(chm_tile, "/api/v1/tiles/terrain/chm/DAM-01/14/2500/5800.png")

        ortho_tile = format_api_route("tiles_true_ortho", mosaic_id="MOSAIC-01", z=15, x=5000, y=11600)
        self.assertEqual(ortho_tile, "/api/v1/tiles/ortho/true/MOSAIC-01/15/5000/11600.png")

        byoc_tile = format_api_route("tiles_byoc", bucket_id="b-101", item_id="item-55", z=12, x=1024, y=2048)
        self.assertEqual(byoc_tile, "/api/v1/tiles/byoc/b-101/item-55/12/1024/2048.png")

        bucket_sync = format_api_route("byoc_bucket_sync", bucket_id="b-101")
        self.assertEqual(bucket_sync, "/api/v1/byoc/buckets/b-101/sync")

    def test_sub_pixel_coregistration_contracts_and_math(self):
        """Verify sub-pixel phase correlation mathematical calculation, enums, and request/response models."""
        # 1. Enums
        self.assertEqual(CoRegistrationResamplingKernel.CUBIC.value, "cubic")
        self.assertEqual(CoRegistrationResamplingKernel.LANCZOS.value, "lanczos")
        self.assertEqual(CoRegistrationStatus.SUB_PIXEL_ALIGNED.value, "sub_pixel_aligned")
        self.assertEqual(CoRegistrationStatus.CONVERGED.value, "converged")

        # 2. Mathematical shift displacement
        # 0.15 px in X, -0.20 px in Y on a 10m grid -> 1.5m in X, -2.0m in Y, total 2.5m
        shift = calculate_phase_correlation_shift(0.15, -0.20, pixel_size_m=10.0)
        self.assertEqual(shift["shift_x_px"], 0.15)
        self.assertEqual(shift["shift_y_px"], -0.20)
        self.assertEqual(shift["shift_x_m"], 1.5)
        self.assertEqual(shift["shift_y_m"], -2.0)
        self.assertEqual(shift["total_shift_m"], 2.5)

        # 3. Pydantic request and response
        req = CoRegistrationRequest(
            reference_scene_id="S2A_10SEJ_20260715",
            target_scene_id="S2B_10SEJ_20260720",
            window_size_px=256,
            grid_spacing_px=128,
            resampling_kernel=CoRegistrationResamplingKernel.CUBIC,
            max_shift_px=15.0,
            coherence_min=0.40
        )
        self.assertEqual(req.resampling_kernel, CoRegistrationResamplingKernel.CUBIC)

        resp = CoRegistrationResponse(
            reference_scene_id=req.reference_scene_id,
            target_scene_id=req.target_scene_id,
            status=CoRegistrationStatus.SUB_PIXEL_ALIGNED,
            shift_x_px=shift["shift_x_px"],
            shift_y_px=shift["shift_y_px"],
            shift_x_m=shift["shift_x_m"],
            shift_y_m=shift["shift_y_m"],
            total_shift_m=shift["total_shift_m"],
            rmse_px=0.045,
            valid_tie_points=128,
            resampling_applied=CoRegistrationResamplingKernel.CUBIC
        )
        self.assertEqual(resp.status, CoRegistrationStatus.SUB_PIXEL_ALIGNED)
        self.assertEqual(resp.valid_tie_points, 128)
        self.assertAlmostEqual(resp.total_shift_m, 2.5)

    def test_point_cloud_filtering_and_canopy_height_model(self):
        """Verify LiDAR/SfM point cloud classification, progressive morphological filtering, and CHM derivation."""
        # 1. Enums
        self.assertEqual(ElevationModelType.CHM.value, "chm")
        self.assertEqual(PointCloudFormat.COPC.value, "copc")
        self.assertEqual(PointClassificationCode.GROUND.value, 2)
        self.assertEqual(PointClassificationCode.HIGH_VEGETATION.value, 5)

        # 2. Mathematical CHM calculation
        chm_val = calculate_canopy_height_model(dsm_elev=125.4, dtm_elev=110.2)
        self.assertAlmostEqual(chm_val, 15.2, places=2)

        # Non-negative clamping
        chm_clamped = calculate_canopy_height_model(dsm_elev=100.0, dtm_elev=105.0)
        self.assertEqual(chm_clamped, 0.0)

        # 3. Tile URL builder
        tile_url = build_chm_tile_url("SAN-LUIS-DAM-01", 14, 2500, 5800, rescale="0.0,20.0", colormap="viridis")
        self.assertIn("/api/v1/tiles/terrain/chm/SAN-LUIS-DAM-01/14/2500/5800.png", tile_url)
        self.assertIn("rescale=0.0,20.0", tile_url)

        # 4. Point filter request & response
        filter_params = PointFilterParameters(cell_size_m=1.0, slope_threshold_pct=30.0)
        req = PointFilterRequest(
            point_cloud_id="PC-SLD-2026-01",
            format=PointCloudFormat.COPC,
            filter_params=filter_params
        )
        self.assertEqual(req.point_cloud_id, "PC-SLD-2026-01")

        resp = PointFilterResponse(
            point_cloud_id=req.point_cloud_id,
            total_points=12450000,
            ground_points=7850000,
            non_ground_points=4600000,
            ground_ratio_pct=63.05,
            dtm_resolution_m=1.0,
            classified_copc_url="/api/v1/point-cloud/copc/PC-SLD-2026-01.copc.laz"
        )
        self.assertEqual(resp.total_points, 12450000)
        self.assertAlmostEqual(resp.ground_ratio_pct, 63.05)

        # 5. CHM Analysis request & response
        chm_req = CHMAnalysisRequest(
            asset_id="SAN-LUIS-DAM-01",
            dsm_item_id="DSM-SL-01",
            dtm_item_id="DTM-SL-01",
            grid_resolution_m=1.0
        )
        chm_resp = CHMAnalysisResponse(
            asset_id=chm_req.asset_id,
            mean_height_m=3.45,
            max_height_m=18.2,
            vegetation_area_ha=14.8,
            infrastructure_encroachment_ha=1.25,
            height_percentiles={"p50": 2.1, "p75": 4.8, "p90": 9.6, "p95": 14.2},
            tile_url_template="/api/v1/tiles/terrain/chm/SAN-LUIS-DAM-01/{z}/{x}/{y}.png"
        )
        self.assertEqual(chm_resp.max_height_m, 18.2)
        self.assertEqual(chm_resp.height_percentiles["p95"], 14.2)

    def test_true_orthorectification_and_seamline_optimization(self):
        """Verify visibility ray-tracing occlusion masking, graph-cut seamline energy, and blending contracts."""
        # 1. Enums
        self.assertEqual(SeamlineAlgorithm.GRAPH_CUT_ENERGY.value, "graph_cut_energy")
        self.assertEqual(RadiometricBlendingMode.MULTI_BAND_PYRAMID.value, "multi_band_pyramid")

        # 2. Mathematical seamline energy cost
        # E = 0.6 * 0.10 + 0.4 * 0.05 = 0.06 + 0.02 = 0.08
        energy = calculate_seamline_energy(color_diff=0.10, gradient_diff=0.05, weight_color=0.6, weight_grad=0.4)
        self.assertAlmostEqual(energy, 0.08, places=4)

        # 3. Tile URL builder
        ortho_tile = build_true_ortho_tile_url("MOSAIC-01", 15, 5000, 11600)
        self.assertEqual(ortho_tile, "/api/v1/tiles/ortho/true/MOSAIC-01/15/5000/11600.png")

        # 4. Occlusion mask request & response
        occ_req = OcclusionMaskRequest(
            ortho_id="DRONE-SL-01",
            dsm_id="DSM-SL-01",
            sun_zenith_deg=35.0,
            sun_azimuth_deg=135.0
        )
        occ_resp = OcclusionMaskResponse(
            ortho_id=occ_req.ortho_id,
            occluded_pixel_count=14200,
            occluded_area_pct=2.45,
            true_ortho_ready=True
        )
        self.assertTrue(occ_resp.true_ortho_ready)
        self.assertEqual(occ_resp.occluded_pixel_count, 14200)

        # 5. Seamline optimization request & response
        seam_req = SeamlineOptimizationRequest(
            granule_ids=["GRANULE-01", "GRANULE-02", "GRANULE-03"],
            algorithm=SeamlineAlgorithm.GRAPH_CUT_ENERGY,
            blending_mode=RadiometricBlendingMode.MULTI_BAND_PYRAMID,
            feather_buffer_px=15
        )
        seam_resp = SeamlineOptimizationResponse(
            mosaic_id="MOSAIC-DRONE-SL-2026",
            seamline_count=8,
            total_seamline_length_m=1450.0,
            algorithm_applied=seam_req.algorithm,
            mean_radiometric_gradient_difference=0.018,
            tile_url_template="/api/v1/tiles/ortho/true/MOSAIC-DRONE-SL-2026/{z}/{x}/{y}.png"
        )
        self.assertEqual(seam_resp.seamline_count, 8)
        self.assertAlmostEqual(seam_resp.total_seamline_length_m, 1450.0)

    def test_bring_your_own_cog_byoc_storage_catalog(self):
        """Verify enterprise Bring Your Own COG (BYOC) S3/GCS bucket registration and catalog sync models."""
        # 1. Enums
        self.assertEqual(BYOCStorageProvider.AWS_S3.value, "aws_s3")
        self.assertEqual(BYOCStorageProvider.GOOGLE_CLOUD_STORAGE.value, "gcs")
        self.assertEqual(BYOCSyncStatus.READY.value, "ready")
        self.assertEqual(BYOCSyncStatus.CONNECTED.value, "connected")

        # 2. Dynamic BYOC tile URL builder
        byoc_url = build_byoc_tile_url("bucket-99", "cog-item-01", 14, 2500, 5800, rescale="0,255", colormap="viridis")
        self.assertIn("/api/v1/tiles/byoc/bucket-99/cog-item-01/14/2500/5800.png", byoc_url)
        self.assertIn("rescale=0,255", byoc_url)
        self.assertIn("colormap=viridis", byoc_url)

        # 3. Bucket registration request & response
        reg_req = BYOCBucketRegistrationRequest(
            bucket_name="my-drone-surveys-bucket",
            provider=BYOCStorageProvider.AWS_S3,
            region="us-west-2",
            display_name="San Luis Reservoir UAS Surveys"
        )
        reg_resp = BYOCBucketRegistrationResponse(
            bucket_id="byoc-s3-drone-vault-01",
            bucket_name=reg_req.bucket_name,
            provider=reg_req.provider,
            status=BYOCSyncStatus.CONNECTED
        )
        self.assertEqual(reg_resp.bucket_id, "byoc-s3-drone-vault-01")
        self.assertEqual(reg_resp.status, BYOCSyncStatus.CONNECTED)

        # 4. Catalog item & sync response
        item = BYOCCatalogItem(
            item_id="byoc-cog-sl-toe-01",
            bucket_id=reg_resp.bucket_id,
            relative_path="surveys/san_luis/sl_toe_2cm.tif",
            file_size_bytes=482000000,
            crs="EPSG:32610",
            bbox=(-121.085, 37.052, -121.065, 37.068),
            resolution_m=0.025,
            band_count=4,
            is_valid_cog=True
        )
        self.assertTrue(item.is_valid_cog)
        self.assertEqual(item.resolution_m, 0.025)

        sync_resp = BYOCCatalogSyncResponse(
            bucket_id=reg_resp.bucket_id,
            status=BYOCSyncStatus.READY,
            total_cogs_discovered=24,
            total_valid_cogs=24,
            synced_items=[item]
        )
        self.assertEqual(sync_resp.total_cogs_discovered, 24)
        self.assertEqual(len(sync_resp.synced_items), 1)

    def test_t82_canonical_route_contracts(self):
        """Verify T-82 canonical route registrations and dynamic parameter formatting."""
        # 1. Verification of all 13 canonical route contracts
        t82_routes = [
            ("analysis_mann_kendall", "/api/v1/analysis/timeseries/mann-kendall"),
            ("analysis_mann_kendall_short", "/analysis/timeseries/mann-kendall"),
            ("analysis_atmospheric_dos1", "/api/v1/analysis/atmospheric/dos1"),
            ("analysis_atmospheric_dos1_short", "/analysis/atmospheric/dos1"),
            ("analysis_cva", "/api/v1/analysis/change/cva"),
            ("analysis_cva_short", "/analysis/change/cva"),
            ("tiles_cva", "/api/v1/tiles/change/cva/{pre_scene_id}/{post_scene_id}/{z}/{x}/{y}.png"),
            ("analysis_soil_salinity", "/api/v1/analysis/soil/salinity"),
            ("analysis_soil_salinity_short", "/analysis/soil/salinity"),
            ("tiles_soil_salinity", "/api/v1/tiles/soil/salinity/{collection}/{item_id}/{metric}/{z}/{x}/{y}.png"),
            ("analysis_thermal_hotspots", "/api/v1/analysis/thermal/hotspots"),
            ("analysis_thermal_hotspots_short", "/analysis/thermal/hotspots"),
            ("tiles_thermal_hotspots", "/api/v1/tiles/thermal/hotspots/{collection}/{item_id}/{z}/{x}/{y}.png")
        ]
        for key, expected_path in t82_routes:
            self.assertIn(key, API_ROUTE_CONTRACTS)
            self.assertEqual(API_ROUTE_CONTRACTS[key], expected_path)

        # 2. Dynamic parameter formatting via format_api_route
        cva_tile = format_api_route("tiles_cva", pre_scene_id="S2A_20250601", post_scene_id="S2B_20260601", z=14, x=2500, y=5800)
        self.assertEqual(cva_tile, "/api/v1/tiles/change/cva/S2A_20250601/S2B_20260601/14/2500/5800.png")

        salinity_tile = format_api_route("tiles_soil_salinity", collection="sentinel-2-l2a", item_id="S2A_2026", metric="ndsi", z=12, x=1200, y=2400)
        self.assertEqual(salinity_tile, "/api/v1/tiles/soil/salinity/sentinel-2-l2a/S2A_2026/ndsi/12/1200/2400.png")

        hotspot_tile = format_api_route("tiles_thermal_hotspots", collection="landsat-c2-l2", item_id="LC09_2026", z=10, x=300, y=600)
        self.assertEqual(hotspot_tile, "/api/v1/tiles/thermal/hotspots/landsat-c2-l2/LC09_2026/10/300/600.png")

    def test_mann_kendall_trend_contracts_and_math(self):
        """Verify non-parametric Mann-Kendall trend detection and Sen's slope calculation."""
        # 1. Enums
        self.assertEqual(TrendDirection.INCREASING.value, "increasing")
        self.assertEqual(TrendDirection.DECREASING.value, "decreasing")
        self.assertEqual(TrendDirection.STABLE.value, "stable")
        self.assertEqual(TrendSignificanceTier.HIGHLY_SIGNIFICANT.value, "highly_significant")
        self.assertEqual(TrendSignificanceTier.NOT_SIGNIFICANT.value, "not_significant")

        # 2. Math - Monotonic increasing series
        inc_data = [0.12, 0.20, 0.28, 0.35, 0.44, 0.52, 0.61, 0.70]
        res_inc = calculate_mann_kendall_trend(inc_data, alpha=0.05)
        self.assertGreater(res_inc["s_statistic"], 0)
        self.assertEqual(res_inc["direction"], TrendDirection.INCREASING.value)
        self.assertTrue(res_inc["is_significant"])
        self.assertGreater(res_inc["sens_slope"], 0.0)
        self.assertIn(res_inc["significance_tier"], [TrendSignificanceTier.HIGHLY_SIGNIFICANT.value, TrendSignificanceTier.SIGNIFICANT.value])

        # 3. Math - Monotonic decreasing series
        dec_data = [0.80, 0.72, 0.63, 0.55, 0.44, 0.35, 0.25, 0.15]
        res_dec = calculate_mann_kendall_trend(dec_data, alpha=0.05)
        self.assertLess(res_dec["s_statistic"], 0)
        self.assertEqual(res_dec["direction"], TrendDirection.DECREASING.value)
        self.assertTrue(res_dec["is_significant"])
        self.assertLess(res_dec["sens_slope"], 0.0)

        # 4. Math - Flat series (ties)
        flat_data = [0.45, 0.45, 0.45, 0.45, 0.45]
        res_flat = calculate_mann_kendall_trend(flat_data, alpha=0.05)
        self.assertEqual(res_flat["s_statistic"], 0.0)
        self.assertEqual(res_flat["direction"], TrendDirection.STABLE.value)
        self.assertFalse(res_flat["is_significant"])

        # 5. Math - Short series (< 3 observations)
        res_short = calculate_mann_kendall_trend([0.1, 0.2])
        self.assertEqual(res_short["sample_size"], 2)
        self.assertFalse(res_short["is_significant"])

        # 6. Pydantic request & response
        req = MannKendallAnalysisRequest(
            values=inc_data,
            metric_name="ndvi",
            alpha=0.05
        )
        self.assertEqual(req.metric_name, "ndvi")

        resp = MannKendallAnalysisResponse(
            metric_name=req.metric_name,
            sample_size=res_inc["sample_size"],
            s_statistic=res_inc["s_statistic"],
            variance_s=res_inc["variance_s"],
            z_score=res_inc["z_score"],
            p_value=res_inc["p_value"],
            kendall_tau=res_inc["kendall_tau"],
            sens_slope=res_inc["sens_slope"],
            annual_change_rate=res_inc["annual_change_rate"],
            direction=TrendDirection(res_inc["direction"]),
            significance_tier=TrendSignificanceTier(res_inc["significance_tier"]),
            is_significant=res_inc["is_significant"]
        )
        self.assertEqual(resp.direction, TrendDirection.INCREASING)
        self.assertTrue(resp.is_significant)

    def test_dos1_atmospheric_correction_contracts_and_math(self):
        """Verify Dark Object Subtraction (DOS1) Chavez radiative transfer models."""
        # 1. Enum
        self.assertEqual(AtmosphericCorrectionModel.DOS1.value, "dos1")
        self.assertEqual(AtmosphericCorrectionModel.APPARENT_REFLECTANCE.value, "apparent_reflectance")

        # 2. Math - Normal BOA reflectance calculation
        # Radiance 45.0 W/(m^2*sr*um), haze 12.0, solar zenith 30 deg, ESUN 1969
        boa_rho = calculate_dos1_surface_reflectance(
            radiance=45.0,
            path_radiance=12.0,
            solar_zenith_deg=30.0,
            esun=1969.0,
            earth_sun_dist_au=1.0,
            tau_v=1.0
        )
        self.assertGreater(boa_rho, 0.0)
        self.assertLess(boa_rho, 1.0)

        # 3. Math - Edge cases: radiance <= haze, night/grazing solar zenith
        zero_rho = calculate_dos1_surface_reflectance(radiance=10.0, path_radiance=15.0, solar_zenith_deg=30.0)
        self.assertEqual(zero_rho, 0.0)

        grazing_rho = calculate_dos1_surface_reflectance(radiance=50.0, path_radiance=10.0, solar_zenith_deg=90.0)
        self.assertEqual(grazing_rho, 0.0)

        # 4. Request & response models
        req = DOS1CorrectionRequest(
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_MSIL2A_20260714",
            sun_zenith_deg=32.5,
            earth_sun_distance_au=1.016,
            dark_object_dn_threshold=120,
            bands=["blue", "green", "red", "nir"]
        )
        self.assertEqual(req.item_id, "S2A_MSIL2A_20260714")
        self.assertEqual(req.sun_zenith_deg, 32.5)

        resp = DOS1CorrectionResponse(
            item_id=req.item_id,
            model_applied=AtmosphericCorrectionModel.DOS1,
            sun_zenith_deg=req.sun_zenith_deg,
            earth_sun_distance_au=req.earth_sun_distance_au,
            band_haze_values={"blue": 14.2, "green": 9.1, "red": 5.4, "nir": 1.8},
            mean_surface_reflectance={"blue": 0.045, "green": 0.082, "red": 0.063, "nir": 0.285}
        )
        self.assertEqual(resp.model_applied, AtmosphericCorrectionModel.DOS1)
        self.assertIn("nir", resp.mean_surface_reflectance)

    def test_change_vector_analysis_cva_contracts_and_math(self):
        """Verify multi-spectral Change Vector Analysis (CVA) magnitude and directional sector classification."""
        # 1. Enums
        self.assertEqual(CVAMagnitudeTier.NO_CHANGE.value, "no_change")
        self.assertEqual(CVAMagnitudeTier.SIGNIFICANT_CHANGE.value, "significant_change")
        self.assertEqual(CVADirectionSector.SOIL_DRYING.value, "soil_drying")
        self.assertEqual(CVADirectionSector.VEGETATION_GROWTH.value, "vegetation_growth")
        self.assertEqual(CVADirectionSector.WATER_INUNDATION.value, "water_inundation")
        self.assertEqual(CVADirectionSector.DEFOLIATION_BURN.value, "defoliation_burn")

        # 2. Math - Sector 1: Soil drying (d_red >= 0, d_nir >= 0)
        cva_drying = calculate_change_vector({"red": 0.10, "nir": 0.20}, {"red": 0.25, "nir": 0.35})
        self.assertEqual(cva_drying["sector"], CVADirectionSector.SOIL_DRYING.value)
        self.assertGreater(cva_drying["magnitude"], 0.20)

        # 3. Math - Sector 2: Vegetation growth (d_red < 0, d_nir >= 0)
        cva_growth = calculate_change_vector({"red": 0.25, "nir": 0.20}, {"red": 0.10, "nir": 0.45})
        self.assertEqual(cva_growth["sector"], CVADirectionSector.VEGETATION_GROWTH.value)

        # 4. Math - Sector 3: Water inundation (d_red < 0, d_nir < 0)
        cva_water = calculate_change_vector({"red": 0.30, "nir": 0.40}, {"red": 0.15, "nir": 0.10})
        self.assertEqual(cva_water["sector"], CVADirectionSector.WATER_INUNDATION.value)

        # 5. Math - Sector 4: Defoliation / Burn (d_red >= 0, d_nir < 0)
        cva_burn = calculate_change_vector({"red": 0.10, "nir": 0.50}, {"red": 0.30, "nir": 0.15})
        self.assertEqual(cva_burn["sector"], CVADirectionSector.DEFOLIATION_BURN.value)
        self.assertEqual(cva_burn["magnitude_tier"], CVAMagnitudeTier.SIGNIFICANT_CHANGE.value)

        # 6. Dynamic CVA tile URL builder
        cva_tile = build_cva_tile_url("S2A_PRE", "S2B_POST", 14, 2500, 5800, rescale="0.0,0.6", colormap="turbo")
        self.assertIn("/api/v1/tiles/change/cva/S2A_PRE/S2B_POST/14/2500/5800.png", cva_tile)
        self.assertIn("rescale=0.0,0.6", cva_tile)
        self.assertIn("colormap=turbo", cva_tile)

        # 7. Request & response models
        req = CVAAnalysisRequest(
            bbox=(-121.2, 37.1, -121.0, 37.3),
            pre_scene_id="S2A_20250701",
            post_scene_id="S2B_20260701",
            bands=["red", "nir"],
            magnitude_threshold=0.15
        )
        resp = CVAAnalysisResponse(
            pre_scene_id=req.pre_scene_id,
            post_scene_id=req.post_scene_id,
            mean_magnitude=0.22,
            max_magnitude=0.68,
            magnitude_threshold=0.15,
            changed_area_hectares=1420.5,
            changed_area_pct=18.4,
            magnitude_tier=CVAMagnitudeTier.MODERATE_CHANGE,
            sector_breakdown={"vegetation_growth": 45.0, "soil_drying": 30.0, "defoliation_burn": 25.0},
            tile_url_template="/api/v1/tiles/change/cva/{pre_scene_id}/{post_scene_id}/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.pre_scene_id, "S2A_20250701")
        self.assertEqual(resp.magnitude_tier, CVAMagnitudeTier.MODERATE_CHANGE)

    def test_soil_salinity_contracts_and_math(self):
        """Verify soil salinity indices (NDSI, SI-1, SI-2, CRSI) and land degradation hazard tier classification."""
        # 1. Enums
        self.assertEqual(SalinityIndexType.NDSI.value, "ndsi")
        self.assertEqual(SalinityIndexType.CRSI.value, "crsi")
        self.assertEqual(SalinityHazardTier.NON_SALINE.value, "non_saline")
        self.assertEqual(SalinityHazardTier.EXTREMELY_SALINE.value, "extremely_saline")

        # 2. Math - Multi-spectral salinity indices
        indices = calculate_salinity_indices(blue=0.08, green=0.12, red=0.18, nir=0.10)
        self.assertIn("ndsi", indices)
        self.assertIn("si1", indices)
        self.assertIn("si2", indices)
        self.assertIn("crsi", indices)
        # NDSI = (red - nir) / (red + nir) = (0.18 - 0.10) / (0.28) ~ 0.2857
        self.assertAlmostEqual(indices["ndsi"], 0.2857, delta=0.002)

        # 3. Hazard classification
        h_non = classify_salinity_hazard(-0.25)
        self.assertEqual(h_non["tier"], SalinityHazardTier.NON_SALINE.value)
        self.assertFalse(h_non["is_degraded"])

        h_slight = classify_salinity_hazard(-0.05)
        self.assertEqual(h_slight["tier"], SalinityHazardTier.SLIGHTLY_SALINE.value)
        self.assertFalse(h_slight["is_degraded"])

        h_mod = classify_salinity_hazard(0.08)
        self.assertEqual(h_mod["tier"], SalinityHazardTier.MODERATELY_SALINE.value)
        self.assertTrue(h_mod["is_degraded"])

        h_ext = classify_salinity_hazard(0.35)
        self.assertEqual(h_ext["tier"], SalinityHazardTier.EXTREMELY_SALINE.value)
        self.assertTrue(h_ext["is_degraded"])

        # 4. Salinity tile URL builder
        sal_url = build_salinity_tile_url("sentinel-2-l2a", "S2A_2026_SAL", "ndsi", 12, 1200, 2400)
        self.assertIn("/api/v1/tiles/soil/salinity/sentinel-2-l2a/S2A_2026_SAL/ndsi/12/1200/2400.png", sal_url)
        self.assertIn("colormap=spectral", sal_url)

        # 5. Request & response models
        req = SoilSalinityAnalysisRequest(
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_2026_SAL",
            bbox=(-119.8, 36.2, -119.5, 36.5),
            index_type=SalinityIndexType.NDSI
        )
        resp = SoilSalinityAnalysisResponse(
            item_id=req.item_id,
            index_type=req.index_type,
            mean_salinity_index=0.14,
            saline_area_hectares=2850.0,
            saline_area_pct=34.2,
            primary_hazard_tier=SalinityHazardTier.MODERATELY_SALINE,
            hazard_tiers=[{"tier": "moderately_saline", "area_pct": 34.2}],
            tile_url_template="/api/v1/tiles/soil/salinity/{collection}/{item_id}/{metric}/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.primary_hazard_tier, SalinityHazardTier.MODERATELY_SALINE)
        self.assertEqual(resp.index_type, SalinityIndexType.NDSI)

    def test_wildfire_thermal_hotspots_contracts_and_math(self):
        """Verify active fire thermal hotspot detection and Fire Radiative Power (FRP) models."""
        # 1. Enums
        self.assertEqual(ThermalHotspotConfidence.LOW.value, "low")
        self.assertEqual(ThermalHotspotConfidence.NOMINAL.value, "nominal")
        self.assertEqual(ThermalHotspotConfidence.HIGH.value, "high")

        # 2. Math - Stefan-Boltzmann FRP calculation (Wooster et al.)
        frp = calculate_fire_radiative_power(t_mir_k=380.0, t_bg_k=300.0, pixel_area_m2=900.0)
        self.assertGreater(frp, 10.0)

        # Equal or colder MIR than background -> 0.0 FRP
        zero_frp = calculate_fire_radiative_power(t_mir_k=295.0, t_bg_k=300.0)
        self.assertEqual(zero_frp, 0.0)

        # 3. Contextual hotspot detection
        hot_high = detect_thermal_hotspots(t_mir_k=345.0, t_tir_k=315.0, t_bg_k=300.0)
        self.assertTrue(hot_high["is_hotspot"])
        self.assertEqual(hot_high["confidence"], ThermalHotspotConfidence.HIGH.value)
        self.assertGreater(hot_high["frp_mw"], 0.0)

        cold_pt = detect_thermal_hotspots(t_mir_k=302.0, t_tir_k=299.0, t_bg_k=298.0)
        self.assertFalse(cold_pt["is_hotspot"])

        # 4. Thermal hotspot tile URL builder
        hotspot_url = build_thermal_hotspot_tile_url("landsat-c2-l2", "LC09_2026_FIRE", 11, 600, 1200)
        self.assertIn("/api/v1/tiles/thermal/hotspots/landsat-c2-l2/LC09_2026_FIRE/11/600/1200.png", hotspot_url)
        self.assertIn("colormap=inferno", hotspot_url)

        # 5. Request, response, and point models
        pt = ThermalHotspotPoint(
            lat=37.245,
            lng=-121.112,
            t_mir_k=352.0,
            t_tir_k=318.0,
            delta_t_k=34.0,
            frp_mw=18.5,
            confidence=ThermalHotspotConfidence.HIGH
        )
        self.assertEqual(pt.confidence, ThermalHotspotConfidence.HIGH)

        req = ThermalHotspotRequest(
            collection=SatelliteCollection.LANDSAT_C2_L2,
            item_id="LC09_2026_FIRE",
            bbox=(-121.3, 37.0, -121.0, 37.3),
            min_temperature_k=310.0,
            min_delta_t_k=10.0
        )
        resp = ThermalHotspotResponse(
            item_id=req.item_id,
            total_hotspots_detected=12,
            total_frp_mw=145.8,
            mean_frp_mw=12.15,
            max_brightness_temp_k=385.0,
            high_confidence_count=8,
            hotspots=[pt],
            tile_url_template="/api/v1/tiles/thermal/hotspots/{collection}/{item_id}/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.total_hotspots_detected, 12)
        self.assertEqual(resp.high_confidence_count, 8)
        self.assertEqual(len(resp.hotspots), 1)

    def test_t90_canonical_route_contracts(self):
        """Verify all T-90 canonical route contracts in API_ROUTE_CONTRACTS and format_api_route."""
        t90_routes = [
            "analysis_dam_breach",
            "analysis_dam_breach_short",
            "tiles_flood_inundation",
            "analysis_landslide",
            "analysis_landslide_short",
            "tiles_landslide",
            "analysis_drought_vhi",
            "analysis_drought_vhi_short",
            "tiles_drought_vhi",
            "analysis_sam_mineral",
            "analysis_sam_mineral_short",
            "tiles_sam_mineral",
            "tiles_vector_pbf",
            "analysis_vector_export"
        ]
        for route in t90_routes:
            self.assertIn(route, API_ROUTE_CONTRACTS, f"Missing route contract: {route}")

        # Test parameter substitution
        flood_tile = format_api_route("tiles_flood_inundation", simulation_id="SIM-101", z=14, x=2450, y=5600)
        self.assertEqual(flood_tile, "/api/v1/tiles/hazard/flood-inundation/SIM-101/14/2450/5600.png")

        landslide_tile = format_api_route("tiles_landslide", asset_id="SLOPE-02", z=16, x=5100, y=10200)
        self.assertEqual(landslide_tile, "/api/v1/tiles/hazard/landslide/SLOPE-02/16/5100/10200.png")

        drought_tile = format_api_route("tiles_drought_vhi", collection="sentinel-2-l2a", item_id="S2A_123", z=10, x=300, y=600)
        self.assertEqual(drought_tile, "/api/v1/tiles/drought/vhi/sentinel-2-l2a/S2A_123/10/300/600.png")

        sam_tile = format_api_route("tiles_sam_mineral", collection="sentinel-2-l2a", item_id="S2A_123", endmember="pyrite", z=12, x=600, y=1200)
        self.assertEqual(sam_tile, "/api/v1/tiles/geology/sam/sentinel-2-l2a/S2A_123/pyrite/12/600/1200.png")

        vec_tile = format_api_route("tiles_vector_pbf", layer_id="critical_infrastructure", z=15, x=4500, y=9000)
        self.assertEqual(vec_tile, "/api/v1/tiles/vector/critical_infrastructure/15/4500/9000.pbf")

    def test_dam_breach_inundation_contracts_and_math(self):
        """Verify dam breach peak discharge (Froehlich), wave propagation, and hazard zonation."""
        # 1. Enums
        self.assertEqual(InundationHazardTier.EXTREME_HAZARD.value, "extreme_hazard")
        self.assertEqual(DamBreachFailureMode.PIPING_SEEPAGE.value, "piping_seepage")

        # 2. Mathematical calculation
        sim = calculate_dam_breach_inundation(
            reservoir_volume_m3=25000000.0,
            breach_height_m=35.0,
            downstream_slope=0.015,
            mannings_n=0.045,
            simulation_distance_km=25.0
        )
        self.assertGreater(sim["peak_breach_discharge_m3s"], 5000.0)
        self.assertGreater(sim["total_inundation_area_ha"], 100.0)
        self.assertEqual(sim["max_flood_depth_m"], 35.0)
        self.assertGreater(sim["wave_front_velocity_ms"], 2.0)
        self.assertGreater(len(sim["points"]), 5)

        # Check wave attenuation: downstream depth and discharge decrease
        p_first = sim["points"][0]
        p_last = sim["points"][-1]
        self.assertGreater(p_first["max_depth_m"], p_last["max_depth_m"])
        self.assertGreater(p_first["peak_discharge_m3s"], p_last["peak_discharge_m3s"])
        self.assertEqual(p_first["distance_km"], 0.0)
        self.assertEqual(p_last["distance_km"], 25.0)
        self.assertGreater(p_last["arrival_time_min"], p_first["arrival_time_min"])

        # 3. Tile URL builder
        tile_url = build_flood_inundation_tile_url("SIM-BREACH-01", 12, 1000, 2000)
        self.assertIn("/api/v1/tiles/hazard/flood-inundation/SIM-BREACH-01/12/1000/2000.png", tile_url)
        self.assertIn("colormap=blues", tile_url)

        # 4. Request / Response models
        req = DamBreachAnalysisRequest(
            aoi_id="TAILINGS-04",
            volume=30000000.0,
            dam_height=40.0,
            slope=0.02,
            distance_km=30.0
        )
        self.assertEqual(req.reservoir_volume_m3, 30000000.0)
        self.assertEqual(req.breach_height_m, 40.0)
        self.assertEqual(req.downstream_slope, 0.02)
        self.assertEqual(req.simulation_distance_km, 30.0)

        point_models = [DamBreachPoint(**p) for p in sim["points"][:3]]
        resp = DamBreachAnalysisResponse(
            simulation_id="SIM-TEST-01",
            aoi_id=req.aoi_id,
            failure_mode=req.failure_mode,
            peak_breach_discharge_m3s=sim["peak_breach_discharge_m3s"],
            total_inundation_area_ha=sim["total_inundation_area_ha"],
            max_flood_depth_m=sim["max_flood_depth_m"],
            wave_front_velocity_ms=sim["wave_front_velocity_ms"],
            points=point_models,
            hazard_summary=sim["hazard_summary"],
            tile_url_template="/api/v1/tiles/hazard/flood-inundation/{simulation_id}/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.aoi_id, "TAILINGS-04")
        self.assertEqual(len(resp.points), 3)

    def test_landslide_susceptibility_contracts_and_math(self):
        """Verify infinite slope Factor of Safety, Newmark critical acceleration, and co-seismic displacement."""
        # 1. Enums
        self.assertEqual(LandslideSusceptibilityTier.HIGH.value, "high")
        self.assertEqual(LandslideTriggerType.SEISMIC.value, "seismic")

        # 2. Stable slope scenario (mild slope, low PGA)
        stable = calculate_landslide_susceptibility(
            slope_deg=12.0,
            cohesion_kpa=25.0,
            friction_angle_deg=35.0,
            soil_depth_m=2.5,
            pga_g=0.05,
            water_table_ratio=0.10
        )
        self.assertGreater(stable["static_fs"], 1.50)
        self.assertEqual(stable["susceptibility_tier"], LandslideSusceptibilityTier.LOW.value)
        self.assertFalse(stable["failure_warning"])

        # 3. Critical steep slope scenario (high slope, high water table, high PGA)
        critical = calculate_landslide_susceptibility(
            slope_deg=38.0,
            cohesion_kpa=5.0,
            friction_angle_deg=28.0,
            soil_depth_m=4.0,
            pga_g=0.45,
            water_table_ratio=0.80
        )
        self.assertLess(critical["static_fs"], 1.20)
        self.assertGreaterEqual(critical["critical_accel_g"], 0.0)
        self.assertTrue(critical["failure_warning"])
        self.assertIn(critical["susceptibility_tier"], [LandslideSusceptibilityTier.HIGH.value, LandslideSusceptibilityTier.VERY_HIGH.value])
        self.assertGreater(critical["runout_distance_m"], 0.0)

        # Marginally stable slope to verify positive critical acceleration
        marginal = calculate_landslide_susceptibility(
            slope_deg=26.0,
            cohesion_kpa=8.0,
            friction_angle_deg=30.0,
            soil_depth_m=3.0,
            pga_g=0.35,
            water_table_ratio=0.30
        )
        self.assertGreater(marginal["static_fs"], 1.0)
        self.assertGreater(marginal["critical_accel_g"], 0.0)

        # 4. Tile URL builder
        tile_url = build_landslide_tile_url("SLOPE-SECTOR-01", 14, 2500, 5000)
        self.assertIn("/api/v1/tiles/hazard/landslide/SLOPE-SECTOR-01/14/2500/5000.png", tile_url)
        self.assertIn("colormap=turbo", tile_url)

        # 5. Request / Response models
        req = LandslideSusceptibilityRequest(
            slope=32.0,
            cohesion=10.0,
            friction_angle=30.0,
            pga=0.30,
            m=0.50
        )
        self.assertEqual(req.slope_deg, 32.0)
        self.assertEqual(req.cohesion_kpa, 10.0)
        self.assertEqual(req.pga_g, 0.30)
        self.assertEqual(req.water_table_ratio, 0.50)

        resp = LandslideSusceptibilityResponse(
            aoi_id=req.aoi_id,
            static_fs=critical["static_fs"],
            critical_accel_g=critical["critical_accel_g"],
            newmark_displacement_cm=critical["newmark_displacement_cm"],
            runout_distance_m=critical["runout_distance_m"],
            susceptibility_tier=LandslideSusceptibilityTier(critical["susceptibility_tier"]),
            hazard_probability=critical["hazard_probability"],
            failure_warning=critical["failure_warning"],
            tile_url_template="/api/v1/tiles/hazard/landslide/{asset_id}/{z}/{x}/{y}.png"
        )
        self.assertTrue(resp.failure_warning)

    def test_vegetation_health_index_drought_contracts_and_math(self):
        """Verify Kogan (1995) VCI, TCI, and composite Vegetation Health Index (VHI) drought monitoring."""
        # 1. Enums
        self.assertEqual(DroughtSeverityTier.EXTREME_DROUGHT.value, "extreme_drought")
        self.assertEqual(DroughtSeverityTier.NO_DROUGHT.value, "no_drought")

        # 2. Healthy vegetation (high NDVI, cool LST) -> No drought
        healthy = calculate_vegetation_health_index(
            ndvi=0.68,
            lst_c=22.0,
            ndvi_min=0.15,
            ndvi_max=0.75,
            lst_min_c=18.0,
            lst_max_c=42.0,
            alpha=0.50
        )
        self.assertGreater(healthy["vci"], 80.0)
        self.assertGreater(healthy["tci"], 75.0)
        self.assertGreater(healthy["vhi"], 75.0)
        self.assertEqual(healthy["tier"], DroughtSeverityTier.NO_DROUGHT.value)
        self.assertFalse(healthy["is_drought"])

        # 3. Severe drought (low NDVI, extreme hot LST)
        drought = calculate_vegetation_health_index(
            ndvi=0.22,
            lst_c=40.0,
            ndvi_min=0.15,
            ndvi_max=0.75,
            lst_min_c=18.0,
            lst_max_c=42.0,
            alpha=0.50
        )
        self.assertLess(drought["vci"], 20.0)
        self.assertLess(drought["tci"], 15.0)
        self.assertLess(drought["vhi"], 20.0)
        self.assertIn(drought["tier"], [DroughtSeverityTier.SEVERE_DROUGHT.value, DroughtSeverityTier.EXTREME_DROUGHT.value])
        self.assertTrue(drought["is_drought"])

        # 4. Classification helper
        self.assertEqual(classify_drought_tier(8.5), DroughtSeverityTier.EXTREME_DROUGHT)
        self.assertEqual(classify_drought_tier(15.2), DroughtSeverityTier.SEVERE_DROUGHT)
        self.assertEqual(classify_drought_tier(25.0), DroughtSeverityTier.MODERATE_DROUGHT)
        self.assertEqual(classify_drought_tier(35.0), DroughtSeverityTier.MILD_DROUGHT)
        self.assertEqual(classify_drought_tier(60.0), DroughtSeverityTier.NO_DROUGHT)

        # 5. Tile URL builder
        tile_url = build_drought_vhi_tile_url("sentinel-2-l2a", "S2A_DROUGHT_AOI", 11, 450, 900)
        self.assertIn("/api/v1/tiles/drought/vhi/sentinel-2-l2a/S2A_DROUGHT_AOI/11/450/900.png", tile_url)
        self.assertIn("colormap=rdylgn", tile_url)

        # 6. Request / Response models
        req = DroughtAnalysisRequest(
            collection=SatelliteCollection.SENTINEL_2,
            item_id="S2A_2026_DROUGHT",
            sample_ndvi=0.35,
            sample_lst=34.0,
            alpha=0.60
        )
        self.assertEqual(req.vci_weight, 0.60)
        self.assertEqual(req.sample_lst_c, 34.0)

        resp = DroughtAnalysisResponse(
            item_id=req.item_id,
            mean_vci=drought["vci"],
            mean_tci=drought["tci"],
            mean_vhi=drought["vhi"],
            drought_tier=DroughtSeverityTier(drought["tier"]),
            affected_area_ha=124.5,
            affected_area_pct=38.5,
            tier_breakdown={"severe_drought": 38.5, "no_drought": 61.5},
            tile_url_template="/api/v1/tiles/drought/vhi/{collection}/{item_id}/{z}/{x}/{y}.png"
        )
        self.assertEqual(resp.drought_tier, DroughtSeverityTier(drought["tier"]))

    def test_spectral_angle_mapper_mineral_contracts_and_math(self):
        """Verify Spectral Angle Mapper (SAM) angle and mineral endmember matching."""
        # 1. Enums and Library
        self.assertEqual(MineralEndmemberType.PYRITE.value, "pyrite")
        self.assertIn("pyrite", MINERAL_ENDMEMBER_LIBRARY)
        self.assertIn("kaolinite", MINERAL_ENDMEMBER_LIBRARY)
        pyrite_spec = get_mineral_endmember_spec("pyrite")
        self.assertIn("swir2", pyrite_spec)

        # 2. Perfect match scenario: pixel vector identical to pyrite
        perfect = calculate_spectral_angle_mapper(pyrite_spec, pyrite_spec)
        self.assertAlmostEqual(perfect["spectral_angle_rad"], 0.0, places=3)
        self.assertAlmostEqual(perfect["spectral_angle_deg"], 0.0, places=1)
        self.assertTrue(perfect["is_match"])
        self.assertEqual(perfect["match_confidence"], "high")
        self.assertAlmostEqual(perfect["similarity_score"], 1.0, places=3)

        # 3. Scaled illumination invariance: scalar multiplier should yield angle 0
        scaled_pyrite = {b: val * 2.5 for b, val in pyrite_spec.items()}
        scaled_match = calculate_spectral_angle_mapper(scaled_pyrite, pyrite_spec)
        self.assertAlmostEqual(scaled_match["spectral_angle_rad"], 0.0, places=3)
        self.assertTrue(scaled_match["is_match"])

        # 4. Dissimilar endmember comparison (pyrite vs kaolinite)
        kaolinite_spec = get_mineral_endmember_spec("kaolinite")
        dissimilar = calculate_spectral_angle_mapper(pyrite_spec, kaolinite_spec)
        self.assertGreater(dissimilar["spectral_angle_rad"], 0.15)
        self.assertLess(dissimilar["similarity_score"], 0.90)

        # 5. Tile URL builder
        tile_url = build_sam_mineral_tile_url("sentinel-2-l2a", "S2A_MINING_AOI", "pyrite", 13, 1200, 2400)
        self.assertIn("/api/v1/tiles/geology/sam/sentinel-2-l2a/S2A_MINING_AOI/pyrite/13/1200/2400.png", tile_url)
        self.assertIn("colormap=viridis", tile_url)

        # 6. Request / Response models
        req = SAMAnalysisRequest(
            mineral="pyrite",
            angle_threshold=0.10,
            item_id="S2A_TAILINGS_2026"
        )
        self.assertEqual(req.target_endmember, MineralEndmemberType.PYRITE)
        self.assertEqual(req.max_angle_rad, 0.10)

        resp = SAMAnalysisResponse(
            target_endmember=req.target_endmember,
            spectral_angle_rad=perfect["spectral_angle_rad"],
            spectral_angle_deg=perfect["spectral_angle_deg"],
            is_match=perfect["is_match"],
            match_confidence=perfect["match_confidence"],
            similarity_score=perfect["similarity_score"],
            classified_area_ha=32.4,
            classified_area_pct=12.8,
            tile_url_template="/api/v1/tiles/geology/sam/{collection}/{item_id}/{endmember}/{z}/{x}/{y}.png"
        )
        self.assertTrue(resp.is_match)
        self.assertEqual(resp.match_confidence, "high")

    def test_cloud_native_vector_serialization_contracts(self):
        """Verify vector export serialization formats, filename formatting, and vector tile URL generation."""
        # 1. Enums
        self.assertEqual(GeospatialSerializationFormat.GEOPARQUET.value, "geoparquet")
        self.assertEqual(GeospatialSerializationFormat.FLATGEOBUF.value, "flatgeobuf")
        self.assertEqual(GeospatialSerializationFormat.MVT_PBF.value, "mvt_pbf")

        # 2. Filename formatting
        fn_parquet = format_vector_export_filename("critical-infrastructure", GeospatialSerializationFormat.GEOPARQUET, timestamp="20260930T200000Z")
        self.assertEqual(fn_parquet, "gios_critical_infrastructure_20260930T200000Z.parquet")

        fn_fgb = format_vector_export_filename("dams_tailings", GeospatialSerializationFormat.FLATGEOBUF, timestamp="20260930T200000Z")
        self.assertEqual(fn_fgb, "gios_dams_tailings_20260930T200000Z.fgb")

        # 3. Vector tile URL builder
        tile_url = build_vector_tile_url("hazards_active", 14, 2500, 5000)
        self.assertEqual(tile_url, "/api/v1/tiles/vector/hazards_active/14/2500/5000.pbf")

        # 4. Request / Response models
        req = VectorExportRequest(
            layer="infrastructure_sensors",
            export_format=GeospatialSerializationFormat.GEOPARQUET,
            simplify_tolerance_deg=0.0005
        )
        self.assertEqual(req.layer_id, "infrastructure_sensors")
        self.assertEqual(req.format, GeospatialSerializationFormat.GEOPARQUET)

        resp = VectorExportResponse(
            export_id="EXP-1234",
            layer_id=req.layer_id,
            format=req.format,
            feature_count=85,
            file_size_bytes=32400,
            download_url="/api/v1/analysis/vector/export/EXP-1234/download",
            mime_type="application/vnd.apache.parquet"
        )
        self.assertEqual(resp.feature_count, 85)
        self.assertIn("parquet", resp.mime_type)

        tile_req = VectorTileRequest(layer_id="sensors", z=12, x=600, y=1200)
        self.assertEqual(tile_req.layer_id, "sensors")
        self.assertEqual(tile_req.z, 12)

if __name__ == "__main__":
    unittest.main()



