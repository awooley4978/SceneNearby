// ── R2 (S3-compatible) Storage Client ──
// Handles upload, copy, and deletion of photos in Cloudflare R2.

import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.R2_Account_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "nearby-photos";
const PUBLIC_BUCKET_URL = "https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev";

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.warn("⚠️  R2 credentials not fully configured — using mock storage");
      return null as unknown as S3Client;
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function isConfigured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// ── Upload a photo submission ──
// Key: submissions/{appName}/{locationId}_{timestamp}_{uuid}.jpg
export async function uploadSubmissionPhoto(
  appName: string,
  locationId: string,
  fileBuffer: Uint8Array,
  contentType: string,
  submissionId: string
): Promise<string> {
  const timestamp = Date.now();
  const key = `submissions/${appName}/${locationId}_${timestamp}_${submissionId}.jpg`;

  if (!isConfigured()) {
    console.log(`[Mock R2] Would upload ${key} (${fileBuffer.length} bytes)`);
    return key;
  }

  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));

  console.log(`✅ Uploaded to R2: ${key}`);
  return key;
}

// ── Copy submission photo to approved public location ──
// Key: locations/{locationId}_{submissionId}.jpg
export async function approvePhoto(
  submissionId: string,
  sourceKey: string,
  locationId: string
): Promise<string> {
  const publicKey = `locations/${locationId}_${submissionId}.jpg`;
  const publicUrl = `${PUBLIC_BUCKET_URL}/${publicKey}`;

  if (!isConfigured()) {
    console.log(`[Mock R2] Would copy ${sourceKey} → ${publicKey}`);
    return publicUrl;
  }

  const client = getClient();
  await client.send(new CopyObjectCommand({
    Bucket: R2_BUCKET_NAME,
    CopySource: `${R2_BUCKET_NAME}/${sourceKey}`,
    Key: publicKey,
  }));

  console.log(`✅ Published to R2: ${publicKey}`);
  return publicUrl;
}

// ── Delete a photo (for rejection cleanup) ──
export async function deletePhoto(key: string): Promise<void> {
  if (!isConfigured()) {
    console.log(`[Mock R2] Would delete ${key}`);
    return;
  }

  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));

  console.log(`🗑️ Deleted from R2: ${key}`);
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_BUCKET_URL}/${key}`;
}