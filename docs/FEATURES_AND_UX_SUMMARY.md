# TattvaDrishti — Features & UX Summary (Single-Doc)

This document is a **high-level but complete inventory** of what the project contains today — including “small” UX details (theme, color tokens, animations) and “critical” security/analysis features (payload text detection, risk scoring, audit trail).

For a page-by-page walkthrough of the Next.js app and the backend endpoints, see: `docs/project_summary.md`.

---

## 1) Product intent (what this is for)

TattvaDrishti is an **Azure-first analyst platform** to detect, triage, and report on **malign information operations** (text-first narratives) with:

- A single intake payload that becomes an analyst-ready case
- A composite 0–100 risk score (stored as 0.0–1.0 internally)
- Explainability ("why flagged") from multiple signals
- Live updates to dashboards (SSE)
- Audit logging (immutable per-case history)
- Geo context (region) + heatmap visualization

**Target users**
- **Individual (analyst)**: day-to-day triage (intake → score → decision).
- **Enterprise (superuser/admin)**: reporting, exports, and more detailed reporting views.

---

## 2) Feature inventory (end-to-end)

### 2.1 Intake & case creation

**Feature: Structured text intake**
- **What it does**: Accepts narrative text + language + source + optional metadata (platform/region/actor_id/urls) + tags.
- **Target use**: Standardize inputs so scoring + analytics are consistent.
- **Where**:
  - Backend schema: `app/schemas.py` (`ContentIntake`, `SourceMetadata`)
  - Primary endpoint: `POST /api/v1/intake` (implemented in `app/main.py`)
- **Constraints**:
  - Text length validated (`min_length=20`, `max_length=20000`).

**Feature: Case persistence**
- **What it does**: Stores the full case (raw text, classification, composite score, metadata, breakdown, provenance, summary, decision reason).
- **Target use**: Makes results reproducible and enables audit/export/reporting.
- **Where**:
  - SQLite store: `app/storage/database.py` (`cases` table)

---

### 2.2 “Payload text detection” (core risk scoring)

This project’s detection is an **Azure-first blended pipeline** with local heuristics/stylometrics and multiple Azure signals.

**Feature: Stylometric / linguistic feature extraction**
- **What it does**: Extracts text statistics (token lengths, entropy, repetition, punctuation variety, readability proxies, etc.) and produces a stylometric probability.
- **Target use**: Identify “automated / templated / coordinated” writing patterns and support explainability.
- **Where**: `app/models/detection.py` (`DetectorEngine._extract_features`, `_score_features`, etc.)

**Feature: Behavioral & persuasion trigger detection**
- **What it does**: Scans for urgency language, CTA patterns, platform risk boosts, high-risk tags, emotional manipulation indicators, and coherence proxies.
- **Target use**: Catch manipulative persuasion patterns even when content is not overtly harmful.
- **Where**: `app/models/detection.py` (heuristics + `_calculate_behavioral_risk`)

**Feature: Azure OpenAI semantic risk assessment (primary reasoning)**
- **What it does**: Calls the Azure OpenAI deployment to produce a semantic risk score and plain-English reasoning.
- **Target use**: Provide judge/analyst-friendly explanations for why content is risky (contextual interpretation).
- **Where**:
  - Client: `app/integrations/azure_openai_client.py`
  - Used in pipeline: `app/models/detection.py` (`_azure_openai_risk_assessment`)

**Feature: Azure AI Content Safety (harm/manipulation detection)**
- **What it does**: Calls Content Safety to classify harmful categories, compute a normalized harm score, and returns severity/flags.
- **Target use**: Policy-aligned harm detection and safety signals for escalations/compliance.
- **Where**:
  - Client: `app/integrations/azure_content_safety.py`
  - Used in pipeline: `app/models/detection.py` (`_azure_content_safety_assessment`)

**Feature: Multi-language detection + language normalization**
- **What it does**:
  - Detects language via Azure Language Service when available.
  - Normalizes composite score via per-language baseline factors.
- **Target use**: Keep scoring consistent across languages (avoid systematically over/under-scoring certain scripts/languages).
- **Where**: `app/models/detection.py`

