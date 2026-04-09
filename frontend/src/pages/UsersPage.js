import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Pencil, UserCog, ShieldAlert } from "lucide-react";
import { usersService } from "../services/usersService";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";

const departments = ["Executive", "Sales", "Operations", "Marketing", "Finance", "Engineering", "Support", "HR"];

const buildCreateSchema = (t) =>
  z.object({
    name: z.string().min(2, t("users.errors.nameTooShort")),
    email: z.string().email(t("users.errors.invalidEmail")),
    password: z.string().min(6, t("users.errors.passwordTooShort")),
    role: z.enum(["admin", "manager", "analyst"]),
    department: z.string().optional(),
  });

const buildEditSchema = (t) =>
  z.object({
    name: z.string().min(2, t("users.errors.nameTooShort")),
    role: z.enum(["admin", "manager", "analyst"]),
    department: z.string().optional(),
    is_active: z.boolean().optional(),
  });

function UserForm({ user: editUser, onClose, onSaved }) {
  const { t, translateDepartment, translateApiError } = useI18n();
  const [loading, setLoading] = useState(false);
  const isEdit = !!editUser;
  const schema = isEdit ? buildEditSchema(t) : buildCreateSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editUser?.name || "",
      email: editUser?.email || "",
      password: "",
      role: editUser?.role || "analyst",
      department: editUser?.department || "",
      is_active: editUser?.is_active !== undefined ? editUser.is_active : true,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const clean = { ...data };
      if (!clean.department) delete clean.department;

      if (isEdit) {
        delete clean.password;
        delete clean.email;
        await usersService.update(editUser.id, clean);
        toast.success(t("users.userUpdated"));
      } else {
        await usersService.create(clean);
        toast.success(t("users.userCreated"));
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
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClassName}>{t("users.form.name")} *</label>
          <input
            {...register("name")}
            placeholder={t("users.form.fullName")}
            className={inputClassName}
            data-testid="user-name-input"
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        {!isEdit && (
          <>
            <div className="col-span-2">
              <label className={labelClassName}>{t("users.form.email")} *</label>
              <input
                {...register("email")}
                type="email"
                placeholder={t("users.form.emailPlaceholder")}
                className={inputClassName}
                data-testid="user-email-input"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="col-span-2">
              <label className={labelClassName}>{t("users.form.password")} *</label>
              <input
                {...register("password")}
                type="password"
                placeholder={t("users.form.passwordPlaceholder")}
                className={inputClassName}
                data-testid="user-password-input"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </>
        )}

        <div>
          <label className={labelClassName}>{t("users.form.role")}</label>
          <select {...register("role")} className={inputClassName} data-testid="user-role-select">
            <option value="analyst">{t("status.analyst")}</option>
            <option value="manager">{t("status.manager")}</option>
            <option value="admin">{t("status.admin")}</option>
          </select>
        </div>

        <div>
          <label className={labelClassName}>{t("users.form.department")}</label>
          <select {...register("department")} className={inputClassName}>
            <option value="">{t("users.form.selectDepartment")}</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {translateDepartment(department)}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" {...register("is_active")} id="is_active" className="rounded" />
            <label htmlFor="is_active" className="text-sm text-foreground/80">
              {t("users.activeAccount")}
            </label>
          </div>
        )}
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
          data-testid="user-save-button"
          className="flex-1 bg-foreground text-background text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? t("common.saving") : isEdit ? t("common.update") : t("users.inviteUser")}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t, locale, translateDepartment, translateApiError } = useI18n();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.list().then((response) => response.data),
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="font-outfit text-lg font-semibold text-foreground mb-2">{t("users.accessRestricted")}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{t("users.accessRestrictedDescription")}</p>
      </div>
    );
  }

  const handleEdit = (selectedUser) => {
    setEditUser(selectedUser);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditUser(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditUser(null);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleDelete = async () => {
    if (deleteId === currentUser.id) {
      toast.error(t("users.cannotDeleteOwnAccount"));
      return;
    }

    setDeleteLoading(true);
    try {
      await usersService.delete(deleteId);
      toast.success(t("users.userDeleted"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteId(null);
    } catch (err) {
      toast.error(translateApiError(err.response?.data?.detail) || t("users.failedToDelete"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return t("users.never");
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div>
      <PageHeader
        title={t("users.title")}
        description={t("users.description", { total: users.length })}
        badge={String(users.length)}
        actions={
          <button
            onClick={handleAdd}
            data-testid="add-user-button"
            className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> {t("users.inviteUser")}
          </button>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-muted-foreground">{t("users.failedToLoad")}</div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={t("users.noUsersYet")}
            description={t("users.noUsersDescription")}
            action={
              <button
                onClick={handleAdd}
                className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90"
              >
                {t("users.inviteUser")}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[t("users.table.user"), t("users.table.role"), t("users.table.department"), t("users.table.status"), t("users.table.lastLogin"), t("users.table.actions")].map((heading) => (
                    <th
                      key={heading}
                      className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold first:pl-5 last:pr-5 last:text-right"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((listedUser) => (
                  <tr
                    key={listedUser.id}
                    className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    data-testid="user-row"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-border">
                          <span className="text-xs font-semibold text-foreground/70">{listedUser.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{listedUser.name}</p>
                            {listedUser.id === currentUser?.id && (
                              <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-full">
                                {t("common.currentUser")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{listedUser.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={listedUser.role} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-foreground/80">
                      {listedUser.department ? translateDepartment(listedUser.department) : t("common.noValue")}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={listedUser.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(listedUser.last_login)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(listedUser)}
                          data-testid="edit-user-button"
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {listedUser.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeleteId(listedUser.id)}
                            data-testid="delete-user-button"
                            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-popover border border-border max-w-md" data-testid="user-modal">
          <DialogHeader>
            <DialogTitle className="font-outfit text-base font-semibold">
              {editUser ? t("users.editUser") : t("users.inviteTeamMember")}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={editUser}
            onClose={() => {
              setModalOpen(false);
              setEditUser(null);
            }}
            onSaved={handleSaved}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("users.deleteUser")}
        description={t("users.deleteUserDescription")}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
