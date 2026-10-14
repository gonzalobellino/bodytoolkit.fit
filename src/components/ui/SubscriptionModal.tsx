import React, { useState } from 'react';
import { Crown, Check, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Input } from './input';
import { Label } from './label';
import { usePremium } from '../../contexts/PremiumContext';
import type { PricingPlan } from '../../types/premium';
import { PREMIUM_PAYMENTS_ENABLED } from '../../config/env';

const isPaymentsVerified = PREMIUM_PAYMENTS_ENABLED;

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function SubscriptionModal({ open, onOpenChange, featureName }: SubscriptionModalProps): React.JSX.Element {
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const PRICING_PLAN: PricingPlan = {
    id: 'pro',
    name: 'Premium',
    price: 10,
    currency: 'USD',
    interval: 'month',
    features: [
      'Dual Video Sync',
      'AI Analysis',
      'Gait Analysis',
      'Symmetry Analysis',
      'Movement Comparison Database',
      'Progress Tracking',
      'Client Database',
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID, // Set in .env
  };
  const { activateTier } = usePremium();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan = PRICING_PLAN): Promise<void> => {
    setLoading(plan.id);
    
    try {
      // For now, we'll use a simple activation for development
      // In production, this would redirect to Stripe Checkout
      if (plan.stripePriceId) {
        // Redirect to Stripe Checkout
        // const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);
        // await stripe?.redirectToCheckout({
        //   lineItems: [{ price: plan.stripePriceId, quantity: 1 }],
        //   mode: 'subscription',
        //   successUrl: `${window.location.origin}?subscription=success`,
        //   cancelUrl: `${window.location.origin}?subscription=cancelled`,
        // });
        
        // For development: simulate activation
        // TODO: Replace with actual Stripe integration
        setTimeout(() => {
          const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
          activateTier(plan.id, `sub_test_${Date.now()}`, expiresAt);
          setLoading(null);
          onOpenChange(false);
          alert(`Activated ${plan.name} tier! (This is a demo - replace with Stripe in production)`);
        }, 1000);
      } else {
        // Development mode: activate directly
        const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
        activateTier(plan.id, `sub_test_${Date.now()}`, expiresAt);
        setLoading(null);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setLoading(null);
      alert('Failed to process subscription. Please try again.');
    }
  };

  const handleNotifySubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setNotifyError(null);
    if (!notifyEmail.trim()) {
      setNotifyError('Please enter your email.');
      return;
    }
    setNotifyLoading(true);
    try {
      const res = await fetch('/api/notify-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotifyError((data.error as string) || 'Something went wrong. Please try again.');
        return;
      }
      setNotifySubmitted(true);
    } catch {
      setNotifyError('Network error. Please try again.');
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <DialogTitle>Upgrade to Premium</DialogTitle>
          </div>
          <DialogDescription>
            {featureName 
              ? `Unlock ${featureName} and more premium features with a subscription.`
              : 'Unlock advanced features to take your movement analysis to the next level.'}
          </DialogDescription>
        </DialogHeader>

        {!isPaymentsVerified ? (
          <div className="max-w-md mx-auto mt-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/80 to-slate-50 border border-amber-200/80 shadow-lg shadow-amber-900/5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -translate-y-1/2 translate-x-1/2" aria-hidden />
              <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Premium is on the way</h3>
                    <p className="text-sm text-slate-600">We&apos;re setting up secure payments.</p>
                  </div>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-6">
                  Leave your email and we&apos;ll notify you as soon as lifetime access is available—no spam, one message.
                </p>
                {notifySubmitted ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-4 text-emerald-800">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <Check className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-900">You&apos;re on the list</p>
                      <p className="text-sm text-emerald-700">We&apos;ll email you when premium is ready.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleNotifySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notify-email" className="text-slate-700">Email address</Label>
                      <Input
                        id="notify-email"
                        type="email"
                        placeholder="you@example.com"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        disabled={notifyLoading}
                        autoComplete="email"
                        className="h-11 rounded-lg border-slate-300 bg-white shadow-sm focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>
                    {notifyError && (
                      <p className="text-sm text-red-600" role="alert">{notifyError}</p>
                    )}
                    <Button
                      type="submit"
                      disabled={notifyLoading}
                      className="w-full h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-amber-950 font-medium shadow-sm"
                    >
                      {notifyLoading ? 'Sending…' : 'Notify me when it\'s ready'}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-md mx-auto mt-6">
              <Card className="relative transition-all border-yellow-400 border-2 shadow-lg">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Premium Plan
                </Badge>
                
                <CardHeader>
                  <CardTitle className="text-2xl">{PRICING_PLAN.name}</CardTitle>
                  <CardDescription>
                    <span className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-bold text-slate-900">
                        ${PRICING_PLAN.price}
                      </span>
                      <span className="text-slate-600">/{PRICING_PLAN.interval}</span>
                    </span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {PRICING_PLAN.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(PRICING_PLAN)}
                    disabled={loading !== null}
                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-900"
                    variant="default"
                  >
                    {loading === PRICING_PLAN.id ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Processing...
                      </span>
                    ) : (
                      `Subscribe for $${PRICING_PLAN.price}/${PRICING_PLAN.interval}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 text-center">
                All subscriptions include a 7-day free trial. Cancel anytime.
                <br />
                Your subscription will auto-renew unless cancelled.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
