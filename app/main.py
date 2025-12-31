import json
import logging
import os
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
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
from .auth.middleware import role_protection, get_current_user, require_permission
from .auth.schemas import LoginRequest, LoginResponse, UserInfo, SignupRequest, SignupResponse
from .auth.users import authenticate_user, get_user_permissions, create_user
from .auth.jwt_handler import create_access_token

# GeoIP detection
try:
    import geoip2.database
    import geoip2.errors
    GEOIP_AVAILABLE = True
except ImportError:
    GEOIP_AVAILABLE = False
    logger.warning("geoip2 library not available. Install with: pip install geoip2")

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

# Initialize GeoIP reader
geoip_reader = None
if GEOIP_AVAILABLE:
    # Try to load GeoLite2 City database from multiple possible locations
    possible_paths = [
        Path("data/GeoLite2-City.mmdb"),
        Path("/usr/share/GeoIP/GeoLite2-City.mmdb"),
        Path("/var/lib/GeoIP/GeoLite2-City.mmdb"),
        Path("GeoLite2-City.mmdb"),
    ]
    
    for db_path in possible_paths:
        if db_path.exists():
            try:
                geoip_reader = geoip2.database.Reader(str(db_path))
                logger.info(f"GeoIP database loaded from {db_path}")
                break
            except Exception as e:
                logger.warning(f"Failed to load GeoIP database from {db_path}: {e}")
    
    if geoip_reader is None:
        logger.warning(
            "GeoLite2 database not found. Download from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data "
            "and place GeoLite2-City.mmdb in the 'data' directory or /usr/share/GeoIP/"
        )


def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request, handling proxy headers for Azure deployments
    """
    # Check for Azure/proxy forwarded IP headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one (original client)
        return forwarded_for.split(",")[0].strip()
    
    # Check for other common proxy headers
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct client host
    return request.client.host if request.client else "127.0.0.1"


def detect_location_from_ip(ip_address: str) -> dict:
    """
    Detect location from IP address using MaxMind GeoLite2
    Returns dict with city, country, and coordinates
    """
    # Handle private/local IPs first (before checking database)
    # RFC 1918 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    is_private = (
        ip_address in ["127.0.0.1", "localhost", "::1"] or
        ip_address.startswith("10.") or
        ip_address.startswith("192.168.") or
        (ip_address.startswith("172.") and 16 <= int(ip_address.split(".")[1]) <= 31)
    )
    
    if is_private:
        return {
            "city": "Local",
            "country": "Local",
            "region": "Local Network",
            "latitude": None,
            "longitude": None,
            "note": "Development environment - private IP address"
        }
    
    # For non-local IPs, require the database
    if not geoip_reader:
        return {
            "city": None,
            "country": None,
            "region": None,
            "latitude": None,
            "longitude": None,
            "error": "GeoIP database not available. See docs/GEOIP_SETUP.md for setup instructions."
        }
    
    try:
        response = geoip_reader.city(ip_address)
        
        # Build region string (City, State/Province if available)
        region_parts = []
        if response.city.name:
            region_parts.append(response.city.name)
        if response.subdivisions.most_specific.name:
            region_parts.append(response.subdivisions.most_specific.name)
        
        region = ", ".join(region_parts) if region_parts else response.country.name
        
        return {
            "city": response.city.name,
            "country": response.country.name,
            "country_code": response.country.iso_code,
            "region": region,
            "latitude": response.location.latitude,
            "longitude": response.location.longitude,
            "postal_code": response.postal.code,
            "error": None
        }
    except geoip2.errors.AddressNotFoundError:
        return {
            "city": None,
            "country": None,
            "region": None,
            "latitude": None,
            "longitude": None,
            "error": "IP address not found in database"
        }
    except Exception as e:
        logger.error(f"GeoIP lookup error: {e}")
        return {
            "city": None,
            "country": None,
            "region": None,
            "latitude": None,
            "longitude": None,
            "error": str(e)
        }



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


# ==================== GeoIP Location Endpoint ====================

@app.get("/api/v1/location")
async def get_user_location(request: Request):
    """
    Auto-detect user's location based on IP address
    Uses MaxMind GeoLite2 database
    Safe for Azure deployments with proxy header support
    """
    client_ip = get_client_ip(request)
    location = detect_location_from_ip(client_ip)
    
    return {
        "ip": client_ip,
        "location": location,
        "detected": location.get("region") is not None
    }


# ==================== Authentication Endpoints ====================

@app.post("/api/v1/auth/signup", response_model=SignupResponse)
async def signup(payload: SignupRequest):
    """
    Create a new user account
    Supports both individual and enterprise roles
    """
    success, message = create_user(
        username=payload.username,
        password=payload.password,
        role=payload.role,
        db=database_l1
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    
    return SignupResponse(
        message=message,
        username=payload.username.lower(),
        role=payload.role,
    )


@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """
    Authenticate user and return JWT token
    Supports both individual and enterprise roles
    """
    user = authenticate_user(payload.username, payload.password, db=database_l1)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token with user info
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=user["username"],
        role=user["role"],
    )


@app.get("/api/v1/auth/me", response_model=UserInfo)
async def get_current_user_info(user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return UserInfo(
        username=user["username"],
        role=user["role"],
        permissions=user["permissions"],
    )


# ==================== Content Analysis Endpoints ====================


@app.post("/api/v1/intake", response_model=DetectionResult)
async def submit_content(
    request: Request,
    payload: ContentIntake,
    _: Settings = Depends(get_app_settings),
):
    # Role check: Only allow users with 'upload_content' permission
    user_id = await role_protection(request, "upload_content")
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
    # Role check: Only allow users with 'view_dashboard' permission
    user_id = await role_protection(request, "view_dashboard")
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
async def stream_events(request: Request):
    logger.info(f"[SSE] Client connected from {request.client.host}")
    
    async def event_generator():
        try:
            async for event in orchestrator.stream_events():
                logger.info(f"[SSE] Sending event to client: {event}")
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"[SSE] Error in event generator: {e}")
            raise

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


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
    """Retrieve immutable audit trail for a case. Enterprise only."""
    # Enterprise-only feature
    user_id = await role_protection(request, "view_detailed_reports")
    audit_entries = database_l1.get_audit_trail(intake_id)
    return {"intake_id": intake_id, "audit_trail": audit_entries}


@app.get("/api/v1/cases")
async def list_cases(request: Request, limit: int = 50):
    """List all analyzed cases for dashboard display."""
    user_id = await role_protection(request, "view_dashboard")
    cases = database_l1.list_cases(limit=limit)
    return {"cases": cases, "count": len(cases)}


@app.get("/api/v1/export/cases")
async def export_cases(request: Request, format: str = "json"):
    """Export all cases data. Enterprise only."""
    # Enterprise-only feature
    user_id = await role_protection(request, "export_data")
    cases = database_l1.list_cases(limit=1000)
    
    if format == "json":
        return {"cases": cases, "count": len(cases), "exported_by": user_id}
    else:
        # Could add CSV export here
        return {"cases": cases, "count": len(cases), "exported_by": user_id}


# ==================== End of API Routes ====================



