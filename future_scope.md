# RetailForecastAI — Future Scope

Ideas for extending the project beyond its current state. Grouped by effort/impact.

## Near-term (fills real gaps)

- **Continue the local narrative batch.** 20/1,115 stores currently have saved narratives (`STORE_0001` through `STORE_0020`). Use the safer incremental command: `scripts/sync_narratives.py --limit 15 --skip-existing`. Local Ollama is CPU-bound, so keep batches small or switch to Groq/OpenAI for faster throughput.
- **Add local drift / monitoring history.** A baseline report exists, but each run overwrites the current metrics. Next step: persist timestamped metric snapshots and compare latest MAE/MAPE against previous runs.
- **Expand baseline model comparison.** A local baseline report now exists in `data/reports/baseline_comparison.md`, comparing the local seasonal-trend approach against seasonal-naive and moving averages. Next upgrade: add a scikit-learn/LightGBM baseline using the PySpark feature table.
- **Improve test coverage around operational flows.** `tests/` now covers API dashboard endpoints, ETL parsing, RAG formatting, local forecasting, local doctor, and narrative selection. Remaining gaps: pipeline orchestration, Streamlit query helpers, narrative generation with mocked LLM calls, and failure/interrupt paths.
- **Use the new FastAPI dashboard endpoints from the UI.** Backend endpoints now exist for a future frontend. Streamlit still directly queries PostgreSQL for some analytics; a later cleanup could make Streamlit consume FastAPI too, matching the future Next.js architecture.
- **Pin dependencies harder if needed.** `requirements.lock` exists for the current local runtime. A stronger future option would be `uv.lock` with platform-aware dependency resolution and a documented fresh-clone install path.

## Medium-term (new capability)

- **Real-time / incremental forecasting.** Current pipeline is a full weekly batch re-train. A streaming or incremental-update path (new day's actuals → adjust next-day forecast without full retrain) would be a meaningful upgrade for the "production-grade" framing.
- **Backend support for narrative generation jobs.** The CLI can safely generate and skip existing narratives now. A useful backend upgrade would expose a small job endpoint for "generate next N narratives" and job status polling, without adding auth yet.
- **Model monitoring / drift detection.** `bq/sql/evaluate_model.sql` computes ARIMA diagnostics once per training run; local baseline metrics exist but do not yet track drift over time or automated retrain triggers.
- **Multi-tenant / auth on the API.** `POST /v1/pipeline/run` uses a single shared secret header. A real deployment would want per-user auth (API keys, OAuth) rather than one static secret.
- **Alerting.** No notification path exists for pipeline failures (`pipeline_runs.status = 'failed'` just sits in the table). Slack/email webhook on failure would close the loop.

## Long-term (bigger bets)

- **Swap ARIMA_PLUS for a learned model.** BigQuery ML ARIMA_PLUS is convenient (zero infra, per-product auto-training) but a gradient-boosted or transformer-based forecaster (e.g. via Vertex AI, or a custom PyTorch/LightGBM model trained on the PySpark feature table) could likely beat it on MAPE, at the cost of infra complexity.
- **Multi-region / multi-currency support.** Dataset and pipeline are Rossmann-specific (Germany, EUR). Generalizing the schema to support arbitrary retailers/currencies would make this reusable beyond a portfolio demo.
- **Frontend beyond Streamlit.** Streamlit is fine for an internal BI tool but not a customer-facing product. A React/Next.js frontend consuming the FastAPI backend would be the natural next step if this became a real product rather than a demo.
- **Wire up the real GCP path end-to-end.** Everything in `etl/beam_pipeline.py` and `bq/sql/` is real, untouched code — just needs a GCP project, GCS bucket, and billing enabled to run for real. This is intentionally deferred while the non-GCP local/backend path is being strengthened.

## Explicitly out of scope (by design, not oversight)

- Fabricating git history / backdated commits to misrepresent development timeline — declined during this session, not pursued as future work either.
