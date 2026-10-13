import React, { useState } from 'react';
import { ArrowLeft, Mail, Globe, Send, CheckCircle } from 'lucide-react';

import { CONTACT_EMAIL } from '../config/env';
const CONTACT_WEBSITE = 'https://golfstrength.coach?utm_source=corrective-toolkit&utm_medium=app&utm_campaign=referral&utm_content=about';
const WEBSITE_LABEL = 'golfstrength.coach';

interface ContactPageProps {
  onBack: () => void;
}

export function ContactPage({ onBack }: ContactPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('General Inquiry');
      setMessage('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h1 className="text-slate-900 mb-4">Get in Touch</h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              Have questions about the platform? Interested in corrective exercise coaching or golf performance training? 
              I&apos;d love to hear from you.
            </p>

            {/* Services */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-8">
              <h3 className="text-slate-900 mb-4">Coaching Services</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Golf Performance Training</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Coaching 1:1 Online</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Movement Assessment & Correction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Injury Prevention</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>General Health & Fitness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>In-Person Training (Buenos Aires)</span>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div className="space-y-4">
              <h3 className="text-slate-900">Connect</h3>
              <div className="flex flex-col gap-3">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-slate-900">Email</div>
                    <div className="text-sm text-slate-600">{CONTACT_EMAIL}</div>
                  </div>
                </a>

                <a
                  href={CONTACT_WEBSITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <Globe className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-slate-900">Website</div>
                    <div className="text-sm text-slate-600">{WEBSITE_LABEL}</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h2 className="text-slate-900 mb-6">Send a Message</h2>
              
              {submitted ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-slate-900 mb-2">Message Sent!</h3>
                  <p className="text-slate-600">I&apos;ll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm text-slate-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm text-slate-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm text-slate-700 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option>General Inquiry</option>
                      <option>Golf Performance Training</option>
                      <option>Coaching 1:1 Online</option>
                      <option>Movement Assessment & Correction</option>
                      <option>Injury Prevention</option>
                      <option>General Health & Fitness</option>
                      <option>In-Person Training (Buenos Aires)</option>
                      <option>Platform Feedback</option>
                      <option>Partnership/Collaboration</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm text-slate-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Tell me how I can help..."
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600" role="alert">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    <span>{loading ? 'Sending…' : 'Send Message'}</span>
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    I typically respond within 24-48 hours
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
