import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Target, DollarSign, Users } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { dashboardService } from "../services/dashboardService";
import { customersService } from "../services/customersService";
import PageHeader from "../components/common/PageHeader";

const fmt = (v) =>
  v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {typeof payload[0]?.value === "number" && payload[0]?.name === "revenue"
          ? fmt(payload[0].value)
          : payload[0]?.value}
      </p>
    </div>
  );
};

const PIE_COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#f97316"];
const chartGrid = "hsl(var(--border) / 0.7)";
const chartAxis = "hsl(var(--muted-foreground) / 0.8)";
const chartCursor = "hsl(var(--foreground) / 0.08)";
const chartBar = "hsl(var(--foreground) / 0.14)";
const chartBarActive = "hsl(var(--foreground) / 0.24)";

export default function ReportsPage() {
  const { t, translateSource, translateIndustry, translateMonthShort, translateStatus } = useI18n();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardService.stats().then(r => r.data),
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: () => dashboardService.revenue().then(r => r.data),
  });

  const { data: pipeline = [] } = useQuery({
    queryKey: ["dashboard-pipeline"],
    queryFn: () => dashboardService.pipeline().then(r => r.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", { page: 1 }],
    queryFn: () => customersService.list({ limit: 100 }).then(r => r.data),
  });

  const customers = customersData?.data || [];

  // Source distribution
  const sourceData = customers.reduce((acc, c) => {
    const s = c.source || "Unknown";
    const ex = acc.find(x => x.name === s);
    if (ex) ex.value++;
    else acc.push({ name: s, value: 1 });
    return acc;
  }, []);

  // Industry distribution
  const industryData = customers.reduce((acc, c) => {
    const ind = c.industry || "Other";
    const ex = acc.find(x => x.name === ind);
    if (ex) ex.count++;
    else acc.push({ name: ind, count: 1 });
    return acc;
  }, []).sort((a, b) => b.count - a.count).slice(0, 6);

  const totalRevenue = stats?.total_revenue || 0;
  const revenueChartData = revenue.map((item) => ({
    ...item,
    short: translateMonthShort(item.short),
  }));
  const pipelineChartData = pipeline.map((item) => ({
    ...item,
    label: translateStatus(item.stage),
  }));

  const metricCards = [
    { title: t("reports.totalRevenue"), value: fmt(totalRevenue), icon: DollarSign, sub: t("reports.allTime") },
    { title: t("reports.winRate"), value: `${stats?.win_rate || 0}%`, icon: Target, sub: t("reports.closedDeals") },
    { title: t("reports.pipelineValue"), value: fmt(stats?.pipeline_value || 0), icon: TrendingUp, sub: t("reports.activeDeals") },
    { title: t("reports.totalCustomers"), value: stats?.total_customers || 0, icon: Users, sub: t("reports.allContacts") },
  ];

  return (
    <div>
      <PageHeader title={t("reports.title")} description={t("reports.description")} />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metricCards.map((m, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5" data-testid="report-metric-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.title}</p>
              <div className="w-7 h-7 bg-muted/50 rounded-lg flex items-center justify-center">
                <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <p className="font-outfit text-2xl font-semibold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5" data-testid="report-revenue-chart">
          <div className="mb-5">
            <h2 className="font-outfit text-base font-semibold text-foreground">{t("reports.revenueTrend")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("reports.revenueTrendDescription")}</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis dataKey="short" tick={{ fill: chartAxis, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartAxis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} width={48} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartCursor }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={1.5} fill="url(#revGrad2)" dot={false} activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Customer by Source */}
        <div className="bg-card border border-border rounded-xl p-5" data-testid="report-source-chart">
          <div className="mb-5">
            <h2 className="font-outfit text-base font-semibold text-foreground">{t("reports.acquisitionSources")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("reports.acquisitionSourcesDescription")}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {sourceData.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{translateSource(s.name)}</span>
                <span className="text-xs font-medium text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline + Industry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5" data-testid="report-pipeline-chart">
          <div className="mb-5">
            <h2 className="font-outfit text-base font-semibold text-foreground">{t("reports.pipelineByStage")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("reports.pipelineByStageDescription")}</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipelineChartData} layout="vertical" margin={{ top: 0, right: 20, left: 50, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
              <XAxis type="number" tick={{ fill: chartAxis, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <YAxis type="category" dataKey="label" tick={{ fill: chartAxis, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: chartCursor }} />
              <Bar dataKey="value" fill={chartBar} radius={[0, 3, 3, 0]} activeBar={{ fill: chartBarActive }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5" data-testid="report-industry-chart">
          <div className="mb-5">
            <h2 className="font-outfit text-base font-semibold text-foreground">{t("reports.topIndustries")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("reports.topIndustriesDescription")}</p>
          </div>
          <div className="space-y-3">
            {industryData.map((ind, i) => {
              const max = industryData[0]?.count || 1;
              const pct = Math.round((ind.count / max) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground/80">{translateIndustry(ind.name)}</span>
                    <span className="text-xs font-semibold text-foreground">{ind.count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
