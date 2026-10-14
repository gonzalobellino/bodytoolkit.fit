export type SubscriptionTier = 'free' | 'pro' | 'clinic';

export interface PremiumFeatures {
  dualVideoSync: boolean;
  aiPoseDetection: boolean;
  gaitAnalysis: boolean;
  symmetryAnalysis: boolean;
  movementComparison: boolean;
  progressTracking: boolean;
  clientDatabase: boolean;
}

export interface PremiumState {
  isPremium: boolean;
  subscriptionTier: SubscriptionTier;
  features: PremiumFeatures;
  subscriptionId?: string;
  expiresAt?: number;
}

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

export const PREMIUM_FEATURES = {
  dualVideoSync: 'dualVideoSync',
  aiPoseDetection: 'aiPoseDetection',
  gaitAnalysis: 'gaitAnalysis',
  symmetryAnalysis: 'symmetryAnalysis',
  movementComparison: 'movementComparison',
  progressTracking: 'progressTracking',
  clientDatabase: 'clientDatabase',
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;


