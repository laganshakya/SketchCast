import { supabase } from './supabase';

export interface CertificatePayload {
  certId: string;
  roomCode: string;
  recipientName: string;
  roomTitle: string;
  rank: number;
  totalAttendees: number;
  score: number;
  correctQuizzes: number;
  hostName: string;
  issueDate?: string;
  signature?: string;
}

export interface CertificateRecord extends CertificatePayload {
  signature: string;
  issuedAt?: string;
}

export interface CertificateVerificationResult {
  status: 'authentic' | 'tampered' | 'not_found' | 'invalid_room';
  isAuthentic: boolean;
  reason: string;
  signatureValid: boolean;
  dbRecordMatched?: boolean;
  tamperedFields?: string[];
  payload: CertificatePayload;
  timestamp: string;
}

const MASTER_SIGNING_SALT = 'sketchcast_merit_ledger_noma_v1_secure_salt';
const LOCAL_STORAGE_CERT_KEY = 'sketchcast_issued_certificates';

/**
 * Creates a normalized canonical message string for cryptographic signing.
 * Normalizes all whitespace and casing to prevent trivial character-encoding spoofing.
 */
export function createCanonicalCertificateMessage(payload: {
  certId: string;
  roomCode: string;
  recipientName: string;
  score: number;
  rank: number;
  totalAttendees: number;
  correctQuizzes: number;
}): string {
  const cleanId = payload.certId.trim().toUpperCase();
  const cleanRoom = payload.roomCode.trim().toUpperCase();
  const cleanName = payload.recipientName.trim().toLowerCase();
  const cleanScore = Math.round(Number(payload.score) || 0);
  const cleanRank = Math.round(Number(payload.rank) || 1);
  const cleanTotal = Math.round(Number(payload.totalAttendees) || 1);
  const cleanCorrect = Math.round(Number(payload.correctQuizzes) || 0);

  return `CERT-PAYLOAD-V1:${cleanId}:${cleanRoom}:${cleanName}:${cleanScore}:${cleanRank}:${cleanTotal}:${cleanCorrect}`;
}

/**
 * Generates an HMAC-SHA256 signature using the browser Web Crypto API.
 * The secret key is salted with the master system salt and the target room code.
 */
