from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import IndexRequest, IndexResultSummary
import numpy as np

router = APIRouter(prefix="/analysis", tags=["Analysis & Indices"])

@router.post("/indices", response_model=IndexResultSummary)
def compute_spectral_index(req: IndexRequest):
    # Base simulated response for rapid frontend visualization & testing
    val_map = {"ndmi": 0.48, "mndwi": 0.35, "ndci": 0.62, "ndvi": 0.58, "lst": 28.4, "nbr": 0.12}
    base_val = val_map.get(req.index.value, 0.45)
    
    return {
        "index": req.index.value,
        "mean": round(base_val + float(np.random.normal(0, 0.03)), 3),
        "median": round(base_val, 3),
        "min": round(base_val - 0.25, 3),
        "max": round(base_val + 0.35, 3),
        "std": 0.08,
        "valid_pixels": 452000,
        "timestamp": datetime.utcnow().isoformat()
    }
