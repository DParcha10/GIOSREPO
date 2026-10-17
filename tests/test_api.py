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

    def test_usgs_integration_resilience_and_parameter_fallback(self):
        """Test DataIntegrationService.get_usgs_station fills in calibrated baseline for missing parameters and 503 outages."""
        import asyncio
        from unittest.mock import patch, MagicMock
        from app.services.integration import DataIntegrationService

        service = DataIntegrationService()

        # 1. Test partial response fallback (e.g. site 09486000 where discharge is None in live feed)
        mock_resp_partial = MagicMock()
        mock_resp_partial.status_code = 200
        mock_resp_partial.json.return_value = {
            "value": {
                "timeSeries": [
                    {
                        "variable": {"variableCode": [{"value": "00065"}]},
                        "values": [{"value": [{"value": "3.85"}]}]
                    }
                ]
            }
        }

        with patch("httpx.AsyncClient.get", return_value=mock_resp_partial):
            res_partial = asyncio.run(service.get_usgs_station("09486000"))
            self.assertEqual(res_partial["site_id"], "09486000")
            self.assertEqual(res_partial["gage_height_ft"], 3.85)
            # discharge_cfs should be populated from baseline (12.0)
            self.assertEqual(res_partial["discharge_cfs"], 12.0)
            # water_temp_c should be populated from baseline (28.0)
            self.assertEqual(res_partial["water_temp_c"], 28.0)

        # 1b. Test malformed non-numeric readings ("Ice", "Eqp") and empty lists
        service_malformed = DataIntegrationService()
        mock_resp_malformed = MagicMock()
        mock_resp_malformed.status_code = 200
        mock_resp_malformed.json.return_value = {
            "value": {
                "timeSeries": [
                    {
                        "variable": {"variableCode": []},
                        "values": [{"value": []}]
                    },
                    {
                        "variable": {"variableCode": [{"value": "00060"}]},
                        "values": [{"value": [{"value": "Ice"}]}]
                    }
                ]
            }
        }
        with patch("httpx.AsyncClient.get", return_value=mock_resp_malformed):
            res_malformed = asyncio.run(service_malformed.get_usgs_station("09486000"))
            self.assertEqual(res_malformed["site_id"], "09486000")
            self.assertEqual(res_malformed["discharge_cfs"], 12.0)

        # 2. Test complete upstream outage / HTTP 503 fallback
        service_outage = DataIntegrationService()
        mock_resp_503 = MagicMock()
        mock_resp_503.status_code = 503

        with patch("httpx.AsyncClient.get", return_value=mock_resp_503):
            res_503 = asyncio.run(service_outage.get_usgs_station("11262900"))
            self.assertEqual(res_503["site_id"], "11262900")
            self.assertEqual(res_503["discharge_cfs"], 18.5)
            self.assertEqual(res_503["gage_height_ft"], 4.76)

        # 3. Test HTTP API endpoint integration
        res_endpoint = self.client.get("/api/v1/integration/usgs/11262900")
        self.assertEqual(res_endpoint.status_code, 200)
        self.assertIn("discharge_cfs", res_endpoint.json())

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

    def test_dam_breach_inundation_and_tiles_api(self):
        """Test POST /api/v1/analysis/hazard/dam-breach and dynamic flood inundation tiles."""
        payload = {
            "asset_id": "SAN-LUIS-DAM-01",
            "reservoir_volume_m3": 2500000.0,
            "dam_height_m": 38.5,
            "failure_mode": "overtopping",
            "manning_n": 0.045,
            "downstream_slope": 0.012,
            "reach_length_km": 15.0
        }
        res = self.client.post("/api/v1/analysis/hazard/dam-breach", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["aoi_id"], "SAN-LUIS-DAM-01")
        self.assertIn("peak_breach_discharge_m3s", data)
        self.assertIn("max_flood_depth_m", data)
        self.assertIn("points", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias = self.client.post("/api/v1/analysis/dam-breach", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # Dynamic Flood Inundation tile
        res_tile = self.client.get("/api/v1/tiles/hazard/flood-inundation/SIM-SAN-LUIS-001/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_landslide_susceptibility_and_tiles_api(self):
        """Test POST /api/v1/analysis/hazard/landslide-susceptibility and dynamic landslide tiles."""
        payload = {
            "asset_id": "SAN-LUIS-DAM-01",
            "cohesion_kpa": 18.0,
            "friction_angle_deg": 32.0,
            "unit_weight_kn_m3": 19.5,
            "soil_depth_m": 2.5,
            "slope_deg": 28.5,
            "water_table_ratio": 0.4,
            "trigger_type": "rainfall"
        }
        res = self.client.post("/api/v1/analysis/hazard/landslide-susceptibility", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["aoi_id"], "SAN-LUIS-DAM-01")
        self.assertIn("static_fs", data)
        self.assertIn("susceptibility_tier", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias = self.client.post("/api/v1/analysis/landslide", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # Dynamic Landslide tile
        res_tile = self.client.get("/api/v1/tiles/hazard/landslide/SAN-LUIS-DAM-01/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_drought_vhi_analysis_and_tiles_api(self):
        """Test POST /api/v1/analysis/drought/vhi and dynamic drought VHI tiles."""
        payload = {
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_20260815",
            "sample_ndvi": 0.42,
            "sample_lst_c": 32.5,
            "alpha": 0.5
        }
        res = self.client.post("/api/v1/analysis/drought/vhi", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "S2A_20260815")
        self.assertIn("mean_vhi", data)
        self.assertIn("drought_tier", data)
        self.assertIn("tile_url_template", data)

        # Route alias
        res_alias1 = self.client.post("/api/v1/analysis/drought-vhi", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/vhi", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Drought VHI tile
        res_tile = self.client.get("/api/v1/tiles/drought/vhi/sentinel-2-l2a/S2A_20260815/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_sam_mineral_classification_and_tiles_api(self):
        """Test POST /api/v1/analysis/geology/sam and dynamic SAM mineral tiles."""
        payload = {
            "endmember": "pyrite",
            "max_angle_rad": 0.15,
            "sample_pixel_reflectance": {
                "blue": 0.12, "green": 0.18, "red": 0.22, "nir": 0.28, "swir1": 0.35, "swir2": 0.31
            }
        }
        res = self.client.post("/api/v1/analysis/geology/sam", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["target_endmember"], "pyrite")
        self.assertIn("spectral_angle_rad", data)
        self.assertIn("similarity_score", data)
        self.assertIn("tile_url_template", data)

        # Route alias
        res_alias1 = self.client.post("/api/v1/analysis/sam", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/sam-mineral", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic SAM tile
        res_tile = self.client.get("/api/v1/tiles/geology/sam/sentinel-2-l2a/S2A_20260815/pyrite/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_vector_export_and_mvt_tiles_api(self):
        """Test POST /api/v1/analysis/vector/export and dynamic Mapbox Vector Tile (.pbf) streaming."""
        payload = {
            "layer_id": "infrastructure",
            "format": "geojson",
            "bbox": [-121.12, 37.02, -121.04, 37.09]
        }
        res = self.client.post("/api/v1/analysis/vector/export", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("export_id", data)
        self.assertIn("download_url", data)

        export_id = data["export_id"]
        res_dl = self.client.get(f"/api/v1/analysis/vector/export/{export_id}/download")
        self.assertEqual(res_dl.status_code, 200)

        # Dynamic MVT Protobuf vector tile
        res_tile = self.client.get("/api/v1/tiles/vector/infrastructure/12/1042/1628.pbf")
        self.assertEqual(res_tile.status_code, 200)
        self.assertIn("protobuf", res_tile.headers.get("content-type", ""))
        self.assertGreater(len(res_tile.content), 10)

    def test_fractional_snow_cover_and_tiles_api(self):
        """Test POST /api/v1/analysis/cryosphere/snow-cover and dynamic snow cover tiles."""
        payload = {
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_20260215",
            "model_type": "salomonson_appel",
            "green_band_reflectance": 0.48,
            "swir1_band_reflectance": 0.12,
            "elevation_m": 2450.0,
            "snow_depth_m": 0.85,
            "snow_density_kg_m3": 320.0,
            "runoff_coefficient": 0.85
        }
        res = self.client.post("/api/v1/analysis/cryosphere/snow-cover", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "S2A_20260215")
        self.assertIn("ndsi", data)
        self.assertIn("fractional_snow_cover", data)
        self.assertIn("fractional_snow_cover_pct", data)
        self.assertIn("runoff_hazard_tier", data)
        self.assertIn("estimated_swe_mm", data)
        self.assertIn("estimated_melt_volume_m3", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/snow-cover", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/cryosphere/snow_cover", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Snow Cover tile
        res_tile = self.client.get("/api/v1/tiles/cryosphere/snow-cover/sentinel-2-l2a/S2A_20260215/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_aquatic_turbidity_tsm_and_tiles_api(self):
        """Test POST /api/v1/analysis/water/turbidity-tsm and dynamic aquatic turbidity tiles."""
        payload = {
            "collection": "sentinel-2-l2a",
            "item_id": "S2B_20260714",
            "algorithm": "dogliotti_switching",
            "red_reflectance": 0.065,
            "nir_reflectance": 0.038,
            "water_body_area_ha": 350.0
        }
        res = self.client.post("/api/v1/analysis/water/turbidity-tsm", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "S2B_20260714")
        self.assertIn("total_suspended_matter_g_m3", data)
        self.assertIn("turbidity_ntu", data)
        self.assertIn("hazard_tier", data)
        self.assertIn("sediment_plume_detected", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/turbidity-tsm", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/water/turbidity", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Turbidity tile
        res_tile = self.client.get("/api/v1/tiles/water/turbidity-tsm/sentinel-2-l2a/S2B_20260714/turbidity/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_structural_disturbance_breaks_and_tiles_api(self):
        """Test POST /api/v1/analysis/disturbance/breaks and dynamic disturbance breaks tiles."""
        payload = {
            "metric_name": "ndvi",
            "model": "bfast_lite",
            "significance_alpha": 0.05,
            "time_series_values": [0.72, 0.70, 0.71, 0.69, 0.68, 0.42, 0.38, 0.36, 0.35, 0.33, 0.31, 0.30],
            "time_series_dates": [
                "2025-01-15", "2025-03-01", "2025-04-15", "2025-06-01",
                "2025-07-15", "2025-09-01", "2025-10-15", "2025-12-01",
                "2026-01-15", "2026-03-01", "2026-04-15", "2026-06-01"
            ]
        }
        res = self.client.post("/api/v1/analysis/disturbance/breaks", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("breakpoints_detected", data)
        self.assertIn("total_observations", data)
        self.assertIn("overall_disturbance_type", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/disturbance-breaks", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/disturbance", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Disturbance Breaks tile
        res_tile = self.client.get("/api/v1/tiles/disturbance/breaks/sentinel-2-l2a/breaks/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_crop_water_stress_index_and_tiles_api(self):
        """Test POST /api/v1/analysis/agriculture/cwsi and dynamic CWSI tiles."""
        payload = {
            "collection": "landsat-c2-l2",
            "item_id": "LC09_20260718",
            "model_type": "empirical_idso",
            "canopy_temperature_c": 33.5,
            "air_temperature_c": 28.0,
            "relative_humidity_pct": 32.0,
            "vapor_pressure_deficit_kpa": 2.6,
            "ndvi": 0.68,
            "reference_et0_mm_day": 6.2
        }
        res = self.client.post("/api/v1/analysis/agriculture/cwsi", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "LC09_20260718")
        self.assertIn("cwsi", data)
        self.assertIn("evaporative_fraction", data)
        self.assertIn("actual_et_mm_day", data)
        self.assertIn("water_stress_tier", data)
        self.assertIn("irrigation_priority", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/cwsi", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/crop-water-stress", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic CWSI tile
        res_tile = self.client.get("/api/v1/tiles/agriculture/cwsi/landsat-c2-l2/LC09_20260718/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_pyramid_spline_mosaic_blending_and_tiles_api(self):
        """Test POST /api/v1/analysis/mosaic/spline-blend and dynamic spline mosaic tiles."""
        payload = {
            "mosaic_id": "MOSAIC-SPLINE-TEST-01",
            "left_scene_id": "SCENE-A-20260810",
            "right_scene_id": "SCENE-B-20260812",
            "blend_mode": "multiresolution_spline",
            "pyramid_levels": 5,
            "seam_transition_width_px": 64,
            "left_mean_radiance": 132.5,
            "right_mean_radiance": 128.2
        }
        res = self.client.post("/api/v1/analysis/mosaic/spline-blend", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["mosaic_id"], "MOSAIC-SPLINE-TEST-01")
        self.assertEqual(data["blend_mode"], "multiresolution_spline")
        self.assertIn("pyramid_levels", data)
        self.assertIn("mean_gradient_discontinuity_dn", data)
        self.assertIn("radiometric_quality", data)
        self.assertIn("is_seamless", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/mosaic/spline", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/spline-blend", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Spline Mosaic tile
        res_tile = self.client.get("/api/v1/tiles/mosaic/spline/MOSAIC-SPLINE-TEST-01/12/1042/1628.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_drone_direct_georeferencing_and_tiles_api(self):
        """Test POST /api/v1/drone/direct-georeferencing, aliases, and dynamic footprint tiles."""
        payload = {
            "mission_id": "TEST_UAV_01",
            "gnss_latitude": 36.9532,
            "gnss_longitude": -121.0825,
            "gnss_altitude_m": 420.0,
            "ground_elevation_m": 350.0,
            "roll_deg": 1.5,
            "pitch_deg": -0.8,
            "yaw_deg": 45.0,
            "lever_arm": {"lx_m": 0.05, "ly_m": -0.02, "lz_m": 0.15},
            "boresight": {"omega_deg": 0.12, "phi_deg": -0.08, "kappa_deg": 0.25},
            "sensor_spec": {
                "focal_length_mm": 24.0,
                "sensor_width_mm": 35.9,
                "sensor_height_mm": 24.0,
                "image_width_px": 5472,
                "image_height_px": 3648
            },
            "gnss_uncertainty_m": 0.02,
            "attitude_uncertainty_deg": 0.01
        }
        res = self.client.post("/api/v1/drone/direct-georeferencing", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["mission_id"], "TEST_UAV_01")
        self.assertIn("camera_latitude", data)
        self.assertIn("camera_longitude", data)
        self.assertIn("camera_altitude_m", data)
        self.assertIn("flight_height_agl_m", data)
        self.assertIn("gsd_cm_px", data)
        self.assertIn("footprint_polygon", data)
        self.assertIn("quality_tier", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/drone/boresight", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/drone/direct-georeferencing", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Direct Georeferencing tile
        res_tile = self.client.get("/api/v1/drone/direct-georeferencing/TEST_UAV_01/tiles/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_embankment_crest_alignment_and_tiles_api(self):
        """Test POST /api/v1/analysis/geotechnical/crest-alignment, aliases, and dynamic crest tiles."""
        payload = {
            "alignment_id": "ALIGN_TEST_01",
            "centerline_points": [
                [36.9540, -121.0830, 350.00],
                [36.9546, -121.0818, 349.55],
                [36.9552, -121.0806, 349.95]
            ],
            "design_elevation_m": 350.0,
            "station_interval_m": 20.0,
            "crest_width_m": 12.0
        }
        res = self.client.post("/api/v1/analysis/geotechnical/crest-alignment", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["alignment_id"], "ALIGN_TEST_01")
        self.assertIn("total_length_m", data)
        self.assertIn("station_count", data)
        self.assertIn("max_settlement_m", data)
        self.assertIn("overall_severity_tier", data)
        self.assertTrue(data["overtopping_risk_detected"])
        self.assertIn("stations", data)
        self.assertGreater(len(data["stations"]), 0)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/crest-alignment", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/geotechnical/crest_alignment", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Crest Alignment tile
        res_tile = self.client.get("/api/v1/tiles/geotechnical/crest-alignment/ALIGN_TEST_01/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_ps_insar_stack_and_tiles_api(self):
        """Test POST /api/v1/analysis/sar/ps-insar-stack, aliases, and dynamic PS-InSAR tiles."""
        payload = {
            "stack_id": "STACK_TEST_01",
            "master_date": "2026-01-10",
            "slave_dates": ["2026-02-03", "2026-03-11", "2026-04-16", "2026-05-22"],
            "filter_mode": "spatiotemporal_gaussian",
            "coherence_threshold": 0.70,
            "dispersion_threshold": 0.25,
            "wavelength_m": 0.055465
        }
        res = self.client.post("/api/v1/analysis/sar/ps-insar-stack", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["stack_id"], "STACK_TEST_01")
        self.assertEqual(data["master_date"], "2026-01-10")
        self.assertEqual(data["slave_count"], 4)
        self.assertIn("mean_temporal_coherence", data)
        self.assertIn("mean_los_velocity_mm_yr", data)
        self.assertIn("overall_stability_tier", data)
        self.assertIn("ps_points", data)
        self.assertGreater(len(data["ps_points"]), 0)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/sar/ps-insar", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/ps-insar-stack", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic PS-InSAR tile
        res_tile = self.client.get("/api/v1/tiles/sar/ps-insar/STACK_TEST_01/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_geotechnical_soil_moisture_and_tiles_api(self):
        """Test POST /api/v1/analysis/geotechnical/soil-moisture, aliases, and dynamic moisture tiles."""
        payload = {
            "collection": "sentinel-1-rtc",
            "item_id": "S1A_IW_GRDH_1SDV_20260915"
        }
        res = self.client.post("/api/v1/analysis/geotechnical/soil-moisture", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["collection"], "sentinel-1-rtc")
        self.assertEqual(data["item_id"], "S1A_IW_GRDH_1SDV_20260915")
        self.assertIn("volumetric_soil_moisture_m3m3", data)
        self.assertIn("soil_moisture_percentage", data)
        self.assertIn("hazard_tier", data)
        self.assertIn("liquefaction_warning", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/geotechnical/soil_moisture", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/sar/soil-moisture", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Soil Moisture tile
        res_tile = self.client.get("/api/v1/tiles/geotechnical/soil-moisture/sentinel-1-rtc/S1A_TEST/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_satellite_bathymetry_and_tiles_api(self):
        """Test POST /api/v1/analysis/water/satellite-bathymetry, aliases, and dynamic bathymetry tiles."""
        payload = {
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_MSIL2A_20260815"
        }
        res = self.client.post("/api/v1/analysis/water/satellite-bathymetry", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["collection"], "sentinel-2-l2a")
        self.assertIn("mean_depth_m", data)
        self.assertIn("max_depth_m", data)
        self.assertIn("estimated_volume_m3", data)
        self.assertIn("siltation_volume_loss_m3", data)
        self.assertIn("siltation_loss_percentage", data)
        self.assertIn("severity_tier", data)
        self.assertIn("critical_siltation_warning", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/water/satellite_bathymetry", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/water/bathymetry", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/analysis/satellite-bathymetry", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # Dynamic Bathymetry tile
        res_tile = self.client.get("/api/v1/tiles/water/bathymetry/sentinel-2-l2a/S2A_TEST/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_gpr_profile_and_tiles_api(self):
        """Test POST /api/v1/analysis/geotechnical/gpr-profile, aliases, and dynamic GPR radargram tiles."""
        payload = {
            "profile_id": "GPR_CREST_TRANSECT_01"
        }
        res = self.client.post("/api/v1/analysis/geotechnical/gpr-profile", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["profile_id"], "GPR_CREST_TRANSECT_01")
        self.assertIn("em_wave_velocity_m_ns", data)
        self.assertIn("max_penetration_depth_m", data)
        self.assertIn("total_stations_scanned", data)
        self.assertIn("anomalies_detected_count", data)
        self.assertIn("critical_void_detected", data)
        self.assertIn("overall_severity", data)
        self.assertIn("scan_stations", data)
        self.assertGreater(len(data["scan_stations"]), 0)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/geotechnical/gpr_profile", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/geotechnical/gpr", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/analysis/gpr-profile", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # Dynamic GPR radargram tile
        res_tile = self.client.get("/api/v1/tiles/geotechnical/gpr/GPR_CREST_TRANSECT_01/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_modal_vibration_and_tiles_api(self):
        """Test POST /api/v1/analysis/structural/modal-vibration, aliases, and dynamic vibration heatmaps."""
        payload = {
            "asset_id": "SAN_LUIS_DAM_MONOLITH_04"
        }
        res = self.client.post("/api/v1/analysis/structural/modal-vibration", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["asset_id"], "SAN_LUIS_DAM_MONOLITH_04")
        self.assertIn("fundamental_frequency_hz", data)
        self.assertIn("frequency_shift_percentage", data)
        self.assertIn("peak_particle_velocity_mm_s", data)
        self.assertIn("usbm_limit_ppv_mm_s", data)
        self.assertIn("risk_tier", data)
        self.assertIn("structural_damage_warning", data)
        self.assertIn("modes", data)
        self.assertGreater(len(data["modes"]), 0)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/structural/modal_vibration", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/structural/vibration", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/analysis/modal-vibration", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # Dynamic Vibration Heatmap tile
        res_tile = self.client.get("/api/v1/tiles/structural/vibration/SAN_LUIS_DAM_MONOLITH_04/16/1200/2400.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_true_ortho_zbuffer_and_tiles_api(self):
        """Test POST /api/v1/ortho/true-orthorectification, aliases, and dynamic true ortho Z-buffer tiles."""
        payload = {
            "ortho_id": "ORTHO_DOWNTOWN_01",
            "dsm_id": "lidar_dsm_1m",
            "camera_height_agl_m": 120.0,
            "sensor_pitch_deg": 2.0,
            "sensor_roll_deg": 1.0,
            "sun_zenith_deg": 35.0,
            "sun_azimuth_deg": 135.0,
            "dsm_resolution_m": 0.05,
            "building_threshold_height_m": 3.0,
            "fill_blind_areas": True
        }
        res = self.client.post("/api/v1/ortho/true-orthorectification", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["ortho_id"], "ORTHO_DOWNTOWN_01")
        self.assertIn("total_pixels", data)
        self.assertIn("visible_pixels", data)
        self.assertIn("occluded_pixels", data)
        self.assertIn("occlusion_percentage", data)
        self.assertIn("building_lean_pixels", data)
        self.assertIn("shadow_pixels", data)
        self.assertIn("max_building_lean_displacement_m", data)
        self.assertIn("quality_tier", data)
        self.assertIn("true_ortho_ready", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/ortho/true_orthorectification", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/true-orthorectification", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic True Ortho Z-Buffer tile
        res_tile = self.client.get("/api/v1/tiles/ortho/true-orthorectification/ORTHO_DOWNTOWN_01/18/42000/103000.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_graphcut_seamlines_and_tiles_api(self):
        """Test POST /api/v1/mosaic/graphcut-seamlines, aliases, and dynamic seamline graphcut tiles."""
        payload = {
            "mosaic_id": "MOSAIC_BASIN_01",
            "granule_ids": ["granule_01", "granule_02", "granule_03"],
            "cost_function": "color_plus_gradient",
            "blend_method": "multi_band_spline",
            "weight_color": 0.5,
            "weight_gradient": 0.3,
            "weight_elevation": 0.2,
            "feather_buffer_px": 25,
            "octave_levels": 4
        }
        res = self.client.post("/api/v1/mosaic/graphcut-seamlines", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["mosaic_id"], "MOSAIC_BASIN_01")
        self.assertIn("granule_count", data)
        self.assertIn("total_seamline_nodes", data)
        self.assertIn("total_seamline_length_m", data)
        self.assertIn("mean_transition_energy", data)
        self.assertIn("radiometric_tier", data)
        self.assertIn("seam_segments", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/mosaic/graphcut_seamlines", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/graphcut-seamlines", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Seamline tile
        res_tile = self.client.get("/api/v1/tiles/mosaic/graphcut-seamlines/MOSAIC_BASIN_01/14/2500/6100.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    # Alias for test_graphcut_seamline_and_tiles_api (T-112)
    def test_graphcut_seamline_and_tiles_api(self):
        """Alias for test_graphcut_seamlines_and_tiles_api."""
        return self.test_graphcut_seamlines_and_tiles_api()

    def test_brdf_nbar_and_tiles_api(self):
        """Test POST /api/v1/preprocessing/brdf-nbar, aliases, and dynamic BRDF NBAR tiles."""
        payload = {
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_MSIL2A_20260910",
            "band": "B04",
            "solar_zenith_deg": 38.2,
            "view_zenith_deg": 7.5,
            "relative_azimuth_deg": 45.0,
            "target_solar_zenith_deg": 45.0,
            "observed_reflectance": 0.185,
            "kernel_model": "ross_thick_li_sparse"
        }
        res = self.client.post("/api/v1/preprocessing/brdf-nbar", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "S2A_MSIL2A_20260910")
        self.assertEqual(data["band"], "B04")
        self.assertIn("observed_reflectance", data)
        self.assertIn("nbar_reflectance", data)
        self.assertIn("brdf_correction_factor", data)
        self.assertIn("normalization_tier", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/preprocessing/brdf_nbar", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/brdf-nbar", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic BRDF NBAR tile
        res_tile = self.client.get("/api/v1/tiles/preprocessing/brdf-nbar/sentinel-2-l2a/S2A_MSIL2A_20260910/12/1024/1536.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_sbas_stack_and_tiles_api(self):
        """Test POST /api/v1/sar/sbas-stack, aliases, and dynamic SBAS deformation tiles."""
        payload = {
            "stack_id": "SBAS_TSF_2026_STACK",
            "master_scene_id": "S1A_IW_SLC__1SDV_20260115",
            "max_perp_baseline_m": 180.0,
            "max_temporal_baseline_days": 100,
            "coherence_threshold": 0.40,
            "inversion_method": "svd_least_squares"
        }
        res = self.client.post("/api/v1/sar/sbas-stack", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["stack_id"], "SBAS_TSF_2026_STACK")
        self.assertIn("num_acquisitions", data)
        self.assertIn("num_accepted_pairs", data)
        self.assertIn("mean_coherence", data)
        self.assertIn("mean_velocity_mm_yr", data)
        self.assertIn("deformation_tier", data)
        self.assertIn("time_series_epochs", data)
        self.assertIn("interferogram_pairs", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/sar/sbas_stack", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/sbas-stack", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic SBAS tile
        res_tile = self.client.get("/api/v1/tiles/sar/sbas/SBAS_TSF_2026_STACK/12/1024/1536.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_topographic_minnaert_and_tiles_api(self):
        """Test POST /api/v1/preprocessing/topographic-minnaert, aliases, and dynamic Minnaert tiles."""
        payload = {
            "collection": "sentinel-2-l2a",
            "item_id": "S2A_MSIL2A_20260815T183921",
            "dem_id": "cop-dem-glo-30",
            "method": "minnaert",
            "solar_zenith_deg": 36.5,
            "solar_azimuth_deg": 142.0,
            "slope_deg": 24.5,
            "aspect_deg": 160.0,
            "minnaert_k": 0.72
        }
        res = self.client.post("/api/v1/preprocessing/topographic-minnaert", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["item_id"], "S2A_MSIL2A_20260815T183921")
        self.assertEqual(data["method"], "minnaert")
        self.assertIn("cos_i", data)
        self.assertIn("illumination_tier", data)
        self.assertIn("band_corrections", data)
        self.assertIn("mean_correction_factor", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/preprocessing/topographic_minnaert", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/topographic-minnaert", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic Topographic Minnaert tile
        res_tile = self.client.get("/api/v1/tiles/preprocessing/topographic-minnaert/sentinel-2-l2a/S2A_MSIL2A_20260815T183921/12/1024/1536.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_tie_point_rpc_and_tiles_api(self):
        """Test POST /api/v1/ortho/tie-point-rpc, aliases, and dynamic RPC alignment tiles."""
        payload = {
            "image_id": "WV03_20260905_EXP01",
            "reference_ortho_id": "REF_ORTHO_COMPOSITE_2026",
            "dem_id": "cop-dem-glo-30",
            "adjustment_model": "affine_rpc_bias",
            "min_correlation_threshold": 0.75,
            "ransac_threshold_px": 1.5,
            "requested_tie_points": 64,
            "ground_sampling_distance_m": 0.31
        }
        res = self.client.post("/api/v1/ortho/tie-point-rpc", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["image_id"], "WV03_20260905_EXP01")
        self.assertIn("total_candidate_points", data)
        self.assertIn("inlier_tie_points", data)
        self.assertIn("outlier_points", data)
        self.assertIn("rmse_prior_px", data)
        self.assertIn("rmse_posterior_px", data)
        self.assertIn("rmse_posterior_meters", data)
        self.assertIn("geometric_accuracy_tier", data)
        self.assertIn("tie_points_sample", data)
        self.assertIn("tile_url_template", data)

        # Route aliases
        res_alias1 = self.client.post("/api/v1/ortho/tie_point_rpc", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/tie-point-rpc", json=payload)
        self.assertEqual(res_alias2.status_code, 200)

        # Dynamic RPC alignment tile
        res_tile = self.client.get("/api/v1/tiles/ortho/tie-point-rpc/WV03_20260905_EXP01/14/4096/6144.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_nodeodm_drone_photogrammetry_and_tiles_api(self):
        """Test POST /api/v1/drone/odm-tasks, GET detail, listing, and dynamic XYZ orthophoto tiles."""
        payload = {
            "taskId": "ODM_TEST_20261001_999",
            "projectName": "Tailings Crest High-Res Survey",
            "imageCount": 80,
            "cameraModel": "DJI-ZENMUSE-P1-35MM",
            "gsdTargetCm": 1.5,
            "featureQuality": "high",
            "demResolutionCm": 5.0,
            "meshOctreeDepth": 11,
            "useGpu": True,
            "radiometricCalibration": "camera_plus_sun"
        }
        res_post = self.client.post("/api/v1/drone/odm-tasks", json=payload)
        self.assertEqual(res_post.status_code, 200)
        data = res_post.json()
        self.assertEqual(data["task_id"], "ODM_TEST_20261001_999")
        self.assertIn("status", data)
        self.assertIn("current_stage", data)
        self.assertIn("progress_percent", data)
        self.assertIn("tile_url_template", data)

        # GET detail
        res_get = self.client.get("/api/v1/drone/odm-tasks/ODM_TEST_20261001_999")
        self.assertEqual(res_get.status_code, 200)
        detail = res_get.json()
        self.assertEqual(detail["task_id"], "ODM_TEST_20261001_999")

        # GET listing
        res_list = self.client.get("/api/v1/drone/odm-tasks")
        self.assertEqual(res_list.status_code, 200)
        list_data = res_list.json()
        self.assertIn("tasks", list_data)
        self.assertIsInstance(list_data["tasks"], list)

        # Dynamic XYZ orthophoto tile
        res_tile = self.client.get("/api/v1/tiles/drone/odm/ODM_TEST_20261001_999/18/12345/67890.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_quality_mosaic_and_tiles_api(self):
        """Test POST /api/v1/mosaic/quality-mosaic, route aliases, and dynamic quality mosaic tiles."""
        payload = {
            "mosaicId": "QUALITY_MOSAIC_TEST_Q3",
            "collection": "sentinel-2-l2a",
            "method": "max_ndvi",
            "sceneIds": ["S2A_MSIL2A_20260715", "S2B_MSIL2A_20260805", "S2A_MSIL2A_20260825"],
            "dateRange": ["2026-07-01", "2026-08-31"],
            "cloudThresholdPercent": 20.0,
            "targetBands": ["B02", "B03", "B04", "B08", "B11", "B12"],
            "maskShadows": True,
            "maskSnow": True
        }
        res_post = self.client.post("/api/v1/mosaic/quality-mosaic", json=payload)
        self.assertEqual(res_post.status_code, 200)
        data = res_post.json()
        self.assertEqual(data["mosaic_id"], "QUALITY_MOSAIC_TEST_Q3")
        self.assertIn("quality_tier", data)
        self.assertIn("total_input_scenes", data)
        self.assertIn("valid_scenes_used", data)
        self.assertIn("cloud_free_coverage_percent", data)
        self.assertIn("scene_contributions", data)
        self.assertIn("tile_url_template", data)

        # Alias route
        res_alias = self.client.post("/api/v1/analysis/mosaic/quality-mosaic", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # Dynamic Quality Mosaic tile
        res_tile = self.client.get("/api/v1/tiles/mosaic/quality-mosaic/QUALITY_MOSAIC_TEST_Q3/10/163/395.png")
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers.get("content-type"), "image/png")
        self.assertGreater(len(res_tile.content), 100)

    def test_hazard_alert_subscriptions_and_dispatch_api(self):
        """Test POST/GET /api/v1/alerts/subscriptions and POST /api/v1/alerts/dispatch."""
        sub_payload = {
            "recipientName": "Geotechnical Risk Operations Center",
            "channel": "webhook",
            "targetEndpoint": "https://alerts.gios.local/webhook",
            "subscribedAlertTypes": ["tailings_crest_deformation", "embankment_seepage_saturation"],
            "minSeverityTier": "warning",
            "cooldownMinutes": 15
        }
        res_sub = self.client.post("/api/v1/alerts/subscriptions", json=sub_payload)
        self.assertEqual(res_sub.status_code, 200)
        sub_data = res_sub.json()
        self.assertIn("subscription_id", sub_data)
        self.assertEqual(sub_data["recipient_name"], "Geotechnical Risk Operations Center")

        # GET subscriptions
        res_list = self.client.get("/api/v1/alerts/subscriptions")
        self.assertEqual(res_list.status_code, 200)
        self.assertIsInstance(res_list.json(), list)
        self.assertTrue(any(s.get("recipient_name") == "Geotechnical Risk Operations Center" for s in res_list.json()))

        # Dispatch alert
        dispatch_payload = {
            "alertId": "HAZ_ALERT_TEST_001",
            "alertType": "tailings_crest_deformation",
            "severity": "critical",
            "zScore": 3.85,
            "assetId": "ASSET_TAILINGS_CREST_04",
            "title": "Severe Tailings Crest Lateral Displacement",
            "message": "Persistent outward displacement delta exceeding 25mm/yr with accelerating trend.",
            "channel": "webhook"
        }
        res_dispatch = self.client.post("/api/v1/alerts/dispatch", json=dispatch_payload)
        self.assertEqual(res_dispatch.status_code, 200)
        disp_data = res_dispatch.json()
        self.assertIn("dispatch_id", disp_data)
        self.assertIn("delivery_status", disp_data)
        self.assertIn("event", disp_data)
        self.assertEqual(disp_data["event"]["severity_tier"], "emergency")

    def test_dam_break_hydrodynamics_and_tiles_api(self):
        """Test POST /api/v1/analysis/geotechnical/dam-break-hydrodynamics, aliases, GET details, corridors, and dynamic tiles."""
        payload = {
            "simulationId": "SIM_TEST_DAM_BREAK_QA",
            "damId": "TAILINGS_DAM_A",
            "damName": "North Tailings Impoundment",
            "damCoordinates": [-44.1234, -20.1234],
            "breachParams": {
                "damHeightM": 48.0,
                "reservoirVolumeM3": 14000000.0,
                "breachMechanism": "piping_internal_erosion",
                "manningNRoughness": 0.040,
                "slurryYieldStressPa": 35.0
            },
            "simulationDurationHours": 4.0,
            "timestepIntervalMin": 15.0,
            "generateEvacuationCorridors": True,
            "includeTimeSlices": True
        }

        # 1. Primary endpoint
        res = self.client.post("/api/v1/analysis/geotechnical/dam-break-hydrodynamics", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["simulation_id"], "SIM_TEST_DAM_BREAK_QA")
        self.assertEqual(data["dam_id"], "TAILINGS_DAM_A")
        self.assertEqual(data["status"], "completed")
        self.assertGreater(data["peak_breach_discharge_m3s"], 100.0)
        self.assertGreater(data["max_inundation_area_ha"], 10.0)
        self.assertGreater(data["max_flood_depth_m"], 1.0)
        self.assertGreater(data["max_flow_velocity_ms"], 0.5)
        self.assertGreater(data["max_hazard_product_m2s"], 1.0)
        self.assertIn(data["overall_hazard_tier"], ["high_hazard", "extreme_catastrophic"])
        self.assertIsNotNone(data["tier_metadata"])
        self.assertGreater(len(data["receptors"]), 0)
        self.assertGreater(len(data["time_slices"]), 0)
        self.assertGreater(len(data["evacuation_corridors"]), 0)
        self.assertIsNotNone(data["inundation_boundary_geojson"])
        self.assertIn("tile_url_template", data)

        # 2. Route aliases
        res_alias1 = self.client.post("/api/v1/analysis/geotechnical/dam_break_hydrodynamics", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/dam-break-hydrodynamics", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/geotechnical/dam-break-hydrodynamics", json=payload)
        self.assertEqual(res_alias3.status_code, 200)
        res_alias4 = self.client.post("/api/v1/geotechnical/dam_break_hydrodynamics", json=payload)
        self.assertEqual(res_alias4.status_code, 200)

        # 3. Payload feature flags: exclude time slices and evacuation corridors
        flag_payload = dict(payload)
        flag_payload["simulationId"] = "SIM_TEST_FLAGS_QA"
        flag_payload["includeTimeSlices"] = False
        flag_payload["generateEvacuationCorridors"] = False
        res_flags = self.client.post("/api/v1/analysis/geotechnical/dam-break-hydrodynamics", json=flag_payload)
        self.assertEqual(res_flags.status_code, 200)
        flags_data = res_flags.json()
        self.assertEqual(len(flags_data["time_slices"]), 0)
        self.assertEqual(len(flags_data["evacuation_corridors"]), 0)
        self.assertGreater(flags_data["max_inundation_area_ha"], 10.0)

        # 4. GET simulation detail & corridors
        res_detail = self.client.get("/api/v1/analysis/geotechnical/dam-break/SIM_TEST_DAM_BREAK_QA")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()["simulation_id"], "SIM_TEST_DAM_BREAK_QA")

        res_detail_alias = self.client.get("/api/v1/geotechnical/dam-break/SIM_TEST_DAM_BREAK_QA")
        self.assertEqual(res_detail_alias.status_code, 200)

        res_corridors = self.client.get("/api/v1/analysis/geotechnical/dam-break/SIM_TEST_DAM_BREAK_QA/evacuation-corridors")
        self.assertEqual(res_corridors.status_code, 200)
        corrs = res_corridors.json()
        self.assertIsInstance(corrs, list)
        self.assertGreater(len(corrs), 0)
        self.assertIn("corridor_id", corrs[0])

        res_corridors_alias1 = self.client.get("/api/v1/geotechnical/dam-break/SIM_TEST_DAM_BREAK_QA/evacuation-corridors")
        self.assertEqual(res_corridors_alias1.status_code, 200)
        res_corridors_alias2 = self.client.get("/api/v1/analysis/dam-break/SIM_TEST_DAM_BREAK_QA/evacuation-corridors")
        self.assertEqual(res_corridors_alias2.status_code, 200)

        # 5. Dynamic XYZ Tile Streaming across metrics
        sim_id = "SIM_TEST_DAM_BREAK_QA"
        tile_urls = [
            f"/api/v1/tiles/geotechnical/dam-break/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dam-break/{sim_id}/hazard_product/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dam-break/{sim_id}/depth/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dam-break/{sim_id}/velocity/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dam-break/{sim_id}/arrival_time/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/dam-break/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/dam-break/{sim_id}/depth/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_geotechnical_phreatic_seepage_and_tiles_api(self):
        """Test POST /api/v1/analysis/geotechnical/phreatic-seepage, aliases, GET details, SWRC inversion, piezometers, and dynamic XYZ tiles."""
        payload = {
            "simulationId": "SIM_TEST_SEEPAGE_QA",
            "damId": "TAILINGS_DAM_A",
            "damName": "North Tailings Impoundment",
            "reservoirPoolElevationM": 812.0,
            "tailwaterElevationM": 752.0,
            "embankment": {
                "crestElevationM": 820.0,
                "baseElevationM": 750.0,
                "crestWidthM": 12.0,
                "upstreamSlopeHV": 2.5,
                "downstreamSlopeHV": 2.0
            },
            "soilParams": {
                "texture": "silt_tailings",
                "ksatMs": 1.5e-6,
                "thetaS": 0.46,
                "thetaR": 0.035,
                "alphaM1": 1.6,
                "n": 1.38
            },
            "transectStationsCount": 50
        }

        # 1. Primary endpoint
        res = self.client.post("/api/v1/analysis/geotechnical/phreatic-seepage", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("simulationId") or data.get("simulation_id"), "SIM_TEST_SEEPAGE_QA")
        self.assertEqual(data.get("damId") or data.get("dam_id"), "TAILINGS_DAM_A")
        self.assertEqual(data.get("status"), "completed")
        self.assertGreater(data.get("reservoirHeadM") or data.get("reservoir_head_m"), 0.0)
        self.assertGreater(data.get("tailwaterHeadM") or data.get("tailwater_head_m"), 0.0)
        self.assertGreater(data.get("seepageDischargeM3sM") or data.get("seepage_discharge_m3s_m"), 0.0)
        self.assertGreater(data.get("exitGradientMax") or data.get("exit_gradient_max"), 0.0)
        self.assertGreater(data.get("factorOfSafetyPiping") or data.get("factor_of_safety_piping"), 0.0)
        self.assertTrue("tileUrlTemplate" in data or "tile_url_template" in data)

        # 2. Route aliases
        res_alias1 = self.client.post("/api/v1/geotechnical/phreatic-seepage", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/analysis/phreatic-seepage", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/geotechnical/phreatic_seepage", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # 3. GET simulation detail
        res_detail = self.client.get("/api/v1/analysis/geotechnical/phreatic-seepage/SIM_TEST_SEEPAGE_QA")
        self.assertEqual(res_detail.status_code, 200)
        detail_data = res_detail.json()
        self.assertEqual(detail_data.get("simulationId") or detail_data.get("simulation_id"), "SIM_TEST_SEEPAGE_QA")

        res_detail_alias = self.client.get("/api/v1/geotechnical/phreatic-seepage/SIM_TEST_SEEPAGE_QA")
        self.assertEqual(res_detail_alias.status_code, 200)

        # 4. SWRC Inversion endpoint & aliases
        swrc_payload = {
            "soilTexture": "silt_tailings",
            "matricSuctionRangeKpa": [0.1, 1000.0],
            "numEvaluationPoints": 50
        }
        res_swrc = self.client.post("/api/v1/analysis/geotechnical/swrc-inversion", json=swrc_payload)
        self.assertEqual(res_swrc.status_code, 200)
        swrc_data = res_swrc.json()
        self.assertEqual(swrc_data.get("soilTexture") or swrc_data.get("soil_texture"), "silt_tailings")
        self.assertGreater(len(swrc_data.get("curvePoints") or swrc_data.get("curve_points") or []), 0)

        res_swrc_alias = self.client.post("/api/v1/geotechnical/swrc-inversion", json=swrc_payload)
        self.assertEqual(res_swrc_alias.status_code, 200)

        # 5. In-situ piezometers endpoint & aliases
        res_piezo = self.client.get("/api/v1/analysis/geotechnical/piezometers/TAILINGS_DAM_A")
        self.assertEqual(res_piezo.status_code, 200)
        piezo_data = res_piezo.json()
        self.assertIsInstance(piezo_data, list)
        self.assertGreater(len(piezo_data), 0)

        res_piezo_alias = self.client.get("/api/v1/geotechnical/piezometers/TAILINGS_DAM_A")
        self.assertEqual(res_piezo_alias.status_code, 200)

        # 6. Dynamic XYZ Tile Streaming across metrics
        sim_id = "SIM_TEST_SEEPAGE_QA"
        tile_urls = [
            f"/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/saturation/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/pore_pressure/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/gradient/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/hydraulic_head/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/phreatic-seepage/{sim_id}/suction/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/phreatic-seepage/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/phreatic-seepage/{sim_id}/saturation/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_geotechnical_slope_stability_and_tiles_api(self):
        """Comprehensive test for geotechnical limit equilibrium slope stability (Bishop & Janbu), critical slip surface search, InSAR creep fusion, and dynamic XYZ tile streaming."""
        # 1. Primary simulation with Bishop's Simplified method
        payload_bishop = {
            "damId": "DAM-001",
            "damName": "North Tailings Impoundment",
            "embankmentHeightM": 50.0,
            "crestWidthM": 10.0,
            "slopeRatio": 2.0,
            "soilUnitWeightKnM3": 19.5,
            "cohesionKpa": 15.0,
            "frictionAngleDeg": 28.0,
            "method": "bishop_simplified",
            "includeUnsaturatedSuction": True,
            "seismicKh": 0.05
        }
        res = self.client.post("/api/v1/analysis/geotechnical/slope-stability", json=payload_bishop)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("dam_id"), "DAM-001")
        self.assertGreater(data.get("factor_of_safety"), 0.0)
        self.assertGreater(data.get("iterations_converged"), 0)
        self.assertIn(data.get("hazard_tier"), {"critical_shear_failure", "elevated_instability_risk", "conditionally_stable", "stable"})
        self.assertGreater(len(data.get("slices", [])), 0)
        self.assertGreater(len(data.get("insar_creep_fusion", [])), 0)
        self.assertTrue("tile_url_template" in data)

        # 2. Simulation with Janbu's Simplified method
        payload_janbu = dict(payload_bishop)
        payload_janbu["method"] = "janbu_simplified"
        res_j = self.client.post("/api/v1/analysis/geotechnical/slope-stability", json=payload_janbu)
        self.assertEqual(res_j.status_code, 200)
        data_j = res_j.json()
        self.assertEqual(data_j.get("method"), "janbu_simplified")
        self.assertGreater(data_j.get("factor_of_safety"), 0.0)

        # 3. Route aliases
        res_alias1 = self.client.post("/api/v1/geotechnical/slope-stability", json=payload_bishop)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/geotechnical/slope-stability-bishop", json=payload_bishop)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/geotechnical/slope_stability", json=payload_bishop)
        self.assertEqual(res_alias3.status_code, 200)
        res_alias4 = self.client.post("/api/v1/analysis/slope-stability", json=payload_bishop)
        self.assertEqual(res_alias4.status_code, 200)

        # 4. Simulation detail retrieval
        sim_id = data.get("simulation_id")
        res_detail = self.client.get(f"/api/v1/analysis/geotechnical/slope-stability/{sim_id}")
        self.assertEqual(res_detail.status_code, 200)
        detail_data = res_detail.json()
        self.assertEqual(detail_data.get("simulation_id"), sim_id)

        res_detail_alias = self.client.get(f"/api/v1/geotechnical/slope-stability/{sim_id}")
        self.assertEqual(res_detail_alias.status_code, 200)

        # 5. Critical slip surface optimization search
        search_payload = {
            "damId": "DAM-001",
            "embankmentHeightM": 50.0,
            "crestWidthM": 10.0,
            "slopeRatio": 2.0,
            "soilUnitWeightKnM3": 19.5,
            "cohesionKpa": 15.0,
            "frictionAngleDeg": 28.0,
            "searchGridDensity": 3
        }
        res_search = self.client.post("/api/v1/analysis/geotechnical/critical-slip-search", json=search_payload)
        self.assertEqual(res_search.status_code, 200)
        search_data = res_search.json()
        self.assertGreater(search_data.get("min_factor_of_safety"), 0.0)
        self.assertGreater(search_data.get("evaluated_surfaces_count") or search_data.get("evaluatedSurfacesCount", 0), 0)
        crit_surf = search_data.get("critical_surface")
        self.assertIsNotNone(crit_surf)
        self.assertGreater(crit_surf.get("radius_m"), 0.0)

        res_search_alias = self.client.post("/api/v1/geotechnical/slip-surface-search", json=search_payload)
        self.assertEqual(res_search_alias.status_code, 200)

        # 6. InSAR creep vector endpoint
        res_creep = self.client.get("/api/v1/analysis/geotechnical/insar-creep/DAM-001")
        self.assertEqual(res_creep.status_code, 200)
        creep_list = res_creep.json()
        self.assertIsInstance(creep_list, list)
        self.assertGreater(len(creep_list), 0)
        self.assertIn("vertical_velocity_mm_yr", creep_list[0])
        self.assertIn("creep_status", creep_list[0])

        res_creep_alias = self.client.get("/api/v1/geotechnical/insar-creep/DAM-001")
        self.assertEqual(res_creep_alias.status_code, 200)

        # 7. Dynamic XYZ Tile Streaming across metrics
        tile_sim_id = "SIM_SLOPE_TEST_001"
        tile_urls = [
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/factor_of_safety/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/pore_pressure/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/shear_resistance/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/slip_surface/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/insar_creep/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/slope-stability/{tile_sim_id}/suction/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/slope-stability/{tile_sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/slope-stability/{tile_sim_id}/factor_of_safety/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_geotechnical_rainfall_infiltration_and_tiles_api(self):
        """Test POST /api/v1/analysis/geotechnical/rainfall-infiltration and dynamic XYZ tile streaming."""
        payload = {
            "dam_id": "DAM-INFIL-TEST-01",
            "dam_name": "San Luis Forebay Embankment",
            "soil_texture": "silt_tailings",
            "storm_duration_hr": 4.0,
            "rainfall_intensity_mm_hr": 30.0,
            "time_step_hr": 0.5,
            "embankment_slope_deg": 26.0,
            "cohesion_kpa": 12.0,
            "friction_angle_deg": 32.0,
            "initial_suction_head_m": 0.40
        }

        # 1. Primary endpoint
        res = self.client.post("/api/v1/analysis/geotechnical/rainfall-infiltration", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        sim_id = data["simulation_id"]
        self.assertEqual(data["dam_id"], "DAM-INFIL-TEST-01")
        self.assertGreater(data["total_cumulative_infiltration_mm"], 0.0)
        self.assertGreater(data["total_surface_runoff_mm"], 0.0)
        self.assertGreater(data["minimum_transient_fs"], 0.0)
        self.assertIn("time_steps", data)
        self.assertGreater(len(data["time_steps"]), 0)

        # 2. Route alias
        res_alias = self.client.post("/api/v1/analysis/rainfall-infiltration", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # 3. Detail GET endpoint
        res_detail = self.client.get(f"/api/v1/analysis/geotechnical/rainfall-infiltration/{sim_id}")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()["simulation_id"], sim_id)

        # 4. Dynamic XYZ Tile Streaming across metrics
        tile_urls = [
            f"/api/v1/tiles/geotechnical/rainfall-infiltration/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/rainfall-infiltration/{sim_id}/factor_of_safety/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/rainfall-infiltration/{sim_id}/wetting_front/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/rainfall-infiltration/{sim_id}/suction/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/rainfall-infiltration/{sim_id}/infiltration_rate/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/rainfall-infiltration/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/rainfall-infiltration/{sim_id}/factor_of_safety/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_thermal_apparent_inertia_and_tiles_api(self):
        """Test POST /api/v1/analysis/thermal/apparent-inertia and dynamic XYZ tile streaming."""
        payload = {
            "dam_id": "DAM-ATI-TEST-01",
            "dam_name": "Cadia Downstream Shell",
            "solar_correction_factor": 1.0,
            "min_ati_threshold": 0.045,
            "transect_points": [
                {"station_x_m": 0.0, "albedo": 0.28, "day_lst_celsius": 39.0, "night_lst_celsius": 13.0},
                {"station_x_m": 60.0, "albedo": 0.20, "day_lst_celsius": 35.0, "night_lst_celsius": 14.5},
                {"station_x_m": 120.0, "albedo": 0.12, "day_lst_celsius": 24.0, "night_lst_celsius": 18.0}
            ]
        }

        # 1. Primary endpoint
        res = self.client.post("/api/v1/analysis/thermal/apparent-inertia", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        analysis_id = data["analysis_id"]
        self.assertEqual(data["dam_id"], "DAM-ATI-TEST-01")
        self.assertGreater(data["mean_apparent_thermal_inertia"], 0.0)
        self.assertGreater(data["max_apparent_thermal_inertia"], 0.0)
        self.assertTrue(data["thermal_seepage_detected"])
        self.assertIn("ati_points", data)
        self.assertEqual(len(data["ati_points"]), 3)

        # 2. Route alias
        res_alias = self.client.post("/api/v1/analysis/apparent-inertia", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # 3. Detail GET endpoint
        res_detail = self.client.get(f"/api/v1/analysis/thermal/apparent-inertia/{analysis_id}")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()["analysis_id"], analysis_id)

        # 4. Dynamic XYZ Tile Streaming across metrics
        tile_urls = [
            f"/api/v1/tiles/thermal/apparent-inertia/{analysis_id}/12/2048/1024.png",
            f"/api/v1/tiles/thermal/apparent-inertia/{analysis_id}/thermal_inertia/12/2048/1024.png",
            f"/api/v1/tiles/thermal/apparent-inertia/{analysis_id}/seepage_anomaly/12/2048/1024.png",
            f"/api/v1/tiles/thermal/apparent-inertia/{analysis_id}/dtr/12/2048/1024.png",
            f"/api/v1/analysis/tiles/thermal/apparent-inertia/{analysis_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/thermal/apparent-inertia/{analysis_id}/thermal_inertia/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_geotechnical_liquefaction_and_tiles_api(self):
        """Task T-154: Verify dynamic seismic liquefaction, Vs30 proxy, pore pressure, SPT soundings, and tile endpoints."""
        payload = {
            "dam_id": "DAM-LIQ-TEST-01",
            "dam_name": "San Luis Tailings Impoundment",
            "pga_g": 0.38,
            "earthquake_magnitude": 7.5,
            "dam_height_m": 42.0,
            "impounded_volume_m3": 9500000.0,
            "reach_angle_deg": 5.2,
            "downstream_valley_slope_deg": 2.0,
            "topographic_slope_deg": 5.5,
            "spt_soundings": [
                {"depth_m": 4.0, "spt_n_blows": 8.0, "effective_overburden_kpa": 60.0, "fines_content_pct": 18.0},
                {"depth_m": 8.0, "spt_n_blows": 12.0, "effective_overburden_kpa": 115.0, "fines_content_pct": 20.0},
                {"depth_m": 12.0, "spt_n_blows": 15.0, "effective_overburden_kpa": 170.0, "fines_content_pct": 15.0}
            ]
        }

        # 1. Primary liquefaction endpoint
        res = self.client.post("/api/v1/analysis/geotechnical/liquefaction-susceptibility", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        sim_id = data["simulation_id"]
        self.assertEqual(data["dam_id"], "DAM-LIQ-TEST-01")
        self.assertIn("minimum_factor_of_safety_liq", data)
        self.assertIn("overall_liquefaction_hazard_tier", data)
        self.assertIn("dynamic_pore_pressure", data)
        self.assertIn("vs30_proxy", data)
        self.assertIn("flow_slide_runout", data)
        self.assertIn("spt_sounding_points", data)
        self.assertEqual(len(data["spt_sounding_points"]), 3)

        # 2. Route alias
        res_alias = self.client.post("/api/v1/analysis/liquefaction", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # 3. Simulation detail lookup
        res_detail = self.client.get(f"/api/v1/analysis/geotechnical/liquefaction/{sim_id}")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()["simulation_id"], sim_id)

        # 4. Dynamic pore pressure standalone endpoint
        pp_payload = {
            "dam_id": "DAM-LIQ-TEST-01",
            "sigma_v0_eff_kpa": 110.0,
            "factor_of_safety_liq": 0.88
        }
        res_pp = self.client.post("/api/v1/analysis/geotechnical/dynamic-pore-pressure", json=pp_payload)
        self.assertEqual(res_pp.status_code, 200)
        pp_data = res_pp.json()
        self.assertTrue(pp_data["liquefaction_triggered"])
        self.assertEqual(pp_data["excess_pore_pressure_ratio_ru"], 1.0)
        self.assertEqual(pp_data["post_cyclic_effective_stress_kpa"], 0.0)

        # 5. Satellite Vs30 proxy endpoint (GET and POST)
        res_vs_get = self.client.get("/api/v1/analysis/geotechnical/vs30-proxy/37.05/-121.05?slope_deg=5.0")
        self.assertEqual(res_vs_get.status_code, 200)
        vs_data = res_vs_get.json()
        self.assertIn("vs30_m_s", vs_data)
        self.assertIn("nehrp_site_class", vs_data)

        res_vs_post = self.client.post("/api/v1/analysis/geotechnical/vs30-proxy", json={
            "latitude": 37.05,
            "longitude": -121.05,
            "slope_deg": 5.0
        })
        self.assertEqual(res_vs_post.status_code, 200)

        # 6. SPT sounding standalone endpoint
        spt_payload = {
            "dam_id": "DAM-LIQ-TEST-01",
            "soundings": [
                {"depth_m": 5.0, "spt_n_blows": 9.0, "effective_overburden_kpa": 75.0, "fines_content_pct": 15.0}
            ]
        }
        res_spt = self.client.post("/api/v1/analysis/geotechnical/liquefaction/spt-sounding", json=spt_payload)
        self.assertIn("points", res_spt.json())
        self.assertIn("min_fs_liq", res_spt.json())

        # 7. Flow slide runout standalone endpoint
        runout_payload = {
            "dam_id": "DAM-LIQ-TEST-01",
            "dam_height_m": 42.0,
            "impounded_volume_m3": 9500000.0,
            "reach_angle_deg": 5.2
        }
        res_runout = self.client.post("/api/v1/analysis/geotechnical/liquefaction/flow-slide-runout", json=runout_payload)
        self.assertEqual(res_runout.status_code, 200)
        self.assertIn("runout_distance_m", res_runout.json())
        self.assertIn("mobility_tier", res_runout.json())

        # 8. Lateral spreading GET endpoint
        res_lat = self.client.get(f"/api/v1/analysis/geotechnical/liquefaction/lateral-spreading/DAM-LIQ-TEST-01")
        self.assertEqual(res_lat.status_code, 200)

        # 9. Dynamic XYZ Tile Streaming across metrics
        tile_urls = [
            f"/api/v1/tiles/geotechnical/liquefaction/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/liquefaction/{sim_id}/factor_of_safety/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/liquefaction/{sim_id}/excess_pore_pressure/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/liquefaction/{sim_id}/vs30/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/liquefaction/{sim_id}/runout_envelope/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/liquefaction/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/liquefaction/{sim_id}/factor_of_safety/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_reconsolidation_settlement_and_tiles_api(self):
        """Task T-160/T-166: Test POST /api/v1/analysis/geotechnical/reconsolidation-settlement, aliases, and dynamic settlement tiles."""
        payload = {
            "dam_id": "DAM-RECONS-TEST-01",
            "dam_name": "Test Embankment Reconsolidation",
            "crest_length_m": 350.0,
            "pga_g": 0.32,
            "earthquake_magnitude_mw": 6.8,
            "calculation_method": "ishihara_yoshimine_1992",
            "insar_coherence": 0.75,
            "insar_displacement_m": 0.35,
            "t50_days": 15.0,
            "elapsed_days": 12.0,
            "stratigraphic_layers": [
                {"layer_id": "L1", "soil_type": "tailings_beach", "depth_top_m": 0.0, "depth_bottom_m": 5.0, "spt_n1_60cs": 10.0, "factor_of_safety_liq": 0.95},
                {"layer_id": "L2", "soil_type": "slimes", "depth_top_m": 5.0, "depth_bottom_m": 12.0, "spt_n1_60cs": 6.0, "factor_of_safety_liq": 0.65}
            ]
        }
        res = self.client.post("/api/v1/analysis/geotechnical/reconsolidation-settlement", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["dam_id"], "DAM-RECONS-TEST-01")
        self.assertIn("max_crest_settlement_m", data)
        self.assertIn("max_angular_distortion", data)
        self.assertIn("simulation_id", data)
        sim_id = data["simulation_id"]

        # Route aliases
        res_alias = self.client.post("/api/v1/analysis/reconsolidation-settlement", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # GET simulation detail
        res_get = self.client.get(f"/api/v1/analysis/geotechnical/reconsolidation-settlement/{sim_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["simulation_id"], sim_id)

        # Standalone Angular Distortion endpoint
        res_ang = self.client.post("/api/v1/analysis/geotechnical/angular-distortion", json={
            "settlement_a_m": 0.12,
            "settlement_b_m": 0.28,
            "distance_m": 20.0
        })
        self.assertEqual(res_ang.status_code, 200)
        self.assertIn("angular_distortion", res_ang.json())
        self.assertIn("hazard_tier", res_ang.json())

        # Standalone Stratigraphic Soil Column endpoint
        res_col = self.client.post("/api/v1/analysis/geotechnical/settlement/soil-column", json={
            "calculation_method": "ishihara_yoshimine_1992",
            "stratigraphic_layers": [
                {"layer_id": "L1", "depth_top_m": 0.0, "depth_bottom_m": 4.0, "spt_n1_60cs": 12.0, "factor_of_safety_liq": 0.85}
            ]
        })
        self.assertEqual(res_col.status_code, 200)
        self.assertIn("total_settlement_m", res_col.json())

        # Standalone InSAR Fusion endpoint
        res_fusion = self.client.post("/api/v1/analysis/geotechnical/settlement/insar-fusion", json={
            "modeled_settlement_m": 0.35,
            "insar_displacement_m": 0.40,
            "insar_coherence": 0.80
        })
        self.assertEqual(res_fusion.status_code, 200)
        self.assertIn("fused_settlement_m", res_fusion.json())

        # Dynamic XYZ settlement tile streaming
        tile_urls = [
            f"/api/v1/tiles/geotechnical/settlement/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/settlement/{sim_id}/total_settlement/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/settlement/{sim_id}/angular_distortion/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/settlement/{sim_id}/insar_differential/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/settlement/{sim_id}/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_topography_csf_and_cut_fill_tiles_api(self):
        """Task T-163/T-166: Test POST /api/v1/analysis/topography endpoints, aliases, and dynamic XYZ tiles."""
        # 1. CSF Point Cloud Ground Filter
        csf_payload = {
            "cloud_id": "UAV_POINTCLOUD_TEST_01",
            "cloth_resolution_m": 1.0,
            "rigidness": "relief_slope",
            "classification_threshold_m": 0.35
        }
        res_csf = self.client.post("/api/v1/analysis/topography/csf-ground-filter", json=csf_payload)
        self.assertEqual(res_csf.status_code, 200)
        csf_data = res_csf.json()
        self.assertEqual(csf_data["cloud_id"], "UAV_POINTCLOUD_TEST_01")
        self.assertIn("ground_fraction", csf_data)
        self.assertIn("sample_points", csf_data)

        # Route aliases
        res_csf_alias = self.client.post("/api/v1/analysis/csf-ground-filter", json=csf_payload)
        self.assertEqual(res_csf_alias.status_code, 200)
        res_drone_csf = self.client.post("/api/v1/drone/csf-ground-filter", json=csf_payload)
        self.assertEqual(res_drone_csf.status_code, 200)

        # 2. 2.5D DEM Cut-and-Fill Analysis
        cutfill_payload = {
            "simulation_id": "CUTFILL_API_TEST_01",
            "asset_id": "NORTH_EMBANKMENT",
            "grid_resolution_m": 1.0,
            "deadband_threshold_m": 0.05,
            "grid_side_points": 16
        }
        res_cutfill = self.client.post("/api/v1/analysis/topography/cut-and-fill", json=cutfill_payload)
        self.assertEqual(res_cutfill.status_code, 200)
        cutfill_data = res_cutfill.json()
        self.assertEqual(cutfill_data["simulation_id"], "CUTFILL_API_TEST_01")
        self.assertIn("summary", cutfill_data)
        self.assertIn("gross_cut_volume_m3", cutfill_data["summary"])
        self.assertIn("gross_fill_volume_m3", cutfill_data["summary"])

        # GET simulation detail
        res_get_cf = self.client.get("/api/v1/analysis/topography/cut-and-fill/CUTFILL_API_TEST_01")
        self.assertEqual(res_get_cf.status_code, 200)
        self.assertEqual(res_get_cf.json()["simulation_id"], "CUTFILL_API_TEST_01")

        # 3. Embankment Crest Slump Profile
        slump_payload = {
            "dam_id": "DAM_API_TEST_01",
            "crest_length_m": 350.0,
            "design_freeboard_m": 4.0,
            "reservoir_pool_elevation_m": 315.0
        }
        res_slump = self.client.post("/api/v1/analysis/topography/crest-slump", json=slump_payload)
        self.assertEqual(res_slump.status_code, 200)
        self.assertIn("summary", res_slump.json())
        self.assertIn("stations", res_slump.json())

        # 4. Transect Profile Differencing
        transect_payload = {
            "asset_id": "EMBANKMENT_TRANSECT_API",
            "sample_spacing_m": 5.0
        }
        res_transect = self.client.post("/api/v1/analysis/topography/transect-delta", json=transect_payload)
        self.assertEqual(res_transect.status_code, 200)
        self.assertIn("gross_cut_volume_m3", res_transect.json())
        self.assertIn("nodes", res_transect.json())

        # 5. UAV Stereo Epipolar Disparity
        epipolar_payload = {
            "flight_pre_id": "FLIGHT_PRE_01",
            "flight_post_id": "FLIGHT_POST_01",
            "stereo_pair_count": 6
        }
        res_epipolar = self.client.post("/api/v1/analysis/topography/epipolar-differential", json=epipolar_payload)
        self.assertEqual(res_epipolar.status_code, 200)
        self.assertIn("disparity_rmse_px", res_epipolar.json())
        self.assertIn("differential_pairs", res_epipolar.json())

        # 6. Dynamic XYZ Topography & CSF Tile Streaming
        tile_urls = [
            "/api/v1/tiles/topography/elevation-delta/CUTFILL_API_TEST_01/12/2048/1024.png",
            "/api/v1/tiles/topography/elevation-delta/CUTFILL_API_TEST_01/cut_depth/12/2048/1024.png",
            "/api/v1/tiles/topography/elevation-delta/CUTFILL_API_TEST_01/fill_height/12/2048/1024.png",
            "/api/v1/tiles/topography/elevation-delta/CUTFILL_API_TEST_01/slope_delta/12/2048/1024.png",
            "/api/v1/tiles/pointcloud/csf/UAV_POINTCLOUD_TEST_01/12/2048/1024.png",
            "/api/v1/analysis/tiles/pointcloud/csf/UAV_POINTCLOUD_TEST_01/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_internal_erosion_piping_and_flownet_api(self):
        """Test Cycle v2.5.19: POST /api/v1/analysis/geotechnical/internal-erosion-piping, GET detail, seepage-flownet, and dynamic tiles."""
        payload = {
            "simulationId": "SIM_TEST_PIPING_API_01",
            "damId": "DAM_TEST_CADIA",
            "damName": "Cadia Tailings Dam",
            "soilClassification": "medium_sand",
            "upstreamHeadM": 24.0,
            "downstreamHeadM": 4.0,
            "embankmentBaseLengthM": 60.0,
            "aquiferDepthM": 18.0,
            "potentialDropsNd": 12,
            "flowChannelsNf": 4
        }

        # 1. Primary Analysis Endpoint
        res = self.client.post("/api/v1/analysis/geotechnical/internal-erosion-piping", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["simulation_id"], "SIM_TEST_PIPING_API_01")
        self.assertEqual(data["dam_id"], "DAM_TEST_CADIA")
        self.assertEqual(data["dam_name"], "Cadia Tailings Dam")
        self.assertIn("terzaghi_gradient", data)
        self.assertIn("sellmeijer_bep", data)
        self.assertIn("flownet_seepage", data)
        self.assertIn("global_factor_of_safety", data)
        self.assertIn("overall_hazard_tier", data)
        self.assertIn("tile_url_template", data)

        # 2. Canonical Route Aliases
        res_alias1 = self.client.post("/api/v1/analysis/internal-erosion-piping", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/geotechnical/internal-erosion-piping", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/geotechnical/piping", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # 3. GET Detail Endpoint & Aliases
        sim_id = "SIM_TEST_PIPING_API_01"
        res_get1 = self.client.get(f"/api/v1/analysis/geotechnical/internal-erosion-piping/{sim_id}")
        self.assertEqual(res_get1.status_code, 200)
        self.assertEqual(res_get1.json()["simulation_id"], sim_id)

        res_get2 = self.client.get(f"/api/v1/geotechnical/internal-erosion-piping/{sim_id}")
        self.assertEqual(res_get2.status_code, 200)
        res_get3 = self.client.get(f"/api/v1/geotechnical/piping/{sim_id}")
        self.assertEqual(res_get3.status_code, 200)

        # 4. Seepage Flownet Endpoint & Aliases
        res_flow1 = self.client.post("/api/v1/analysis/geotechnical/seepage-flownet", json=payload)
        self.assertEqual(res_flow1.status_code, 200)
        flow_data = res_flow1.json()
        self.assertIn("shape_factor", flow_data)
        self.assertIn("unit_seepage_flow_rate_m3s_m", flow_data)
        self.assertIn("flownet_geojson", flow_data)
        self.assertIn("exit_stations", flow_data)

        res_flow2 = self.client.post("/api/v1/geotechnical/seepage-flownet", json=payload)
        self.assertEqual(res_flow2.status_code, 200)
        res_flow3 = self.client.post("/api/v1/geotechnical/flownet", json=payload)
        self.assertEqual(res_flow3.status_code, 200)

        # 5. Dynamic XYZ Flownet Tile Streaming across all metrics
        tile_urls = [
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/hydraulic_head/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/hydraulic_gradient/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/exit_gradient/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/factor_of_safety/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/pore_pressure/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/flownet/{sim_id}/hazard_tier/12/2048/1024.png",
            f"/api/v1/geotechnical/tiles/flownet/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/flownet/{sim_id}/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed flownet tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_insar_persistent_scatterer_and_velocity_field_api(self):
        """Test Cycle v2.5.20: InSAR Persistent Scatterer (PSI) time series, velocity field, dual-orbit decomposition, and dynamic tiles."""
        payload = {
            "simulationId": "SIM_TEST_INSAR_API_01",
            "assetId": "DAM_CADIA_CREST",
            "assetName": "Cadia Valley Tailings Crest",
            "satelliteMission": "sentinel-1",
            "sensorBand": "c_band",
            "orbitDirection": "ascending",
            "incidenceAngleDeg": 38.5,
            "headingAngleDeg": 348.0,
            "temporalCoherenceThreshold": 0.65,
            "amplitudeDispersionThreshold": 0.25,
            "perpendicularBaselineM": 45.0,
            "parallelBaselineM": 5.0,
            "psPointsCount": 20
        }

        # 1. Primary PSI Analysis Endpoint
        res = self.client.post("/api/v1/analysis/geotechnical/insar-persistent-scatterers", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["simulation_id"], "SIM_TEST_INSAR_API_01")
        self.assertEqual(data["asset_id"], "DAM_CADIA_CREST")
        self.assertIn("baseline_geometry", data)
        self.assertIn("atmospheric_phase_screen", data)
        self.assertIn("ps_points", data)
        self.assertIn("ps_geojson", data)
        self.assertIn("dual_orbit_decomposition", data)
        self.assertIn("tile_url_template", data)
        self.assertGreaterEqual(data["ps_points_retained"], 1)

        # 2. Canonical Route Aliases
        res_alias1 = self.client.post("/api/v1/analysis/insar-persistent-scatterers", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/geotechnical/insar-persistent-scatterers", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/api/v1/geotechnical/insar-ps", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # 3. InSAR Velocity Field Endpoint & Aliases
        res_vf1 = self.client.post("/api/v1/analysis/geotechnical/insar-velocity-field", json=payload)
        self.assertEqual(res_vf1.status_code, 200)
        res_vf2 = self.client.post("/api/v1/analysis/insar-velocity-field", json=payload)
        self.assertEqual(res_vf2.status_code, 200)
        res_vf3 = self.client.post("/api/v1/geotechnical/insar-velocity-field", json=payload)
        self.assertEqual(res_vf3.status_code, 200)
        res_vf4 = self.client.post("/api/v1/geotechnical/insar-velocity", json=payload)
        self.assertEqual(res_vf4.status_code, 200)

        # 4. GET Detail Endpoints & Aliases
        sim_id = "SIM_TEST_INSAR_API_01"
        res_get1 = self.client.get(f"/api/v1/analysis/geotechnical/insar-velocity-field/{sim_id}")
        self.assertEqual(res_get1.status_code, 200)
        self.assertEqual(res_get1.json()["simulation_id"], sim_id)
        res_get2 = self.client.get(f"/api/v1/geotechnical/insar-velocity-field/{sim_id}")
        self.assertEqual(res_get2.status_code, 200)
        res_get3 = self.client.get(f"/api/v1/geotechnical/insar-velocity/{sim_id}")
        self.assertEqual(res_get3.status_code, 200)
        res_get4 = self.client.get(f"/api/v1/geotechnical/insar-ps/{sim_id}")
        self.assertEqual(res_get4.status_code, 200)
        res_get5 = self.client.get(f"/api/v1/analysis/geotechnical/insar-persistent-scatterers/{sim_id}")
        self.assertEqual(res_get5.status_code, 200)

        # 5. Dual-Orbit Decomposition Endpoint & Aliases
        dual_payload = {
            "velocityAscMmYr": -12.5,
            "velocityDescMmYr": -9.8,
            "incAngleAscDeg": 38.5,
            "incAngleDescDeg": 39.2,
            "headingAscDeg": 348.0,
            "headingDescDeg": 192.0
        }
        res_dual1 = self.client.post("/api/v1/analysis/geotechnical/insar-dual-orbit-decomposition", json=dual_payload)
        self.assertEqual(res_dual1.status_code, 200)
        dual_data = res_dual1.json()
        self.assertIn("velocity_vertical_mm_yr", dual_data)
        self.assertIn("velocity_east_west_mm_yr", dual_data)
        self.assertIn("total_magnitude_mm_yr", dual_data)
        self.assertIn("hazard_tier", dual_data)

        res_dual2 = self.client.post("/api/v1/analysis/insar-dual-orbit-decomposition", json=dual_payload)
        self.assertEqual(res_dual2.status_code, 200)
        res_dual3 = self.client.post("/api/v1/geotechnical/insar-dual-orbit-decomposition", json=dual_payload)
        self.assertEqual(res_dual3.status_code, 200)
        res_dual4 = self.client.post("/api/v1/geotechnical/insar-dual-orbit", json=dual_payload)
        self.assertEqual(res_dual4.status_code, 200)

        # 6. Dynamic XYZ InSAR Velocity Tiles across all metrics
        tile_urls = [
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/velocity_vertical/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/velocity_los/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/velocity_east_west/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/temporal_coherence/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/height_residual/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/insar-velocity/{sim_id}/hazard_tier/12/2048/1024.png",
            f"/api/v1/geotechnical/tiles/insar-velocity/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/insar-velocity/{sim_id}/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed InSAR tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_damage_proxy_mapping_and_coherence_loss_api(self):
        """Test Cycle v2.5.21: POST /api/v1/analysis/geotechnical/sar-coherence-damage, damage-proxy-map, GET detail, and dynamic DPM tiles."""
        # 1. Complex SAR Coherence Loss Endpoint & Aliases
        loss_payload = {
            "coherencePre": 0.85,
            "coherenceEvent": 0.20
        }
        res_loss1 = self.client.post("/api/v1/analysis/geotechnical/sar-coherence-damage", json=loss_payload)
        self.assertEqual(res_loss1.status_code, 200)
        loss_data = res_loss1.json()
        self.assertEqual(loss_data["coherence_loss"], 0.65)
        self.assertEqual(loss_data["damage_severity_tier"], "catastrophic_collapse")
        self.assertIn("structural_damage_ratio", loss_data)
        self.assertIn("collapse_probability", loss_data)

        res_loss2 = self.client.post("/api/v1/analysis/sar-coherence-damage", json=loss_payload)
        self.assertEqual(res_loss2.status_code, 200)
        res_loss3 = self.client.post("/api/v1/geotechnical/sar-coherence-damage", json=loss_payload)
        self.assertEqual(res_loss3.status_code, 200)
        res_loss4 = self.client.post("/api/v1/geotechnical/dpm-damage", json=loss_payload)
        self.assertEqual(res_loss4.status_code, 200)

        # 2. Full-Scene Damage Proxy Mapping Endpoint & Aliases
        dpm_payload = {
            "simulationId": "SIM_TEST_DPM_API_01",
            "eventId": "EVENT_TEST_01",
            "eventName": "Kahramanmaras M7.8 Earthquake DPM",
            "preEventDate": "2026-08-10",
            "eventDate": "2026-08-22",
            "latitude": 37.05,
            "longitude": -120.85,
            "footprintSampleCount": 16
        }
        res_dpm1 = self.client.post("/api/v1/analysis/geotechnical/damage-proxy-map", json=dpm_payload)
        self.assertEqual(res_dpm1.status_code, 200)
        dpm_data = res_dpm1.json()
        self.assertEqual(dpm_data["simulation_id"], "SIM_TEST_DPM_API_01")
        self.assertEqual(dpm_data["event_id"], "EVENT_TEST_01")
        self.assertIn("summary", dpm_data)
        self.assertIn("building_footprints", dpm_data)
        self.assertIn("footprints_geojson", dpm_data)
        self.assertIn("tile_url_template", dpm_data)
        self.assertEqual(dpm_data["summary"]["total_footprints_evaluated"], 16)

        res_dpm2 = self.client.post("/api/v1/analysis/damage-proxy-map", json=dpm_payload)
        self.assertEqual(res_dpm2.status_code, 200)
        res_dpm3 = self.client.post("/api/v1/geotechnical/damage-proxy-map", json=dpm_payload)
        self.assertEqual(res_dpm3.status_code, 200)
        res_dpm4 = self.client.post("/api/v1/geotechnical/dpm", json=dpm_payload)
        self.assertEqual(res_dpm4.status_code, 200)

        # 3. GET Detail Endpoint & Aliases
        sim_id = "SIM_TEST_DPM_API_01"
        res_get1 = self.client.get(f"/api/v1/analysis/geotechnical/damage-proxy-map/{sim_id}")
        self.assertEqual(res_get1.status_code, 200)
        self.assertEqual(res_get1.json()["simulation_id"], sim_id)
        res_get2 = self.client.get(f"/api/v1/geotechnical/damage-proxy-map/{sim_id}")
        self.assertEqual(res_get2.status_code, 200)
        res_get3 = self.client.get(f"/api/v1/geotechnical/dpm/{sim_id}")
        self.assertEqual(res_get3.status_code, 200)

        # 4. Dynamic XYZ Damage Proxy Tile Streaming across all 6 raster metrics
        tile_urls = [
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/coherence_delta/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/pre_coherence/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/event_coherence/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/damage_severity_tier/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/building_loss_ratio/12/2048/1024.png",
            f"/api/v1/tiles/geotechnical/dpm/{sim_id}/hazard_rating_tier/12/2048/1024.png",
            f"/api/v1/geotechnical/tiles/dpm/{sim_id}/12/2048/1024.png",
            f"/api/v1/analysis/tiles/geotechnical/dpm/{sim_id}/12/2048/1024.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed DPM tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_phenology_harmonic_decomposition_and_mad_anomaly_api(self):
        """Test Cycle v2.5.22: Multi-Temporal Phenology, Harmonic Fourier Decomposition, Climatological MAD Anomaly & Dynamic XYZ Tile Streaming."""
        # 1. Harmonic Fourier Regression Analytical Endpoint & Aliases
        harmonic_payload = {
            "assetId": "SAN-LUIS-RESERVOIR-AOI",
            "indexName": "NDVI",
            "dates": ["2026-01-15", "2026-03-15", "2026-05-15", "2026-07-15", "2026-09-15", "2026-11-15"],
            "values": [0.25, 0.45, 0.72, 0.65, 0.35, 0.22],
            "numHarmonics": 2,
            "periodYears": 1.0
        }
        res_h1 = self.client.post("/api/v1/analysis/phenology/harmonic-decomposition", json=harmonic_payload)
        self.assertEqual(res_h1.status_code, 200)
        h_data = res_h1.json()
        self.assertEqual(h_data["asset_id"], "SAN-LUIS-RESERVOIR-AOI")
        self.assertEqual(h_data["index_name"], "NDVI")
        self.assertIn("model_result", h_data)
        self.assertIn("intercept_a0", h_data["model_result"])
        self.assertIn("linear_slope_a1", h_data["model_result"])
        self.assertIn("components", h_data["model_result"])
        self.assertIn("r_squared", h_data["model_result"])
        self.assertIn("rmse", h_data["model_result"])
        self.assertIn("formula_string", h_data["model_result"])

        res_h2 = self.client.post("/api/v1/analysis/phenology/harmonic", json=harmonic_payload)
        self.assertEqual(res_h2.status_code, 200)
        res_h3 = self.client.post("/api/v1/phenology/harmonic-decomposition", json=harmonic_payload)
        self.assertEqual(res_h3.status_code, 200)
        res_h4 = self.client.post("/api/v1/phenology/harmonic", json=harmonic_payload)
        self.assertEqual(res_h4.status_code, 200)

        # 2. Climatological MAD Anomaly Timeseries Endpoint & Aliases
        mad_payload = {
            "assetId": "SAN-LUIS-RESERVOIR-AOI",
            "indexName": "NDVI",
            "dates": ["2025-01-15", "2025-06-15", "2026-01-15", "2026-06-15", "2026-07-15"],
            "values": [0.25, 0.70, 0.26, 0.68, 0.30],
            "anomalyThreshold": 2.0,
            "minMadScale": 0.02
        }
        res_mad1 = self.client.post("/api/v1/analysis/phenology/climatological-mad-anomaly", json=mad_payload)
        self.assertEqual(res_mad1.status_code, 200)
        mad_data = res_mad1.json()
        self.assertEqual(mad_data["asset_id"], "SAN-LUIS-RESERVOIR-AOI")
        self.assertEqual(len(mad_data["monthly_climatology"]), 12)
        self.assertIn("theil_sen_trend", mad_data)
        self.assertIn("points", mad_data)
        self.assertEqual(len(mad_data["points"]), 5)
        self.assertIn("seasonal_z_score", mad_data["points"][-1])
        self.assertIn("anomaly_tier", mad_data["points"][-1])

        res_mad2 = self.client.post("/api/v1/analysis/phenology/mad-anomaly", json=mad_payload)
        self.assertEqual(res_mad2.status_code, 200)
        res_mad3 = self.client.post("/api/v1/phenology/climatological-mad-anomaly", json=mad_payload)
        self.assertEqual(res_mad3.status_code, 200)
        res_mad4 = self.client.post("/api/v1/phenology/mad-anomaly", json=mad_payload)
        self.assertEqual(res_mad4.status_code, 200)

        # 3. Full-Scene Phenology Decomposition Simulation Endpoint & Aliases
        sim_payload = {
            "simulationId": "SIM_TEST_PHENO_API_01",
            "aoiId": "AOI_SAN_LUIS",
            "assetName": "San Luis Reservoir Watershed",
            "collection": "sentinel-2-l2a",
            "indexName": "NDVI",
            "numHarmonics": 2,
            "anomalyThreshold": 2.0
        }
        res_sim1 = self.client.post("/api/v1/analysis/phenology/decomposition", json=sim_payload)
        self.assertEqual(res_sim1.status_code, 200)
        sim_data = res_sim1.json()
        self.assertEqual(sim_data["simulation_id"], "SIM_TEST_PHENO_API_01")
        self.assertEqual(sim_data["asset_name"], "San Luis Reservoir Watershed")
        self.assertIn("geojson_collection", sim_data)
        self.assertIn("tile_url_template", sim_data)
        self.assertIn("summary", sim_data)
        self.assertIn("harmonic_model", sim_data)

        res_sim2 = self.client.post("/api/v1/analysis/phenology/simulation", json=sim_payload)
        self.assertEqual(res_sim2.status_code, 200)
        res_sim3 = self.client.post("/api/v1/phenology/decomposition", json=sim_payload)
        self.assertEqual(res_sim3.status_code, 200)
        res_sim4 = self.client.post("/api/v1/phenology/simulation", json=sim_payload)
        self.assertEqual(res_sim4.status_code, 200)

        # 4. GET Detail Endpoint & Aliases
        sim_id = "SIM_TEST_PHENO_API_01"
        res_get1 = self.client.get(f"/api/v1/analysis/phenology/climatological-mad-anomaly/{sim_id}")
        self.assertEqual(res_get1.status_code, 200)
        self.assertEqual(res_get1.json()["simulation_id"], sim_id)
        res_get2 = self.client.get(f"/api/v1/analysis/phenology/decomposition/{sim_id}")
        self.assertEqual(res_get2.status_code, 200)
        res_get3 = self.client.get(f"/api/v1/analysis/phenology/{sim_id}")
        self.assertEqual(res_get3.status_code, 200)
        res_get4 = self.client.get(f"/api/v1/phenology/climatological-mad-anomaly/{sim_id}")
        self.assertEqual(res_get4.status_code, 200)
        res_get5 = self.client.get(f"/api/v1/phenology/decomposition/{sim_id}")
        self.assertEqual(res_get5.status_code, 200)
        res_get6 = self.client.get(f"/api/v1/phenology/{sim_id}")
        self.assertEqual(res_get6.status_code, 200)

        # 5. Dynamic XYZ Phenology Anomaly Tile Streaming across all 6 raster metrics
        tile_urls = [
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/12/1042/1628.png",
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/mad_anomaly_zscore/12/1042/1628.png",
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/baseline_ndvi/12/1042/1628.png",
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/seasonal_amplitude/12/1042/1628.png",
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/phase_angle/12/1042/1628.png",
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/theil_sen_slope/12/1042/1628.png",
            f"/api/v1/tiles/phenology/anomaly/{sim_id}/anomaly_tier/12/1042/1628.png",
            f"/api/v1/analysis/tiles/phenology/anomaly/{sim_id}/12/1042/1628.png",
            f"/api/v1/phenology/tiles/{sim_id}/12/1042/1628.png"
        ]
        for url in tile_urls:
            res_tile = self.client.get(url)
            self.assertEqual(res_tile.status_code, 200, f"Failed Phenology tile endpoint: {url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertGreater(len(res_tile.content), 100)
            self.assertEqual(res_tile.content[:4], b"\x89PNG")

    def test_stac_harvester_and_webhook_operations_api(self):
        """Test Cycle v2.5.23: Automated STAC Ingestion Watchdog, HMAC Webhooks & In-Memory Dead-Letter Queue."""
        # 1. List Subscriptions Endpoint & Aliases (versioned and unversioned)
        res_subs1 = self.client.get("/api/v1/operations/harvester/subscriptions")
        self.assertEqual(res_subs1.status_code, 200)
        data_subs1 = res_subs1.json()
        self.assertIn("subscriptions", data_subs1)
        self.assertGreaterEqual(len(data_subs1["subscriptions"]), 1)
        self.assertEqual(data_subs1["subscriptions"][0]["subscriptionId"], "SUB-STAC-001")

        res_subs2 = self.client.get("/operations/harvester/subscriptions")
        self.assertEqual(res_subs2.status_code, 200)

        # 2. Register New Harvester Subscription
        new_sub_payload = {
            "name": "Central Valley Aqueduct Monitor",
            "description": "Continuous Sentinel-2 & Landsat anomaly watchdog for subsidence and seepage",
            "schedule": {
                "interval": "daily",
                "cloudCoverMax": 15.0,
                "collections": ["sentinel-2-l2a", "landsat-c2-l2"],
                "lookbackHours": 36
            },
            "perimeter": {
                "fenceId": "FENCE-CV-01",
                "name": "Central Valley Siphon Buffer",
                "polygonCoordinates": [
                    [-120.95, 36.90], [-120.70, 36.90], [-120.70, 37.25], [-120.95, 37.25], [-120.95, 36.90]
                ],
                "assetId": "AQUEDUCT-CV-01"
            },
            "webhookEndpoints": [
                {
                    "endpointId": "EP-AUTO-01",
                    "channelType": "custom_webhook",
                    "targetUrl": "https://api.gios.internal/webhooks/ops",
                    "secretToken": "ops-secure-token-2026",
                    "isActive": True,
                    "maxRetries": 3
                }
            ],
            "triggerConditions": ["anomaly_exceeded"],
            "zScoreThreshold": 2.6,
            "isEnabled": True
        }
        res_create_sub = self.client.post("/api/v1/operations/harvester/subscriptions", json=new_sub_payload)
        self.assertEqual(res_create_sub.status_code, 200)
        created_sub_data = res_create_sub.json()
        self.assertEqual(created_sub_data["status"], "active")
        self.assertIn("subscription", created_sub_data)
        created_sub_id = created_sub_data["subscription"]["subscriptionId"]
        self.assertEqual(created_sub_data["subscription"]["name"], "Central Valley Aqueduct Monitor")

        # 3. GET Subscription Detail & 404 Check
        res_get_sub = self.client.get(f"/api/v1/operations/harvester/subscriptions/{created_sub_id}")
        self.assertEqual(res_get_sub.status_code, 200)
        self.assertEqual(res_get_sub.json()["subscription"]["subscriptionId"], created_sub_id)

        res_get_sub_short = self.client.get(f"/operations/harvester/subscriptions/{created_sub_id}")
        self.assertEqual(res_get_sub_short.status_code, 200)

        res_get_sub_404 = self.client.get("/api/v1/operations/harvester/subscriptions/SUB-NONEXISTENT-999")
        self.assertEqual(res_get_sub_404.status_code, 404)

        # 4. Trigger Harvester Execution
        trigger_payload = {
            "subscriptionId": created_sub_id,
            "forceAllScenes": False,
            "dryRun": True
        }
        res_trig1 = self.client.post("/api/v1/operations/harvester/trigger", json=trigger_payload)
        self.assertEqual(res_trig1.status_code, 200)
        trig_data = res_trig1.json()
        self.assertEqual(trig_data["subscriptionId"], created_sub_id)
        self.assertGreaterEqual(trig_data["evaluatedScenesCount"], 1)
        self.assertIn("evaluatedScenes", trig_data)
        self.assertIn("events", trig_data)
        self.assertIn("deliveryAttempts", trig_data)

        res_trig2 = self.client.post("/operations/harvester/trigger", json=trigger_payload)
        self.assertEqual(res_trig2.status_code, 200)

        # 5. List Webhook Endpoints & Aliases
        res_eps1 = self.client.get("/api/v1/operations/webhooks")
        self.assertEqual(res_eps1.status_code, 200)
        self.assertIn("endpoints", res_eps1.json())
        self.assertGreaterEqual(len(res_eps1.json()["endpoints"]), 2)

        res_eps2 = self.client.get("/operations/webhooks")
        self.assertEqual(res_eps2.status_code, 200)

        # 6. Create Webhook Endpoint
        ep_create_payload = {
            "endpointId": "EP-DISPATCH-TEST-01",
            "channelType": "slack",
            "targetUrl": "https://hooks.slack.com/services/T999/B888/X777",
            "secretToken": "slack-secret-key-2026",
            "isActive": True,
            "maxRetries": 2
        }
        res_create_ep = self.client.post("/api/v1/operations/webhooks", json=ep_create_payload)
        self.assertEqual(res_create_ep.status_code, 200)
        self.assertEqual(res_create_ep.json()["endpointId"], "EP-DISPATCH-TEST-01")

        # 7. GET Webhook Endpoint Detail & 404 Check
        res_get_ep = self.client.get("/api/v1/operations/webhooks/EP-DISPATCH-TEST-01")
        self.assertEqual(res_get_ep.status_code, 200)
        self.assertEqual(res_get_ep.json()["channelType"], "slack")

        res_get_ep_404 = self.client.get("/api/v1/operations/webhooks/EP-NONEXISTENT-999")
        self.assertEqual(res_get_ep_404.status_code, 404)

        # 8. Test Webhook Dispatch & Verification
        test_dispatch_payload = {
            "endpointId": "EP-DISPATCH-TEST-01",
            "testSeverity": "critical",
            "customMessage": "Simulated Dam Crest Anomaly Dispatch"
        }
        res_test_ep = self.client.post("/api/v1/operations/webhooks/EP-DISPATCH-TEST-01/test", json=test_dispatch_payload)
        self.assertEqual(res_test_ep.status_code, 200)
        test_res_data = res_test_ep.json()
        self.assertEqual(test_res_data["endpointId"], "EP-DISPATCH-TEST-01")
        self.assertEqual(test_res_data["deliveryStatus"], "delivered")
        self.assertGreater(test_res_data["latencyMs"], 0.0)
        self.assertIn("dispatchedPayload", test_res_data)

        # 9. DLQ List, Retry & Clear Endpoints
        res_dlq = self.client.get("/api/v1/operations/dlq")
        self.assertEqual(res_dlq.status_code, 200)
        self.assertIn("dead_letter_items", res_dlq.json())

        res_dlq_short = self.client.get("/operations/dlq")
        self.assertEqual(res_dlq_short.status_code, 200)

        res_dlq_retry = self.client.post("/api/v1/operations/dlq/retry", json={"retryAll": True})
        self.assertEqual(res_dlq_retry.status_code, 200)
        self.assertIn("replayedCount", res_dlq_retry.json())

        res_dlq_clear = self.client.delete("/api/v1/operations/dlq")
        self.assertEqual(res_dlq_clear.status_code, 200)
        self.assertEqual(res_dlq_clear.json()["status"], "cleared")

        # 10. Harvester Events List
        res_harv_events = self.client.get("/api/v1/events/harvester/events")
        self.assertEqual(res_harv_events.status_code, 200)
        self.assertIsInstance(res_harv_events.json(), list)

        # 11. Delete Registered Endpoints & Subscriptions (Cleanup)
        res_del_ep = self.client.delete("/api/v1/operations/webhooks/EP-DISPATCH-TEST-01")
        self.assertEqual(res_del_ep.status_code, 200)
        self.assertEqual(res_del_ep.json()["status"], "deleted")

        res_del_sub = self.client.delete(f"/api/v1/operations/harvester/subscriptions/{created_sub_id}")
        self.assertEqual(res_del_sub.status_code, 200)
        self.assertEqual(res_del_sub.json()["status"], "deleted")

    def test_nodeodm_drone_photogrammetry_and_cog_tiling_api(self):
        """Test Cycle v2.5.24: Headless NodeODM Dispatcher, Multi-Image Packager, Affine Solver & Dynamic Centimeter COG Tiling Service."""
        # 1. List Photogrammetry Tasks (Versioned and Unversioned aliases)
        res_list = self.client.get("/api/v1/drone/photogrammetry/tasks")
        self.assertEqual(res_list.status_code, 200)
        tasks = res_list.json()
        self.assertIsInstance(tasks, list)
        self.assertGreaterEqual(len(tasks), 1)

        res_list_alias = self.client.get("/drone/photogrammetry/tasks")
        self.assertEqual(res_list_alias.status_code, 200)
        self.assertIsInstance(res_list_alias.json(), list)

        # 2. Get Task Detail by ID
        res_detail = self.client.get("/api/v1/drone/photogrammetry/tasks/ODM-BENCHMARK-001")
        self.assertEqual(res_detail.status_code, 200)
        data_detail = res_detail.json()
        self.assertEqual(data_detail["taskId"], "ODM-BENCHMARK-001")
        self.assertEqual(data_detail["status"], "completed")
        self.assertIn("affineGeotransform", data_detail)
        self.assertIn("artifacts", data_detail)
        self.assertIn("tileUrlTemplate", data_detail)

        res_detail_alias = self.client.get("/drone/photogrammetry/tasks/ODM-BENCHMARK-001")
        self.assertEqual(res_detail_alias.status_code, 200)

        # 3. Create New Photogrammetry Task
        create_payload = {
            "taskId": "ODM-INTEGRATION-001",
            "projectName": "Hydraulic Spillway High-Res Photogrammetry",
            "imageCount": 140,
            "targetGsdCm": 2.0,
            "cameraModel": "DJI_FC6310R",
            "gcps": [
                {"gcpId": "GCP-101", "pixelX": 500.0, "pixelY": 500.0, "worldX": 674100.0, "worldY": 4102300.0, "elevationZ": 125.0, "isEnabled": True},
                {"gcpId": "GCP-102", "pixelX": 4500.0, "pixelY": 550.0, "worldX": 674200.0, "worldY": 4102305.0, "elevationZ": 125.4, "isEnabled": True},
                {"gcpId": "GCP-103", "pixelX": 600.0, "pixelY": 3500.0, "worldX": 674105.0, "worldY": 4102220.0, "elevationZ": 92.0, "isEnabled": True}
            ]
        }
        res_create = self.client.post("/api/v1/drone/photogrammetry/tasks", json=create_payload)
        self.assertEqual(res_create.status_code, 200)
        data_create = res_create.json()
        self.assertEqual(data_create["taskId"], "ODM-INTEGRATION-001")
        self.assertEqual(data_create["status"], "running")
        self.assertIn("affineGeotransform", data_create)

        # 4. Cancel Task
        res_cancel = self.client.post("/api/v1/drone/photogrammetry/tasks/ODM-INTEGRATION-001/cancel")
        self.assertEqual(res_cancel.status_code, 200)
        self.assertEqual(res_cancel.json()["status"], "cancelled")

        # 5. Restart Task
        res_restart = self.client.post("/api/v1/drone/photogrammetry/tasks/ODM-INTEGRATION-001/restart")
        self.assertEqual(res_restart.status_code, 200)
        self.assertEqual(res_restart.json()["status"], "running")

        # 6. Update Ground Control Points & Georeferencing
        gcp_update_payload = {
            "gcps": [
                {"gcpId": "GCP-101", "pixelX": 500.0, "pixelY": 500.0, "worldX": 674100.0, "worldY": 4102300.0, "elevationZ": 125.0, "isEnabled": True},
                {"gcpId": "GCP-102", "pixelX": 4500.0, "pixelY": 550.0, "worldX": 674200.0, "worldY": 4102305.0, "elevationZ": 125.4, "isEnabled": True},
                {"gcpId": "GCP-103", "pixelX": 600.0, "pixelY": 3500.0, "worldX": 674105.0, "worldY": 4102220.0, "elevationZ": 92.0, "isEnabled": True},
                {"gcpId": "CP-104", "pixelX": 2500.0, "pixelY": 2000.0, "worldX": 674152.0, "worldY": 4102260.0, "elevationZ": 108.5, "isCheckPoint": True, "isEnabled": True}
            ],
            "recalculateGeoreferencing": True
        }
        res_gcp = self.client.post("/api/v1/drone/photogrammetry/tasks/ODM-INTEGRATION-001/gcp", json=gcp_update_payload)
        self.assertEqual(res_gcp.status_code, 200)
        data_gcp = res_gcp.json()
        self.assertEqual(data_gcp["totalGcps"], 4)
        self.assertEqual(data_gcp["checkPoints"], 1)
        self.assertIn("affineGeotransform", data_gcp)

        # 7. Calculate Autonomous Drone Flight Plan
        flight_plan_req = {
            "targetGsdCm": 2.5,
            "cameraModel": "DJI_FC6310R",
            "forwardOverlapPercent": 80.0,
            "sideOverlapPercent": 70.0,
            "surveyAreaHa": 25.0,
            "flightSpeedMs": 7.0
        }
        res_plan = self.client.post("/api/v1/drone/photogrammetry/flight-plan", json=flight_plan_req)
        self.assertEqual(res_plan.status_code, 200)
        data_plan = res_plan.json()
        self.assertIn("plan", data_plan)
        plan = data_plan["plan"]
        self.assertGreater(plan["flightAltitudeM"], 0.0)
        self.assertGreater(plan["estimatedPhotoCount"], 0)
        self.assertGreater(plan["flightLineSpacingM"], 0.0)
        self.assertGreater(plan["estimatedFlightTimeMinutes"], 0.0)

        # 8. Solve GCP 2D Affine Transformation Matrix
        affine_req = {
            "gcps": [
                {"gcpId": "GCP-01", "pixelX": 500.0, "pixelY": 450.0, "worldX": 674100.0, "worldY": 4102300.0, "isEnabled": True},
                {"gcpId": "GCP-02", "pixelX": 4800.0, "pixelY": 520.0, "worldX": 674207.5, "worldY": 4102302.0, "isEnabled": True},
                {"gcpId": "GCP-03", "pixelX": 600.0, "pixelY": 3200.0, "worldX": 674102.5, "worldY": 4102231.2, "isEnabled": True}
            ]
        }
        res_affine = self.client.post("/api/v1/drone/photogrammetry/solve-affine", json=affine_req)
        self.assertEqual(res_affine.status_code, 200)
        data_affine = res_affine.json()
        self.assertTrue(data_affine["success"])
        affine_matrix = data_affine["affineGeotransform"]["affineMatrix"]
        self.assertEqual(len(affine_matrix), 6)
        self.assertIn("rmsePixel", data_affine["affineGeotransform"])

        # 9. Dynamic Centimeter COG Tile Streaming across all 7 metrics
        metrics = ["orthophoto", "dsm", "dtm", "chm", "slope", "reprojection_error", "point_density"]
        for metric in metrics:
            tile_url = f"/api/v1/tiles/drone/photogrammetry/ODM-BENCHMARK-001/{metric}/18/100/100.png"
            res_tile = self.client.get(tile_url)
            self.assertEqual(res_tile.status_code, 200)
            self.assertEqual(res_tile.headers["content-type"], "image/png")
            self.assertTrue(res_tile.content.startswith(b"\x89PNG"))

        # Default orthophoto tile endpoint
        res_def_tile = self.client.get("/api/v1/tiles/drone/photogrammetry/ODM-BENCHMARK-001/18/100/100.png")
        self.assertEqual(res_def_tile.status_code, 200)
        self.assertTrue(res_def_tile.content.startswith(b"\x89PNG"))

        # Drone router alias for tiles
        res_drone_tile = self.client.get("/drone/tiles/photogrammetry/ODM-BENCHMARK-001/18/100/100.png")
        self.assertEqual(res_drone_tile.status_code, 200)
        self.assertTrue(res_drone_tile.content.startswith(b"\x89PNG"))

    def test_custom_expression_and_band_math_ast_tiling_api(self):
        """Test Cycle v2.5.25: AST Band Math Compiler, Multi-Band Math Evaluator & Dynamic XYZ Custom Expression Tile Service."""
        # 1. Formula Validation Endpoint (Versioned and Unversioned)
        val_req = {"formula": "(B08 - B04) / (B08 + B04)", "collection": "sentinel-2-l2a"}
        res_val = self.client.post("/api/v1/analysis/custom-expression/validate", json=val_req)
        self.assertEqual(res_val.status_code, 200)
        data_val = res_val.json()
        self.assertTrue(data_val["is_valid"])
        self.assertIn("B08", data_val["bands_detected"])
        self.assertIn("B04", data_val["bands_detected"])
        self.assertGreater(data_val["ast_depth"], 0)

        res_val_alias = self.client.post("/analysis/custom-expression/validate", json=val_req)
        self.assertEqual(res_val_alias.status_code, 200)
        self.assertTrue(res_val_alias.json()["is_valid"])

        # 1b. Validation of Complex Formula (EVI)
        evi_req = {"formula": "2.5 * (B08 - B04) / (B08 + 6.0 * B04 - 7.5 * B02 + 1.0)"}
        res_evi = self.client.post("/api/v1/analysis/custom-expression/validate", json=evi_req)
        self.assertEqual(res_evi.status_code, 200)
        self.assertTrue(res_evi.json()["is_valid"])
        self.assertEqual(len(res_evi.json()["bands_detected"]), 3)

        # 1c. Validation of Syntax Error / Invalid Formula
        bad_req = {"formula": "(B08 - B04"}  # Unclosed paren
        res_bad = self.client.post("/api/v1/analysis/custom-expression/validate", json=bad_req)
        self.assertEqual(res_bad.status_code, 200)
        self.assertFalse(res_bad.json()["is_valid"])
        self.assertIsNotNone(res_bad.json()["error_message"])

        # 2. Formula Evaluation Endpoint (Versioned, Unversioned, snake_case and camelCase)
        eval_req_snake = {
            "formula": "(B08 - B04) / (B08 + B04)",
            "band_values": {"B08": 0.60, "B04": 0.20},
            "epsilon": 1e-6
        }
        res_eval = self.client.post("/api/v1/analysis/custom-expression/evaluate", json=eval_req_snake)
        self.assertEqual(res_eval.status_code, 200)
        data_eval = res_eval.json()
        self.assertTrue(data_eval["is_valid"])
        self.assertAlmostEqual(data_eval["result"], 0.50, places=4)
        self.assertGreater(data_eval["execution_time_ms"], 0.0)

        eval_req_camel = {
            "formula": "(B08 - B04) / (B08 + B04)",
            "bandValues": {"B08": 0.60, "B04": 0.20}
        }
        res_eval_camel = self.client.post("/analysis/custom-expression/evaluate", json=eval_req_camel)
        self.assertEqual(res_eval_camel.status_code, 200)
        self.assertAlmostEqual(res_eval_camel.json()["result"], 0.50, places=4)

        # 2b. Division-by-Zero Numerical Safety
        div_zero_req = {
            "formula": "1.0 / B04",
            "band_values": {"B04": 0.0},
            "epsilon": 1e-6
        }
        res_div_zero = self.client.post("/api/v1/analysis/custom-expression/evaluate", json=div_zero_req)
        self.assertEqual(res_div_zero.status_code, 200)
        self.assertTrue(res_div_zero.json()["is_valid"])
        self.assertAlmostEqual(res_div_zero.json()["result"], 1000000.0, places=1)

        # 3. Presets Catalog Endpoint
        res_presets = self.client.get("/api/v1/analysis/custom-expression/presets")
        self.assertEqual(res_presets.status_code, 200)
        data_presets = res_presets.json()
        self.assertGreaterEqual(data_presets["total"], 10)
        self.assertIsInstance(data_presets["presets"], list)
        preset_ids = [p["id"] for p in data_presets["presets"]]
        self.assertIn("ndvi", preset_ids)
        self.assertIn("mndwi", preset_ids)
        self.assertIn("evi", preset_ids)

        res_presets_alias = self.client.get("/analysis/custom-expression/presets")
        self.assertEqual(res_presets_alias.status_code, 200)
        self.assertEqual(res_presets_alias.json()["total"], data_presets["total"])

        # 4. Dynamic Custom Expression XYZ Tile Streaming (Versioned & Unversioned)
        tile_url = "/api/v1/tiles/custom-expression/12/100/100.png?expr=(B08-B04)/(B08%2BB04)&colormap=rdylgn&rescale=-0.2,0.8"
        res_tile = self.client.get(tile_url)
        self.assertEqual(res_tile.status_code, 200)
        self.assertEqual(res_tile.headers["content-type"], "image/png")
        self.assertTrue(res_tile.content.startswith(b"\x89PNG"))

        tile_alias_url = "/tiles/custom-expression/12/100/100.png?expr=(B08-B04)/(B08%2BB04)"
        res_tile_alias = self.client.get(tile_alias_url)
        self.assertEqual(res_tile_alias.status_code, 200)
        self.assertTrue(res_tile_alias.content.startswith(b"\x89PNG"))

        # 5. Scene-specific Dynamic Custom Expression Tile Streaming
        scene_tile_url = "/api/v1/tiles/sentinel-2-l2a/S2A_MSIL2A_20261015/custom-expression/12/100/100.png?expr=(B08-B11)/(B08%2BB11)&colormap=spectral"
        res_scene_tile = self.client.get(scene_tile_url)
        self.assertEqual(res_scene_tile.status_code, 200)
        self.assertEqual(res_scene_tile.headers["content-type"], "image/png")
        self.assertTrue(res_scene_tile.content.startswith(b"\x89PNG"))

    def test_dem_topography_transect_and_tile_streaming_api(self):
        """Test Cycle v2.5.26: Copernicus 30m DEM (GLO-30) Topography, Transect, Slope Hazard & Dynamic XYZ Tile Streaming."""
        # 1. Topography Analysis Endpoint & Unversioned Route
        topo_payload = {
            "bbox": [-121.1, 37.0, -121.0, 37.1],
            "collection": "cop-dem-glo-30",
            "target_resolution_m": 30.0,
            "sun_azimuth_deg": 315.0,
            "sun_altitude_deg": 45.0,
            "z_factor": 1.0
        }
        res_topo = self.client.post("/api/v1/analysis/dem/topography", json=topo_payload)
        self.assertEqual(res_topo.status_code, 200)
        topo_data = res_topo.json()
        self.assertTrue(topo_data["simulation_id"].startswith("DEM-TOPO-"))
        self.assertEqual(topo_data["collection"], "cop-dem-glo-30")
        self.assertIn("summary", topo_data)
        self.assertIn("min_elevation_m", topo_data["summary"])
        self.assertIn("max_elevation_m", topo_data["summary"])
        self.assertIn("mean_slope_deg", topo_data["summary"])
        self.assertIn("mean_twi", topo_data["summary"])
        self.assertIn("sun_illumination", topo_data)
        self.assertEqual(topo_data["sun_illumination"]["azimuth_deg"], 315.0)
        self.assertIn("hazard_distribution", topo_data)
        self.assertIn("tile_url_templates", topo_data)
        self.assertIn("relief", topo_data["tile_url_templates"])
        self.assertIn("hillshade", topo_data["tile_url_templates"])

        res_topo_unv = self.client.post("/analysis/dem/topography", json=topo_payload)
        self.assertEqual(res_topo_unv.status_code, 200)

        # 2. Elevation Transect Profile Endpoint
        transect_payload = {
            "start_point": [37.05, -121.05],
            "end_point": [37.045, -121.045],
            "samples": 20,
            "collection": "cop-dem-glo-30",
            "z_factor": 1.0
        }
        res_transect = self.client.post("/api/v1/analysis/dem/transect", json=transect_payload)
        self.assertEqual(res_transect.status_code, 200)
        transect_data = res_transect.json()
        self.assertTrue(transect_data["transect_id"].startswith("TRANSECT-"))
        self.assertEqual(transect_data["collection"], "cop-dem-glo-30")
        self.assertGreater(transect_data["total_distance_m"], 0.0)
        self.assertEqual(len(transect_data["points"]), 20)
        p0 = transect_data["points"][0]
        self.assertIn("elevation_m", p0)
        self.assertIn("slope_deg", p0)
        self.assertIn("twi", p0)
        self.assertIn("hazard_tier", p0)

        # 3. Slope Hazard Zonification Endpoint
        hazard_payload = {
            "bbox": [-121.1, 37.0, -121.0, 37.1],
            "critical_threshold_deg": 35.0,
            "collection": "cop-dem-glo-30"
        }
        res_hazard = self.client.post("/api/v1/analysis/dem/slope-hazard", json=hazard_payload)
        self.assertEqual(res_hazard.status_code, 200)
        hazard_data = res_hazard.json()
        self.assertTrue(hazard_data["analysis_id"].startswith("DEM-HAZARD-"))
        self.assertIn("tier_breakdown", hazard_data)
        self.assertIn("flat", hazard_data["tier_breakdown"])
        self.assertIn("critical_hazard", hazard_data["tier_breakdown"])
        self.assertIn("critical_slope_percentage", hazard_data)
        self.assertIn("overall_hazard_rating", hazard_data)

        # 4. Dynamic DEM XYZ Tile Streaming across metrics (Versioned & Unversioned)
        dem_tile_endpoints = [
            "/api/v1/tiles/dem/relief/10/500/500.png?colormap=terrain",
            "/api/v1/tiles/dem/hillshade/10/500/500.png?sun_azimuth=315&sun_altitude=45",
            "/api/v1/tiles/dem/slope/10/500/500.png?colormap=rdylgn_r",
            "/api/v1/tiles/dem/twi/10/500/500.png?colormap=blues",
            "/api/v1/tiles/dem/elevation/10/500/500.png",
            "/tiles/dem/relief/10/500/500.png"
        ]
        for tile_url in dem_tile_endpoints:
            res_tile = self.client.get(tile_url)
            self.assertEqual(res_tile.status_code, 200, f"Failed DEM tile: {tile_url}")
            self.assertEqual(res_tile.headers.get("content-type"), "image/png")
            self.assertTrue(res_tile.content.startswith(b"\x89PNG"))

    def test_mosaic_vrt_feather_and_dynamic_tiles_api(self):
        """Test POST /api/v1/analysis/mosaic/vrt, /feather, /granules and dynamic XYZ mosaic tile streaming."""
        # 1. Test POST /api/v1/analysis/mosaic/vrt (and alias /mosaic/vrt)
        vrt_payload = {
            "collection": "sentinel-2-l2a",
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "granule_ids": ["T10SEG", "T10SFG"],
            "feather_width_m": 200.0,
            "blend_method": "feather",
            "target_crs": "EPSG:3857"
        }
        res_vrt = self.client.post("/api/v1/analysis/mosaic/vrt", json=vrt_payload)
        self.assertEqual(res_vrt.status_code, 200)
        vrt_data = res_vrt.json()
        self.assertIn("mosaic_id", vrt_data)
        self.assertIn("vrt_xml", vrt_data)
        self.assertIn("tile_url_template", vrt_data)
        self.assertEqual(len(vrt_data["granules"]), 2)
        self.assertEqual(vrt_data["summary"]["radiometric_continuity_tier"], "seamless")

        # Route alias
        res_vrt_alias = self.client.post("/mosaic/vrt", json=vrt_payload)
        self.assertEqual(res_vrt_alias.status_code, 200)

        # 2. Test POST /api/v1/analysis/mosaic/feather (and alias /mosaic/feather)
        feather_payload = {
            "granule_a": "T10SEG",
            "granule_b": "T10SFG",
            "feather_width_m": 250.0,
            "blend_method": "feather"
        }
        res_f = self.client.post("/api/v1/analysis/mosaic/feather", json=feather_payload)
        self.assertEqual(res_f.status_code, 200)
        f_data = res_f.json()
        self.assertIn("analysis_id", f_data)
        self.assertIn("sample_points", f_data)
        self.assertIn("weight_profile_samples", f_data)
        self.assertEqual(f_data["radiometric_continuity_tier"], "seamless")
        self.assertLess(f_data["mean_delta_rho"], 0.005)

        # 3. Test GET /api/v1/analysis/mosaic/granules (and alias /mosaic/granules)
        res_g = self.client.get("/api/v1/analysis/mosaic/granules?bbox=-121.20,36.90,-120.65,37.45")
        self.assertEqual(res_g.status_code, 200)
        g_data = res_g.json()
        self.assertIn("granules", g_data)
        self.assertGreaterEqual(len(g_data["granules"]), 2)

        # 4. Dynamic XYZ Mosaic Tile Streaming
        mosaic_tiles = [
            "/api/v1/tiles/mosaic/sentinel-2-l2a/10/163/395.png?blend_method=feather",
            "/api/v1/tiles/mosaic/sentinel-2-l2a/10/163/395.png?blend_method=voronoi",
            "/api/v1/tiles/mosaic/feather/10/163/395.png",
            "/api/v1/tiles/mosaic/seamline/10/163/395.png",
            "/tiles/mosaic/sentinel-2-l2a/10/163/395.png"
        ]
        for url in mosaic_tiles:
            res_t = self.client.get(url)
            self.assertEqual(res_t.status_code, 200, f"Failed mosaic tile: {url}")
            self.assertEqual(res_t.headers.get("content-type"), "image/png")
            self.assertTrue(res_t.content.startswith(b"\x89PNG"))

    def test_temporal_composite_stack_and_tile_streaming_api(self):
        """Test Cycle v2.5.28: Multi-Temporal Scene Stacking, Statistical Reducers, Quality Mosaics & Dynamic XYZ Tile Streaming."""
        # 1. Test POST /api/v1/analysis/temporal/composite (Median Reducer)
        comp_payload = {
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "collection": "sentinel-2-l2a",
            "start_date": "2026-06-01",
            "end_date": "2026-08-31",
            "reducer": "median",
            "max_cloud_cover_pct": 35.0,
            "bands": ["B04", "B03", "B02", "B08"]
        }
        res_comp = self.client.post("/api/v1/analysis/temporal/composite", json=comp_payload)
        self.assertEqual(res_comp.status_code, 200)
        comp_data = res_comp.json()
        self.assertIn("composite_id", comp_data)
        self.assertTrue(comp_data["composite_id"].startswith("COMPOSITE-"))
        self.assertEqual(comp_data["collection"], "sentinel-2-l2a")
        self.assertEqual(comp_data["reducer"], "median")
        self.assertIn("tile_url_template", comp_data)
        self.assertIn("/api/v1/tiles/temporal/sentinel-2-l2a/median/{z}/{x}/{y}.png", comp_data["tile_url_template"])
        self.assertGreaterEqual(comp_data["scene_count"], 1)
        self.assertIn("metadata", comp_data)
        self.assertEqual(comp_data["metadata"]["preserves_covariance"], False)
        self.assertIn("quality_tier", comp_data["metadata"])
        self.assertIn("scenes", comp_data)

        # Unversioned route alias
        res_comp_alias = self.client.post("/analysis/temporal/composite", json=comp_payload)
        self.assertEqual(res_comp_alias.status_code, 200)

        # 2. Test POST /api/v1/analysis/temporal/composite with Greenest-Pixel (Max NDVI Quality Mosaic)
        green_payload = {
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "collection": "sentinel-2-l2a",
            "start_date": "2026-06-01",
            "end_date": "2026-08-31",
            "reducer": "max_ndvi",
            "quality_band": "NDVI"
        }
        res_green = self.client.post("/api/v1/analysis/temporal/composite", json=green_payload)
        self.assertEqual(res_green.status_code, 200)
        green_data = res_green.json()
        self.assertEqual(green_data["reducer"], "max_ndvi")
        self.assertEqual(green_data["metadata"]["preserves_covariance"], True)
        self.assertIn("quality-mosaic", green_data["tile_url_template"])

        # 3. Test POST /api/v1/analysis/temporal/stack (Scene Stack Inspection)
        stack_payload = {
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "collection": "sentinel-2-l2a",
            "start_date": "2026-06-01",
            "end_date": "2026-08-31",
            "max_cloud_cover_pct": 40.0
        }
        res_stack = self.client.post("/api/v1/analysis/temporal/stack", json=stack_payload)
        self.assertEqual(res_stack.status_code, 200)
        stack_data = res_stack.json()
        self.assertEqual(stack_data["collection"], "sentinel-2-l2a")
        self.assertGreaterEqual(stack_data["total_scenes"], 1)
        self.assertIn("scenes", stack_data)
        self.assertIn("mean_cloud_cover_pct", stack_data)
        self.assertIn("recommended_reducer", stack_data)

        # Unversioned route alias
        res_stack_alias = self.client.post("/analysis/temporal/stack", json=stack_payload)
        self.assertEqual(res_stack_alias.status_code, 200)

        # 4. Test GET /api/v1/analysis/temporal/reducers
        res_red = self.client.get("/api/v1/analysis/temporal/reducers")
        self.assertEqual(res_red.status_code, 200)
        red_data = res_red.json()
        self.assertGreaterEqual(red_data["total_reducers"], 6)
        self.assertIn("reducers", red_data)
        self.assertIn("quality_tiers", red_data)

        res_red_alias = self.client.get("/analysis/temporal/reducers")
        self.assertEqual(res_red_alias.status_code, 200)

        # 5. Dynamic XYZ Tile Streaming across reducers and quality mosaics
        temporal_tiles = [
            "/api/v1/tiles/temporal/sentinel-2-l2a/median/10/163/395.png",
            "/api/v1/tiles/temporal/sentinel-2-l2a/max_ndvi/10/163/395.png?colormap=rdylgn",
            "/api/v1/tiles/temporal/sentinel-2-l2a/mean/10/163/395.png?bands=B04,B03,B02",
            "/api/v1/tiles/temporal/quality-mosaic/sentinel-2-l2a/10/163/395.png?quality_band=NDVI",
            "/api/v1/tiles/temporal/quality-mosaic/sentinel-2-l2a/10/163/395.png?quality_band=cloud_prob",
            "/tiles/temporal/sentinel-2-l2a/median/10/163/395.png",
            "/api/v1/tiles/composite/sentinel-2-l2a/10/163/395.png?reducer=p25"
        ]
        for url in temporal_tiles:
            res_t = self.client.get(url)
            self.assertEqual(res_t.status_code, 200, f"Failed temporal composite tile: {url}")
            self.assertEqual(res_t.headers.get("content-type"), "image/png")
            self.assertTrue(res_t.content.startswith(b"\x89PNG"))


    def test_sar_backscatter_and_speckle_filtering_api(self):
        """Task T-235 / T-238: Test POST /api/v1/analysis/sar/backscatter, unversioned aliases, and dynamic XYZ SAR tiles."""
        # 1. Standard VV backscatter analysis request
        payload = {
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "collection": "sentinel-1-rtc",
            "polarization": "vv",
            "speckle_filter": "refined_lee",
            "filter_kernel_size": 5,
            "calibration": "gamma0",
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "water_threshold_db": -16.5,
            "target_resolution_m": 10.0
        }
        res = self.client.post("/api/v1/analysis/sar/backscatter", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["collection"], "sentinel-1-rtc")
        self.assertEqual(data["polarization"], "vv")
        self.assertEqual(data["speckle_filter"], "refined_lee")
        self.assertEqual(data["calibration"], "gamma0")
        self.assertEqual(data["filter_kernel_size"], 5)
        self.assertEqual(data["status"], "completed")
        self.assertIn("analysis_id", data)
        self.assertIn("summary", data)
        self.assertIn("tile_url_template", data)

        summary = data["summary"]
        self.assertIn("mean_backscatter_db", summary)
        self.assertIn("median_backscatter_db", summary)
        self.assertIn("speckle_variance_reduction_ratio", summary)
        self.assertGreaterEqual(summary["speckle_variance_reduction_ratio"], 1.0)
        self.assertIn("water_fraction", summary)
        self.assertIn("water_area_ha", summary)
        self.assertIn("dominant_tier", summary)

        # 2. Unversioned route alias & sar_router alias
        res_alias1 = self.client.post("/analysis/sar/backscatter", json=payload)
        self.assertEqual(res_alias1.status_code, 200)
        res_alias2 = self.client.post("/api/v1/sar/backscatter", json=payload)
        self.assertEqual(res_alias2.status_code, 200)
        res_alias3 = self.client.post("/sar/backscatter", json=payload)
        self.assertEqual(res_alias3.status_code, 200)

        # 3. Dual-pol RGB composite request
        payload_rgb = {
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "collection": "sentinel-1-rtc",
            "polarization": "dual_pol_rgb",
            "speckle_filter": "frost",
            "calibration": "gamma0"
        }
        res_rgb = self.client.post("/api/v1/analysis/sar/backscatter", json=payload_rgb)
        self.assertEqual(res_rgb.status_code, 200)
        data_rgb = res_rgb.json()
        self.assertEqual(data_rgb["polarization"], "dual_pol_rgb")
        self.assertEqual(data_rgb["speckle_filter"], "frost")

        # 4. Cross-polarization ratio request
        payload_ratio = {
            "bbox": [-121.20, 36.90, -120.65, 37.45],
            "polarization": "ratio_vh_vv",
            "speckle_filter": "kuan"
        }
        res_ratio = self.client.post("/api/v1/analysis/sar/backscatter", json=payload_ratio)
        self.assertEqual(res_ratio.status_code, 200)
        self.assertEqual(res_ratio.json()["polarization"], "ratio_vh_vv")

        # 5. Dynamic XYZ SAR Tile Endpoints
        sar_tile_urls = [
            "/api/v1/tiles/sar/sentinel-1-rtc/vv/10/163/395.png",
            "/api/v1/tiles/sar/sentinel-1-rtc/vh/10/163/395.png",
            "/api/v1/tiles/sar/sentinel-1-rtc/ratio_vh_vv/10/163/395.png",
            "/api/v1/tiles/sar/sentinel-1-rtc/dual_pol_rgb/10/163/395.png",
            "/api/v1/tiles/sar/sentinel-1-rtc/10/163/395.png?polarization=vv",
            "/api/v1/tiles/sar/filtered/refined_lee/10/163/395.png?polarization=vv",
            "/api/v1/tiles/sar/filtered/frost/10/163/395.png",
            "/api/v1/tiles/sar/filtered/kuan/10/163/395.png",
            "/api/v1/tiles/sar/filtered/gamma_map/10/163/395.png",
            "/api/v1/tiles/sar/flood/10/163/395.png",
            "/tiles/sar/sentinel-1-rtc/vv/10/163/395.png",
            "/tiles/sar/flood/10/163/395.png"
        ]
        for url in sar_tile_urls:
            res_t = self.client.get(url)
            self.assertEqual(res_t.status_code, 200, f"Failed SAR tile: {url}")
            self.assertEqual(res_t.headers.get("content-type"), "image/png")
            self.assertTrue(res_t.content.startswith(b"\x89PNG"))

    def test_aquatic_quality_and_hab_hazard_api(self):
        """Test POST /api/v1/analysis/aquatic/quality, /aquatic/hab, /aquatic/scenes, and dynamic XYZ tiles."""
        # 1. Quality Analysis Endpoint
        payload_erie = {
            "scene_id": "LAKE_ERIE_HAB_2026",
            "collection": "sentinel-2-l2a",
            "algorithm": "ndci_mishra_2012",
            "water_masking_method": "mndwi_threshold",
            "mndwi_threshold": 0.0
        }
        res_erie = self.client.post("/api/v1/analysis/aquatic/quality", json=payload_erie)
        self.assertEqual(res_erie.status_code, 200)
        data_erie = res_erie.json()
        self.assertEqual(data_erie["scene_id"], "LAKE_ERIE_HAB_2026")
        self.assertEqual(data_erie["status"], "completed")
        self.assertIn("analysis_id", data_erie)
        self.assertIn("summary", data_erie)
        self.assertIn("tile_url_template", data_erie)
        self.assertIn("hab_tile_url_template", data_erie)
        self.assertIn(data_erie["summary"]["dominant_eutrophication_tier"], ["eutrophic", "hypertrophic"])
        self.assertGreater(data_erie["summary"]["water_pixels"], 0)

        # 2. HAB Hazard Analysis Endpoint
        payload_tahoe = {
            "scene_id": "LAKE_TAHOE_OLIGOTROPHIC_2026",
            "collection": "sentinel-2-l2a"
        }
        res_tahoe = self.client.post("/api/v1/analysis/aquatic/hab", json=payload_tahoe)
        self.assertEqual(res_tahoe.status_code, 200)
        data_tahoe = res_tahoe.json()
        self.assertEqual(data_tahoe["summary"]["dominant_eutrophication_tier"], "oligotrophic")
        self.assertEqual(data_tahoe["summary"]["bloom_risk_level"], "low")

        # 3. Available Benchmark Scenes Endpoint
        res_scenes = self.client.get("/api/v1/analysis/aquatic/scenes")
        self.assertEqual(res_scenes.status_code, 200)
        scenes_data = res_scenes.json()
        self.assertEqual(scenes_data["status"], "success")
        self.assertGreaterEqual(scenes_data["total"], 3)

        # 4. Dynamic XYZ Aquatic Quality & HAB Tile Streaming Endpoints
        tile_routes = [
            "/api/v1/tiles/aquatic/sentinel-2-l2a/ndci/10/163/395.png",
            "/api/v1/tiles/aquatic/sentinel-2-l2a/fai/10/163/395.png",
            "/api/v1/tiles/aquatic/sentinel-2-l2a/chla/10/163/395.png",
            "/api/v1/tiles/aquatic/sentinel-2-l2a/turbidity/10/163/395.png",
            "/api/v1/tiles/aquatic/hab/sentinel-2-l2a/10/163/395.png",
            "/tiles/aquatic/sentinel-2-l2a/ndci/10/163/395.png",
            "/tiles/aquatic/hab/sentinel-2-l2a/10/163/395.png"
        ]
        for url in tile_routes:
            res_t = self.client.get(url)
            self.assertEqual(res_t.status_code, 200, f"Failed tile endpoint: {url}")
            self.assertEqual(res_t.headers.get("content-type"), "image/png")
            self.assertTrue(res_t.content.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t256_topographic_solar_illumination_and_tiles_api(self):
        """Cycle v2.5.32 (Task T-256): Topographic Solar Illumination Correction, SCS+C Inversion & Dynamic Tile Endpoints."""
        # 1. POST /api/v1/analysis/topographic/correction (SCS+C method)
        payload = {
            "scene_id": "MT_SHASTA_VOLCANO_2026",
            "collection": "sentinel-2-l2a",
            "dem_collection": "cop-dem-glo-30",
            "method": "scs_c",
            "config": {
                "c_factor": 0.08,
                "minnaert_k": 0.65,
                "cos_i_min": 0.05,
                "mask_self_shadow": True,
                "mask_water": True
            }
        }
        res_corr = self.client.post("/api/v1/analysis/topographic/correction", json=payload)
        self.assertEqual(res_corr.status_code, 200, res_corr.text)
        data_corr = res_corr.json()
        self.assertEqual(data_corr["status"], "completed")
        self.assertEqual(data_corr["scene_id"], "MT_SHASTA_VOLCANO_2026")
        self.assertEqual(data_corr["method"], "scs_c")
        self.assertIn("solar_geometry", data_corr)
        self.assertIn("summary", data_corr)
        self.assertIn("tile_url_template", data_corr)
        self.assertIn("illumination_tile_url_template", data_corr)
        self.assertGreater(data_corr["summary"]["radiance_std_reduction_pct"], 0.0)
        self.assertIn("B04", data_corr["summary"]["estimated_c_factors"])

        # Unversioned route alias
        res_alias = self.client.post("/analysis/topographic/correction", json=payload)
        self.assertEqual(res_alias.status_code, 200)

        # 2. Solar Ephemeris Geometry Endpoints (GET and POST)
        res_geom_get = self.client.get("/api/v1/analysis/topographic/solar-geometry?scene_id=MT_SHASTA_VOLCANO_2026")
        self.assertEqual(res_geom_get.status_code, 200)
        geom_data = res_geom_get.json()
        self.assertAlmostEqual(geom_data["solar_zenith_deg"], 34.2, places=1)
        self.assertAlmostEqual(geom_data["solar_azimuth_deg"], 148.5, places=1)
        self.assertAlmostEqual(geom_data["solar_elevation_deg"], 55.8, places=1)

        res_geom_post = self.client.post("/api/v1/analysis/topographic/solar-geometry", json={"scene_id": "SWISS_ALPS_VALAIS_2026"})
        self.assertEqual(res_geom_post.status_code, 200)
        swiss_geom = res_geom_post.json()
        self.assertAlmostEqual(swiss_geom["solar_zenith_deg"], 45.1, places=1)

        # 3. Available Benchmark & Candidate Scenes Endpoint
        res_scenes = self.client.get("/api/v1/analysis/topographic/scenes")
        self.assertEqual(res_scenes.status_code, 200)
        scenes_data = res_scenes.json()
        self.assertEqual(scenes_data["status"], "success")
        self.assertGreaterEqual(scenes_data["total"], 3)
        benchmark_keys = [s.get("benchmark_key") for s in scenes_data["scenes"]]
        self.assertIn("MT_SHASTA_VOLCANO_2026", benchmark_keys)

        # 4. Dynamic XYZ Topographic Tile Streaming Endpoints
        tile_urls = [
            "/api/v1/tiles/topographic/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png?method=scs_c&metric=corrected_reflectance",
            "/api/v1/tiles/topographic/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png?method=c_correction&metric=difference",
            "/api/v1/tiles/topographic/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png?method=minnaert&metric=illumination_condition",
            "/api/v1/tiles/topographic/illumination/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png",
            "/tiles/topographic/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png",
            "/tiles/topographic/illumination/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png"
        ]
        for t_url in tile_urls:
            r = self.client.get(t_url)
            self.assertEqual(r.status_code, 200, f"Failed tile endpoint: {t_url}")
            self.assertEqual(r.headers.get("content-type"), "image/png")
            self.assertTrue(r.content.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t295_trend_analysis_endpoints(self):
        """Task T-295 & T-298: Verify Non-Parametric Trend Inversion, Mann-Kendall test statistics,
        Theil-Sen median slope, and dynamic XYZ trend tile streaming REST endpoints.
        """
        # 1. Models and Capabilities Discovery Endpoint & Aliases
        for url in ["/api/v1/analysis/trend/models", "/api/v1/trend/models"]:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("models", data)
            self.assertIn("theil_sen_median", data["models"])
            self.assertIn("mann_kendall_rank", data["models"])
            self.assertIn("yue_pilon_prewhitened", data["models"])
            self.assertIn("benchmark_scenes", data)
            self.assertIn("supported_indices", data)
            self.assertIn("supported_metrics", data)

        # 2. Trend Analysis Pipeline POST Endpoint & Aliases
        payload = {
            "aoi_name": "San Luis Reservoir Drought Decade",
            "model": "theil_sen_median",
            "target_index": "ndvi",
            "confidence_level": 0.95
        }
        for url in ["/api/v1/analysis/trend/analyze", "/api/v1/trend/analyze"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["model"], "theil_sen_median")
            self.assertEqual(data["target_index"], "ndvi")
            self.assertIn("theil_sen", data)
            self.assertIn("slope_per_year", data["theil_sen"])
            self.assertIn("mann_kendall", data)
            self.assertIn("z_score", data["mann_kendall"])
            self.assertIn("p_value", data["mann_kendall"])
            self.assertIn("yue_pilon", data)
            self.assertIn("summary", data)
            self.assertIn("significance_class", data["summary"])
            self.assertIn("trajectory_points", data)
            self.assertGreaterEqual(len(data["trajectory_points"]), 3)
            self.assertIn("tile_url_template", data)

        # 3. Trend Quality Evaluation Endpoint & Aliases
        for url in ["/api/v1/analysis/trend/evaluate", "/api/v1/trend/evaluate"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("theil_sen_slope", data)
            self.assertIn("mann_kendall_zscore", data)
            self.assertIn("p_value", data)
            self.assertIn("significance_class", data)
            self.assertIn("confidence_rating", data)
            self.assertIn("annual_change_percent", data)

        # 4. Dynamic XYZ Trend Tile Streaming Endpoints
        tile_urls = [
            "/api/v1/tiles/trend/theil_sen_median/theil_sen_slope/10/163/395.png",
            "/api/v1/tiles/trend/mann_kendall_rank/mann_kendall_zscore/10/163/395.png",
            "/api/v1/tiles/trend/theil_sen_median/trend_significance/10/163/395.png",
            "/api/v1/tiles/trend/yue_pilon_prewhitened/prewhitened_slope/10/163/395.png",
            "/api/v1/tiles/trend/theil_sen_median/p_value/10/163/395.png",
            "/api/v1/tiles/trend/theil_sen_median/trajectory_variance/10/163/395.png",
            "/api/v1/tiles/trend/10/163/395.png?model=theil_sen_median&metric=theil_sen_slope",
            "/tiles/trend/theil_sen_median/theil_sen_slope/10/163/395.png",
            "/tiles/trend/10/163/395.png?model=theil_sen_median&metric=theil_sen_slope"
        ]
        for t_url in tile_urls:
            r = self.client.get(t_url)
            self.assertEqual(r.status_code, 200, f"Failed tile endpoint: {t_url}")
            self.assertEqual(r.headers.get("content-type"), "image/png")
            self.assertTrue(r.content.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t301_multimodal_feature_tracking_api(self):
        """Task T-301 / T-304: Verify Multimodal Feature Tracking REST endpoints and dynamic XYZ tiles."""
        # 1. Models discovery endpoint & aliases
        for url in ["/api/v1/analysis/multimodal/models", "/api/v1/multimodal/models"]:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("models", data)
            self.assertIn("sensor_pairs", data)
            self.assertIn("supported_metrics", data)
            self.assertIn("benchmark_scenes", data)
            self.assertIn("JAKOBSHAVN_ISBRAE_GLACIER_SURGE_2026", data["benchmark_scenes"])

        # 2. Multimodal Tracking POST endpoint & aliases
        payload = {
            "aoi_name": "Jakobshavn Isbræ Terminus Flow",
            "alignment_model": "ncc_frequency_domain",
            "sensor_pair": "s1_rtc_s2_l2a"
        }
        for url in ["/api/v1/analysis/multimodal/track", "/api/v1/multimodal/track"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["alignment_model"], "ncc_frequency_domain")
            self.assertIn("vector_field", data)
            self.assertIn("vectors", data["vector_field"])
            self.assertGreaterEqual(len(data["vector_field"]["vectors"]), 3)
            self.assertIn("quality_summary", data)
            self.assertIn("tile_url_template", data)

        # 3. Multimodal Quality Evaluation POST endpoint & aliases
        for url in ["/api/v1/analysis/multimodal/evaluate", "/api/v1/multimodal/evaluate"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("confidence_rating", data)
            self.assertIn("mean_peak_correlation", data)
            self.assertIn("mean_snr", data)
            self.assertIn("dominant_hazard_tier", data)

        # 4. Dynamic XYZ Multimodal Tile Streaming
        tile_urls = [
            "/api/v1/tiles/multimodal/ncc_frequency_domain/velocity_magnitude/10/163/395.png",
            "/api/v1/tiles/multimodal/ncc_frequency_domain/vector_azimuth/10/163/395.png",
            "/api/v1/tiles/multimodal/ncc_frequency_domain/correlation_snr/10/163/395.png",
            "/api/v1/tiles/multimodal/10/163/395.png?model=ncc_frequency_domain&metric=velocity_magnitude",
            "/tiles/multimodal/ncc_frequency_domain/velocity_magnitude/10/163/395.png"
        ]
        for t_url in tile_urls:
            r = self.client.get(t_url)
            self.assertEqual(r.status_code, 200, f"Failed tile endpoint: {t_url}")
            self.assertEqual(r.headers.get("content-type"), "image/png")
            self.assertTrue(r.content.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t307_insar_sbas_api(self):
        """Task T-307 / T-310: Verify InSAR SBAS Time-Series Inversion REST endpoints and dynamic XYZ tiles."""
        # 1. Models discovery endpoint & aliases
        for url in ["/api/v1/analysis/insar-sbas/models", "/api/v1/insar-sbas/models"]:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("models", data)
            self.assertIn("metrics", data)
            self.assertIn("benchmark_scenes", data)
            self.assertIn("CENTRAL_VALLEY_TULARE_AQUIFER_SUBSIDENCE_2026", data["benchmark_scenes"])

        # 2. InSAR SBAS Inversion POST endpoint & aliases
        payload = {
            "aoi_name": "Central Valley Tulare Basin Subsidence",
            "inversion_model": "svd_least_norm"
        }
        for url in ["/api/v1/analysis/insar-sbas/invert", "/api/v1/insar-sbas/invert"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["inversion_model"], "svd_least_norm")
            self.assertIn("quality_summary", data)
            self.assertIn("psc_points", data)
            self.assertGreaterEqual(len(data["psc_points"]), 3)
            self.assertIn("baseline_graph", data)
            self.assertIn("tile_url_template", data)

        # 3. InSAR SBAS Quality Evaluation POST endpoint & aliases
        for url in ["/api/v1/analysis/insar-sbas/evaluate", "/api/v1/insar-sbas/evaluate"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("stability_rating", data)
            self.assertIn("mean_velocity_rmse_mm_yr", data)
            self.assertIn("dominant_hazard_tier", data)
            self.assertIn("mean_temporal_coherence", data)

        # 4. Dynamic XYZ InSAR SBAS Tile Streaming
        tile_urls = [
            "/api/v1/tiles/insar-sbas/svd_least_norm/mean_velocity_mm_yr/10/163/395.png",
            "/api/v1/tiles/insar-sbas/svd_least_norm/cumulative_displacement_mm/10/163/395.png",
            "/api/v1/tiles/insar-sbas/svd_least_norm/temporal_coherence/10/163/395.png",
            "/api/v1/tiles/insar-sbas/10/163/395.png?model=svd_least_norm&metric=mean_velocity_mm_yr",
            "/tiles/insar-sbas/svd_least_norm/mean_velocity_mm_yr/10/163/395.png"
        ]
        for t_url in tile_urls:
            r = self.client.get(t_url)
            self.assertEqual(r.status_code, 200, f"Failed tile endpoint: {t_url}")
            self.assertEqual(r.headers.get("content-type"), "image/png")
            self.assertTrue(r.content.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t313_spectral_unmixing_api(self):
        """Task T-313 / T-316: Verify Linear Spectral Mixture Analysis (LSMA) & FCLS REST API endpoints and dynamic XYZ tiles."""
        # 1. Models discovery endpoint & aliases
        for url in ["/api/v1/analysis/unmixing/models", "/api/v1/unmixing/models"]:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("models", data)
            self.assertIn("metrics", data)
            self.assertIn("benchmark_scenes", data)
            self.assertIn("endmembers", data)
            self.assertIn("dominance_classes", data)
            self.assertIn("MORENCI_MINE_TAILINGS_ARIZONA_2026", data["benchmark_scenes"])

        # 2. Spectral Unmixing POST endpoint & aliases
        payload = {
            "aoi_name": "Morenci Copper Mine Tailings Impoundment, Arizona",
            "unmixing_model": "fcls_constrained"
        }
        for url in ["/api/v1/analysis/unmixing/unmix", "/api/v1/unmixing/unmix"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertEqual(data["status"], "success")
            self.assertEqual(data["unmixing_model"], "fcls_constrained")
            self.assertIn("quality_summary", data)
            self.assertIn("abundance_points", data)
            self.assertEqual(len(data["abundance_points"]), 16)
            self.assertIn("tile_url_template", data)

            # Validate point properties
            pt0 = data["abundance_points"][0]
            self.assertIn("fraction_gv", pt0)
            self.assertIn("fraction_soil", pt0)
            self.assertIn("sum_abundances", pt0)
            self.assertAlmostEqual(pt0["sum_abundances"], 1.0, places=3)
            self.assertIn("rmse", pt0)
            self.assertIn("fvc", pt0)
            self.assertIn("stri", pt0)

        # 3. Spectral Unmixing Quality Evaluation POST endpoint & aliases
        for url in ["/api/v1/analysis/unmixing/evaluate", "/api/v1/unmixing/evaluate"]:
            res = self.client.post(url, json=payload)
            self.assertEqual(res.status_code, 200, f"Failed URL: {url}")
            data = res.json()
            self.assertIn("quality_tier", data)
            self.assertIn("mean_rmse", data)
            self.assertIn("dominant_class", data)
            self.assertIn("quality_checklist", data)
            self.assertTrue(data["quality_checklist"].get("abundance_non_negativity_passed", False))
            self.assertTrue(data["quality_checklist"].get("abundance_sum_to_one_passed", False))

        # 4. Dynamic XYZ Spectral Unmixing Tile Streaming
        tile_urls = [
            "/api/v1/tiles/unmixing/fcls_constrained/fraction_gv/12/650/1580.png",
            "/api/v1/tiles/unmixing/fcls_constrained/fraction_soil/12/650/1580.png",
            "/api/v1/tiles/unmixing/fcls_constrained/fractional_veg_cover/12/650/1580.png",
            "/api/v1/tiles/unmixing/fcls_constrained/unmixing_rmse/12/650/1580.png",
            "/api/v1/tiles/unmixing/fcls_constrained/abundance_rgb_composite/12/650/1580.png",
            "/api/v1/tiles/unmixing/12/650/1580.png?model=fcls_constrained&metric=fraction_gv",
            "/tiles/unmixing/fcls_constrained/fraction_gv/12/650/1580.png"
        ]
        for t_url in tile_urls:
            r = self.client.get(t_url)
            self.assertEqual(r.status_code, 200, f"Failed tile endpoint: {t_url}")
            self.assertEqual(r.headers.get("content-type"), "image/png")
            self.assertTrue(r.content.startswith(b"\x89PNG\r\n\x1a\n"))


if __name__ == "__main__":
    unittest.main()










