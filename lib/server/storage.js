// Image uploads → Amazon S3. Every file goes under one root folder (AWS_FOLDER, default "jolof"),
// then a sub-folder per screen: jolof/products/2026/11/<random>.webp
//
// Env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_BUCKET,
//      AWS_USE_PATH_STYLE_ENDPOINT, AWS_FOLDER (optional), AWS_URL (optional public base, e.g. a CDN),
//      AWS_ENDPOINT (optional — S3-compatible storage / local testing).
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fail } from './http';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
export const UPLOAD_FOLDERS = ['products', 'departments', 'commodities', 'product-requests'];

const env = (k, d = '') => (process.env[k] || d).trim();
const cfg = () => ({
  bucket: env('AWS_BUCKET'),
  region: env('AWS_DEFAULT_REGION', 'us-east-1'),
  root: env('AWS_FOLDER', 'jolof').replace(/^\/+|\/+$/g, ''),
  pathStyle: env('AWS_USE_PATH_STYLE_ENDPOINT') === 'true',
  endpoint: env('AWS_ENDPOINT'),
  publicBase: env('AWS_URL').replace(/\/+$/, ''),
});

export const uploadsEnabled = () => !!(env('AWS_BUCKET') && env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY'));

let client;
function s3() {
  const c = cfg();
  client ||= new S3Client({
    region: c.region,
    forcePathStyle: c.pathStyle,
    ...(c.endpoint ? { endpoint: c.endpoint } : {}),
    credentials: { accessKeyId: env('AWS_ACCESS_KEY_ID'), secretAccessKey: env('AWS_SECRET_ACCESS_KEY') },
  });
  return client;
}

/** Public URL of an uploaded key. */
export function publicUrl(key) {
  const c = cfg();
  if (c.publicBase) return `${c.publicBase}/${key}`;
  if (c.endpoint) return `${c.endpoint.replace(/\/+$/, '')}/${c.bucket}/${key}`;
  return c.pathStyle
    ? `https://s3.${c.region}.amazonaws.com/${c.bucket}/${key}`
    : `https://${c.bucket}.s3.${c.region}.amazonaws.com/${key}`;
}

/** Check the file magic bytes so a renamed non-image can't be uploaded as one. */
function sniff(buf) {
  const b = buf.subarray(0, 12);
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('ascii', 4, 8) === 'ftyp' && /avi[fs]/.test(b.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

/** Upload one image File (from request.formData()) and return its public URL. */
export async function uploadImage(file, folder = 'products', uploadedBy = '') {
  if (!uploadsEnabled()) fail(503, 'Image uploads are not set up yet — add the AWS_* settings to the server .env.');
  if (!file || typeof file.arrayBuffer !== 'function') fail(400, 'Choose an image to upload.');
  if (!UPLOAD_FOLDERS.includes(folder)) fail(400, 'Unknown upload folder.');
  if (file.size > MAX_UPLOAD_BYTES) fail(400, 'Image is too large — the limit is 5 MB.');
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !TYPES[type]) fail(400, 'Only JPG, PNG, WebP, GIF or AVIF images can be uploaded.');

  const c = cfg();
  const d = new Date();
  const key = `${c.root}/${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${TYPES[type]}`;
  await s3().send(new PutObjectCommand({
    Bucket: c.bucket, Key: key, Body: buf, ContentType: type,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: uploadedBy ? { 'uploaded-by': encodeURIComponent(uploadedBy).slice(0, 200) } : undefined,
  }));
  return { url: publicUrl(key), key };
}
