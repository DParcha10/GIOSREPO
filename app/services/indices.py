"""Index Computation Service implementing all environmental hazard formulas."""
import numpy as np

class IndexComputationService:
    EPSILON = 1e-10

    @staticmethod
    def ndvi(nir, red):
        return (nir - red) / (nir + red + IndexComputationService.EPSILON)

    @staticmethod
    def ndmi(nir, swir1):
        """Normalized Difference Moisture Index — canopy & soil moisture / seepage."""
        return (nir - swir1) / (nir + swir1 + IndexComputationService.EPSILON)

    @staticmethod
    def ndci(red_edge1, red):
        """Normalized Difference Chlorophyll Index — Cyanobacteria & Algal Blooms."""
        return (red_edge1 - red) / (red_edge1 + red + IndexComputationService.EPSILON)

    @staticmethod
    def mndwi(green, swir1):
        """Modified Normalized Difference Water Index — surface inundation & flood extent."""
        return (green - swir1) / (green + swir1 + IndexComputationService.EPSILON)

    @staticmethod
    def nbr(nir, swir2):
        """Normalized Burn Ratio — wildfire extent & burn severity."""
        return (nir - swir2) / (nir + swir2 + IndexComputationService.EPSILON)

    @staticmethod
    def evi(nir, red, blue):
        """Enhanced Vegetation Index — atmospheric and soil corrected vegetation metric."""
        return 2.5 * (nir - red) / (nir + 6.0 * red - 7.5 * blue + 1.0 + IndexComputationService.EPSILON)

    @staticmethod
    def lst(thermal_dn):
        """Land Surface Temperature in Celsius (Landsat Band 10)."""
        # Landsat 8/9 Collection 2 Scale Factor: DN * 0.00341802 + 149.0 (Kelvin) -> Celsius
        kelvin = thermal_dn * 0.00341802 + 149.0
        return kelvin - 273.15

    @classmethod
    def compute(cls, index_name: str, bands: dict):
        name = index_name.lower()
        if name == "ndvi":
            return cls.ndvi(bands["nir"], bands["red"])
        elif name == "ndmi":
            swir = bands.get("swir1", bands.get("swir16", bands.get("b11")))
            return cls.ndmi(bands["nir"], swir)
        elif name == "ndci":
            re = bands.get("rededge1", bands.get("b05", bands.get("rededge")))
            return cls.ndci(re, bands["red"])
        elif name == "mndwi":
            swir = bands.get("swir1", bands.get("swir16", bands.get("b11")))
            return cls.mndwi(bands["green"], swir)
        elif name == "nbr":
            swir2 = bands.get("swir2", bands.get("swir22", bands.get("b12")))
            return cls.nbr(bands["nir"], swir2)
        elif name == "evi":
            return cls.evi(bands["nir"], bands["red"], bands["blue"])
        elif name == "lst":
            thermal = bands.get("lwir11", bands.get("b10", bands.get("thermal")))
            return cls.lst(thermal)
        else:
            raise ValueError(f"Unsupported spectral index: {index_name}")

index_service = IndexComputationService()
