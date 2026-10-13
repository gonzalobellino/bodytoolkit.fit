import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
// Use RESEND_FROM_EMAIL (e.g. "Body Toolkit <noreply@bodytoolkit.fit>") after verifying your domain at resend.com/domains. Otherwise Resend only allows sending to your account email.
const FROM = process.env.RESEND_FROM_EMAIL?.trim() || 'Body Toolkit <onboarding@resend.dev>';

function sanitize(str, maxLen = 5000) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('send-form-results: missing RESEND_API_KEY');
    return res.status(500).json({ error: 'Email service not configured' });
  }
  const bccEmail = process.env.NOTIFY_ME_TO_EMAIL?.trim() || null;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const coachEmail = sanitize(body.coachEmail, 200);
  const formName = sanitize(body.formName, 200);
  const summaryText = sanitize(body.summaryText);

  if (!coachEmail || !formName || !summaryText) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(coachEmail)) {
    return res.status(400).json({ error: 'Invalid coach email' });
  }

  const safeText = summaryText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeFormName = formName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 24px;margin-bottom:24px;">
        <h2 style="margin:0;font-size:18px;color:#0f172a;">Body Toolkit</h2>
        <p style="margin:4px 0 0;font-size:14px;color:#64748b;">Client assessment submission</p>
      </div>
      <h3 style="font-size:16px;color:#0f172a;margin-bottom:16px;">${safeFormName}</h3>
      <pre style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;word-break:break-word;">${safeText}</pre>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="font-size:12px;color:#94a3b8;margin:0;">Sent via Body Toolkit — Corrective Exercise Platform</p>
    </div>
  `;

  try {
    const payload = {
      from: FROM,
      to: [coachEmail],
      subject: `[Body Toolkit] Client assessment: ${formName}`,
      html,
    };
    if (bccEmail) payload.bcc = [bccEmail];
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', detail: error.message });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('send-form-results error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
