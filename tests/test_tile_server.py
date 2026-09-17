"""Tile Server & Dynamic Colormap Unit Tests for GIOS v2.5.

Assigned to: Agent 9 - Scientific QA & Test Engineer (@debugger)
Task: T-18 / T-07 (Dynamic XYZ COG Tile Server & Verification)
"""
import io
import time
import unittest
from PIL import Image
from app.services.tile_service import tile_service

class TestTileServer(unittest.TestCase):
    def test_tile_to_bounds_wgs84(self):
        """Verify Web Mercator tile XYZ to WGS84 bounding box projection."""
        # Tile 0/0/0 should span worldwide (-180, -85.05, 180, 85.05)
        min_lon, min_lat, max_lon, max_lat = tile_service.tile_to_bounds_wgs84(0, 0, 0)
        self.assertAlmostEqual(min_lon, -180.0, places=1)
        self.assertAlmostEqual(max_lon, 180.0, places=1)
        self.assertAlmostEqual(min_lat, -85.051, places=1)
        self.assertAlmostEqual(max_lat, 85.051, places=1)

        # Zoom level 10 tile over Northern California
        z, x, y = 10, 163, 395
        w, s, e, n = tile_service.tile_to_bounds_wgs84(z, x, y)
        self.assertTrue(-124.0 < w < -120.0)
        self.assertTrue(37.0 < s < 41.0)
        self.assertLess(w, e)
        self.assertLess(s, n)

    def test_render_tile_png_format_and_dimensions(self):
        """Verify rendered tile produces valid 256x256 RGBA PNG bytes."""
        t0 = time.time()
        png_bytes = tile_service.render_tile(
            collection="sentinel-2-l2a",
            item_id="test-item-01",
            z=12,
            x=652,
            y=1582,
            index="ndmi",
            colormap="spectral"
        )
        elapsed_ms = (time.time() - t0) * 1000

        self.assertIsInstance(png_bytes, bytes)
        self.assertGreater(len(png_bytes), 1000, "Tile PNG must contain valid binary image data")

        # Decode image and check dimensions
        img = Image.open(io.BytesIO(png_bytes))
        self.assertEqual(img.size, (256, 256))
        self.assertEqual(img.mode, "RGBA")

        # Sub-500ms latency requirement from Implementation Plan Section 1 Tradeoff 2
        self.assertLess(elapsed_ms, 500.0, f"Tile rendering took {elapsed_ms}ms, exceeding 500ms target")

    def test_dynamic_contrast_stretch(self):
        """Verify dynamic rescale parameter alters tile output."""
        tile_default = tile_service.render_tile(
            collection="sentinel-2-l2a",
            item_id="test-item-02",
            z=12,
            x=652,
            y=1582,
            index="ndvi",
            colormap="viridis",
            rescale=None
        )

        tile_stretched = tile_service.render_tile(
            collection="sentinel-2-l2a",
            item_id="test-item-02",
            z=12,
            x=652,
            y=1582,
            index="ndvi",
            colormap="viridis",
            rescale="0.2,0.8"
        )

        self.assertNotEqual(tile_default, tile_stretched, "Stretched tile should have distinct pixel values from default")

    def test_drone_tile_rendering(self):
        """Verify drone collection route properly forwards to drone tile handler."""
        tile_drone = tile_service.render_tile(
            collection="drone",
            item_id="mission_oroville_toe",
            z=18,
            x=41728,
            y=101248
        )
        self.assertIsInstance(tile_drone, bytes)
        img = Image.open(io.BytesIO(tile_drone))
        self.assertEqual(img.size, (256, 256))

if __name__ == "__main__":
    unittest.main()
