/** The app's real public origin, e.g. "https://cars.pauldev.io".
 *
 * Never derive this from the request. The standalone Next server binds
 * 0.0.0.0 (no HOSTNAME is set in the Dockerfile) and builds the absolute
 * request URL from its own bind address rather than the Host header — see
 * resolve-routes.js's initURL, which uses opts.hostname/opts.port, not
 * req.headers.host. Behind CloudFront + the Lambda Function URL that means
 * req.url / req.nextUrl.origin is always "http://0.0.0.0:3000", and a
 * redirect there is a restricted port the browser refuses to open.
 *
 * SITE_URL is set on the Lambda by CDK and read at runtime; the edge sandbox
 * copies the server's process.env, the same way session.ts reads
 * USER_POOL_ID from middleware. `fallback` covers local `next dev`, where
 * the request origin is already correct (http://localhost:3000). */
export function siteOrigin(fallback: string): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Misconfigured SITE_URL — fall through rather than throw on every request.
    }
  }
  return fallback;
}