export async function signCertificate(payload: {
  certId: string;
  roomCode: string;
  recipientName: string;
  score: number;
  rank: number;
  totalAttendees: number;
  correctQuizzes: number;
}): Promise<string> {
  const message = createCanonicalCertificateMessage(payload);
  const secret = `${MASTER_SIGNING_SALT}:${payload.roomCode.trim().toUpperCase()}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    const fullHex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    // 32-character compact high-entropy signature for clean URL query parameters
    return fullHex.slice(0, 32);
  }

  // Pure JS fallback in environments without crypto.subtle (e.g. lightweight test runners)
  return fallbackHash(message + secret);
}

/**
 * Verifies that the provided signature matches the canonical certificate payload.
 */
export async function verifyCertificateSignature(
  payload: {
    certId: string;
    roomCode: string;
    recipientName: string;
    score: number;
    rank: number;
    totalAttendees: number;
    correctQuizzes: number;
  },
  signature?: string | null
): Promise<boolean> {
  if (!signature || !signature.trim()) {
    return false;
  }

  try {
    const expectedSig = await signCertificate(payload);
    return expectedSig.toLowerCase() === signature.trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Persists an issued certificate to Supabase and browser localStorage.
 */
export async function dbRegisterCertificate(
  payload: CertificatePayload,
  signature: string
): Promise<boolean> {
  const cleanId = payload.certId.trim().toUpperCase();
  const cleanRoom = payload.roomCode.trim().toUpperCase();

  const record: CertificateRecord = {
    ...payload,
    certId: cleanId,
    roomCode: cleanRoom,
    signature,
    issuedAt: new Date().toISOString(),
  };

  // 1. Cache to local storage ledger
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_CERT_KEY);
      const list: CertificateRecord[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter((c) => c.certId !== cleanId);
      updated.unshift(record);
      // Keep most recent 50 certificates locally
      localStorage.setItem(LOCAL_STORAGE_CERT_KEY, JSON.stringify(updated.slice(0, 50)));
    }
  } catch {
    // Ignore storage errors
  }

  // 2. Persist to Supabase merit ledger table
  if (supabase) {
    try {
      const { error } = await supabase.from('certificates').upsert({
        id: cleanId,
        room_code: cleanRoom,
        recipient_name: payload.recipientName.trim(),
        room_title: payload.roomTitle || `Masterclass Session (${cleanRoom})`,
        rank: Math.round(Number(payload.rank) || 1),
        total_attendees: Math.round(Number(payload.totalAttendees) || 1),
        score: Math.round(Number(payload.score) || 0),
        correct_quizzes: Math.round(Number(payload.correctQuizzes) || 0),
        host_name: payload.hostName || 'Arena Host',
        signature,
        issued_at: record.issuedAt,
      });

      if (!error) {
        return true;
      }
    } catch {
      // Continue with local storage success
    }
  }

  return true;
}

/**
 * Looks up an issued certificate in Supabase or local storage ledger.
 */
export async function dbLookupCertificate(certId: string): Promise<CertificateRecord | null> {
  const cleanId = certId.trim().toUpperCase();

  // 1. Query Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        return {
          certId: data.id,
          roomCode: data.room_code,
          recipient_name: data.recipient_name,
          recipientName: data.recipient_name,
          room_title: data.room_title,
          roomTitle: data.room_title,
          rank: data.rank,
          total_attendees: data.total_attendees,
          totalAttendees: data.total_attendees,
          score: data.score,
          correct_quizzes: data.correct_quizzes,
          correctQuizzes: data.correct_quizzes,
          host_name: data.host_name,
          hostName: data.host_name,
          signature: data.signature,
          issuedAt: data.issued_at,
          issueDate: new Date(data.issued_at || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        } as unknown as CertificateRecord;
      }
    } catch {
      // Fall through to local cache
    }
  }

  // 2. Query localStorage fallback
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_CERT_KEY);
      if (stored) {
        const list: CertificateRecord[] = JSON.parse(stored);
        const found = list.find((c) => c.certId.toUpperCase() === cleanId);
        if (found) return found;
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return null;
}

/**
 * Deep cryptographic and ledger verification of a certificate payload.
 * Detects URL parameter tampering, forged scores, altered names, and missing signatures.
 */
export async function verifyCertificateAuthenticity(
  payload: CertificatePayload
): Promise<CertificateVerificationResult> {
  const nowStr = new Date().toLocaleTimeString();

  // 1. Check if signature exists
  if (!payload.signature || !payload.signature.trim()) {
    return {
      status: 'tampered',
      isAuthentic: false,
      reason: 'Missing Cryptographic Seal: This URL was created without an authorized signature.',
      signatureValid: false,
      payload,
      timestamp: nowStr,
    };
  }

  // 2. Verify Cryptographic HMAC Signature
  const isSigValid = await verifyCertificateSignature(payload, payload.signature);

  if (!isSigValid) {
    return {
      status: 'tampered',
      isAuthentic: false,
      reason: 'Signature Mismatch: Certificate parameters (name, score, rank, or room) do not match the cryptographic seal. URL has been modified or forged.',
      signatureValid: false,
      payload,
      timestamp: nowStr,
    };
  }

  // 3. Optional DB record check (defense in depth)
  const dbRecord = await dbLookupCertificate(payload.certId);
  if (dbRecord) {
    const tamperedFields: string[] = [];
    if (dbRecord.recipientName.trim().toLowerCase() !== payload.recipientName.trim().toLowerCase()) {
      tamperedFields.push(`Name changed from "${dbRecord.recipientName}" to "${payload.recipientName}"`);
    }
    if (Number(dbRecord.score) !== Number(payload.score)) {
      tamperedFields.push(`Score altered from ${dbRecord.score} to ${payload.score}`);
    }
    if (Number(dbRecord.rank) !== Number(payload.rank)) {
      tamperedFields.push(`Rank altered from #${dbRecord.rank} to #${payload.rank}`);
    }
    if (dbRecord.roomCode.toUpperCase() !== payload.roomCode.toUpperCase()) {
      tamperedFields.push(`Room altered from ${dbRecord.roomCode} to ${payload.roomCode}`);
    }

    if (tamperedFields.length > 0) {
      return {
        status: 'tampered',
        isAuthentic: false,
        reason: 'Ledger Discrepancy: Values in the URL do not match the permanently recorded ledger entry.',
        signatureValid: false,
        dbRecordMatched: false,
        tamperedFields,
        payload,
        timestamp: nowStr,
      };
    }

    return {
      status: 'authentic',
      isAuthentic: true,
      reason: 'Authentic: Cryptographically verified and validated against the Studio Noma Merit Ledger database.',
      signatureValid: true,
      dbRecordMatched: true,
      payload,
      timestamp: nowStr,
    };
  }

  // 4. Valid signature confirmed mathematically
  return {
    status: 'authentic',
    isAuthentic: true,
    reason: 'Authentic: Cryptographically verified via Studio Noma HMAC-SHA256 seal.',
    signatureValid: true,
    dbRecordMatched: false,
    payload,
    timestamp: nowStr,
  };
}

/**
 * Lightweight synchronous fallback hash algorithm (FNV-1a / DJB2 derivative)
 */
function fallbackHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2 + part1 + part2).slice(0, 32);
}
