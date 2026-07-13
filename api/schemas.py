from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

# ── Forecasts ──────────────────────────────────────────────────


class ForecastRow(BaseModel):
    forecast_date: date
    forecast_units: float = Field(..., ge=0)
    ci_lower: float | None = None
    ci_upper: float | None = None

    model_config = {"from_attributes": True}


class ForecastsResponse(BaseModel):
    product_id: str
    count: int
    forecasts: list[ForecastRow]


# ── Dashboard / Analytics ──────────────────────────────────────


class StoreListResponse(BaseModel):
    count: int
    stores: list[str]


class FleetSummaryRow(BaseModel):
    product_id: str
    total_30d: float
    avg_daily: float
    peak_day: float
    avg_ci_width: float | None = None


class FleetSummaryResponse(BaseModel):
    count: int
    stores: list[FleetSummaryRow]


class DailyTrendRow(BaseModel):
    forecast_date: date
    total_units: float
    avg_per_store: float
    stores_active: int


class DailyTrendResponse(BaseModel):
    count: int
    days: list[DailyTrendRow]


class DayOfWeekPatternRow(BaseModel):
    dow: int
    day_abbr: str
    avg_units: float
    total_units: float


class DayOfWeekPatternResponse(BaseModel):
    count: int
    days: list[DayOfWeekPatternRow]


class WeeklyFleetRow(BaseModel):
    week_start: date
    total_units: float
    avg_per_store: float


class WeeklyFleetResponse(BaseModel):
    count: int
    weeks: list[WeeklyFleetRow]


class NarrativeCoverageResponse(BaseModel):
    narrative_rows: int
    stores_with_narratives: int
    total_stores: int
    coverage_pct: float


class BaselineMetricRow(BaseModel):
    model: str
    mae: float
    rmse: float
    mape_pct: float
    bias_pct: float


class BaselineMetricsResponse(BaseModel):
    count: int
    metrics: list[BaselineMetricRow]


# ── Narratives ─────────────────────────────────────────────────


class NarrativeResponse(BaseModel):
    product_id: str
    summary: str
    generated_at: datetime

    model_config = {"from_attributes": True}


# ── Pipeline ───────────────────────────────────────────────────


class PipelineTriggerResponse(BaseModel):
    run_id: int
    status: Literal["queued"]
    message: str = "Pipeline queued. Check /pipeline/runs/{run_id} for status."


class PipelineRunResponse(BaseModel):
    id: int
    status: str
    triggered_by: str
    started_at: datetime
    finished_at: datetime | None
    error: str | None

    model_config = {"from_attributes": True}


# ── Health ─────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    db: Literal["ok", "error"]
