import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, Handshake, CheckSquare,
  UserCog, BarChart3, LogOut, Zap, ChevronRight, Menu, X,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/deals", label: "Deals", icon: Handshake },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

function NavItem({ item, onClick }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      data-testid={`nav-${item.label.toLowerCase()}`}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
          isActive
            ? "bg-white/[0.08] text-white font-medium"
            : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
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
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = ({ onNavClick }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-black" fill="black" strokeWidth={0} />
          </div>
          <span className="font-outfit font-semibold text-[15px] text-white tracking-tight">NexCRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mb-3">Main</p>
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} onClick={onNavClick} />
        ))}
        {user?.role === "admin" && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-3 mt-5 mb-3">
              Admin
            </p>
            <NavItem item={{ path: "/users", label: "Users", icon: UserCog }} onClick={onNavClick} />
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div className="w-7 h-7 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
            <span className="text-xs font-semibold text-white">{user?.name?.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-zinc-500 truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 bg-black border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
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
        className={`lg:hidden fixed left-0 top-0 z-40 w-[220px] h-screen bg-[#000000] border-r border-white/[0.06] transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] flex-shrink-0 border-r border-white/[0.06] bg-[#000000] h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
