import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// Filled variants get a colour that sweeps up from the bottom on hover (the ::before layer),
// a pressed state, and the global focus-visible ring.
const base =
  "group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-semibold transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-atelier)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] before:absolute before:inset-0 before:-z-10 before:translate-y-[101%] before:rounded-[inherit] before:transition-transform before:duration-500 before:ease-[var(--ease-out-soft)] hover:before:translate-y-0 focus-visible:before:translate-y-0";

const variants: Record<Variant, string> = {
  primary: "bg-indigo text-white shadow-[0_10px_24px_-12px_rgb(38_46_134/0.7)] before:bg-indigo-deep hover:shadow-[0_14px_28px_-12px_rgb(38_46_134/0.8)]",
  secondary: "border border-ink/15 bg-white text-ink before:bg-ink hover:border-ink hover:text-white focus-visible:text-white",
  accent: "bg-sun text-ink shadow-[0_10px_24px_-12px_rgb(255_200_44/0.9)] before:bg-white hover:shadow-[0_16px_30px_-12px_rgb(255_200_44/0.9)]",
  ghost: "text-ink hover:bg-linen",
  danger: "border border-danger/40 text-danger hover:bg-danger hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8rem]",
  md: "h-11 px-6 text-[0.875rem]",
  lg: "h-13 px-8 text-[0.95rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
