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

    def test_render_flownet_tile_default_and_metrics(self):
        """Task T-178: Verify 2D Laplace seepage flownet XYZ tile rendering across metrics and colormaps."""
        sim_id = "SIM_TEST_TILE_FLOWNET_01"
        t0 = time.time()
        tile_default = tile_service.render_flownet_tile(
            sim_id=sim_id,
            z=12,
            x=2048,
            y=1024
        )
        elapsed_ms = (time.time() - t0) * 1000

        self.assertIsInstance(tile_default, bytes)
        self.assertGreater(len(tile_default), 500)
        self.assertEqual(tile_default[:4], b"\x89PNG")
        img_default = Image.open(io.BytesIO(tile_default))
        self.assertEqual(img_default.size, (256, 256))
        self.assertEqual(img_default.mode, "RGBA")
        self.assertLess(elapsed_ms, 500.0, f"Flownet tile render latency ({elapsed_ms:.1f}ms) exceeded 500ms")

        # Test metrics supported by tile service
        metrics = [
            "hydraulic_head",
            "hydraulic_gradient",
            "exit_gradient",
            "factor_of_safety",
            "stream_function",
            "pore_pressure",
            "hazard_tier"
        ]
        for metric in metrics:
            tile_bytes = tile_service.render_flownet_tile(
                sim_id=sim_id,
                z=12,
                x=2048,
                y=1024,
                metric=metric
            )
            self.assertIsInstance(tile_bytes, bytes, f"Failed metric: {metric}")
            self.assertEqual(tile_bytes[:4], b"\x89PNG", f"Invalid PNG magic for metric: {metric}")
            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256))

    def test_render_custom_expression_tile(self):
        """Task T-211: Verify dynamic XYZ custom band math AST raster tile rendering."""
        t0 = time.time()
        tile_bytes = tile_service.render_custom_expression_tile(
            z=12,
            x=652,
            y=1582,
            expr="(B08 - B04) / (B08 + B04)",
            colormap="rdylgn",
            rescale="-0.2,0.8"
        )
        elapsed_ms = (time.time() - t0) * 1000

        self.assertIsInstance(tile_bytes, bytes)
        self.assertEqual(tile_bytes[:4], b"\x89PNG")
        self.assertLess(elapsed_ms, 500.0, f"Custom tile rendering took {elapsed_ms}ms, exceeding 500ms target")

        img = Image.open(io.BytesIO(tile_bytes))
        self.assertEqual(img.size, (256, 256))
        self.assertEqual(img.mode, "RGBA")


if __name__ == "__main__":
    unittest.main()


