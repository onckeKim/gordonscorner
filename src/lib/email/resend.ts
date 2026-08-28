import 'server-only';
import { Resend } from 'resend';
import { siteConfig } from '@/lib/config';
import type { EmailContent } from './templates';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set.');
    }
    client = new Resend(apiKey);
  }
  return client;
}

/** Returns the provider's message id on success — used for the email_log audit trail. */
export async function sendViaResend(to: string, content: EmailContent): Promise<{ messageId: string | null }> {
  const from = process.env.EMAIL_FROM ?? `${siteConfig.propertyName} <bookings@gordonscorner.co.za>`;
  const { data, error } = await getClient().emails.send({
    from,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }

  return { messageId: data?.id ?? null };
}
