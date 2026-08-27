import 'server-only';
import type { EmailContent } from './templates';

/**
 * Development email adapter: logs to the console instead of sending.
 * Used automatically whenever RESEND_API_KEY is not configured, so local
 * development and preview deploys never accidentally email real guests.
 */
export async function sendViaDevAdapter(to: string, content: EmailContent): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    `\n[DEV EMAIL ADAPTER — no RESEND_API_KEY configured, email NOT actually sent]\n` +
      `To: ${to}\nSubject: ${content.subject}\n---\n${content.html}\n`,
  );
}
