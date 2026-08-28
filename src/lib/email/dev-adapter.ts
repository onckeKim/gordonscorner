import 'server-only';
import { randomUUID } from 'crypto';
import type { EmailContent } from './templates';

/**
 * Development email adapter: logs to the console instead of sending.
 * Used automatically whenever RESEND_API_KEY is not configured, so local
 * development and preview deploys never accidentally email real guests.
 * Returns a synthetic message id so the email_log audit trail is exercised
 * identically to the real Resend adapter.
 */
export async function sendViaDevAdapter(to: string, content: EmailContent): Promise<{ messageId: string | null }> {
  const messageId = `dev-${randomUUID()}`;
  // eslint-disable-next-line no-console
  console.log(
    `\n[DEV EMAIL ADAPTER — no RESEND_API_KEY configured, email NOT actually sent]\n` +
      `To: ${to}\nSubject: ${content.subject}\nMessage-Id: ${messageId}\n---\n${content.text}\n`,
  );
  return { messageId };
}
