// Firestore collection path constants

export const COLLECTIONS = {
  USERS: 'users',
  FIRMS: 'firms',
  FIRM_INVITES: (firmId: string) => `firms/${firmId}/invites`,
  INSPECTIONS: 'inspections',
  FINDINGS: (inspectionId: string) => `inspections/${inspectionId}/findings`,
  CHECKLIST_PROGRESS: (inspectionId: string) => `inspections/${inspectionId}/checklistProgress`,
  REPORTS: 'reports',
  ACCESS_CODES: (reportId: string) => `reports/${reportId}/accessCodes`,
  CHECKLIST_TEMPLATES: 'checklistTemplates',
  COMMENT_LIBRARY: 'commentLibrary',
  NOTIFICATION_LOG: 'notificationLog',
} as const;

// Storage path constants
export const STORAGE_PATHS = {
  INSPECTION_PHOTOS: (inspectionId: string) => `inspections/${inspectionId}/photos`,
  INSPECTION_PHOTO: (inspectionId: string, photoId: string) =>
    `inspections/${inspectionId}/photos/${photoId}.jpg`,
  INSPECTION_THUMB: (inspectionId: string, photoId: string) =>
    `inspections/${inspectionId}/photos/${photoId}_thumb.jpg`,
  REPORT_PHOTOS: (reportId: string) => `reports/${reportId}/photos`,
  REPORT_BAKED_PHOTO: (reportId: string, photoId: string) =>
    `reports/${reportId}/photos/${photoId}_baked.jpg`,
  BRANDING_LOGO: (userId: string) => `branding/${userId}/logo`,
  FIRM_BRANDING_LOGO: (firmId: string) => `branding/firms/${firmId}/logo`,
} as const;
