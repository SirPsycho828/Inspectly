// Access code management callable functions
// Based on docs/planning/03_API_Endpoints.md and 14_Client_Agent_Notifications.md

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0/O/1/I/L
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function verifyReportOwnership(
  db: admin.firestore.Firestore,
  reportId: string,
  uid: string
): Promise<admin.firestore.DocumentData> {
  const reportSnap = await db.collection('reports').doc(reportId).get();
  if (!reportSnap.exists) {
    throw new HttpsError('not-found', 'Report not found');
  }
  const report = reportSnap.data()!;
  if (report.inspectorId !== uid) {
    throw new HttpsError('permission-denied', 'You do not own this report');
  }
  if (report.status === 'revoked') {
    throw new HttpsError('failed-precondition', 'Report is revoked');
  }
  return report;
}

async function enqueueNotification(
  db: admin.firestore.Firestore,
  reportId: string,
  recipientEmail: string,
  recipientName: string,
  recipientType: string,
  accessCode: string,
  template: 'access_code_resend' | 'access_code_new',
  reportData: Record<string, unknown>
): Promise<void> {
  const now = admin.firestore.Timestamp.now();
  await db.collection('notificationLog').add({
    reportId,
    recipientEmail,
    recipientName,
    recipientType,
    channel: 'email',
    template,
    accessCode,
    reportData,
    status: 'pending',
    attempts: 0,
    lastAttemptAt: null,
    providerMessageId: null,
    error: null,
    createdAt: now,
  });
  console.log(`[notifications] Enqueued ${template} for ${recipientEmail} on report ${reportId}`);
}

// ─── revokeAccessCode ─────────────────────────────────────────────────────────

export const revokeAccessCode = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { reportId, accessCodeId } = request.data;
    if (!reportId || typeof reportId !== 'string') {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }
    if (!accessCodeId || typeof accessCodeId !== 'string') {
      throw new HttpsError('invalid-argument', 'accessCodeId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    await verifyReportOwnership(db, reportId, uid);

    const codeRef = db.collection('reports').doc(reportId).collection('accessCodes').doc(accessCodeId);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
      throw new HttpsError('not-found', 'Access code not found');
    }

    if (codeSnap.data()!.revokedAt) {
      throw new HttpsError('failed-precondition', 'Access code is already revoked');
    }

    const now = admin.firestore.Timestamp.now();
    await codeRef.update({ revokedAt: now });

    return { success: true };
  }
);

// ─── regenerateAccessCode ─────────────────────────────────────────────────────

export const regenerateAccessCode = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { reportId, accessCodeId } = request.data;
    if (!reportId || typeof reportId !== 'string') {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }
    if (!accessCodeId || typeof accessCodeId !== 'string') {
      throw new HttpsError('invalid-argument', 'accessCodeId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const report = await verifyReportOwnership(db, reportId, uid);

    const codeRef = db.collection('reports').doc(reportId).collection('accessCodes').doc(accessCodeId);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
      throw new HttpsError('not-found', 'Access code not found');
    }

    const oldCode = codeSnap.data()!;
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 90 * 24 * 60 * 60 * 1000
    );
    const newCode = generateAccessCode();

    // Revoke old code and create a new one in a batch
    const batch = db.batch();

    batch.update(codeRef, { revokedAt: now });

    const newCodeRef = db.collection('reports').doc(reportId).collection('accessCodes').doc();
    batch.set(newCodeRef, {
      code: newCode,
      recipientEmail: oldCode.recipientEmail,
      recipientName: oldCode.recipientName,
      recipientType: oldCode.recipientType,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessedAt: null,
      revokedAt: null,
      expiresAt,
      createdAt: now,
    });

    await batch.commit();

    // Notify the recipient of their new code
    const notificationReportData = {
      propertyAddress: report.property
        ? `${report.property.address}, ${report.property.city}, ${report.property.state}`
        : '',
      inspectorName: report.inspectorName || 'Inspector',
      inspectorLicense: report.inspectorLicense || '',
      firmName: report.firmName || null,
      brandingLogoUrl: report.branding?.logoUrl || null,
      brandingPrimaryColor: report.branding?.primaryColor || '#0D9488',
      findingSummary: report.findingCounts || {},
    };

    await enqueueNotification(
      db,
      reportId,
      oldCode.recipientEmail,
      oldCode.recipientName,
      oldCode.recipientType,
      newCode,
      'access_code_resend',
      notificationReportData
    );

    return {
      success: true,
      newAccessCodeId: newCodeRef.id,
      code: newCode,
      recipientEmail: oldCode.recipientEmail,
    };
  }
);

