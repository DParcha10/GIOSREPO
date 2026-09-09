"""Time-series analysis and linear trend fitting."""
import numpy as np
from scipy import stats
from typing import List, Dict, Any

class TimeSeriesService:
    @staticmethod
    def compute_trend(values: List[float], dates: List[str]) -> Dict[str, Any]:
        """Calculates linear slope per month and flags anomalies (|z| > 2.0)."""
        clean_values = [v for v in values if v is not None and not np.isnan(v)]
        if len(clean_values) < 2:
            return {"slope_per_month": 0.0, "anomaly_count": 0, "points": []}

        arr = np.array(clean_values)
        mean = np.mean(arr)
        std = np.std(arr) or 1e-6
        z_scores = (arr - mean) / std

        # Linear regression across indices
        x = np.arange(len(arr))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, arr)
        slope_per_month = round(float(slope * 30.0), 4)

        points = []
        anomaly_count = 0
        for d, v, z in zip(dates, clean_values, z_scores):
            is_anom = abs(z) > 2.0
            if is_anom:
                anomaly_count += 1
            points.append({
                "date": d,
                "value": round(float(v), 3),
                "baseline_median": round(float(mean), 3),
                "z_score": round(float(z), 2),
                "is_anomaly": is_anom
            })

        return {
            "slope_per_month": slope_per_month,
            "anomaly_count": anomaly_count,
            "points": points
        }

timeseries_service = TimeSeriesService()
