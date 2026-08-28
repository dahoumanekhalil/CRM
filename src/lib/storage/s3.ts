import "server-only";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "minio",
    secretAccessKey: process.env.S3_SECRET ?? "minio123",
  },
  forcePathStyle: true,
});

const DEFAULT_BUCKET = process.env.S3_BUCKET ?? "recordings";
const URL_TTL_SECONDS = 3600;

/**
 * Parse a recording location produced by the LiveKit Egress file result.
 * Handles:
 *   - s3://bucket/key  (standard S3 URL)
 *   - http[s]://host/bucket/key  (MinIO path-style direct URL)
 *   - bare key  (fallback)
 */
function parseLocation(location: string): { bucket: string; key: string } {
  if (location.startsWith("s3://")) {
    const rest = location.slice(5);
    const slash = rest.indexOf("/");
    if (slash < 0) return { bucket: rest, key: "" };
    return { bucket: rest.slice(0, slash), key: rest.slice(slash + 1) };
  }
  try {
    const url = new URL(location);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return { bucket: parts[0], key: parts.slice(1).join("/") };
    }
  } catch {
    // fall through
  }
  return { bucket: DEFAULT_BUCKET, key: location };
}

/**
 * Generate a time-limited presigned GET URL for a stored recording.
 * @param location  The raw value stored in LiveSession.recordingUrl
 * @returns Presigned URL valid for 1 hour
 */
export async function generateSignedUrl(location: string): Promise<string> {
  const { bucket, key } = parseLocation(location);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: URL_TTL_SECONDS });
}
