import React from "react";

const statusConfig = {
  // Customer statuses
  lead: { label: "Lead", classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  prospect: { label: "Prospect", classes: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  customer: { label: "Customer", classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  churned: { label: "Churned", classes: "bg-red-500/10 border-red-500/20 text-red-400" },
  // Deal stages
  qualified: { label: "Qualified", classes: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
  proposal: { label: "Proposal", classes: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  negotiation: { label: "Negotiation", classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  closed_won: { label: "Won", classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  closed_lost: { label: "Lost", classes: "bg-red-500/10 border-red-500/20 text-red-400" },
  // Task priorities
  low: { label: "Low", classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
  medium: { label: "Medium", classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  high: { label: "High", classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  urgent: { label: "Urgent", classes: "bg-red-500/10 border-red-500/20 text-red-400" },
  // Task statuses
  todo: { label: "To Do", classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
  in_progress: { label: "In Progress", classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  review: { label: "Review", classes: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  done: { label: "Done", classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  // Roles
  admin: { label: "Admin", classes: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  manager: { label: "Manager", classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  analyst: { label: "Analyst", classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
  // Generic
  active: { label: "Active", classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  inactive: { label: "Inactive", classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || {
    label: status,
    classes: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
