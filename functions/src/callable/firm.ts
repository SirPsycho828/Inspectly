// Firm management callable functions
// Based on docs/planning/15_Firm_Management.md and 01_Auth_Roles.md

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0/O/1/I/L
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function requireFirmAdmin(uid: string, firmId: string): Promise<void> {
  const db = admin.firestore();
  const firmSnap = await db.collection('firms').doc(firmId).get();
  if (!firmSnap.exists) {
    throw new HttpsError('not-found', 'Firm not found');
  }
  const firm = firmSnap.data()!;
  if (firm.adminId !== uid) {
    throw new HttpsError('permission-denied', 'Only the firm admin can perform this action');
  }
}

// ─── redeemFirmInvite ─────────────────────────────────────────────────────────

export const redeemFirmInvite = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { code } = request.data;
    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', 'Invite code is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Check if the user is already in a firm
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    const user = userSnap.data()!;
    if (user.firmId) {
      // Fetch firm name for the error message
      const currentFirmSnap = await db.collection('firms').doc(user.firmId).get();
      const currentFirmName = currentFirmSnap.exists ? currentFirmSnap.data()!.name : 'your current firm';
      throw new HttpsError(
        'failed-precondition',
        `You're already a member of ${currentFirmName}. Leave your current firm first to join another.`
      );
    }

    // Search all firms for a matching invite code
    // We query the invites subcollection using a collectionGroup query
    const now = admin.firestore.Timestamp.now();
    const invitesQuery = await db
      .collectionGroup('invites')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (invitesQuery.empty) {
      throw new HttpsError('not-found', 'Invalid invite code. Check with your firm admin.');
    }

    const inviteDoc = invitesQuery.docs[0];
    const invite = inviteDoc.data();
    const inviteRef = inviteDoc.ref;

    // Validate invite state
    if (invite.usedBy) {
      throw new HttpsError('failed-precondition', 'This invite has already been used.');
    }
    if (invite.expiresAt.toMillis() < now.toMillis()) {
      throw new HttpsError('failed-precondition', 'This invite has expired. Ask your admin for a new code.');
    }

    // Extract firmId from the invite's parent path: firms/{firmId}/invites/{inviteId}
    const firmId = inviteRef.parent.parent!.id;

    const firmSnap = await db.collection('firms').doc(firmId).get();
    if (!firmSnap.exists) {
      throw new HttpsError('not-found', 'Associated firm not found');
    }

    // Run everything in a transaction to prevent race conditions
    await db.runTransaction(async (tx) => {
      // Re-read invite inside transaction for freshness
      const freshInvite = await tx.get(inviteRef);
      if (!freshInvite.exists || freshInvite.data()!.usedBy) {
        throw new HttpsError('failed-precondition', 'This invite has already been used.');
      }

      const firmRef = db.collection('firms').doc(firmId);
      const userRef = db.collection('users').doc(uid);

      // Mark invite as used
      tx.update(inviteRef, {
        usedBy: uid,
        usedAt: now,
      });

      // Add user to firm memberIds, increment memberCount
      tx.update(firmRef, {
        memberIds: admin.firestore.FieldValue.arrayUnion(uid),
        memberCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });

      // Set firmId on user document
      tx.update(userRef, {
        firmId,
        updatedAt: now,
      });
    });

    return { success: true, firmId };
  }
);

// ─── createFirmInvite ─────────────────────────────────────────────────────────

export const createFirmInvite = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Retrieve user to get firmId
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    const user = userSnap.data()!;

    if (!user.firmId) {
      throw new HttpsError('failed-precondition', 'You are not a member of any firm');
    }

    await requireFirmAdmin(uid, user.firmId);

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 7 * 24 * 60 * 60 * 1000 // 7 days
    );

    // Generate a unique code (retry on collision — extremely unlikely)
    let code: string;
    let attempts = 0;
    const invitesRef = db.collection('firms').doc(user.firmId).collection('invites');

    do {
      code = generateInviteCode();
      const existing = await invitesRef.where('code', '==', code).where('usedBy', '==', null).get();
      if (existing.empty) break;
      attempts++;
    } while (attempts < 5);

    const inviteData = {
      code,
      expiresAt,
      usedBy: null,
      usedAt: null,
      createdAt: now,
      createdBy: uid,
    };

    const inviteRef = await invitesRef.add(inviteData);

    return {
      inviteId: inviteRef.id,
      code,
      expiresAt: expiresAt.toDate().toISOString(),
    };
  }
);

// ─── removeFirmMember ─────────────────────────────────────────────────────────

