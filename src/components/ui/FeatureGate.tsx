import React, { useState, useCallback, ReactNode, cloneElement, isValidElement } from 'react';
import { usePremium } from '../../contexts/PremiumContext';
import { SubscriptionModal } from './SubscriptionModal';
import { LimitedTimeFreeModal } from './LimitedTimeFreeModal';
import { PREMIUM_PAYMENTS_ENABLED } from '../../config/env';
import type { PremiumFeatureKey } from '../../types/premium';

const LIMITED_TIME_FEATURES: PremiumFeatureKey[] = ['dualVideoSync', 'aiPoseDetection'];

interface FeatureGateProps {
  feature: PremiumFeatureKey;
  featureName?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({
  feature,
  featureName,
  children,
  fallback,
}: FeatureGateProps): React.JSX.Element {
  const { hasFeature, activateTier } = usePremium();
  const [showModal, setShowModal] = useState(false);

  const showLimitedTimeModal =
    !PREMIUM_PAYMENTS_ENABLED && LIMITED_TIME_FEATURES.includes(feature);

  const handleGetStarted = useCallback(() => {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    activateTier('pro', `limited_${Date.now()}`, expiresAt);
  }, [activateTier]);

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const openModal = (): void => setShowModal(true);

  const wrappedChildren = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          openModal();
        },
      })
    : (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal();
          }}
          className="cursor-pointer"
        >
          {children}
        </div>
      );

  return (
    <>
      {wrappedChildren}
      {showLimitedTimeModal ? (
        <LimitedTimeFreeModal
          open={showModal}
          onOpenChange={setShowModal}
          featureName={featureName}
          onGetStarted={handleGetStarted}
        />
      ) : (
        <SubscriptionModal
          open={showModal}
          onOpenChange={setShowModal}
          featureName={featureName}
        />
      )}
    </>
  );
}
