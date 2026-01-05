
# TattvaDrishti — Full Project Summary (MIC-26)

This summary is meant to be the “single source of truth” for what the project does today: every major page and workflow in the Next.js app, plus the backend features that power them.

If you want the full low-level backend reference (schemas, data flow, module details), see FULL_PROJECT_DOCUMENTATION.md.

---

## 1) What the product is

TattvaDrishti is an Azure-first platform for detecting and mitigating malign information operations.
It focuses on text-first narrative intake and turns each submission into an analyst-ready case with:

- A composite Trust/Risk score
- A clear classification label (low/medium/high/critical style buckets)
- Explainability (“why was this flagged?”) including Azure reasoning + safety signals
- Live event streaming for real-time dashboards
- Analyst decision logging + immutable audit trail
- Geo context (region required) and a world heatmap view
- Enterprise-only operational reporting and exports

The system is split into a FastAPI backend under app/ and a Next.js 14 frontend under frontend/.

---

## 2) User roles and access control

The project uses JWT auth in the backend and role/permission checks in the API.

### Roles
- individual: analyst-grade core features (dashboard, analytics, upload)
- enterprise: extended access (superuser, detailed reports, exports, submissions management)

### Permissions (high level)
- view_dashboard
- upload_content
- view_analytics
- view_superuser (enterprise)
- manage_submissions (enterprise)
- export_data (enterprise)
- view_detailed_reports (enterprise)

Frontend auth is handled via frontend/lib/auth.js and stores the JWT in localStorage.

---

## 3) Frontend features (Next.js)

The frontend is a multi-page analyst product (not a single dashboard screen). It includes marketing/landing, auth, analyst dashboards, analytics, case browsing, bulk upload, and an enterprise admin view.

### 3.1 Landing & marketing experience

Routes:
- / (frontend/app/page.js): primary landing page
- /enhanced-landing (frontend/app/enhanced-landing/page.js): animation-heavy variant

Key sections and features:
- Hero with product positioning + CTA to Sign up
- Feature grid describing capabilities (real-time scoring, intake sources, analytics, ledger messaging)
- Analytics teaser section anchor
- Team section using a horizontally scrolling TeamGrid with flip cards
- FAQ section
- Hamburger menu overlay navigation

Landing animations (documented in LANDING_PAGE_ANIMATIONS.md):
- BlobCanvas: morphing canvas blobs
- HexGrid: scroll-reactive hex beehive grid
- WebGLOrbs: Three.js orbs + menu burst
- GSAP ScrollTrigger effects: parallax + velocity “warp”

### 3.2 Authentication UX

Routes:
- /login (frontend/app/login/page.tsx)
- /signup (frontend/app/signup/page.tsx)

Features:
- Sign up creates an account via POST /api/v1/auth/signup
- Sign in returns a JWT via POST /api/v1/auth/login
- Session hydration via GET /api/v1/auth/me
- Pages like /dashboard and /upload redirect to /login when unauthenticated

### 3.3 Advanced analyst dashboard

Route:
- /dashboard (frontend/app/dashboard/page.js)

Core widgets and workflows:
- Quick stats: total analyses, malicious/suspicious/benign counts, average score, last updated
- Theme toggle (dark/light)
- Quick intake submission (structured payload: language, tags, platform, city/region)
- Live activity feed (SSE) with reconnect toast behavior
- World heatmap map panel
- Recent cases list + selection → case detail view

Live updates:
- Uses Server-Sent Events from GET /api/v1/events/stream
- “Hydrates” each event into full case detail via GET /api/v1/cases/{id}

### 3.4 Case details and analyst actions

Component:
- frontend/components/CaseDetail.jsx

Displayed information (high-level):
- Case header: intake id, timestamp, classification badge, composite score dial
- Explainability panel assembled from available signals:
  - Azure OpenAI GPT-4 reasoning (plain-English)
  - Azure Content Safety flagged categories (if present)
  - AI probability (if present)
  - Top heuristic triggers
  - Behavioral risk signal (if present)
- Deep breakdown panels:
  - stylometric anomalies (token stats, cadence, etc.)
  - heuristics list
  - provenance + watermark notes (when available)
  - graph intelligence summary (communities, clusters, coordination alerts, propagation chains)

Analyst decision workflow:
- Flag / Monitor / Escalate / Dismiss actions
- Optional analyst notes
- Writes to the backend audit trail via POST /api/v1/cases/{id}/decision
- Audit trail fetch + display via GET /api/v1/cases/{id}/audit (enterprise permission)

Note: “sharing package generation” is intentionally disabled in the current UI client and API wrapper (see frontend/lib/api.js).

### 3.5 Submissions and case browser

Route:
- /submissions (frontend/app/submissions/page.js)

Features:
- Paginated-ish list loading (limit=100)
- Real-time updates via SSE + case hydration
- Filters: all / malicious / suspicious / benign
- Search: by intake id, source, platform, region
- Deep-link support: /submissions?case=<id> auto-selects and scrolls to the case detail panel

### 3.6 Bulk upload and batch analysis (enterprise-only)

Route:
- /upload (frontend/app/upload/page.js)

Enterprise gating:
- If the user is not enterprise, shows an UpgradePrompt instead of the upload UI

File ingestion:
- Drag-and-drop zone supports .eml, .json, .txt, .html, .pdf
- Metadata extraction:
  - EML: From + Subject parsing + header/body separation
  - JSON: reads text/content + platform + author/user + location + hashtags
- Language selection per file (multi-language list)
- Region selection required per file before analysis
- Batch processing loop submits each file via POST /api/v1/intake
- Per-file success/error reporting

### 3.7 Analytics (interactive)

Route:
- /analytics (frontend/app/analytics/page.js)

