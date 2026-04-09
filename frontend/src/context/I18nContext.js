import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TRANSLATIONS, getNestedTranslation } from "../data/translations";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") return "pt";
    return localStorage.getItem("nexcrm_language") || "pt";
  });

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexcrm_language", nextLanguage);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const t = (key, params) => {
      const valueByKey = getNestedTranslation(language, key);
      if (typeof valueByKey === "function") {
        return valueByKey(params || {});
      }
      if (valueByKey !== undefined) {
        return valueByKey;
      }
      const fallback = getNestedTranslation("en", key);
      if (typeof fallback === "function") {
        return fallback(params || {});
      }
      return fallback !== undefined ? fallback : key;
    };

    const translateStatus = (status) => t(`status.${status}`);
    const translateIndustry = (industry) => t(`industries.${industry || "Other"}`);
    const translateSource = (source) => t(`sources.${source || "Unknown"}`);
    const translateDepartment = (department) => t(`departments.${department}`);
    const translateMonthShort = (month) => t(`monthsShort.${month}`);
    const translateApiError = (detail) => {
      if (!detail) return t("apiErrors.fallback");
      const translated = t(`apiErrors.${detail}`);
      return translated === `apiErrors.${detail}` ? t("apiErrors.fallback") : translated;
    };
    const locale = t("common.locale");

    return {
      language,
      setLanguage,
      t,
      locale,
      translateStatus,
      translateIndustry,
      translateSource,
      translateDepartment,
      translateMonthShort,
      translateApiError,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
