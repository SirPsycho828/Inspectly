import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inspectly - Inspection Report',
  description: 'View your home inspection report',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
