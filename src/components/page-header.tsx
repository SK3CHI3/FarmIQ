import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: "ready" | "not-ready" | "partial";
}) {
  const styles =
    status === "ready"
      ? "bg-primary-soft text-accent-foreground"
      : status === "partial"
        ? "bg-amber-50 text-amber-700"
        : "bg-muted text-muted-foreground";
  const label = status === "ready" ? "Ready" : status === "partial" ? "Partial" : "Not ready";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

export function CompletenessBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-primary" : value >= 40 ? "bg-[var(--warning)]" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span
        className={`text-xs font-medium ${
          value >= 70 ? "text-primary" : value >= 40 ? "text-[var(--warning)]" : "text-destructive"
        }`}
      >
        {value}%
      </span>
    </div>
  );
}
