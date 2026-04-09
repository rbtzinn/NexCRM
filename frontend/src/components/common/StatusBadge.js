import React from "react";
import { useI18n } from "../../context/I18nContext";

const statusConfig = {
  // Customer statuses
  lead: { classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  prospect: { classes: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  customer: { classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  churned: { classes: "bg-red-500/10 border-red-500/20 text-red-400" },
  // Deal stages
  qualified: { classes: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
  proposal: { classes: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  negotiation: { classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  closed_won: { classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  closed_lost: { classes: "bg-red-500/10 border-red-500/20 text-red-400" },
  // Task priorities
  low: { classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
  medium: { classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  high: { classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  urgent: { classes: "bg-red-500/10 border-red-500/20 text-red-400" },
  // Task statuses
  todo: { classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
  in_progress: { classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  review: { classes: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  done: { classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  // Roles
  admin: { classes: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  manager: { classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  analyst: { classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
  // Generic
  active: { classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  inactive: { classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
};

export default function StatusBadge({ status }) {
  const { translateStatus } = useI18n();
  const config = statusConfig[status] || {
    classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.classes}`}
    >
      {translateStatus(status)}
    </span>
  );
}