// ─── addReportRecipient ───────────────────────────────────────────────────────

export const addReportRecipient = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { reportId, name, email, phone, recipientType } = request.data;
    if (!reportId || typeof reportId !== 'string') {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }
    if (!name || typeof name !== 'string') {
      throw new HttpsError('invalid-argument', 'name is required');
    }
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'email is required');
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpsError('invalid-argument', 'Invalid email address');
    }

    const validTypes = ['client', 'agent', 'other'];
    const type = validTypes.includes(recipientType) ? recipientType : 'other';

    const uid = request.auth.uid;
    const db = admin.firestore();

    const report = await verifyReportOwnership(db, reportId, uid);

    // Check if this email already has an active (non-revoked) access code
    const existingCodesSnap = await db
      .collection('reports')
      .doc(reportId)
      .collection('accessCodes')
      .where('recipientEmail', '==', email)
      .where('revokedAt', '==', null)
      .get();

    if (!existingCodesSnap.empty) {
      throw new HttpsError(
        'already-exists',
        'This email already has an active access code for this report'
      );
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 90 * 24 * 60 * 60 * 1000
    );
    const newCode = generateAccessCode();

    const codeRef = db.collection('reports').doc(reportId).collection('accessCodes').doc();
    await codeRef.set({
      code: newCode,
      recipientEmail: email,
      recipientName: name,
      recipientType: type,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessedAt: null,
      revokedAt: null,
      expiresAt,
      createdAt: now,
    });

    // Notify the new recipient
    const notificationReportData = {
      propertyAddress: report.property
        ? `${report.property.address}, ${report.property.city}, ${report.property.state}`
        : '',
      inspectorName: report.inspectorName || 'Inspector',
      inspectorLicense: report.inspectorLicense || '',
      firmName: report.firmName || null,
      brandingLogoUrl: report.branding?.logoUrl || null,
      brandingPrimaryColor: report.branding?.primaryColor || '#0D9488',
      findingSummary: report.findingCounts || {},
    };

    await enqueueNotification(
      db,
      reportId,
      email,
      name,
      type,
      newCode,
      'access_code_new',
      notificationReportData
    );

    return {
      success: true,
      accessCodeId: codeRef.id,
      code: newCode,
      recipientEmail: email,
      phone: phone || null,
    };
  }
);

// ─── resendNotification ───────────────────────────────────────────────────────

export const resendNotification = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { reportId, accessCodeId } = request.data;
    if (!reportId || typeof reportId !== 'string') {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }
    if (!accessCodeId || typeof accessCodeId !== 'string') {
      throw new HttpsError('invalid-argument', 'accessCodeId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const report = await verifyReportOwnership(db, reportId, uid);

    const codeSnap = await db
      .collection('reports')
      .doc(reportId)
      .collection('accessCodes')
      .doc(accessCodeId)
      .get();

    if (!codeSnap.exists) {
      throw new HttpsError('not-found', 'Access code not found');
    }

    const code = codeSnap.data()!;

    if (code.revokedAt) {
      throw new HttpsError('failed-precondition', 'Cannot resend notification for a revoked access code');
    }

    if (code.expiresAt.toMillis() < Date.now()) {
      throw new HttpsError('failed-precondition', 'Cannot resend notification for an expired access code');
    }

    const notificationReportData = {
      propertyAddress: report.property
        ? `${report.property.address}, ${report.property.city}, ${report.property.state}`
        : '',
      inspectorName: report.inspectorName || 'Inspector',
      inspectorLicense: report.inspectorLicense || '',
      firmName: report.firmName || null,
      brandingLogoUrl: report.branding?.logoUrl || null,
      brandingPrimaryColor: report.branding?.primaryColor || '#0D9488',
      findingSummary: report.findingCounts || {},
    };

    await enqueueNotification(
      db,
      reportId,
      code.recipientEmail,
      code.recipientName,
      code.recipientType,
      code.code,
      'access_code_resend',
      notificationReportData
    );

    return { success: true, recipientEmail: code.recipientEmail };
  }
);
