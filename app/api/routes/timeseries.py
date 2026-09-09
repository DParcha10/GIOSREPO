from fastapi import APIRouter
from app.models.schemas import TrendRequest, TimeSeriesResponse
from app.services.timeseries import timeseries_service
import numpy as np

router = APIRouter(prefix="/timeseries", tags=["Time-Series Trends"])

@router.post("/trend", response_model=TimeSeriesResponse)
def get_temporal_trend(req: TrendRequest):
    dates = [f"2026-08-{i:02d}" for i in range(1, 31)]
    vals = (np.linspace(0.3, 0.7, 30) + np.random.normal(0, 0.05, 30)).tolist()
    res = timeseries_service.compute_trend(vals, dates)
    return {
        "index": req.index.value,
        "slope_per_month": res["slope_per_month"],
        "anomaly_count": res["anomaly_count"],
        "data_points": res["points"]
    }
