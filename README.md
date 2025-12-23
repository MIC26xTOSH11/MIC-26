# TattvaDrishti


**Azure-first platform to detect and mitigate malign information operations for Microsoft Imagine Cup 2026.**

Combines advanced AI detection with multi-layered analysis:
- 🔵 **Azure OpenAI Semantic Risk** (40% weight) — GPT-4-powered contextual risk assessment with plain-English reasoning
- 🟣 **Azure Content Safety** (25% weight) — Native detection of manipulative persuasion, harmful intent, and coordinated influence
- 🔍 **Hugging Face AI Detection** (20% weight) — State-of-the-art AI-generated content detection
- 🎯 **Behavioral & Stylometric Analysis** (15% weight) — Urgency, manipulation, and linguistic fingerprinting

**Key Features:**
- Text-only content intake with minimal metadata
- Blended Enterprise Trust Risk Score (0–100, Low/Medium/High/Critical)
- Human-readable explainability panel (“Why was this flagged?”)
- Analyst decision view (Flag / Monitor / Escalate + notes)
- Immutable case history and audit trail
- Minimal dashboard with content list, risk levels, and detail views
- Fully Azure-first architecture (no local LLMs required)
- Judge-proof demo mode with clean Azure AI logs

---

---

## ⚠️ Python Version Requirement


**This project requires Python 3.12+**

### Install Python 3.11

**macOS (Homebrew)**
```bash
brew install python@3.11
```

**macOS (pyenv)**
```bash
brew install pyenv
pyenv install 3.11.9
pyenv local 3.11.9  # Uses .python-version file
```

**Windows (Chocolatey)**
```powershell
choco install python --version=3.11.9 -y
```

**Ubuntu/Debian**
```bash
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv
```

**Fedora/RHEL**
```bash
sudo dnf install -y python3.11 python3.11-venv
```

---

## 🚀 Quick Start


### 1. Azure Setup (Required for Semantic Analysis)

- **Azure OpenAI**: Provision a GPT-4 deployment and set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and `AZURE_OPENAI_DEPLOYMENT` in your `.env` file.
- **Azure Content Safety**: Provision Content Safety resource and set `AZURE_CONTENT_SAFETY_ENDPOINT` and `AZURE_CONTENT_SAFETY_KEY` in `.env`.

No local LLMs or Ollama required for Imagine Cup mode.

### 2. Backend (FastAPI)

```bash
# Clone the repo
git clone https://github.com/Team-ASHTOJ/TattvaDrishti.git
cd TattvaDrishti

# Create virtual environment with Python 3.11
python3.11 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Create .env file (copy from example)
cp .env.example .env

# Start the backend server
uvicorn app.main:app --reload
```

Backend will be available at: **http://127.0.0.1:8000**

### Frontend (Next.js)

```bash
cd frontend

# Create environment file
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000' > .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## 📁 Project Structure

```
TattvaDrishti/
├── app/                      # FastAPI backend
│   ├── main.py              # API routes and server
│   ├── config.py            # Settings and environment config
│   ├── schemas.py           # Pydantic models
│   ├── integrations/        # Azure OpenAI, Content Safety, HuggingFace clients
│   ├── models/              # Detection, graph, watermark engines
│   ├── services/            # Orchestrator
│   └── storage/             # SQLite database layer
├── frontend/                # Next.js dashboard
│   ├── app/                 # Pages and layouts
│   ├── components/          # React components
│   └── lib/                 # API client
├── templates/               # Jinja2 templates
├── tests/                   # Unit tests
├── .python-version          # Python version for pyenv/asdf
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

---

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the project root (optional):

```bash
APP_ENV=dev
DATABASE_URL=sqlite:///./data/app.db
WATERMARK_SEED=your-secret-seed
HF_MODEL_NAME=roberta-base-openai-detector
HF_TOKENIZER_NAME=roberta-base-openai-detector
HF_DEVICE=-1  # -1 for CPU, 0+ for GPU
AZURE_OPENAI_ENDPOINT=your-azure-endpoint
AZURE_OPENAI_KEY=your-azure-key
AZURE_OPENAI_DEPLOYMENT=your-gpt4-deployment
AZURE_CONTENT_SAFETY_ENDPOINT=your-content-safety-endpoint
AZURE_CONTENT_SAFETY_KEY=your-content-safety-key
```


### Frontend Environment Variables

The frontend requires `.env.local` (already gitignored):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🧪 Running Tests

```bash
# Activate virtual environment
source .venv/bin/activate

# Run tests
pytest
```

---

## 📦 Dependencies

### Backend
- **FastAPI** 0.104.1 — Web framework
- **Pydantic** 2.x — Data validation
- **Uvicorn** 0.23.2 — ASGI server
- **Azure OpenAI SDK** — GPT-4 risk assessment
- **Azure Content Safety SDK** — Harm detection
- **Transformers** — HuggingFace models
- **PyTorch** — ML framework
- **NetworkX** 3.1 — Graph intelligence
- **Jinja2** 3.1.2 — Template engine

