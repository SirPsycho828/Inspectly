// Report portal HTTP endpoints
// Based on docs/planning/13_Report_Delivery_Portal.md and 03_API_Endpoints.md
//
// POST /portal/verify        — validate access code, return portal session JWT
// GET  /portal/report/:id    — return report data (requires portal session JWT)
// GET  /portal/report/:id/pdf — return signed PDF download URL (requires JWT)

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// ─── JWT helpers ──────────────────────────────────────────────────────────────
//
// We use a simple HMAC-SHA256 signed token rather than a full JWT library.
// The token is a base64url-encoded JSON payload + a signature, separated by '.'.
// Format:  <base64url(payload)>.<base64url(HMAC-SHA256(base64url(payload), secret))>
//
// This avoids adding a new dependency (jsonwebtoken) given that firebase-admin
// is already available and the token needs are straightforward.

interface PortalTokenPayload {
  reportId: string;
  recipientType: string;
  recipientEmail: string;
  exp: number; // Unix seconds
  iat: number;
}

function getSigningSecret(): string {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret) throw new Error('PORTAL_JWT_SECRET environment variable is not set');
  return secret;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signPortalToken(payload: PortalTokenPayload): string {
  const secret = getSigningSecret();
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}

function verifyPortalToken(token: string): PortalTokenPayload {
  const secret = getSigningSecret();
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid token format');

  const [payloadB64, sigB64] = parts;
  const expectedSig = base64url(crypto.createHmac('sha256', secret).update(payloadB64).digest());

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) {
    throw new Error('Invalid token signature');
  }

  const payload: PortalTokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired');
  }

  return payload;
}

// ─── In-memory rate limit store ───────────────────────────────────────────────
//
// For production, this should be backed by Firestore or Redis.
// In Cloud Functions v2 (long-lived instances), in-memory maps provide
// reasonable rate limiting as a first layer. The authoritative check
// is the `failedAttempts` / `lockedUntil` fields on the accessCode document.

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const ipRateLimitMap = new Map<string, RateLimitBucket>();

function checkIpRateLimit(ip: string): void {
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxAttempts = 20;
  const now = Date.now();

  const bucket = ipRateLimitMap.get(ip);
  if (!bucket || now - bucket.windowStart > windowMs) {
    ipRateLimitMap.set(ip, { count: 1, windowStart: now });
    return;
  }

  bucket.count++;
  if (bucket.count > maxAttempts) {
    throw new IpRateLimitError('Too many attempts from this IP address. Try again later.');
  }
}

class IpRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpRateLimitError';
  }
}

// ─── CORS helper ─────────────────────────────────────────────────────────────

