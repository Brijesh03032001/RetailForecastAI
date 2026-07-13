# RetailForecastAI — Session Memory

Record of what this project already has, and what was done in this session to get it running locally (2026-07-12).

## What the project is

End-to-end retail demand forecasting system on the Rossmann Store Sales dataset (1,115 German stores). Portfolio-grade MLOps pipeline, Python 3.12+.

## What already existed (built into the repo)

| Component | File(s) | Purpose |
|---|---|---|
| ETL | `etl/beam_pipeline.py` | Apache Beam, CSV → GCS → BigQuery, validation/dedup/type-coercion |
| Feature engineering | `spark/feature_engineering.py`, `spark/spark_eda.ipynb` | PySpark rolling averages, lag features, calendar signals, EDA |
| Forecasting | `bq/sql/*.sql` | BigQuery ML ARIMA_PLUS — per-store model, 30-day horizon, 80% CI |
| Database | `db/models.py`, `migrations/` | Postgres via SQLAlchemy async + asyncpg, Alembic migrations. Tables: `forecasts`, `narratives`, `pipeline_runs` |
| API | `api/` | FastAPI — `/health`, `/v1/forecasts/{id}`, `/v1/narrative/{id}`, `POST /v1/pipeline/run` |
| RAG/LLM narratives | `rag/` | LangChain, FAISS vector store, local MiniLM embeddings, LLM-agnostic chat call |
| Dashboard | `streamlit_app.py` | 6-tab Streamlit + Plotly BI dashboard |
| Orchestration | `pipeline/orchestrator.py` | Coordinates ETL → BQ → DB → LLM full run |
| Scripts | `scripts/` | `seed_data.py`, `sync_forecasts.py`, `sync_narratives.py`, `run_bqml.py`, `build_index.py` |
| Tests | `tests/` | pytest, api + etl + rag tests |
| CI/CD | `.github/workflows/` | Lint/type/test on push; semver-tag deploy to Cloud Run via Workload Identity Federation |
| Containerization | `Dockerfile`, `docker-compose.yml` | Multi-stage build, Postgres + API services |

Real dataset in `data/raw/`: `train.csv` (~1M rows), `test.csv`, `store.csv` (1,115 stores) — genuine Kaggle Rossmann data, not synthetic.

## What this session did

**Goal**: make the project runnable locally without a GCP project (no billing, no cloud dependency), while keeping the real GCP/BigQuery ML path intact and untouched for later.

