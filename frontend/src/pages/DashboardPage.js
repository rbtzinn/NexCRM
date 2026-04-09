import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Handshake,
  DollarSign, Target, ArrowRight,
} from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { dashboardService } from "../services/dashboardService";
import StatusBadge from "../components/common/StatusBadge";
import { Skeleton } from "../components/ui/skeleton";

const fmt = (v) =>
  v >= 1000000
    ? `$${(v / 1000000).toFixed(1)}M`
    : v >= 1000
    ? `$${(v / 1000).toFixed(0)}k`
    : `$${v}`;

function KpiCard({ title, value, trend, trendLabel, icon: Icon, loading, accent = false }) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }
  return (
    <div
      className={`bg-card border border-border rounded-xl p-5 hover:border-border/80 hover:bg-accent/20 transition-all duration-300 ${
        accent ? "ring-1 ring-blue-500/10" : ""
      }`}
      data-testid="kpi-card"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <p className="font-outfit text-2xl font-semibold text-foreground tracking-tight">{value}</p>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend >= 0 ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span className={`text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
          <span className="text-xs text-muted-foreground">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">{fmt(payload[0]?.value || 0)}</p>
    </div>
  );
};

const PipelineTooltip = ({ active, payload, label, t }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">{t("dashboard.dealsCount", { count: payload[0]?.value || 0 })}</p>
    </div>
  );
};

const chartGrid = "hsl(var(--border) / 0.7)";
const chartAxis = "hsl(var(--muted-foreground) / 0.8)";
const chartCursor = "hsl(var(--foreground) / 0.08)";
const chartLine = "hsl(var(--foreground) / 0.78)";
const chartFill = "hsl(var(--foreground) / 0.16)";
const chartBar = "hsl(var(--foreground) / 0.14)";
const chartBarActive = "hsl(var(--foreground) / 0.24)";
const chartDot = "hsl(var(--foreground))";

export default function DashboardPage() {
  const { t, translateMonthShort, translateStatus } = useI18n();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardService.stats().then((r) => r.data),
  });

  const { data: revenue = [], isLoading: revLoading } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: () => dashboardService.revenue().then((r) => r.data),
  });

  const { data: pipeline = [], isLoading: pipeLoading } = useQuery({
    queryKey: ["dashboard-pipeline"],
    queryFn: () => dashboardService.pipeline().then((r) => r.data),
  });

  const { data: recentDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["dashboard-recent-deals"],
    queryFn: () => dashboardService.recentDeals().then((r) => r.data),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => dashboardService.activity().then((r) => r.data),
  });

  const revenueChartData = revenue.map((item) => ({
    ...item,
    short: translateMonthShort(item.short),
  }));

  const pipelineChartData = pipeline.map((item) => ({
    ...item,
    label: translateStatus(item.stage),
  }));

  const kpis = [
    {
      title: "Total Revenue",
      title: t("dashboard.totalRevenue"),
      value: fmt(stats?.total_revenue || 0),
      trend: stats?.mom_growth,
      trendLabel: t("dashboard.vsLastMonth"),
      icon: DollarSign,
    },
    {
      title: t("dashboard.activeDeals"),
      value: stats?.active_deals ?? "--",
      trendLabel: t("dashboard.inPipeline"),
      icon: Handshake,
    },
    {
      title: t("dashboard.totalCustomers"),
      value: stats?.total_customers ?? "--",
      trendLabel: t("dashboard.totalContacts"),
      icon: Users,
    },
    {
      title: t("dashboard.winRate"),
      value: `${stats?.win_rate ?? 0}%`,
      trendLabel: t("dashboard.closedDeals"),
      icon: Target,
      accent: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={i} {...kpi} loading={statsLoading} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5" data-testid="revenue-chart">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-outfit text-base font-semibold text-foreground">{t("dashboard.revenue")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.last12Months")}</p>
            </div>
          </div>
          {revLoading ? (
            <Skeleton className="h-52 w-full rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartFill} stopOpacity={1} />
                    <stop offset="95%" stopColor={chartFill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartGrid}
                  vertical={false}
                />
                <XAxis
                  dataKey="short"
                  tick={{ fill: chartAxis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartAxis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v / 1000}k`}
                  width={48}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartCursor }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={chartLine}
                  strokeWidth={1.5}
                  fill="url(#revGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: chartDot, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pipeline Chart */}
        <div className="bg-card border border-border rounded-xl p-5" data-testid="pipeline-chart">
          <div className="mb-6">
            <h2 className="font-outfit text-base font-semibold text-foreground">{t("dashboard.pipeline")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.dealsByStage")}</p>
          </div>
          {pipeLoading ? (
            <Skeleton className="h-52 w-full rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={pipelineChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartGrid}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: chartAxis, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartAxis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PipelineTooltip t={t} />} cursor={{ fill: chartCursor }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  fill={chartBar}
                  activeBar={{ fill: chartBarActive }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Deals + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Deals */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden" data-testid="recent-deals">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-outfit text-sm font-semibold text-foreground">{t("dashboard.recentDeals")}</h2>
            <Link
              to="/deals"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {t("common.viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {dealsLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("dashboard.dealColumn")}
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold hidden sm:table-cell">
                      {t("dashboard.stageColumn")}
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {t("dashboard.valueColumn")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.map((deal) => (
                    <tr key={deal.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {deal.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{deal.customer_name}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <StatusBadge status={deal.stage} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold text-foreground">{fmt(deal.value)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="activity-feed">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-outfit text-sm font-semibold text-foreground">{t("dashboard.activity")}</h2>
            <Link
              to="/tasks"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {t("common.viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {activity.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">{t("dashboard.noRecentActivity")}</p>
            )}
            {activity.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    task.status === "done"
                      ? "bg-emerald-400"
                      : task.priority === "urgent"
                      ? "bg-red-400"
                      : task.priority === "high"
                      ? "bg-orange-400"
                      : "bg-blue-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/90 leading-relaxed line-clamp-2">
                    {task.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{task.assignee_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
