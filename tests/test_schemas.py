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
    generate_tile_cache_key
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
        self.assertEqual(len(SATELLITE_COLLECTIONS_METADATA), 3)
        for col_id in ["sentinel-2-l2a", "landsat-c2-l2", "drone-ortho"]:
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

        self.assertIsNone(get_satellite_collection_metadata("non_existent_collection"))

        # Listing helper
        all_collections = list_satellite_collections()
        self.assertEqual(len(all_collections), 3)
        self.assertIn("sentinel-2-l2a", [c.id.value for c in all_collections])

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

if __name__ == "__main__":
    unittest.main()
