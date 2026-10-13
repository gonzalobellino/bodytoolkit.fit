import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFY_ME_FROM = 'Body Toolkit <onboarding@resend.dev>';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const toEmail = process.env.NOTIFY_ME_TO_EMAIL;
  if (!process.env.RESEND_API_KEY || !toEmail) {
    console.error('Notify me: missing RESEND_API_KEY or NOTIFY_ME_TO_EMAIL');
    return res.status(500).json({
      error: 'Server not configured. Add RESEND_API_KEY and NOTIFY_ME_TO_EMAIL in Vercel → Project → Settings → Environment Variables.',
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const source = (body.source || '').trim() || 'notify_me';
  const feature = (body.feature || '').trim() || '';

  try {
    const { data, error } = await resend.emails.send({
      from: NOTIFY_ME_FROM,
      to: [toEmail],
      replyTo: email,
      subject: `[Body Toolkit] ${source === 'limited_time_premium' ? 'Limited-time signup' : 'Notify me signup'}: ${email}${feature ? ` (${feature})` : ''}`,
      html: `
        <p>${source === 'limited_time_premium' ? 'New signup from "free for limited time" premium feature.' : 'New "notify me when premium is ready" signup.'}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${feature ? `<p><strong>Feature:</strong> ${feature}</p>` : ''}
        <p>Add this address to your list to notify when payments are live.</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      const message = error?.message || 'Failed to send notification';
      return res.status(500).json({ error: message });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('Notify me error:', err);
    const message = err?.message || 'Failed to send notification';
    return res.status(500).json({ error: message });
  }
}
