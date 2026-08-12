export function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
        selected
          ? "border-accent bg-accent-soft text-accent-strong"
          : "border-border bg-surface-raised text-ink hover:bg-surface-sunken"
      }`}
    >
      {label}
    </button>
  );
}
