// Core Inspectly type definitions
// Derived from docs/planning/02_Database_Schema.md

import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

type Timestamp = FirebaseFirestoreTypes.Timestamp;

// ─── Auth & Users ────────────────────────────────────────────────

export type UserRole = 'inspector' | 'firm_admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type AuthState = 'unauthenticated' | 'unverified' | 'needs_onboarding' | 'authenticated' | 'suspended';

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  firmId: string | null;
  licenseNumber: string;
  profilePhotoUrl: string | null;
  onboardingComplete: boolean;
  status: UserStatus;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Firms ───────────────────────────────────────────────────────

export type FirmStatus = 'active' | 'inactive';

export interface Branding {
  logoUrl: string | null;
  primaryColor: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string | null;
  reportFooterText: string;
}

export interface Firm {
  id: string;
  name: string;
  adminId: string;
  memberIds: string[];
  memberCount: number;
  branding: Branding;
  status: FirmStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirmInvite {
  id: string;
  code: string;
  expiresAt: Timestamp;
  usedBy: string | null;
  usedAt: Timestamp | null;
  createdAt: Timestamp;
}

// ─── Inspections ─────────────────────────────────────────────────

export type InspectionStatus = 'draft' | 'in_progress' | 'review' | 'published';
export type PropertyType = 'single_family' | 'condo' | 'townhouse' | 'multi_family';

export interface PropertyInfo {
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  yearBuilt: number | null;
  squareFootage: number | null;
}

export interface Recipient {
  name: string;
  email: string;
  phone: string | null;
  type: 'agent' | 'attorney' | 'other';
}

export interface ProgressSummary {
  total: number;
  completed: number;
  skipped: number;
}

export interface FindingCounts {
  critical: number;
  major: number;
  minor: number;
  informational: number;
}

export interface Inspection {
  id: string;
  inspectorId: string;
  firmId: string | null;
  status: InspectionStatus;
  property: PropertyInfo;
  clientEmail: string;
  clientName: string;
  clientPhone: string | null;
  agentEmail: string | null;
  agentName: string | null;
  additionalRecipients: Recipient[];
  templateId: string;
  checklistProgress: ProgressSummary;
  findingCounts: FindingCounts;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  publishedAt: Timestamp | null;
  reportId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Findings ────────────────────────────────────────────────────

export type Severity = 'critical' | 'major' | 'minor' | 'informational';
export type NarrativeSource = 'ai' | 'manual' | 'ai_edited';
export type AnnotationType = 'arrow' | 'circle' | 'rectangle' | 'text';

export interface Annotation {
  type: AnnotationType;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  endX: number | null;
  endY: number | null;
  radius: number | null;
  color: string;
  text: string | null;
}

export interface FindingPhoto {
  storageUrl: string;
  thumbnailUrl: string;
  caption: string;
  annotations: Annotation[];
  takenAt: Timestamp;
  order: number;
}

export interface Finding {
  id: string;
  checklistItemId: string | null;
  sectionId: string | null;
  component: string;
  condition: string;
  severity: Severity;
  narrative: string;
  narrativeSource: NarrativeSource;
  recommendation: string;
  photos: FindingPhoto[];
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Checklist Progress ──────────────────────────────────────────

export type ChecklistItemStatus = 'pending' | 'inspected' | 'skipped' | 'not_applicable';

export interface ChecklistProgressItem {
  id: string;
  sectionId: string;
  itemLabel: string;
  status: ChecklistItemStatus;
  findingCount: number;
  inspectedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Reports ─────────────────────────────────────────────────────

export type ReportStatus = 'active' | 'superseded' | 'revoked';
export type RecipientType = 'client' | 'agent' | 'other';

export interface ReportFinding {
  component: string;
  condition: string;
  severity: Severity;
  narrative: string;
  recommendation: string;
  photos: { url: string; caption: string }[];
}

export interface ReportSection {
  sectionId: string;
  title: string;
  findings: ReportFinding[];
}

export interface Report {
  id: string;
  inspectionId: string;
  inspectorId: string;
  firmId: string | null;
  version: number;
  parentReportId: string | null;
  status: ReportStatus;
  property: PropertyInfo;
  inspectorName: string;
  firmName: string | null;
  branding: Branding;
  executiveSummary: string;
  sections: ReportSection[];
  findingCounts: FindingCounts;
  totalPhotos: number;
  pdfUrl: string | null;
  pdfGeneratedAt: Timestamp | null;
  publishedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AccessCode {
  id: string;
  code: string;
  recipientEmail: string;
  recipientName: string;
  recipientType: RecipientType;
  failedAttempts: number;
  lockedUntil: Timestamp | null;
  lastAccessedAt: Timestamp | null;
  revokedAt: Timestamp | null;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Checklist Templates ─────────────────────────────────────────

export interface TemplateItem {
  id: string;
  label: string;
  component: string;
  description: string | null;
}

export interface TemplateSection {
  id: string;
  title: string;
  items: TemplateItem[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  ownerId: string; // 'system' for built-in
  firmId: string | null;
  sections: TemplateSection[];
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Comment Library ─────────────────────────────────────────────

export interface CommentLibraryEntry {
  id: string;
  ownerId: string;
  firmId: string | null;
  component: string;
  condition: string;
  severity: Severity;
  narrative: string;
  useCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Notification Log ────────────────────────────────────────────

export type NotificationChannel = 'email' | 'sms';
export type NotificationStatus = 'sent' | 'failed' | 'pending';
export type NotificationTemplate = 'report_published' | 'report_amended' | 'access_code_resend' | 'access_code_new';

export interface NotificationLog {
  id: string;
  reportId: string;
  recipientEmail: string;
  channel: NotificationChannel;
  template: NotificationTemplate;
  status: NotificationStatus;
  attempts: number;
  lastAttemptAt: Timestamp;
  providerMessageId: string | null;
  error: string | null;
}
