"use client";

import { useId, useState } from "react";
import { ChevronIcon } from "./icons";

/** Disclosure that groups several server-rendered cards behind one toggle,
 * collapsed by default. Deliberately no persistence (localStorage, etc.) —
 * "collapsed by default" means every page load starts collapsed.
 *
 * Children are unmounted while collapsed rather than hidden with CSS, so a
 * collapsed group of sections that render attachment previews issues none
 * of their image requests until expanded. */
export function CollapsibleSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-4 text-left shadow-sm"
      >
        <span className="flex items-center gap-2 font-medium text-ink">
          <ChevronIcon
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          {title}
        </span>
        {summary && <span className="truncate text-sm text-ink-muted">{summary}</span>}
      </button>
      {open && (
        <div id={bodyId} className="mt-3 space-y-5">
          {children}
        </div>
      )}
    </div>
  );
}
