import { Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export const MAX_RECEIPT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export interface StagedReceipt {
  uri: string;
  mimeType?: string;
  fileSize?: number;
  base64?: string | null;
}

const RECEIPTS_DIR_NAME = 'receipts';

/**
 * Returns the permanent directory path for receipt storage on native platforms.
 */
export function getReceiptsDirectory(): string {
  if (Platform.OS === 'web') return '';
  return `${FileSystem.documentDirectory || ''}${RECEIPTS_DIR_NAME}/`;
}

/**
 * Ensures the receipts directory exists in document storage on native platforms.
 */
async function ensureReceiptsDirectory(): Promise<string> {
  const dir = getReceiptsDirectory();
  if (!dir) return '';
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Generates an internal safe filename with an allowed extension.
 */
function generateSafeFilename(mimeType?: string, originalUri?: string): string {
  let ext = '.jpg';
  if (mimeType) {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('png')) ext = '.png';
    else if (normalized.includes('webp')) ext = '.webp';
    else if (normalized.includes('heic')) ext = '.heic';
    else if (normalized.includes('jpeg') || normalized.includes('jpg')) ext = '.jpg';
  } else if (originalUri) {
    const lower = originalUri.toLowerCase();
    for (const candidate of ALLOWED_EXTENSIONS) {
      if (lower.endsWith(candidate)) {
        ext = candidate;
        break;
      }
    }
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `receipt_${timestamp}_${randomSuffix}${ext}`;
}

// -------------------------------------------------------------
// Web IndexedDB Implementation (Zero SQLite bloat on web)
// -------------------------------------------------------------
const DB_NAME = 'LuminaReceiptsDB';
const DB_VERSION = 1;
const STORE_NAME = 'receipts';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWebReceiptBlob(id: string, blob: Blob): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ id, blob, createdAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getWebReceiptBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result && result.blob ? result.blob : null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function deleteWebReceiptBlob(id: string): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Non-critical cleanup failure tolerated
  }
}

// -------------------------------------------------------------
// Core Persistence & Lifecycle Functions
// -------------------------------------------------------------

/**
 * Persists a staged image asset into permanent storage (Filesystem on native, IndexedDB on web).
 * Returns a manageable reference to be stored in SQLite.
 */
export async function persistReceipt(staged: StagedReceipt): Promise<string> {
  if (staged.fileSize && staged.fileSize > MAX_RECEIPT_SIZE_BYTES) {
    throw new Error('Receipt image exceeds maximum size limit of 15 MB.');
  }

  if (staged.mimeType && !ALLOWED_MIME_TYPES.includes(staged.mimeType.toLowerCase())) {
    throw new Error('Unsupported receipt format. Allowed formats: JPG, PNG, WebP, HEIC.');
  }

  if (Platform.OS === 'web') {
    // Convert URI or Base64 into Blob
    let blob: Blob;
    if (staged.uri.startsWith('blob:') || staged.uri.startsWith('data:')) {
      const res = await fetch(staged.uri);
      blob = await res.blob();
    } else if (staged.base64) {
      const byteCharacters = atob(staged.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: staged.mimeType || 'image/jpeg' });
    } else {
      throw new Error('Invalid web image data');
    }

    if (blob.size > MAX_RECEIPT_SIZE_BYTES) {
      throw new Error('Receipt image exceeds maximum size limit of 15 MB.');
    }

    const safeId = `web_receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await saveWebReceiptBlob(safeId, blob);
    // Return compact reference for SQLite
    return `receipt://${safeId}`;
  }

  // Native (iOS / Android)
  const dir = await ensureReceiptsDirectory();
  const safeFilename = generateSafeFilename(staged.mimeType, staged.uri);
  const targetPath = `${dir}${safeFilename}`;

  await FileSystem.copyAsync({
    from: staged.uri,
    to: targetPath,
  });

  // Return relative document path (e.g. "receipts/receipt_123.jpg")
  // Relative paths survive iOS application container UUID migrations during updates.
  return `${RECEIPTS_DIR_NAME}/${safeFilename}`;
}

/**
 * Deletes a receipt file from permanent storage if it exists.
 * Implements strict path-traversal prevention.
 */
export async function deleteReceiptFile(receiptReference: string | null | undefined): Promise<void> {
  if (!receiptReference) return;

  // Legacy inline Base64 data strings require no filesystem cleanup
  if (receiptReference.startsWith('data:')) return;

  if (Platform.OS === 'web') {
    if (receiptReference.startsWith('receipt://')) {
      const id = receiptReference.replace('receipt://', '');
      // Strict identifier validation
      if (/^[a-zA-Z0-9_\-]+$/.test(id)) {
        await deleteWebReceiptBlob(id);
      }
    }
    return;
  }

  // Native (iOS / Android)
  try {
    const receiptsDir = getReceiptsDirectory();
    if (receiptReference.startsWith(`${RECEIPTS_DIR_NAME}/`)) {
      const filename = receiptReference.replace(`${RECEIPTS_DIR_NAME}/`, '');
      // Path traversal security check: only alphanumeric, dashes, underscores, and single dot allowed
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
        return;
      }
      const fullPath = `${receiptsDir}${filename}`;
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    } else if (receiptReference.startsWith(receiptsDir)) {
      // Direct path match inside receipts directory
      await FileSystem.deleteAsync(receiptReference, { idempotent: true });
    }
  } catch {
    // Tolerated if file was already removed
  }
}

/**
 * Wipes all stored receipts from permanent receipts storage.
 * - Native: Deletes the receipts directory and recreates an empty one.
 * - Web: Clears the IndexedDB receipts object store.
 */
export async function clearAllReceiptStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const db = await openIndexedDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      // Non-critical cleanup failure tolerated
    }
    return;
  }

  try {
    const receiptsDir = getReceiptsDirectory();
    if (receiptsDir) {
      await FileSystem.deleteAsync(receiptsDir, { idempotent: true });
      await ensureReceiptsDirectory();
    }
  } catch {
    // Non-critical cleanup failure tolerated
  }
}


/**
 * React hook to resolve a receipt reference into a displayable URI.
 * - Handles relative paths on native
 * - Handles IndexedDB Blobs and Object URLs on Web (with auto-revocation to prevent memory leaks)
 * - Backwards-compatible with legacy Base64 and absolute file URIs
 */
export function useReceiptDisplayUri(receiptUri: string | null | undefined): string | null {
  const syncUri = useMemo(() => {
    if (!receiptUri) return null;
    if (receiptUri.startsWith('data:') || receiptUri.startsWith('blob:') || receiptUri.startsWith('http')) {
      return receiptUri;
    }
    if (Platform.OS !== 'web') {
      if (receiptUri.startsWith(`${RECEIPTS_DIR_NAME}/`)) {
        return `${FileSystem.documentDirectory || ''}${receiptUri}`;
      }
      return receiptUri;
    }
    return null;
  }, [receiptUri]);

  const [asyncWebUri, setAsyncWebUri] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    if (Platform.OS === 'web' && receiptUri && receiptUri.startsWith('receipt://')) {
      const key = receiptUri.replace('receipt://', '');
      getWebReceiptBlob(key)
        .then((blob) => {
          if (!isMounted) return;
          if (blob) {
            createdUrl = URL.createObjectURL(blob);
            setAsyncWebUri(createdUrl);
          } else {
            setAsyncWebUri(null);
          }
        })
        .catch(() => {
          if (isMounted) setAsyncWebUri(null);
        });
    }

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [receiptUri]);

  return syncUri ?? (receiptUri?.startsWith('receipt://') ? asyncWebUri : null);
}