1. **Rebuilt the venv on native arm64 Python** (`/opt/homebrew/bin/python3.13`) — the original setup used Anaconda's x86_64 Python running under Rosetta translation, which was a source of instability on this Apple Silicon (M4) Mac.
2. **Fixed missing/broken dependencies** in `pyproject.toml`:
   - Added `langchain-openai` (was required by `rag/narrative_chain.py`'s openai code path but missing from the `rag` extra)
   - Added `psycopg2-binary` (imported directly by `streamlit_app.py`, missing from `ui` extra)
   - Pinned `pandas>=2.2,<3.0` (pandas 3.x's new pyarrow-backed dtype default was a secondary crash risk)
3. **Found and fixed the real Streamlit crash**: pyarrow's bundled mimalloc allocator segfaults (`EXC_BAD_ACCESS SIGSEGV`) on this macOS build when Streamlit serializes dataframes/charts to the browser via Arrow IPC — confirmed via macOS crash reports (`~/Library/Logs/DiagnosticReports/`), not environment flakiness. Fix: `ARROW_DEFAULT_MEMORY_POOL=system` env var forces Arrow to use the OS allocator instead of the crashing mimalloc one. Baked into `make ui` in the `Makefile`.
4. **Added `config/settings.py: openai_api_base`** and wired it into `rag/narrative_chain.py`'s `ChatOpenAI` call — lets any OpenAI-compatible endpoint (not just OpenAI itself) serve as the narrative LLM via `openai_api_base` override. Currently pointed at local **Ollama** (`http://localhost:11434/v1`, model `llama3`) — free, fully local, zero API cost, no external key needed.
5. **Added `scripts/seed_forecasts_local.py`** — a local substitute for the BigQuery ML training/forecast stage. Computes a real per-store 30-day forecast directly from `data/raw/train.csv` (day-of-week seasonal average + short-term trend adjustment, ±80% CI band from day-of-week std dev) and writes straight into the Postgres `forecasts` table. Produces the same 33,450-row / 1,115-store output the README describes, without needing GCP/BigQuery.
6. **Ran the full local pipeline**: Docker Postgres → Alembic migrations → local forecast seed (33,450 rows) → FAISS index build from `data/business_docs/` → narrative generation for 5 stores via Ollama → FastAPI + Streamlit both verified live.

## Current runnable state

- `make up` — Postgres via Docker
- `make migrate` — Alembic migrations
- `env $(cat .env|grep -v '^#'|xargs) .venv/bin/python scripts/seed_forecasts_local.py` — seed all 1,115 stores' forecasts locally (no GCP)
- `env $(cat .env|grep -v '^#'|xargs) .venv/bin/python -m scripts.build_index` — build FAISS index
- `env $(cat .env|grep -v '^#'|xargs) .venv/bin/python scripts/sync_narratives.py --limit N` — generate LLM narratives via local Ollama
- `env $(cat .env|grep -v '^#'|xargs) .venv/bin/python scripts/sync_narratives.py --limit N --skip-existing` — safely generate the next unfinished narrative batch
- `make run` — FastAPI on :8080
- `make ui` — Streamlit dashboard on :8501 (now includes the Arrow allocator fix automatically)
- `make local-doctor` — check raw data, baseline report, FAISS, DB forecast/narrative counts, and API health

`.env` is configured for: local Postgres, `LLM_PROVIDER=openai` pointed at local Ollama via `OPENAI_API_BASE=http://localhost:11434/v1`, `EMBEDDING_PROVIDER=local` (MiniLM, no API calls).

## Follow-up local hardening session

Non-GCP improvements added after the first local bring-up:

1. **Made local forecasting testable** by allowing `scripts/seed_forecasts_local.py` to read from an injected data directory, while preserving the default real Rossmann CSV path.
2. **Added local forecast tests** in `tests/test_local_forecasting.py` covering store limits, forecast shape, confidence interval sanity, and report generation.
3. **Added `scripts/baseline_compare.py`** to backtest the local seasonal-trend forecaster against simple baselines on the final 30-day holdout window from `data/raw/train.csv`.
4. **Generated baseline artifacts**:
   - `data/reports/baseline_comparison.md`
   - `data/reports/baseline_metrics.csv`
5. **Promoted local workflows into the Makefile**:
   - `make seed-local-forecasts`
   - `make baseline-report`
6. **Updated docs** so README now clearly separates the no-GCP local demo path from the cloud production path.

Current baseline result on 1,115 stores / 33,450 holdout rows: `local_seasonal_trend` is best by MAE among the included local baselines (MAE 1,898.84; MAPE 16.92%).

## Continued local polish

- Added a Streamlit **Model Benchmarks** tab that reads `data/reports/baseline_metrics.csv` and visualizes MAE/RMSE/MAPE/bias for the local baseline comparison.
- Added `scripts/local_doctor.py` plus `make local-doctor` to check no-GCP demo readiness: raw Rossmann CSVs, baseline metrics, FAISS index, PostgreSQL forecast/narrative counts, and FastAPI health.
- Added focused tests for the local doctor helper behavior in `tests/test_local_doctor.py`.
- Added `requirements.lock` plus `make lock` to pin the current local runtime dependency set and reduce fresh-clone drift.
- Updated `scripts/sync_narratives.py` to support `--skip-existing` and save each completed narrative immediately, so interrupted local Ollama batches keep completed work.
- Added FastAPI dashboard/frontend endpoints under `/v1/dashboard/*` for store lists, fleet summaries, daily/weekly trends, day-of-week patterns, narrative coverage, and baseline metrics. This prepares the backend for a future Next.js frontend without direct DB access.

## Current local state after backend-first work

- Forecasts: 33,450 rows for 1,115 stores in local PostgreSQL.
- Narratives: 20 stores currently saved (`STORE_0001` through `STORE_0020`).
- Baseline evidence: local seasonal-trend model beats the included seasonal-naive/moving-average baselines by MAE on the final 30-day holdout.
- Dashboard: includes Network Overview, Store Forecast, Compare, Model Benchmarks, AI Narrative, and About tabs. Sidebar now shows narrative coverage.
- Backend: FastAPI now exposes frontend-ready dashboard endpoints:
  - `/v1/dashboard/stores`
  - `/v1/dashboard/fleet-summary`
  - `/v1/dashboard/daily-trend`
  - `/v1/dashboard/dow-pattern`
  - `/v1/dashboard/weekly-fleet`
  - `/v1/dashboard/narrative-coverage`
  - `/v1/dashboard/baseline-metrics`
- Testing: focused API/dashboard/narrative/local-doctor tests pass locally; full repo lint/test still has older unrelated Spark notebook / optional Beam dependency issues.
- Git: latest local commits are split into multiple meaningful commits, including dashboard coverage UI, dashboard API routes, API tests, and API docs.
