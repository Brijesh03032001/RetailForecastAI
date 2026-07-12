# RetailForecastAI — Future Scope

Ideas for extending the project beyond its current state. Grouped by effort/impact.

## Near-term (fills real gaps)

- **Wire up the real GCP path end-to-end.** Everything in `etl/beam_pipeline.py` and `bq/sql/` is real, untouched code — just needs a GCP project, GCS bucket, and billing enabled to run for real. Would validate the BigQuery ML ARIMA_PLUS numbers against the local seasonal-average approximation currently used for local dev.
- **Finish the narrative batch.** Only 5/1,115 stores have generated narratives right now (Ollama, local). Run `scripts/sync_narratives.py --limit 1115` for full coverage — CPU-bound, ~20s/store on local Ollama, so budget the time or move to Groq/OpenAI for parallel throughput.
- **Expand baseline model comparison.** A local baseline report now exists in `data/reports/baseline_comparison.md`, comparing the local seasonal-trend approach against seasonal-naive and moving averages. Next upgrade: add a scikit-learn/LightGBM baseline using the PySpark feature table and compare against the eventual BigQuery ML numbers.
- **Test coverage.** `pyproject.toml` gates CI at only 30% coverage (`--cov-fail-under=30`). `tests/` now covers API + ETL + RAG basics plus the local forecast/baseline scripts, but dashboard queries, pipeline orchestration, and error paths still need deeper tests.
- **Pin dependencies harder.** Several version-drift issues surfaced this session (`langchain-openai` missing, `psycopg2-binary` missing, pyarrow allocator crash, pandas 3.x behavior change). A `requirements.lock` / `uv.lock` would prevent this from recurring on a fresh clone.

## Medium-term (new capability)

- **Real-time / incremental forecasting.** Current pipeline is a full weekly batch re-train. A streaming or incremental-update path (new day's actuals → adjust next-day forecast without full retrain) would be a meaningful upgrade for the "production-grade" framing.
- **Model monitoring / drift detection.** `bq/sql/evaluate_model.sql` computes MAE/MAPE/RMSE once per training run; no tracking of metric drift over time or automated retrain triggers.
- **Multi-tenant / auth on the API.** `POST /v1/pipeline/run` uses a single shared secret header. A real deployment would want per-user auth (API keys, OAuth) rather than one static secret.
- **Alerting.** No notification path exists for pipeline failures (`pipeline_runs.status = 'failed'` just sits in the table). Slack/email webhook on failure would close the loop.

## Long-term (bigger bets)

- **Swap ARIMA_PLUS for a learned model.** BigQuery ML ARIMA_PLUS is convenient (zero infra, per-product auto-training) but a gradient-boosted or transformer-based forecaster (e.g. via Vertex AI, or a custom PyTorch/LightGBM model trained on the PySpark feature table) could likely beat it on MAPE, at the cost of infra complexity.
- **Multi-region / multi-currency support.** Dataset and pipeline are Rossmann-specific (Germany, EUR). Generalizing the schema to support arbitrary retailers/currencies would make this reusable beyond a portfolio demo.
- **Frontend beyond Streamlit.** Streamlit is fine for an internal BI tool but not a customer-facing product. A React/Next.js frontend consuming the FastAPI backend would be the natural next step if this became a real product rather than a demo.

## Explicitly out of scope (by design, not oversight)

- Fabricating git history / backdated commits to misrepresent development timeline — declined during this session, not pursued as future work either.
