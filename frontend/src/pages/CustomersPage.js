import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Filter, Users, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { customersService } from "../services/customersService";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(["lead", "prospect", "customer", "churned"]),
  value: z.coerce.number().min(0),
  source: z.string().optional(),
  notes: z.string().optional(),
});

const industries = ["Technology", "Healthcare", "Finance", "Marketing", "Manufacturing", "Consulting", "Energy", "Artificial Intelligence", "Sustainability", "Other"];
const sources = ["Website", "Referral", "Conference", "Cold Outreach", "LinkedIn", "Partner", "Webinar", "Trade Show", "Other"];
const statuses = ["lead", "prospect", "customer", "churned"];

function CustomerForm({ customer, onClose, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isEdit = !!customer;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name || "",
      company: customer?.company || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      industry: customer?.industry || "",
      status: customer?.status || "lead",
      value: customer?.value || 0,
      source: customer?.source || "",
      notes: customer?.notes || "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (isEdit) {
        await customersService.update(customer.id, data);
        toast.success("Customer updated");
      } else {
        await customersService.create(data);
        toast.success("Customer created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring focus:border-border/80 transition-all";
  const labelCls = "text-xs font-medium text-muted-foreground block mb-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name *</label>
          <input {...register("name")} placeholder="Full name" className={inputCls} data-testid="customer-name-input" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Company *</label>
          <input {...register("company")} placeholder="Company name" className={inputCls} data-testid="customer-company-input" />
          {errors.company && <p className="text-red-400 text-xs mt-1">{errors.company.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Email</label>
          <input {...register("email")} type="email" placeholder="email@company.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input {...register("phone")} placeholder="+1 (555) 000-0000" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Status</label>
          <select {...register("status")} className={inputCls} data-testid="customer-status-select">
            {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Value ($)</label>
          <input {...register("value")} type="number" min="0" placeholder="0" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Industry</label>
          <select {...register("industry")} className={inputCls}>
            <option value="">Select industry</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Source</label>
          <select {...register("source")} className={inputCls}>
            <option value="">Select source</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea {...register("notes")} rows={2} placeholder="Add notes..." className={`${inputCls} resize-none`} />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose} className="flex-1 bg-muted border border-border text-sm font-medium text-muted-foreground rounded-lg py-2 hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} data-testid="customer-save-button" className="flex-1 bg-foreground text-background text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {loading ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers", { page, search, status: statusFilter, industry: industryFilter }],
    queryFn: () =>
      customersService.list({ page, limit: 12, search: search || undefined, status: statusFilter || undefined, industry: industryFilter || undefined }).then((r) => r.data),
    keepPreviousData: true,
  });

  const customers = data?.data || [];
  const totalPages = data?.pages || 1;

  const handleEdit = (c) => { setEditCustomer(c); setModalOpen(true); };
  const handleAdd = () => { setEditCustomer(null); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); queryClient.invalidateQueries({ queryKey: ["customers"] }); };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await customersService.delete(deleteId);
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const canManage = user?.role !== "analyst";

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${data?.total ?? 0} total customers`}
        badge={data?.total ? String(data.total) : undefined}
        actions={
          canManage && (
            <button onClick={handleAdd} data-testid="add-customer-button" className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="customer-search"
            className="w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          data-testid="customer-status-filter"
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={industryFilter}
          onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
          data-testid="customer-industry-filter"
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Industries</option>
          {industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Failed to load customers</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description={search || statusFilter ? "No customers match your filters." : "Add your first customer to get started."}
            action={canManage && <button onClick={handleAdd} className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">Add Customer</button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Customer", "Company", "Status", "Value", "Industry", "Source", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold first:pl-5 last:pr-5 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors" data-testid="customer-row">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-foreground/70">{c.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground/80">{c.company}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                        {c.value > 0 ? `$${c.value.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground/80">{c.industry || "—"}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground/80">{c.source || "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {canManage && (
                            <>
                              <button onClick={() => handleEdit(c)} data-testid="edit-customer-button" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(c.id)} data-testid="delete-customer-button" className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {data?.total} total
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 hover:bg-muted rounded-md transition-colors" data-testid="prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 hover:bg-muted rounded-md transition-colors" data-testid="next-page">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-popover border border-border max-w-lg" data-testid="customer-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit text-base font-semibold">
              {editCustomer ? "Edit Customer" : "New Customer"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm customer={editCustomer} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Customer"
        description="This will permanently delete the customer and all associated data."
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
