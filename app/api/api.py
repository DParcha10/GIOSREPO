from fastapi import APIRouter
from app.api.routes import data, analysis, timeseries, integration, events, drone, agent, satellite

api_router = APIRouter()
api_router.include_router(events.router)
api_router.include_router(data.router)
api_router.include_router(analysis.router)
api_router.include_router(analysis.tiles_router)
api_router.include_router(timeseries.router)
api_router.include_router(integration.router)
api_router.include_router(drone.router)
api_router.include_router(agent.router)
api_router.include_router(satellite.router)

