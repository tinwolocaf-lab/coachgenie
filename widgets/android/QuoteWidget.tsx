import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { QuoteData } from './widget-storage';

/**
 * QuoteWidget - Android Widget (4×2)
 *
 * Displays:
 * - Quote of the day from coaching breakthroughs/insights
 * - Author attribution
 * - Category badge (breakthrough, insight, motivation, reflection)
 * - Tap opens the sanctuary/coaches screen
 *
 * Editorial design with serif-style typography feel
 * Dark theme: #1a1a2e background, #d4af37 gold accents
 */

const COLORS = {
  background: '#1a1a2e',
  text: '#e8e8e8',
  gold: '#d4af37',
  border: '#2d2d4a',
  quoteBg: '#2d2d4a',
} as const;

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string }> = {
  breakthrough: { emoji: '💡', label: 'Breakthrough' },
  insight: { emoji: '🔮', label: 'Insight' },
  motivation: { emoji: '⚡', label: 'Motivation' },
  reflection: { emoji: '🪞', label: 'Reflection' },
};

export default function QuoteWidget({
  family,
  data,
}: {
  family: string;
  data: QuoteData;
}) {
  void family;
  const categoryInfo = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG.motivation;

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
          padding: 16,
          flex: 1,
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'coachgenie://sanctuary' }}
      >
        {/* Category Badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 6,
            marginBottom: 8,
          }}
        >
          <TextWidget
            text={categoryInfo.emoji}
            style={{ fontSize: 14 }}
          />
          <TextWidget
            text={categoryInfo.label.toUpperCase()}
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: COLORS.gold,
              letterSpacing: 1,
            }}
          />
        </FlexWidget>

        {/* Quote */}
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingLeft: 12,
            borderLeftWidth: 3,
            borderLeftColor: COLORS.gold,
          }}
        >
          <TextWidget
            text={`"${data.quote}"`}
            maxLines={4}
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: COLORS.text,
              fontStyle: 'italic',
            }}
          />
        </FlexWidget>

        {/* Author & Branding */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <TextWidget
            text={`— ${data.author}`}
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: '#9ca3af',
            }}
          />
          <TextWidget
            text="CoachZeno"
            style={{
              fontSize: 9,
              fontWeight: '600',
              color: COLORS.gold,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