### Frontend
- **Next.js** 14.2.3 — React framework
- **React** 18.2.0
- **Tailwind CSS** 3.4.4 — Styling
- **SWR** 2.2.4 — Data fetching

---

## 👥 For Teammates

### First Time Setup

1. **Ensure Python 3.11 is installed** (see above)
2. **Clone the repo**
   ```bash
   git clone https://github.com/Team-ASHTOJ/TattvaDrishti.git
   cd TattvaDrishti
   ```
3. **Backend setup**
   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
4. **Frontend setup**
   ```bash
   cd frontend
   echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000' > .env.local
   npm install
   ```

### Daily Development

**Terminal 1 - Backend**
```bash
cd TattvaDrishti
source .venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend**
```bash
cd TattvaDrishti/frontend
npm run dev
```

---

## 🛡️ Security Notes

- Database file (`data/app.db`) is gitignored
- Environment files (`.env`, `.env.local`) are gitignored
- Virtual environments (`.venv`) are gitignored
- Node modules are gitignored

---

## 📝 License

[Add your license here]

---

## 🤝 Contributing

1. Ensure Python 3.11.x is installed
2. Create a feature branch
3. Make your changes
4. Run tests: `pytest`
5. Submit a pull request

---

## ❓ Troubleshooting

### "Python 3.11.x is required" error
- Install Python 3.11 (see installation instructions above)
- Recreate your virtual environment with Python 3.11

### Backend won't start
- Verify Python version: `python --version` (should show 3.11.x)
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend API connection errors
- Ensure backend is running on port 8000
- Check `.env.local` has correct `NEXT_PUBLIC_API_BASE_URL`

---

**Built with ❤️ by Team ASHTOJ**


```bash
cd frontend
npm install
npm run dev
```

The app expects the API to be reachable at `http://localhost:8000` by default. To point at a different backend, set `NEXT_PUBLIC_API_BASE_URL` before running `npm run dev`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://shield.example.com npm run dev
```

Key experiences showcased:

- Live ingestion form that posts to `/api/v1/intake`
- Real-time event stream over `/api/v1/events/stream`
- Case drill-down that hydrates via `/api/v1/cases/{intake_id}`
- One-click sharing package generation via `/api/v1/share`

### Sample Intake

```bash
curl -X POST http://127.0.0.1:8000/api/v1/intake \
  -H "Content-Type: application/json" \
  -d @samples/intake_example.json
```

## Hugging Face GPU Detector

1. **Model prep** (offline-friendly): download once and cache locally.
   ```bash
   python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
tokenizer = AutoTokenizer.from_pretrained('roberta-base-openai-detector'); \
model = AutoModelForSequenceClassification.from_pretrained('roberta-base-openai-detector')"
   ```
   To point at a custom or fine-tuned model directory, set environment variables:
   ```bash
   export HF_MODEL_NAME=/path/to/model
   export HF_TOKENIZER_NAME=/path/to/model
   export HF_DEVICE=0  # GPU id or -1 for CPU
   ```

2. **Run with GPU**: ensure PyTorch detects your CUDA device (`python -c "import torch; print(torch.cuda.is_available())"`).

3. **Threshold tuning** (default 0.6):
   ```bash
   export HF_SCORE_THRESHOLD=0.55
   ```

## Optional Ollama Integration

Enable qualitative risk scoring through a local Ollama model (e.g., `mistral`, `codellama`, or a fine-tuned guard model).

```bash
ollama pull mistral
export OLLAMA_ENABLED=true
export OLLAMA_MODEL=mistral
export OLLAMA_TIMEOUT=20  # seconds
```

The detector will prompt the model for a JSON risk rating (0-1) and blend it with heuristics/Hugging Face probabilities.

## Testing

```bash
pytest
```


## API Reference

- `POST /api/v1/intake` — Analyse content (text-only, minimal metadata)
- `GET /api/v1/cases/{intake_id}` — Retrieve stored case summary
- `POST /api/v1/cases/{intake_id}/decision` — Analyst decision (Flag/Monitor/Escalate/Dismiss)
- `GET /api/v1/cases/{intake_id}/audit` — Immutable audit trail for a case
- `GET /api/v1/cases` — List all cases for dashboard

## Data & Storage

SQLite database stored at `data/app.db` (configurable via `DATABASE_URL`).


## Imagine Cup 2026 Features

- Azure OpenAI-powered semantic risk analysis (score 0–100 + category + plain-English reasoning)
- Native Azure AI Content Safety detection (manipulative persuasion, harmful intent, coordinated influence)
- Single blended Enterprise Trust Risk Score with opinionated thresholds
- Human-readable explainability panel (“Why was this flagged?”)
- Analyst decision view (Flag / Monitor / Escalate + notes)
- Immutable case history and audit trail
- Minimal dashboard showing analyzed content list, risk levels, and detail views
- Fully Azure-first architecture
- Judge-proof demo mode enforcing Azure AI path with clean logs
