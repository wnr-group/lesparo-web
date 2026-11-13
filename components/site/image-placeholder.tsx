import { Shirt } from "lucide-react";

/** Shown where a product has no photograph yet, so a grid or gallery never shows an empty box. */
export function ImagePlaceholder({ label = "Photo coming soon", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#e4e7f5_75%)]">
      <Shirt aria-hidden strokeWidth={1.25} className={`${compact ? "size-9" : "size-14"} text-indigo/30`} />
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">{label}</span>
    </div>
  );
}
