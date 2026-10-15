"""Time-series analysis, non-parametric Theil-Sen trend fitting, and seasonal climatological MAD anomaly detection."""
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
import numpy as np
from scipy import stats

from app.models.schemas import classify_z_score

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
        global_p10 = float(np.percentile(arr, 10))
        global_p90 = float(np.percentile(arr, 90))
        min_scale = max(global_mad, 0.015)

        # Calculate monthly median, MAD, and percentile envelopes
        climatology: Dict[int, tuple] = {}
        for m, vals in monthly_buckets.items():
            m_arr = np.array(vals)
            m_med = float(np.median(m_arr))
            m_mad = float(np.median(np.abs(m_arr - m_med)))
            p10 = float(np.percentile(m_arr, 10))
            p90 = float(np.percentile(m_arr, 90))
            # If monthly MAD is zero (single point or identical values), use global minimum scale
            scale = max(m_mad, min_scale) * 1.4826 + 1e-6
            climatology[m] = (m_med, scale, m_mad, p10, p90)

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
            med, scale, mad, p10, p90 = climatology.get(
                m, (global_med, min_scale * 1.4826 + 1e-6, global_mad, global_p10, global_p90)
            )
            z = (v - med) / scale
            is_anom = bool(abs(z) >= anomaly_threshold)
            if is_anom:
                anomaly_count += 1

            points.append({
                "date": d,
                "value": round(float(v), 3),
                "baseline_median": round(float(med), 3),
                "baseline_mad": round(float(mad), 3),
                "percentile_10": round(float(p10), 3),
                "percentile_90": round(float(p90), 3),
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

    @classmethod
    def fit_harmonic_decomposition(
        cls,
        dates: List[str],
        values: List[float],
        num_harmonics: int = 2,
        period_years: float = 1.0
    ) -> Dict[str, Any]:
        """Fits multi-harmonic Fourier regression model to time-series observations."""
        from app.models.schemas import fit_harmonic_fourier_regression, _extract_month_and_day_of_year
        times_frac = []
        for d in dates:
            _, _, dec_yr = _extract_month_and_day_of_year(str(d))
            times_frac.append(dec_yr)
        return fit_harmonic_fourier_regression(times_frac, values, num_harmonics=num_harmonics, period=period_years)

    @classmethod
    def compute_climatological_mad(
        cls,
        dates: List[str],
        values: List[float],
        anomaly_threshold: float = 2.5,
        min_mad_scale: float = 0.015
    ) -> Dict[str, Any]:
        """Calculates monthly climatological MAD baselines, non-parametric Theil-Sen trend, and normalized anomalies."""
        from app.models.schemas import (
            calculate_climatological_monthly_mad,
            calculate_seasonal_mad_anomalies,
            calculate_theil_sen_slope,
            _extract_month_and_day_of_year
        )
        times_frac = []
        for d in dates:
            _, _, dec_yr = _extract_month_and_day_of_year(str(d))
            times_frac.append(dec_yr)

        theil_sen = calculate_theil_sen_slope(times_frac, values)
        climatology = calculate_climatological_monthly_mad(dates, values, min_mad_scale=min_mad_scale)
        anomalies = calculate_seasonal_mad_anomalies(
            dates,
            values,
            monthly_climatology=climatology,
            anomaly_threshold=anomaly_threshold,
            min_mad_scale=min_mad_scale
        )
        return {
            "theil_sen_trend": theil_sen,
            "monthly_climatology": climatology["monthly_records"],
            "points": anomalies["points"],
            "total_observations": anomalies["total_observations"],
            "anomaly_count": anomalies["anomaly_count"],
            "critical_anomaly_count": anomalies["critical_anomaly_count"],
            "max_z_score": anomalies["max_z_score"],
            "worst_anomaly_tier": anomalies["worst_anomaly_tier"]
        }

    @classmethod
    def simulate_phenology(
        cls,
        req: Any
    ) -> Dict[str, Any]:
        """Generates high-fidelity multi-temporal phenology decomposition simulation."""
        from app.models.schemas import simulate_phenology_decomposition
        return simulate_phenology_decomposition(req)

timeseries_service = TimeSeriesService()
