import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Pencil, UserCog, ShieldAlert } from "lucide-react";
import { usersService } from "../services/usersService";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/common/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";

const createSchema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "manager", "analyst"]),
  department: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["admin", "manager", "analyst"]).optional(),
  department: z.string().optional(),
  is_active: z.boolean().optional(),
});

const departments = ["Executive", "Sales", "Operations", "Marketing", "Finance", "Engineering", "Support", "HR"];

function UserForm({ user: editUser, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!editUser;
  const schema = isEdit ? editSchema : createSchema;

  const { register, handleSubmit, formState: { errors } } = useForm({
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
        if (clean.password) delete clean.password;
        await usersService.update(editUser.id, clean);
        toast.success("User updated");
      } else {
        await usersService.create(clean);
        toast.success("User created");
      }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.detail || "Something went wrong"); }
    finally { setLoading(false); }
  };

  const cls = "w-full bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-all";
  const lbl = "text-xs font-medium text-muted-foreground block mb-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Name *</label>
          <input {...register("name")} placeholder="Full name" className={cls} data-testid="user-name-input" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>
        {!isEdit && (
          <>
            <div className="col-span-2">
              <label className={lbl}>Email *</label>
              <input {...register("email")} type="email" placeholder="user@company.com" className={cls} data-testid="user-email-input" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div className="col-span-2">
              <label className={lbl}>Password *</label>
              <input {...register("password")} type="password" placeholder="Min. 6 characters" className={cls} data-testid="user-password-input" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </>
        )}
        <div>
          <label className={lbl}>Role</label>
          <select {...register("role")} className={cls} data-testid="user-role-select">
            <option value="analyst">Analyst</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Department</label>
          <select {...register("department")} className={cls}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {isEdit && (
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" {...register("is_active")} id="is_active" className="rounded" />
            <label htmlFor="is_active" className="text-sm text-foreground/80">Active account</label>
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 bg-muted border border-border text-sm font-medium text-muted-foreground rounded-lg py-2 hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} data-testid="user-save-button" className="flex-1 bg-foreground text-background text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? "Saving..." : isEdit ? "Update" : "Invite User"}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.list().then(r => r.data),
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="font-outfit text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-xs">User management is only available to admins.</p>
      </div>
    );
  }

  const handleEdit = (u) => { setEditUser(u); setModalOpen(true); };
  const handleAdd = () => { setEditUser(null); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); setEditUser(null); queryClient.invalidateQueries({ queryKey: ["users"] }); };

  const handleDelete = async () => {
    if (deleteId === currentUser.id) { toast.error("Cannot delete your own account"); return; }
    setDeleteLoading(true);
    try {
      await usersService.delete(deleteId);
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteId(null);
    } catch { toast.error("Failed to delete user"); }
    finally { setDeleteLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} team members`}
        badge={String(users.length)}
        actions={
          <button onClick={handleAdd} data-testid="add-user-button" className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Invite User
          </button>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UserCog} title="No users yet" description="Invite team members to collaborate." action={<button onClick={handleAdd} className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90">Invite User</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["User", "Role", "Department", "Status", "Last Login", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold first:pl-5 last:pr-5 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors" data-testid="user-row">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-border">
                          <span className="text-xs font-semibold text-foreground/70">{u.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{u.name}</p>
                            {u.id === currentUser?.id && <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-full">you</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={u.role} /></td>
                    <td className="px-4 py-3.5 text-sm text-foreground/80">{u.department || "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={u.is_active ? "active" : "inactive"} /></td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(u.last_login)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleEdit(u)} data-testid="edit-user-button" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        {u.id !== currentUser?.id && (
                          <button onClick={() => setDeleteId(u.id)} data-testid="delete-user-button" className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <DialogTitle className="font-outfit text-base font-semibold">{editUser ? "Edit User" : "Invite Team Member"}</DialogTitle>
          </DialogHeader>
          <UserForm user={editUser} onClose={() => { setModalOpen(false); setEditUser(null); }} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        title="Delete User"
        description="This will permanently delete this user account."
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
