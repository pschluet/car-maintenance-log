// No imports, no process.env: must be importable from edge middleware, the
// Node-runtime refresh route, and the client-side login form alike.
const SENTINEL_ORIGIN = "https://safe-next.invalid";

/** Only honor a `next` value that resolves to a path on our own origin.
 *
 * A prefix check like `!raw.startsWith("//")` is not enough: a value such as
 * "/\t/evil.com" passes it, but WHATWG URL parsing strips the tab before
 * resolving, turning it into "//evil.com" — a scheme-relative URL to another
 * host. Resolving against a sentinel origin and requiring the result to keep
 * that exact origin closes that gap along with every other parser-dependent
 * trick, without re-implementing URL parsing by hand. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, SENTINEL_ORIGIN);
    if (url.origin !== SENTINEL_ORIGIN) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
