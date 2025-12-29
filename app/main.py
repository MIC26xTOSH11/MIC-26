import json
import logging
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import Settings, get_settings
from .schemas import (
    ContentIntake,
    BaseModel,
    DetectionResult,
    SIEMCorrelationPayload,
    ThreatIntelFeed,
)
from .services.orchestrator import AnalysisOrchestrator
from .storage.database import Database
from .heatmap import router as heatmap_router, record_point
from .auth.middleware import role_protection

# Configure structured logging for demo mode / Azure pipeline visibility
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("TattvaDrishti")

settings = get_settings()
app = FastAPI(title=settings.app_name)
orchestrator = AnalysisOrchestrator()
database_l1 = Database()  # Write-enabled connection
database_l2 = Database()  # Read-only connection (simulated)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Heatmap API
app.include_router(heatmap_router)


@app.on_event("startup")
async def startup_event():
    """Ensure database is initialized on startup."""
    # Database init is already called in Database.__init__, but we verify it here
    # to surface any errors early
    try:
        database_l1._initialise()
    except Exception as e:
        print(f"Database initialization warning: {e}")


def get_app_settings() -> Settings:
    return settings


@app.get("/")
def root():
    return {"status": "TattvaDrishti API is live"}


@app.post("/api/v1/intake", response_model=DetectionResult)
async def submit_content(
    request: Request,
    payload: ContentIntake,
    _: Settings = Depends(get_app_settings),
):
    # Role check: Only allow users with 'upload' permission
    user_id = await role_protection(request, "upload")
    # Use L1 DB connection for all uploads
    db_conn = database_l1
    # Require region from intake
    region = None
    try:
        region = (payload.metadata.region if payload.metadata else None)
    except Exception:
        region = None
    if not region or not str(region).strip():
        raise HTTPException(status_code=400, detail="Region (city/district) is required.")

    # Demo mode logging: Azure AI pipeline trace
    logger.info("="*60)
    logger.info("🔵 AZURE AI ANALYSIS PIPELINE INITIATED")
    logger.info(f"📥 Intake ID: Processing new content submission")
    logger.info(f"📍 Region: {region}")
    logger.info(f"📝 Content length: {len(payload.text)} characters")

    result = await orchestrator.process_intake(payload)

    # Demo mode logging: Azure AI results summary
    breakdown = result.breakdown or {}
    logger.info("✅ ANALYSIS COMPLETE")
    logger.info(f"   └─ Azure OpenAI Score: {breakdown.azure_openai_risk or 'N/A'} (40% weight)")
    logger.info(f"   └─ Azure Content Safety: {breakdown.azure_safety_score or 'N/A'} (25% weight)")
    logger.info(f"   └─ Behavioral Score: {breakdown.behavioral_score or 'N/A'}")
    logger.info(f"📊 Enterprise Trust Risk Score: {result.composite_score}")
    logger.info(f"🏷️ Classification: {result.classification}")
    logger.info("="*60)

    # Normalize composite score and record point for heatmap (non-blocking)
    try:
        score = result.composite_score
        norm = int(round(score * 100)) if 0 <= score <= 1 else int(round(score))
        norm = max(0, min(100, norm))
        record_point(str(region).strip(), norm)
    except Exception:
        pass

    return result


@app.get("/api/v1/cases/{intake_id}", response_model=DetectionResult)
async def get_case(request: Request, intake_id: str):
    # Role check: Only allow users with 'dashboard' permission
    user_id = await role_protection(request, "dashboard")
    # Use L2 DB connection for dashboard/logs
    record = database_l2.fetch_case(intake_id)
    if not record:
        raise HTTPException(status_code=404, detail="Case not found")
    graph_snapshot = orchestrator.graph.summary()
    # reconstruct result for client convenience
    return DetectionResult.parse_obj(
        {
            "intake_id": intake_id,
            "submitted_at": record["created_at"],
            "composite_score": record["composite_score"],
            "classification": record["classification"],
            "breakdown": record["breakdown"],
            "provenance": record["provenance"],
            "graph_summary": graph_snapshot.dict(),
            "summary": record.get("summary"),
            "findings": (record.get("breakdown", {}).get("heuristics") or [])[:5],
            "decision_reason": record.get("decision_reason"),
        }
    )


@app.get("/api/v1/integrations/threat-intel", response_model=ThreatIntelFeed)
async def threat_intel_feed() -> ThreatIntelFeed:
    return orchestrator.graph.threat_intel_feed()


@app.get("/api/v1/integrations/siem", response_model=SIEMCorrelationPayload)
async def siem_feed() -> SIEMCorrelationPayload:
    return orchestrator.graph.siem_payload()


@app.get("/api/v1/events/stream")
async def stream_events():
    async def event_generator():
        async for event in orchestrator.stream_events():
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


class FingerprintCheckPayload(BaseModel):
    text: str


@app.post("/api/v1/fingerprint/check")
async def fingerprint_check(payload: FingerprintCheckPayload):
    matches = orchestrator.check_fingerprint(payload.text)
    return {"matches": matches}


# ==================== Analyst Decision Endpoints ====================

class AnalystDecisionPayload(BaseModel):
    """Payload for analyst decision actions (Flag/Monitor/Escalate)."""
    intake_id: str
    decision: str  # "flag", "monitor", "escalate", "dismiss"
    notes: str = ""
    analyst_id: str = "system"


@app.post("/api/v1/cases/{intake_id}/decision")
async def submit_analyst_decision(
    request: Request,
    intake_id: str,
    payload: AnalystDecisionPayload,
):
    """
    Record an analyst decision for a case.
    Valid decisions: flag, monitor, escalate, dismiss
    """
    # Verify case exists
    record = database_l1.fetch_case(intake_id)
    if not record:
        raise HTTPException(status_code=404, detail="Case not found")
    
    valid_decisions = {"flag", "monitor", "escalate", "dismiss"}
    if payload.decision.lower() not in valid_decisions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid decision. Must be one of: {', '.join(valid_decisions)}"
        )
    
    # Log the decision to audit trail
    database_l1.log_action(
        intake_id=intake_id,
        action=f"analyst_decision:{payload.decision.lower()}",
        actor=payload.analyst_id,
        payload={
            "decision": payload.decision.lower(),
            "notes": payload.notes,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        },
    )
    
    return {
        "status": "success",
        "intake_id": intake_id,
        "decision": payload.decision.lower(),
        "message": f"Case marked as '{payload.decision.lower()}' by analyst",
    }


@app.get("/api/v1/cases/{intake_id}/audit")
async def get_case_audit_trail(request: Request, intake_id: str):
    """Retrieve immutable audit trail for a case."""
    audit_entries = database_l1.get_audit_trail(intake_id)
    return {"intake_id": intake_id, "audit_trail": audit_entries}


@app.get("/api/v1/cases")
async def list_cases(request: Request, limit: int = 50):
    """List all analyzed cases for dashboard display."""
    cases = database_l1.list_cases(limit=limit)
    return {"cases": cases, "count": len(cases)}


# ==================== End of API Routes ====================



