// Scheduled cleanup functions
// Based on docs/planning/03_API_Endpoints.md — Background Functions section

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// ─── cleanupExpiredInvites ────────────────────────────────────────────────────
// Daily: delete firm invite documents that have passed their expiry date
// and have not been used. Unused invites accumulate over time as admins
// generate codes that inspectors never redeem.

export const cleanupExpiredInvites = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/New_York',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Query all invite subcollections via collectionGroup
    const expiredInvitesSnap = await db
      .collectionGroup('invites')
      .where('expiresAt', '<', now)
      .where('usedBy', '==', null)
      .get();

    if (expiredInvitesSnap.empty) {
      console.log('[cleanupExpiredInvites] No expired unused invites found');
      return;
    }

    // Firestore batch writes are limited to 500 operations
    const BATCH_SIZE = 400;
    const docs = expiredInvitesSnap.docs;
    let deletedCount = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);
      for (const doc of chunk) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      deletedCount += chunk.length;
    }

    console.log(`[cleanupExpiredInvites] Deleted ${deletedCount} expired invite(s)`);
  }
);

// ─── cleanupExpiredAccessCodes ────────────────────────────────────────────────
// Daily: mark access codes as expired when their expiresAt timestamp has passed
// and they have not already been revoked. We update rather than delete because
// the record serves as audit history (who had access to a report and when).

export const cleanupExpiredAccessCodes = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/New_York',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Find all access codes that are past expiry and not yet revoked
    const expiredCodesSnap = await db
      .collectionGroup('accessCodes')
      .where('expiresAt', '<', now)
      .where('revokedAt', '==', null)
      .get();

    if (expiredCodesSnap.empty) {
      console.log('[cleanupExpiredAccessCodes] No expired unrevoked access codes found');
      return;
    }

    const BATCH_SIZE = 400;
    const docs = expiredCodesSnap.docs;
    let updatedCount = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);
      for (const doc of chunk) {
        // Mark the code as expired via revokedAt so that the portal rejects it
        // with the "code has expired" message rather than "code not found"
        batch.update(doc.ref, {
          revokedAt: now,
          expiredAt: now, // extra field to distinguish expiry from manual revoke
        });
      }
      await batch.commit();
      updatedCount += chunk.length;
    }

    console.log(`[cleanupExpiredAccessCodes] Marked ${updatedCount} access code(s) as expired`);
  }
);

// ─── cleanupDeletedAccounts ───────────────────────────────────────────────────
// Weekly: hard-delete user data for accounts that were soft-deleted more than
// 30 days ago. This finalizes the data deletion cycle started by deleteAccount.
//
// Per the PRD, published reports remain accessible — they are legal documents.
// We only hard-delete the user document itself and the Firebase Auth account.
// The user document was anonymized at soft-delete time (deleteAccount function).

export const cleanupDeletedAccounts = onSchedule(
  {
    schedule: 'every sunday 02:00',
    timeZone: 'America/New_York',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 30 * 24 * 60 * 60 * 1000
    );

    // Find user documents that were soft-deleted at least 30 days ago
    const deletedUsersSnap = await db
      .collection('users')
      .where('status', '==', 'deleted')
      .where('deletedAt', '<=', thirtyDaysAgo)
      .get();

    if (deletedUsersSnap.empty) {
      console.log('[cleanupDeletedAccounts] No accounts ready for hard deletion');
      return;
    }

    let hardDeletedCount = 0;
    const errors: string[] = [];

    for (const userDoc of deletedUsersSnap.docs) {
      const uid = userDoc.id;
      try {
        // 1. Delete the Firebase Auth account
        //    This also invalidates any remaining tokens for this account.
        try {
          await admin.auth().deleteUser(uid);
        } catch (authErr: unknown) {
          // If the auth account was already deleted, continue
          const firebaseError = authErr as { code?: string };
          if (firebaseError?.code !== 'auth/user-not-found') {
            throw authErr;
          }
        }

        // 2. Delete any personal subcollections the user owns
        //    (no subcollections exist on users in v1, but this is a hook for future data)

        // 3. Hard-delete the Firestore user document
        await userDoc.ref.delete();

        hardDeletedCount++;
        console.log(`[cleanupDeletedAccounts] Hard-deleted user ${uid}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`uid=${uid}: ${message}`);
        console.error(`[cleanupDeletedAccounts] Failed to hard-delete user ${uid}:`, err);
      }
    }

    console.log(
      `[cleanupDeletedAccounts] Hard-deleted ${hardDeletedCount} account(s). Errors: ${errors.length}`
    );

    if (errors.length > 0) {
      // Log all errors for operational visibility without failing the scheduled run
      console.error('[cleanupDeletedAccounts] Errors encountered:', errors);
    }
  }
);
