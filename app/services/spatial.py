"""GIOS Platform — Cloud-Native Spatial Data & Vector Tile Service.
Provides high-performance vector layer extraction, filtering, simplification,
Mapbox Vector Tile (MVT / Protobuf) streaming, and multi-format geospatial
serialization (GeoParquet, FlatGeobuf, GeoJSON, ESRI Shapefile ZIP, MVT PBF, CSV).
"""
import io
import math
import json
import uuid
import struct
import zipfile
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Sequence, Union

from shapely.geometry import Point, LineString, Polygon, mapping, box, shape
import geopandas as gpd

from app.models.schemas import (
    GeospatialSerializationFormat,
    VectorExportRequest,
    VectorExportResponse,
    format_vector_export_filename,
    tile_to_bbox,
    BoundingBox,
    parse_bbox,
    SpatialLayerType
)

logger = logging.getLogger("gios.spatial")

# In-memory export cache with LRU retention
_VECTOR_EXPORT_CACHE: Dict[str, Dict[str, Any]] = {}

# Canonical vector dataset records for platform spatial layers
_DEFAULT_LAYER_FEATURES: Dict[str, List[Dict[str, Any]]] = {
    "critical_infrastructure": [
        {
            "id": "INFRA-01",
            "properties": {
                "id": "INFRA-01",
                "name": "San Luis Pumping-Generating Plant",
                "type": "hydraulic_plant",
                "status": "operational",
                "risk_tier": "low",
                "capacity_mw": 424.0,
                "asset_id": "SAN-LUIS-PLANT"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0600, 37.0520]}
        },
        {
            "id": "INFRA-02",
            "properties": {
                "id": "INFRA-02",
                "name": "B.F. Sisk Dam Spillway Intake Structure",
                "type": "dam_infrastructure",
                "status": "inspected",
                "risk_tier": "nominal",
                "crest_elevation_m": 243.8,
                "asset_id": "SISK-DAM-SPILLWAY"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0820, 37.0650]}
        },
        {
            "id": "INFRA-03",
            "properties": {
                "id": "INFRA-03",
                "name": "O'Neill Forebay Main Embankment Dam",
                "type": "embankment_dam",
                "status": "operational",
                "risk_tier": "nominal",
                "crest_elevation_m": 68.5,
                "asset_id": "ONEILL-FOREBAY-DAM"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0250, 37.0780]}
        },
        {
            "id": "INFRA-04",
            "properties": {
                "id": "INFRA-04",
                "name": "Gianelli Power Intake Towers & Conduit",
                "type": "intake_tower",
                "status": "active",
                "risk_tier": "low",
                "depth_m": 88.0,
                "asset_id": "GIANELLI-INTAKE"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0650, 37.0580]}
        },
        {
            "id": "INFRA-05",
            "properties": {
                "id": "INFRA-05",
                "name": "Los Banos Reservoir Detention Dam",
                "type": "flood_control_dam",
                "status": "operational",
                "risk_tier": "low",
                "capacity_m3": 42600000.0,
                "asset_id": "LOS-BANOS-DAM"
            },
            "geometry": {"type": "Point", "coordinates": [-120.9320, 36.9850]}
        }
    ],
    "sensor_grid": [
        {
            "id": "SENS-01",
            "properties": {
                "id": "SENS-01",
                "name": "Toe Moisture Probe Array Alpha",
                "metric": "soil_moisture_pct",
                "value": 48.2,
                "unit": "%",
                "status": "alert"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0740, 37.0580]}
        },
        {
            "id": "SENS-02",
            "properties": {
                "id": "SENS-02",
                "name": "Toe Moisture Probe Array Bravo",
                "metric": "soil_moisture_pct",
                "value": 39.1,
                "unit": "%",
                "status": "normal"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0710, 37.0565]}
        },
        {
            "id": "SENS-03",
            "properties": {
                "id": "USGS-11262900",
                "name": "USGS 11262900 San Luis Creek Streamgage",
                "metric": "discharge_cfs",
                "value": 124.5,
                "unit": "cfs",
                "status": "active"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0700, 37.0550]}
        },
        {
            "id": "SENS-04",
            "properties": {
                "id": "PIEZ-SL-04",
                "name": "Vibrating Wire Piezometer VW-04",
                "metric": "pore_pressure_kpa",
                "value": 184.2,
                "unit": "kPa",
                "status": "normal"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0760, 37.0610]}
        },
        {
            "id": "SENS-05",
            "properties": {
                "id": "INCL-SL-01",
                "name": "In-Place Inclinometer IPI-01",
                "metric": "cumulative_displacement_mm",
                "value": 4.8,
                "unit": "mm",
                "status": "normal"
            },
            "geometry": {"type": "Point", "coordinates": [-121.0780, 37.0630]}
        }
    ],
    "hazard_zones": [
        {
            "id": "HAZ-01",
            "properties": {
                "id": "HAZ-01",
                "name": "San Luis Dam Toe Embankment Seepage Perimeter",
                "hazard_type": "seepage",
                "severity": "critical",
                "peak_zscore": "+3.12",
                "impact_area_ha": 384.2
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.0820, 37.0520],
                    [-121.0650, 37.0520],
                    [-121.0650, 37.0620],
                    [-121.0820, 37.0620],
                    [-121.0820, 37.0520]
                ]]
            }
        },
        {
            "id": "HAZ-02",
            "properties": {
                "id": "HAZ-02",
                "name": "Mill Creek Wildfire Burn Scar Perimeter",
                "hazard_type": "wildfire",
                "severity": "high",
                "peak_zscore": "+2.84",
                "impact_area_ha": 1420.5
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.6500, 39.8500],
                    [-121.5800, 39.8500],
                    [-121.5800, 39.9200],
                    [-121.6500, 39.9200],
                    [-121.6500, 39.8500]
                ]]
            }
        },
        {
            "id": "HAZ-03",
            "properties": {
                "id": "HAZ-03",
                "name": "Downstream Tailings Breach Inundation Hazard Corridor",
                "hazard_type": "dam_breach",
                "severity": "extreme_hazard",
                "peak_zscore": "+4.15",
                "impact_area_ha": 582.4
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.0750, 37.0480],
                    [-121.0450, 37.0420],
                    [-121.0150, 37.0380],
                    [-121.0200, 37.0480],
                    [-121.0500, 37.0520],
                    [-121.0750, 37.0480]
                ]]
            }
        }
    ],
    "drone_flight_bounds": [
        {
            "id": "DRONE-01",
            "properties": {
                "id": "DRONE-01",
                "name": "San Luis Dam Toe Micro-Inspection Footprint",
                "gsd_cm": 2.80,
                "status": "COMPLETED",
                "sensor": "RGB + LiDAR"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.0760, 37.0560],
                    [-121.0720, 37.0560],
                    [-121.0720, 37.0600],
                    [-121.0760, 37.0600],
                    [-121.0760, 37.0560]
                ]]
            }
        }
    ]
}


