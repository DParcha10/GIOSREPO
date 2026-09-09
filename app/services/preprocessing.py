"""Sensor-specific masking and normalisation service."""
import numpy as np

class PreprocessingService:
    @staticmethod
    def mask_landsat_qa(dataset):
        """Bitwise mask for Landsat Collection 2 QA_PIXEL."""
        if "qa_pixel" in dataset:
            qa = dataset["qa_pixel"]
            # Bits: 1=dilated cloud, 3=cloud, 4=cloud shadow
            cloud_mask = (qa & (1 << 1)) | (qa & (1 << 3)) | (qa & (1 << 4))
            for var in dataset.data_vars:
                if var != "qa_pixel":
                    dataset[var] = dataset[var].where(cloud_mask == 0)
        return dataset

    @staticmethod
    def mask_sentinel_scl(dataset):
        """Scene Classification Layer (SCL) mask for Sentinel-2."""
        if "scl" in dataset:
            scl = dataset["scl"]
            # Invalid/cloud classes: 0 (no data), 1 (defective), 3 (cloud shadow), 8 (cloud med), 9 (cloud high), 10 (cirrus)
            invalid = (scl == 0) | (scl == 1) | (scl == 3) | (scl == 8) | (scl == 9) | (scl == 10)
            for var in dataset.data_vars:
                if var != "scl":
                    dataset[var] = dataset[var].where(~invalid)
        return dataset

    @staticmethod
    def normalise_reflectance(dataset, collection: str):
        """Normalises surface reflectance to 0-1 scale."""
        if "landsat" in collection.lower():
            for var in dataset.data_vars:
                if var != "qa_pixel":
                    dataset[var] = dataset[var] * 0.0000275 - 0.2
        elif "sentinel" in collection.lower():
            for var in dataset.data_vars:
                if var != "scl":
                    dataset[var] = dataset[var] * 0.0001
        return dataset

preprocessing_service = PreprocessingService()