**Feature: Composite score blending**
- **What it does**: Blends stylometric probability + behavioral score + Azure OpenAI risk + Azure Content Safety harm score into a final composite.
- **Target use**: Reduce false positives by balancing “style” vs “meaning” vs “harm”.
- **Where**: `app/models/detection.py` (`_blend_scores`)

**Outputs captured**
- **Classification**: stored as string buckets (e.g., low/medium/high/critical semantics).
- **Breakdown**: `DetectionBreakdown` includes:
  - `linguistic_score`, `behavioral_score`
  - `azure_openai_risk`, `azure_openai_reasoning`
  - `azure_safety_score`, `azure_safety_result`
  - `heuristics` and `stylometric_anomalies`
  - enterprise analytics fields (see below)

---

### 2.3 Explainability (“Why was this flagged?”)

**Feature: Heuristics list + reasoning text**
- **What it does**: Stores and displays top triggers (e.g., urgency terms, risky platform boosts, language detection notes, GPT reasoning, content safety flags).
- **Target use**: Analyst trust, faster triage, defensible outcomes in demos.
- **Where**:
  - Generated in: `app/models/detection.py`
  - Persisted in `breakdown_json`: `app/storage/database.py`
  - Displayed in UI: `frontend/components/CaseDetail.jsx` (as described in `docs/project_summary.md`)

**Feature: Human-readable case summary + decision reason**
- **What it does**: Produces a short narrative summary of classification/score and key signals, plus a backend-generated decision reason.
- **Target use**: Fast scanning, exports, executive reporting.
- **Where**: `app/services/orchestrator.py` (`_generate_summary`, `_build_decision_reason`)

---

### 2.4 Provenance, integrity, and post-hoc verification

**Feature: Watermark / signature verification (provenance)**
- **What it does**:
  - Computes a SHA-256 content hash for traceability.
  - Detects an embedded watermark pattern (`[[WM::...]]`) and validates it against a seeded fingerprint.
  - Detects a rotating signature (`[[SIG::...]]`) and validates it against a server-side secret.
- **Target use**: Provenance checks for “trusted vendor” submissions and spoof detection.
- **Where**: `app/models/watermark.py`

**Feature: Fingerprinting and fuzzy matching**
- **What it does**: Stores both raw content hash and a normalized hash (lowercase + collapsed whitespace) for similarity matching.
- **Target use**: Detect reposts/duplicates and enable post-hoc verification (“have we seen this before?”).
- **Where**: `app/storage/database.py` (`fingerprints` table, `store_fingerprint`, `check_fingerprint`)

---

### 2.5 Graph intelligence and coordination signals

**Feature: In-memory graph intelligence engine**
- **What it does**: Builds a NetworkX graph linking:
  - `actor` → `content` edges (published)
  - `content` → `narrative` edges (tags)
  - `actor` → `region` edges (origin)

- **Target use**: Identify coordinated activity patterns across actors/narratives/regions.
- **Where**: `app/models/graph_intel.py` (`GraphIntelEngine.ingest`, `_summarise`)

**Feature: GNN-like projection (optional, torch-enabled)**
- **What it does**: If `torch` is available, computes a lightweight sigmoid projection over node features and neighbor context.
- **Target use**: Produce a coordination risk lens and help surface “high-risk actors”.
- **Where**: `app/models/graph_intel.py` (`_gnn_projection`)

**Feature: Threat intel feed + SIEM correlation payload**
- **What it does**:
  - Creates an indicator set and dataset fingerprint for intel sharing.
  - Produces a SIEM correlation payload with alerts, propagation chains, and correlation keys.
- **Target use**: Integrations with external monitoring / SOC workflows.
- **Where**: `app/models/graph_intel.py` (`threat_intel_feed`, `siem_payload`)

---

### 2.6 Real-time updates (SSE)

**Feature: Server-Sent Events broadcast**
- **What it does**: Streams `analysis_completed` events to all connected clients; the frontend uses this to hydrate and display new cases live.
- **Target use**: Real-time analyst dashboards and “live demo” experience.
- **Where**:
  - Backend queue broadcast: `app/services/orchestrator.py` (`stream_events`, `_emit_event`)
  - Endpoint: `GET /api/v1/events/stream` (`app/main.py`)
  - Frontend consumption: dashboard/submissions/analytics pages (as described in `docs/project_summary.md`)

---

### 2.7 Analyst decisions and audit trail

