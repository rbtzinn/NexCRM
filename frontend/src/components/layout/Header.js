import React from "react";
import { useLocation } from "react-router-dom";
import { Bell, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/deals": "Deals",
  "/tasks": "Tasks",
  "/users": "Users",
  "/reports": "Reports",
};

const pageDescriptions = {
  "/dashboard": "Overview of your business metrics",
  "/customers": "Manage your customer base",
  "/deals": "Track your sales pipeline",
  "/tasks": "Track activities and follow-ups",
  "/users": "Manage team members and roles",
  "/reports": "Analytics and performance insights",
};

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const title = pageTitles[location.pathname] || "NexCRM";
  const description = pageDescriptions[location.pathname] || "";

  return (
    <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <h1 className="font-outfit text-sm font-semibold text-foreground tracking-tight leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden md:block">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            data-testid="header-search"
            className="bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-1.5 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-ring focus:bg-muted transition-all"
          />
        </div>

        <button
          onClick={toggleTheme}
          data-testid="theme-toggle"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors relative"
          data-testid="notifications-button"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
