const BREVO_BASE = 'https://api.brevo.com/v3';

export interface SendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

interface SendSmsParams {
  to: string;
  content: string;
  sender?: string;
}

export async function sendEmail({
  to,
  subject,
  htmlBody,
  textBody,
}: SendEmailParams): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    return { ok: false, error: 'BREVO_API_KEY or BREVO_SENDER_EMAIL not configured' };
  }
  const senderName = process.env.BREVO_SENDER_NAME || 'Callbot Marco';

  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent: htmlBody,
      ...(textBody ? { textContent: textBody } : {}),
    }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, error: await res.text() };
  }
  return { ok: true, status: res.status };
}

export async function sendSms({ to, content, sender }: SendSmsParams): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY not configured' };

  const finalSender = sender || process.env.BREVO_SMS_SENDER || 'MarcoResto';

  const res = await fetch(`${BREVO_BASE}/transactionalSMS/sms`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: finalSender,
      recipient: to,
      content,
      type: 'transactional',
    }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, error: await res.text() };
  }
  return { ok: true, status: res.status };
}

// French phone normalization to E.164. "06 12 34 56 78" → "+33612345678".
// Returns null when the input doesn't look like a French mobile/landline.
export function toE164French(phone: string): string | null {
  const cleaned = phone.replace(/[\s.\-()]/g, '');
  if (/^\+33[1-9]\d{8}$/.test(cleaned)) return cleaned;
  if (/^33[1-9]\d{8}$/.test(cleaned)) return '+' + cleaned;
  if (/^0[1-9]\d{8}$/.test(cleaned)) return '+33' + cleaned.slice(1);
  return null;
}

// Renders a YYYY-MM-DD date as "25 mai 2026" for human-facing copy.
export function formatFrenchDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  const monthName = months[parseInt(month, 10) - 1] ?? month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
}
