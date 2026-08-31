import type { Metadata, Viewport } from 'next';
import { Fraunces, Alex_Brush, Inter } from 'next/font/google';
import { siteConfig } from '@/lib/config';
import { defaultMetaDescription } from '@/lib/seo';
import './globals.css';

// Elegant editorial serif for headings — used site-wide, never for body copy.
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// Matches the flowing script used on the Gordon's Corner wordmark/logo.
const script = Alex_Brush({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${siteConfig.propertyName} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.propertyName}`,
  },
  description: defaultMetaDescription,
  keywords: [
    'self-catering accommodation',
    'short-stay rental',
    'holiday accommodation',
    siteConfig.address,
    siteConfig.addressLine2,
    siteConfig.propertyName,
  ],
  authors: [{ name: siteConfig.propertyName }],
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: siteConfig.siteUrl,
    siteName: siteConfig.propertyName,
    title: `${siteConfig.propertyName} — ${siteConfig.tagline}`,
    description: defaultMetaDescription,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: siteConfig.propertyName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.propertyName} — ${siteConfig.tagline}`,
    description: defaultMetaDescription,
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#B4852D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${script.variable} ${body.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
