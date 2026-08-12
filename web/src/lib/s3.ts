import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.ATTACHMENTS_BUCKET ?? "car-maintenance-log-attachments";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

// S3_ENDPOINT/S3_FORCE_PATH_STYLE are only set locally to point at MinIO;
// unset in every deployed environment so the SDK uses real S3 defaults.
// This client is for the server's own direct calls (deleteObject).
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle,
});

// Presigned URLs are handed to the browser, which runs outside the
// docker-compose network and can't resolve MinIO's service hostname
// ("minio") the way the app container can. S3_PUBLIC_ENDPOINT lets local
// dev sign URLs against the host-mapped address (http://localhost:9000)
// instead, while production (where neither var is set) is unaffected.
const presignClient = process.env.S3_PUBLIC_ENDPOINT
  ? new S3Client({ endpoint: process.env.S3_PUBLIC_ENDPOINT, forcePathStyle })
  : client;

// Uploads only need to survive the moment the browser PUTs to the signed
// URL, so that TTL stays short. Downloads are re-signed per request by
// /api/uploads/image (see web/src/lib/attachment-url.ts) and only need to
// outlive following a single redirect, but a longer window makes a stray
// cached redirect harmless too.
const UPLOAD_TTL_SECONDS = 5 * 60;
const DOWNLOAD_TTL_SECONDS = 60 * 60;

export function buildAttachmentKey(carId: string, kind: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `cars/${carId}/${kind}/${crypto.randomUUID()}-${safeName}`;
}

export async function presignUpload(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(presignClient, command, { expiresIn: UPLOAD_TTL_SECONDS });
}

export async function presignDownload(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(presignClient, command, { expiresIn: DOWNLOAD_TTL_SECONDS });
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
