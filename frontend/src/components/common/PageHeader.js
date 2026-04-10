import React from "react";

export default function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6 sm:mb-8">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-outfit text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
          {badge && (
            <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-xs font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