**Feature: Analyst decision workflow**
- **What it does**: Records actions such as Flag/Monitor/Escalate/Dismiss with optional notes and keeps history.
- **Target use**: Operational accountability and consistent escalation.
- **Where**:
  - API: `POST /api/v1/cases/{id}/decision` (`app/main.py`)
  - Storage: `app/storage/database.py` (`audit_log` table)

**Feature: Immutable audit trail retrieval**
- **What it does**: Returns case action history ordered by time.
- **Target use**: Compliance and incident reconstruction.
- **Where**: `app/storage/database.py` (`get_audit_trail`) and API endpoint in `app/main.py`

---

### 2.8 Geo context (GeoIP + heatmap)

**Feature: GeoIP-based user location detection**
- **What it does**: Detects client region from IP address using MaxMind GeoLite2; supports proxy headers (`X-Forwarded-For`).
- **Target use**: Reduce friction for region selection and enable geo-driven analytics.
- **Where**: `app/main.py` (`/api/v1/location`)

**Feature: Heatmap risk points API**
- **What it does**: Stores and retrieves scored points for a heatmap visualization.
- **Target use**: Regional monitoring and executive “where is this happening?” dashboards.
- **Where**:
  - Router: `app/heatmap.py` (`/api/v1/heatmap/*`)
  - Persistence: `data/heatmap_points.json`

---

### 2.9 Authentication and role gating

**Feature: JWT authentication**
- **What it does**: Signup/login issues a JWT; `/me` returns identity/role/permissions.
- **Target use**: Basic account separation + enterprise-only feature gating.
- **Where**: `app/auth/*` and endpoints in `app/main.py`

**Feature: Role/permission checks**
- **What it does**: Guards endpoints and UI pages based on permissions (e.g., superuser, exports, detailed reports).
- **Target use**: Separate analyst UX from enterprise/admin UX.
- **Where**:
  - Backend middleware: `app/auth/middleware.py`
  - Frontend gating: described in `docs/project_summary.md` (e.g., upload page shows upgrade prompt)

---

## 3) Frontend UX inventory (pages + components)

This is a **multi-page Next.js 14 app** (analyst dashboard product), not just a single landing page.

### 3.1 Main routes and target use

**Landing / marketing**
- `/` and `/enhanced-landing`
- **Target use**: Demo-first storytelling and conversion (Sign up CTA), with immersive animations.

**Auth**
- `/login`, `/signup`
- **Target use**: Access control for analyst vs enterprise experiences.

**Analyst dashboard**
- `/dashboard`
- **Target use**: Day-to-day triage; live feed + heatmap + recent cases + intake form.

**Submissions browser**
- `/submissions`
- **Target use**: Search/browse cases and drill into case details.

**Bulk upload**
- `/upload` (enterprise-only)
- **Target use**: Batch processing of emails/posts and operational workflows.

**Analytics**
- `/analytics`
- **Target use**: Trends, breakdowns, and executive-style summaries from accumulated cases.

**Superuser**
- `/superuser` (enterprise)
- **Target use**: Admin reporting, system monitoring, and report generation.

**Simple dashboard**
- `/simple`
- **Target use**: Lower-density “guided” experience for quick checks.

(For more page-by-page detail, `docs/project_summary.md` is already comprehensive.)

---

## 4) UI theming, color scheme, and design primitives

### 4.1 Tailwind + CSS variables (source of truth)

**Feature: Theme tokens via CSS variables**
- **What it does**: Defines HSL tokens for background/foreground, primary/secondary, border/ring, etc.
- **Target use**: Consistent theming across the app without hardcoding colors in components.
- **Where**:
  - Tokens: `frontend/app/globals.css` (`:root { --background ... }`)
  - Tailwind mapping: `frontend/tailwind.config.js` (maps Tailwind `colors.*` → `var(--*)`)

**Baseline palette (from `globals.css`)**
- Background: `--background: 222.2 84% 4.9%` (deep dark/navy)
- Foreground text: `--foreground: 210 40% 98%` (near-white)
- Primary accent: `--primary: 160 84% 39%` (emerald/green)
- Secondary accent: `--secondary: 187 100% 42%` (cyan/teal)
- Borders/muted: `--border`, `--muted` as slate-like darks

### 4.2 Theme toggle (dark/light)

