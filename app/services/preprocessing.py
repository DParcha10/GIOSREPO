"""Sensor-specific masking and normalisation service."""
import gc
from typing import Optional, Union, Dict, Any
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
                qa_clean = np.nan_to_num(qa, nan=0)
                qa_int = qa_clean.astype(np.uint16)
                raw_mask = ((qa_int & bit_mask) != 0) | np.isnan(qa)
                del qa_clean
                del qa_int
                del qa
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
                del dilated_mask
                if hasattr(dataset, "attrs"):
                    dataset.attrs["cloud_shadow_masked"] = True
                gc.collect()
            return dataset
        
        # Handle dict of arrays or direct numpy array
        elif isinstance(dataset, dict):
            qa = dataset.get("qa_pixel", dataset.get("QA_PIXEL", dataset.get("qa")))
            if qa is not None:
                qa_arr = np.asarray(qa, dtype=np.uint16)
                bit_mask = 0
                for b in range(6):
                    bit_mask |= (1 << b)
                raw_mask = (qa_arr & bit_mask) != 0
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
                del qa_arr
            return dataset
        
        elif isinstance(dataset, np.ndarray):
            bit_mask = 0
            for b in range(6):
                bit_mask |= (1 << b)
            raw_mask = (dataset.astype(np.uint16) & bit_mask) != 0
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
                raw_mask = np.isin(scl, list(invalid_classes)) | np.isnan(scl)
                del scl
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
                raw_mask = np.isin(scl_arr, list(invalid_classes))
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
            raw_mask = np.isin(dataset, list(invalid_classes))
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

preprocessing_service = PreprocessingService()
