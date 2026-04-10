import React from "react";
import { Layers3, Server, Database, Rocket } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import PublicTopbar from "../components/layout/PublicTopbar";

export default function AboutPage() {
  const { t } = useI18n();

  const layers = [
    { icon: Layers3, title: t("about.layers.frontendTitle"), description: t("about.layers.frontendDescription") },
    { icon: Server, title: t("about.layers.backendTitle"), description: t("about.layers.backendDescription") },
    { icon: Database, title: t("about.layers.databaseTitle"), description: t("about.layers.databaseDescription") },
    { icon: Rocket, title: t("about.layers.deploymentTitle"), description: t("about.layers.deploymentDescription") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicTopbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        <section className="rounded-[32px] border border-border bg-card p-6 sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground mb-4">{t("about.title")}</p>
          <h1 className="font-outfit text-4xl sm:text-5xl font-semibold tracking-tight max-w-4xl">{t("about.description")}</h1>
          <p className="text-base text-muted-foreground mt-5 max-w-3xl">{t("about.overviewDescription")}</p>
        </section>

        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-outfit text-2xl font-semibold mb-3">{t("about.architectureTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t("about.architectureDescription")}</p>

            <div className="space-y-4">
              {layers.map((layer) => (
                <div key={layer.title} className="rounded-2xl border border-border bg-background p-4 flex gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
                    <layer.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-outfit text-lg font-semibold">{layer.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{layer.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-outfit text-2xl font-semibold mb-3">{t("about.stackTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t("about.stackDescription")}</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                "React 19",
                "React Query",
                "Tailwind CSS",
                "FastAPI",
                "MongoDB Atlas",
                "JWT Auth",
                "Vercel",
                "CRACO",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-background px-4 py-4 text-sm font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
