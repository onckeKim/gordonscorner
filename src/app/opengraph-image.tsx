import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

export const alt = `${siteConfig.propertyName} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Generated OG/social-share image — no photography asset required (see README's owner content checklist for real property photos to replace this default). */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2B2620 0%, #3F3A2E 55%, #B4852D 100%)',
          color: '#F5F2ED',
          fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: '#DCC38A' }}>
          {siteConfig.address}
        </div>
        <div style={{ fontSize: 96, fontWeight: 600, marginTop: 24, textAlign: 'center' }}>
          {siteConfig.propertyName}
        </div>
        <div style={{ fontSize: 34, marginTop: 20, color: '#F5F2ED', opacity: 0.85 }}>{siteConfig.tagline}</div>
      </div>
    ),
    { ...size },
  );
}
