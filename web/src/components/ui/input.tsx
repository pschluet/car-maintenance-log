import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const FIELD_CLASSES =
  "min-h-11 w-full rounded-xl border border-border bg-surface-raised px-3.5 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASSES} ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_CLASSES} min-h-24 py-2.5 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD_CLASSES} ${className}`} {...props} />;
}

export function FieldLabel({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1.5 block text-sm font-medium text-ink ${className}`} {...props} />;
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-danger">{children}</p>;
}

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}