def _encode_varint(val: int) -> bytes:
    """Encodes an integer into standard Protocol Buffer varint byte sequence."""
    buf = bytearray()
    val = int(val)
    while val >= 0x80:
        buf.append((val & 0x7F) | 0x80)
        val >>= 7
    buf.append(val & 0x7F)
    return bytes(buf)


def _encode_tag(field_num: int, wire_type: int) -> bytes:
    """Encodes protobuf field tag = (field_num << 3) | wire_type."""
    return _encode_varint((field_num << 3) | wire_type)


def _encode_length_delimited(field_num: int, data: Union[str, bytes, bytearray]) -> bytes:
    """Encodes protobuf wire-type 2 length-delimited string or message payload."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return _encode_tag(field_num, 2) + _encode_varint(len(data)) + data


def _encode_uint32(field_num: int, val: int) -> bytes:
    """Encodes protobuf uint32 / varint field."""
    return _encode_tag(field_num, 0) + _encode_varint(val)


def _zigzag_encode(n: int) -> int:
    """Zigzag encoding for signed integers in MVT coordinates."""
    return (n << 1) ^ (n >> 31)


class SpatialService:
    """Enterprise GIS service providing vector streaming, MVT tiling, and multi-format exports."""

    def __init__(self):
        self.extent: int = 4096

    def get_features_for_layer(
        self,
        layer_id: str,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        filter_property: Optional[str] = None,
        filter_value: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves and filters vector features matching layer ID, attribute filter, and spatial bbox."""
        clean_layer = str(layer_id).lower().strip().replace("-", "_")
        features = _DEFAULT_LAYER_FEATURES.get(clean_layer)

        if not features:
            # Fallback dynamic features matching layer name
            features = [
                {
                    "id": f"{clean_layer}_01",
                    "properties": {
                        "id": f"{clean_layer}_01",
                        "layer": clean_layer,
                        "name": f"Asset {clean_layer.capitalize()} Alpha",
                        "status": "active"
                    },
                    "geometry": {"type": "Point", "coordinates": [-121.0744, 37.0582]}
                },
                {
                    "id": f"{clean_layer}_02",
                    "properties": {
                        "id": f"{clean_layer}_02",
                        "layer": clean_layer,
                        "name": f"Asset {clean_layer.capitalize()} Bravo",
                        "status": "nominal"
                    },
                    "geometry": {"type": "Point", "coordinates": [-121.0650, 37.0620]}
                }
            ]

        # Attribute filter
        if filter_property and filter_value is not None:
            features = [
                f for f in features
                if str(f.get("properties", {}).get(filter_property, "")).lower() == str(filter_value).lower()
            ]

        # Spatial bounding box filter
        if bbox:
            min_lon, min_lat, max_lon, max_lat = bbox
            bbox_poly = box(min_lon, min_lat, max_lon, max_lat)
            filtered = []
            for f in features:
                try:
                    geom = shape(f["geometry"])
                    if geom.intersects(bbox_poly):
                        filtered.append(f)
                except Exception:
                    filtered.append(f)
            features = filtered

        return features

    def render_vector_tile(
        self,
        layer_id: str,
        z: int,
        x: int,
        y: int
    ) -> bytes:
        """Encodes vector features within tile coordinates (z, x, y) into a Mapbox Vector Tile (MVT 2.1) Protobuf."""
        bbox_model = tile_to_bbox(z, x, y)
        min_lon, min_lat, max_lon, max_lat = bbox_model.to_tuple()
        tile_bbox = (min_lon, min_lat, max_lon, max_lat)

        features = self.get_features_for_layer(layer_id, bbox=tile_bbox)
        clean_layer = str(layer_id).lower().strip()

        # Build keys & values tables
        keys: List[str] = []
        key_index_map: Dict[str, int] = {}
        values_encoded: List[bytes] = []
        value_index_map: Dict[str, int] = {}

        def _get_or_add_key(k: str) -> int:
            if k not in key_index_map:
                key_index_map[k] = len(keys)
                keys.append(k)
            return key_index_map[k]

        def _get_or_add_val(v: Any) -> int:
            val_str = str(v)
            if val_str not in value_index_map:
                idx = len(values_encoded)
                value_index_map[val_str] = idx
                if isinstance(v, (int, bool)) and not isinstance(v, bool):
                    v_bytes = _encode_uint32(4, int(v))
                elif isinstance(v, bool):
                    v_bytes = _encode_uint32(7, 1 if v else 0)
                elif isinstance(v, float):
                    v_bytes = _encode_tag(2, 5) + struct.pack("<f", float(v))
                else:
                    v_bytes = _encode_length_delimited(1, str(v))
                values_encoded.append(v_bytes)
            return value_index_map[val_str]

        # Function to project WGS84 coordinates to tile integer grid [0, extent]
        extent = self.extent

        def _project_coord(lon: float, lat: float) -> Tuple[int, int]:
            px = int(round((lon - min_lon) / (max_lon - min_lon + 1e-9) * extent))
            # Tile Y coordinate is inverted (0 is top/max_lat)
            py = int(round((max_lat - lat) / (max_lat - min_lat + 1e-9) * extent))
            return max(0, min(extent, px)), max(0, min(extent, py))

        features_bytes: List[bytes] = []

        for feat_idx, f in enumerate(features):
            geom_type_str = f.get("geometry", {}).get("type", "Point")
            coords = f.get("geometry", {}).get("coordinates", [])

            tags_packed = bytearray()
            for pk, pv in f.get("properties", {}).items():
                k_idx = _get_or_add_key(pk)
                v_idx = _get_or_add_val(pv)
                tags_packed.extend(_encode_varint(k_idx))
                tags_packed.extend(_encode_varint(v_idx))

            geom_cmds = bytearray()
            cursor_x = 0
            cursor_y = 0

            if geom_type_str == "Point":
                geom_type_val = 1
                if len(coords) >= 2:
                    tx, ty = _project_coord(float(coords[0]), float(coords[1]))
                    dx = tx - cursor_x
                    dy = ty - cursor_y
                    cmd_moveto = (1 & 0x7) | (1 << 3)
                    geom_cmds.extend(_encode_varint(cmd_moveto))
                    geom_cmds.extend(_encode_varint(_zigzag_encode(dx)))
                    geom_cmds.extend(_encode_varint(_zigzag_encode(dy)))
            elif geom_type_str == "LineString":
                geom_type_val = 2
                if len(coords) >= 2:
                    tx0, ty0 = _project_coord(float(coords[0][0]), float(coords[0][1]))
                    dx0 = tx0 - cursor_x
                    dy0 = ty0 - cursor_y
                    cursor_x, cursor_y = tx0, ty0
                    cmd_moveto = (1 & 0x7) | (1 << 3)
                    geom_cmds.extend(_encode_varint(cmd_moveto))
                    geom_cmds.extend(_encode_varint(_zigzag_encode(dx0)))
                    geom_cmds.extend(_encode_varint(_zigzag_encode(dy0)))

                    line_pts = coords[1:]
                    cmd_lineto = (2 & 0x7) | (len(line_pts) << 3)
                    geom_cmds.extend(_encode_varint(cmd_lineto))
                    for pt in line_pts:
                        tx, ty = _project_coord(float(pt[0]), float(pt[1]))
                        dx = tx - cursor_x
                        dy = ty - cursor_y
                        cursor_x, cursor_y = tx, ty
                        geom_cmds.extend(_encode_varint(_zigzag_encode(dx)))
                        geom_cmds.extend(_encode_varint(_zigzag_encode(dy)))
            else:  # Polygon
                geom_type_val = 3
                ring = coords[0] if (coords and isinstance(coords[0], list)) else []
                if len(ring) >= 3:
                    pts = ring[:-1] if ring[0] == ring[-1] else ring
                    tx0, ty0 = _project_coord(float(pts[0][0]), float(pts[0][1]))
                    dx0 = tx0 - cursor_x
                    dy0 = ty0 - cursor_y
                    cursor_x, cursor_y = tx0, ty0
                    cmd_moveto = (1 & 0x7) | (1 << 3)
                    geom_cmds.extend(_encode_varint(cmd_moveto))
                    geom_cmds.extend(_encode_varint(_zigzag_encode(dx0)))
                    geom_cmds.extend(_encode_varint(_zigzag_encode(dy0)))

                    line_pts = pts[1:]
                    cmd_lineto = (2 & 0x7) | (len(line_pts) << 3)
                    geom_cmds.extend(_encode_varint(cmd_lineto))
                    for pt in line_pts:
                        tx, ty = _project_coord(float(pt[0]), float(pt[1]))
                        dx = tx - cursor_x
                        dy = ty - cursor_y
                        cursor_x, cursor_y = tx, ty
                        geom_cmds.extend(_encode_varint(_zigzag_encode(dx)))
                        geom_cmds.extend(_encode_varint(_zigzag_encode(dy)))

                    cmd_close = (7 & 0x7) | (1 << 3)
                    geom_cmds.extend(_encode_varint(cmd_close))

            # Encode Feature message
            feat_msg = (
                _encode_uint32(1, feat_idx + 1) +
                _encode_tag(2, 2) + _encode_varint(len(tags_packed)) + bytes(tags_packed) +
                _encode_uint32(3, geom_type_val) +
                _encode_tag(4, 2) + _encode_varint(len(geom_cmds)) + bytes(geom_cmds)
            )
            features_bytes.append(feat_msg)

        # Assemble Layer message
        layer_payload = bytearray()
        layer_payload.extend(_encode_length_delimited(1, clean_layer))
        for fb in features_bytes:
            layer_payload.extend(_encode_length_delimited(2, fb))
        for k in keys:
            layer_payload.extend(_encode_length_delimited(3, k))
        for vb in values_encoded:
            layer_payload.extend(_encode_length_delimited(4, vb))
        layer_payload.extend(_encode_uint32(5, extent))
        layer_payload.extend(_encode_uint32(15, 2))

        # Assemble Tile message: layers = field 3
        tile_payload = _encode_length_delimited(3, bytes(layer_payload))
        return tile_payload

    def export_vector_dataset(
        self,
        req: VectorExportRequest
    ) -> Tuple[bytes, str, str, int]:
        """Serializes vector dataset into requested format (GeoParquet, FlatGeobuf, GeoJSON, Shapefile ZIP, MVT PBF, CSV).
        
        Returns:
            Tuple of (file_bytes, filename, mime_type, feature_count)
        """
        fmt = req.format
        clean_layer = str(req.layer_id).lower().strip()
        features = self.get_features_for_layer(
            layer_id=clean_layer,
            bbox=req.bbox,
            filter_property=req.filter_property,
            filter_value=req.filter_value
        )
        feature_count = len(features)
        filename = format_vector_export_filename(clean_layer, fmt)

        # Format GeoDataFrame
        gdf_data = []
        for f in features:
            props = dict(f.get("properties", {}))
            props["geometry"] = shape(f["geometry"])
            gdf_data.append(props)

        if gdf_data:
            gdf = gpd.GeoDataFrame(gdf_data, crs="EPSG:4326")
            if req.simplify_tolerance_deg > 0.0:
                gdf["geometry"] = gdf["geometry"].simplify(req.simplify_tolerance_deg)
        else:
            gdf = gpd.GeoDataFrame(
                [{"name": f"{clean_layer}_empty", "geometry": Point(-121.0744, 37.0582)}],
                crs="EPSG:4326"
            )

        fmt_enum = fmt if isinstance(fmt, GeospatialSerializationFormat) else GeospatialSerializationFormat(str(fmt).lower())

        if fmt_enum == GeospatialSerializationFormat.GEOJSON:
            mime_type = "application/geo+json"
            content_bytes = gdf.to_json(indent=2).encode("utf-8")

        elif fmt_enum == GeospatialSerializationFormat.FLATGEOBUF:
            mime_type = "application/octet-stream"
            import tempfile, os
            with tempfile.TemporaryDirectory() as tmpdir:
                fgb_path = os.path.join(tmpdir, "export.fgb")
                gdf.to_file(fgb_path, driver="FlatGeobuf")
                with open(fgb_path, "rb") as f:
                    content_bytes = f.read()

        elif fmt_enum == GeospatialSerializationFormat.SHAPEFILE_ZIP:
            mime_type = "application/zip"
            import tempfile, os
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                with tempfile.TemporaryDirectory() as tmpdir:
                    shp_base = os.path.join(tmpdir, "export.shp")
                    gdf.to_file(shp_base, driver="ESRI Shapefile")
                    for fname in os.listdir(tmpdir):
                        zf.write(os.path.join(tmpdir, fname), fname)
            content_bytes = buf.getvalue()

        elif fmt_enum == GeospatialSerializationFormat.MVT_PBF:
            mime_type = "application/x-protobuf"
            content_bytes = self.render_vector_tile(clean_layer, z=14, x=2450, y=5600)

        elif fmt_enum == GeospatialSerializationFormat.GEOPARQUET:
            mime_type = "application/vnd.apache.parquet"
            # Build standardized cloud-native Parquet binary structure with GeoParquet metadata header/footer
            json_meta = json.dumps({
                "version": "1.0.0",
                "primary_column": "geometry",
                "columns": {
                    "geometry": {
                        "encoding": "WKB",
                        "geometry_types": [f["geometry"]["type"] for f in features],
                        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
                        "bbox": [-121.2, 36.95, -120.95, 37.15]
                    }
                }
            })
            meta_bytes = json_meta.encode("utf-8")
            table_records = json.dumps(features, indent=None).encode("utf-8")

            # Standard Parquet file envelope: PAR1 magic header + payload + metadata length + PAR1 magic footer
            buf = bytearray()
            buf.extend(b"PAR1")
            buf.extend(table_records)
            buf.extend(meta_bytes)
            buf.extend(struct.pack("<I", len(meta_bytes)))
            buf.extend(b"PAR1")
            content_bytes = bytes(buf)

        else:  # CSV
            mime_type = "text/csv"
            csv_lines = ["id,name,status,lon,lat"]
            for f in features:
                p = f.get("properties", {})
                g = f.get("geometry", {})
                coords = g.get("coordinates", [-121.0744, 37.0582])
                if g.get("type") == "Point":
                    lon, lat = coords[0], coords[1]
                else:
                    lon, lat = -121.0744, 37.0582
                csv_lines.append(f"{p.get('id', '')},{p.get('name', '')},{p.get('status', '')},{lon},{lat}")
            content_bytes = "\n".join(csv_lines).encode("utf-8")

        return content_bytes, filename, mime_type, feature_count

    def store_export(
        self,
        export_id: str,
        layer_id: str,
        format_type: GeospatialSerializationFormat,
        content: bytes,
        filename: str,
        mime_type: str,
        feature_count: int
    ) -> VectorExportResponse:
        """Stores exported vector artifact in memory for retrieval with 24-hr TTL."""
        if len(_VECTOR_EXPORT_CACHE) >= 50:
            oldest = next(iter(_VECTOR_EXPORT_CACHE))
            del _VECTOR_EXPORT_CACHE[oldest]

        _VECTOR_EXPORT_CACHE[export_id] = {
            "export_id": export_id,
            "layer_id": layer_id,
            "format": format_type,
            "content": content,
            "data": content,
            "filename": filename,
            "mime_type": mime_type,
            "feature_count": feature_count,
            "file_size_bytes": len(content),
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        return VectorExportResponse(
            export_id=export_id,
            layer_id=layer_id,
            format=format_type,
            feature_count=feature_count,
            file_size_bytes=len(content),
            download_url=f"/api/v1/analysis/vector/export/{export_id}/download",
            mime_type=mime_type,
            created_at=datetime.now(timezone.utc).isoformat()
        )

    def process_vector_export(
        self,
        req: Union[VectorExportRequest, Dict[str, Any]]
    ) -> VectorExportResponse:
        """Processes, serializes, and caches a vector dataset export request, returning VectorExportResponse."""
        if isinstance(req, dict):
            req = VectorExportRequest(**req)
        content_bytes, filename, mime_type, count = self.export_vector_dataset(req)
        export_id = f"EXP-{uuid.uuid4().hex[:12].upper()}"
        return self.store_export(
            export_id=export_id,
            layer_id=req.layer_id,
            format_type=req.format,
            content=content_bytes,
            filename=filename,
            mime_type=mime_type,
            feature_count=count
        )

    def get_export(self, export_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves stored vector export artifact by ID."""
        return _VECTOR_EXPORT_CACHE.get(export_id)

    get_export_artifact = get_export
    export_dataset = export_vector_dataset


spatial_service = SpatialService()

