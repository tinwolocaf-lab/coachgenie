import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { WeeklyProgressData } from './widget-storage';

/**
 * WeeklyProgressWidget - Android Small Widget (2×2)
 *
 * Displays:
 * - Circular-style progress indicator (text-based ring representation)
 * - Percentage complete for the week
 * - Sessions count vs goal
 * - Current streak
 *
 * Note: Android widgets don't support SVG/Canvas, so we use
 * a text-based progress representation with percentage.
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents
 */

const COLORS = {
  background: '#1a1a2e',
  text: '#e8e8e8',
  gold: '#d4af37',
  border: '#2d2d4a',
  ringBg: '#2d2d4a',
} as const;

/**
 * Get a visual progress bar using block characters
 */
function getProgressBlocks(percentage: number): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

export default function WeeklyProgressWidget({
  family,
  data,
}: {
  family: string;
  data: WeeklyProgressData;
}) {
  void family;
  const pct = Math.min(100, Math.max(0, data.percentage));

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
          padding: 14,
          flex: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'coachgenie://insights-dashboard' }}
      >
        {/* Week Label */}
        <TextWidget
          text={data.weekLabel.toUpperCase()}
          style={{
            fontSize: 9,
            fontWeight: '600',
            color: '#9ca3af',
            letterSpacing: 1,
          }}
        />

        {/* Big Percentage */}
        <FlexWidget
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexGap: 2,
          }}
        >
          <TextWidget
            text={`${pct}%`}
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: pct >= 80 ? '#22c55e' : pct >= 50 ? COLORS.gold : COLORS.text,
            }}
          />
          <TextWidget
            text={getProgressBlocks(pct)}
            style={{
              fontSize: 8,
              color: COLORS.gold,
              letterSpacing: 1,
            }}
          />
        </FlexWidget>

        {/* Sessions / Goal */}
        <FlexWidget
          style={{
            flexGap: 4,
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={`${data.completedSessions}/${data.totalGoal} sessions`}
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: COLORS.text,
            }}
          />
          {data.streakCount > 0 && (
            <TextWidget
              text={`${data.streakCount} day streak 🔥`}
              style={{
                fontSize: 10,
                fontWeight: '500',
                color: COLORS.gold,
              }}
            />
          )}
        </FlexWidget>

        {/* Branding */}
        <TextWidget
          text="CoachZeno"
          style={{
            fontSize: 8,
            fontWeight: '600',
            color: COLORS.gold,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
