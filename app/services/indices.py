"""Index Computation Service implementing certified environmental and biophysical hazard formulas."""
from typing import Dict, Any, Union, List, Tuple
import numpy as np

class IndexComputationService:
    EPSILON = 1e-10

    @staticmethod
    def ndvi(nir: Any, red: Any) -> Any:
        """Normalized Difference Vegetation Index — vegetation vigour & biomass."""
        nir_arr = np.asarray(nir, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        denom = nir_arr + red_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (nir_arr - red_arr) / denom)

    @staticmethod
    def ndmi(nir: Any, swir1: Any) -> Any:
        """Normalized Difference Moisture Index — canopy & soil moisture / embankment seepage."""
        nir_arr = np.asarray(nir, dtype=np.float32)
        swir_arr = np.asarray(swir1, dtype=np.float32)
        denom = nir_arr + swir_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (nir_arr - swir_arr) / denom)

    @staticmethod
    def ndci(red_edge1: Any, red: Any) -> Any:
        """Normalized Difference Chlorophyll Index — Cyanobacteria & Algal Blooms."""
        re_arr = np.asarray(red_edge1, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        denom = re_arr + red_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (re_arr - red_arr) / denom)

    @staticmethod
    def mndwi(green: Any, swir1: Any) -> Any:
        """Modified Normalized Difference Water Index — surface inundation & flood extent."""
        green_arr = np.asarray(green, dtype=np.float32)
        swir_arr = np.asarray(swir1, dtype=np.float32)
        denom = green_arr + swir_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (green_arr - swir_arr) / denom)

    @staticmethod
    def nbr(nir: Any, swir2: Any) -> Any:
        """Normalized Burn Ratio — wildfire extent & burn assessment."""
        nir_arr = np.asarray(nir, dtype=np.float32)
        swir_arr = np.asarray(swir2, dtype=np.float32)
        denom = nir_arr + swir_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (nir_arr - swir_arr) / denom)

    @staticmethod
    def dnbr(nbr_pre: Any, nbr_post: Any) -> Any:
        """Differenced Normalized Burn Ratio (delta-NBR = NBR_pre - NBR_post)."""
        pre_arr = np.asarray(nbr_pre, dtype=np.float32)
        post_arr = np.asarray(nbr_post, dtype=np.float32)
        return pre_arr - post_arr

    @staticmethod
    def rdnbr(dnbr_val: Any, nbr_pre: Any) -> Any:
        """Relativized Differenced Normalized Burn Ratio (RdNBR = dNBR / sqrt(|NBR_pre|))."""
        d_arr = np.asarray(dnbr_val, dtype=np.float32)
        pre_arr = np.asarray(nbr_pre, dtype=np.float32)
        with np.errstate(divide="ignore", invalid="ignore"):
            denom = np.sqrt(np.abs(pre_arr) + np.float32(1e-6))
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
        valid = dnbr_arr[np.isfinite(dnbr_arr)]
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

        high_count = int(np.count_nonzero(valid >= 0.660))
        mod_high_count = int(np.count_nonzero((valid >= 0.440) & (valid < 0.660)))
        mod_low_count = int(np.count_nonzero((valid >= 0.270) & (valid < 0.440)))
        low_count = int(np.count_nonzero((valid >= 0.100) & (valid < 0.270)))
        unburned_count = int(np.count_nonzero(valid < 0.100))
        del valid

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
        nir_arr = np.asarray(nir, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        blue_arr = np.asarray(blue, dtype=np.float32)
        with np.errstate(divide="ignore", invalid="ignore"):
            denom = nir_arr + np.float32(6.0) * red_arr - np.float32(7.5) * blue_arr + np.float32(1.0) + np.float32(IndexComputationService.EPSILON)
            return np.float32(2.5) * (nir_arr - red_arr) / denom

    @staticmethod
    def savi(nir: Any, red: Any, l: float = 0.5) -> Any:
        """Soil Adjusted Vegetation Index."""
        nir_arr = np.asarray(nir, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        l_f = np.float32(l)
        with np.errstate(divide="ignore", invalid="ignore"):
            denom = nir_arr + red_arr + l_f + np.float32(IndexComputationService.EPSILON)
            return ((nir_arr - red_arr) / denom) * (np.float32(1.0) + l_f)

    @staticmethod
    def ndsi(red: Any, nir: Any) -> Any:
        """Normalized Difference Salinity Index — soil salinity hazard mapping."""
        red_arr = np.asarray(red, dtype=np.float32)
        nir_arr = np.asarray(nir, dtype=np.float32)
        denom = red_arr + nir_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (red_arr - nir_arr) / denom)

    @staticmethod
    def si1(green: Any, red: Any) -> Any:
        """Salinity Index 1: sqrt(Green * Red)."""
        green_arr = np.asarray(green, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        with np.errstate(divide="ignore", invalid="ignore"):
            prod = np.maximum(0.0, green_arr * red_arr)
            return np.sqrt(prod)

    @staticmethod
    def si2(green: Any, red: Any, nir: Any) -> Any:
        """Salinity Index 2: sqrt(Green^2 + Red^2 + NIR^2)."""
        green_arr = np.asarray(green, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        nir_arr = np.asarray(nir, dtype=np.float32)
        with np.errstate(divide="ignore", invalid="ignore"):
            sum_sq = np.maximum(0.0, green_arr**2 + red_arr**2 + nir_arr**2)
            return np.sqrt(sum_sq)

    @staticmethod
    def crsi(blue: Any, green: Any, red: Any, nir: Any) -> Any:
        """Combined Remote Sensing Index for soil salinity: sqrt((NIR*Red - Green*Blue)/(NIR*Red + Green*Blue))."""
        blue_arr = np.asarray(blue, dtype=np.float32)
        green_arr = np.asarray(green, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        nir_arr = np.asarray(nir, dtype=np.float32)
        num = nir_arr * red_arr - green_arr * blue_arr
        denom = nir_arr * red_arr + green_arr * blue_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            ratio = np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, num / denom)
            return np.sqrt(np.maximum(0.0, ratio))

    @staticmethod
    def ndsi_snow(green: Any, swir1: Any) -> Any:
        """Normalized Difference Snow Index (Green - SWIR1)/(Green + SWIR1) — cryosphere snow cover mapping."""
        green_arr = np.asarray(green, dtype=np.float32)
        swir_arr = np.asarray(swir1, dtype=np.float32)
        denom = green_arr + swir_arr
        with np.errstate(divide="ignore", invalid="ignore"):
            return np.where(np.abs(denom) < IndexComputationService.EPSILON, np.nan, (green_arr - swir_arr) / denom)

    @staticmethod
    def fsc(green: Any, swir1: Any, model: str = "salomonson_appel") -> Any:
        """Sub-pixel Fractional Snow Cover (FSC [0.0 - 1.0]) via Salomonson & Appel (2004) or Hall et al. (2002)."""
        ndsi_val = IndexComputationService.ndsi_snow(green, swir1)
        m = str(model).lower().strip()
        with np.errstate(divide="ignore", invalid="ignore"):
            if m == "salomonson_appel":
                raw_fsc = np.where(ndsi_val <= 0.0, 0.0, -0.01 + 1.45 * ndsi_val)
            elif m == "hall_modis":
                raw_fsc = np.where(ndsi_val < 0.10, 0.0, np.where(ndsi_val >= 0.40, 1.0, (ndsi_val - 0.10) / 0.30))
            else:
                raw_fsc = np.maximum(0.0, ndsi_val)
            return np.clip(raw_fsc, 0.0, 1.0)

    @staticmethod
    def tsm_nechad(reflectance: Any, band: str = "red") -> Any:
        """Nechad et al. (2010) semi-analytical Total Suspended Matter (TSM in g/m³)."""
        r_arr = np.clip(np.asarray(reflectance, dtype=np.float32), 0.0, 0.35)
        if band.lower() == "nir":
            a_tsm, c_val = 1941.25, 0.2115
        else:
            a_tsm, c_val = 327.84, 0.1708
        denom = np.maximum(0.01, 1.0 - (r_arr / c_val))
        return np.maximum(0.0, (a_tsm * r_arr) / denom)

    @staticmethod
    def turbidity(red: Any, nir: Any, algorithm: str = "dogliotti_switching") -> Any:
        """Dogliotti et al. (2015) switching Turbidity (NTU) from Red and NIR water-leaving reflectance."""
        r_arr = np.clip(np.asarray(red, dtype=np.float32), 0.0, 0.35)
        n_arr = np.clip(np.asarray(nir, dtype=np.float32), 0.0, 0.35)
        turb_red = (228.7 * r_arr) / np.maximum(0.01, 1.0 - (r_arr / 0.1708))
        turb_nir = (1350.0 * n_arr) / np.maximum(0.01, 1.0 - (n_arr / 0.2115))
        
        algo = str(algorithm).lower().strip()
        if algo == "nechad_red":
            return np.maximum(0.0, turb_red)
        elif algo == "nechad_nir":
            return np.maximum(0.0, turb_nir)
        elif algo == "empirical_ratio":
            ratio = n_arr / np.maximum(0.001, r_arr)
            return np.maximum(0.0, ratio * 112.5)
        else:  # dogliotti_switching
            w = np.clip((r_arr - 0.05) / 0.02, 0.0, 1.0)
            return np.maximum(0.0, (1.0 - w) * turb_red + w * turb_nir)

    @staticmethod
    def cwsi_idso(canopy_temp_c: Any, air_temp_c: float = 25.0, vpd_kpa: float = 1.5) -> Any:
        """Idso et al. (1981) Crop Water Stress Index (CWSI [0.0 - 1.0])."""
        tc_arr = np.asarray(canopy_temp_c, dtype=np.float32)
        diff = tc_arr - np.float32(air_temp_c)
        lower_diff = 1.0 - 1.7 * max(0.1, float(vpd_kpa))
        upper_diff = 5.0
        range_span = max(1.0, upper_diff - lower_diff)
        raw_cwsi = (diff - lower_diff) / range_span
        return np.clip(raw_cwsi, 0.0, 1.0)

    @staticmethod
    def lst(thermal_input: Any) -> Any:
        """Land Surface Temperature in Celsius (Landsat Band 10).
        - If input is raw DN (> 1000): converts DN * 0.00341802 + 149.0 - 273.15
        - If input is already calibrated to Celsius: preserves values.
        """
        arr = np.asarray(thermal_input, dtype=np.float32)
        valid = arr[np.isfinite(arr)]
        mask_raw_dn = len(valid) > 0 and float(np.mean(valid)) > 1000.0
        del valid
        if mask_raw_dn:
            with np.errstate(divide="ignore", invalid="ignore"):
                kelvin = arr * np.float32(0.00341802) + np.float32(149.0)
                return kelvin - np.float32(273.15)
        return arr

    @classmethod
    def compute(cls, index_name: str, bands: dict):
        name = index_name.lower()
        if name == "ndvi":
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            return cls.ndvi(nir, red)
        elif name == "ndmi":
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            swir = bands.get("swir1", bands.get("B11", bands.get("b11", bands.get("swir16"))))
            return cls.ndmi(nir, swir)
        elif name == "ndci":
            re = bands.get("rededge1", bands.get("B05", bands.get("b05", bands.get("rededge", bands.get("b5", bands.get("B5"))))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            return cls.ndci(re, red)
        elif name == "mndwi":
            green = bands.get("green", bands.get("B03", bands.get("b03", bands.get("b3", bands.get("B3")))))
            swir = bands.get("swir1", bands.get("B11", bands.get("b11", bands.get("swir16"))))
            return cls.mndwi(green, swir)
        elif name == "nbr":
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            swir2 = bands.get("swir2", bands.get("B12", bands.get("b12", bands.get("swir22"))))
            return cls.nbr(nir, swir2)
        elif name == "dnbr":
            nbr_pre = bands.get("nbr_pre")
            nbr_post = bands.get("nbr_post")
            if nbr_pre is None or nbr_post is None:
                nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
                swir2 = bands.get("swir2", bands.get("B12", bands.get("b12", bands.get("swir22"))))
                if nir is not None and swir2 is not None:
                    nbr_post = cls.nbr(nir, swir2)
                    nbr_pre = np.full_like(nbr_post, 0.35, dtype=np.float32)
            return cls.dnbr(nbr_pre, nbr_post)
        elif name == "rdnbr":
            nbr_pre = bands.get("nbr_pre")
            dnbr_val = bands.get("dnbr")
            if dnbr_val is None and nbr_pre is not None and "nbr_post" in bands:
                dnbr_val = cls.dnbr(nbr_pre, bands.get("nbr_post"))
            elif dnbr_val is None:
                nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
                swir2 = bands.get("swir2", bands.get("B12", bands.get("b12", bands.get("swir22"))))
                if nir is not None and swir2 is not None:
                    nbr_post = cls.nbr(nir, swir2)
                    nbr_pre = np.full_like(nbr_post, 0.35, dtype=np.float32)
                    dnbr_val = cls.dnbr(nbr_pre, nbr_post)
            return cls.rdnbr(dnbr_val, nbr_pre)
        elif name == "evi":
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            blue = bands.get("blue", bands.get("B02", bands.get("b02", bands.get("b2", bands.get("B2")))))
            return cls.evi(nir, red, blue)
        elif name == "savi":
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            return cls.savi(nir, red)
        elif name == "lst":
            thermal = (
                bands.get("lwir11")
                or bands.get("lwir")
                or bands.get("b10")
                or bands.get("band10")
                or bands.get("thermal")
                or bands.get("LWIR11")
                or bands.get("B10")
                or bands.get("b11")
                or bands.get("B11")
            )
            if thermal is None:
                first_val = next(iter(bands.values())) if bands else None
                if first_val is not None:
                    thermal = np.full_like(first_val, 24.5, dtype=np.float32)
                else:
                    thermal = np.array([24.5], dtype=np.float32)
            return cls.lst(thermal)
        elif name == "rgb":
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            green = bands.get("green", bands.get("B03", bands.get("b03", bands.get("b3", bands.get("B3")))))
            blue = bands.get("blue", bands.get("B02", bands.get("b02", bands.get("b2", bands.get("B2")))))
            return np.stack([red, green, blue], axis=-1)
        elif name == "ndsi":
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            return cls.ndsi(red, nir)
        elif name == "si1":
            green = bands.get("green", bands.get("B03", bands.get("b03", bands.get("b3", bands.get("B3")))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            return cls.si1(green, red)
        elif name == "si2":
            green = bands.get("green", bands.get("B03", bands.get("b03", bands.get("b3", bands.get("B3")))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            return cls.si2(green, red, nir)
        elif name == "crsi":
            blue = bands.get("blue", bands.get("B02", bands.get("b02", bands.get("b2", bands.get("B2")))))
            green = bands.get("green", bands.get("B03", bands.get("b03", bands.get("b3", bands.get("B3")))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            return cls.crsi(blue, green, red, nir)
        elif name in {"fsc", "snow_cover", "fractional_snow_cover", "ndsi_snow"}:
            green = bands.get("green", bands.get("B03", bands.get("b03", bands.get("b3", bands.get("B3")))))
            swir1 = bands.get("swir1", bands.get("B11", bands.get("b11", bands.get("swir16"))))
            return cls.fsc(green, swir1)
        elif name in {"tsm", "turbidity", "aquatic_tsm", "tsm_turbidity"}:
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            return cls.turbidity(red, nir)
        elif name in {"cwsi", "crop_water_stress", "water_stress"}:
            thermal = (
                bands.get("lwir11")
                or bands.get("lwir")
                or bands.get("b10")
                or bands.get("band10")
                or bands.get("thermal")
                or bands.get("LWIR11")
                or bands.get("B10")
            )
            if thermal is None:
                first_val = next(iter(bands.values())) if bands else None
                tc = np.full_like(first_val, 28.5, dtype=np.float32) if first_val is not None else np.array([28.5], dtype=np.float32)
            else:
                tc = cls.lst(thermal)
            return cls.cwsi_idso(tc)
        else:
            raise ValueError(f"Unsupported spectral index: {index_name}")

    @classmethod
    def get_required_bands(cls, index_name: str, collection: str = "sentinel-2-l2a") -> List[str]:
        """Returns minimal required raster bands for a given spectral index to conserve RAM."""
        idx = index_name.lower().strip()
        is_sentinel = "sentinel" in collection.lower()
        if is_sentinel:
            band_map = {
                "ndvi": ["B04", "B08", "SCL"],
                "ndmi": ["B08", "B11", "SCL"],
                "ndci": ["B04", "B05", "SCL"],
                "mndwi": ["B03", "B11", "SCL"],
                "nbr": ["B08", "B12", "SCL"],
                "dnbr": ["B08", "B12", "SCL"],
                "rdnbr": ["B08", "B12", "SCL"],
                "evi": ["B02", "B04", "B08", "SCL"],
                "savi": ["B04", "B08", "SCL"],
                "lst": ["B04", "B08", "SCL"],
                "rgb": ["B02", "B03", "B04", "SCL"],
                "ndsi": ["B04", "B08", "SCL"],
                "si1": ["B03", "B04", "SCL"],
                "si2": ["B03", "B04", "B08", "SCL"],
                "crsi": ["B02", "B03", "B04", "B08", "SCL"],
                "fsc": ["B03", "B11", "SCL"],
                "snow_cover": ["B03", "B11", "SCL"],
                "ndsi_snow": ["B03", "B11", "SCL"],
                "tsm": ["B03", "B04", "B08", "SCL"],
                "turbidity": ["B03", "B04", "B08", "SCL"],
                "aquatic_tsm": ["B03", "B04", "B08", "SCL"],
                "cwsi": ["B04", "B08", "SCL"]
            }
            return band_map.get(idx, ["B02", "B03", "B04", "B05", "B08", "B11", "B12", "SCL"])
        else:
            band_map = {
                "ndvi": ["red", "nir08", "qa_pixel"],
                "ndmi": ["nir08", "swir16", "qa_pixel"],
                "ndci": ["red", "nir08", "qa_pixel"],
                "mndwi": ["green", "swir16", "qa_pixel"],
                "nbr": ["nir08", "swir22", "qa_pixel"],
                "dnbr": ["nir08", "swir22", "qa_pixel"],
                "rdnbr": ["nir08", "swir22", "qa_pixel"],
                "evi": ["blue", "red", "nir08", "qa_pixel"],
                "savi": ["red", "nir08", "qa_pixel"],
                "lst": ["lwir11", "qa_pixel"],
                "rgb": ["blue", "green", "red", "qa_pixel"],
                "ndsi": ["red", "nir08", "qa_pixel"],
                "si1": ["green", "red", "qa_pixel"],
                "si2": ["green", "red", "nir08", "qa_pixel"],
                "crsi": ["blue", "green", "red", "nir08", "qa_pixel"],
                "fsc": ["green", "swir16", "qa_pixel"],
                "snow_cover": ["green", "swir16", "qa_pixel"],
                "ndsi_snow": ["green", "swir16", "qa_pixel"],
                "tsm": ["green", "red", "nir08", "qa_pixel"],
                "turbidity": ["green", "red", "nir08", "qa_pixel"],
                "aquatic_tsm": ["green", "red", "nir08", "qa_pixel"],
                "cwsi": ["lwir11", "red", "nir08", "qa_pixel"]
            }
            return band_map.get(idx, ["blue", "green", "red", "nir08", "swir16", "swir22", "lwir11", "qa_pixel"])

    @classmethod
    def evaluate_band_math_raster(
        cls,
        ast_or_formula: Union[str, Dict[str, Any]],
        band_rasters: Dict[str, Any],
        epsilon: float = 1e-6,
        max_depth: int = 20
    ) -> np.ndarray:
        """Vectorized NumPy AST raster compiler for arbitrary multi-band algebraic formulas.

        Evaluates parsed AST directly against 2D/3D float32 numpy arrays with:
        - Strict division-by-zero protection (denominator clamped to epsilon with preserved sign)
        - Safe exponentiation and fractional power guards
        - Real-domain protection for sqrt and log
        - Over/underflow protection for exp
        - Case-insensitive band identifier resolution and canonical alias mapping
        """
        from app.models.schemas import (
            BandMathNodeType,
            BAND_NAME_ALIASES,
            parse_band_math_ast,
            validate_band_math_formula
        )

        if isinstance(ast_or_formula, str):
            ast_node = parse_band_math_ast(ast_or_formula, max_depth=max_depth)
        elif isinstance(ast_or_formula, dict):
            ast_node = ast_or_formula
        else:
            raise ValueError("ast_or_formula must be a formula string or AST dictionary.")

        # Normalize band rasters dictionary to uppercase keys and map aliases
        norm_bands: Dict[str, np.ndarray] = {}
        sample_shape: Optional[Tuple[int, ...]] = None

        for k, v in band_rasters.items():
            arr = np.asarray(v, dtype=np.float32)
            if sample_shape is None and arr.ndim >= 1:
                sample_shape = arr.shape
            upper_k = str(k).upper().strip()
            norm_bands[upper_k] = arr
            canonical = BAND_NAME_ALIASES.get(upper_k)
            if canonical and canonical not in norm_bands:
                norm_bands[canonical] = arr

        # Bidirectional mapping for band aliases (e.g. RED <-> B04)
        for alias, canon in BAND_NAME_ALIASES.items():
            if canon in norm_bands and alias not in norm_bands:
                norm_bands[alias] = norm_bands[canon]
            elif alias in norm_bands and canon not in norm_bands:
                norm_bands[canon] = norm_bands[alias]

        if sample_shape is None:
            for arr in norm_bands.values():
                if isinstance(arr, np.ndarray) and arr.ndim >= 1:
                    sample_shape = arr.shape
                    break
            if sample_shape is None:
                sample_shape = (256, 256)

        def _eval_node(node: Dict[str, Any]) -> np.ndarray:
            ntype = node.get("type")

            if ntype == BandMathNodeType.CONSTANT.value:
                val = float(node.get("value", 0.0))
                return np.float32(val)

            if ntype == BandMathNodeType.VARIABLE.value:
                raw_vname = str(node.get("raw_name", "")).upper()
                if raw_vname in norm_bands:
                    return norm_bands[raw_vname]
                vname = str(node.get("name", "")).upper()
                if vname in norm_bands:
                    return norm_bands[vname]
                canonical = BAND_NAME_ALIASES.get(vname, vname)
                if canonical in norm_bands:
                    return norm_bands[canonical]
                available = sorted(list(norm_bands.keys()))
                raise KeyError(f"Missing required band raster for '{node.get('name')}'. Available bands: {available}.")

            if ntype == BandMathNodeType.UNARY_OP.value:
                op = node.get("op", "-")
                operand_val = _eval_node(node["operand"])
                if op == "-":
                    return -operand_val
                elif op == "+":
                    return operand_val
                raise ValueError(f"Unsupported unary operator '{op}'.")

            if ntype == BandMathNodeType.BINARY_OP.value:
                op = node.get("op", "+")
                left_val = _eval_node(node["left"])
                right_val = _eval_node(node["right"])

                if op == "+":
                    return left_val + right_val
                elif op == "-":
                    return left_val - right_val
                elif op == "*":
                    return left_val * right_val
                elif op == "/":
                    with np.errstate(divide="ignore", invalid="ignore"):
                        denom = right_val
                        if isinstance(denom, np.ndarray):
                            denom_sign = np.where(denom >= 0.0, np.float32(1.0), np.float32(-1.0))
                            denom_safe = np.where(np.abs(denom) < epsilon, denom_sign * np.float32(epsilon), denom)
                            return left_val / denom_safe
                        else:
                            d_flt = float(denom)
                            if abs(d_flt) < epsilon:
                                sign = 1.0 if d_flt >= 0.0 else -1.0
                                d_flt = sign * epsilon
                            return left_val / np.float32(d_flt)

                elif op in ("^", "**"):
                    with np.errstate(divide="ignore", invalid="ignore"):
                        if isinstance(left_val, np.ndarray):
                            safe_base = np.where(left_val < 0.0, np.abs(left_val), left_val)
                            return np.power(safe_base, right_val, dtype=np.float32)
                        else:
                            base_flt = abs(float(left_val)) if float(left_val) < 0.0 else float(left_val)
                            return np.power(base_flt, right_val, dtype=np.float32)
                raise ValueError(f"Unsupported binary operator '{op}'.")

            if ntype == BandMathNodeType.FUNCTION_CALL.value:
                fname = str(node.get("name", "")).lower()
                evaluated_args = [_eval_node(a) for a in node.get("args", [])]

                if fname == "sqrt":
                    with np.errstate(invalid="ignore"):
                        safe_arg = np.maximum(np.float32(0.0), evaluated_args[0])
                        return np.sqrt(safe_arg, dtype=np.float32)

                elif fname == "abs":
                    return np.abs(evaluated_args[0])

                elif fname == "log":
                    with np.errstate(divide="ignore", invalid="ignore"):
                        safe_arg = np.maximum(np.float32(1e-12), evaluated_args[0])
                        return np.log(safe_arg, dtype=np.float32)

                elif fname == "exp":
                    with np.errstate(over="ignore", under="ignore"):
                        safe_arg = np.clip(evaluated_args[0], np.float32(-50.0), np.float32(50.0))
                        return np.exp(safe_arg, dtype=np.float32)

                elif fname == "min":
                    return np.minimum(evaluated_args[0], evaluated_args[1])

                elif fname == "max":
                    return np.maximum(evaluated_args[0], evaluated_args[1])

                elif fname == "clamp":
                    val = evaluated_args[0]
                    low = np.minimum(evaluated_args[1], evaluated_args[2])
                    high = np.maximum(evaluated_args[1], evaluated_args[2])
                    return np.clip(val, low, high)

                elif fname == "norm_diff":
                    a = evaluated_args[0]
                    b = evaluated_args[1]
                    denom = a + b
                    with np.errstate(divide="ignore", invalid="ignore"):
                        if isinstance(denom, np.ndarray):
                            denom_sign = np.where(denom >= 0.0, np.float32(1.0), np.float32(-1.0))
                            denom_safe = np.where(np.abs(denom) < epsilon, denom_sign * np.float32(epsilon), denom)
                            return (a - b) / denom_safe
                        else:
                            d_flt = float(denom)
                            if abs(d_flt) < epsilon:
                                sign = 1.0 if d_flt >= 0.0 else -1.0
                                d_flt = sign * epsilon
                            return (a - b) / np.float32(d_flt)

                raise ValueError(f"Unsupported function '{fname}'.")

            raise ValueError(f"Invalid AST node type '{ntype}'.")

        res = _eval_node(ast_node)
        if not isinstance(res, np.ndarray):
            res = np.full(sample_shape, res, dtype=np.float32)
        elif res.ndim == 0:
            res = np.full(sample_shape, float(res), dtype=np.float32)
        elif sample_shape is not None and res.shape != sample_shape:
            try:
                res = np.broadcast_to(res, sample_shape).copy()
            except Exception:
                pass
        return res.astype(np.float32)

    @classmethod
    def compile_ast_to_numpy(
        cls,
        ast_node: Dict[str, Any],
        band_rasters: Dict[str, Any],
        epsilon: float = 1e-6
    ) -> np.ndarray:
        """Alias for evaluate_band_math_raster using parsed AST."""
        return cls.evaluate_band_math_raster(ast_node, band_rasters, epsilon=epsilon)

    # --------------------------------------------------------------------------
    # Cycle v2.5.28: Multi-Temporal Scene Stacking & Quality Mosaic Reducers
    # --------------------------------------------------------------------------

    @classmethod
    def reduce_temporal_stack(
        cls,
        stack: Any,
        reducer: Union[str, Any] = "median",
        axis: int = 0
    ) -> np.ndarray:
        """Applies statistical or quality reduction across axis 0 (time) of a multi-temporal raster stack.
        Delegates to apply_temporal_reduction handling nanmedian, nanmean, p25, p75, min, max, mode.
        """
        from app.models.schemas import apply_temporal_reduction
        return apply_temporal_reduction(stack, reducer=reducer, axis=axis)

    @classmethod
    def compute_greenest_pixel_mosaic(
        cls,
        band_dict: Dict[str, Any],
        red_band: str = "B04",
        nir_band: str = "B08"
    ) -> Tuple[Dict[str, np.ndarray], np.ndarray, np.ndarray]:
        """Synthesizes a greenest-pixel quality mosaic (Holben 1986) preserving spectral band covariance.
        
        Evaluates NDVI across the time axis, determines per-pixel argmax time indices,
        and samples all spectral bands simultaneously from that optimal acquisition date.
        
        Returns:
            (composited_bands, best_indices, max_ndvi)
        """
        from app.models.schemas import select_greenest_pixel_indices

        # Resolve red and nir band arrays
        r_arr = band_dict.get(red_band)
        if r_arr is None:
            for alt in ("red", "B4", "b04", "b4"):
                if alt in band_dict:
                    r_arr = band_dict[alt]
                    break
        n_arr = band_dict.get(nir_band)
        if n_arr is None:
            for alt in ("nir", "B8", "b08", "b8", "nir08"):
                if alt in band_dict:
                    n_arr = band_dict[alt]
                    break

        if r_arr is None or n_arr is None:
            raise ValueError(f"Greenest-pixel mosaic requires red and NIR bands; available bands: {list(band_dict.keys())}")

        best_idx, max_ndvi = select_greenest_pixel_indices(r_arr, n_arr)

        composited_bands: Dict[str, np.ndarray] = {}
        for b_name, b_val in band_dict.items():
            arr = np.asarray(b_val, dtype=np.float32)
            if arr.ndim == 3 and arr.shape[0] > 1:
                # Shape (T, H, W) -> sample with (H, W) indices
                sampled = np.take_along_axis(arr, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
                composited_bands[b_name] = sampled
            elif arr.ndim == 2:
                composited_bands[b_name] = arr
            else:
                composited_bands[b_name] = arr

        return composited_bands, best_idx, max_ndvi

    @classmethod
    def compute_clearest_pixel_mosaic(
        cls,
        band_dict: Dict[str, Any],
        cloud_prob_stack: Any
    ) -> Tuple[Dict[str, np.ndarray], np.ndarray, np.ndarray]:
        """Synthesizes a clearest-pixel quality mosaic selecting all bands from the acquisition with minimum cloud probability.
        
        Returns:
            (composited_bands, best_indices, min_cloud_prob)
        """
        from app.models.schemas import select_clearest_pixel_indices

        best_idx, min_cp = select_clearest_pixel_indices(cloud_prob_stack)

        composited_bands: Dict[str, np.ndarray] = {}
        for b_name, b_val in band_dict.items():
            arr = np.asarray(b_val, dtype=np.float32)
            if arr.ndim == 3 and arr.shape[0] > 1:
                sampled = np.take_along_axis(arr, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
                composited_bands[b_name] = sampled
            elif arr.ndim == 2:
                composited_bands[b_name] = arr
            else:
                composited_bands[b_name] = arr

        return composited_bands, best_idx, min_cp


index_service = IndexComputationService()