function setCorsHeaders(res: import('express').Response, origin?: string): void {
  // Allow the portal domain and localhost for development
  const allowedOrigins = [
    'https://report.inspectly.app',
    'http://localhost:3000',
    'http://localhost:5000',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://report.inspectly.app');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ─── portalVerify ─────────────────────────────────────────────────────────────
// POST /portal/verify
// Body: { reportId: string, code: string }
// Returns: { token, expiresAt, report: ReportSummary }

export const portalVerify = onRequest(
  { cors: false, secrets: ['PORTAL_JWT_SECRET'] },
  async (req, res) => {
    setCorsHeaders(res, req.headers.origin as string | undefined);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

    try {
      checkIpRateLimit(clientIp);
    } catch (e) {
      if (e instanceof IpRateLimitError) {
        res.status(429).json({ error: e.message });
        return;
      }
      throw e; // Re-throw unexpected errors
    }

    const { reportId, code } = req.body || {};

    if (!reportId || typeof reportId !== 'string') {
      res.status(400).json({ error: 'reportId is required' });
      return;
    }
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'code is required' });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    const db = admin.firestore();

    // Fetch the report (lightweight check first)
    const reportSnap = await db.collection('reports').doc(reportId).get();
    if (!reportSnap.exists) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const report = reportSnap.data()!;

    if (report.status === 'revoked') {
      res.status(403).json({ error: 'This report has been revoked' });
      return;
    }

    const now = admin.firestore.Timestamp.now();

    // Per-report attempt tracking in a lightweight subcollection document.
    // Each reportId gets one attempt-tracker doc keyed by a 15-minute bucket.
    // This lets us enforce the "5 failed attempts per 15-min window" rule even
    // when the submitted code doesn't match any access code document (brute force).
    const windowBucket = Math.floor(now.toMillis() / (15 * 60 * 1000));
    const attemptRef = db
      .collection('reports')
      .doc(reportId)
      .collection('_verifyAttempts')
      .doc(`${windowBucket}`);

    const attemptSnap = await attemptRef.get();
    const attemptCount: number = attemptSnap.exists ? (attemptSnap.data()!.count as number) : 0;
    const MAX_ATTEMPTS = 5;

    if (attemptCount >= MAX_ATTEMPTS) {
      const windowEndMs = (windowBucket + 1) * 15 * 60 * 1000;
      const retryAfterSeconds = Math.ceil((windowEndMs - now.toMillis()) / 1000);
      res.status(429).json({
        error: 'Too many attempts. Try again in 15 minutes.',
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    // Find matching access code for this report
    const codesSnap = await db
      .collection('reports')
      .doc(reportId)
      .collection('accessCodes')
      .where('code', '==', normalizedCode)
      .limit(1)
      .get();

    if (codesSnap.empty) {
      // Increment the per-report attempt counter on a wrong code
      await attemptRef.set(
        { count: admin.firestore.FieldValue.increment(1), updatedAt: now },
        { merge: true }
      );
      const remaining = MAX_ATTEMPTS - (attemptCount + 1);
      res.status(401).json({
        error: 'Invalid access code',
        remainingAttempts: Math.max(0, remaining),
      });
      return;
    }

    const codeDoc = codesSnap.docs[0];
    const codeData = codeDoc.data();

    // Check if code is revoked
    if (codeData.revokedAt) {
      res.status(403).json({ error: 'This code is no longer active. Contact your inspector.' });
      return;
    }

    // Check if code is expired
    if (codeData.expiresAt.toMillis() < now.toMillis()) {
      res.status(403).json({ error: 'This code has expired. Contact your inspector for a new code.' });
      return;
    }

    // Check per-code lockout stored on the access code document itself
    // (legacy field — kept for backwards compat with any direct writes)
    if (codeData.lockedUntil && codeData.lockedUntil.toMillis() > now.toMillis()) {
      const retryAfterSeconds = Math.ceil(
        (codeData.lockedUntil.toMillis() - now.toMillis()) / 1000
      );
      res.status(429).json({
        error: 'Too many attempts. Try again later.',
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    // Code matches and is valid — clear the attempt counter and record access
    await Promise.all([
      attemptRef.set({ count: 0, updatedAt: now }, { merge: true }),
      codeDoc.ref.update({
        failedAttempts: 0,
        lockedUntil: null,
        lastAccessedAt: now,
      }),
    ]);

    // If the report has been superseded, find the latest active version
    let latestReportId = reportId;
    if (report.status === 'superseded') {
      // Walk the version chain to find the current active report
      const latestSnap = await db
        .collection('reports')
        .where('inspectionId', '==', report.inspectionId)
        .where('status', '==', 'active')
        .orderBy('version', 'desc')
        .limit(1)
        .get();

      if (!latestSnap.empty) {
        latestReportId = latestSnap.docs[0].id;
      }
    }

    // Generate portal session token (24-hour expiry)
    const iatSeconds = Math.floor(Date.now() / 1000);
    const expSeconds = iatSeconds + 24 * 60 * 60;

    const token = signPortalToken({
      reportId: latestReportId,
      recipientType: codeData.recipientType,
      recipientEmail: codeData.recipientEmail,
      exp: expSeconds,
      iat: iatSeconds,
    });

    // Build a lightweight ReportSummary for the response
    const reportSummary = {
      reportId: latestReportId,
      propertyAddress: report.property
        ? `${report.property.address}, ${report.property.city}, ${report.property.state}`
        : '',
      inspectorName: report.inspectorName || 'Inspector',
      firmName: report.firmName || null,
      publishedAt: report.publishedAt?.toDate().toISOString() || null,
      findingCounts: report.findingCounts || {},
      version: report.version || 1,
    };

    res.status(200).json({
      token,
      expiresAt: new Date(expSeconds * 1000).toISOString(),
      report: reportSummary,
    });
  }
);

// ─── portalGetReport ──────────────────────────────────────────────────────────
// GET /portal/report/:reportId
// Headers: Authorization: Bearer <portal-session-token>

export const portalGetReport = onRequest(
  { cors: false, secrets: ['PORTAL_JWT_SECRET'] },
  async (req, res) => {
    setCorsHeaders(res, req.headers.origin as string | undefined);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Extract reportId from path: /portal/report/{reportId}
    const pathParts = req.path.split('/').filter(Boolean);
    // Path segments after the function name: ['report', '{reportId}'] or ['report', '{reportId}', 'pdf']
    const reportIdIndex = pathParts.indexOf('report') + 1;
    const reportId = pathParts[reportIdIndex];

    if (!reportId) {
      res.status(400).json({ error: 'reportId is required in the URL path' });
      return;
    }

    // Validate portal session token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    let tokenPayload: PortalTokenPayload;
    try {
      tokenPayload = verifyPortalToken(authHeader.slice(7));
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired session token' });
      return;
    }

    // Token must be scoped to this report
    if (tokenPayload.reportId !== reportId) {
      res.status(403).json({ error: 'Session token is not valid for this report' });
      return;
    }

    const db = admin.firestore();
    const reportSnap = await db.collection('reports').doc(reportId).get();

    if (!reportSnap.exists) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const report = reportSnap.data()!;

    if (report.status === 'revoked') {
      res.status(403).json({ error: 'This report has been revoked' });
      return;
    }

    // If this report has been superseded, note it for the client
    let amendmentBanner: { updatedAt: string; version: number; previousReportId: string } | null = null;
    if (report.status === 'superseded') {
      // The token should already point to the latest version; this is a safety check.
      amendmentBanner = {
        updatedAt: report.updatedAt?.toDate().toISOString() || '',
        version: report.version || 1,
        previousReportId: report.parentReportId || '',
      };
    }

    // Return full report data for portal rendering
    // Timestamps are serialized to ISO strings for JSON compatibility
    const responseData = {
      ...report,
      publishedAt: report.publishedAt?.toDate().toISOString() || null,
      pdfGeneratedAt: report.pdfGeneratedAt?.toDate().toISOString() || null,
      createdAt: report.createdAt?.toDate().toISOString() || null,
      updatedAt: report.updatedAt?.toDate().toISOString() || null,
      amendmentBanner,
    };

    res.status(200).json(responseData);
  }
);

// ─── portalGetPdf ─────────────────────────────────────────────────────────────
// GET /portal/report/:reportId/pdf
// Headers: Authorization: Bearer <portal-session-token>

export const portalGetPdf = onRequest(
  { cors: false, secrets: ['PORTAL_JWT_SECRET'] },
  async (req, res) => {
    setCorsHeaders(res, req.headers.origin as string | undefined);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Extract reportId from path: /portal/report/{reportId}/pdf
    const pathParts = req.path.split('/').filter(Boolean);
    const reportIdIndex = pathParts.indexOf('report') + 1;
    const reportId = pathParts[reportIdIndex];

    if (!reportId) {
      res.status(400).json({ error: 'reportId is required in the URL path' });
      return;
    }

    // Validate portal session token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    let tokenPayload: PortalTokenPayload;
    try {
      tokenPayload = verifyPortalToken(authHeader.slice(7));
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired session token' });
      return;
    }

    if (tokenPayload.reportId !== reportId) {
      res.status(403).json({ error: 'Session token is not valid for this report' });
      return;
    }

    const db = admin.firestore();
    const reportSnap = await db.collection('reports').doc(reportId).get();

    if (!reportSnap.exists) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const report = reportSnap.data()!;

    if (report.status === 'revoked') {
      res.status(403).json({ error: 'This report has been revoked' });
      return;
    }

    // PDF not yet generated — generation is async after publish
    if (!report.pdfUrl) {
      res.status(202).json({
        status: 'generating',
        retryAfter: 10,
        message: 'PDF generation is in progress. Please try again shortly.',
      });
      return;
    }

    // Generate a signed download URL for the PDF (1-hour expiry)
    // The pdfUrl stored on the report is the Cloud Storage gs:// path or file path.
    try {
      const bucket = admin.storage().bucket();

      // Normalize the storage path — strip gs://bucket-name/ prefix if present
      let filePath = report.pdfUrl as string;
      const gsMatch = filePath.match(/^gs:\/\/[^/]+\/(.+)$/);
      if (gsMatch) {
        filePath = gsMatch[1];
      }

      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (!exists) {
        res.status(500).json({ error: 'PDF file not found in storage' });
        return;
      }

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      res.status(200).json({
        downloadUrl: signedUrl,
        expiresIn: 3600,
      });
    } catch (err) {
      console.error('Error generating signed URL for PDF:', err);
      res.status(500).json({ error: 'Failed to generate PDF download URL' });
    }
  }
);
