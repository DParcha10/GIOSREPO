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
    HealthResponse,
    SceneMetadata,
    SearchResponse,
    USGSStationData,
    GEEImageRequest,
    GEEImageResponse,
    SentinelHubTileRequest,
    SentinelHubTileResponse,
    SpatialBufferRequest,
    SpatialBufferResponse,
    AgentChatMessage,
    AgentChatRequest,
    AgentToolAction,
    MapAction,
    NavigationAction,
    AgentChatResponse,
    EventCreateRequest
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
            colormap=TileColormap.SPECTRAL
        )
        self.assertEqual(params.z, 13)
        self.assertEqual(params.index, SpectralIndex.NDMI)
        self.assertEqual(params.colormap, TileColormap.SPECTRAL)

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
