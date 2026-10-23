import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicLens AI — Civic Issue Management Dashboard',
  description:
    'AI-powered civic operations platform that converts unstructured community reports into actionable, structured intelligence for municipal departments.',
  keywords: ['civic issues', 'municipal management', 'AI', 'potholes', 'community reports'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
