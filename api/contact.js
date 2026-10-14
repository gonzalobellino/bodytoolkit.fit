import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_FROM = 'Body Toolkit <onboarding@resend.dev>';

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, 2000);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const toEmail = process.env.NOTIFY_ME_TO_EMAIL;
  if (!process.env.RESEND_API_KEY || !toEmail) {
    console.error('Contact: missing RESEND_API_KEY or NOTIFY_ME_TO_EMAIL');
    return res.status(500).json({ error: 'Contact form is not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const name = sanitize(body.name);
  const email = sanitize(body.email);
  const subject = sanitize(body.subject) || 'General Inquiry';
  const message = sanitize(body.message);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: [toEmail],
      replyTo: email,
      subject: `[Body Toolkit] ${subject}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:1em 0;" />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
    });

    if (error) {
      console.error('Resend contact error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
