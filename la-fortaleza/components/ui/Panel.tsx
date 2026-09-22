import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="section-label-bar">{title}</div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Alert({
  kind = "warn",
  children,
}: {
  kind?: "ok" | "error" | "warn";
  children: ReactNode;
}) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}
