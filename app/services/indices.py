"""Index Computation Service implementing certified environmental and biophysical hazard formulas."""
from typing import Dict, Any, Union, List, Tuple
import numpy as np

class IndexComputationService:
    EPSILON = 1e-10

    @staticmethod
    def ndvi(nir: Any, red: Any) -> Any:
        """Normalized Difference Vegetation Index — vegetation vigour & biomass."""
        nir_arr = np.asarray(nir, dtype=float)
        red_arr = np.asarray(red, dtype=float)
        denom = nir_arr + red_arr
        return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (nir_arr - red_arr) / denom)

    @staticmethod
    def ndmi(nir: Any, swir1: Any) -> Any:
        """Normalized Difference Moisture Index — canopy & soil moisture / embankment seepage."""
        nir_arr = np.asarray(nir, dtype=float)
        swir_arr = np.asarray(swir1, dtype=float)
        denom = nir_arr + swir_arr
        return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (nir_arr - swir_arr) / denom)

    @staticmethod
    def ndci(red_edge1: Any, red: Any) -> Any:
        """Normalized Difference Chlorophyll Index — Cyanobacteria & Algal Blooms."""
        re_arr = np.asarray(red_edge1, dtype=float)
        red_arr = np.asarray(red, dtype=float)
        denom = re_arr + red_arr
        return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (re_arr - red_arr) / denom)

    @staticmethod
    def mndwi(green: Any, swir1: Any) -> Any:
        """Modified Normalized Difference Water Index — surface inundation & flood extent."""
        green_arr = np.asarray(green, dtype=float)
        swir_arr = np.asarray(swir1, dtype=float)
        denom = green_arr + swir_arr
        return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (green_arr - swir_arr) / denom)

    @staticmethod
    def nbr(nir: Any, swir2: Any) -> Any:
        """Normalized Burn Ratio — wildfire extent & burn assessment."""
        nir_arr = np.asarray(nir, dtype=float)
        swir_arr = np.asarray(swir2, dtype=float)
        denom = nir_arr + swir_arr
        return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (nir_arr - swir_arr) / denom)

    @staticmethod
    def dnbr(nbr_pre: Any, nbr_post: Any) -> Any:
        """Differenced Normalized Burn Ratio (delta-NBR = NBR_pre - NBR_post)."""
        pre_arr = np.asarray(nbr_pre, dtype=float)
        post_arr = np.asarray(nbr_post, dtype=float)
        return pre_arr - post_arr

    @staticmethod
    def rdnbr(dnbr_val: Any, nbr_pre: Any) -> Any:
        """Relativized Differenced Normalized Burn Ratio (RdNBR = dNBR / sqrt(|NBR_pre|))."""
        d_arr = np.asarray(dnbr_val, dtype=float)
        pre_arr = np.asarray(nbr_pre, dtype=float)
        denom = np.sqrt(np.abs(pre_arr) + 1e-6)
        return d_arr / denom

    @staticmethod
    def classify_burn_severity(dnbr_arr: np.ndarray) -> Dict[str, Any]:
        """Classify burn severity according to USGS FIREMON standards:
        - High Severity: dNBR >= 0.660
        - Moderate-High Severity: 0.440 <= dNBR < 0.660
        - Moderate-Low Severity: 0.270 <= dNBR < 0.440
        - Low Severity: 0.100 <= dNBR < 0.270
        - Unburned / Low Change: dNBR < 0.100
        """
        valid = dnbr_arr[~np.isnan(dnbr_arr)]
        total = len(valid)
        if total == 0:
            return {
                "categories": [
                    {"category": "High Severity", "min_dnbr": 0.660, "percentage": 0.0, "hectares": 0.0, "pixel_count": 0},
                    {"category": "Moderate-High Severity", "min_dnbr": 0.440, "percentage": 0.0, "hectares": 0.0, "pixel_count": 0},
                    {"category": "Moderate-Low Severity", "min_dnbr": 0.270, "percentage": 0.0, "hectares": 0.0, "pixel_count": 0},
                    {"category": "Low Severity", "min_dnbr": 0.100, "percentage": 0.0, "hectares": 0.0, "pixel_count": 0},
                    {"category": "Unburned / Low Change", "min_dnbr": -0.100, "percentage": 100.0, "hectares": 0.0, "pixel_count": 0}
                ]
            }

        high_mask = valid >= 0.660
        mod_high_mask = (valid >= 0.440) & (valid < 0.660)
        mod_low_mask = (valid >= 0.270) & (valid < 0.440)
        low_mask = (valid >= 0.100) & (valid < 0.270)
        unburned_mask = valid < 0.100

        high_count = int(np.sum(high_mask))
        mod_high_count = int(np.sum(mod_high_mask))
        mod_low_count = int(np.sum(mod_low_mask))
        low_count = int(np.sum(low_mask))
        unburned_count = int(np.sum(unburned_mask))

        return {
            "categories": [
                {
                    "category": "High Severity",
                    "min_dnbr": 0.660,
                    "percentage": round(float(high_count / total * 100.0), 1),
                    "pixel_count": high_count
                },
                {
                    "category": "Moderate-High Severity",
                    "min_dnbr": 0.440,
                    "percentage": round(float(mod_high_count / total * 100.0), 1),
                    "pixel_count": mod_high_count
                },
                {
                    "category": "Moderate-Low Severity",
                    "min_dnbr": 0.270,
                    "percentage": round(float(mod_low_count / total * 100.0), 1),
                    "pixel_count": mod_low_count
                },
                {
                    "category": "Low Severity",
                    "min_dnbr": 0.100,
                    "percentage": round(float(low_count / total * 100.0), 1),
                    "pixel_count": low_count
                },
                {
                    "category": "Unburned / Low Change",
                    "min_dnbr": -0.100,
                    "percentage": round(float(unburned_count / total * 100.0), 1),
                    "pixel_count": unburned_count
                }
            ]
        }

    @staticmethod
    def evi(nir: Any, red: Any, blue: Any) -> Any:
        """Enhanced Vegetation Index — atmospheric and soil corrected vegetation metric."""
        nir_arr = np.asarray(nir, dtype=float)
        red_arr = np.asarray(red, dtype=float)
        blue_arr = np.asarray(blue, dtype=float)
        denom = nir_arr + 6.0 * red_arr - 7.5 * blue_arr + 1.0 + IndexComputationService.EPSILON
        return 2.5 * (nir_arr - red_arr) / denom

    @staticmethod
    def savi(nir: Any, red: Any, l: float = 0.5) -> Any:
        """Soil Adjusted Vegetation Index."""
        nir_arr = np.asarray(nir, dtype=float)
        red_arr = np.asarray(red, dtype=float)
        denom = nir_arr + red_arr + l + IndexComputationService.EPSILON
        return ((nir_arr - red_arr) / denom) * (1.0 + l)

    @staticmethod
    def lst(thermal_input: Any) -> Any:
        """Land Surface Temperature in Celsius (Landsat Band 10).
        - If input is raw DN (> 1000): converts DN * 0.00341802 + 149.0 - 273.15
        - If input is already calibrated to Celsius: preserves values.
        """
        arr = np.asarray(thermal_input, dtype=float)
        # Check if values are raw DN (e.g., Landsat Band 10 typically 20,000 - 60,000)
        # Values in Celsius typically range from -60 to +80
        mask_raw_dn = np.nanmean(arr) > 1000.0 if arr.size > 0 else False
        if mask_raw_dn:
            kelvin = arr * 0.00341802 + 149.0
            return kelvin - 273.15
        return arr

    @classmethod
    def compute(cls, index_name: str, bands: dict):
        name = index_name.lower()
        if name == "ndvi":
            nir = bands.get("nir", bands.get("B08", bands.get("nir08")))
            red = bands.get("red", bands.get("B04"))
            return cls.ndvi(nir, red)
        elif name == "ndmi":
            nir = bands.get("nir", bands.get("B08", bands.get("nir08")))
            swir = bands.get("swir1", bands.get("B11", bands.get("swir16", bands.get("b11"))))
            return cls.ndmi(nir, swir)
        elif name == "ndci":
            re = bands.get("rededge1", bands.get("B05", bands.get("b05", bands.get("rededge"))))
            red = bands.get("red", bands.get("B04"))
            return cls.ndci(re, red)
        elif name == "mndwi":
            green = bands.get("green", bands.get("B03"))
            swir = bands.get("swir1", bands.get("B11", bands.get("swir16", bands.get("b11"))))
            return cls.mndwi(green, swir)
        elif name == "nbr":
            nir = bands.get("nir", bands.get("B08", bands.get("nir08")))
            swir2 = bands.get("swir2", bands.get("B12", bands.get("swir22", bands.get("b12"))))
            return cls.nbr(nir, swir2)
        elif name == "dnbr":
            nbr_pre = bands.get("nbr_pre")
            nbr_post = bands.get("nbr_post")
            return cls.dnbr(nbr_pre, nbr_post)
        elif name == "evi":
            nir = bands.get("nir", bands.get("B08", bands.get("nir08")))
            red = bands.get("red", bands.get("B04"))
            blue = bands.get("blue", bands.get("B02"))
            return cls.evi(nir, red, blue)
        elif name == "savi":
            nir = bands.get("nir", bands.get("B08", bands.get("nir08")))
            red = bands.get("red", bands.get("B04"))
            return cls.savi(nir, red)
        elif name == "lst":
            thermal = bands.get("lwir11", bands.get("b10", bands.get("thermal", bands.get("B10"))))
            return cls.lst(thermal)
        else:
            raise ValueError(f"Unsupported spectral index: {index_name}")

index_service = IndexComputationService()
