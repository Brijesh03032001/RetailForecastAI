"""Integration tests for the FastAPI endpoints using an in-memory SQLite DB."""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from httpx import AsyncClient

from db.models import Forecast, Narrative


async def _seed_forecast(db_session, product_id: str = "SKU-001") -> list[Forecast]:
    rows = [
        Forecast(
            product_id=product_id,
            forecast_date=date(2024, 2, i + 1),
            forecast_units=float(100 + i),
            ci_lower=float(90 + i),
            ci_upper=float(115 + i),
            generated_at=datetime.now(UTC),
        )
        for i in range(3)
    ]
    db_session.add_all(rows)
    await db_session.commit()
    return rows


async def _seed_narrative(db_session, product_id: str = "SKU-001") -> Narrative:
    row = Narrative(
        product_id=product_id,
        summary="Test executive summary.",
        generated_at=datetime.now(UTC),
    )
    db_session.add(row)
    await db_session.commit()
    return row


# ── Health ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "version" in data


# ── Forecasts ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_forecasts_success(client: AsyncClient, db_session):
    await _seed_forecast(db_session, "SKU-010")
    resp = await client.get("/v1/forecasts/SKU-010")
    assert resp.status_code == 200
    data = resp.json()
    assert data["product_id"] == "SKU-010"
    assert data["count"] == 3
    assert len(data["forecasts"]) == 3


@pytest.mark.asyncio
async def test_get_forecasts_case_insensitive(client: AsyncClient, db_session):
    await _seed_forecast(db_session, "SKU-011")
    resp = await client.get("/v1/forecasts/sku-011")  # lower-case query
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_forecasts_not_found(client: AsyncClient):
    resp = await client.get("/v1/forecasts/DOES-NOT-EXIST")
    assert resp.status_code == 404


# ── Dashboard analytics ────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_stores(client: AsyncClient, db_session):
    await _seed_forecast(db_session, "STORE_0001")
    await _seed_forecast(db_session, "STORE_0002")

    resp = await client.get("/v1/dashboard/stores")

    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert data["stores"] == ["STORE_0001", "STORE_0002"]


@pytest.mark.asyncio
async def test_dashboard_fleet_summary(client: AsyncClient, db_session):
    await _seed_forecast(db_session, "STORE_0001")

    resp = await client.get("/v1/dashboard/fleet-summary")

    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 1
    row = data["stores"][0]
    assert row["product_id"] == "STORE_0001"
    assert row["total_30d"] == 303.0
    assert row["peak_day"] == 102.0


@pytest.mark.asyncio
async def test_dashboard_daily_trend_and_weekly(client: AsyncClient, db_session):
    await _seed_forecast(db_session, "STORE_0001")
    await _seed_forecast(db_session, "STORE_0002")

    daily = await client.get("/v1/dashboard/daily-trend")
    weekly = await client.get("/v1/dashboard/weekly-fleet")

    assert daily.status_code == 200
    assert weekly.status_code == 200
    assert daily.json()["count"] == 3
    assert daily.json()["days"][0]["stores_active"] == 2
    assert weekly.json()["count"] == 1


@pytest.mark.asyncio
async def test_dashboard_dow_pattern(client: AsyncClient, db_session):
    await _seed_forecast(db_session, "STORE_0001")

    resp = await client.get("/v1/dashboard/dow-pattern")

    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 3
    assert data["days"][0]["day_abbr"] == "Thu"


@pytest.mark.asyncio
async def test_dashboard_narrative_coverage(client: AsyncClient, db_session):
    await _seed_narrative(db_session, "STORE_0001")
    await _seed_narrative(db_session, "STORE_0002")

    resp = await client.get("/v1/dashboard/narrative-coverage")

    assert resp.status_code == 200
    data = resp.json()
    assert data["narrative_rows"] == 2
    assert data["stores_with_narratives"] == 2
    assert data["total_stores"] == 1115


@pytest.mark.asyncio
async def test_dashboard_baseline_metrics(client: AsyncClient):
    resp = await client.get("/v1/dashboard/baseline-metrics")

    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert {"model", "mae", "rmse", "mape_pct", "bias_pct"} <= set(data["metrics"][0])


# ── Narratives ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_narrative_success(client: AsyncClient, db_session):
    await _seed_narrative(db_session, "SKU-020")
    resp = await client.get("/v1/narrative/SKU-020")
    assert resp.status_code == 200
    data = resp.json()
    assert data["product_id"] == "SKU-020"
    assert "summary" in data


@pytest.mark.asyncio
async def test_get_narrative_not_found(client: AsyncClient):
    resp = await client.get("/v1/narrative/GHOST-001")
    assert resp.status_code == 404


# ── Pipeline trigger ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_pipeline_trigger_forbidden_without_secret(client: AsyncClient):
    resp = await client.post("/v1/pipeline/run")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_pipeline_trigger_forbidden_wrong_secret(client: AsyncClient):
    resp = await client.post(
        "/v1/pipeline/run",
        headers={"X-Scheduler-Secret": "wrong-secret"},
    )
    assert resp.status_code == 403
