// User account management callable functions
// Based on docs/planning/01_Auth_Roles.md — Account Deletion section

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// ─── deleteAccount ────────────────────────────────────────────────────────────

export const deleteAccount = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    const user = userSnap.data()!;

    // Firm admin must transfer admin role before deleting their account
    if (user.role === 'firm_admin' && user.firmId) {
      const firmSnap = await db.collection('firms').doc(user.firmId).get();
      if (firmSnap.exists && firmSnap.data()!.adminId === uid) {
        throw new HttpsError(
          'failed-precondition',
          'Firm admin must transfer admin role to another member before deleting their account'
        );
      }
    }

    const now = admin.firestore.Timestamp.now();

    // 1. Soft-delete user document
    await db.collection('users').doc(uid).update({
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
      // Anonymize personal fields but keep the document for operational integrity
      displayName: 'Deleted User',
      email: `deleted_${uid}@deleted.invalid`,
      phone: null,
      profilePhotoUrl: null,
    });

    // 2. If the user was in a firm, remove them from the firm's memberIds
    if (user.firmId) {
      const firmRef = db.collection('firms').doc(user.firmId);
      await firmRef.update({
        memberIds: admin.firestore.FieldValue.arrayRemove(uid),
        memberCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: now,
      });
    }

    // 3. Anonymize inspectorName on all published reports by this inspector
    //    Published reports are legal documents and must remain accessible to
    //    clients/agents — we replace the inspector name with "Inspector".
    const reportsQuery = await db
      .collection('reports')
      .where('inspectorId', '==', uid)
      .where('status', 'in', ['active', 'superseded'])
      .get();

    if (!reportsQuery.empty) {
      const batch = db.batch();
      for (const reportDoc of reportsQuery.docs) {
        batch.update(reportDoc.ref, {
          inspectorName: 'Inspector',
          updatedAt: now,
        });
      }
      await batch.commit();
    }

    // 4. Revoke all Firebase Auth refresh tokens — signs the user out of all devices
    await admin.auth().revokeRefreshTokens(uid);

    return { success: true };
  }
);
