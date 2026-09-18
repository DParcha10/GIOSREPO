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
    classify_dnbr,
    API_ROUTE_CONTRACTS
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
