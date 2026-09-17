"""GIOS - Geospatial Integrated Orthomosaic Systems.
Core backend package.
"""
import warnings

try:
    import rasterio.errors
    warnings.filterwarnings("ignore", category=rasterio.errors.NotGeoreferencedWarning)
    warnings.filterwarnings("ignore", message=r".*Dataset has no geotransform.*")
except ImportError:
    pass

__version__ = "2.5.0"
