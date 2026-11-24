![RetailForecastAI](genai_retail_forecast_cover.png)

# RetailForecastAI

> End-to-end retail demand forecasting — real ML on a real dataset, benchmarked against honest baselines, a RAG layer that explains the forecasts in plain language, and a full-stack product surface on top of it.

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![BigQuery ML](https://img.shields.io/badge/BigQuery_ML-1A73E8?style=for-the-badge&logo=googlecloud&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-31648C?style=for-the-badge&logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)

---

## Highlights

- Achieved **16.92% MAPE** with a local seasonal-trend model on a **30-day Rossmann holdout** across **1,115 stores**, beating seasonal-naive and 7- and 28-day moving-average baselines at **21.91–24.74% MAPE** — closed-store days excluded from percentage-error scoring.
- Built a separate **BigQuery ML `ARIMA_PLUS`** workflow generating **33,450 daily forecasts** across **1,115 stores** over a 30-day horizon, with nominal **80% prediction intervals** so planners read a range rather than a single number.
- Owned a **5-layer ML product path** — Apache Beam ETL, PySpark features, PostgreSQL storage, async FastAPI, Next.js dashboard — turning raw Rossmann CSVs into a usable forecasting product instead of a notebook.
- Built a **2-step LangChain + FAISS RAG flow** that retrieves business-context passages before generating executive summaries, exposing the grounding sources through the live `/v1/narrative/{id}/generate` endpoint.
- Shipped **10 backend endpoints** covering forecasts, narratives, fleet summaries, daily trends, day-of-week patterns, narrative coverage, baseline metrics and authenticated pipeline runs from one auditable PostgreSQL-backed API.
- Structured **4 Tableau-ready reporting views** — forecast outputs, baseline metrics, fleet summaries, store-level trends — so analysts can work in the tool they already use.
- Created a **6-section Next.js dashboard** with D3 charts, computed insight captions, store comparisons and model benchmarks, where every number comes from the API rather than hardcoded UI data.
- Preserved **2 execution paths**: a no-billing local path (Docker, PostgreSQL, FAISS) and a full cloud path (GCS, Dataflow, BigQuery ML, Cloud Run) from the same codebase, so cost never gates evaluation.

---

## Architecture

```mermaid
flowchart LR
    CSV["Rossmann CSVs<br/>1,115 stores"] --> BEAM["Apache Beam ETL"]
    BEAM --> SPARK["PySpark<br/>feature engineering"]
    SPARK --> PG[("PostgreSQL<br/>features · forecasts · metrics")]

    SPARK --> M1["Local seasonal-trend model"]
    SPARK --> M2["BigQuery ML ARIMA_PLUS<br/>per-store"]
    M1 --> BENCH{"Benchmark vs 3 baselines"}
    BENCH --> PG
    M2 --> PG

    PG --> API["FastAPI (async)<br/>10 endpoints"]
    API --> RAG["LangChain + FAISS<br/>2-step narrative RAG"]
    RAG --> API

    API --> UI["Next.js dashboard<br/>6 sections · D3"]
    PG --> TAB["4 Tableau-ready views"]
```

## Forecast and narrative flow

```mermaid
sequenceDiagram
    participant A as Analyst
    participant U as Next.js dashboard
    participant F as FastAPI
    participant D as PostgreSQL
    participant R as FAISS + LangChain

    A->>U: open store 423
    U->>F: GET /v1/forecast/423
    F->>D: read forecast + 80% interval + baselines
    D-->>F: 30-day series
    F-->>U: point forecast, interval, baseline deltas
    A->>U: "explain this"
    U->>F: POST /v1/narrative/423/generate
    F->>R: retrieve business-context passages
    R-->>F: grounded passages
    F->>F: generate executive summary
    F-->>U: narrative + cited sources
```

---

## Backtested accuracy

30-day holdout, 1,115 stores, 33,450 rows. MAPE ignores zero-actual closed-store days.

| Model | MAPE | MAE |
|---|---|---|
| **`local_seasonal_trend`** | **16.92** | **1,898.84** |
| `seasonal_naive_7d` | 21.91 | — |
| `moving_average_28d` | 23.03 | — |
| `moving_average_7d` | 24.74 | — |

`ARIMA_PLUS` is the separate per-store cloud path and is reported with 80% prediction intervals rather than a single headline accuracy number.

## Tech stack

**Data** Apache Beam · PySpark · Pandas · PostgreSQL · SQLAlchemy · Alembic
**ML** BigQuery ML `ARIMA_PLUS` · seasonal-trend forecasting · baseline benchmarking
**AI** LangChain · FAISS · vector search · LLM narratives
**API** FastAPI · Pydantic
**Frontend** Next.js · React · TypeScript · Tailwind · shadcn/ui · D3.js · Three.js
**Platform** Docker Compose · GitHub Actions · Google Cloud Run · Workload Identity Federation

## Two ways to run it

```bash
# Local path — no cloud billing
docker compose up -d        # PostgreSQL + FAISS + FastAPI
make etl && make train && make backtest
```

```bash
# Cloud path — GCS + Dataflow + BigQuery ML + Cloud Run
make deploy-cloud
```

```bash
cd frontend && npm install && npm run dev    # http://localhost:3000
```

---

**Built by [Brijesh Kumar](https://github.com/Brijesh03032001)** · [Portfolio](https://brijeshbuilds.com) · [LinkedIn](https://linkedin.com/in/brijeshkumar03)
