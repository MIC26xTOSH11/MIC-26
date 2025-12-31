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
        self._event_queues: list["asyncio.Queue[Dict[str, Any]]"] = []  # List of queues for broadcasting

    async def process_intake(self, intake: ContentIntake) -> DetectionResult:
        return await run_in_threadpool(self._process_sync, intake)

    def _process_sync(self, intake: ContentIntake) -> DetectionResult:
        intake_id = str(uuid4())
        submitted_at = datetime.utcnow()

        composite_score, classification, breakdown = self.detector.detect(intake)
        
        # Enhance breakdown with enterprise analytics fields
        breakdown = self._enhance_breakdown_with_analytics(breakdown, classification, composite_score)
        
        provenance = self.watermark.verify(intake.text)
        graph_summary = self.graph.ingest(intake_id, intake, classification, composite_score)

        summary_text = self._generate_summary(intake, classification, composite_score, breakdown)
        decision_reason = self._build_decision_reason(classification, composite_score, breakdown)

        stored_metadata = (intake.dict().get("metadata", {}) or {}).copy()
        # Persist intake-level fields so the frontend can render them reliably.
        stored_metadata.setdefault("language", intake.language)
        stored_metadata.setdefault("source", intake.source)
        stored_metadata.setdefault("tags", intake.tags)

        self.db.save_case(
            intake_id=intake_id,
            raw_text=intake.text,
            classification=classification,
            composite_score=composite_score,
            metadata=stored_metadata,
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

        event_data = {
            "type": "analysis_completed",
            "intake_id": intake_id,
            "score": composite_score,
            "classification": classification,
            "submitted_at": submitted_at.isoformat(),
        }
        print(f"[Orchestrator] Emitting event: {event_data}")
        self._emit_event(event_data)
        return result

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        # Create a new queue for this client
        queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue(maxsize=200)
        self._event_queues.append(queue)
        client_id = len(self._event_queues)
        print(f"[Orchestrator] Client {client_id} registered. Active clients: {len(self._event_queues)}")
        
        try:
            while True:
                event = await queue.get()
                print(f"[Orchestrator] Yielding event to client {client_id}: {event}")
                yield event
        finally:
            # Clean up when client disconnects
            if queue in self._event_queues:
                self._event_queues.remove(queue)
            print(f"[Orchestrator] Client {client_id} disconnected. Active clients: {len(self._event_queues)}")

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

    def _enhance_breakdown_with_analytics(self, breakdown, classification: str, composite_score: float):
        """Enhance breakdown with enterprise analytics fields."""
        # Determine consumer vulnerability risk based on content analysis
        consumer_risk = self._assess_consumer_vulnerability(breakdown, composite_score)
        
        # Generate recommended actions based on classification and score
        recommended_actions = self._generate_recommended_actions(classification, composite_score, breakdown)
        
        # Generate flagged reason if malicious or suspicious
        flagged_reason = self._generate_flagged_reason(classification, composite_score, breakdown)
        
        # Update breakdown with new fields
        breakdown.consumer_vulnerability_risk = consumer_risk
        breakdown.recommended_actions = recommended_actions
        breakdown.flagged_reason = flagged_reason
        
        return breakdown
    
    def _assess_consumer_vulnerability(self, breakdown, composite_score: float) -> str:
        """Assess which consumer groups are most vulnerable to this content."""
        # Check for youth-targeting indicators
        heuristics = breakdown.heuristics or []
        heuristics_str = " ".join(heuristics).lower()
        
        # Check Azure safety categories for specific targeting
        azure_safety = breakdown.azure_safety_result or {}
        flagged_categories = azure_safety.get("flagged_categories", [])
        flagged_str = " ".join(flagged_categories).lower()
        
        # Youth indicators
        youth_indicators = ["youth", "children", "kids", "teens", "students", "young"]
        if any(indicator in heuristics_str or indicator in flagged_str for indicator in youth_indicators):
            return "youth"
        
        # Elderly/vulnerable indicators
        vulnerable_indicators = ["elderly", "senior", "vulnerable", "medical", "health"]
        if any(indicator in heuristics_str or indicator in flagged_str for indicator in vulnerable_indicators):
            return "vulnerable"
        
        # High-risk content affects general population
        if composite_score >= 0.7:
            return "general"
        
        # Default to general population
        return "general"
    
    def _generate_recommended_actions(self, classification: str, composite_score: float, breakdown) -> list[str]:
        """Generate recommended actions based on threat level."""
        actions = []
        
        # Determine severity
        is_malicious = "malicious" in classification.lower()
        is_suspicious = "suspicious" in classification.lower()
        is_high_score = composite_score >= 0.7
        
        # Azure safety flags
        azure_safety = breakdown.azure_safety_result or {}
        flagged_categories = azure_safety.get("flagged_categories", [])
        
        if is_malicious or is_high_score:
            actions.append("Block content immediately")
            actions.append("Escalate to security team")
            actions.append("Log for compliance audit")
            if flagged_categories:
                actions.append("Report to platform moderators")
        elif is_suspicious or composite_score >= 0.4:
            actions.append("Send for human review")
            actions.append("Monitor for escalation")
            actions.append("Log for compliance audit")
            actions.append("Apply content warning label")
        else:
            actions.append("Log for analytics")
            actions.append("Monitor for patterns")
        
        return actions
    
    def _generate_flagged_reason(self, classification: str, composite_score: float, breakdown) -> str:
        """Generate explanation for why content was flagged."""
        is_malicious = "malicious" in classification.lower()
        is_suspicious = "suspicious" in classification.lower()
        
        if not (is_malicious or is_suspicious):
            return None
        
        reasons = []
        
        # High composite score
        if composite_score >= 0.7:
            reasons.append(f"High threat score of {round(composite_score * 100)}%")
        elif composite_score >= 0.4:
            reasons.append(f"Elevated threat score of {round(composite_score * 100)}%")
        
        # Azure OpenAI risk
        if breakdown.azure_openai_risk and breakdown.azure_openai_risk >= 0.5:
            reasons.append(f"Azure AI semantic analysis detected {round(breakdown.azure_openai_risk * 100)}% risk")
            if breakdown.azure_openai_reasoning:
                reasons.append(f"Rationale: {breakdown.azure_openai_reasoning}")
        
        # Azure Content Safety flags
        azure_safety = breakdown.azure_safety_result or {}
        flagged_categories = azure_safety.get("flagged_categories", [])
        if flagged_categories:
            categories_str = ", ".join(flagged_categories)
            reasons.append(f"Content safety violations: {categories_str}")
        
        # AI-generated detection
        if breakdown.ai_probability and breakdown.ai_probability >= 0.6:
            reasons.append(f"Likely AI-generated content ({round(breakdown.ai_probability * 100)}% confidence)")
            if breakdown.model_family:
                reasons.append(f"Detected model family: {breakdown.model_family}")
        
        # Heuristics
        heuristics = breakdown.heuristics or []
        if heuristics:
            top_heuristics = heuristics[:3]
            reasons.append(f"Triggered detection heuristics: {', '.join(top_heuristics)}")
        
        # Behavioral patterns
        if breakdown.behavioral_score and breakdown.behavioral_score >= 0.6:
            reasons.append("Suspicious behavioral patterns detected (urgent language, coordination indicators)")
        
        if not reasons:
            reasons.append("Multiple risk factors combined to exceed safety thresholds")
        
        return " • ".join(reasons)


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
        print(f"[Orchestrator] Broadcasting event to {len(self._event_queues)} clients")
        for i, queue in enumerate(self._event_queues, 1):
            try:
                queue.put_nowait(event)
                print(f"[Orchestrator] Event sent to client {i}")
            except asyncio.QueueFull:
                print(f"[Orchestrator] Queue full for client {i}, dropping oldest event")
                # Drop oldest if backpressure occurs
                try:
                    queue.get_nowait()
                    queue.put_nowait(event)
                except:
                    pass
