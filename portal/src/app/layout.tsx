import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inspectly - Professional Home Inspection Reports',
  description:
    'Inspectly helps home inspectors create detailed, professional inspection reports with AI-powered narratives, photo documentation, and instant client delivery.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Inspectly - Professional Home Inspection Reports',
    description:
      'AI-powered inspection reports with photo documentation and instant client delivery. Built for professional home inspectors.',
    type: 'website',
  },
  other: {
    'theme-color': '#3B2F27',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
