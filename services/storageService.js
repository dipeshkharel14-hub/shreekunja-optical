/**
 * services/storageService.js
 *
 * Supabase Storage adapter. Uploads are performed server-side so the
 * service-role key never reaches the browser.
 */

const config = require('../config/env');
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

function validateFile({ mimeType, size }) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: JPG, PNG, WEBP.`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('The selected image is empty or invalid.');
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }
}

function getSupabaseStorageConfig() {
  if (String(config.storage.provider).toLowerCase() !== 'supabase') {
    throw new Error('Image storage is not configured. Set STORAGE_PROVIDER=supabase in Vercel.');
  }
  if (!config.storage.endpoint || !config.storage.apiKey || !config.storage.bucket) {
    throw new Error('Supabase image storage is incomplete. Set STORAGE_ENDPOINT, STORAGE_API_KEY, and STORAGE_BUCKET in Vercel.');
  }
  return {
    endpoint: config.storage.endpoint.replace(/\/+$/, ''),
    apiKey: config.storage.apiKey,
    bucket: config.storage.bucket
  };
}

function encodeObjectKey(key) {
  return String(key).split('/').map(encodeURIComponent).join('/');
}

async function readError(response) {
  const body = await response.text().catch(() => '');
  let message = body;
  try {
    const parsed = JSON.parse(body);
    message = parsed.message || parsed.error || parsed.statusCode || body;
  } catch (_) {}
  return `Supabase Storage error (${response.status}): ${message || response.statusText}`;
}

async function uploadFile({ buffer, filename, mimeType, folder = 'uploads' }) {
  const storage = getSupabaseStorageConfig();
  const extension = MIME_EXTENSIONS[mimeType];
  const safeFolder = /^[a-z0-9_-]+$/i.test(folder) ? folder : 'uploads';
  const storageKey = `${safeFolder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  const objectUrl = `${storage.endpoint}/storage/v1/object/${encodeURIComponent(storage.bucket)}/${encodeObjectKey(storageKey)}`;

  const response = await fetch(objectUrl, {
    method: 'POST',
    headers: {
      apikey: storage.apiKey,
      Authorization: `Bearer ${storage.apiKey}`,
      'Content-Type': mimeType,
      'x-upsert': 'false'
    },
    body: buffer
  });

  if (!response.ok) throw new Error(await readError(response));

  const publicUrl = `${storage.endpoint}/storage/v1/object/public/${encodeURIComponent(storage.bucket)}/${encodeObjectKey(storageKey)}`;
  return { url: publicUrl, storageKey };
}

async function deleteFile(storageKey) {
  if (!storageKey) return;
  const storage = getSupabaseStorageConfig();
  const response = await fetch(
    `${storage.endpoint}/storage/v1/object/${encodeURIComponent(storage.bucket)}/${encodeObjectKey(storageKey)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: storage.apiKey,
        Authorization: `Bearer ${storage.apiKey}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(await readError(response));
  }
}

module.exports = { uploadFile, deleteFile, validateFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
