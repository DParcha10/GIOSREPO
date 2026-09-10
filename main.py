"""GIOS — Geospatial Integrated Orthomosaic Systems
Main Application Server (FastAPI + Static Frontend Server).
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.api.api import api_router
from app.database import engine, Base
from app.api.routes import auth, iot
from app.services import reporting

# Initialize DB tables
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gios")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("GIOS Platform starting up...")
    yield
    logger.info("GIOS Platform shutting down...")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Hierarchical Environmental & Geotechnical Hazard Intelligence Engine",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(iot.router, prefix="/api/v1")
app.include_router(reporting.router, prefix="/api/v1")
app.include_router(api_router)  # Unversioned for direct frontend ease
app.include_router(auth.router)
app.include_router(iot.router)
app.include_router(reporting.router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "platform": settings.app_name,
        "version": settings.app_version,
        "active_modules": ["stac_acquisition", "indices", "timeseries", "usgs_nwis", "drone_cogs", "event_catalog"]
    }

# Mount static frontend files if directory exists
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
