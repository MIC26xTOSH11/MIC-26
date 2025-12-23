import asyncio
import os
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, Optional
from uuid import uuid4

import httpx
from fastapi.concurrency import run_in_threadpool

from ..models.detection import DetectorEngine
from ..models.graph_intel import GraphIntelEngine
from ..models.watermark import WatermarkEngine
from ..schemas import ContentIntake, DetectionResult
from ..storage.database import Database


class AnalysisOrchestrator:
    def __init__(self) -> None:
        self.detector = DetectorEngine()
        self.watermark = WatermarkEngine()
        self.graph = GraphIntelEngine()
        self.db = Database()
        self._event_queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue(maxsize=200)

    async def process_intake(self, intake: ContentIntake) -> DetectionResult:
        return await run_in_threadpool(self._process_sync, intake)

    def _process_sync(self, intake: ContentIntake) -> DetectionResult:
        intake_id = str(uuid4())
        submitted_at = datetime.utcnow()

        composite_score, classification, breakdown = self.detector.detect(intake)
        provenance = self.watermark.verify(intake.text)
        graph_summary = self.graph.ingest(intake_id, intake, classification, composite_score)

        summary_text = self._generate_summary(intake, classification, composite_score, breakdown)
        decision_reason = self._build_decision_reason(classification, composite_score, breakdown)

        self.db.save_case(
            intake_id=intake_id,
            raw_text=intake.text,
            classification=classification,
            composite_score=composite_score,
            metadata=intake.dict().get("metadata", {}) or {},
            breakdown=breakdown.dict(),
            provenance=provenance.dict(),
            summary=summary_text,
            decision_reason=decision_reason,
        )
        self.db.log_action(
            intake_id=intake_id,
            action="analysis_completed",
            actor="system",
            payload={"score": composite_score, "classification": classification},
        )

        # Store fingerprint for post-hoc verification
        try:
            self.db.store_fingerprint(intake_id, intake.text, provenance.content_hash)
        except Exception:
            # non-fatal; continue
            pass

        result = DetectionResult(
            intake_id=intake_id,
            submitted_at=submitted_at,
            composite_score=composite_score,
            classification=classification,
            breakdown=breakdown,
            provenance=provenance,
            graph_summary=graph_summary,
            summary=summary_text,
            findings=breakdown.heuristics[:5] if breakdown.heuristics else None,
            decision_reason=decision_reason,
        )

        self._emit_event(
            {
                "type": "analysis_completed",
                "intake_id": intake_id,
                "score": composite_score,
                "classification": classification,
                "submitted_at": submitted_at.isoformat(),
            }
        )
        return result

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        while True:
            event = await self._event_queue.get()
            yield event

    def check_fingerprint(self, text: str) -> list[Dict[str, Any]]:
        return self.db.check_fingerprint(text)

    async def _fetch_case_from_main_api(self, intake_id: str) -> Optional[Dict[str, Any]]:
        """Fetch case data from main API if not found locally (for federated nodes)."""
        main_api_url = os.getenv("MAIN_API_URL", "http://localhost:8000")
        # Don't fetch from self
        if main_api_url == os.getenv("NODE_URL"):
            return None
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{main_api_url}/api/v1/cases/{intake_id}")
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "classification": data.get("classification"),
                        "composite_score": data.get("composite_score"),
                        "created_at": data.get("submitted_at"),
                        "metadata": data.get("metadata", {}),
                    }
        except Exception as e:
            print(f"Failed to fetch case from main API: {e}")
        return None

    # Sharing feature removed - focusing on text disinformation MVP
    # async def build_sharing_package() method was here

    def _generate_summary(
        self,
        intake: ContentIntake,
        classification: str,
        composite_score: float,
        breakdown,
    ) -> str:
        metadata = intake.metadata.dict() if intake.metadata else {}
        platform = metadata.get("platform") or intake.source or "an unspecified platform"
        region = metadata.get("region") or "an unspecified region"
        score_pct = f"{max(0, min(100, round(composite_score * 100)))}%"
        heuristics = (breakdown.heuristics or [])[:2]
        if heuristics:
            heuristics_text = "; ".join(heuristics)
            heuristics_sentence = f"Key signals: {heuristics_text}."
        else:
            heuristics_sentence = "No heuristics were triggered during analysis."
        ai_prob = breakdown.ai_probability
        ai_clause = ""
        if isinstance(ai_prob, (int, float)):
            ai_clause = f" AI detector confidence registered at {max(0, min(100, round(ai_prob * 100)))}%."
        return (
            f"{classification.title()} classification for a narrative originating from {region} "
            f"on {platform}. Composite risk scored {score_pct}.{ai_clause} {heuristics_sentence}"
        )

    def _build_decision_reason(
        self,
        classification: str,
        composite_score: float,
        breakdown,
    ) -> str:
        heuristics = breakdown.heuristics or []
        reason_parts: list[str] = []
        if heuristics:
            primary = "; ".join(heuristics[:3])
            reason_parts.append(f"Triggered heuristics: {primary}.")
        ai_prob = breakdown.ai_probability
        if isinstance(ai_prob, (int, float)):
            reason_parts.append(
                f"AI detector flagged a {max(0, min(100, round(ai_prob * 100)))}% likelihood."
            )
        behavior = breakdown.behavioral_score
        if isinstance(behavior, (int, float)) and behavior > 0.5:
            reason_parts.append(
                "Behavioral cues indicated urgent or coordinated language patterns."
            )
        if not reason_parts:
            reason_parts.append(
                f"Composite risk score of {max(0, min(100, round(composite_score * 100)))}% exceeded the {classification.lower()} threshold."
            )
        return " ".join(reason_parts)

    def _emit_event(self, event: Dict[str, Any]) -> None:
        try:
            self._event_queue.put_nowait(event)
        except asyncio.QueueFull:
            # Drop oldest if backpressure occurs
            self._event_queue.get_nowait()
            self._event_queue.put_nowait(event)
