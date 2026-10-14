import React, { useState, useEffect } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LimitedTimeFreeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
  onGetStarted: () => void;
}

export function LimitedTimeFreeModal({
  open,
  onOpenChange,
  featureName,
  onGetStarted,
}: LimitedTimeFreeModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setError(null);
    }
  }, [open]);

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email to continue.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Invalid email.');
      return;
    }
    // Grant access immediately — the API call is just a notification, not a gate.
    onGetStarted();
    onOpenChange(false);
    // Notify in the background; failure is non-critical.
    fetch('/api/notify-me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, source: 'limited_time_premium', feature: featureName ?? '' }),
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-500" />
            <DialogTitle>Free for a limited time</DialogTitle>
          </div>
          <DialogDescription>
            {featureName
              ? `Try ${featureName} now—no payment required. Enjoy full access while we finish setting up subscriptions.`
              : 'This premium feature is free for a limited time. No payment required.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGetStarted}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/80 to-slate-50 border border-emerald-200/80 shadow-lg shadow-emerald-900/5 mt-6">
            <div
              className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -translate-y-1/2 translate-x-1/2"
              aria-hidden
            />
            <div className="relative px-6 py-8 sm:px-8 sm:py-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Limited-time access</h3>
                  <p className="text-sm text-slate-600">Enter your email to try this feature.</p>
                </div>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">
                We&apos;re getting payments ready. Until then, enjoy this feature on us. When subscriptions go live, we&apos;ll let you know—you can decide then whether to continue.
              </p>
              <div className="space-y-2 mb-4">
                <Label htmlFor="limited-time-email" className="text-slate-700">
                  Email
                </Label>
                <Input
                  id="limited-time-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 rounded-lg border-slate-300 bg-white"
                />
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm"
              >
                Get started
              </Button>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                By submitting you agree we may contact you with product updates and when Premium is available. You can unsubscribe at any time.
              </p>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
