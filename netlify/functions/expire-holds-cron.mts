import type { Config } from '@netlify/functions';

/**
 * Netlify Scheduled Function replacing vercel.json's cron entry (Netlify
 * doesn't read that file). Doesn't duplicate any business logic — just
 * calls the real, already-protected Next.js route on a timer, the same
 * way an external scheduler would. `URL` is set automatically by Netlify
 * to the site's primary production URL.
 */
export default async () => {
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    console.error('expire-holds-cron: missing URL or CRON_SECRET, skipping.');
    return;
  }

  const res = await fetch(`${siteUrl}/api/cron/expire-holds`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  if (!res.ok) {
    console.error(`expire-holds-cron: request failed with status ${res.status}`);
  }
};

export const config: Config = {
  schedule: '*/15 * * * *',
};
