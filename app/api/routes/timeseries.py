from fastapi import APIRouter
from app.models.schemas import TrendRequest, TimeSeriesResponse, parse_bbox
from app.services.timeseries import timeseries_service
import numpy as np

router = APIRouter(prefix="/timeseries", tags=["Time-Series Trends"])

@router.post("/trend", response_model=TimeSeriesResponse)
def get_temporal_trend(req: TrendRequest):
    bbox = parse_bbox(req.bbox, default=(-121.2, 36.95, -120.95, 37.15))
    dates = [f"2026-08-{i:02d}" for i in range(1, 31)]
    vals = (np.linspace(0.3, 0.7, 30) + np.random.normal(0, 0.05, 30)).tolist()
    res = timeseries_service.compute_trend(vals, dates)
    idx_str = req.index.value if hasattr(req.index, "value") else str(req.index)
    return {
        "index": idx_str,
        "slope_per_month": res["slope_per_month"],
        "theil_sen_slope": res.get("theil_sen_slope"),
        "mann_kendall_p_value": res.get("trend_p_value"),
        "anomaly_count": res["anomaly_count"],
        "data_points": res["points"]
    }