Charts and computations (Recharts):
- Time range filters: 24h / 7d / 30d / all
- Classification breakdown and trends
- Score distribution
- Platform breakdown
- Region ranking (top 10)
- Enterprise analytics derived from breakdown fields when present:
  - consumer vulnerability risk buckets
  - top recommended actions
  - Azure signal averages (OpenAI risk, Content Safety score)
  - radar-style “signal contribution” averages
- Live updates via SSE with hydration

### 3.8 Superuser (enterprise admin)

Route:
- /superuser (frontend/app/superuser/page.js)

Capabilities:
- Enterprise-only visibility based on view_detailed_reports permission
- Time-range analytics summary: volume, classification counts, average score, top regions, trend
- World heatmap
- System monitor panel
- Report generators (downloads as plain text files):
  - Executive risk intelligence brief
  - Threat trend & exposure analysis
  - Content safety & policy compliance assessment

### 3.9 Guided “simple” dashboard

Route:
- /simple (frontend/app/simple/page.js)

Purpose:
- A calmer, lower-density UX for quick narrative checks

Features:
- Live SSE stream with auto-reconnect
- Intake form (same structured schema)
- Quick metrics cards
- Result list + case overview
- ImageAnalyzer panel for quick image moderation-style checks

---

## 4) Theming, color system, and UI primitives

### Tailwind + CSS variables
- Tailwind is used for layout, typography, spacing, and most component styling.
- frontend/app/globals.css defines:
  - global CSS variables (HSL tokens like --background/--foreground)
  - custom component layers (e.g., gradient-button)
  - light-mode overrides via :root[data-theme="light"] and body[data-theme="light"]

### Theme toggling
- frontend/components/ThemeToggle.jsx sets data-theme=dark|light on both <html> and <body>
- Theme preference is persisted in localStorage (key: theme)

### Visual language used across the app
- Dark-first “investigative” UI with emerald/cyan accents
- Glassmorphism surfaces (semi-transparent panels + blur)
- Gradient accents for primary CTAs and key status indicators

---

## 5) Backend features (FastAPI)

### 5.1 Authentication

Endpoints:
- POST /api/v1/auth/signup: create account (individual or enterprise)
- POST /api/v1/auth/login: returns JWT
- GET /api/v1/auth/me: returns username, role, permissions

Implementation notes:
- Supports default demo users via environment variables (USER_<name>=<pass>:<role>) and/or DB users.
- JWT is signed with JWT_SECRET_KEY (default value should be overridden in production).

### 5.2 Core analysis pipeline

Endpoint:
- POST /api/v1/intake

Key behaviors:
- Validates content length (>= 20 chars via schema) and requires region (city/district)
- Runs orchestrator pipeline and returns a DetectionResult
- Writes the case into SQLite
- Emits an SSE event so dashboards update in real time
- Attempts heatmap recording in a non-blocking way

### 5.3 Case management + audit trail

Endpoints:
- GET /api/v1/cases: list recent cases (limit param)
- GET /api/v1/cases/{id}: fetch full case data
- POST /api/v1/cases/{id}/decision: record analyst decision (flag/monitor/escalate/dismiss)
- GET /api/v1/cases/{id}/audit: immutable audit trail (enterprise permission)
- GET /api/v1/export/cases: export cases (enterprise permission)

### 5.4 Live streaming

Endpoint:
- GET /api/v1/events/stream

Notes:
- Server-Sent Events (EventSource friendly)
- Used by /dashboard, /submissions, /analytics, and /simple for live updates

### 5.5 GeoIP location detection

Endpoint:
- GET /api/v1/location

Notes:
- Uses MaxMind GeoLite2 City database (data/GeoLite2-City.mmdb)
- Handles proxy headers (X-Forwarded-For, X-Real-IP) for Azure deployments

### 5.6 Heatmap storage

Endpoints:
- POST /api/v1/heatmap/add-risk-point
- GET /api/v1/heatmap/grid

Notes:
- Persists points in data/heatmap_points.json
- Region-to-lat/lon mapping is controlled via an in-file REGION_COORDS map

### 5.7 Threat intelligence exports

Endpoints:
- GET /api/v1/integrations/threat-intel
- GET /api/v1/integrations/siem

Purpose:
- Provide integration-friendly summaries derived from the graph intelligence layer

---

## 6) Scoring and explainability (signals)

The project blends multiple signals into an enterprise trust risk score.
Based on the current product positioning (see README.md), the default weighting is:

- Azure OpenAI semantic risk (40%)
- Azure Content Safety (25%)
- Hugging Face AI detection (20%)
- Behavioral & stylometric analysis (15%)

What analysts see:
- Composite score and classification
- Plain-language “reasoning” when Azure OpenAI is enabled
- Safety categories/flags when Content Safety is enabled
- Heuristic triggers and stylometric anomalies

---

## 7) Data storage

- SQLite (data/app.db): cases, users, audit trail
- Heatmap file (data/heatmap_points.json): world heatmap points
- GeoIP database (data/GeoLite2-City.mmdb): optional IP → location lookup

---

## 8) Tests

Backend tests live under tests/ and include:
- test_detection.py
- test_language_normalization.py
- test_sharing.py (note: sharing UI/API is currently disabled; this test may reflect earlier iterations)

---

## 9) Key docs to read next

- FULL_PROJECT_DOCUMENTATION.md (deep system reference)
- README.md (quick start + env setup)
- LANDING_PAGE_ANIMATIONS.md (landing animation architecture)
- docs/architecture.md (architecture notes)
- app/APP_OVERVIEW.md, app/integrations/INTEGRATIONS_OVERVIEW.md, app/auth/AUTH_OVERVIEW.md (module overviews)

