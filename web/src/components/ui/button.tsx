import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong active:opacity-90",
  secondary:
    "bg-surface-raised text-ink border border-border hover:bg-surface-sunken active:opacity-90",
  ghost: "bg-transparent text-ink hover:bg-surface-sunken",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={props.type ?? "button"}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
