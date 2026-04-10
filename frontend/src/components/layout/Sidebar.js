import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import {
  LayoutDashboard, Users, Handshake, CheckSquare,
  UserCog, BarChart3, LogOut, Zap, Menu, X, Shield, ExternalLink, Info,
} from "lucide-react";

function NavItem({ item, onClick }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      data-testid={`nav-${item.testId || item.path.replace("/", "")}`}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
          isActive
            ? "bg-accent text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
        }`
      }
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t, translateStatus } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { path: "/dashboard", label: t("sidebar.dashboard"), testId: "dashboard", icon: LayoutDashboard },
    { path: "/customers", label: t("sidebar.customers"), testId: "customers", icon: Users },
    { path: "/deals", label: t("sidebar.deals"), testId: "deals", icon: Handshake },
    { path: "/tasks", label: t("sidebar.tasks"), testId: "tasks", icon: CheckSquare },
    { path: "/reports", label: t("sidebar.reports"), testId: "reports", icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = ({ onNavClick }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary rounded-[6px] flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" strokeWidth={0} />
          </div>
          <span className="font-outfit font-semibold text-[15px] text-foreground tracking-tight">NexCRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-3">{t("sidebar.main")}</p>
        {navItems.map((item) => (
          <NavItem key={item.path} item={{ ...item, label: item.label }} onClick={onNavClick} />
        ))}
        {user?.role === "admin" && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mt-5 mb-3">
              {t("sidebar.admin")}
            </p>
            <NavItem item={{ path: "/users", label: t("sidebar.users"), icon: UserCog }} onClick={onNavClick} />
            <NavItem item={{ path: "/audit-logs", label: t("sidebar.auditLogs"), icon: Shield }} onClick={onNavClick} />
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/70 transition-colors group">
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-border">
            <span className="text-xs font-semibold text-primary-foreground">{user?.name?.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate capitalize">{translateStatus(user?.role)}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            title={t("sidebar.signOut")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 px-3">
          <Link
            to="/"
            onClick={onNavClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("common.backToSite")}
          </Link>
          <Link
            to="/about"
            onClick={onNavClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            {t("common.learnMore")}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="sidebar-mobile-toggle"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 z-40 w-[220px] h-screen bg-card border-r border-border transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] flex-shrink-0 border-r border-border bg-card h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
