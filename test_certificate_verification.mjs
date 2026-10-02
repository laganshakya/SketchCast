// Test Script: Cryptographic Certificate Tamper-Detection Verification
import { createHmac } from 'crypto';

const MASTER_SIGNING_SALT = 'sketchcast_merit_ledger_noma_v1_secure_salt';

function createCanonicalCertificateMessage(payload) {
  const cleanId = payload.certId.trim().toUpperCase();
  const cleanRoom = payload.roomCode.trim().toUpperCase();
  const cleanName = payload.recipientName.trim().toLowerCase();
  const cleanScore = Math.round(Number(payload.score) || 0);
  const cleanRank = Math.round(Number(payload.rank) || 1);
  const cleanTotal = Math.round(Number(payload.totalAttendees) || 1);
  const cleanCorrect = Math.round(Number(payload.correctQuizzes) || 0);

  return `CERT-PAYLOAD-V1:${cleanId}:${cleanRoom}:${cleanName}:${cleanScore}:${cleanRank}:${cleanTotal}:${cleanCorrect}`;
}

function signCertificate(payload) {
  const message = createCanonicalCertificateMessage(payload);
  const secret = `${MASTER_SIGNING_SALT}:${payload.roomCode.trim().toUpperCase()}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('hex').slice(0, 32);
}

function verifyCertificate(payload, signature) {
  if (!signature || !signature.trim()) return false;
  const expected = signCertificate(payload);
  return expected.toLowerCase() === signature.trim().toLowerCase();
}

console.log('🧪 Starting Certificate Verification & Tamper Detection Tests...\n');

const validPayload = {
  certId: 'CERT-SC-TECH-799-4A9B',
  roomCode: 'TECH-799',
  recipientName: 'Lagan Shakya',
  roomTitle: 'Live Architecture Masterclass',
  rank: 1,
  totalAttendees: 15,
  score: 400,
  correctQuizzes: 4,
  hostName: 'Masterclass Host',
};

// 1. Generate valid signature
const validSig = signCertificate(validPayload);
console.log(`1. Generated Genuine Signature: ${validSig}`);
const test1 = verifyCertificate(validPayload, validSig);
console.log(`   Verification result: ${test1 ? '✅ AUTHENTIC (PASS)' : '❌ FAILED'}`);
if (!test1) throw new Error('Test 1 failed: Valid payload should verify');

// 2. Attack Scenario: Attacker modifies score in URL
const tamperedScorePayload = { ...validPayload, score: 9999 };
const test2 = verifyCertificate(tamperedScorePayload, validSig);
console.log(`2. Attack: Score changed from 400 to 9999`);
console.log(`   Verification result: ${!test2 ? '🛡️ TAMPER DETECTED (PASS)' : '❌ VULNERABLE'}`);
if (test2) throw new Error('Test 2 failed: Score tampering was NOT detected!');

// 3. Attack Scenario: Attacker changes name in URL
const tamperedNamePayload = { ...validPayload, recipientName: 'Hacker Joe' };
const test3 = verifyCertificate(tamperedNamePayload, validSig);
console.log(`3. Attack: Name changed from "Lagan Shakya" to "Hacker Joe"`);
console.log(`   Verification result: ${!test3 ? '🛡️ TAMPER DETECTED (PASS)' : '❌ VULNERABLE'}`);
if (test3) throw new Error('Test 3 failed: Name tampering was NOT detected!');

// 4. Attack Scenario: Attacker changes rank in URL
const tamperedRankPayload = { ...validPayload, rank: 99 };
const test4 = verifyCertificate(tamperedRankPayload, validSig);
console.log(`4. Attack: Rank changed from 1 to 99`);
console.log(`   Verification result: ${!test4 ? '🛡️ TAMPER DETECTED (PASS)' : '❌ VULNERABLE'}`);
if (test4) throw new Error('Test 4 failed: Rank tampering was NOT detected!');

// 5. Attack Scenario: Attacker changes room in URL
const tamperedRoomPayload = { ...validPayload, roomCode: 'FAKE-123' };
const test5 = verifyCertificate(tamperedRoomPayload, validSig);
console.log(`5. Attack: Room changed from TECH-799 to FAKE-123`);
console.log(`   Verification result: ${!test5 ? '🛡️ TAMPER DETECTED (PASS)' : '❌ VULNERABLE'}`);
if (test5) throw new Error('Test 5 failed: Room tampering was NOT detected!');

// 6. Attack Scenario: Missing signature
const test6 = verifyCertificate(validPayload, '');
console.log(`6. Attack: Missing signature query parameter`);
console.log(`   Verification result: ${!test6 ? '🛡️ TAMPER DETECTED (PASS)' : '❌ VULNERABLE'}`);
if (test6) throw new Error('Test 6 failed: Missing signature was NOT detected!');

// 7. Attack Scenario: Random forged signature
const test7 = verifyCertificate(validPayload, '0123456789abcdef0123456789abcdef');
console.log(`7. Attack: Forged random signature`);
console.log(`   Verification result: ${!test7 ? '🛡️ TAMPER DETECTED (PASS)' : '❌ VULNERABLE'}`);
if (test7) throw new Error('Test 7 failed: Forged signature was NOT detected!');

// 8. Edge Case: Valid certificate with zero correct quizzes and zero score
const zeroPayload = {
  certId: 'CERT-SC-TECH-799-ZERO',
  roomCode: 'TECH-799',
  recipientName: 'Participant One',
  roomTitle: 'Live Architecture Masterclass',
  rank: 10,
  totalAttendees: 15,
  score: 0,
  correctQuizzes: 0,
  hostName: 'Masterclass Host',
};
const zeroSig = signCertificate(zeroPayload);
const test8 = verifyCertificate(zeroPayload, zeroSig);
console.log(`8. Edge Case: Valid certificate with 0 score and 0 challenges`);
console.log(`   Verification result: ${test8 ? '✅ AUTHENTIC (PASS)' : '❌ FAILED'}`);
if (!test8) throw new Error('Test 8 failed: Zero-score certificate should be authentic');

console.log('\n🎉 ALL 8 CRYPTOGRAPHIC VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
