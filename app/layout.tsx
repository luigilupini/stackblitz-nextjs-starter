import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.js Interview',
  description: 'Next.js / React interview playground using PokéAPI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-base-200 text-base-content">
        <main className="container mx-auto max-w-6xl space-y-8 p-6">{children}</main>
      </body>
    </html>
  );
}
