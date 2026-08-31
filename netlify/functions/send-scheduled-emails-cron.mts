import type { Config } from '@netlify/functions';

/** See expire-holds-cron.mts — same pattern, daily instead of every 15 minutes. */
export default async () => {
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!siteUrl || !cronSecret) {
    console.error('send-scheduled-emails-cron: missing URL or CRON_SECRET, skipping.');
    return;
  }

  const res = await fetch(`${siteUrl}/api/cron/send-scheduled-emails`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  if (!res.ok) {
    console.error(`send-scheduled-emails-cron: request failed with status ${res.status}`);
  }
};

export const config: Config = {
  schedule: '0 8 * * *',
};
