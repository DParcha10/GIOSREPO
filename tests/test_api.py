"""GIOS Platform Automated Test Suite.
Tests all core APIs: Health, Auth, Events, Analysis, Time-Series, Reports, Spatial, IoT.
Also tests the JARVIS AI Agent: identity, memory, map marking, tab routing, web search, data analysis.
"""
import unittest
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

if __name__ == "__main__":
    unittest.main()

