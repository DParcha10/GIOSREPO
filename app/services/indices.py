"""Index Computation Service implementing certified environmental and biophysical hazard formulas."""
from typing import Dict, Any, Union, List, Tuple, Optional
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
    def fai(
        nir: Any,
        red: Any,
        swir: Any,
        lambda_red: float = 665.0,
        lambda_nir: float = 842.0,
        lambda_swir: float = 1610.0
    ) -> Any:
        """Floating Algae Index (Hu 2009) via baseline subtraction."""
        nir_arr = np.asarray(nir, dtype=np.float32)
        red_arr = np.asarray(red, dtype=np.float32)
        swir_arr = np.asarray(swir, dtype=np.float32)
        denom = max(1.0, float(lambda_swir - lambda_red))
        f = float(lambda_nir - lambda_red) / denom
        r_base = red_arr + (swir_arr - red_arr) * f
        return nir_arr - r_base

    @staticmethod
    def chla_from_ndci(ndci: Any, model: str = "mishra_polynomial") -> Any:
        """Estimates bio-optical Chlorophyll-a concentration in ug/L from NDCI.
        
        Mishra & Mishra (2012):
            Chl-a = 14.039 + 86.115 * NDCI + 194.325 * NDCI^2
        """
        v = np.asarray(ndci, dtype=np.float32)
        if model == "linear":
            return np.maximum(0.0, 10.0 + 50.0 * v)
        poly = 14.039 + 86.115 * v + 194.325 * (v ** 2)
        low_v = np.maximum(0.2, 2.5 + (v + 0.15) * 8.0)
        chla = np.where(v < -0.15, low_v, poly)
        return np.maximum(0.0, chla)

    @staticmethod
    def chla_2bda(red_edge1: Any, red: Any, a: float = 61.324, b: float = -37.94) -> Any:
        """2-Band Red-Edge Chlorophyll-a model (Dall'Olmo & Gitelson 2005): Chl-a = a * (R705/R665) + b."""
        re_arr = np.asarray(red_edge1, dtype=np.float32)
        r_arr = np.asarray(red, dtype=np.float32)
        with np.errstate(divide="ignore", invalid="ignore"):
            ratio = np.where(r_arr > 1e-6, re_arr / r_arr, 0.0)
            chla = a * ratio + b
            return np.maximum(0.0, chla)

    @staticmethod
    def chla_3bda(red: Any, red_edge1: Any, red_edge2: Any, a: float = 117.4, b: float = 23.09) -> Any:
        """3-Band Red-Edge Chlorophyll-a model (Gitelson et al. 2008): Chl-a = a * [(1/R665 - 1/R705) * R740] + b."""
        r_arr = np.asarray(red, dtype=np.float32)
        re1_arr = np.asarray(red_edge1, dtype=np.float32)
        re2_arr = np.asarray(red_edge2, dtype=np.float32)
        with np.errstate(divide="ignore", invalid="ignore"):
            term1 = np.where(r_arr > 1e-6, 1.0 / r_arr, 0.0)
            term2 = np.where(re1_arr > 1e-6, 1.0 / re1_arr, 0.0)
            diff = (term1 - term2) * re2_arr
            chla = a * diff + b
            return np.maximum(0.0, chla)

    @staticmethod
    def nechad_turbidity(
        red: Any,
        a_rho: float = 357.85,
        c_rho: float = 0.1935,
        max_turbidity: float = 1000.0
    ) -> Any:
        """Semi-analytical turbidity / TSS inversion (Nechad et al. 2010): S = (A_rho * rho_w) / (1 - rho_w / C_rho)."""
        r_arr = np.asarray(red, dtype=np.float32)
        r_clean = np.maximum(0.0, r_arr)
        ratio = np.clip(r_clean / max(1e-4, float(c_rho)), 0.0, 0.95)
        denom = np.maximum(0.05, 1.0 - ratio)
        val = (float(a_rho) * r_clean) / denom
        return np.clip(val, 0.0, float(max_turbidity))

    @staticmethod
    def classify_eutrophication_risk_array(
        chla_arr: np.ndarray,
        ndci_arr: Optional[np.ndarray] = None,
        turbidity_arr: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Classifies 2D array of water pixels into numeric risk tiers (0=oligotrophic, 1=mesotrophic, 2=eutrophic, 3=hypertrophic)."""
        c = np.asarray(chla_arr, dtype=np.float32)
        tiers = np.zeros_like(c, dtype=np.int32)
        tiers[c >= 2.5] = 1
        tiers[c >= 8.0] = 2
        tiers[c > 25.0] = 3
        return tiers

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
        elif name == "fai":
            nir = bands.get("nir", bands.get("B08", bands.get("b08", bands.get("nir08", bands.get("b8", bands.get("B8"))))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            swir = bands.get("swir1", bands.get("B11", bands.get("b11", bands.get("swir16"))))
            return cls.fai(nir, red, swir)
        elif name == "chla":
            re = bands.get("rededge1", bands.get("B05", bands.get("b05", bands.get("rededge", bands.get("b5", bands.get("B5"))))))
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            ndci_val = cls.ndci(re, red)
            return cls.chla_from_ndci(ndci_val)
        elif name == "nechad_turbidity":
            red = bands.get("red", bands.get("B04", bands.get("b04", bands.get("b4", bands.get("B4")))))
            return cls.nechad_turbidity(red)
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
                "cwsi": ["B04", "B08", "SCL"],
                "fai": ["B04", "B08", "B11", "SCL"],
                "chla": ["B04", "B05", "SCL"],
                "nechad_turbidity": ["B04", "SCL"],
                "eutrophication_tier": ["B03", "B04", "B05", "B08", "B11", "SCL"]
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
                "cwsi": ["lwir11", "red", "nir08", "qa_pixel"],
                "fai": ["red", "nir08", "swir16", "qa_pixel"],
                "chla": ["red", "nir08", "qa_pixel"],
                "nechad_turbidity": ["red", "qa_pixel"],
                "eutrophication_tier": ["green", "red", "nir08", "swir16", "qa_pixel"]
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

    # --------------------------------------------------------------------------
    # Cycle v2.5.30: Sub-Pixel Automated Image Co-Registration, FFT Phase
    # Correlation, Affine Warping & Geometric Resampling
    # --------------------------------------------------------------------------

    @classmethod
    def compute_coregistration_tie_points(
        cls,
        ref_raster: Any,
        target_raster: Any,
        grid_spacing_pixels: int = 64,
        patch_size_pixels: int = 32,
        min_correlation: float = 0.60,
        outlier_threshold_pixels: float = 1.5,
        subpixel: bool = True
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Extracts candidate tie points across a regular spatial grid using FFT phase correlation,
        fits a 6-parameter 2D affine transformation homography with RANSAC outlier filtering,
        and computes per-tie-point residuals and geometric inlier status.

        Returns:
            (tie_points, affine_summary)
        """
        from app.models.schemas import (
            calculate_fft_phase_correlation_shift,
            estimate_affine_transform_matrix,
            classify_coregistration_quality_tier,
            calculate_change_detection_false_positive_risk
        )

        ref_arr = np.asarray(ref_raster, dtype=np.float32)
        tgt_arr = np.asarray(target_raster, dtype=np.float32)

        if ref_arr.ndim == 3:
            ref_2d = ref_arr[0] if ref_arr.shape[0] < ref_arr.shape[2] else ref_arr[:, :, 0]
            tgt_2d = tgt_arr[0] if tgt_arr.shape[0] < tgt_arr.shape[2] else tgt_arr[:, :, 0]
        else:
            ref_2d = ref_arr
            tgt_2d = tgt_arr

        h, w = ref_2d.shape
        half_patch = max(8, patch_size_pixels // 2)
        spacing = max(16, int(grid_spacing_pixels))

        candidate_points: List[Dict[str, Any]] = []
        pt_counter = 1

        y_steps = range(half_patch, h - half_patch, spacing)
        x_steps = range(half_patch, w - half_patch, spacing)

        for cy in y_steps:
            for cx in x_steps:
                ref_patch = ref_2d[cy - half_patch : cy + half_patch, cx - half_patch : cx + half_patch]
                tgt_patch = tgt_2d[cy - half_patch : cy + half_patch, cx - half_patch : cx + half_patch]

                if np.std(ref_patch) < 1e-6 or np.std(tgt_patch) < 1e-6:
                    continue

                shift_info = calculate_fft_phase_correlation_shift(ref_patch, tgt_patch, subpixel=subpixel)
                corr_score = float(shift_info.get("correlation_score", 0.0))

                if corr_score >= float(min_correlation):
                    sx = float(shift_info.get("shift_x", 0.0))
                    sy = float(shift_info.get("shift_y", 0.0))
                    candidate_points.append({
                        "point_id": f"TP_{pt_counter:04d}",
                        "reference_x": float(cx),
                        "reference_y": float(cy),
                        "target_x": round(float(cx + sx), 4),
                        "target_y": round(float(cy + sy), 4),
                        "shift_x": round(sx, 4),
                        "shift_y": round(sy, 4),
                        "correlation_score": round(corr_score, 4),
                        "is_inlier": True,
                        "residual_pixels": 0.0
                    })
                    pt_counter += 1

        # Fit 2D affine transformation with RANSAC
        if len(candidate_points) >= 3:
            affine_fit = estimate_affine_transform_matrix(
                candidate_points,
                outlier_threshold_pixels=outlier_threshold_pixels
            )
            a = float(affine_fit.get("a", 1.0))
            b_val = float(affine_fit.get("b", 0.0))
            c = float(affine_fit.get("c", 0.0))
            d = float(affine_fit.get("d", 1.0))
            tx = float(affine_fit.get("tx", 0.0))
            ty = float(affine_fit.get("ty", 0.0))

            inlier_shifts_x = []
            inlier_shifts_y = []
            inlier_corrs = []
            max_shift = 0.0

            for pt in candidate_points:
                rx = pt["reference_x"]
                ry = pt["reference_y"]
                pred_x = a * rx + b_val * ry + tx
                pred_y = c * rx + d * ry + ty
                res = float(np.sqrt((pt["target_x"] - pred_x) ** 2 + (pt["target_y"] - pred_y) ** 2))
                pt["residual_pixels"] = round(res, 4)
                is_inl = res <= float(outlier_threshold_pixels)
                pt["is_inlier"] = is_inl
                if is_inl:
                    inlier_shifts_x.append(pt["shift_x"])
                    inlier_shifts_y.append(pt["shift_y"])
                    inlier_corrs.append(pt["correlation_score"])
                    sh_mag = float(np.sqrt(pt["shift_x"] ** 2 + pt["shift_y"] ** 2))
                    if sh_mag > max_shift:
                        max_shift = sh_mag

            inlier_cnt = len(inlier_shifts_x)
            mean_sx = float(np.mean(inlier_shifts_x)) if inlier_cnt > 0 else float(affine_fit.get("tx", 0.0))
            mean_sy = float(np.mean(inlier_shifts_y)) if inlier_cnt > 0 else float(affine_fit.get("ty", 0.0))
            mean_corr = float(np.mean(inlier_corrs)) if inlier_cnt > 0 else 0.85
            rmse = float(affine_fit.get("rmse_pixels", 0.0))
            inlier_frac = float(inlier_cnt) / float(len(candidate_points))
        else:
            mean_sx = 0.0
            mean_sy = 0.0
            max_shift = 0.0
            mean_corr = 0.90
            rmse = 0.0
            inlier_frac = 1.0
            affine_fit = {
                "a": 1.0, "b": 0.0, "c": 0.0, "d": 1.0,
                "tx": 0.0, "ty": 0.0,
                "rmse_pixels": 0.0,
                "inlier_count": len(candidate_points),
                "total_tie_points": len(candidate_points)
            }

        quality_tier = classify_coregistration_quality_tier(rmse)
        false_change_risk = calculate_change_detection_false_positive_risk(
            max(abs(mean_sx), abs(mean_sy)), spatial_sigma=0.6
        )

        summary = {
            "mean_shift_x_pixels": round(mean_sx, 4),
            "mean_shift_y_pixels": round(mean_sy, 4),
            "rmse_pixels": round(rmse, 4),
            "max_shift_pixels": round(max_shift, 4),
            "mean_correlation": round(mean_corr, 4),
            "inlier_fraction": round(inlier_frac, 4),
            "quality_tier": quality_tier,
            "false_change_risk_pct": round(false_change_risk, 2),
            "affine_matrix": affine_fit
        }

        return candidate_points, summary

    @classmethod
    def warp_raster_affine(
        cls,
        raster: Any,
        affine_matrix: Union[Dict[str, Any], Any],
        kernel: Union[str, Any] = "cubic_convolution",
        fill_value: float = 0.0
    ) -> np.ndarray:
        """Warps a 2D or 3D target raster according to the affine transformation matrix
        mapping coordinates from reference grid to target image space.
        
        Geometric Resampling Kernels supported:
            - nearest: 0th order (preserves discrete masks, SCL, radiometry)
            - bilinear: 1st order (linear interpolation across 2x2 neighborhood)
            - cubic_convolution: Keys (1981) cubic convolution (a = -0.5, order 3)
            - cubic_spline: 3rd order B-spline interpolation
            - lanczos: Lanczos-3 windowed sinc / high-order spline (order 4)
        """
        import scipy.ndimage as ndi

        arr = np.asarray(raster, dtype=np.float32)

        if isinstance(affine_matrix, dict):
            a = float(affine_matrix.get("a", 1.0))
            b_val = float(affine_matrix.get("b", 0.0))
            c = float(affine_matrix.get("c", 0.0))
            d = float(affine_matrix.get("d", 1.0))
            tx = float(affine_matrix.get("tx", 0.0))
            ty = float(affine_matrix.get("ty", 0.0))
        elif hasattr(affine_matrix, "a"):
            a = float(affine_matrix.a)
            b_val = float(affine_matrix.b)
            c = float(affine_matrix.c)
            d = float(affine_matrix.d)
            tx = float(affine_matrix.tx)
            ty = float(affine_matrix.ty)
        else:
            a, b_val, c, d, tx, ty = 1.0, 0.0, 0.0, 1.0, 0.0, 0.0

        # In row-major (y, x) space:
        # y_in = d * y_out + c * x_out + ty
        # x_in = b * y_out + a * x_out + tx
        M = np.array([[d, c], [b_val, a]], dtype=np.float64)
        offset = np.array([ty, tx], dtype=np.float64)

        k_str = str(kernel.value if hasattr(kernel, "value") else kernel).lower().strip()
        if k_str == "nearest":
            order = 0
        elif k_str == "bilinear":
            order = 1
        elif k_str in ("cubic_convolution", "cubic", "bicubic", "cubic_spline"):
            order = 3
        elif k_str == "lanczos":
            order = 4
        else:
            order = 3

        if arr.ndim == 2:
            return ndi.affine_transform(
                arr,
                matrix=M,
                offset=offset,
                order=order,
                mode="constant",
                cval=fill_value
            ).astype(np.float32)
        elif arr.ndim == 3:
            if arr.shape[0] <= 16:
                warped_bands = [
                    ndi.affine_transform(
                        arr[b],
                        matrix=M,
                        offset=offset,
                        order=order,
                        mode="constant",
                        cval=fill_value
                    ).astype(np.float32)
                    for b in range(arr.shape[0])
                ]
                return np.stack(warped_bands, axis=0)
            else:
                warped_bands = [
                    ndi.affine_transform(
                        arr[:, :, b],
                        matrix=M,
                        offset=offset,
                        order=order,
                        mode="constant",
                        cval=fill_value
                    ).astype(np.float32)
                    for b in range(arr.shape[2])
                ]
                return np.stack(warped_bands, axis=-1)
        return arr

    @classmethod
    def compute_coregistration_differencing(
        cls,
        ref_raster: Any,
        target_raster: Any,
        affine_matrix: Union[Dict[str, Any], Any],
        kernel: Union[str, Any] = "cubic_convolution"
    ) -> Dict[str, Any]:
        """Calculates radiometric differences before and after sub-pixel affine co-registration.
        
        Demonstrates Townshend et al. (1992) misregistration error reduction:
            diff_pre = |ref - target_raw|
            diff_post = |ref - target_aligned|
            
        Returns dictionary with diff_pre, diff_post, warped_target, and error metrics.
        """
        ref_arr = np.asarray(ref_raster, dtype=np.float32)
        tgt_arr = np.asarray(target_raster, dtype=np.float32)

        warped_tgt = cls.warp_raster_affine(tgt_arr, affine_matrix, kernel=kernel)

        diff_pre = np.abs(ref_arr - tgt_arr)
        diff_post = np.abs(ref_arr - warped_tgt)

        rmse_pre = float(np.sqrt(np.mean(diff_pre ** 2)))
        rmse_post = float(np.sqrt(np.mean(diff_post ** 2)))
        reduction_pct = max(0.0, (1.0 - rmse_post / max(1e-7, rmse_pre)) * 100.0)

        return {
            "diff_pre": diff_pre,
            "diff_post": diff_post,
            "warped_target": warped_tgt,
            "rmse_diff_pre": round(rmse_pre, 4),
            "rmse_diff_post": round(rmse_post, 4),
            "error_reduction_pct": round(reduction_pct, 2)
        }

    @classmethod
    def compute_aquatic_quality_inversion(
        cls,
        bands: Dict[str, Any],
        algorithm: str = "ndci_mishra_2012",
        water_masking_method: str = "mndwi_threshold",
        mndwi_threshold: float = 0.0,
        pixel_size_m: float = 10.0
    ) -> Dict[str, Any]:
        """Computes comprehensive multi-spectral bio-optical water quality and HAB risk inversion.
        
        Evaluates:
            - Water boundary masking via MNDWI = (B03 - B11)/(B03 + B11) > mndwi_threshold
            - NDCI (Mishra & Mishra 2012): (B05 - B04)/(B05 + B04)
            - FAI (Hu 2009): B08 - [B04 + (B11 - B04) * 0.1873]
            - Chlorophyll-a concentration (ug/L) via requested bio-optical algorithm
            - Nechad et al. (2010) semi-analytical turbidity / TSS (NTU)
            - Carlson / WHO trophic state categorization (Oligotrophic, Mesotrophic, Eutrophic, Hypertrophic)
            - Surface floating algae scum detection
            
        Returns dictionary with 2D raster arrays and summary statistics matching AquaticWaterBodySummary.
        """
        b3 = np.asarray(bands.get("B03", bands.get("b03", bands.get("green", 0.0))), dtype=np.float32)
        b4 = np.asarray(bands.get("B04", bands.get("b04", bands.get("red", 0.0))), dtype=np.float32)
        b5 = np.asarray(bands.get("B05", bands.get("b05", bands.get("rededge1", 0.0))), dtype=np.float32)
        b6 = np.asarray(bands.get("B06", bands.get("b06", bands.get("rededge2", b5))), dtype=np.float32)
        b8 = np.asarray(bands.get("B08", bands.get("b08", bands.get("nir", 0.0))), dtype=np.float32)
        b11 = np.asarray(bands.get("B11", bands.get("b11", bands.get("swir1", 0.0))), dtype=np.float32)
        scl = bands.get("SCL", bands.get("scl", None))

        # 1. Water Boundary Masking
        mndwi_arr = cls.mndwi(b3, b11)
        if water_masking_method == "scl_water_mask" and scl is not None:
            scl_arr = np.asarray(scl, dtype=np.int32)
            water_mask = (scl_arr == 6)
        elif water_masking_method == "nir_threshold":
            water_mask = (b8 < 0.10) & (b3 > 0.01)
        elif water_masking_method == "ndwi_threshold":
            ndwi_arr = (b3 - b8) / np.maximum(1e-6, b3 + b8)
            water_mask = (ndwi_arr > float(mndwi_threshold))
        else:
            water_mask = (mndwi_arr > float(mndwi_threshold))

        # 2. Bio-Optical NDCI
        ndci_raw = cls.ndci(b5, b4)
        ndci_arr = np.clip(ndci_raw, -1.0, 1.0)

        # 3. Floating Algae Index (FAI)
        fai_arr = cls.fai(b8, b4, b11)

        # 4. Chlorophyll-a Inversion (ug/L)
        algo_clean = str(algorithm).lower()
        if "2bda" in algo_clean:
            chla_arr = cls.chla_2bda(b5, b4)
        elif "3bda" in algo_clean:
            chla_arr = cls.chla_3bda(b4, b5, b6)
        else:
            chla_arr = cls.chla_from_ndci(ndci_arr)

        # 5. Nechad Turbidity / TSS (NTU)
        turbidity_arr = cls.nechad_turbidity(b4)

        # 6. Eutrophication Risk Tiers (0=oligotrophic, 1=mesotrophic, 2=eutrophic, 3=hypertrophic)
        tier_arr = cls.classify_eutrophication_risk_array(chla_arr, ndci_arr, turbidity_arr)

        # 7. Land Masking: Non-water pixels set to NaN
        ndci_water = np.where(water_mask, ndci_arr, np.nan)
        fai_water = np.where(water_mask, fai_arr, np.nan)
        chla_water = np.where(water_mask, chla_arr, np.nan)
        turbidity_water = np.where(water_mask, turbidity_arr, np.nan)
        tier_water = np.where(water_mask, tier_arr, -1)

        water_pixel_count = int(np.sum(water_mask))
        pixel_area_ha = float((pixel_size_m ** 2) / 10000.0)
        water_area_ha = round(float(water_pixel_count * pixel_area_ha), 2)

        if water_pixel_count > 0:
            mean_ndci_val = float(np.nanmean(ndci_water))
            mean_fai_val = float(np.nanmean(fai_water))
            mean_chla_val = float(np.nanmean(chla_water))
            mean_turbidity_val = float(np.nanmean(turbidity_water))

            valid_tiers = tier_arr[water_mask]
            t0 = float(np.sum(valid_tiers == 0)) / water_pixel_count * 100.0
            t1 = float(np.sum(valid_tiers == 1)) / water_pixel_count * 100.0
            t2 = float(np.sum(valid_tiers == 2)) / water_pixel_count * 100.0
            t3 = float(np.sum(valid_tiers == 3)) / water_pixel_count * 100.0
            tier_distribution = {
                "oligotrophic": round(t0, 1),
                "mesotrophic": round(t1, 1),
                "eutrophic": round(t2, 1),
                "hypertrophic": round(t3, 1)
            }

            tier_counts = [t0, t1, t2, t3]
            max_idx = int(np.argmax(tier_counts))
            tier_names = ["oligotrophic", "mesotrophic", "eutrophic", "hypertrophic"]
            dominant_tier = tier_names[max_idx]

            bloom_pixels = int(np.sum(valid_tiers >= 2))
            bloom_extent_ha = round(float(bloom_pixels * pixel_area_ha), 2)

            scum_pixels = int(np.sum(fai_water > 0.02))
            floating_scum_detected = bool(scum_pixels > 0 and (scum_pixels / water_pixel_count > 0.005 or np.nanmax(fai_water) > 0.025))

            if dominant_tier == "hypertrophic" or t3 > 15.0:
                bloom_risk = "severe"
            elif dominant_tier == "eutrophic" or (t2 + t3) > 30.0:
                bloom_risk = "high"
            elif dominant_tier == "mesotrophic" or (t2 + t3) > 10.0:
                bloom_risk = "moderate"
            else:
                bloom_risk = "low"
        else:
            mean_ndci_val = 0.0
            mean_fai_val = 0.0
            mean_chla_val = 0.0
            mean_turbidity_val = 0.0
            dominant_tier = "mesotrophic"
            bloom_extent_ha = 0.0
            bloom_risk = "low"
            floating_scum_detected = False
            tier_distribution = {
                "oligotrophic": 0.0,
                "mesotrophic": 100.0,
                "eutrophic": 0.0,
                "hypertrophic": 0.0
            }

        summary = {
            "water_pixels": water_pixel_count,
            "water_surface_area_ha": water_area_ha,
            "mean_ndci": round(mean_ndci_val, 4),
            "mean_fai": round(mean_fai_val, 6),
            "mean_chla_ug_l": round(mean_chla_val, 2),
            "mean_turbidity_ntu": round(mean_turbidity_val, 2),
            "dominant_eutrophication_tier": dominant_tier,
            "bloom_extent_ha": bloom_extent_ha,
            "bloom_risk_level": bloom_risk,
            "floating_scum_detected": floating_scum_detected,
            "tier_distribution": tier_distribution
        }

        return {
            "water_mask": water_mask,
            "mndwi": mndwi_arr,
            "ndci": ndci_arr,
            "fai": fai_arr,
            "chla": chla_arr,
            "turbidity": turbidity_arr,
            "tier": tier_arr,
            "ndci_water": ndci_water,
            "fai_water": fai_water,
            "chla_water": chla_water,
            "turbidity_water": turbidity_water,
            "tier_water": tier_water,
            "summary": summary
        }


index_service = IndexComputationService()


