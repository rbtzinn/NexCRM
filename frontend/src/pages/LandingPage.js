import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Database, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import PublicTopbar from "../components/layout/PublicTopbar";

const demoAccounts = [
  { role: "Manager", email: "sarah.chen@nexcrm.io", password: "Manager@123!" },
  { role: "Analyst", email: "marcus.johnson@nexcrm.io", password: "Analyst@123!" },
];

function PreviewCard({ title, value, sublabel }) {
  return (
    <div className="rounded-2xl border border-border bg-card/90 p-4 space-y-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="font-outfit text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function DashboardPreview({ t }) {
  return (
    <div className="rounded-[28px] border border-border bg-card shadow-2xl shadow-black/10 overflow-hidden">
      <div className="h-10 border-b border-border flex items-center gap-2 px-4 bg-background/90">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 px-3 py-1 rounded-full bg-muted text-[11px] text-muted-foreground">nexcrm.vercel.app</div>
      </div>
      <div className="p-4 sm:p-5 space-y-4 bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0%,transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--accent))_0%,transparent_35%)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PreviewCard title={t("dashboard.totalRevenue")} value="$777k" sublabel={t("dashboard.vsLastMonth")} />
          <PreviewCard title={t("dashboard.activeDeals")} value="7" sublabel={t("dashboard.inPipeline")} />
          <PreviewCard title={t("dashboard.totalCustomers")} value="12" sublabel={t("dashboard.totalContacts")} />
        </div>
        <div className="grid lg:grid-cols-[1.7fr_1fr] gap-3">
          <div className="rounded-2xl border border-border bg-card/90 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-outfit font-semibold">{t("dashboard.revenue")}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.last12Months")}</p>
              </div>
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="h-40 rounded-xl bg-[linear-gradient(180deg,hsl(var(--accent))_0%,transparent_100%)] relative overflow-hidden">
              <svg viewBox="0 0 500 180" className="absolute inset-0 w-full h-full">
                <path
                  d="M0 130 C40 128, 65 132, 90 115 S150 90, 180 100 S240 115, 270 90 S340 80, 370 75 S430 52, 500 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-foreground/80"
                />
                <path
                  d="M0 130 C40 128, 65 132, 90 115 S150 90, 180 100 S240 115, 270 90 S340 80, 370 75 S430 52, 500 40 L500 180 L0 180 Z"
                  fill="currentColor"
                  className="text-foreground/10"
                />
              </svg>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card/90 p-4 space-y-3">
            <div>
              <p className="font-outfit font-semibold">{t("dashboard.pipeline")}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.dealsByStage")}</p>
            </div>
            {[
              ["qualified", 32],
              ["proposal", 56],
              ["negotiation", 74],
              ["closed_won", 88],
            ].map(([label, width]) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{t(`status.${label}`)}</span>
                  <span className="text-muted-foreground">{width}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-foreground/70" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useI18n();

  const highlights = [
    { icon: Globe2, text: t("landing.highlights.localization") },
    { icon: Sparkles, text: t("landing.highlights.analytics") },
    { icon: ShieldCheck, text: t("landing.highlights.audit") },
    { icon: Database, text: t("landing.highlights.export") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicTopbar />

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {t("landing.liveBadge")}
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">{t("landing.eyebrow")}</p>
                <h1 className="font-outfit text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.02] tracking-tight max-w-3xl">
                  {t("landing.title")}
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                  {t("landing.description")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-5 py-3 font-semibold hover:opacity-90 transition-opacity">
                  {t("landing.primaryCta")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/about" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground hover:bg-accent/70 transition-colors">
                  {t("landing.secondaryCta")}
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {highlights.map((highlight) => (
                  <div key={highlight.text} className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                    <highlight.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground/85">{highlight.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <DashboardPreview t={t} />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground mb-3">{t("landing.architectureTitle")}</p>
            <h2 className="font-outfit text-2xl sm:text-3xl font-semibold tracking-tight mb-3">{t("landing.architectureDescription")}</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">{t("landing.showcaseMetrics.revenue")}</p>
                <p className="font-outfit text-3xl font-semibold">$777k</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">{t("landing.showcaseMetrics.pipeline")}</p>
                <p className="font-outfit text-3xl font-semibold">$248k</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">{t("landing.showcaseMetrics.customers")}</p>
                <p className="font-outfit text-3xl font-semibold">12</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4 flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500" />
                <p className="text-sm text-foreground/80">{t("landing.stackDescription")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-outfit text-xl font-semibold mb-2">{t("landing.credTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("landing.credDescription")}</p>
              <div className="space-y-3">
                {demoAccounts.map((account) => (
                  <div key={account.email} className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="font-medium text-sm">{t(`login.roles.${account.role}`)}</p>
                    <p className="text-sm text-muted-foreground mt-2">{account.email}</p>
                    <p className="text-sm font-medium mt-1">{account.password}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-outfit text-xl font-semibold mb-2">{t("landing.stackTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("landing.stackDescription")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["React", "FastAPI", "MongoDB Atlas", "Vercel", "React Query", "JWT"].map((item) => (
                  <span key={item} className="px-3 py-1.5 rounded-full border border-border bg-background text-sm text-foreground/85">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
