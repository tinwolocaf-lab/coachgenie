import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { RitualChecklistData } from './widget-storage';

/**
 * RitualChecklistWidget - Android Widget (4×3)
 *
 * Displays:
 * - Time-of-day label (Morning/Evening Rituals)
 * - Checklist of rituals with emoji + completion status
 * - Progress counter (e.g., "2/4 complete")
 * - Tapping opens the rituals screen
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents, #e8e8e8 text
 */

const COLORS = {
  background: '#1a1a2e',
  text: '#e8e8e8',
  gold: '#d4af37',
  border: '#2d2d4a',
  itemBg: '#2d2d4a',
  completedBg: '#1e3a2e',
} as const;

export default function RitualChecklistWidget({
  family,
  data,
}: {
  family: string;
  data: RitualChecklistData;
}) {
  void family;
  const rituals = data.rituals || [];
  const timeLabel = data.timeOfDay === 'evening' ? 'EVENING RITUALS' : 'MORNING RITUALS';
  const timeEmoji = data.timeOfDay === 'evening' ? '🌙' : '☀️';

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
        clickActionData={{ uri: 'coachgenie://rituals' }}
      >
        {/* Header */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 8,
            marginBottom: 12,
          }}
        >
          <TextWidget
            text={timeEmoji}
            style={{ fontSize: 18 }}
          />
          <FlexWidget style={{ flex: 1, flexGap: 2 }}>
            <TextWidget
              text={timeLabel}
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.gold,
                letterSpacing: 1,
              }}
            />
            <TextWidget
              text={`${data.completedCount}/${data.totalCount} complete`}
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#9ca3af',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Ritual Items */}
        <FlexWidget
          style={{
            flex: 1,
            flexGap: 6,
          }}
        >
          {rituals.slice(0, 6).map((ritual) => (
            <FlexWidget
              key={ritual.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: (ritual.completed ? COLORS.completedBg : COLORS.itemBg) as `#${string}`,
                borderRadius: 8,
                flexGap: 10,
              }}
              clickAction="TOGGLE_RITUAL"
              clickActionData={{ ritualId: ritual.id }}
            >
              <TextWidget
                text={ritual.completed ? '✅' : '⬜'}
                style={{ fontSize: 14 }}
              />
              <TextWidget
                text={ritual.label}
                maxLines={1}
                style={{
                  fontSize: 13,
                  fontWeight: ritual.completed ? '400' : '600',
                  color: (ritual.completed ? '#6b7280' : COLORS.text) as `#${string}`,
                }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>

        {/* Progress Bar — use flex weights for proportional fill */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            marginTop: 10,
            height: 4,
            backgroundColor: COLORS.border,
            borderRadius: 2,
            width: 'match_parent',
          }}
        >
          {data.completedCount > 0 && (
            <FlexWidget
              style={{
                height: 4,
                backgroundColor: COLORS.gold,
                borderRadius: 2,
                flex: data.completedCount,
              }}
            />
          )}
          {data.totalCount - data.completedCount > 0 && (
            <FlexWidget
              style={{
                height: 4,
                flex: data.totalCount - data.completedCount,
              }}
            />
          )}
        </FlexWidget>

        {/* Footer */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <TextWidget
            text="CoachZeno"
            style={{
              fontSize: 9,
              fontWeight: '600',
              color: COLORS.gold,
            }}
          />
          <TextWidget
            text="Tap to toggle"
            style={{
              fontSize: 8,
              fontWeight: '400',
              color: '#6b7280',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
