import React from "react";
import { useLocation } from "react-router-dom";
import { Bell, Sun, Moon, Search } from "lucide-react";
import { useI18n } from "../../context/I18nContext";
import { useTheme } from "../../context/ThemeContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const location = useLocation();
  const pageKey = location.pathname === "/" ? "dashboard" : location.pathname.replace("/", "");
  const title = t(`header.${pageKey}Title`) === `header.${pageKey}Title` ? "NexCRM" : t(`header.${pageKey}Title`);
  const description = t(`header.${pageKey}Description`) === `header.${pageKey}Description` ? "" : t(`header.${pageKey}Description`);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
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
            placeholder={t("header.searchPlaceholder")}
            data-testid="header-search"
            className="bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground pl-8 pr-3 py-1.5 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-ring focus:bg-muted transition-all"
          />
        </div>

        <div className="flex items-center bg-muted border border-border rounded-lg p-0.5 mr-1">
          {["pt", "en"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                language === lang ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={toggleTheme}
          data-testid="theme-toggle"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          title={theme === "dark" ? t("header.themeToLight") : t("header.themeToDark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors relative"
          data-testid="notifications-button"
          title={t("common.notifications")}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
