import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'DocuGen — Document Generation & Automation Platform',
  description: 'Generate thousands of personalized documents in minutes. Upload PDF templates, map fields, and export print-ready PDFs from CSV data.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans bg-canvas text-text">{children}</body>
    </html>
  );
}
