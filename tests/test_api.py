"""GIOS Platform Automated Test Suite.
Tests all core APIs: Health, Auth, Events, Analysis, Time-Series, Reports, Spatial, IoT.
Also tests the JARVIS AI Agent: identity, memory, map marking, tab routing, web search, data analysis.
"""
import unittest
import warnings
warnings.filterwarnings("ignore", category=ResourceWarning, message=".*unclosed database.*")
from fastapi.testclient import TestClient
from main import app

class TestGIOSApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        from app.database import engine
        engine.dispose()
        from app.utils.cache import cache_manager
        cache_manager.close()

    def test_health_check(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("platform", data)

    def test_auth_token_and_me(self):
        # 1. Login with default admin credentials
        login_res = self.client.post(
            "/api/v1/auth/token",
            data={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        self.assertEqual(login_res.status_code, 200)
        token_data = login_res.json()
        self.assertIn("access_token", token_data)
        token = token_data["access_token"]

        # 2. Query /auth/me with bearer token
        me_res = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_res.status_code, 200)
        user_info = me_res.json()
        self.assertEqual(user_info["username"], "admin")
        self.assertEqual(user_info["role"], "admin")

    def test_hazard_events_list_and_get(self):
        # List all events
        res = self.client.get("/api/v1/events")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("events", data)
        self.assertGreater(len(data["events"]), 0)

        # Get specific event
        first_event_id = data["events"][0]["id"]
        evt_res = self.client.get(f"/api/v1/events/{first_event_id}")
        self.assertEqual(evt_res.status_code, 200)
        evt = evt_res.json()
        self.assertEqual(evt["id"], first_event_id)
        self.assertIn("lat", evt)
        self.assertIn("lng", evt)

    def test_spectral_index_analysis(self):
        res = self.client.post(
            "/api/v1/analysis/indices",
            json={
                "index": "ndmi",
                "bbox": [-121.08, 37.05, -121.06, 37.065],
                "start_date": "2026-08-01",
                "end_date": "2026-08-30"
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["index"], "ndmi")
        self.assertIn("mean", data)
        self.assertIn("median", data)

    def test_timeseries_trend(self):
        res = self.client.post(
            "/api/v1/timeseries/trend",
            json={
                "index": "ndmi",
                "bbox": [-121.08, 37.05, -121.06, 37.065],
                "start_date": "2026-08-01",
                "end_date": "2026-08-30"
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["index"], "ndmi")
        self.assertIn("data_points", data)
        self.assertGreater(len(data["data_points"]), 0)

    def test_spatial_buffer(self):
        res = self.client.post(
            "/api/v1/spatial/buffer",
            json={
                "lat": 37.0582,
                "lng": -121.0744,
                "distance_km": 1.5
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["buffer_radius_km"], 1.5)
        self.assertIn("geojson", data)
        features = data["geojson"]["features"]
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]["geometry"]["type"], "Polygon")

    def test_vector_layers(self):
        res = self.client.get("/api/v1/spatial/layers/critical_infrastructure")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertGreater(len(data["features"]), 0)

    def test_pdf_report_generation(self):
        res = self.client.get(
            "/api/v1/reports/pdf?bbox=-121.08,37.05,-121.06,37.065&index_type=ndmi"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertTrue(len(res.content) > 100)

    # --- JARVIS AI Agent Tests ---

    def test_agent_chat_hazard_lookup(self):
        """Test that JARVIS can look up hazard events and starts with correct greeting."""
        res = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "Analyze San Luis Dam Seepage"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("response", data)
        self.assertTrue(data["response"].startswith("Hello, my name is JARVIS"))
        self.assertIn("tool_calls", data)
        # Should have at least one tool call (hazard lookup)
        self.assertTrue(len(data["tool_calls"]) > 0)
        # Response schema includes new fields
        self.assertIn("sources", data)
        self.assertIn("data_analysis", data)
        self.assertIn("thinking", data)

    def test_agent_memory_retention(self):
        """Test JARVIS saves and recalls user identity and facts."""
        # 1. Save identity
        res1 = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "Hello, my name is Alex and remember that spillway 3 is under repair"}
        )
        self.assertEqual(res1.status_code, 200)
        d1 = res1.json()
        self.assertTrue(d1["response"].startswith("Hello, my name is JARVIS"))
        # Should have memory updates
        mem_updates = d1.get("memory_updates") or []
        self.assertTrue(any("Alex" in u for u in mem_updates))

        # 2. Recall
        res2 = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "What do you remember?"}
        )
        self.assertEqual(res2.status_code, 200)
        d2 = res2.json()
        self.assertTrue(d2["response"].startswith("Hello, my name is JARVIS"))
        self.assertIn("Alex", d2["response"])

    def test_agent_map_marking_and_tab_switching(self):
        """Test JARVIS can mark locations and switch tabs autonomously."""
        # 1. Mark a city
        res = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "Can you mark New York on the map?"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["response"].startswith("Hello, my name is JARVIS"))
        self.assertIsNotNone(data.get("map_action"))
        self.assertAlmostEqual(data["map_action"]["lat"], 40.7128, places=2)
        self.assertEqual(data["navigation"]["target_path"], "/map")
        self.assertTrue(data["navigation"]["auto_switch"])

        # 2. Tab: Analytics
        res_an = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "Show me the analytics charts"}
        )
        self.assertEqual(res_an.status_code, 200)
        d_an = res_an.json()
        self.assertEqual(d_an["navigation"]["target_path"], "/analytics")

        # 3. Tab: Telemetry
        res_tel = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "Take me to the telemetry dashboard"}
        )
        self.assertEqual(res_tel.status_code, 200)
        d_tel = res_tel.json()
        self.assertEqual(d_tel["navigation"]["target_path"], "/dashboard")

    def test_agent_response_schema(self):
        """Test the complete response schema includes all new AI fields."""
        res = self.client.post(
            "/api/v1/agent/chat",
            json={"message": "Hello"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Core fields
        self.assertIn("response", data)
        self.assertIn("tool_calls", data)
        self.assertIn("map_action", data)
        self.assertIn("navigation", data)
        self.assertIn("memory_updates", data)
        self.assertIn("suggested_prompts", data)
        # New AI fields
        self.assertIn("sources", data)
        self.assertIn("data_analysis", data)
        self.assertIn("thinking", data)

    def test_satellite_endpoints(self):
        """Test GEE and Sentinel Hub satellite integration endpoints."""
        # 1. Test GEE Image Endpoint
        gee_res = self.client.get(
            "/api/v1/satellite/gee",
            params={
                "collection": "COPERNICUS/S2_SR",
                "start_date": "2023-01-01",
                "end_date": "2023-01-31",
                "bbox": [-121.2, 36.95, -120.95, 37.15]
            }
        )
        self.assertEqual(gee_res.status_code, 200)
        gee_data = gee_res.json()
        self.assertEqual(gee_data["provider"], "GEE")
        self.assertEqual(gee_data["collection"], "COPERNICUS/S2_SR")
        self.assertIn("preview_url", gee_data)

        # 2. Test Sentinel Hub Tile Endpoint
        sentinel_res = self.client.get(
            "/api/v1/satellite/sentinel",
            params={
                "collection": "sentinel-2-l2a",
                "date": "2023-01-15",
                "bbox": [-121.2, 36.95, -120.95, 37.15],
                "zoom": 12
            }
        )
        self.assertEqual(sentinel_res.status_code, 200)
        sentinel_data = sentinel_res.json()
        self.assertEqual(sentinel_data["provider"], "SentinelHub")
        self.assertIn("tile_url", sentinel_data)

    def test_wildfire_burn_severity_api(self):
        """Test POST /api/v1/wildfire/burn-severity endpoint."""
        # 1. Default request
        res1 = self.client.post("/api/v1/wildfire/burn-severity", json={})
        self.assertEqual(res1.status_code, 200)
        d1 = res1.json()
        self.assertIn("mean_dnbr", d1)
        self.assertIn("mean_rdnbr", d1)
        self.assertIn("categories", d1)
        self.assertGreater(len(d1["categories"]), 0)
        self.assertIn("tile_url_template", d1)

        # 2. Custom pre/post arrays
        res2 = self.client.post(
            "/api/v1/wildfire/burn-severity",
            json={
                "pre_nbr": [0.60, 0.55, 0.50],
                "post_nbr": [-0.10, 0.05, 0.45]
            }
        )
        self.assertEqual(res2.status_code, 200)
        d2 = res2.json()
        self.assertGreater(d2["mean_dnbr"], 0.0)
        self.assertGreater(d2["mean_rdnbr"], 0.0)

    def test_drone_fleet_endpoints(self):
        """Test GET /api/v1/drone/missions and /api/v1/drone/orthomosaics."""
        missions_res = self.client.get("/api/v1/drone/missions")
        self.assertEqual(missions_res.status_code, 200)
        m_data = missions_res.json()
        self.assertIn("missions", m_data)

        orthos_res = self.client.get("/api/v1/drone/orthomosaics")
        self.assertEqual(orthos_res.status_code, 200)
        o_data = orthos_res.json()
        self.assertIn("orthomosaics", o_data)

    def test_alert_engine_poll_sensors_none_discharge(self):
        """Test AlertEngine.poll_sensors handles None discharge_cfs gracefully without TypeError."""
        import asyncio
        from unittest.mock import patch, AsyncMock
        from app.services.alerting import alert_engine

        mock_data = {
            "site_id": "09486000",
            "discharge_cfs": None,
            "gage_height_ft": 4.12,
            "water_temp_c": 19.3
        }
        with patch("app.services.integration.integration_service.get_usgs_station", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_data
            # Run poll_sensors - should complete without throwing TypeError
            asyncio.run(alert_engine.poll_sensors())
            self.assertEqual(alert_engine.alert_state.get("09486000"), "normal")

    def test_tool_query_usgs_gage_height_only(self):
        """Test tool_query_usgs succeeds when gage_height is present even if discharge is None."""
        import asyncio
        from unittest.mock import patch, AsyncMock
        from app.services.jarvis_brain import tool_query_usgs

        mock_data = {
            "site_id": "09486000",
            "discharge_cfs": None,
            "gage_height_ft": 5.4,
            "water_temp_c": 21.0
        }
        with patch("app.services.integration.integration_service.get_usgs_station", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_data
            result = asyncio.run(tool_query_usgs("09486000"))
            self.assertEqual(result["status"], "success")
            self.assertEqual(result["telemetry"]["gage_height_ft"], 5.4)

    def test_bitemporal_change_detection_api(self):
        """Test POST /api/v1/analysis/change-detection returns valid difference matrix and categories."""
        res = self.client.post("/api/v1/analysis/change-detection", json={
            "collection": "sentinel-2-l2a",
            "metric": "ndmi_diff",
            "pre_scene_id": "S2A_MSIL2A_20260715",
            "post_scene_id": "S2B_MSIL2A_20260815",
            "bbox": [-121.08, 37.05, -121.06, 37.065]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["metric"], "ndmi_diff")
        self.assertIn("mean_difference", data)
        self.assertIn("categories", data)
        self.assertGreater(len(data["categories"]), 0)
        self.assertIn("tile_url_template", data)

    def test_difference_tile_streaming_api(self):
        """Test GET /api/v1/tiles/difference returns 200 OK with valid PNG bytes."""
        res = self.client.get(
            "/api/v1/tiles/difference/sentinel-2-l2a/S2A_20260715/S2B_20260815/ndmi_diff/12/1042/1628.png"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "image/png")
        self.assertGreater(len(res.content), 100)

    def test_geotechnical_sensor_instrumentation_api(self):
        """Test GET geotechnical sensor suite: sensors list, readings, summary, and geojson export."""
        # 1. Sensors list
        res_list = self.client.get("/api/v1/integration/geotechnical/sensors")
        self.assertEqual(res_list.status_code, 200)
        sensors = res_list.json()
        self.assertIsInstance(sensors, list)
        self.assertGreaterEqual(len(sensors), 6)
        sensor_ids = [s["sensor_id"] for s in sensors]
        self.assertIn("PZ-SL-101", sensor_ids)

        # 2. Sensor readings
        res_readings = self.client.get("/api/v1/integration/geotechnical/sensors/PZ-SL-101/readings")
        self.assertEqual(res_readings.status_code, 200)
        readings = res_readings.json()
        self.assertIsInstance(readings, list)
        self.assertGreater(len(readings), 0)

        # 3. Network summary
        res_sum = self.client.get("/api/v1/integration/geotechnical/summary/SAN-LUIS-DAM-01")
        self.assertEqual(res_sum.status_code, 200)
        summary = res_sum.json()
        self.assertEqual(summary["asset_id"], "SAN-LUIS-DAM-01")
        self.assertGreaterEqual(summary["total_sensors"], 6)

        # 4. GeoJSON export (both primary route and alias)
        res_geo1 = self.client.get("/api/v1/integration/geotechnical/sensors/geojson")
        self.assertEqual(res_geo1.status_code, 200)
        geo1 = res_geo1.json()
        self.assertEqual(geo1["type"], "FeatureCollection")
        self.assertGreaterEqual(len(geo1["features"]), 6)

        res_geo2 = self.client.get("/api/v1/integration/geotechnical/geojson")
        self.assertEqual(res_geo2.status_code, 200)
        geo2 = res_geo2.json()
        self.assertEqual(geo2["type"], "FeatureCollection")

    def test_reservoir_bathymetry_eac_api(self):
        """Test POST /api/v1/analysis/bathymetry/eac calculates EAC curves with frustum integration."""
        res = self.client.post("/api/v1/analysis/bathymetry/eac", json={
            "asset_id": "SAN-LUIS-RES-01",
            "datum_min_elevation_m": 160.0,
            "datum_max_elevation_m": 250.0,
            "step_elevation_m": 10.0,
            "current_pool_elevation_m": 236.4,
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["asset_id"], "SAN-LUIS-RES-01")
        self.assertIn("curve_points", data)
        self.assertGreater(len(data["curve_points"]), 0)
        self.assertIn("current_storage_m3", data)
        self.assertIn("max_capacity_m3", data)
        self.assertIn("storage_volume_acre_feet", data["curve_points"][0])

        # Also test with parameter aliases (min_elevation_m, max_elevation_m, elevation_step_m)
        res_alias = self.client.post("/api/v1/analysis/bathymetry/eac", json={
            "asset_id": "SAN-LUIS-RES-01",
            "min_elevation_m": 160.0,
            "max_elevation_m": 250.0,
            "elevation_step_m": 10.0,
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res_alias.status_code, 200)

    def test_tile_cache_preload_api(self):
        """Test POST /api/v1/tiles/cache/preload queues tile cache pre-warm job."""
        res = self.client.post("/api/v1/tiles/cache/preload", json={
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_MSIL2A_20260815",
            "index": "ndvi",
            "min_zoom": 10,
            "max_zoom": 11,
            "bbox": [-121.08, 37.05, -121.06, 37.065]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("job_id", data)
        self.assertEqual(data["status"], "queued")
        self.assertGreater(data["total_tiles_to_cache"], 0)

        # Also test with scene_id alias
        res_alias = self.client.post("/api/v1/tiles/cache/preload", json={
            "collection": "sentinel-2-l2a",
            "scene_id": "S2A_MSIL2A_20260815",
            "min_zoom": 10,
            "max_zoom": 11,
            "bbox": [-121.08, 37.05, -121.06, 37.065]
        })
        self.assertEqual(res_alias.status_code, 200)

    def test_drone_gcp_quality_assessment_api(self):
        """Test POST /api/v1/drone/gcp/quality and /api/v1/drone/gcp-quality calculates survey-grade residuals and RMSE."""
        payload = {
            "ortho_id": "ORTHO-SL-DAM-01",
            "control_points": [
                {"point_id": "GCP-01", "role": "control", "x_east": 672000.0, "y_north": 4104000.0, "z_elev": 165.0, "lat": 37.06, "lng": -121.07},
                {"point_id": "GCP-02", "role": "control", "x_east": 672500.0, "y_north": 4104500.0, "z_elev": 166.0, "lat": 37.065, "lng": -121.065},
                {"point_id": "CP-01", "role": "check", "x_east": 672200.0, "y_north": 4104200.0, "z_elev": 165.5, "lat": 37.062, "lng": -121.068}
            ],
            "estimated_positions": [
                {"point_id": "GCP-01", "x_east": 672000.02, "y_north": 4104000.01, "z_elev": 165.03, "reprojection_error_px": 0.35},
                {"point_id": "GCP-02", "x_east": 672499.98, "y_north": 4104500.02, "z_elev": 165.98, "reprojection_error_px": 0.41},
                {"point_id": "CP-01", "x_east": 672200.03, "y_north": 4104199.97, "z_elev": 165.54, "reprojection_error_px": 0.48}
            ]
        }
        res = self.client.post("/api/v1/drone/gcp/quality", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["ortho_id"], "ORTHO-SL-DAM-01")
        self.assertTrue(data["survey_grade_achieved"])
        self.assertIn("control_rmse", data)
        self.assertIn("check_rmse", data)
        self.assertEqual(len(data["residuals"]), 3)
        self.assertLess(data["control_rmse"]["rmse_3d_m"], 0.05)

        # Test route alias /gcp-quality and coordinate aliases (x, y, z)
        alias_payload = {
            "ortho_id": "ORTHO-SL-DAM-02",
            "control_points": [
                {"point_id": "GCP-01", "role": "control", "x": 672000.0, "y": 4104000.0, "z": 165.0}
            ],
            "estimated_positions": [
                {"point_id": "GCP-01", "x": 672000.01, "y": 4104000.01, "z": 165.01}
            ]
        }
        res_alias = self.client.post("/api/v1/drone/gcp-quality", json=alias_payload)
        self.assertEqual(res_alias.status_code, 200)
        self.assertTrue(res_alias.json()["survey_grade_achieved"])

        # Test GCP GeoJSON export
        res_geo = self.client.post("/api/v1/drone/gcp/geojson", json=payload["control_points"])
        self.assertEqual(res_geo.status_code, 200)
        geo_data = res_geo.json()
        self.assertEqual(geo_data["type"], "FeatureCollection")
        self.assertEqual(len(geo_data["features"]), 3)

    def test_drone_camera_calibration_api(self):
        """Test GET /api/v1/drone/camera/calibration/{camera_id} returns interior orientation parameters."""
        res = self.client.get("/api/v1/drone/camera/calibration/DJI-ZENMUSE-P1-01")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["camera_id"], "DJI-ZENMUSE-P1-01")
        self.assertEqual(data["focal_length_mm"], 35.0)
        self.assertIn("principal_point_x_px", data)
        self.assertIn("radial_distortion_k1", data)

        # Test route alias /calibration/camera/{camera_id} and fallback camera profile
        res_alias = self.client.get("/api/v1/drone/calibration/camera/CUSTOM-CAMERA-99")
        self.assertEqual(res_alias.status_code, 200)
        self.assertEqual(res_alias.json()["camera_id"], "CUSTOM-CAMERA-99")

    def test_topographic_wetness_index_api(self):
        """Test POST /api/v1/analysis/terrain/twi and dynamic XYZ tile streaming."""
        res = self.client.post("/api/v1/analysis/terrain/twi", json={
            "asset_id": "SAN-LUIS-DAM-01",
            "bbox": [-121.12, 37.02, -121.04, 37.09],
            "grid_resolution_m": 10.0
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["asset_id"], "SAN-LUIS-DAM-01")
        self.assertIn("mean_twi", data)
        self.assertIn("min_twi", data)
        self.assertIn("max_twi", data)
        self.assertIn("tile_url_template", data)

        # Test route alias /analysis/twi with omitted asset_id
        res_alias = self.client.post("/api/v1/analysis/twi", json={
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res_alias.status_code, 200)

        # Test TWI XYZ tile streaming
        res_tile = self.client.get("/api/v1/tiles/terrain/twi/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_slope_stability_factor_of_safety_api(self):
        """Test POST /api/v1/analysis/terrain/slope-stability and dynamic XYZ slope stability tiles."""
        res = self.client.post("/api/v1/analysis/terrain/slope-stability", json={
            "asset_id": "SAN-LUIS-EMBANKMENT-01",
            "bbox": [-121.12, 37.02, -121.04, 37.09],
            "cohesion_kpa": 14.0,
            "friction_angle_deg": 32.0,
            "soil_unit_weight_kn_m3": 19.5,
            "water_table_ratio": 0.4
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["asset_id"], "SAN-LUIS-EMBANKMENT-01")
        self.assertIn("mean_factor_of_safety", data)
        self.assertIn("min_factor_of_safety", data)
        self.assertIn("stability_tier", data)
        self.assertIn("tier_breakdown", data)
        self.assertIn("tile_url_template", data)

        # Test route alias /analysis/slope-stability
        res_alias = self.client.post("/api/v1/analysis/slope-stability", json={
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res_alias.status_code, 200)

        # Test Slope Stability XYZ tile streaming
        res_tile = self.client.get("/api/v1/tiles/terrain/slope-stability/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_hls_spectral_cross_calibration_api(self):
        """Test POST /api/v1/analysis/hls/calibrate cross-harmonizes Landsat and Sentinel bands."""
        res = self.client.post("/api/v1/analysis/hls/calibrate", json={
            "source_platform": "landsat_oli",
            "target_platform": "sentinel_msi",
            "band_name": "red",
            "reflectance_values": [0.05, 0.12, 0.25]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["source_platform"], "landsat_oli")
        self.assertEqual(data["target_platform"], "sentinel_msi")
        self.assertEqual(data["band_name"], "red")
        self.assertEqual(len(data["calibrated_values"]), 3)
        self.assertIn("mean_calibrated", data)
        self.assertIn("formula_applied", data)

        # Test route alias /analysis/hls-calibrate and lenient input parameter aliases
        res_alias = self.client.post("/api/v1/analysis/hls-calibrate", json={
            "source_platform": "landsat_8_9",
            "target_platform": "sentinel_2a_2b",
            "band": "nir",
            "reflectance": 0.35
        })
        self.assertEqual(res_alias.status_code, 200)
        alias_data = res_alias.json()
        self.assertEqual(len(alias_data["calibrated_values"]), 1)
        self.assertEqual(alias_data["band_name"], "nir")

    def test_water_quality_trophic_state_api(self):
        """Test POST /api/v1/analysis/water-quality computes NDCI, NDTI, and Carlson trophic classifications."""
        res = self.client.post("/api/v1/analysis/water-quality", json={
            "asset_id": "SAN-LUIS-RESERVOIR",
            "item_id": "S2A_MSIL2A_20260901",
            "bbox": [-121.12, 37.02, -121.04, 37.09],
            "metric": "ndci"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["asset_id"], "SAN-LUIS-RESERVOIR")
        self.assertEqual(data["primary_metric"], "ndci")
        self.assertIn("mean_value", data)
        self.assertIn("dominant_trophic_state", data)
        self.assertIn("bloom_detected", data)
        self.assertIn("trophic_breakdown", data)
        self.assertGreater(len(data["trophic_breakdown"]), 0)
        self.assertIn("tile_url_template", data)

        # Test route alias /analysis/water_quality with parameter aliases
        res_alias = self.client.post("/api/v1/analysis/water_quality", json={
            "water_body_id": "SAN-LUIS-RESERVOIR",
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res_alias.status_code, 200)

        # Test Water Quality XYZ tile streaming
        res_tile = self.client.get("/api/v1/tiles/water-quality/ndci/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_lst_radiative_transfer_api(self):
        """Test POST /api/v1/analysis/lst/radiative-transfer and dynamic thermal LST tile streaming."""
        res = self.client.post("/api/v1/analysis/lst/radiative-transfer", json={
            "collection": "landsat-c2-l2",
            "item_id": "LC09_L2SP_044034_20260810",
            "bbox": [-121.12, 37.02, -121.04, 37.09],
            "ndvi_soil": 0.05,
            "ndvi_veg": 0.70
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "LC09_L2SP_044034_20260810")
        self.assertIn("mean_lst_c", data)
        self.assertIn("mean_lst_k", data)
        self.assertIn("heat_hazard_level", data)
        self.assertIn("tile_url_template", data)

        # Route alias /analysis/lst
        res_alias = self.client.post("/api/v1/analysis/lst", json={
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res_alias.status_code, 200)

        # Thermal LST XYZ Tile
        res_tile = self.client.get("/api/v1/tiles/thermal/lst/landsat-c2-l2/LC09_L2SP_044034_20260810/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_topographic_correction_api(self):
        """Test POST /api/v1/analysis/topographic-correction solar illumination normalization."""
        res = self.client.post("/api/v1/analysis/topographic-correction", json={
            "item_id": "S2A_MSIL2A_20260820_T10SEJ",
            "model": "c_correction",
            "solar_zenith_deg": 35.0,
            "solar_azimuth_deg": 135.0,
            "c_parameter": 0.12,
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "S2A_MSIL2A_20260820_T10SEJ")
        self.assertIn("mean_illumination_cos", data)
        self.assertIn("mean_reflectance_before", data)
        self.assertIn("mean_reflectance_after", data)
        self.assertEqual(data["status"], "corrected")

        # Route alias /analysis/topographic_correction
        res_alias = self.client.post("/api/v1/analysis/topographic_correction", json={
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res_alias.status_code, 200)

    def test_insar_displacement_and_coherence_api(self):
        """Test POST /api/v1/analysis/insar/displacement, coherence, and SAR InSAR tiles."""
        disp_res = self.client.post("/api/v1/analysis/insar/displacement", json={
            "primary_scene_id": "S1A_IW_GRDH_1SDV_20260801",
            "secondary_scene_id": "S1A_IW_GRDH_1SDV_20260813",
            "temporal_baseline_days": 12.0,
            "perpendicular_baseline_m": 45.0,
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(disp_res.status_code, 200)
        disp_data = disp_res.json()
        self.assertIn("mean_displacement_mm", disp_data)
        self.assertIn("mean_velocity_mm_yr", disp_data)
        self.assertIn("deformation_tier", disp_data)
        self.assertIn("tile_url_template", disp_data)

        # Coherence endpoint
        coh_res = self.client.post("/api/v1/analysis/insar/coherence", json={
            "pair_id": "PAIR-S1-20260801-20260813",
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(coh_res.status_code, 200)
        coh_data = coh_res.json()
        self.assertIn("mean_coherence", coh_data)
        self.assertIn("structural_stability_score", coh_data)

        # InSAR XYZ Tile
        res_tile = self.client.get("/api/v1/tiles/sar/insar/PAIR-S1-20260801-20260813/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_phenology_harmonic_analysis_api(self):
        """Test POST /api/v1/analysis/phenology/extract Fourier curve fitting and phenometrics."""
        res = self.client.post("/api/v1/analysis/phenology/extract", json={
            "asset_id": "SAN-LUIS-WATERSHED",
            "timeseries": [
                {"date": "2026-02-15", "value": 0.22},
                {"date": "2026-04-15", "value": 0.58},
                {"date": "2026-06-15", "value": 0.76},
                {"date": "2026-08-15", "value": 0.45},
                {"date": "2026-10-15", "value": 0.28}
            ]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["aoi_name"], "SAN-LUIS-WATERSHED")
        self.assertIn("phenometrics", data)
        self.assertIn("sos_doy", data["phenometrics"])
        self.assertIn("pos_doy", data["phenometrics"])
        self.assertIn("eos_doy", data["phenometrics"])
        self.assertIn("los_days", data["phenometrics"])
        self.assertIn("curve_points", data)

    def test_bap_composite_api(self):
        """Test POST /api/v1/analysis/composites/bap and dynamic composite XYZ tile streaming."""
        res = self.client.post("/api/v1/analysis/composites/bap", json={
            "collection": "sentinel-2-l2a",
            "item_ids": ["S2A_MSIL2A_20260715_T10SEJ", "S2A_MSIL2A_20260815_T10SEJ"],
            "target_doy": 215,
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("composite_id", data)
        self.assertEqual(data["collection"], "sentinel-2-l2a")
        self.assertIn("mean_pixel_score", data)
        self.assertIn("tile_url_template", data)

        # Dynamic BAP composite tile
        res_tile = self.client.get(f"/api/v1/tiles/composites/bap/{data['composite_id']}/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_geometric_coregistration_api(self):
        """Test POST /api/v1/analysis/geometric/coregistration calculates sub-pixel Fourier shift vectors."""
        res = self.client.post("/api/v1/analysis/geometric/coregistration", json={
            "reference_scene_id": "S2A_MSIL2A_20260815_T10SEJ",
            "target_scene_id": "LC09_L2SP_044034_20260810",
            "window_size_px": 256,
            "resampling_kernel": "cubic"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["reference_scene_id"], "S2A_MSIL2A_20260815_T10SEJ")
        self.assertEqual(data["target_scene_id"], "LC09_L2SP_044034_20260810")
        self.assertEqual(data["status"], "converged")
        self.assertIn("shift_x_px", data)
        self.assertIn("shift_y_px", data)
        self.assertIn("total_shift_m", data)
        self.assertIn("rmse_px", data)

        # Route alias /analysis/coregistration
        res_alias = self.client.post("/api/v1/analysis/coregistration", json={
            "reference_scene_id": "S2A_REF",
            "target_scene_id": "S2A_TGT"
        })
        self.assertEqual(res_alias.status_code, 200)

    def test_point_cloud_filter_and_chm_api(self):
        """Test POST /api/v1/analysis/point-cloud/filter, /chm, and dynamic CHM tile streaming."""
        # 1. PMF Ground Filtering
        filter_res = self.client.post("/api/v1/analysis/point-cloud/filter", json={
            "point_cloud_id": "pc-san-luis-embankment-2026",
            "format": "copc"
        })
        self.assertEqual(filter_res.status_code, 200)
        filter_data = filter_res.json()
        self.assertEqual(filter_data["point_cloud_id"], "pc-san-luis-embankment-2026")
        self.assertGreater(filter_data["ground_points"], 0)
        self.assertIn("classified_copc_url", filter_data)

        # 2. Canopy Height Model (CHM = DSM - DTM)
        chm_res = self.client.post("/api/v1/analysis/point-cloud/chm", json={
            "asset_id": "SAN-LUIS-EMBANKMENT-01",
            "dsm_item_id": "dsm_san_luis_2026",
            "dtm_item_id": "dtm_san_luis_2026",
            "grid_resolution_m": 1.0
        })
        self.assertEqual(chm_res.status_code, 200)
        chm_data = chm_res.json()
        self.assertEqual(chm_data["asset_id"], "SAN-LUIS-EMBANKMENT-01")
        self.assertIn("mean_height_m", chm_data)
        self.assertIn("max_height_m", chm_data)
        self.assertIn("infrastructure_encroachment_ha", chm_data)
        self.assertIn("tile_url_template", chm_data)

        # Route alias /analysis/chm
        res_alias = self.client.post("/api/v1/analysis/chm", json={
            "asset_id": "SAN-LUIS-EMBANKMENT-01"
        })
        self.assertEqual(res_alias.status_code, 200)

        # Dynamic CHM tile streaming
        res_tile = self.client.get("/api/v1/tiles/terrain/chm/SAN-LUIS-EMBANKMENT-01/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_ortho_occlusion_and_seamlines_api(self):
        """Test POST /api/v1/analysis/ortho/occlusion, seamlines, and true ortho tiles."""
        # 1. Occlusion evaluation
        occ_res = self.client.post("/api/v1/analysis/ortho/occlusion", json={
            "ortho_id": "ORTHO-SL-DAM-2026",
            "dsm_id": "DSM-SL-DAM-2026",
            "sun_zenith_deg": 35.0,
            "sun_azimuth_deg": 135.0,
            "sensor_off_nadir_deg": 6.5
        })
        self.assertEqual(occ_res.status_code, 200)
        occ_data = occ_res.json()
        self.assertEqual(occ_data["ortho_id"], "ORTHO-SL-DAM-2026")
        self.assertIn("occluded_pixel_count", occ_data)
        self.assertIn("occluded_area_pct", occ_data)
        self.assertTrue(occ_data["true_ortho_ready"])

        # 2. Graph-cut seamline optimization
        seam_res = self.client.post("/api/v1/analysis/ortho/seamlines", json={
            "granule_ids": ["GRANULE-01", "GRANULE-02", "GRANULE-03"],
            "algorithm": "graph_cut_energy"
        })
        self.assertEqual(seam_res.status_code, 200)
        seam_data = seam_res.json()
        self.assertIn("mosaic_id", seam_data)
        self.assertIn("seamline_count", seam_data)
        self.assertIn("total_seamline_length_m", seam_data)
        self.assertIn("tile_url_template", seam_data)

        # Dynamic True Ortho XYZ tile streaming
        res_tile = self.client.get(f"/api/v1/tiles/ortho/true/{seam_data['mosaic_id']}/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_byoc_storage_and_tiles_api(self):
        """Test /api/v1/byoc endpoints: list, register, detail, sync, and XYZ tile streaming."""
        # 1. List buckets
        list_res = self.client.get("/api/v1/byoc/buckets")
        self.assertEqual(list_res.status_code, 200)
        buckets = list_res.json()
        self.assertIsInstance(buckets, list)
        self.assertGreater(len(buckets), 0)

        # 2. Register new bucket
        reg_res = self.client.post("/api/v1/byoc/buckets", json={
            "bucket_name": "test-survey-cog-vault",
            "provider": "aws_s3"
        })
        self.assertEqual(reg_res.status_code, 200)
        new_bucket = reg_res.json()
        self.assertEqual(new_bucket["bucket_name"], "test-survey-cog-vault")
        b_id = new_bucket["bucket_id"]

        # 3. Bucket detail
        detail_res = self.client.get(f"/api/v1/byoc/buckets/{b_id}")
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["bucket_id"], b_id)

        # 4. Sync bucket catalog
        sync_res = self.client.post(f"/api/v1/byoc/buckets/{b_id}/sync")
        self.assertEqual(sync_res.status_code, 200)
        sync_data = sync_res.json()
        self.assertEqual(sync_data["bucket_id"], b_id)
        self.assertGreater(sync_data["total_cogs_discovered"], 0)

        # 5. Dynamic BYOC tile streaming
        res_tile = self.client.get(f"/api/v1/tiles/byoc/{b_id}/cog-test/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_mann_kendall_trend_analysis_api(self):
        """Test POST /api/v1/analysis/timeseries/mann-kendall and route aliases."""
        payload = {
            "metric_name": "ndvi_trend",
            "values": [0.22, 0.28, 0.35, 0.42, 0.49, 0.58],
            "dates": ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"],
            "alpha": 0.05
        }
        res = self.client.post("/api/v1/analysis/timeseries/mann-kendall", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["metric_name"], "ndvi_trend")
        self.assertEqual(data["sample_size"], 6)
        self.assertGreater(data["s_statistic"], 0)
        self.assertEqual(data["direction"], "increasing")
        self.assertTrue(data["is_significant"])

        # Test route alias /analysis/mann-kendall
        res_alias = self.client.post("/api/v1/analysis/mann-kendall", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # Test timeseries router alias /timeseries/mann-kendall
        res_ts = self.client.post("/api/v1/timeseries/mann-kendall", json=payload)
        self.assertEqual(res_ts.status_code, 200)

    def test_dos1_atmospheric_correction_api(self):
        """Test POST /api/v1/analysis/atmospheric/dos1 Chavez (1988) radiative transfer."""
        payload = {
            "item_id": "LC09_L2SP_044034_20260810",
            "sun_zenith_deg": 35.0,
            "earth_sun_distance_au": 1.012,
            "dark_object_dn_threshold": 100
        }
        res = self.client.post("/api/v1/analysis/atmospheric/dos1", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "LC09_L2SP_044034_20260810")
        self.assertEqual(data["model_applied"], "dos1")
        self.assertIn("band_haze_values", data)
        self.assertIn("mean_surface_reflectance", data)
        self.assertIn("blue", data["mean_surface_reflectance"])
        self.assertIn("nir", data["mean_surface_reflectance"])

        # Test route alias /analysis/dos1
        res_alias = self.client.post("/api/v1/analysis/dos1", json=payload)
        self.assertEqual(res_alias.status_code, 200)

    def test_cva_change_vector_analysis_and_tiles_api(self):
        """Test POST /api/v1/analysis/change/cva and dynamic CVA tile streaming."""
        payload = {
            "pre_scene_id": "LC09_20260601",
            "post_scene_id": "LC09_20260815",
            "magnitude_threshold": 0.15,
            "bands": ["red", "nir"]
        }
        res = self.client.post("/api/v1/analysis/change/cva", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pre_scene_id"], "LC09_20260601")
        self.assertEqual(data["post_scene_id"], "LC09_20260815")
        self.assertIn("mean_magnitude", data)
        self.assertIn("changed_area_hectares", data)
        self.assertIn("sector_breakdown", data)
        self.assertIn("tile_url_template", data)

        # Route alias /analysis/cva
        res_alias = self.client.post("/api/v1/analysis/cva", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # Dynamic CVA tile
        res_tile = self.client.get("/api/v1/tiles/change/cva/LC09_20260601/LC09_20260815/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_soil_salinity_analysis_and_tiles_api(self):
        """Test POST /api/v1/analysis/soil/salinity and dynamic soil salinity tiles."""
        payload = {
            "collection": "landsat-c2-l2",
            "item_id": "LC09_L2SP_044034_20260810",
            "index_type": "ndsi",
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        }
        res = self.client.post("/api/v1/analysis/soil/salinity", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "LC09_L2SP_044034_20260810")
        self.assertEqual(data["index_type"], "ndsi")
        self.assertIn("mean_salinity_index", data)
        self.assertIn("saline_area_hectares", data)
        self.assertIn("hazard_tiers", data)
        self.assertIn("tile_url_template", data)

        # Route aliases /analysis/soil-salinity and /analysis/salinity
        res_alias1 = self.client.post("/api/v1/analysis/soil-salinity", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/salinity", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Soil Salinity tile
        res_tile = self.client.get("/api/v1/tiles/soil/salinity/landsat-c2-l2/LC09_L2SP_044034_20260810/ndsi/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_wildfire_thermal_hotspots_and_frp_tiles_api(self):
        """Test POST /api/v1/analysis/thermal/hotspots and dynamic active fire FRP tiles."""
        payload = {
            "collection": "landsat-c2-l2",
            "item_id": "LC09_L2SP_044034_20260810",
            "bbox": [-121.12, 37.02, -121.04, 37.09],
            "delta_t_threshold_k": 10.0
        }
        res = self.client.post("/api/v1/analysis/thermal/hotspots", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "LC09_L2SP_044034_20260810")
        self.assertIn("total_hotspots_detected", data)
        self.assertIn("total_frp_mw", data)
        self.assertIn("hotspots", data)
        self.assertIn("tile_url_template", data)

        # Route aliases /analysis/thermal-hotspots and /analysis/hotspots
        res_alias1 = self.client.post("/api/v1/analysis/thermal-hotspots", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/hotspots", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Active Fire Thermal Hotspot tile
        res_tile = self.client.get("/api/v1/tiles/thermal/hotspots/landsat-c2-l2/LC09_L2SP_044034_20260810/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

if __name__ == "__main__":
    unittest.main()

