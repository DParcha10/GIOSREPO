"""GIOS — Geospatial Integrated Orthomosaic Systems
Main Application Server (FastAPI + Static Frontend Server).
"""
import os
import logging
from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.api.api import api_router
from app.database import engine, Base, seed_default_users
from app.api.routes import auth, iot
from app.services import reporting
from app.api.routes import spatial, drone, wildfire
from app.models.schemas import HealthResponse

# Initialize DB tables
Base.metadata.create_all(bind=engine)
seed_default_users()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gios")

# Background Daemon for Data Anomaly Detection (Agent 2)
async def data_anomaly_daemon():
    from app.services.integration import integration_service
    from app.services.event_service import event_service
    from app.services.drone_service import drone_service
    
    logger.info("Agent 2 (Data Anomaly Daemon) initialized.")
    while True:
        try:
            # logger.info("[Agent 2] Scanning real-time telemetry streams for spatial anomalies...")
            events = event_service.list_events()
            for event in events:
                usgs_station = event.get("usgs_station")
                if not usgs_station:
                    continue
                
                data = await integration_service.get_usgs_station(usgs_station)
                discharge = data.get("discharge_cfs")
                
                if discharge and discharge > 2000.0:
                    # Check if mission already active for this event
                    active = False
                    for m in drone_service.active_missions.values():
                        if m.get("event_id") == event["id"] and m.get("status") != "COMPLETED":
                            active = True
                            break
                    
                    if not active:
                        logger.warning(f"[Agent 2] AI Anomaly Detection: Threshold breached at {usgs_station} (Discharge: {discharge}). Autonomously scheduling drone.")
                        drone_service.schedule_mission(
                            event_id=event["id"],
                            lat=event["lat"],
                            lng=event["lng"],
                            radius_km=1.0
                        )
            
            # Progress active simulated drone missions
            drone_service.simulate_missions()
            
            await asyncio.sleep(60) # Run every 60 seconds
        except asyncio.CancelledError:
            logger.info("Agent 2 shutting down.")
            break
        except Exception as e:
            logger.error(f"Agent 2 Error: {e}")
            await asyncio.sleep(5)

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("GIOS Platform starting up...")
    seed_default_users()
    from app.services.alerting import alert_engine
    alert_engine.start()
    
    # Spawn background agent
    daemon_task = asyncio.create_task(data_anomaly_daemon())
    
    yield
    
    daemon_task.cancel()
    try:
        alert_engine.scheduler.shutdown(wait=False)
    except Exception:
        pass
    from app.utils.cache import cache_manager
    cache_manager.close()
    logger.info("GIOS Platform shutting down...")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Hierarchical Environmental & Geotechnical Hazard Intelligence Engine",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(iot.router, prefix="/api/v1")
app.include_router(reporting.router, prefix="/api/v1")
app.include_router(spatial.router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse, tags=["System"])
@limiter.limit("10/minute")
def health_check(request: Request):
    return {
        "status": "healthy",
        "platform": settings.app_name,
        "version": settings.app_version,
        "active_modules": ["stac_acquisition", "indices", "timeseries", "usgs_nwis", "drone_cogs", "event_catalog"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
