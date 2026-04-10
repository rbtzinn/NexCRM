import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { searchService } from "../services/searchService";

const sectionOrder = ["customers", "deals", "tasks", "users"];

export default function SearchPage() {
  const { t, translateStatus } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setValue(searchParams.get("q") || "");
  }, [searchParams]);

  const query = (searchParams.get("q") || "").trim();

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchService.global(query).then((response) => response.data),
    enabled: query.length > 0,
  });

  const orderedResults = useMemo(() => {
    const results = data?.results || {};
    return sectionOrder.filter((key) => results[key]?.length).map((key) => [key, results[key]]);
  }, [data]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      setSearchParams({});
      return;
    }
    setSearchParams({ q: next });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="font-outfit text-2xl sm:text-3xl font-semibold tracking-tight">{t("searchPage.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("searchPage.description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="relative max-w-3xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("searchPage.placeholder")}
          className="w-full bg-card border border-border rounded-2xl text-sm sm:text-base text-foreground placeholder:text-muted-foreground pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </form>

      {!query ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-outfit text-xl font-semibold">{t("searchPage.emptyTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t("searchPage.emptyDescription")}</p>
        </div>
      ) : orderedResults.length === 0 && !isFetching ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-outfit text-xl font-semibold">{t("common.noResults")}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t("searchPage.noResults")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orderedResults.map(([section, items]) => (
            <section key={section} className="rounded-3xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-outfit text-lg font-semibold">{t(`searchPage.sections.${section}`)}</h2>
                  <p className="text-xs text-muted-foreground">{items.length}</p>
                </div>
                <Link to={`/${section}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {t("searchPage.openSection")} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="divide-y divide-border/70">
                {items.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.route}
                    className="block px-5 py-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                        {item.status && (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted border border-border">
                            {translateStatus(item.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
