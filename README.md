![RetailForecastAI](genai_retail_forecast_cover.png)

# RetailForecastAI

> An end-to-end retail demand forecasting system — real ML on a real dataset, a RAG pipeline that explains the forecasts in plain language, and a full-stack Next.js product surface on top of it.

[![CI](https://img.shields.io/github/actions/workflow/status/Brijesh03032001/RetailForecastAI/ci.yml?branch=main&label=CI)](https://github.com/Brijesh03032001/RetailForecastAI/actions)
[![Python](https://img.shields.io/badge/python-3.12+-blue)](pyproject.toml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](frontend/package.json)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](#)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Why I Built This](#why-i-built-this)
3. [Architecture](#architecture)
4. [Features](#features)
5. [The Dashboard](#the-dashboard)
6. [Tech Stack](#tech-stack)
7. [Backtested Accuracy](#backtested-accuracy)
8. [Getting Started](#getting-started)
9. [API Reference](#api-reference)
10. [Author](#author)

---

## Introduction

RetailForecastAI forecasts 30-day product demand for **1,115 real Rossmann stores** (Germany) and explains *why* the forecast looks the way it does — automatically, in a paragraph a store manager can actually read.

It's built as a genuine end-to-end system, not a notebook demo:

- **Data engineering** — Apache Beam ETL and PySpark feature engineering on the raw sales data
- **Forecasting** — BigQuery ML `ARIMA_PLUS`, one model per store, with an 80% confidence interval
- **RAG narratives** — LangChain + FAISS retrieval over business-context docs, grounding an LLM-written executive summary in retrieved facts instead of letting it guess
- **A real API** — async FastAPI over PostgreSQL, tested, containerized, deployed via CI/CD
- **A real product surface** — a Next.js dashboard and landing page, not a bare Swagger page

The repo also keeps a fully working **cloud path** (GCS → Dataflow → BigQuery ML → Cloud Run) alongside a **local, no-GCP path** used for day-to-day development, so the whole thing runs on a laptop with zero billing.

---

## Why I Built This

I'm **Brijesh Kumar**, an M.S. Computer Science student at Arizona State University. I built RetailForecastAI to go past course-project scope and ship something end to end — real retail data in, a trained forecasting model, a RAG pipeline that grounds its own claims, and a product a business user could actually open and use. It's the same shape of stack (BigQuery ML, PySpark, FastAPI, RAG, Next.js) that production teams run, built solo, on purpose, to prove I can own a system across every layer.

---

## Architecture

```
                    ┌───────────────────────────────────────────┐
                    │              DATA & ML LAYER               │
                    │                                             │
   Raw Rossmann     │  Apache Beam ETL  →  PySpark features  →   │
   CSVs (1,115      │  BigQuery ML ARIMA_PLUS (per-store model,  │
   stores)          │  30-day horizon, 80% CI)                   │
                    └───────────────────┬─────────────────────────┘
                                         ▼
                    ┌───────────────────────────────────────────┐
                    │            PostgreSQL (Docker)              │
                    │   forecasts · narratives · pipeline_runs    │
                    └───────────────────┬─────────────────────────┘
                                         ▼
                    ┌───────────────────────────────────────────┐
                    │              FASTAPI BACKEND                │
                    │  /v1/forecasts · /v1/dashboard/*             │
                    │  /v1/narrative/{id}  (GET saved)             │
                    │  /v1/narrative/{id}/generate  (live RAG)     │
                    └──────┬───────────────────────┬──────────────┘
                            │                       │
                            ▼                       ▼
              ┌───────────────────────┐   ┌───────────────────────┐
              │   RAG NARRATIVE ENGINE │   │   PRODUCT SURFACES     │
              │  FAISS retrieval over  │   │  Next.js dashboard +   │
              │  business-context docs │   │  landing page          │
              │  → LangChain → local   │   │  Streamlit BI (legacy) │
              │  Ollama / Groq / OpenAI│   │                        │
              └───────────────────────┘   └───────────────────────┘
```

Every arrow above is real, wired code — not aspirational. The `/v1/narrative/{id}/generate` endpoint calls the FAISS retriever live, feeds retrieved chunks into the LLM prompt, and returns which sources grounded the summary — visible in the dashboard as a "RAG-grounded" badge.

---

## Features

- **30-day ML forecasting** — BigQuery ML `ARIMA_PLUS`, per-store, with a bounded confidence interval on every prediction.
- **RAG-grounded AI narratives** — every executive summary is generated by retrieving real business-context passages first, then writing the summary from them — with the retrieved sources surfaced back to the user.
- **Generate on demand** — a "Generate AI analysis" button calls a local Ollama LLM live from the dashboard, matching the same flow originally prototyped in the project's Streamlit BI tool.
- **Fleet-wide analytics** — daily demand trend, top-performing stores, day-of-week seasonality, all computed live from the API.
- **Backtested accuracy** — the local forecaster is validated against seasonal-naive and moving-average baselines on a real holdout window, not just assumed to work.
- **A real frontend** — a Next.js/Tailwind dashboard and landing page with a custom glassmorphism ("Liquid Glass") design system, D3-driven charts with per-chart insight captions, and an interactive 3D scene.

---

## The Dashboard

The Next.js dashboard (`/dashboard`) has six sections:

| Section | What it shows |
|---|---|
| **Overview** | Fleet-wide daily demand trend, top stores by 30-day forecast, day-of-week pattern — each chart paired with a computed one-line takeaway |
| **Store Forecast** | Any store's full 30-day forecast with an 80% CI band, plus its AI executive summary — generate a fresh one live via Ollama |
| **Compare** | Two stores' forecasts overlaid, with a head-to-head insight on who's outperforming and by how much |
| **Model Benchmarks** | The local forecaster ranked against baseline models on a real backtest — MAE, RMSE, MAPE, bias |
| **AI Narrative** | Browse saved narratives per store, or generate a new one — shows exactly which retrieved passages grounded it |
| **About** | The real dataset, the pipeline, and the full stack behind the dashboard |

Every number on every tab comes from a live call to the FastAPI backend — nothing is hardcoded.

A separate landing page (`/`) introduces the project with an interactive 3D scene, a real backtest results section, a pipeline walkthrough, and a way to get in touch.

---

## Tech Stack

**Data & ML**
| | |
|---|---|
| Language | Python 3.12 |
| ETL | Apache Beam |
| Feature engineering | PySpark |
| Forecasting | BigQuery ML `ARIMA_PLUS` |
| Data handling | Pandas |
| BI workbook | Tableau *(in progress)* |

**Backend**
| | |
|---|---|
| API framework | FastAPI (async) |
| Validation | Pydantic v2 |
| ORM / driver | SQLAlchemy (async) + asyncpg |
| Migrations | Alembic |
| Database | PostgreSQL (Docker) |
| Testing | pytest |

**RAG / AI**
| | |
|---|---|
| Orchestration | LangChain |
| Vector store | FAISS |
| Embeddings | all-MiniLM-L6-v2 (local) |
| LLM | Ollama (local) / Groq / OpenAI-compatible |

**Frontend**
| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI library | React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn |
| Charts | D3.js (custom line/bar components, hover tooltips) |
| 3D | Three.js / WebGL, via Spline interactive scenes |
| Icons | lucide-react, react-icons |
| Design system | Custom "Liquid Glass" glassmorphism material |

**Infra**
| | |
|---|---|
| Containerization | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Cloud deploy | Google Cloud Run (keyless auth via Workload Identity Federation) |

---

## Backtested Accuracy

The local forecaster is backtested against simple baselines on the final 30-day holdout window (1,115 stores, 33,450 rows):

| Model | MAE | RMSE | MAPE % | Bias % |
|---|---:|---:|---:|---:|
| **`local_seasonal_trend`** (winner) | **1,898.84** | 3,033.18 | **16.92** | 17.06 |
| `seasonal_naive_7d` | 1,936.19 | 3,008.47 | 21.91 | 16.46 |
| `moving_average_28d` | 2,175.10 | 3,100.44 | 23.03 | 2.70 |
| `moving_average_7d` | 2,251.98 | 3,291.47 | 24.74 | 13.28 |

Full report: [`data/reports/baseline_comparison.md`](data/reports/baseline_comparison.md).

---

## Getting Started

The fastest path runs entirely locally — no GCP billing required.

```bash
# Backend
git clone https://github.com/Brijesh03032001/RetailForecastAI.git
cd RetailForecastAI
make install                # create venv, install deps
cp .env.example .env
make up && make migrate     # Postgres + schema
make seed-local-forecasts   # forecasts from real Rossmann CSVs
make build-index            # FAISS index for RAG
make run                    # FastAPI on :8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # Next.js on :3000
```

`make local-doctor` checks the whole local path is healthy (data, FAISS index, DB, API). The original Streamlit BI dashboard is still available via `make ui` (`:8501`), reading straight from PostgreSQL.

The cloud production path (Beam/Dataflow → BigQuery ML → Cloud Run) is untouched and documented inline in `etl/`, `bq/sql/`, and `.github/workflows/deploy.yml`.

---

## API Reference

```text
GET  /health                              — DB connectivity check
GET  /v1/forecasts/{product_id}           — 30-day forecast + CI bands
GET  /v1/narrative/{product_id}           — latest saved AI summary
POST /v1/narrative/{product_id}/generate  — generate a fresh RAG-grounded summary live
GET  /v1/dashboard/stores                 — store list
GET  /v1/dashboard/fleet-summary          — per-store 30-day totals
GET  /v1/dashboard/daily-trend            — fleet daily aggregate
GET  /v1/dashboard/dow-pattern            — day-of-week demand pattern
GET  /v1/dashboard/narrative-coverage     — % of stores with a saved narrative
GET  /v1/dashboard/baseline-metrics       — local backtest results
POST /v1/pipeline/run                     — trigger the full pipeline (authenticated)
```

Interactive docs at `http://localhost:8080/docs` in development.

---

## Author

**Brijesh Kumar** — M.S. Computer Science, Arizona State University

[GitHub](https://github.com/Brijesh03032001/RetailForecastAI) · [LinkedIn](https://linkedin.com/in/brijeshkumar03) · bkumar25@asu.edu
