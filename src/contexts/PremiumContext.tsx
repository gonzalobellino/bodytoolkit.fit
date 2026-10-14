import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { PremiumState, SubscriptionTier, PremiumFeatureKey } from '../types/premium';
import { PREMIUM_PAYMENTS_ENABLED } from '../config/env';

interface PremiumContextValue {
  premiumState: PremiumState;
  isPremium: boolean;
  hasFeature: (feature: PremiumFeatureKey) => boolean;
  setPremiumState: (state: PremiumState) => void;
  activateTier: (tier: SubscriptionTier, subscriptionId?: string, expiresAt?: number) => void;
  deactivatePremium: () => void;
}

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

const STORAGE_KEY = 'premium_state';

const getDefaultState = (): PremiumState => ({
  isPremium: false,
  subscriptionTier: 'free',
  features: {
    dualVideoSync: false,
    aiPoseDetection: false,
    gaitAnalysis: false,
    symmetryAnalysis: false,
    assessmentSharing: false,
    movementComparison: false,
    progressTracking: false,
    clientDatabase: false,
  },
});

const getFeaturesForTier = (tier: SubscriptionTier): PremiumState['features'] => {
  if (tier === 'free') {
    return {
      dualVideoSync: false,
      aiPoseDetection: false,
      gaitAnalysis: false,
      symmetryAnalysis: false,
      assessmentSharing: false,
      movementComparison: false,
      progressTracking: false,
      clientDatabase: false,
    };
  }
  
  if (tier === 'pro') {
    return {
      dualVideoSync: true,
      aiPoseDetection: true,
      gaitAnalysis: true,
      symmetryAnalysis: true,
      assessmentSharing: true, // Limited to 5/month
      movementComparison: true, // Basic
      progressTracking: true,
      clientDatabase: true, // Limited to 10 clients
    };
  }
  
  // clinic tier
  return {
    dualVideoSync: true,
    aiPoseDetection: true,
    gaitAnalysis: true,
    symmetryAnalysis: true,
    assessmentSharing: true, // Unlimited
    movementComparison: true, // Full
    progressTracking: true,
    clientDatabase: true, // Unlimited
  };
};

const loadStateFromStorage = (): PremiumState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if expired
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return getDefaultState();
      }
      // When payments are off, only keep state from our "limited time" grant (subscriptionId starts with 'limited_').
      // Any other stored premium (old dev activation, etc.) is cleared so features stay locked.
      if (!PREMIUM_PAYMENTS_ENABLED && parsed.isPremium) {
        const id = parsed.subscriptionId ?? '';
        if (!String(id).startsWith('limited_')) {
          localStorage.removeItem(STORAGE_KEY);
          return getDefaultState();
        }
      }
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load premium state from storage:', error);
  }
  return getDefaultState();
};

const saveStateToStorage = (state: PremiumState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save premium state to storage:', error);
  }
};

interface PremiumProviderProps {
  children: ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const [premiumState, setPremiumState] = useState<PremiumState>(loadStateFromStorage);

  useEffect(() => {
    // Check expiration on mount and periodically
    if (premiumState.expiresAt && premiumState.expiresAt < Date.now()) {
      setPremiumState(getDefaultState());
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [premiumState.expiresAt]);

  const updateState = useCallback((newState: PremiumState) => {
    setPremiumState(newState);
    saveStateToStorage(newState);
  }, []);

  const activateTier = useCallback((tier: SubscriptionTier, subscriptionId?: string, expiresAt?: number) => {
    const newState: PremiumState = {
      isPremium: tier !== 'free',
      subscriptionTier: tier,
      features: getFeaturesForTier(tier),
      subscriptionId,
      expiresAt,
    };
    updateState(newState);
  }, [updateState]);

  const deactivatePremium = useCallback(() => {
    updateState(getDefaultState());
  }, [updateState]);

  const hasFeature = useCallback((feature: PremiumFeatureKey): boolean => {
    return premiumState.features[feature] ?? false;
  }, [premiumState.features]);

  const value: PremiumContextValue = {
    premiumState,
    isPremium: premiumState.isPremium,
    hasFeature,
    setPremiumState: updateState,
    activateTier,
    deactivatePremium,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}


