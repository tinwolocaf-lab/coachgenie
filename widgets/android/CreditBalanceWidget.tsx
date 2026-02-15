import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { CreditBalanceData } from './widget-storage';

/**
 * CreditBalanceWidget - Android Small Widget (2×1)
 *
 * Displays:
 * - Remaining AI credits
 * - Tier badge (Free / Sovereign / Oracle)
 * - Compact single-row design
 * - Tap opens the account/paywall screen
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents
 */

const COLORS = {
  background: '#1a1a2e',
  text: '#e8e8e8',
  gold: '#d4af37',
  border: '#2d2d4a',
} as const;

const TIER_COLORS = {
  free: '#9ca3af',
  sovereign: '#d4af37',
  oracle: '#a855f7',
} as const;

const TIER_LABELS = {
  free: 'Free',
  sovereign: 'Sovereign',
  oracle: 'Oracle',
} as const;

export default function CreditBalanceWidget({
  family,
  data,
}: {
  family: string;
  data: CreditBalanceData;
}) {
  void family;
  const tier = data.tier as keyof typeof TIER_COLORS;
  const tierColor = TIER_COLORS[tier] ?? COLORS.text;
  const tierLabel = TIER_LABELS[tier] ?? 'Free';
  const isLow = data.totalCredits > 0 && data.creditsRemaining < data.totalCredits * 0.2;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: COLORS.background,
      }}
    >
      <FlexWidget
        style={{
          padding: 12,
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: data.tier === 'free' ? 'coachgenie://paywall' : 'coachgenie://account' }}
      >
        {/* Left: Credits */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 8,
          }}
        >
          <TextWidget
            text={data.tierBadge}
            style={{ fontSize: 18 }}
          />
          <FlexWidget style={{ flexGap: 1 }}>
            <TextWidget
              text={data.creditsRemaining.toString()}
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: isLow ? '#ef4444' as const : COLORS.text,
              }}
            />
            <TextWidget
              text="credits"
              style={{
                fontSize: 9,
                fontWeight: '500',
                color: '#9ca3af',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Right: Tier Badge */}
        <FlexWidget
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tierColor,
          }}
        >
          <TextWidget
            text={tierLabel}
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: tierColor,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
