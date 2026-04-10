import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useI18n } from "../../context/I18nContext";

export default function PublicTopbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Zap className="w-4 h-4" fill="currentColor" strokeWidth={0} />
          </div>
          <div>
            <p className="font-outfit text-sm font-semibold tracking-tight">NexCRM</p>
            <p className="text-[10px] text-muted-foreground">{t("landing.eyebrow")}</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              isActive("/") ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
            }`}
          >
            {t("common.home")}
          </Link>
          <Link
            to="/about"
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              isActive("/about") ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
            }`}
          >
            {t("common.learnMore")}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
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
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title={theme === "dark" ? t("header.themeToLight") : t("header.themeToDark")}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            to="/login"
            className="px-3 py-2 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {t("landing.primaryCta")}
          </Link>
        </div>
      </div>
    </header>
  );
}
