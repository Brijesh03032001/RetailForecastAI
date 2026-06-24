import { LiquidGlassCard } from "@/components/liquid-glass-card";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Insight } from "@/components/dashboard/insight";
import { chartColor } from "@/lib/chart-theme";
import { dailyTrendInsight, dowInsight, topStoreInsight } from "@/lib/insights";
import type {
  BaselineMetricsResponse,
  DailyTrendResponse,
  DayOfWeekPatternResponse,
  FleetSummaryResponse,
  NarrativeCoverageResponse,
} from "@/lib/api";

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function OverviewSection({
  fleetSummary,
  dailyTrend,
  dowPattern,
  narrativeCoverage,
  baselineMetrics,
}: {
  fleetSummary: FleetSummaryResponse | null;
  dailyTrend: DailyTrendResponse | null;
  dowPattern: DayOfWeekPatternResponse | null;
  narrativeCoverage: NarrativeCoverageResponse | null;
  baselineMetrics: BaselineMetricsResponse | null;
}) {
  const topStores = fleetSummary?.stores.slice(0, 8) ?? [];
  const bestBaseline = baselineMetrics?.metrics.length
    ? [...baselineMetrics.metrics].sort((a, b) => a.mae - b.mae)[0]
    : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <LiquidGlassCard className="liquid-glass-interactive min-w-0 px-6 py-6 sm:px-7 sm:py-7">
          <p className="text-base text-neutral-300">Stores forecasted</p>
          <p className="mt-2 text-4xl font-semibold text-white">{fleetSummary ? numberFmt.format(fleetSummary.count) : "—"}</p>
        </LiquidGlassCard>

        <LiquidGlassCard className="liquid-glass-interactive min-w-0 px-6 py-6 sm:px-7 sm:py-7">
          <p className="text-base text-neutral-300">Narrative coverage</p>
          <p className="mt-2 text-4xl font-semibold text-white">
            {narrativeCoverage ? `${pctFmt.format(narrativeCoverage.coverage_pct)}%` : "—"}
          </p>
          {narrativeCoverage && (
            <p className="mt-1 text-sm text-neutral-400">
              {narrativeCoverage.stores_with_narratives} / {narrativeCoverage.total_stores} stores
            </p>
          )}
        </LiquidGlassCard>

        <LiquidGlassCard className="liquid-glass-interactive min-w-0 px-6 py-6 sm:px-7 sm:py-7">
          <p className="text-base text-neutral-300">Best local baseline</p>
          <p className="mt-2 truncate text-4xl font-semibold text-white">{bestBaseline?.model ?? "—"}</p>
          {bestBaseline && <p className="mt-1 text-sm text-neutral-400">MAE {numberFmt.format(bestBaseline.mae)}</p>}
        </LiquidGlassCard>
      </section>

      <section>
        <LiquidGlassCard className="liquid-glass-interactive min-w-0 px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-base font-medium text-neutral-200">Fleet daily forecast trend</h2>
          <div className="mt-4">
            {dailyTrend && dailyTrend.days.length > 0 ? (
              <LineChart
                series={[
                  {
                    id: "total_units",
                    label: "Total units",
                    color: chartColor.categorical[0],
                    data: dailyTrend.days.map((d) => ({ x: new Date(d.forecast_date), y: d.total_units })),
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-neutral-500">No data available.</p>
            )}
          </div>
          {dailyTrendInsight(dailyTrend) && <Insight>{dailyTrendInsight(dailyTrend)}</Insight>}
        </LiquidGlassCard>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LiquidGlassCard className="liquid-glass-interactive min-w-0 px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-base font-medium text-neutral-200">Top stores by 30-day forecast</h2>
          <div className="mt-4">
            {topStores.length > 0 ? (
              <BarChart data={topStores.map((s) => ({ label: s.product_id, value: s.total_30d }))} />
            ) : (
              <p className="text-sm text-neutral-500">No data available.</p>
            )}
          </div>
          {topStoreInsight(fleetSummary) && <Insight>{topStoreInsight(fleetSummary)}</Insight>}
        </LiquidGlassCard>

        <LiquidGlassCard className="liquid-glass-interactive min-w-0 px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-base font-medium text-neutral-200">Day-of-week demand pattern</h2>
          <div className="mt-4">
            {dowPattern && dowPattern.days.length > 0 ? (
              <BarChart
                data={dowPattern.days.map((d) => ({ label: d.day_abbr, value: d.avg_units }))}
                color={chartColor.categorical[1]}
              />
            ) : (
              <p className="text-sm text-neutral-500">No data available.</p>
            )}
          </div>
          {dowInsight(dowPattern) && <Insight>{dowInsight(dowPattern)}</Insight>}
        </LiquidGlassCard>
      </section>
    </div>
  );
}
