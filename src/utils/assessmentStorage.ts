// Assessment storage and sharing utilities using IndexedDB

export interface Assessment {
  id: string;
  name: string;
  date: number;
  type: 'video' | 'photo' | 'visual' | 'questionnaire' | 'functional_scale';
  data: unknown; // Assessment-specific data
  videoUrl?: string;
  thumbnail?: string;
  notes?: string;
  clientId?: string;
}

export interface ShareableAssessment {
  id: string;
  url: string;
  qrCode?: string;
  expiresAt?: number;
  pin?: string;
}

const DB_NAME = 'corrective_exercise_db';
const DB_VERSION = 1;
const STORE_NAME = 'assessments';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('clientId', 'clientId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(assessment);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAssessments(): Promise<Assessment[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAssessment(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

interface ShareRecord {
  shareId: string;
  assessmentId: string;
  pin?: string;
  expiresAt: number;
  createdAt: number;
}

export function generateShareableLink(assessmentId: string): ShareableAssessment {
  // Generate a unique shareable ID
  const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create shareable URL
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/assessment/${shareId}?id=${assessmentId}`;

  return {
    id: shareId,
    url,
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  };
}

export async function generateShareLink(
  assessment: Assessment,
  expiresAt: number,
  pin?: string
): Promise<ShareableAssessment> {
  // Generate a unique shareable ID
  const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create shareable URL
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/#/assessment/${shareId}`;
  
  // Store the share record
  const shareRecord: ShareRecord = {
    shareId,
    assessmentId: assessment.id,
    pin,
    expiresAt,
    createdAt: Date.now(),
  };
  
  // Store in localStorage for simplicity (could use IndexedDB for more robust storage)
  const shares = JSON.parse(localStorage.getItem('assessment_shares') ?? '{}');
  shares[shareId] = shareRecord;
  localStorage.setItem('assessment_shares', JSON.stringify(shares));
  
  return {
    id: shareId,
    url,
    expiresAt,
    pin,
  };
}

export async function generateQRCode(url: string): Promise<string> {
  // Generate QR code using a simple API
  // In production, use a library like qrcode
  const size = 200;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  return qrApiUrl;
}

export interface LoadAssessmentResult {
  status: 'success' | 'not_found' | 'expired' | 'pin_required' | 'invalid_pin';
  assessment?: Assessment;
  expiresAt?: number;
}

export async function loadAssessmentByShareId(
  shareId: string,
  enteredPin?: string
): Promise<LoadAssessmentResult> {
  // Get share record from localStorage
  const shares = JSON.parse(localStorage.getItem('assessment_shares') ?? '{}');
  const shareRecord: ShareRecord | undefined = shares[shareId];
  
  if (!shareRecord) {
    return { status: 'not_found' };
  }
  
  // Check if expired
  if (shareRecord.expiresAt < Date.now()) {
    return { status: 'expired', expiresAt: shareRecord.expiresAt };
  }
  
  // Check PIN if required
  if (shareRecord.pin) {
    if (!enteredPin) {
      return { status: 'pin_required' };
    }
    if (enteredPin !== shareRecord.pin) {
      return { status: 'invalid_pin' };
    }
  }
  
  // Load the assessment
  const assessment = await getAssessment(shareRecord.assessmentId);
  
  if (!assessment) {
    return { status: 'not_found' };
  }
  
  return {
    status: 'success',
    assessment,
    expiresAt: shareRecord.expiresAt,
  };
}

export function exportAssessment(assessment: Assessment): string {
  return JSON.stringify(assessment, null, 2);
}

export function importAssessment(json: string): Assessment {
  return JSON.parse(json);
}

