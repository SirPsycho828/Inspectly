// Syncs user role and firmId to Firebase Auth custom claims
// Triggered on every write to the users collection

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

export const onUserDocWrite = onDocumentWritten('users/{userId}', async (event) => {
  const userId = event.params.userId;
  const after = event.data?.after?.data();

  if (!after) {
    // Document deleted — skip
    return;
  }

  const { role, firmId } = after;

  // Set custom claims
  await admin.auth().setCustomUserClaims(userId, {
    role: role || 'inspector',
    firmId: firmId || null,
  });
});
