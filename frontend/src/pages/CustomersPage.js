import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Users, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { customersService } from "../services/customersService";
import { exportRowsToCsv } from "../lib/exportCsv";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";

const industries = ["Technology", "Healthcare", "Finance", "Marketing", "Manufacturing", "Consulting", "Energy", "Artificial Intelligence", "Sustainability", "Other"];
const sources = ["Website", "Referral", "Conference", "Cold Outreach", "LinkedIn", "Partner", "Webinar", "Trade Show", "Other"];
const statuses = ["lead", "prospect", "customer", "churned"];

const buildSchema = (t) =>
  z.object({
    name: z.string().min(1, t("customers.errors.nameRequired")),
    company: z.string().min(1, t("customers.errors.companyRequired")),
    email: z.string().email(t("customers.errors.invalidEmail")).optional().or(z.literal("")),
    phone: z.string().optional(),
    industry: z.string().optional(),
    status: z.enum(["lead", "prospect", "customer", "churned"]),
    value: z.coerce.number().min(0),
    source: z.string().optional(),
    notes: z.string().optional(),
  });

function CustomerForm({ customer, onClose, onSaved }) {
  const { t, translateIndustry, translateSource, translateApiError } = useI18n();
  const [loading, setLoading] = useState(false);
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(buildSchema(t)),
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
        toast.success(t("customers.customerUpdated"));
      } else {
        await customersService.create(data);
        toast.success(t("customers.customerCreated"));
      }
      onSaved();
    } catch (err) {
      toast.error(translateApiError(err.response?.data?.detail));
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
          <label className={labelCls}>{t("customers.form.name")} *</label>
          <input {...register("name")} placeholder={t("customers.form.fullName")} className={inputCls} data-testid="customer-name-input" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className={labelCls}>{t("customers.form.company")} *</label>
          <input {...register("company")} placeholder={t("customers.form.companyName")} className={inputCls} data-testid="customer-company-input" />
          {errors.company && <p className="text-red-400 text-xs mt-1">{errors.company.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t("customers.form.email")}</label>
          <input {...register("email")} type="email" placeholder={t("customers.form.emailPlaceholder")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("customers.form.phone")}</label>
          <input {...register("phone")} placeholder={t("customers.form.phonePlaceholder")} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t("customers.form.status")}</label>
          <select {...register("status")} className={inputCls} data-testid="customer-status-select">
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("customers.form.value")}</label>
          <input {...register("value")} type="number" min="0" placeholder="0" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t("customers.form.industry")}</label>
          <select {...register("industry")} className={inputCls}>
            <option value="">{t("customers.form.selectIndustry")}</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {translateIndustry(industry)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("customers.form.source")}</label>
          <select {...register("source")} className={inputCls}>
            <option value="">{t("customers.form.selectSource")}</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {translateSource(source)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>{t("customers.form.notes")}</label>
        <textarea {...register("notes")} rows={2} placeholder={t("customers.form.addNotes")} className={`${inputCls} resize-none`} />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose} className="flex-1 bg-muted border border-border text-sm font-medium text-muted-foreground rounded-lg py-2 hover:text-foreground transition-colors">
          {t("common.cancel")}
        </button>
        <button type="submit" disabled={loading} data-testid="customer-save-button" className="flex-1 bg-foreground text-background text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.create")}
        </button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const { user } = useAuth();
  const { t, locale, translateIndustry, translateSource } = useI18n();
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
      customersService.list({
        page,
        limit: 12,
        search: search || undefined,
        status: statusFilter || undefined,
        industry: industryFilter || undefined,
      }).then((response) => response.data),
    keepPreviousData: true,
  });

  const customers = data?.data || [];
  const totalPages = data?.pages || 1;
  const canManage = user?.role !== "analyst";

  const handleEdit = (currentCustomer) => {
    setEditCustomer(currentCustomer);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditCustomer(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await customersService.delete(deleteId);
      toast.success(t("customers.customerDeleted"));
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteId(null);
    } catch {
      toast.error(t("customers.failedToDelete"));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("customers.title")}
        description={t("customers.description", { total: data?.total ?? 0 })}
        badge={data?.total ? String(data.total) : undefined}
        actions={
          <>
            <button
              onClick={() =>
                exportRowsToCsv(
                  "nexcrm-customers.csv",
                  customers.map((customer) => ({
                    name: customer.name,
                    company: customer.company,
                    email: customer.email,
                    status: customer.status,
                    value: customer.value,
                    industry: customer.industry,
                    source: customer.source,
                  }))
                )
              }
              className="flex items-center gap-2 bg-card border border-border text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent/70 transition-colors"
            >
              <Download className="w-4 h-4" /> {t("common.exportCsv")}
            </button>
            {canManage && (
              <button onClick={handleAdd} data-testid="add-customer-button" className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> {t("customers.addCustomer")}
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            data-testid="customer-search"
            className="w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          data-testid="customer-status-filter"
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("customers.allStatuses")}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>

        <select
          value={industryFilter}
          onChange={(event) => {
            setIndustryFilter(event.target.value);
            setPage(1);
          }}
          data-testid="customer-industry-filter"
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("customers.allIndustries")}</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {translateIndustry(industry)}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-muted-foreground">{t("customers.failedToLoad")}</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("customers.noCustomersYet")}
            description={search || statusFilter ? t("customers.noCustomersFiltered") : t("customers.noCustomersDescription")}
            action={canManage && <button onClick={handleAdd} className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">{t("customers.addCustomer")}</button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[t("customers.table.customer"), t("customers.table.company"), t("customers.table.status"), t("customers.table.value"), t("customers.table.industry"), t("customers.table.source"), t("customers.table.actions")].map((heading) => (
                      <th key={heading} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold first:pl-5 last:pr-5 last:text-right">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors" data-testid="customer-row">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-foreground/70">{customer.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground/80">{customer.company}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={customer.status} /></td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                        {customer.value > 0 ? `$${customer.value.toLocaleString(locale)}` : t("common.noValue")}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground/80">{customer.industry ? translateIndustry(customer.industry) : t("common.noValue")}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground/80">{customer.source ? translateSource(customer.source) : t("common.noValue")}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {canManage && (
                            <>
                              <button onClick={() => handleEdit(customer)} data-testid="edit-customer-button" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(customer.id)} data-testid="delete-customer-button" className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors">
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t("customers.pagination", { page, totalPages, total: data?.total ?? 0 })}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 hover:bg-muted rounded-md transition-colors" data-testid="prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 hover:bg-muted rounded-md transition-colors" data-testid="next-page">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-popover border border-border max-w-lg" data-testid="customer-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit text-base font-semibold">
              {editCustomer ? t("customers.editCustomer") : t("customers.newCustomer")}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm customer={editCustomer} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("customers.deleteCustomer")}
        description={t("customers.deleteCustomerDescription")}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
