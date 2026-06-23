"use client";

import Link from "next/link";
import { LiquidGlassCard } from "@/components/liquid-glass-card";

export const SECTIONS = ["Overview", "Store Forecast", "Compare", "Model Benchmarks", "AI Narrative", "About"] as const;
export type Section = (typeof SECTIONS)[number];

const SECTION_INFO: Record<Section, { summary: string; points: string[] }> = {
  Overview: {
    summary: "A fleet-wide health check across all 1,115 stores.",
    points: [
      "Daily demand trend — is total forecasted volume rising or falling?",
      "Which stores are driving the most 30-day volume",
      "Weekly seasonality — which day of week peaks",
    ],
  },
  "Store Forecast": {
    summary: "A deep-dive into one store's 30-day outlook.",
    points: [
      "BigQuery ML ARIMA_PLUS forecast with an 80% confidence band",
      "AI executive summary via RAG — LangChain + FAISS retrieval over real business context",
      "Generate a fresh summary on demand — calls a local Ollama LLM live",
    ],
  },
  Compare: {
    summary: "Put two stores head-to-head.",
    points: ["Overlaid 30-day forecast lines, same chart", "Which store wins, and by exactly how much"],
  },
  "Model Benchmarks": {
    summary: "Proof the forecaster actually works, not just a claim.",
    points: [
      "Backtested on a real holdout window from the Rossmann data",
      "Ranked against seasonal-naive and moving-average baselines",
      "MAE, RMSE, MAPE, and bias reported per model",
    ],
  },
  "AI Narrative": {
    summary: "Where the RAG pipeline lives.",
    points: [
      "LangChain + FAISS retrieval over real business-context docs",
      "Every summary is grounded — retrieved passages are shown below it",
      "Generate on demand via a local Ollama LLM, zero API cost",
    ],
  },
  About: {
    summary: "What this project actually is.",
    points: [
      "Real Rossmann dataset — 1,115 German stores, not synthetic",
      "Full pipeline: ETL, PySpark features, BigQuery ML, RAG, FastAPI",
    ],
  },
};

export function Sidebar({
  active,
  onSelect,
  coveragePct,
}: {
  active: Section;
  onSelect: (section: Section) => void;
  coveragePct: number | null;
}) {
  const info = SECTION_INFO[active];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
      <Link href="/" className="text-base text-neutral-400 hover:text-white">
        ← RetailForecastAI
      </Link>

      <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {SECTIONS.map((section) => (
          <button
            key={section}
            onClick={() => onSelect(section)}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-left text-base transition-colors ${
              active === section ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
            }`}
          >
            {section}
          </button>
        ))}
      </nav>

      <LiquidGlassCard className="hidden px-6 py-6 lg:block">
        <p className="text-sm text-neutral-300">Narrative coverage</p>
        <p className="mt-1 text-3xl font-semibold text-white">{coveragePct != null ? `${coveragePct.toFixed(1)}%` : "—"}</p>
      </LiquidGlassCard>

      <LiquidGlassCard className="hidden h-96 overflow-y-auto px-6 py-6 lg:flex lg:flex-col">
        <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">About this page</p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-200">{info.summary}</p>
        <ul className="mt-4 flex flex-col gap-3">
          {info.points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-neutral-400">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-neutral-500" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </LiquidGlassCard>
    </aside>
  );
}
