"""Sensor-specific masking and normalisation service."""
import gc
import math
from typing import Optional, Union, Dict, Any, Tuple, List
import numpy as np
from scipy.ndimage import binary_dilation

class PreprocessingService:
    @staticmethod
    def _get_spatial_dilation_structure(ndim: int) -> np.ndarray:
        """Returns morphological structuring element operating strictly on spatial Y, X dimensions."""
        if ndim <= 0:
            return np.ones((), dtype=bool)
        elif ndim == 1:
            return np.ones((3,), dtype=bool)
        elif ndim == 2:
            return np.ones((3, 3), dtype=bool)
        return np.ones((1,) * (ndim - 2) + (3, 3), dtype=bool)

    @staticmethod
    def mask_landsat_qa(dataset: Any, dilation_iterations: int = 1):
        """Bitwise mask for Landsat Collection 2 QA_PIXEL with morphological dilation.
        
        Bits evaluated:
        - Bit 0: Fill
        - Bit 1: Dilated Cloud
        - Bit 2: Cirrus
        - Bit 3: Cloud
        - Bit 4: Cloud Shadow
        - Bit 5: Snow
        """
        # Check if dataset is xarray.Dataset
        if hasattr(dataset, "data_vars"):
            if hasattr(dataset, "attrs") and dataset.attrs.get("cloud_shadow_masked"):
                return dataset
            qa_name = None
            for name in ["qa_pixel", "QA_PIXEL", "qa", "QA", "pixel_qa", "PIXEL_QA"]:
                if name in dataset:
                    qa_name = name
                    break
            if qa_name is not None:
                qa = dataset[qa_name].values
                bit_mask = 0
                for b in range(6):
                    bit_mask |= (1 << b)
                if np.issubdtype(qa.dtype, np.floating):
                    nan_mask = np.isnan(qa)
                    qa_clean = np.nan_to_num(qa, copy=True, nan=0)
                    qa_int = qa_clean.astype(np.uint16, copy=False)
                    del qa_clean
                else:
                    nan_mask = np.zeros_like(qa, dtype=bool)
                    qa_int = qa.astype(np.uint16, copy=False)
                raw_mask = ((qa_int & bit_mask) != 0) | nan_mask
                del nan_mask
                del qa_int
                del qa
                if not np.any(raw_mask):
                    # Zero clouds or invalid pixels in the scene: fast bypass without allocating memory
                    del raw_mask
                    return dataset
                if dilation_iterations > 0:
                    struct = PreprocessingService._get_spatial_dilation_structure(raw_mask.ndim)
                    dilated_mask = binary_dilation(raw_mask, structure=struct, iterations=dilation_iterations)
                    del struct
                else:
                    dilated_mask = raw_mask
                del raw_mask
                
                qa_metadata_vars = {"qa_pixel", "qa", "pixel_qa", "spatial_ref", "crs", "grid_mapping"}
                for var in list(dataset.data_vars):
                    if var.lower() in qa_metadata_vars or dataset[var].ndim < 2 or var == qa_name:
                        continue
                    # Memory-conscious: in-place array assignment avoids xarray where() float64 upcasting and extra copies
                    arr = dataset[var].values
                    if not arr.flags.writeable or arr.dtype != np.float32:
                        arr = arr.astype(np.float32, copy=True)
                    if arr.shape == dilated_mask.shape:
                        arr[dilated_mask] = np.nan
                    elif arr.ndim > dilated_mask.ndim and arr.shape[-dilated_mask.ndim:] == dilated_mask.shape:
                        arr[..., dilated_mask] = np.nan
                    elif arr.ndim == dilated_mask.ndim + 1 and arr.shape[1:] == dilated_mask.shape:
                        arr[:, dilated_mask] = np.nan
                    dataset[var] = (dataset[var].dims, arr)
                    del arr
                del dilated_mask
                if hasattr(dataset, "attrs"):
                    dataset.attrs["cloud_shadow_masked"] = True
                gc.collect()
            return dataset
        
        # Handle dict of arrays or direct numpy array
        elif isinstance(dataset, dict):
            qa = dataset.get("qa_pixel", dataset.get("QA_PIXEL", dataset.get("qa")))
            if qa is not None:
                qa_raw = np.asarray(qa)
                bit_mask = 0
                for b in range(6):
                    bit_mask |= (1 << b)
                if np.issubdtype(qa_raw.dtype, np.floating):
                    nan_mask = np.isnan(qa_raw)
                    qa_clean = np.nan_to_num(qa_raw, copy=True, nan=0)
                    qa_arr = qa_clean.astype(np.uint16, copy=False)
                    del qa_clean
                else:
                    nan_mask = np.zeros_like(qa_raw, dtype=bool)
                    qa_arr = qa_raw.astype(np.uint16, copy=False)
                del qa_raw
                raw_mask = ((qa_arr & bit_mask) != 0) | nan_mask
                del nan_mask
                del qa_arr
                if dilation_iterations > 0:
                    struct = PreprocessingService._get_spatial_dilation_structure(raw_mask.ndim)
                    dilated_mask = binary_dilation(raw_mask, structure=struct, iterations=dilation_iterations)
                else:
                    dilated_mask = raw_mask
                for k, v in dataset.items():
                    if k not in ["qa_pixel", "QA_PIXEL", "qa", "QA", "pixel_qa", "PIXEL_QA"]:
                        arr = np.array(v, dtype=np.float32, copy=True)
                        arr[dilated_mask] = np.nan
                        dataset[k] = arr
                del raw_mask
                del dilated_mask
            return dataset
        
        elif isinstance(dataset, np.ndarray):
            bit_mask = 0
            for b in range(6):
                bit_mask |= (1 << b)
            if np.issubdtype(dataset.dtype, np.floating):
                nan_mask = np.isnan(dataset)
                qa_clean = np.nan_to_num(dataset, copy=True, nan=0)
                qa_int = qa_clean.astype(np.uint16, copy=False)
                del qa_clean
            else:
                nan_mask = np.zeros_like(dataset, dtype=bool)
                qa_int = dataset.astype(np.uint16, copy=False)
            raw_mask = ((qa_int & bit_mask) != 0) | nan_mask
            del nan_mask
            del qa_int
            if dilation_iterations > 0:
                struct = PreprocessingService._get_spatial_dilation_structure(dataset.ndim)
                return binary_dilation(raw_mask, structure=struct, iterations=dilation_iterations)
            return raw_mask

        return dataset

    @staticmethod
    def mask_sentinel_scl(dataset: Any, dilation_iterations: int = 1):
        """Scene Classification Layer (SCL) mask for Sentinel-2 with morphological dilation.
        
        Invalid/cloud classes:
        - 0: NO_DATA
        - 1: SATURATED_OR_DEFECTIVE
        - 3: CLOUD_SHADOW
        - 8: CLOUD_MEDIUM_PROBABILITY
        - 9: CLOUD_HIGH_PROBABILITY
        - 10: THIN_CIRRUS
        - 11: SNOW_ICE
        """
        invalid_classes = {0, 1, 3, 8, 9, 10, 11}

        if hasattr(dataset, "data_vars"):
            if hasattr(dataset, "attrs") and dataset.attrs.get("cloud_shadow_masked"):
                return dataset
            scl_name = None
            for name in ["scl", "SCL", "scl_20m", "SCL_20M", "scl_60m"]:
                if name in dataset:
                    scl_name = name
                    break
            if scl_name is not None:
                scl = dataset[scl_name].values
                nan_mask = np.isnan(scl) if np.issubdtype(scl.dtype, np.floating) else np.zeros_like(scl, dtype=bool)
                raw_mask = np.isin(scl, list(invalid_classes)) | nan_mask
                del scl
                del nan_mask
                if not np.any(raw_mask):
                    # Zero clouds or invalid pixels in the scene: fast bypass without allocating memory
                    del raw_mask
                    return dataset
                if dilation_iterations > 0:
                    struct = PreprocessingService._get_spatial_dilation_structure(raw_mask.ndim)
                    dilated_mask = binary_dilation(raw_mask, structure=struct, iterations=dilation_iterations)
                else:
                    dilated_mask = raw_mask
                del raw_mask
                
                scl_metadata_vars = {"scl", "scl_20m", "scl_60m", "spatial_ref", "crs", "grid_mapping"}
                for var in list(dataset.data_vars):
                    if var.lower() in scl_metadata_vars or dataset[var].ndim < 2 or var == scl_name:
                        continue
                    # Memory-conscious: in-place array assignment avoids xarray where() float64 upcasting and extra copies
                    arr = dataset[var].values
                    if not arr.flags.writeable or arr.dtype != np.float32:
                        arr = arr.astype(np.float32, copy=True)
                    if arr.shape == dilated_mask.shape:
                        arr[dilated_mask] = np.nan
                    elif arr.ndim > dilated_mask.ndim and arr.shape[-dilated_mask.ndim:] == dilated_mask.shape:
                        arr[..., dilated_mask] = np.nan
                    elif arr.ndim == dilated_mask.ndim + 1 and arr.shape[1:] == dilated_mask.shape:
                        arr[:, dilated_mask] = np.nan
                    dataset[var] = (dataset[var].dims, arr)
                del dilated_mask
                if hasattr(dataset, "attrs"):
                    dataset.attrs["cloud_shadow_masked"] = True
                gc.collect()
            return dataset

        elif isinstance(dataset, dict):
            scl = dataset.get("scl", dataset.get("SCL", dataset.get("scl_20m", dataset.get("SCL_20M"))))
            if scl is not None:
                scl_arr = np.asarray(scl)
                nan_mask = np.isnan(scl_arr) if np.issubdtype(scl_arr.dtype, np.floating) else np.zeros_like(scl_arr, dtype=bool)
                raw_mask = np.isin(scl_arr, list(invalid_classes)) | nan_mask
                del nan_mask
                if dilation_iterations > 0:
                    struct = PreprocessingService._get_spatial_dilation_structure(raw_mask.ndim)
                    dilated_mask = binary_dilation(raw_mask, structure=struct, iterations=dilation_iterations)
                else:
                    dilated_mask = raw_mask
                for k, v in dataset.items():
                    if k not in ["scl", "SCL", "scl_20m", "SCL_20M", "scl_60m"]:
                        arr = np.array(v, dtype=np.float32, copy=True)
                        arr[dilated_mask] = np.nan
                        dataset[k] = arr
                del raw_mask
                del dilated_mask
                del scl_arr
            return dataset

        elif isinstance(dataset, np.ndarray):
            nan_mask = np.isnan(dataset) if np.issubdtype(dataset.dtype, np.floating) else np.zeros_like(dataset, dtype=bool)
            raw_mask = np.isin(dataset, list(invalid_classes)) | nan_mask
            del nan_mask
            if dilation_iterations > 0:
                struct = PreprocessingService._get_spatial_dilation_structure(dataset.ndim)
                return binary_dilation(raw_mask, structure=struct, iterations=dilation_iterations)
            return raw_mask

        return dataset

    @staticmethod
    def is_thermal_band(var_name: str) -> bool:
        """Determines if a band identifier represents a thermal infrared band."""
        v = str(var_name).lower().strip()
        return v in {"lwir11", "b10", "b11", "thermal", "band10", "band11", "lwir", "b11_landsat"} or "thermal" in v or "lwir" in v

    @staticmethod
    def apply_landsat_calibration(
        dn: Union[float, np.ndarray],
        is_thermal: bool = False,
        inplace: bool = False
    ) -> Union[float, np.ndarray]:
        """Calibrate Landsat C2 L2 DN to physical units:
        - Optical: DN * 0.0000275 - 0.2 (Surface Reflectance rho in [0, 1])
        - Thermal: (DN * 0.00341802 + 149.0) - 273.15 (Celsius T_C)
        """
        if isinstance(dn, (int, float, np.number)):
            val = float(dn)
            if is_thermal:
                return (val * 0.00341802 + 149.0) - 273.15
            return val * 0.0000275 - 0.2

        if inplace and isinstance(dn, np.ndarray) and dn.dtype == np.float32 and dn.flags.writeable:
            arr = dn
        else:
            arr = np.array(dn, dtype=np.float32, copy=True)

        if is_thermal:
            arr *= np.float32(0.00341802)
            arr += np.float32(149.0 - 273.15)
            return arr
        arr *= np.float32(0.0000275)
        arr -= np.float32(0.2)
        return arr

    @staticmethod
    def apply_sentinel_offset(
        dn: Union[float, np.ndarray],
        processing_baseline: Optional[Union[float, str]] = None,
        acquisition_date: Optional[str] = None,
        inplace: bool = False
    ) -> Union[float, np.ndarray]:
        """Apply Sentinel-2 PB 04.00+ radiometric offset:
        - PB >= 04.00 (or acquisitions >= Jan 25, 2022): rho = (DN - 1000) * 0.0001
        - Legacy PB < 04.00: rho = DN * 0.0001
        """
        has_offset = False
        if processing_baseline is not None:
            try:
                pb_num = float(str(processing_baseline).replace("PB", "").replace("V", "").strip())
                has_offset = (pb_num >= 4.0)
            except Exception:
                has_offset = True
        elif acquisition_date:
            has_offset = (acquisition_date >= "2022-01-25")
        else:
            # Default to modern baseline >= 04.00 for GIOS v2.5
            has_offset = True
            
        if isinstance(dn, (int, float, np.number)):
            val = float(dn)
            if has_offset:
                return (val - 1000.0) * 0.0001
            return val * 0.0001

        if inplace and isinstance(dn, np.ndarray) and dn.dtype == np.float32 and dn.flags.writeable:
            arr = dn
        else:
            arr = np.array(dn, dtype=np.float32, copy=True)

        if has_offset:
            arr -= np.float32(1000.0)
        arr *= np.float32(0.0001)
        return arr

    @staticmethod
    def normalise_reflectance(
        dataset: Any,
        collection: str,
        processing_baseline: Optional[Union[float, str]] = None,
        acquisition_date: Optional[str] = None,
        is_thermal: bool = False
    ) -> Any:
        """Normalises surface reflectance to physical scale with distinct optical/thermal handling
        and Sentinel-2 PB 04.00+ offset subtraction.
        """
        col_str = collection.value if hasattr(collection, "value") else str(collection)
        col_lower = col_str.lower()
        is_landsat = "landsat" in col_lower
        is_sentinel = "sentinel" in col_lower

        if hasattr(dataset, "attrs") and dataset.attrs.get("radiometrically_calibrated"):
            return dataset

        pb = processing_baseline
        acq_date = acquisition_date
        if hasattr(dataset, "attrs"):
            if pb is None:
                pb = dataset.attrs.get("processing_baseline")
            if acq_date is None:
                acq_date = dataset.attrs.get("datetime") or dataset.attrs.get("acquisition_date")

        qa_names = {"qa_pixel", "scl", "qa", "pixel_qa", "scl_20m", "scl_60m", "spatial_ref", "crs", "grid_mapping"}
        if hasattr(dataset, "data_vars"):
            for var in list(dataset.data_vars):
                if var.lower() in qa_names or dataset[var].ndim < 2:
                    continue
                if is_landsat:
                    is_therm = PreprocessingService.is_thermal_band(var)
                    val = PreprocessingService.apply_landsat_calibration(
                        dataset[var].values,
                        is_thermal=is_therm,
                        inplace=True
                    )
                    dataset[var] = (dataset[var].dims, np.asarray(val, dtype=np.float32))
                    del val
                elif is_sentinel:
                    val = PreprocessingService.apply_sentinel_offset(
                        dataset[var].values,
                        processing_baseline=pb,
                        acquisition_date=acq_date,
                        inplace=True
                    )
                    dataset[var] = (dataset[var].dims, np.asarray(val, dtype=np.float32))
                    del val
            if hasattr(dataset, "attrs"):
                dataset.attrs["radiometrically_calibrated"] = True
            gc.collect()
            return dataset

        elif isinstance(dataset, dict):
            res = {}
            for k, v in dataset.items():
                if k.lower() in qa_names:
                    res[k] = v
                    continue
                if is_landsat:
                    if PreprocessingService.is_thermal_band(k) or is_thermal:
                        res[k] = PreprocessingService.apply_landsat_calibration(v, is_thermal=True)
                    else:
                        res[k] = PreprocessingService.apply_landsat_calibration(v, is_thermal=False)
                elif is_sentinel:
                    res[k] = PreprocessingService.apply_sentinel_offset(
                        v,
                        processing_baseline=pb,
                        acquisition_date=acq_date
                    )
                else:
                    res[k] = v
            return res

        elif isinstance(dataset, (np.ndarray, list, float, int)):
            if is_landsat:
                return PreprocessingService.apply_landsat_calibration(dataset, is_thermal=is_thermal)
            elif is_sentinel:
                return PreprocessingService.apply_sentinel_offset(
                    dataset,
                    processing_baseline=processing_baseline,
                    acquisition_date=acquisition_date
                )

        return dataset

    @staticmethod
    def apply_brdf_nbar(
        reflectance: Any,
        band: str = "B04",
        solar_zenith_deg: float = 38.2,
        view_zenith_deg: float = 7.5,
        relative_azimuth_deg: float = 45.0,
        target_solar_zenith_deg: float = 45.0,
        kernel_model: str = "ross_thick_li_sparse"
    ) -> Any:
        """Applies Ross-Thick Li-Sparse BRDF kernel normalization to standard nadir view (NBAR)."""
        from app.models.schemas import calculate_brdf_nbar_correction
        if isinstance(reflectance, (int, float, np.number)):
            calc = calculate_brdf_nbar_correction(
                band=band,
                solar_zenith_deg=solar_zenith_deg,
                view_zenith_deg=view_zenith_deg,
                relative_azimuth_deg=relative_azimuth_deg,
                target_solar_zenith_deg=target_solar_zenith_deg,
                observed_reflectance=float(reflectance),
                kernel_model=kernel_model
            )
            return calc["nbar_reflectance"]

        arr = np.asarray(reflectance, dtype=np.float32)
        calc = calculate_brdf_nbar_correction(
            band=band,
            solar_zenith_deg=solar_zenith_deg,
            view_zenith_deg=view_zenith_deg,
            relative_azimuth_deg=relative_azimuth_deg,
            target_solar_zenith_deg=target_solar_zenith_deg,
            observed_reflectance=0.185,
            kernel_model=kernel_model
        )
        c_brdf = calc["brdf_correction_factor"]
        return np.clip(arr * c_brdf, 0.0, 1.0)

    @staticmethod
    def apply_topographic_minnaert(
        reflectance: Any,
        solar_zenith_deg: float = 36.5,
        solar_azimuth_deg: float = 142.0,
        slope_deg: float = 24.5,
        aspect_deg: float = 160.0,
        minnaert_k: float = 0.72,
        method: str = "minnaert",
        c_parameter: float = 0.18
    ) -> Any:
        """Applies Minnaert or C-correction topographic radiometric illumination normalization."""
        from app.models.schemas import calculate_local_incidence_angle
        inc_angle_deg, cos_i = calculate_local_incidence_angle(
            solar_zenith_deg, solar_azimuth_deg, slope_deg, aspect_deg
        )
        ts_rad = math.radians(max(0.0, min(89.0, float(solar_zenith_deg))))
        cos_ts = math.cos(ts_rad)
        eff_cos_i = max(0.05, cos_i)
        k_exp = max(0.05, min(1.0, float(minnaert_k)))
        c_val = max(0.01, min(2.0, float(c_parameter)))

        m_lower = str(method).lower()
        if m_lower == "minnaert":
            factor = (cos_ts / eff_cos_i) ** k_exp
        elif m_lower in ("c_correction", "c-correction"):
            factor = (cos_ts + c_val) / (eff_cos_i + c_val)
        else:
            factor = cos_ts / eff_cos_i

        factor_clamped = max(0.25, min(4.0, factor))
        if isinstance(reflectance, (int, float, np.number)):
            return float(np.clip(float(reflectance) * factor_clamped, 0.0, 1.0))

        arr = np.asarray(reflectance, dtype=np.float32)
        return np.clip(arr * factor_clamped, 0.0, 1.0)

    @staticmethod
    def compute_dem_slope_aspect_arrays(
        elevation: np.ndarray,
        cell_size_x: float = 30.0,
        cell_size_y: float = 30.0,
        z_factor: float = 1.0
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Calculates pixel-wise slope (degrees), aspect (degrees from North), and unit surface normal vectors.

        Uses Horn's 3x3 finite-difference convolution kernels:
            p = dz/dx, q = dz/dy
            slope = arctan(sqrt(p^2 + q^2)) in degrees [0, 90]
            aspect = (degrees(arctan2(-p, -q))) % 360 (-1 for flat terrain)
            normal_vector = (-p, -q, 1) / sqrt(1 + p^2 + q^2)

        Parameters:
            elevation: 2D float32 raster array of DEM elevations (m)
            cell_size_x: East-West grid pixel spacing in meters (default: 30.0m)
            cell_size_y: North-South grid pixel spacing in meters (default: 30.0m)
            z_factor: Vertical exaggeration scaling factor (default: 1.0)

        Returns:
            Tuple of (slope_deg, aspect_deg, normal_vectors) where normal_vectors has shape (H, W, 3).
        """
        from scipy.ndimage import correlate

        elev_arr = np.asarray(elevation, dtype=np.float32)
        dx = max(float(cell_size_x), 0.1)
        dy = max(float(cell_size_y), 0.1)
        zf = max(float(z_factor), 1e-4)

        # Horn's 3x3 convolution weights
        kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) / (8.0 * dx) * zf
        ky = np.array([[1, 2, 1], [0, 0, 0], [-1, -2, -1]], dtype=np.float32) / (8.0 * dy) * zf

        dz_dx = correlate(elev_arr, kx, mode="nearest")
        dz_dy = correlate(elev_arr, ky, mode="nearest")

        mag = np.sqrt(dz_dx**2 + dz_dy**2)
        slope_rad = np.arctan(mag)
        slope_deg = np.degrees(slope_rad).astype(np.float32)

        # Downhill aspect clockwise from North [0, 360], -1 for flat terrain
        aspect_deg = np.where(mag < 1e-7, -1.0, (np.degrees(np.arctan2(-dz_dx, -dz_dy))) % 360.0).astype(np.float32)

        # Unit surface normal vectors: n = (-p, -q, 1) / sqrt(1 + p^2 + q^2)
        norm_denom = np.sqrt(1.0 + dz_dx**2 + dz_dy**2)
        nx = (-dz_dx / norm_denom).astype(np.float32)
        ny = (-dz_dy / norm_denom).astype(np.float32)
        nz = (1.0 / norm_denom).astype(np.float32)
        normal_vectors = np.stack([nx, ny, nz], axis=-1)

        return slope_deg, aspect_deg, normal_vectors

    @staticmethod
    def compute_local_incidence_array(
        slope_deg: np.ndarray,
        aspect_deg: np.ndarray,
        solar_zenith_deg: float,
        solar_azimuth_deg: float
    ) -> np.ndarray:
        """Calculates pixel-wise local solar incidence cosine cos(i) on sloping terrain.

        Formula:
            cos(i) = cos(theta_s) * cos(alpha) + sin(theta_s) * sin(alpha) * cos(phi_s - beta)

        Parameters:
            slope_deg: 2D array of terrain slope angles in degrees [0, 90]
            aspect_deg: 2D array of terrain downhill aspect in degrees [0, 360] (-1 for flat)
            solar_zenith_deg: Solar zenith angle theta_s in degrees [0, 90]
            solar_azimuth_deg: Solar azimuth angle phi_s in degrees clockwise from North [0, 360]

        Returns:
            2D float32 array of cos(i) values clamped strictly to [-1.0, 1.0].
            Values <= 0 indicate self-shadow slopes facing away from the sun.
        """
        zenith_rad = math.radians(max(0.0, min(90.0, float(solar_zenith_deg))))
        sun_azimuth_rad = math.radians(float(solar_azimuth_deg) % 360.0)

        s_arr = np.asarray(slope_deg, dtype=np.float32)
        a_arr = np.asarray(aspect_deg, dtype=np.float32)

        slope_rad = np.radians(np.clip(s_arr, 0.0, 90.0))
        aspect_rad = np.radians(np.clip(a_arr, 0.0, 360.0))

        cos_zenith = math.cos(zenith_rad)
        sin_zenith = math.sin(zenith_rad)

        cos_i = cos_zenith * np.cos(slope_rad) + sin_zenith * np.sin(slope_rad) * np.cos(sun_azimuth_rad - aspect_rad)

        # On flat terrain (slope <= 1e-6 or aspect < 0), cos(i) = cos(theta_s)
        flat_mask = (s_arr <= 1e-6) | (a_arr < 0.0)
        cos_i = np.where(flat_mask, cos_zenith, cos_i)

        return np.clip(cos_i, -1.0, 1.0).astype(np.float32)

    @staticmethod
    def estimate_band_c_factor(
        radiance: np.ndarray,
        cos_i: np.ndarray,
        valid_mask: Optional[np.ndarray] = None,
        default_c: float = 0.08,
        min_cos_i: float = 0.05,
        max_cos_i: float = 0.95
    ) -> float:
        """Estimates empirical C parameter c = b/m via ordinary least squares regression L = m * cos(i) + b.

        Parameters:
            radiance: 2D array of band surface reflectance / radiance
            cos_i: 2D array of local incidence cosines
            valid_mask: Optional boolean mask of valid pixels (e.g. non-water, non-cloud)
            default_c: Fallback C value if regression is singular or slope is non-positive
            min_cos_i: Lower cos(i) bound for regression sample selection
            max_cos_i: Upper cos(i) bound for regression sample selection

        Returns:
            Empirical c factor bounded in [0.001, 1.0].
        """
        rad_flat = np.asarray(radiance, dtype=np.float32).ravel()
        cos_flat = np.asarray(cos_i, dtype=np.float32).ravel()

        mask = np.isfinite(rad_flat) & np.isfinite(cos_flat) & (rad_flat > 0.001) & (cos_flat >= min_cos_i) & (cos_flat <= max_cos_i)
        if valid_mask is not None:
            mask = mask & np.asarray(valid_mask, dtype=bool).ravel()

        y = rad_flat[mask]
        x = cos_flat[mask]

        if len(y) < 10:
            return default_c

        # Subsample if large array for high performance
        if len(y) > 5000:
            step = len(y) // 5000
            y = y[::step]
            x = x[::step]

        n = float(len(y))
        sum_x = float(np.sum(x))
        sum_y = float(np.sum(y))
        sum_xx = float(np.sum(x * x))
        sum_xy = float(np.sum(x * y))

        denom = n * sum_xx - sum_x * sum_x
        if abs(denom) < 1e-9:
            return default_c

        m = (n * sum_xy - sum_x * sum_y) / denom
        b = (sum_y - m * sum_x) / n

        if m > 1e-6 and b >= 0.0:
            c = b / m
            return round(float(max(0.001, min(1.0, c))), 4)

        return default_c

    @staticmethod
    def estimate_band_minnaert_k(
        radiance: np.ndarray,
        cos_i: np.ndarray,
        solar_zenith_deg: float,
        valid_mask: Optional[np.ndarray] = None,
        default_k: float = 0.65,
        min_cos_i: float = 0.05
    ) -> float:
        """Estimates Minnaert empirical exponent k via logarithmic linear regression:
        ln(L) = ln(L_n) + k * ln(cos(i) / cos(theta_s)).
        """
        zenith_rad = math.radians(max(0.0, min(89.0, float(solar_zenith_deg))))
        cos_sz = math.cos(zenith_rad)

        rad_flat = np.asarray(radiance, dtype=np.float32).ravel()
        cos_flat = np.asarray(cos_i, dtype=np.float32).ravel()

        mask = np.isfinite(rad_flat) & np.isfinite(cos_flat) & (rad_flat > 0.001) & (cos_flat >= min_cos_i)
        if valid_mask is not None:
            mask = mask & np.asarray(valid_mask, dtype=bool).ravel()

        y_raw = rad_flat[mask]
        x_raw = cos_flat[mask]

        if len(y_raw) < 10:
            return default_k

        if len(y_raw) > 5000:
            step = len(y_raw) // 5000
            y_raw = y_raw[::step]
            x_raw = x_raw[::step]

        # Log transform
        y = np.log(np.maximum(1e-5, y_raw))
        x = np.log(np.maximum(1e-5, x_raw / cos_sz))

        n = float(len(y))
        sum_x = float(np.sum(x))
        sum_y = float(np.sum(y))
        sum_xx = float(np.sum(x * x))
        sum_xy = float(np.sum(x * y))

        denom = n * sum_xx - sum_x * sum_x
        if abs(denom) < 1e-9:
            return default_k

        k = (n * sum_xy - sum_x * sum_y) / denom
        if k > 0.01:
            return round(float(max(0.05, min(1.0, k))), 4)

        return default_k

    @classmethod
    def apply_topographic_solar_correction(
        cls,
        reflectance: Any,
        cos_i: Any,
        slope_deg: Any,
        solar_zenith_deg: float,
        method: str = "c_correction",
        c_factor: float = 0.08,
        minnaert_k: float = 0.65,
        cos_i_min: float = 0.05,
        mask_self_shadow: bool = True,
        mask: Optional[np.ndarray] = None
    ) -> Any:
        """Applies vectorized topographic solar illumination correction across arbitrary raster arrays.

        Supported algorithms:
            - 'none': Unmodified surface reflectance baseline
            - 'cosine', 'cosine_lambertian': Teillet et al. (1982) Lambertian cosine correction
            - 'c_correction': Teillet et al. (1982) semi-empirical diffuse skylight C-correction
            - 'minnaert': Minnaert (1941) / Smith et al. (1980) empirical power law
            - 'scs_c', 'scs_plus_c': Soenen et al. (2005) Sun-Canopy-Sensor with C-correction
            - 'scs': Gu & Gillespie (1998) Sun-Canopy-Sensor canopy sunlit projection

        Parameters:
            reflectance: Surface reflectance raster array or scalar
            cos_i: Local solar incidence cosine array or scalar in [-1.0, 1.0]
            slope_deg: Terrain slope angle array or scalar in degrees [0, 90]
            solar_zenith_deg: Solar zenith angle theta_s in degrees [0, 90]
            method: Topographic correction algorithm identifier
            c_factor: Semi-empirical C parameter (c = b/m)
            minnaert_k: Minnaert constant k in (0, 1]
            cos_i_min: Minimum denominator threshold to prevent division-by-zero
            mask_self_shadow: Whether pixels facing away from sun (cos_i <= 0) are zeroed out
            mask: Optional boolean exclusion mask (e.g. water bodies) left uncorrected

        Returns:
            Corrected surface reflectance array or scalar in [0.0, 1.0].
        """
        m_lower = str(method).lower().strip()
        if m_lower == "none":
            return reflectance

        zenith_rad = math.radians(max(0.0, min(89.9, float(solar_zenith_deg))))
        cos_sz = math.cos(zenith_rad)

        rad_arr = np.asarray(reflectance, dtype=np.float32)
        ci_arr = np.asarray(cos_i, dtype=np.float32)
        sl_arr = np.asarray(slope_deg, dtype=np.float32)
        c_val = max(0.0, float(c_factor))
        k_val = max(0.01, min(1.0, float(minnaert_k)))
        ci_floor = max(0.001, float(cos_i_min))

        slope_rad = np.radians(np.clip(sl_arr, 0.0, 90.0))
        cos_slope = np.cos(slope_rad)

        if m_lower in ("cosine", "cosine_lambertian"):
            denom = np.maximum(ci_floor, ci_arr)
            factor = cos_sz / denom
        elif m_lower == "minnaert":
            denom = np.maximum(ci_floor, ci_arr)
            ratio = np.maximum(0.0, cos_sz / denom)
            factor = np.power(ratio, k_val)
        elif m_lower in ("scs_c", "scs_plus_c", "sun_canopy_sensor", "sun-canopy-sensor"):
            if c_val <= 1e-7:
                denom = np.maximum(ci_floor, ci_arr)
                factor = (cos_sz * cos_slope) / denom
            else:
                denom = np.maximum(1e-6, ci_arr + c_val)
                factor = (cos_sz * cos_slope + c_val) / denom
        elif m_lower == "scs":
            denom = np.maximum(ci_floor, ci_arr)
            factor = (cos_sz * cos_slope) / denom
        else:  # default to c_correction
            if c_val <= 1e-7:
                denom = np.maximum(ci_floor, ci_arr)
                factor = cos_sz / denom
            else:
                denom = np.maximum(1e-6, ci_arr + c_val)
                factor = (cos_sz + c_val) / denom

        # Bounding factor to avoid extreme numerical explosion on grazing angles
        factor = np.clip(factor, 0.0, 8.0)
        corrected = np.clip(rad_arr * factor, 0.0, 1.0)

        # Self-shadow suppression
        if mask_self_shadow:
            self_shadow_mask = (ci_arr <= 0.0)
            corrected = np.where(self_shadow_mask, 0.0, corrected)

        # Preserve uncorrected pixels where mask is False (e.g. water bodies)
        if mask is not None:
            m = np.asarray(mask, dtype=bool)
            corrected = np.where(m, corrected, rad_arr)

        if isinstance(reflectance, (int, float, np.number)):
            return float(corrected)

        return corrected.astype(np.float32)


preprocessing_service = PreprocessingService()

