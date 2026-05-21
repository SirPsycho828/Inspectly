// Report publishing callable functions
// Based on docs/planning/03_API_Endpoints.md and 12_Report_Preview_Publish.md

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

interface Recipient {
  name: string;
  email: string;
  phone?: string | null;
  type: 'client' | 'agent' | 'other';
}

interface AccessCodeResult {
  recipientName: string;
  recipientEmail: string;
  recipientType: string;
  code: string;
}

async function createAccessCodesForRecipients(
  db: admin.firestore.Firestore,
  reportId: string,
  recipients: Recipient[],
  expiresAt: admin.firestore.Timestamp
): Promise<AccessCodeResult[]> {
  const results: AccessCodeResult[] = [];

  for (const recipient of recipients) {
    const code = generateAccessCode();
    const now = admin.firestore.Timestamp.now();

    await db.collection('reports').doc(reportId).collection('accessCodes').add({
      code,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientType: recipient.type,
      failedAttempts: 0,
      lockedUntil: null,
      lastAccessedAt: null,
      revokedAt: null,
      expiresAt,
      createdAt: now,
    });

    results.push({
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientType: recipient.type,
      code,
    });
  }

  return results;
}

async function enqueueNotifications(
  db: admin.firestore.Firestore,
  reportId: string,
  accessCodes: AccessCodeResult[],
  reportData: Record<string, unknown>,
  template: 'report_published' | 'report_amended'
): Promise<void> {
  // Per the architecture in 14_Client_Agent_Notifications.md, notifications are
  // published to a Pub/Sub topic. Until the Pub/Sub function is wired up,
  // we write pending notification records to Firestore so they can be processed
  // and the pipeline can be tested end-to-end.
  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();

  for (const recipient of accessCodes) {
    const logRef = db.collection('notificationLog').doc();
    batch.set(logRef, {
      reportId,
      recipientEmail: recipient.recipientEmail,
      recipientName: recipient.recipientName,
      recipientType: recipient.recipientType,
      channel: 'email',
      template,
      accessCode: recipient.code,
      reportData,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: null,
      providerMessageId: null,
      error: null,
      createdAt: now,
    });
  }

  await batch.commit();

  // TODO: Replace with Pub/Sub publish once the notificationDelivery function
  // is implemented. Example:
  //   const { PubSub } = require('@google-cloud/pubsub');
  //   const pubsub = new PubSub();
  //   await pubsub.topic('notifications').publishJSON(message);
  console.log(`[notifications] Enqueued ${accessCodes.length} notifications for report ${reportId}`);
}

// ─── publishReport ────────────────────────────────────────────────────────────

