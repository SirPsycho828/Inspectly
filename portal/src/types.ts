export interface PropertyInfo {
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  yearBuilt: number | null;
  squareFootage: number | null;
}

export interface Branding {
  logoUrl: string | null;
  primaryColor: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string | null;
  reportFooterText: string;
}

export interface FindingCounts {
  critical: number;
  major: number;
  minor: number;
  informational: number;
}

export interface ReportFinding {
  component: string;
  condition: string;
  severity: 'critical' | 'major' | 'minor' | 'informational';
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
  property: PropertyInfo;
  inspectorName: string;
  inspectorLicense?: string;
  firmName: string | null;
  branding: Branding;
  executiveSummary: string;
  sections: ReportSection[];
  findingCounts: FindingCounts;
  totalPhotos: number;
  pdfUrl: string | null;
  publishedAt: string;
  version: number;
}
