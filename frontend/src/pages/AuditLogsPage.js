import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { auditService } from "../services/auditService";
import { exportRowsToCsv } from "../lib/exportCsv";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/ui/skeleton";

const ACTIONS = ["login", "create", "update", "delete"];
const ENTITY_TYPES = ["auth", "user", "customer", "deal", "task"];

export default function AuditLogsPage() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", search, action, entityType],
    queryFn: () =>
      auditService
        .list({
          limit: 100,
          search: search || undefined,
          action: action || undefined,
          entity_type: entityType || undefined,
        })
        .then((response) => response.data),
  });

  const rows = useMemo(() => data?.data || [], [data]);

  const exportedRows = useMemo(
    () =>
      rows.map((row) => ({
        action: row.action,
        entityType: row.entity_type,
        entityName: row.entity_name,
        actorName: row.actor_name,
        actorEmail: row.actor_email,
        actorRole: row.actor_role,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      })),
    [rows]
  );

  const formatDate = (date) =>
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const formatDetails = (row) => {
    const metadata = row.metadata || {};
    const entries = Object.entries(metadata)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${value}`);
    return [row.ip_address, ...entries].filter(Boolean).join(" · ") || "-";
  };

  return (
    <div>
      <PageHeader
        title={t("audit.title")}
        description={t("audit.description", { total: data?.total ?? 0 })}
        actions={
          <button
            onClick={() => exportRowsToCsv("nexcrm-audit-logs.csv", exportedRows)}
            className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" /> {t("common.exportCsv")}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("audit.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <select
          value={action}
          onChange={(event) => setAction(event.target.value)}
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("audit.allActions")}</option>
          {ACTIONS.map((item) => (
            <option key={item} value={item}>
              {t(`audit.actions.${item}`)}
            </option>
          ))}
        </select>

        <select
          value={entityType}
          onChange={(event) => setEntityType(event.target.value)}
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("audit.allEntities")}</option>
          {ENTITY_TYPES.map((item) => (
            <option key={item} value={item}>
              {t(`audit.entityTypes.${item}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t("audit.emptyTitle")}
            description={t("audit.emptyDescription")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="border-b border-border">
                  {[t("audit.columns.action"), t("audit.columns.entity"), t("audit.columns.actor"), t("audit.columns.details"), t("audit.columns.date")].map((heading) => (
                    <th key={heading} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold first:pl-5 last:pr-5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{t(`audit.actions.${row.action}`)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <p className="font-medium">{row.entity_name || t(`audit.entityTypes.${row.entity_type}`)}</p>
                      <p className="text-muted-foreground">{t(`audit.entityTypes.${row.entity_type}`)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <p className="font-medium">{row.actor_name || "-"}</p>
                      <p className="text-muted-foreground">{row.actor_email || "-"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDetails(row)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
