from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl


class SourceMetadata(BaseModel):
    platform: str
    region: Optional[str] = None
    actor_id: Optional[str] = None
    related_urls: Optional[List[HttpUrl]] = None


class ContentIntake(BaseModel):
    text: str = Field(..., min_length=20, max_length=20000)
    language: str = Field("en", min_length=2, max_length=5)
    source: str = Field("unknown")
    metadata: Optional[SourceMetadata] = None
    tags: Optional[List[str]] = None


class DetectionBreakdown(BaseModel):
    linguistic_score: float
    behavioral_score: float
    ai_probability: Optional[float] = None
    model_family: Optional[str] = None
    model_family_confidence: Optional[float] = None
    model_family_probabilities: Optional[Dict[str, float]] = None
    ollama_risk: Optional[float] = None  # Kept for backward compatibility
    
    # Azure integration fields (Microsoft Imagine Cup 2026)
    azure_openai_risk: Optional[float] = None
    azure_openai_reasoning: Optional[str] = None
    azure_safety_score: Optional[float] = None
    azure_safety_result: Optional[Dict[str, Any]] = None
    
    # Azure Language Service (Multi-language support)
    # Supports: English, Hindi, Arabic, Spanish, French, German, Portuguese,
    # Russian, Chinese, Japanese, Korean, Tamil, Telugu, Urdu, Bengali
    detected_language: Optional[str] = None  # ISO 639-1 code (e.g., 'en', 'hi')
    detected_language_name: Optional[str] = None  # Full name (e.g., 'English', 'Hindi')
    language_confidence: Optional[float] = None  # Detection confidence 0.0-1.0
    
    stylometric_anomalies: Dict[str, float]
    heuristics: List[str]


class ProvenancePayload(BaseModel):
    watermark_present: bool
    watermark_hash: Optional[str] = None
    signature_valid: bool
    validation_notes: List[str]
    content_hash: str


class GNNCluster(BaseModel):
    cluster_id: str
    score: float
    actors: List[str] = Field(default_factory=list)
    narratives: List[str] = Field(default_factory=list)
    content: List[str] = Field(default_factory=list)


class CoordinationAlert(BaseModel):
    actor: str
    peer_actors: List[str] = Field(default_factory=list)
    shared_tags: List[str] = Field(default_factory=list)
    platforms: List[str] = Field(default_factory=list)
    risk: float


class PropagationChain(BaseModel):
    path: List[str] = Field(default_factory=list)
    likelihood: float
    platforms: List[str] = Field(default_factory=list)


class CommunitySnapshot(BaseModel):
    actors: List[str] = Field(default_factory=list)
    content: List[str] = Field(default_factory=list)
    narratives: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    gnn_score: float = 0.0


class GraphSummary(BaseModel):
    node_count: int
    edge_count: int
    high_risk_actors: List[str]
    communities: List[CommunitySnapshot]
    gnn_clusters: List[GNNCluster] = Field(default_factory=list)
    coordination_alerts: List[CoordinationAlert] = Field(default_factory=list)
    propagation_chains: List[PropagationChain] = Field(default_factory=list)


class DetectionResult(BaseModel):
    intake_id: str
    submitted_at: datetime
    composite_score: float
    classification: str
    breakdown: DetectionBreakdown
    provenance: ProvenancePayload
    graph_summary: GraphSummary
    summary: Optional[str] = None
    findings: Optional[List[str]] = None
    decision_reason: Optional[str] = None


class ThreatIntelFeed(BaseModel):
    generated_at: datetime
    graph_summary: GraphSummary
    indicators: List[str]
    dataset_fingerprint: str


class SIEMCorrelationPayload(BaseModel):
    generated_at: datetime
    alerts: List[CoordinationAlert]
    propagation_chains: List[PropagationChain]
    correlation_keys: List[str]
    node_count: int


# Sharing and HopTrace schemas removed - focusing on text disinformation MVP
# class SharingRequest(BaseModel): ...
# class HopTrace(BaseModel): ...
# class SharingPackage(BaseModel): ...

