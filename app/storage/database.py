import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from ..config import get_settings


class Database:
    def __init__(self) -> None:
        settings = get_settings()
        self.path = settings.database_url.replace("sqlite:///", "")
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._initialise()

    def _initialise(self) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    intake_id TEXT PRIMARY KEY,
                    raw_text TEXT NOT NULL,
                    classification TEXT NOT NULL,
                    composite_score REAL NOT NULL,
                    metadata_json TEXT,
                    breakdown_json TEXT,
                    provenance_json TEXT,
                    summary_text TEXT,
                    decision_reason TEXT,
                    created_at TEXT NOT NULL
                )
            """
            )
            cur.execute("PRAGMA table_info(cases)")
            columns = {row[1] for row in cur.fetchall()}
            if "summary_text" not in columns:
                cur.execute("ALTER TABLE cases ADD COLUMN summary_text TEXT")
            if "decision_reason" not in columns:
                cur.execute("ALTER TABLE cases ADD COLUMN decision_reason TEXT")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intake_id TEXT,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    payload TEXT,
                    created_at TEXT NOT NULL
                )
            """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS fingerprints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intake_id TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    normalized_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """
            )

    @contextmanager
    def _cursor(self):
        conn = sqlite3.connect(self.path)
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        finally:
            conn.close()

    def save_case(
        self,
        intake_id: str,
        raw_text: str,
        classification: str,
        composite_score: float,
        metadata: Dict[str, Any],
        breakdown: Dict[str, Any],
        provenance: Dict[str, Any],
        summary: Optional[str] = None,
        decision_reason: Optional[str] = None,
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT OR REPLACE INTO cases (
                    intake_id,
                    raw_text,
                    classification,
                    composite_score,
                    metadata_json,
                    breakdown_json,
                    provenance_json,
                    summary_text,
                    decision_reason,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    intake_id,
                    raw_text,
                    classification,
                    composite_score,
                    json.dumps(metadata),
                    json.dumps(breakdown),
                    json.dumps(provenance),
                    summary,
                    decision_reason,
                    datetime.utcnow().isoformat(),
                ),
            )

    def _normalize_text(self, text: str) -> str:
        # simple normalization for fuzzy match: lowercase and collapse whitespace
        return "".join(text.lower().split())

    def store_fingerprint(self, intake_id: str, text: str, content_hash: str) -> None:
        normalized_hash = hashlib.sha256(self._normalize_text(text).encode("utf-8")).hexdigest()
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO fingerprints (intake_id, content_hash, normalized_hash, created_at)
                VALUES (?, ?, ?, ?)
            """,
                (intake_id, content_hash, normalized_hash, datetime.utcnow().isoformat()),
            )

    def check_fingerprint(self, text: str) -> list[Dict[str, Any]]:
        normalized_hash = hashlib.sha256(self._normalize_text(text).encode("utf-8")).hexdigest()
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT intake_id, content_hash, normalized_hash, created_at
                FROM fingerprints
                WHERE normalized_hash = ? OR content_hash = ?
            """,
                (normalized_hash, normalized_hash),
            )
            rows = cur.fetchall() or []
            return [
                {
                    "intake_id": r[0],
                    "content_hash": r[1],
                    "normalized_hash": r[2],
                    "created_at": r[3],
                }
                for r in rows
            ]

    def fetch_case(self, intake_id: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT
                    raw_text,
                    classification,
                    composite_score,
                    metadata_json,
                    breakdown_json,
                    provenance_json,
                    summary_text,
                    decision_reason,
                    created_at
                FROM cases WHERE intake_id=?
            """,
                (intake_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            metadata_json = json.loads(row[3]) if row[3] else {}
            breakdown = json.loads(row[4]) if row[4] else {}
            provenance = json.loads(row[5]) if row[5] else {}
            return {
                "raw_text": row[0],
                "classification": row[1],
                "composite_score": row[2],
                "metadata": metadata_json,
                "breakdown": breakdown,
                "provenance": provenance,
                "summary": row[6],
                "decision_reason": row[7],
                "created_at": row[8],
            }

    def log_action(self, intake_id: str, action: str, actor: str, payload: Dict[str, Any]):
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_log (intake_id, action, actor, payload, created_at)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    intake_id,
                    action,
                    actor,
                    json.dumps(payload),
                    datetime.utcnow().isoformat(),
                ),
            )

    def get_audit_trail(self, intake_id: str) -> list[Dict[str, Any]]:
        """Retrieve immutable audit trail for a case."""
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT id, action, actor, payload, created_at
                FROM audit_log
                WHERE intake_id = ?
                ORDER BY created_at ASC
            """,
                (intake_id,),
            )
            rows = cur.fetchall() or []
            return [
                {
                    "id": r[0],
                    "action": r[1],
                    "actor": r[2],
                    "payload": json.loads(r[3]) if r[3] else {},
                    "created_at": r[4],
                }
                for r in rows
            ]

    def list_cases(self, limit: int = 50) -> list[Dict[str, Any]]:
        """List recent cases for dashboard."""
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT
                    intake_id,
                    classification,
                    composite_score,
                    summary_text,
                    created_at,
                    metadata_json,
                    breakdown_json
                FROM cases
                ORDER BY created_at DESC
                LIMIT ?
            """,
                (limit,),
            )
            rows = cur.fetchall() or []
            return [
                (lambda metadata, breakdown: {
                    "intake_id": r[0],
                    "classification": r[1],
                    "composite_score": r[2],
                    "summary": r[3],
                    # Expose created_at under both created_at and submitted_at
                    # so it matches the DetectionResult-like shape used by the frontend.
                    "created_at": r[4],
                    "submitted_at": r[4],
                    # Include parsed JSON blobs so the frontend can render Azure + language signals
                    # without having to hydrate every row via /cases/{id}.
                    "metadata": metadata,
                    "breakdown": breakdown,
                    # Convenience top-level fields used by frontend filters/search.
                    "platform": (metadata or {}).get("platform"),
                    "region": (metadata or {}).get("region"),
                    "actor_id": (metadata or {}).get("actor_id"),
                })(
                    json.loads(r[5]) if r[5] else {},
                    json.loads(r[6]) if r[6] else {},
                )
                for r in rows
            ]
