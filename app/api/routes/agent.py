"""GIOS JARVIS Autonomous AI Agent Route.
Routes user messages through the JARVIS Brain (LLM-powered agent loop with tools).
Preserves the chat endpoint API contract for the frontend.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter
from fastapi.responses import EventSourceResponse
import json
import asyncio
from app.models.schemas import (
    AgentChatRequest, AgentChatResponse, AgentToolAction,
    MapAction, NavigationAction, MockAlertResponse
)
from app.services.jarvis_brain import process_message
from app.services.alerting import alert_queue, alert_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["JARVIS AI Copilot"])


@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_jarvis(req: AgentChatRequest):
    """
    JARVIS Autonomous Agentic Endpoint.
    Routes through the JARVIS Brain which:
    1. Selects the best available LLM provider (Gemini → OpenAI → Anthropic → Ollama → template)
    2. Runs a ReAct agent loop with tool calling (web search, data analysis, GIOS tools, map, nav)
    3. Synthesizes a natural conversational response
    """
    # Build history from request
    history = []
    if req.history:
        history = [{"role": h.role, "content": h.content} for h in req.history]

    # Process through JARVIS Brain
    result = await process_message(
        message=req.message.strip(),
        history=history,
        event_id=req.event_id
    )

    # Convert brain output to API response schema
    tool_calls = []
    for tc in result.get("tool_calls", []):
        try:
            tool_calls.append(AgentToolAction(
                tool=tc.get("tool", "unknown"),
                args=tc.get("args", {}),
                output=tc.get("output", {})
            ))
        except Exception:
            pass

    # Build map_action
    map_action_data = result.get("map_action")
    map_action = None
    if map_action_data and isinstance(map_action_data, dict):
        try:
            map_action = MapAction(
                action=map_action_data.get("action", "MARK"),
                lat=float(map_action_data.get("lat", 0)),
                lng=float(map_action_data.get("lng", 0)),
                zoom=int(map_action_data.get("zoom", 12)),
                label=str(map_action_data.get("label", "Marked")),
                event_id=map_action_data.get("event_id"),
                color=map_action_data.get("color", "#00ffaa")
            )
        except Exception as e:
            logger.warning("Could not build MapAction: %s", e)

    # Build navigation
    nav_data = result.get("navigation")
    navigation = None
    if nav_data and isinstance(nav_data, dict):
        try:
            navigation = NavigationAction(
                target_path=nav_data.get("target_path", "/map"),
                reason=nav_data.get("reason", "Autonomous navigation"),
                auto_switch=nav_data.get("auto_switch", True)
            )
        except Exception as e:
            logger.warning("Could not build NavigationAction: %s", e)

    suggested = [
        "What are the latest USGS flood warnings in Texas?",
        "Compare the anomaly readings across all 4 hazard sites",
        "Research recent papers on satellite-based dam monitoring",
        "Mark San Luis Dam on the map and analyze it",
        "What do you remember about me?"
    ]

    return AgentChatResponse(
        response=result.get("response", "Hello, my name is JARVIS. How can I help?"),
        tool_calls=tool_calls if tool_calls else None,
        map_action=map_action,
        navigation=navigation,
        memory_updates=result.get("memory_updates") or None,
        suggested_prompts=suggested,
        sources=result.get("sources") or None,
        data_analysis=result.get("data_analysis") or None,
        thinking=result.get("thinking")
    )


@router.get("/stream-alerts")
async def stream_alerts():
    """Server-Sent Events endpoint to stream proactive JARVIS alerts to the frontend."""
    async def event_generator():
        try:
            while True:
                try:
                    # Wait for a new alert with a timeout for heartbeat
                    alert = await asyncio.wait_for(alert_queue.get(), timeout=15.0)
                    yield {
                        "event": "message",
                        "data": json.dumps(alert)
                    }
                except asyncio.TimeoutError:
                    # Yield heartbeat to keep connection alive
                    yield {
                        "event": "ping",
                        "data": "keep-alive"
                    }
        except asyncio.CancelledError:
            logger.info("SSE client disconnected")
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            
    return EventSourceResponse(event_generator())


@router.post("/trigger-mock-alert", response_model=MockAlertResponse)
async def trigger_mock_alert():
    """Admin endpoint to mock a sensor spike for testing proactive alerts."""
    mock_data = {
        "site_id": "11262900",
        "discharge_cfs": 4500.0,
        "gage_height_ft": 28.5,
        "water_temp_c": 16.2
    }
    # Force alert engine state to trigger
    alert_engine.alert_state["11262900"] = "critical"
    # Create background task to avoid blocking the HTTP response while LLM generates alert
    asyncio.create_task(alert_engine.trigger_jarvis_alert("San Luis Dam", mock_data))
    return {"status": "success", "message": "Mock alert triggered. JARVIS is generating the briefing and will push via SSE."}
