from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select

from api.dependencies import DbSession
from api.schemas import NarrativeResponse
from db.models import Forecast, Narrative

router = APIRouter(prefix="/narrative", tags=["Narratives"])


@router.get(
    "/{product_id}",
    response_model=NarrativeResponse,
    summary="Get the latest GPT-4 executive summary for a product",
)
async def get_narrative(product_id: str, db: DbSession) -> NarrativeResponse:
    result = await db.execute(
        select(Narrative)
        .where(Narrative.product_id == product_id.upper())
        .order_by(Narrative.generated_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No narrative found for product {product_id!r}.",
        )

    return NarrativeResponse.model_validate(row)


@router.post(
    "/{product_id}/generate",
    response_model=NarrativeResponse,
    summary="Generate a fresh AI executive summary for a product via the local LLM (RAG) and persist it",
)
async def generate_narrative(product_id: str, db: DbSession) -> NarrativeResponse:
    product_id = product_id.upper()

    result = await db.execute(
        select(Forecast).where(Forecast.product_id == product_id).order_by(Forecast.forecast_date)
    )
    rows = result.scalars().all()
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No forecasts found for product {product_id!r}. Cannot generate a narrative.",
        )

    forecast_rows = [
        {
            "forecast_date": str(r.forecast_date),
            "forecast_units": r.forecast_units,
            "ci_lower": r.ci_lower,
            "ci_upper": r.ci_upper,
        }
        for r in rows
    ]

    from rag.narrative_chain import NarrativeChain  # noqa: PLC0415 — lazy import, heavy LLM deps

    try:
        chain = NarrativeChain()
        summary = await asyncio.to_thread(chain.generate, product_id, forecast_rows)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Narrative generation failed: {exc}",
        ) from exc

    generated_at = datetime.now(UTC)
    await db.execute(delete(Narrative).where(Narrative.product_id == product_id))
    db.add(Narrative(product_id=product_id, summary=summary, generated_at=generated_at))
    await db.commit()

    return NarrativeResponse(
        product_id=product_id,
        summary=summary,
        generated_at=generated_at,
        retrieved_sources=chain.last_sources,
    )
