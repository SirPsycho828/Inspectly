// Inspectly Cloud Functions
// API endpoints from docs/planning/03_API_Endpoints.md

import * as admin from 'firebase-admin';

admin.initializeApp();

// ─── Firestore Triggers ─────────────────────────────────────
export { onUserDocWrite } from './triggers/onUserDocWrite';
// TODO: Re-enable after Firebase Storage is initialized via Console
// export { onPhotoUpload } from './triggers/onPhotoUpload';

// ─── Callable Functions: User & Firm Management ─────────────
export { redeemFirmInvite } from './callable/firm';
export { createFirmInvite } from './callable/firm';
export { removeFirmMember } from './callable/firm';
export { transferFirmAdmin } from './callable/firm';
export { suspendFirmMember } from './callable/firm';
export { deleteAccount } from './callable/user';

// ─── Callable Functions: AI Narrative Generation ─────────────
export { generateNarrative } from './callable/ai';
export { generateExecutiveSummary } from './callable/ai';

// ─── Callable Functions: Report Publishing ───────────────────
export { publishReport } from './callable/report';
export { amendReport } from './callable/report';
export { revokeReport } from './callable/report';

// ─── Callable Functions: Access Code Management ──────────────
export { revokeAccessCode } from './callable/accessCode';
export { regenerateAccessCode } from './callable/accessCode';
export { addReportRecipient } from './callable/accessCode';
export { resendNotification } from './callable/accessCode';

// ─── HTTP Functions: Report Portal ───────────────────────────
export { portalVerify } from './http/portal';
export { portalGetReport } from './http/portal';
export { portalGetPdf } from './http/portal';

// ─── Scheduled Functions ─────────────────────────────────────
export { cleanupExpiredInvites } from './scheduled/cleanup';
export { cleanupExpiredAccessCodes } from './scheduled/cleanup';
export { cleanupDeletedAccounts } from './scheduled/cleanup';
