import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import (
    Column,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    select,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from ..config import get_settings


class Database:
    """Lightweight data access layer with SQLite fallback and Azure SQL/MySQL support."""

    def __init__(self) -> None:
        settings = get_settings()
        self.database_url = settings.database_url
        self.is_sqlite = self.database_url.startswith("sqlite")

        # Ensure local SQLite directory exists so the app can start cleanly.
        if self.is_sqlite:
            path = self.database_url.replace("sqlite:///", "")
            Path(path).parent.mkdir(parents=True, exist_ok=True)

        self.engine: Engine = create_engine(
            self.database_url,
            future=True,
            pool_pre_ping=True,
        )

        self.metadata = MetaData()
        self._define_tables()

        # Defer schema drop/create until explicitly requested (e.g., at app startup)
        # to avoid wiping twice when multiple Database instances are created.
        self._schema_initialized = False

    # ---------------------- Table Definitions ----------------------
    def _define_tables(self) -> None:
        self.cases = Table(
            "cases",
            self.metadata,
            Column("intake_id", String(255), primary_key=True),
            Column("raw_text", Text, nullable=False),
            Column("classification", String(100), nullable=False),
            Column("composite_score", Float, nullable=False),
            Column("metadata_json", Text),
            Column("breakdown_json", Text),
            Column("provenance_json", Text),
            Column("summary_text", Text),
            Column("decision_reason", Text),
            Column("created_at", String(50), nullable=False),
        )

        self.audit_log = Table(
            "audit_log",
            self.metadata,
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("intake_id", String(255)),
            Column("action", String(100), nullable=False),
            Column("actor", String(100), nullable=False),
            Column("payload", Text),
            Column("created_at", String(50), nullable=False),
        )

        self.fingerprints = Table(
            "fingerprints",
            self.metadata,
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("intake_id", String(255), nullable=False),
            Column("content_hash", String(255), nullable=False),
            Column("normalized_hash", String(255), nullable=False),
            Column("created_at", String(50), nullable=False),
        )

        self.users = Table(
            "users",
            self.metadata,
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("username", String(255), nullable=False, unique=True),
            Column("password_hash", String(255), nullable=False),
            Column("role", String(50), nullable=False),
            Column("created_at", String(50), nullable=False),
            Column("last_login", String(50)),
        )

    def reset_schema(self, force: bool = False) -> None:
        """Drop and recreate all tables. Idempotent unless force=True."""
        if self._schema_initialized and not force:
            return
        self.metadata.drop_all(self.engine)
        self.metadata.create_all(self.engine)
        self._schema_initialized = True

    # ---------------------- Helpers ----------------------
    def _now(self) -> str:
        return datetime.utcnow().isoformat()

    def _normalize_text(self, text: str) -> str:
        # Simple normalization for fuzzy match: lowercase and collapse whitespace
        return "".join(text.lower().split())

    # ---------------------- Case Management ----------------------
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
        payload = {
            "raw_text": raw_text,
            "classification": classification,
            "composite_score": composite_score,
            "metadata_json": json.dumps(metadata),
            "breakdown_json": json.dumps(breakdown),
            "provenance_json": json.dumps(provenance),
            "summary_text": summary,
            "decision_reason": decision_reason,
            "created_at": self._now(),
        }

        with self.engine.begin() as conn:
            existing = conn.execute(
                select(self.cases.c.intake_id).where(self.cases.c.intake_id == intake_id)
            ).scalar_one_or_none()

            if existing:
                conn.execute(
                    self.cases.update().where(self.cases.c.intake_id == intake_id).values(**payload)
                )
            else:
                conn.execute(self.cases.insert().values(intake_id=intake_id, **payload))

    # ---------------------- Fingerprints ----------------------
    def store_fingerprint(self, intake_id: str, text: str, content_hash: str) -> None:
        normalized_hash = hashlib.sha256(self._normalize_text(text).encode("utf-8")).hexdigest()
        with self.engine.begin() as conn:
            conn.execute(
                self.fingerprints.insert().values(
                    intake_id=intake_id,
                    content_hash=content_hash,
                    normalized_hash=normalized_hash,
                    created_at=self._now(),
                )
            )

    def check_fingerprint(self, text: str) -> list[Dict[str, Any]]:
        normalized_hash = hashlib.sha256(self._normalize_text(text).encode("utf-8")).hexdigest()
        with self.engine.begin() as conn:
            rows = conn.execute(
                select(
                    self.fingerprints.c.intake_id,
                    self.fingerprints.c.content_hash,
                    self.fingerprints.c.normalized_hash,
                    self.fingerprints.c.created_at,
                ).where(
                    (self.fingerprints.c.normalized_hash == normalized_hash)
                    | (self.fingerprints.c.content_hash == normalized_hash)
                )
            ).all()

        return [
            {
                "intake_id": r.intake_id,
                "content_hash": r.content_hash,
                "normalized_hash": r.normalized_hash,
                "created_at": r.created_at,
            }
            for r in rows
        ]

    # ---------------------- Case Retrieval & Audit ----------------------
    def fetch_case(self, intake_id: str) -> Optional[Dict[str, Any]]:
        with self.engine.begin() as conn:
            row = conn.execute(
                select(
                    self.cases.c.raw_text,
                    self.cases.c.classification,
                    self.cases.c.composite_score,
                    self.cases.c.metadata_json,
                    self.cases.c.breakdown_json,
                    self.cases.c.provenance_json,
                    self.cases.c.summary_text,
                    self.cases.c.decision_reason,
                    self.cases.c.created_at,
                ).where(self.cases.c.intake_id == intake_id)
            ).one_or_none()

        if not row:
            return None

        metadata_json = json.loads(row.metadata_json) if row.metadata_json else {}
        breakdown = json.loads(row.breakdown_json) if row.breakdown_json else {}
        provenance = json.loads(row.provenance_json) if row.provenance_json else {}

        return {
            "raw_text": row.raw_text,
            "classification": row.classification,
            "composite_score": row.composite_score,
            "metadata": metadata_json,
            "breakdown": breakdown,
            "provenance": provenance,
            "summary": row.summary_text,
            "decision_reason": row.decision_reason,
            "created_at": row.created_at,
        }

    def log_action(self, intake_id: str, action: str, actor: str, payload: Dict[str, Any]):
        with self.engine.begin() as conn:
            conn.execute(
                self.audit_log.insert().values(
                    intake_id=intake_id,
                    action=action,
                    actor=actor,
                    payload=json.dumps(payload),
                    created_at=self._now(),
                )
            )

    def get_audit_trail(self, intake_id: str) -> list[Dict[str, Any]]:
        """Retrieve immutable audit trail for a case."""
        with self.engine.begin() as conn:
            rows = conn.execute(
                select(
                    self.audit_log.c.id,
                    self.audit_log.c.action,
                    self.audit_log.c.actor,
                    self.audit_log.c.payload,
                    self.audit_log.c.created_at,
                )
                .where(self.audit_log.c.intake_id == intake_id)
                .order_by(self.audit_log.c.created_at.asc())
            ).all()

        return [
            {
                "id": r.id,
                "action": r.action,
                "actor": r.actor,
                "payload": json.loads(r.payload) if r.payload else {},
                "created_at": r.created_at,
            }
            for r in rows
        ]

    def list_cases(self, limit: int = 50) -> list[Dict[str, Any]]:
        """List recent cases for dashboard."""
        with self.engine.begin() as conn:
            rows = conn.execute(
                select(
                    self.cases.c.intake_id,
                    self.cases.c.classification,
                    self.cases.c.composite_score,
                    self.cases.c.summary_text,
                    self.cases.c.created_at,
                    self.cases.c.metadata_json,
                    self.cases.c.breakdown_json,
                )
                .order_by(self.cases.c.created_at.desc())
                .limit(limit)
            ).all()

        results = []
        for r in rows:
            metadata = json.loads(r.metadata_json) if r.metadata_json else {}
            breakdown = json.loads(r.breakdown_json) if r.breakdown_json else {}
            results.append(
                {
                    "intake_id": r.intake_id,
                    "classification": r.classification,
                    "composite_score": r.composite_score,
                    "summary": r.summary_text,
                    "created_at": r.created_at,
                    "submitted_at": r.created_at,
                    "metadata": metadata,
                    "breakdown": breakdown,
                    "platform": metadata.get("platform"),
                    "region": metadata.get("region"),
                    "actor_id": metadata.get("actor_id"),
                    "language": metadata.get("language"),
                    "source": metadata.get("source"),
                    "tags": metadata.get("tags"),
                }
            )

        return results

    # ==================== User Management ====================
    def create_user(self, username: str, password_hash: str, role: str) -> bool:
        """Create a new user account. Returns True if successful, False if username exists."""
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    self.users.insert().values(
                        username=username.lower(),
                        password_hash=password_hash,
                        role=role,
                        created_at=self._now(),
                    )
                )
            return True
        except IntegrityError:
            # Username already exists
            return False

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username. Returns None if not found."""
        with self.engine.begin() as conn:
            row = conn.execute(
                select(
                    self.users.c.id,
                    self.users.c.username,
                    self.users.c.password_hash,
                    self.users.c.role,
                    self.users.c.created_at,
                    self.users.c.last_login,
                ).where(self.users.c.username == username.lower())
            ).one_or_none()

        if not row:
            return None

        return {
            "id": row.id,
            "username": row.username,
            "password_hash": row.password_hash,
            "role": row.role,
            "created_at": row.created_at,
            "last_login": row.last_login,
        }

    def update_last_login(self, username: str) -> None:
        """Update the last login timestamp for a user."""
        with self.engine.begin() as conn:
            conn.execute(
                self.users.update()
                .where(self.users.c.username == username.lower())
                .values(last_login=self._now())
            )

