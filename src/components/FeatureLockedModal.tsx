import React from 'react';
import { User } from '../types';

interface FeatureLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscriptionModal: () => void;
  featureName?: string;
  currentUser: User | null;
}

// All features on the platform are 100% free forever — never lock any educational feature.
export const FeatureLockedModal: React.FC<FeatureLockedModalProps> = () => {
  return null;
};