export const removeFirmMember = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { memberId } = request.data;
    if (!memberId || typeof memberId !== 'string') {
      throw new HttpsError('invalid-argument', 'memberId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    const user = userSnap.data()!;

    if (!user.firmId) {
      throw new HttpsError('failed-precondition', 'You are not a member of any firm');
    }

    await requireFirmAdmin(uid, user.firmId);

    if (memberId === uid) {
      throw new HttpsError(
        'failed-precondition',
        'Firm admin cannot remove themselves. Transfer admin role first.'
      );
    }

    // Verify the target member is in this firm
    const memberSnap = await db.collection('users').doc(memberId).get();
    if (!memberSnap.exists) {
      throw new HttpsError('not-found', 'Member not found');
    }
    const member = memberSnap.data()!;
    if (member.firmId !== user.firmId) {
      throw new HttpsError('failed-precondition', 'This user is not a member of your firm');
    }

    const now = admin.firestore.Timestamp.now();

    await db.runTransaction(async (tx) => {
      const firmRef = db.collection('firms').doc(user.firmId);
      const memberRef = db.collection('users').doc(memberId);

      // Remove from firm memberIds
      tx.update(firmRef, {
        memberIds: admin.firestore.FieldValue.arrayRemove(memberId),
        memberCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: now,
      });

      // Clear user's firmId
      tx.update(memberRef, {
        firmId: null,
        updatedAt: now,
      });
    });

    return { success: true };
  }
);

// ─── transferFirmAdmin ────────────────────────────────────────────────────────

export const transferFirmAdmin = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { newAdminId } = request.data;
    if (!newAdminId || typeof newAdminId !== 'string') {
      throw new HttpsError('invalid-argument', 'newAdminId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    const user = userSnap.data()!;

    if (!user.firmId) {
      throw new HttpsError('failed-precondition', 'You are not a member of any firm');
    }

    await requireFirmAdmin(uid, user.firmId);

    if (newAdminId === uid) {
      throw new HttpsError('invalid-argument', 'You are already the firm admin');
    }

    // Verify the new admin is an active member of this firm
    const newAdminSnap = await db.collection('users').doc(newAdminId).get();
    if (!newAdminSnap.exists) {
      throw new HttpsError('not-found', 'Target user not found');
    }
    const newAdmin = newAdminSnap.data()!;

    if (newAdmin.firmId !== user.firmId) {
      throw new HttpsError('failed-precondition', 'Target user is not a member of your firm');
    }
    if (newAdmin.status === 'suspended') {
      throw new HttpsError('failed-precondition', 'Cannot transfer admin to a suspended member');
    }

    const now = admin.firestore.Timestamp.now();

    await db.runTransaction(async (tx) => {
      const firmRef = db.collection('firms').doc(user.firmId);
      const currentAdminRef = db.collection('users').doc(uid);
      const newAdminRef = db.collection('users').doc(newAdminId);

      // Update firm's adminId
      tx.update(firmRef, {
        adminId: newAdminId,
        updatedAt: now,
      });

      // Demote current admin to inspector
      tx.update(currentAdminRef, {
        role: 'inspector',
        updatedAt: now,
      });

      // Promote new admin
      tx.update(newAdminRef, {
        role: 'firm_admin',
        updatedAt: now,
      });
    });

    // Custom claims will be synced by the onUserDocWrite trigger

    return { success: true };
  }
);

// ─── suspendFirmMember ────────────────────────────────────────────────────────

export const suspendFirmMember = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { memberId, suspend } = request.data;
    if (!memberId || typeof memberId !== 'string') {
      throw new HttpsError('invalid-argument', 'memberId is required');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    const user = userSnap.data()!;

    if (!user.firmId) {
      throw new HttpsError('failed-precondition', 'You are not a member of any firm');
    }

    await requireFirmAdmin(uid, user.firmId);

    if (memberId === uid) {
      throw new HttpsError('failed-precondition', 'Firm admin cannot suspend themselves');
    }

    // Verify the target is in this firm
    const memberSnap = await db.collection('users').doc(memberId).get();
    if (!memberSnap.exists) {
      throw new HttpsError('not-found', 'Member not found');
    }
    const member = memberSnap.data()!;
    if (member.firmId !== user.firmId) {
      throw new HttpsError('failed-precondition', 'This user is not a member of your firm');
    }

    // suspend=true suspends, suspend=false (or omitted) reinstates
    const newStatus = suspend === false ? 'active' : 'suspended';
    const now = admin.firestore.Timestamp.now();

    await db.collection('users').doc(memberId).update({
      status: newStatus,
      updatedAt: now,
    });

    // If suspending, revoke all Firebase Auth refresh tokens so they are
    // immediately signed out across all devices
    if (newStatus === 'suspended') {
      await admin.auth().revokeRefreshTokens(memberId);
    }

    return { success: true, status: newStatus };
  }
);
