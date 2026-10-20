import clsx from "clsx";
import type { ReactNode } from "react";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("mx-auto w-full max-w-page px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

export function SectionHeading({ eyebrow, title, intro, action, as: Tag = "h2" }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; action?: ReactNode; as?: "h1" | "h2" }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      {/* Scroll reveal sequence: eyebrow, headline wipes up, then intro and action. */}
      <div className="max-w-2xl">
        {eyebrow && (
          <p data-reveal="up" className="eyebrow mb-4">
            {eyebrow}
          </p>
        )}
        <Tag data-reveal="mask" style={{ ["--delay" as string]: "80ms" }} className="font-display text-headline font-bold">
          {title}
        </Tag>
        {intro && (
          <p data-reveal="up" style={{ ["--delay" as string]: "200ms" }} className="mt-4 max-w-prose text-[1.02rem] leading-relaxed text-ink-soft">
            {intro}
          </p>
        )}
      </div>
      {action && (
        <div data-reveal="up" style={{ ["--delay" as string]: "260ms" }} className="flex">
          {action}
        </div>
      )}
    </div>
  );
}

const tones = {
  neutral: "bg-linen text-ink-soft",
  indigo: "bg-indigo-soft text-indigo",
  brass: "bg-brass-soft text-brass",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-[0.12em]", tones[tone], className)}>{children}</span>;
}

export function Alert({ tone, title, children }: { tone: "success" | "warning" | "danger" | "info"; title?: string; children?: ReactNode }) {
  const styles = {
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-indigo/20 bg-indigo-soft text-indigo",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={clsx("rounded-xs border px-4 py-3 text-sm", styles)}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={clsx(title && "mt-1", "text-ink-soft")}>{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center border border-dashed border-sand px-6 py-16 text-center">
      <p className="font-display font-semibold text-title">{title}</p>
      {children && <div className="mt-3 max-w-md text-ink-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
