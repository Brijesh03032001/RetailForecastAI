"use client";

import { useState } from "react";
import { Sidebar, SECTIONS, type Section } from "@/components/dashboard/sidebar";
import { OverviewSection } from "@/components/dashboard/overview-section";
import { StoreForecastSection } from "@/components/dashboard/store-forecast-section";
import { CompareSection } from "@/components/dashboard/compare-section";
import { BenchmarksSection } from "@/components/dashboard/benchmarks-section";
import { NarrativeSection } from "@/components/dashboard/narrative-section";
import { AboutSection } from "@/components/dashboard/about-section";
import type {
  BaselineMetricsResponse,
  DailyTrendResponse,
  DayOfWeekPatternResponse,
  FleetSummaryResponse,
  NarrativeCoverageResponse,
} from "@/lib/api";

export function DashboardShell({
  stores,
  fleetSummary,
  dailyTrend,
  dowPattern,
  narrativeCoverage,
  baselineMetrics,
}: {
  stores: string[];
  fleetSummary: FleetSummaryResponse | null;
  dailyTrend: DailyTrendResponse | null;
  dowPattern: DayOfWeekPatternResponse | null;
  narrativeCoverage: NarrativeCoverageResponse | null;
  baselineMetrics: BaselineMetricsResponse | null;
}) {
  const [active, setActive] = useState<Section>(SECTIONS[0]);

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-6 py-8 sm:px-10 lg:flex-row lg:gap-10 xl:px-16">
      <Sidebar active={active} onSelect={setActive} coveragePct={narrativeCoverage?.coverage_pct ?? null} />

      <main className="min-w-0 flex-1">
        <div className="mb-6">
          <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">{active}</h1>
        </div>

        {active === "Overview" && (
          <OverviewSection
            fleetSummary={fleetSummary}
            dailyTrend={dailyTrend}
            dowPattern={dowPattern}
            narrativeCoverage={narrativeCoverage}
            baselineMetrics={baselineMetrics}
          />
        )}
        {active === "Store Forecast" && <StoreForecastSection stores={stores} />}
        {active === "Compare" && <CompareSection stores={stores} />}
        {active === "Model Benchmarks" && <BenchmarksSection baselineMetrics={baselineMetrics} />}
        {active === "AI Narrative" && <NarrativeSection stores={stores} />}
        {active === "About" && <AboutSection />}
      </main>
    </div>
  );
}
