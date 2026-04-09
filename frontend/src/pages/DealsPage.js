import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Pencil, LayoutGrid, List, Search, DollarSign } from "lucide-react";
import { dealsService } from "../services/dealsService";
import { customersService } from "../services/customersService";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";

const STAGES = [
  { key: "lead", label: "Lead", color: "border-blue-500/30" },
  { key: "qualified", label: "Qualified", color: "border-cyan-500/30" },
  { key: "proposal", label: "Proposal", color: "border-amber-500/30" },
  { key: "negotiation", label: "Negotiation", color: "border-orange-500/30" },
  { key: "closed_won", label: "Won", color: "border-emerald-500/30" },
];

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  customer_id: z.string().min(1, "Customer is required"),
  stage: z.string().min(1),
  value: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
});

const fmt = (v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

function DealForm({ deal, customers, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!deal;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: deal?.title || "",
      customer_id: deal?.customer_id || "",
      stage: deal?.stage || "lead",
      value: deal?.value || 0,
      probability: deal?.probability || 10,
      expected_close_date: deal?.expected_close_date || "",
      notes: deal?.notes || "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const cust = customers.find(c => c.id === data.customer_id);
      if (isEdit) {
        await dealsService.update(deal.id, { ...data, customer_name: cust?.name });
        toast.success("Deal updated");
      } else {
        await dealsService.create({ ...data, customer_name: cust?.name });
        toast.success("Deal created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const cls = "w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all";
  const lbl = "text-xs font-medium text-muted-foreground block mb-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className={lbl}>Title *</label>
        <input {...register("title")} placeholder="Deal title" className={cls} data-testid="deal-title-input" />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <label className={lbl}>Customer *</label>
        <select {...register("customer_id")} className={cls} data-testid="deal-customer-select">
          <option value="">Select customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
        </select>
        {errors.customer_id && <p className="text-red-400 text-xs mt-1">{errors.customer_id.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Stage</label>
          <select {...register("stage")} className={cls}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            <option value="closed_lost">Lost</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Value ($)</label>
          <input {...register("value")} type="number" min="0" placeholder="0" className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Probability (%)</label>
          <input {...register("probability")} type="number" min="0" max="100" className={cls} />
        </div>
        <div>
          <label className={lbl}>Close Date</label>
          <input {...register("expected_close_date")} type="date" className={cls} />
        </div>
      </div>
      <div>
        <label className={lbl}>Notes</label>
        <textarea {...register("notes")} rows={2} className={`${cls} resize-none`} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 bg-muted border border-border text-sm font-medium text-muted-foreground rounded-lg py-2 hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} data-testid="deal-save-button" className="flex-1 bg-foreground text-background text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

function KanbanCard({ deal, onEdit, onDelete, canManage }) {
  return (
    <div className="bg-background border border-border rounded-lg p-3.5 hover:border-border/80 hover:bg-muted/10 transition-all group" data-testid="deal-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 flex-1">{deal.title}</p>
        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(deal)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"><Pencil className="w-3 h-3" /></button>
            <button onClick={() => onDelete(deal.id)} className="p-1 text-muted-foreground hover:text-red-400 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{deal.customer_name}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{fmt(deal.value)}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{deal.probability}%</span>
      </div>
      {deal.probability > 0 && (
        <div className="mt-2.5 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/30 rounded-full transition-all"
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ["deals", search],
    queryFn: () => dealsService.list({ limit: 100, search: search || undefined }).then(r => r.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersService.list({ limit: 100 }).then(r => r.data),
  });

  const deals = dealsData?.data || [];
  const customers = customersData?.data || [];
  const canManage = user?.role !== "analyst";

  const dealsByStage = (stage) => deals.filter(d => d.stage === stage);

  const handleEdit = (d) => { setEditDeal(d); setModalOpen(true); };
  const handleAdd = (stage = "lead") => {
    setEditDeal(stage !== "lead" ? { stage } : null);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    setEditDeal(null);
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-pipeline"] });
  };
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await dealsService.delete(deleteId);
      toast.success("Deal deleted");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setDeleteId(null);
    } catch { toast.error("Failed to delete"); }
    finally { setDeleteLoading(false); }
  };

  const totalPipelineValue = deals
    .filter(d => d.stage !== "closed_lost")
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <PageHeader
        title="Deals"
        description={`${deals.length} deals · $${(totalPipelineValue / 1000).toFixed(0)}k total value`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
              <button onClick={() => setView("kanban")} data-testid="kanban-view-btn" className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
              <button onClick={() => setView("list")} data-testid="list-view-btn" className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
            {canManage && (
              <button onClick={() => handleAdd()} data-testid="add-deal-button" className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Add Deal
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text" placeholder="Search deals..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="deal-search"
            className="w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {STAGES.map(s => (
            <div key={s.key} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              {[1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage(stage.key);
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.key} className={`bg-card border ${stage.color} rounded-xl min-h-[200px] flex flex-col`} data-testid={`kanban-column-${stage.key}`}>
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-border">
                  <div>
                    <span className="text-xs font-semibold text-foreground/80">{stage.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">{stageDeals.length}</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{fmt(stageValue)}</span>
                </div>
                <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[400px] scrollbar-none">
                  {stageDeals.map(d => (
                    <KanbanCard key={d.id} deal={d} onEdit={handleEdit} onDelete={setDeleteId} canManage={canManage} />
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No deals</p>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => handleAdd(stage.key)}
                    className="m-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-2.5 py-2 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add deal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Deal", "Customer", "Stage", "Value", "Probability", "Close Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold first:pl-5 last:pr-5 last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deals.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">No deals found</td></tr>
                ) : deals.map((d) => (
                  <tr key={d.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors" data-testid="deal-row">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground max-w-[200px]">
                      <span className="truncate block">{d.title}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-foreground/80">{d.customer_name}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={d.stage} /></td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-foreground">{fmt(d.value)}</td>
                    <td className="px-4 py-3.5 text-sm text-foreground/80">{d.probability}%</td>
                    <td className="px-4 py-3.5 text-sm text-foreground/80">{d.expected_close_date || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      {canManage && (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEdit(d)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-popover border border-border max-w-md" data-testid="deal-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit text-base font-semibold">
              {editDeal && editDeal.id ? "Edit Deal" : "New Deal"}
            </DialogTitle>
          </DialogHeader>
          <DealForm
            deal={editDeal?.id ? editDeal : (editDeal?.stage ? { stage: editDeal.stage } : null)}
            customers={customers}
            onClose={() => { setModalOpen(false); setEditDeal(null); }}
            onSaved={handleSaved}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        title="Delete Deal"
        description="This will permanently delete this deal."
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
