import { createAdminClient } from './supabase/admin';

// Storage helpers using the service-role client. Buckets are private; the
// browser only ever receives short-lived signed URLs minted here on the server.

export async function signedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function downloadBytes(
  bucket: string,
  path: string,
): Promise<Uint8Array> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function uploadBytes(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, Buffer.from(bytes), { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}
