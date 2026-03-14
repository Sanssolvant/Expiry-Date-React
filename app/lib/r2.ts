import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  keyPrefix: string;
};

type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

function readR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || '';
  const publicBaseUrl = trimTrailingSlashes(process.env.R2_PUBLIC_BASE_URL?.trim() || '');
  const keyPrefix = trimSlashes(process.env.R2_KEY_PREFIX?.trim() || 'products');

  const missing: string[] = [];

  if (!accountId) {missing.push('R2_ACCOUNT_ID');}
  if (!accessKeyId) {missing.push('R2_ACCESS_KEY_ID');}
  if (!secretAccessKey) {missing.push('R2_SECRET_ACCESS_KEY');}
  if (!bucketName) {missing.push('R2_BUCKET_NAME');}
  if (!publicBaseUrl) {missing.push('R2_PUBLIC_BASE_URL');}

  if (missing.length > 0) {
    throw new Error(`R2 nicht konfiguriert. Fehlende ENV Variablen: ${missing.join(', ')}`);
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    keyPrefix,
  };
}

function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }
  cachedConfig = readR2Config();
  return cachedConfig;
}

async function getS3Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getConfig();
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

function encodeKeyForUrl(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function joinKey(prefix: string, value: string) {
  return [trimSlashes(prefix), trimSlashes(value)].filter(Boolean).join('/');
}

export function createR2ObjectKey(userId: string, extension = 'webp') {
  const { keyPrefix } = getConfig();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const ext = extension.replace(/^\./, '').toLowerCase() || 'webp';

  return joinKey(keyPrefix, `${userId}/${year}/${month}/${day}/${randomUUID()}.${ext}`);
}

export function createR2PublicUrl(key: string) {
  const { publicBaseUrl } = getConfig();
  const encodedKey = encodeKeyForUrl(key);
  return `${publicBaseUrl}/${encodedKey}`;
}

export function extractR2KeyFromUrl(url: string) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  let urlObj: URL;
  let baseObj: URL;

  try {
    urlObj = new URL(url);
    baseObj = new URL(getConfig().publicBaseUrl);
  } catch {
    return null;
  }

  if (
    urlObj.protocol !== baseObj.protocol ||
    urlObj.hostname !== baseObj.hostname ||
    (urlObj.port || '') !== (baseObj.port || '')
  ) {
    return null;
  }

  const basePath = trimTrailingSlashes(baseObj.pathname);
  const urlPath = urlObj.pathname;
  const expectedPrefix = `${basePath}/`;

  if (!urlPath.startsWith(expectedPrefix)) {
    return null;
  }

  const rawKey = urlPath.slice(expectedPrefix.length);
  if (!rawKey) {
    return null;
  }

  return rawKey
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

export function isR2KeyOwnedByUser(key: string, userId: string) {
  if (!key || !userId) {
    return false;
  }

  const { keyPrefix } = getConfig();
  const normalizedKey = trimSlashes(key);
  const userPrefix = joinKey(keyPrefix, userId);

  return normalizedKey === userPrefix || normalizedKey.startsWith(`${userPrefix}/`);
}

export async function putObjectToR2({ key, body, contentType, cacheControl }: PutObjectInput) {
  const config = getConfig();
  const client = await getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  await client.send(command);
}

export async function deleteObjectFromR2(key: string) {
  if (!key) {
    return;
  }

  const config = getConfig();
  const client = await getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await client.send(command);
}