**Feature: Dark-first investigative UI**
- **What it does**: Dark-mode optimized UI with light-mode overrides controlled by `data-theme`.
- **Target use**: Analyst “control room” feel; readability for dense data.
- **Where**: theme behavior is described in `docs/project_summary.md` (theme toggle writes `data-theme` and persists to localStorage).

### 4.3 Gradient button primitive

**Feature: Animated gradient CTA button**
- **What it does**: A reusable `.gradient-button` with CSS custom properties that animate on hover.
- **Target use**: Strong CTAs in landing/auth/dashboard without introducing new component libraries.
- **Where**: `frontend/app/globals.css` (`@layer components .gradient-button`)

---

## 5) Landing animations (what exists and why)

These are primarily used to create a **buzzworthy, judge-friendly demo landing**.

**BlobCanvas**
- **What it does**: Canvas blobs that morph with elastic easing.
- **Target use**: “Organic motion” background energy for marketing/landing.
- **Where**: `frontend/components/BlobCanvas.jsx` and documented in `LANDING_PAGE_ANIMATIONS.md`.

**HexGrid**
- **What it does**: Scroll-reactive 20×20 hex grid with hover effects and velocity-based pulse/rotation.
- **Target use**: Gives the landing page a “sensor network / intelligence grid” metaphor.
- **Where**: `frontend/components/HexGrid.jsx` + `LANDING_PAGE_ANIMATIONS.md`.

**WebGLOrbs**
- **What it does**: Three.js orbs with menu burst/orbit behavior.
- **Target use**: Premium motion design for demo differentiation.
- **Where**: `frontend/components/WebGLOrbs.jsx` + `LANDING_PAGE_ANIMATIONS.md`.

**GSAP ScrollTrigger + Zero-G warp**
- **What it does**: Parallax + scroll-velocity “warp” transforms on `.warp-element`.
- **Target use**: Motion-rich storytelling and perceived responsiveness.
- **Where**: Landing page implementation and `LANDING_PAGE_ANIMATIONS.md`.

**Landing palette (documented)**
- Deep navy/slate base, honey gold accents, electric teal/cyan accents, purple gradients.
- (These are used mainly in the enhanced landing visuals, not necessarily as the dashboard base palette.)

---

## 6) Enterprise analytics fields (backend-generated)

**Feature: Consumer vulnerability risk bucket**
- **What it does**: Produces a coarse audience risk label (e.g., youth/general/vulnerable).
- **Target use**: Executive summaries and “who is targeted?” reporting.
- **Where**: `app/services/orchestrator.py` (`_assess_consumer_vulnerability`)

**Feature: Recommended actions**
- **What it does**: Generates suggested operational actions based on classification/score and safety flags.
- **Target use**: Make the product prescriptive (not just diagnostic).
- **Where**: `app/services/orchestrator.py` (`_generate_recommended_actions`)

**Feature: Flagged reason**
- **What it does**: Generates a short reason string for suspicious/malicious outcomes.
- **Target use**: Quick scanning in enterprise reports and case lists.
- **Where**: `app/services/orchestrator.py` (`_generate_flagged_reason`)

---

## 7) “What’s intentionally not in the current MVP” (important for accuracy)

- Sharing package / hop-trace schemas are commented as removed in `app/schemas.py`.
- Orchestrator comments indicate sharing package generation was removed for the text-disinformation MVP.
- The UI also notes that “sharing package generation” is intentionally disabled in the current client (see `docs/project_summary.md`).

---

## 8) Quick “feature → target use” cheat sheet

- **Text intake →** normalize narratives into cases
- **Stylometrics + heuristics →** detect automation/manipulation patterns
- **Azure OpenAI reasoning →** explain semantic risk in plain English
- **Azure Content Safety →** policy/harm signals for compliance + escalations
- **Language detection/normalization →** consistent scoring across languages
- **Watermark/signature + hashing →** provenance and spoof resistance
- **Fingerprinting →** detect reposts/duplicates
- **Graph intel + SIEM payload →** coordination detection + SOC integration
- **SSE streaming →** real-time dashboards
- **Audit trail →** accountability/compliance
- **GeoIP + heatmap →** regional monitoring
- **Theme tokens + gradients →** consistent, dark-first investigative UI
- **Landing animations →** judge-friendly motion design and brand differentiation
