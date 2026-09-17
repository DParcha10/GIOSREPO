"""Time-series analysis, non-parametric Theil-Sen trend fitting, and seasonal climatological MAD anomaly detection."""
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
import numpy as np
from scipy import stats

class TimeSeriesService:
    @staticmethod
    def _extract_month(date_str: str) -> int:
        """Extracts month integer (1-12) from ISO date strings."""
        try:
            match = re.search(r"\d{4}-(\d{2})-\d{2}", date_str)
            if match:
                return int(match.group(1))
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return dt.month
        except Exception:
            return 1

    @classmethod
    def compute_trend(
        cls,
        values: List[float],
        dates: List[str],
        anomaly_threshold: float = 2.0
    ) -> Dict[str, Any]:
        """Calculates non-parametric Theil-Sen slope per month and flags anomalies
        using monthly climatological Median Absolute Deviation (MAD):
        
        z_seasonal(t) = (x_t - Median(X_month(t))) / (1.4826 * MAD(X_month(t)) + 1e-6)
        
        Eliminates false winter anomaly alarms in seasonal climates.
        """
        clean_pairs = [(d, v) for d, v in zip(dates, values) if v is not None and not np.isnan(v)]
        if len(clean_pairs) < 2:
            return {
                "slope_per_month": 0.0,
                "theil_sen_slope": 0.0,
                "kendall_tau": 0.0,
                "trend_p_value": 1.0,
                "anomaly_count": 0,
                "points": []
            }

        clean_dates = [p[0] for p in clean_pairs]
        clean_values = [float(p[1]) for p in clean_pairs]
        arr = np.array(clean_values, dtype=float)

        # 1. Monthly Climatological Grouping
        monthly_buckets: Dict[int, List[float]] = {}
        for d, v in zip(clean_dates, clean_values):
            m = cls._extract_month(d)
            monthly_buckets.setdefault(m, []).append(v)

        # Global fallback MAD in case of low sample sizes in a single month
        global_med = float(np.median(arr))
        global_mad = float(np.median(np.abs(arr - global_med)))
        min_scale = max(global_mad, 0.015)

        # Calculate monthly median and MAD
        climatology: Dict[int, tuple] = {}
        for m, vals in monthly_buckets.items():
            m_arr = np.array(vals)
            m_med = float(np.median(m_arr))
            m_mad = float(np.median(np.abs(m_arr - m_med)))
            # If monthly MAD is zero (single point or identical values), use global minimum scale
            scale = max(m_mad, min_scale) * 1.4826 + 1e-6
            climatology[m] = (m_med, scale)

        # 2. Non-parametric Theil-Sen Robust Slope & Kendall Tau
        x_indices = np.arange(len(arr), dtype=float)
        try:
            theil_res = stats.theilslopes(arr, x_indices)
            slope_raw = float(theil_res[0])
        except Exception:
            slope_raw = 0.0

        try:
            tau, p_val = stats.kendalltau(x_indices, arr)
            tau_val = float(tau) if not np.isnan(tau) else 0.0
            p_val_clean = float(p_val) if not np.isnan(p_val) else 1.0
        except Exception:
            tau_val = 0.0
            p_val_clean = 1.0

        # Approximate days between samples to scale slope per month (30 days)
        # Assuming typical satellite revisit or uniform timeline
        slope_per_month = round(slope_raw * 30.0, 4)

        # 3. Calculate seasonal anomalies and build point records
        points = []
        anomaly_count = 0
        for d, v in zip(clean_dates, clean_values):
            m = cls._extract_month(d)
            med, scale = climatology.get(m, (global_med, min_scale * 1.4826 + 1e-6))
            z = (v - med) / scale
            is_anom = bool(abs(z) >= anomaly_threshold)
            if is_anom:
                anomaly_count += 1

            points.append({
                "date": d,
                "value": round(float(v), 3),
                "baseline_median": round(float(med), 3),
                "z_score": round(float(z), 2),
                "is_anomaly": is_anom
            })

        return {
            "slope_per_month": slope_per_month,
            "theil_sen_slope": round(slope_raw, 5),
            "kendall_tau": round(tau_val, 3),
            "trend_p_value": round(p_val_clean, 4),
            "anomaly_count": anomaly_count,
            "points": points
        }

timeseries_service = TimeSeriesService()