export const publishReport = onCall(
  { enforceAppCheck: false, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { inspectionId, recipients, executiveSummary, reportSettings } = request.data;
    if (!inspectionId || typeof inspectionId !== 'string') {
      throw new HttpsError('invalid-argument', 'inspectionId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Fetch the inspection
    const inspectionSnap = await db.collection('inspections').doc(inspectionId).get();
    if (!inspectionSnap.exists) {
      throw new HttpsError('not-found', 'Inspection not found');
    }
    const inspection = inspectionSnap.data()!;

    // Ownership check
    if (inspection.inspectorId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this inspection');
    }

    // Status validation — must be 'review' or 'in_progress'
    if (inspection.status !== 'review' && inspection.status !== 'in_progress') {
      throw new HttpsError(
        'failed-precondition',
        `Cannot publish inspection with status '${inspection.status}'. Must be 'review' or 'in_progress'.`
      );
    }

    // At least one recipient with an email is required
    const allRecipients: Recipient[] = [];

    if (inspection.clientEmail) {
      allRecipients.push({
        name: inspection.clientName || 'Client',
        email: inspection.clientEmail,
        phone: inspection.clientPhone || null,
        type: 'client',
      });
    }

    if (inspection.agentEmail) {
      allRecipients.push({
        name: inspection.agentName || 'Agent',
        email: inspection.agentEmail,
        phone: null,
        type: 'agent',
      });
    }

    // Merge in additional recipients from the request (inspector can toggle/add at publish time)
    if (Array.isArray(recipients)) {
      for (const r of recipients) {
        if (r.email && r.name) {
          allRecipients.push({
            name: r.name,
            email: r.email,
            phone: r.phone || null,
            type: r.type || 'other',
          });
        }
      }
    } else if (Array.isArray(inspection.additionalRecipients)) {
      for (const r of inspection.additionalRecipients) {
        if (r.email && r.name) {
          allRecipients.push({
            name: r.name,
            email: r.email,
            phone: r.phone || null,
            type: r.type || 'other',
          });
        }
      }
    }

    if (allRecipients.length === 0) {
      throw new HttpsError(
        'failed-precondition',
        'At least one recipient with an email address is required to publish a report'
      );
    }

    // Fetch all findings for the snapshot
    const findingsSnap = await db
      .collection('inspections')
      .doc(inspectionId)
      .collection('findings')
      .orderBy('order', 'asc')
      .get();

    if (findingsSnap.empty && (inspection.checklistProgress?.completed || 0) === 0) {
      throw new HttpsError('failed-precondition', 'Cannot publish an empty report with no inspected items');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findings: any[] = findingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Compute finding counts
    const findingCounts = {
      critical: findings.filter((f) => f.severity === 'critical').length,
      major: findings.filter((f) => f.severity === 'major').length,
      minor: findings.filter((f) => f.severity === 'minor').length,
      informational: findings.filter((f) => f.severity === 'informational').length,
    };

    // Normalize findings: apply defaults for missing narrative/severity
    const normalizedFindings = findings.map((f) => ({
      ...f,
      severity: f.severity || 'informational',
      narrative: f.narrative || 'No description provided',
    }));

    // Group findings by sectionId to build report sections
    const sectionMap = new Map<string, { sectionId: string; title: string; findings: typeof normalizedFindings }>();
    for (const finding of normalizedFindings) {
      const sectionId = finding.sectionId || 'additional';
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          sectionId,
          title: finding.sectionTitle || sectionId,
          findings: [],
        });
      }
      sectionMap.get(sectionId)!.findings.push(finding);
    }
    const sections = Array.from(sectionMap.values());

    // Fetch inspector profile for snapshot
    const inspectorSnap = await db.collection('users').doc(uid).get();
    const inspector = inspectorSnap.data() || {};

    // Fetch firm branding snapshot if applicable
    let firmName: string | null = null;
    let branding: Record<string, unknown> = { primaryColor: '#0D9488' };
    if (inspection.firmId) {
      const firmSnap = await db.collection('firms').doc(inspection.firmId).get();
      if (firmSnap.exists) {
        const firm = firmSnap.data()!;
        firmName = firm.name || null;
        branding = firm.branding || branding;
      }
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 90 * 24 * 60 * 60 * 1000 // 90 days
    );

    // Create the report document
    const reportRef = db.collection('reports').doc();
    const reportId = reportRef.id;

    const reportDoc = {
      inspectionId,
      inspectorId: uid,
      firmId: inspection.firmId || null,
      version: 1,
      parentReportId: null,
      status: 'active',
      property: inspection.property,
      inspectorName: (reportSettings?.displayName ?? inspector.displayName) || 'Inspector',
      inspectorLicense: (reportSettings?.displayLicense ?? inspector.licenseNumber) || '',
      firmName,
      branding,
      executiveSummary: executiveSummary || '',
      sections,
      findingCounts,
      totalPhotos: normalizedFindings.reduce((sum, f) => sum + (Array.isArray(f.photos) ? f.photos.length : 0), 0),
      pdfUrl: null,
      pdfGeneratedAt: null,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await reportRef.set(reportDoc);

    // Generate access codes for all recipients
    const accessCodes = await createAccessCodesForRecipients(db, reportId, allRecipients, expiresAt);

    // Update inspection: status -> published, set reportId and publishedAt
    await db.collection('inspections').doc(inspectionId).update({
      status: 'published',
      reportId,
      publishedAt: now,
      updatedAt: now,
    });

    // Enqueue notifications (async — does not block publish response)
    const notificationReportData = {
      propertyAddress: `${inspection.property.address}, ${inspection.property.city}, ${inspection.property.state}`,
      inspectionDate: inspection.startedAt ? inspection.startedAt.toDate().toISOString() : now.toDate().toISOString(),
      inspectorName: reportDoc.inspectorName,
      inspectorLicense: reportDoc.inspectorLicense,
      firmName,
      brandingLogoUrl: (branding as Record<string, unknown>).logoUrl || null,
      brandingPrimaryColor: ((branding as Record<string, unknown>).primaryColor as string) || '#0D9488',
      findingSummary: findingCounts,
    };

    await enqueueNotifications(db, reportId, accessCodes, notificationReportData, 'report_published');

    return { reportId, accessCodes };
  }
);

// ─── amendReport ─────────────────────────────────────────────────────────────

export const amendReport = onCall(
  { enforceAppCheck: false, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { reportId, changes } = request.data;
    if (!reportId || typeof reportId !== 'string') {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }
    if (!changes || typeof changes !== 'object') {
      throw new HttpsError('invalid-argument', 'changes object is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Fetch original report
    const originalReportSnap = await db.collection('reports').doc(reportId).get();
    if (!originalReportSnap.exists) {
      throw new HttpsError('not-found', 'Report not found');
    }
    const originalReport = originalReportSnap.data()! as Record<string, any>;

    // Ownership check
    if (originalReport.inspectorId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this report');
    }

    if (originalReport.status === 'revoked') {
      throw new HttpsError('failed-precondition', 'Cannot amend a revoked report');
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 90 * 24 * 60 * 60 * 1000
    );

    // Apply changes to sections
    let updatedSections = originalReport.sections || [];
    if (changes.sections) {
      updatedSections = changes.sections;
    }

    // Recompute finding counts from the updated sections
    const allFindings = updatedSections.flatMap((s: { findings: Array<{ severity?: string }> }) => s.findings || []);
    const findingCounts = {
      critical: allFindings.filter((f: { severity?: string }) => f.severity === 'critical').length,
      major: allFindings.filter((f: { severity?: string }) => f.severity === 'major').length,
      minor: allFindings.filter((f: { severity?: string }) => f.severity === 'minor').length,
      informational: allFindings.filter((f: { severity?: string }) => f.severity === 'informational').length,
    };

    // Create new report document with incremented version
    const newReportRef = db.collection('reports').doc();
    const newReportId = newReportRef.id;

    const newReportDoc: Record<string, any> = {
      ...originalReport,
      version: (originalReport.version || 1) + 1,
      parentReportId: reportId,
      status: 'active',
      sections: updatedSections,
      findingCounts,
      totalPhotos: allFindings.reduce(
        (sum: number, f: { photos?: unknown[] }) => sum + (Array.isArray(f.photos) ? f.photos.length : 0),
        0
      ),
      executiveSummary: changes.executiveSummary !== undefined ? changes.executiveSummary : originalReport.executiveSummary,
      pdfUrl: null,
      pdfGeneratedAt: null,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await newReportRef.set(newReportDoc);

    // Mark the original report as superseded
    await db.collection('reports').doc(reportId).update({
      status: 'superseded',
      updatedAt: now,
    });

    // Fetch existing recipients from old report's accessCodes to notify them
    const oldCodesSnap = await db
      .collection('reports')
      .doc(reportId)
      .collection('accessCodes')
      .where('revokedAt', '==', null)
      .get();

    // Build recipient list from old access codes
    const recipients: Recipient[] = oldCodesSnap.docs.map((d) => {
      const data = d.data();
      return {
        name: data.recipientName,
        email: data.recipientEmail,
        phone: null,
        type: data.recipientType as 'client' | 'agent' | 'other',
      };
    });

    // Deduplicate by email
    const seen = new Set<string>();
    const uniqueRecipients = recipients.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });

    // Generate new access codes for the amended report
    const newAccessCodes = await createAccessCodesForRecipients(
      db,
      newReportId,
      uniqueRecipients,
      expiresAt
    );

    // Enqueue amendment notifications
    const notificationReportData = {
      propertyAddress: `${newReportDoc.property.address}, ${newReportDoc.property.city}, ${newReportDoc.property.state}`,
      inspectionDate: newReportDoc.publishedAt.toDate().toISOString(),
      inspectorName: newReportDoc.inspectorName,
      inspectorLicense: newReportDoc.inspectorLicense,
      firmName: newReportDoc.firmName,
      brandingLogoUrl: (newReportDoc.branding as Record<string, unknown>)?.logoUrl || null,
      brandingPrimaryColor: ((newReportDoc.branding as Record<string, unknown>)?.primaryColor as string) || '#0D9488',
      findingSummary: findingCounts,
    };

    await enqueueNotifications(db, newReportId, newAccessCodes, notificationReportData, 'report_amended');

    return { reportId: newReportId, version: newReportDoc.version, accessCodes: newAccessCodes };
  }
);

// ─── revokeReport ─────────────────────────────────────────────────────────────

export const revokeReport = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { reportId } = request.data;
    if (!reportId || typeof reportId !== 'string') {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const reportSnap = await db.collection('reports').doc(reportId).get();
    if (!reportSnap.exists) {
      throw new HttpsError('not-found', 'Report not found');
    }
    const report = reportSnap.data()!;

    if (report.inspectorId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this report');
    }

    if (report.status === 'revoked') {
      throw new HttpsError('failed-precondition', 'Report is already revoked');
    }

    const now = admin.firestore.Timestamp.now();

    // Revoke all active access codes for this report
    const codesSnap = await db
      .collection('reports')
      .doc(reportId)
      .collection('accessCodes')
      .where('revokedAt', '==', null)
      .get();

    const batch = db.batch();

    for (const codeDoc of codesSnap.docs) {
      batch.update(codeDoc.ref, {
        revokedAt: now,
      });
    }

    // Set report status to revoked
    batch.update(db.collection('reports').doc(reportId), {
      status: 'revoked',
      updatedAt: now,
    });

    await batch.commit();

    return { success: true, revokedCodes: codesSnap.docs.length };
  }
);
