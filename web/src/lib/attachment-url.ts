// A stable, cookie-authenticated URL for an S3 attachment. Presigned S3 GET
// URLs die whenever the Lambda execution role's temporary credentials
// rotate, regardless of the requested expiry — so baking one into `<img
// src>` at server-render time means the image goes stale while a page sits
// open. This route (web/src/app/api/uploads/image/route.ts) re-signs on
// every request and redirects, so the URL below never expires as long as
// the caller is signed in. Safe to import from client or server components.
export function attachmentUrl(s3Key: string): string {
  return `/api/uploads/image?key=${encodeURIComponent(s3Key)}`;
}
