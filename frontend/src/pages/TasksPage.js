import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Loader2, Trash2, Pencil, CheckSquare, CheckCheck, Download } from "lucide-react";
import { tasksService } from "../services/tasksService";
import { customersService } from "../services/customersService";
import { useI18n } from "../context/I18nContext";
import { exportRowsToCsv } from "../lib/exportCsv";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";

const priorities = ["low", "medium", "high", "urgent"];
const statuses = ["todo", "in_progress", "review", "done"];

const buildSchema = (t) =>
  z.object({
    title: z.string().min(1, t("tasks.errors.titleRequired")),
    description: z.string().optional(),
    customer_id: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    status: z.enum(["todo", "in_progress", "review", "done"]),
    due_date: z.string().optional(),
  });

function TaskForm({ task, customers, onClose, onSaved }) {
  const { t, translateApiError } = useI18n();
  const [loading, setLoading] = useState(false);
  const isEdit = !!task;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      customer_id: task?.customer_id || "",
      priority: task?.priority || "medium",
      status: task?.status || "todo",
      due_date: task?.due_date || "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const clean = {
        ...data,
        customer_id: data.customer_id || null,
        due_date: data.due_date || null,
      };

      if (isEdit) {
        await tasksService.update(task.id, clean);
        toast.success(t("tasks.taskUpdated"));
      } else {
        await tasksService.create(clean);
        toast.success(t("tasks.taskCreated"));
      }

      onSaved();
    } catch (err) {
      toast.error(translateApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all";
  const labelClassName = "text-xs font-medium text-muted-foreground block mb-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className={labelClassName}>{t("tasks.form.title")} *</label>
        <input
          {...register("title")}
          placeholder={t("tasks.form.taskTitle")}
          className={inputClassName}
          data-testid="task-title-input"
        />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className={labelClassName}>{t("tasks.form.description")}</label>
        <textarea
          {...register("description")}
          rows={2}
          placeholder={t("tasks.form.taskDetails")}
          className={`${inputClassName} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClassName}>{t("tasks.form.priority")}</label>
          <select {...register("priority")} className={inputClassName} data-testid="task-priority-select">
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {t(`status.${priority}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName}>{t("tasks.form.status")}</label>
          <select {...register("status")} className={inputClassName} data-testid="task-status-select">
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClassName}>{t("tasks.form.dueDate")}</label>
          <input {...register("due_date")} type="date" className={inputClassName} />
        </div>

        <div>
          <label className={labelClassName}>{t("tasks.form.customer")}</label>
          <select {...register("customer_id")} className={inputClassName}>
            <option value="">{t("tasks.form.noCustomer")}</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-muted border border-border text-sm font-medium text-muted-foreground rounded-lg py-2 hover:text-foreground transition-colors"
        >
          {t("common.cancel")}
        </button>

        <button
          type="submit"
          disabled={loading}
          data-testid="task-save-button"
          className="flex-1 bg-foreground text-background text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.create")}
        </button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  const { t, locale, translateApiError } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", search, statusFilter, priorityFilter],
    queryFn: () =>
      tasksService
        .list({
          limit: 50,
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        })
        .then((response) => response.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersService.list({ limit: 100 }).then((response) => response.data),
  });

  const tasks = data?.data || [];
  const customers = customersData?.data || [];

  const handleEdit = (task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditTask(null);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";

    try {
      await tasksService.update(task.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(newStatus === "done" ? t("tasks.taskCompleted") : t("tasks.taskReopened"));
    } catch (err) {
      toast.error(translateApiError(err.response?.data?.detail) || t("tasks.failedToUpdate"));
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await tasksService.delete(deleteId);
      toast.success(t("tasks.taskDeleted"));
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteId(null);
    } catch (err) {
      toast.error(translateApiError(err.response?.data?.detail) || t("tasks.failedToDelete"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  };

  return (
    <div>
      <PageHeader
        title={t("tasks.title")}
        description={t("tasks.description", { total: data?.total ?? 0 })}
        actions={
          <>
            <button
              onClick={() =>
                exportRowsToCsv(
                  "nexcrm-tasks.csv",
                  tasks.map((task) => ({
                    title: task.title,
                    assignee: task.assignee_name,
                    priority: task.priority,
                    status: task.status,
                    dueDate: task.due_date,
                  }))
                )
              }
              className="flex items-center gap-2 bg-card border border-border text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent/70 transition-colors"
            >
              <Download className="w-4 h-4" /> {t("common.exportCsv")}
            </button>
            <button
              onClick={handleAdd}
              data-testid="add-task-button"
              className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> {t("tasks.addTask")}
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("tasks.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="task-search"
            className="w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          data-testid="task-status-filter"
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("tasks.allStatuses")}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          data-testid="task-priority-filter"
          className="bg-muted border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("tasks.allPriorities")}</option>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {t(`status.${priority}`)}
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
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={t("tasks.noTasksYet")}
            description={search || statusFilter || priorityFilter ? t("tasks.noTasksFiltered") : t("tasks.noTasksDescription")}
            action={
              <button
                onClick={handleAdd}
                className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                {t("tasks.addTask")}
              </button>
            }
          />
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3.5 px-5 py-4 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors group ${
                task.status === "done" ? "opacity-60" : ""
              }`}
              data-testid="task-row"
            >
              <button
                onClick={() => toggleDone(task)}
                data-testid="task-toggle-done"
                className={`w-4.5 h-4.5 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                  task.status === "done"
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-border hover:border-foreground/50"
                }`}
                style={{ width: 18, height: 18 }}
              >
                {task.status === "done" && <CheckCheck className="w-3 h-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-foreground leading-snug ${task.status === "done" ? "line-through" : ""}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(task)}
                      data-testid="edit-task-button"
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(task.id)}
                      data-testid="delete-task-button"
                      className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.due_date && (
                    <span
                      className={`text-[11px] font-medium ${
                        task.status !== "done" && new Date(task.due_date) < new Date()
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t("tasks.due", { date: formatDate(task.due_date) })}
                    </span>
                  )}
                  {task.assignee_name && <span className="text-[11px] text-muted-foreground">- {task.assignee_name}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-popover border border-border max-w-md" data-testid="task-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit text-base font-semibold">
              {editTask ? t("tasks.editTask") : t("tasks.newTask")}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editTask}
            customers={customers}
            onClose={() => {
              setModalOpen(false);
              setEditTask(null);
            }}
            onSaved={handleSaved}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("tasks.deleteTask")}
        description={t("tasks.deleteTaskDescription")}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
