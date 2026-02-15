import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { DailyFocusData } from './widget-storage';

/**
 * DailyFocusWidget - Android Small Widget (2x2)
 *
 * Displays:
 * - Today's top priority text
 * - Ritual progress (e.g., "3/5 rituals")
 * - Current streak count with fire emoji
 * - Tap target to open the app to sanctuary screen
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents, #e8e8e8 text
 */

export default function DailyFocusWidget({
  family,
  data,
}: {
  family: string;
  data: DailyFocusData;
}) {
  void family;
  const colors = {
    background: '#1a1a2e',
    text: '#e8e8e8',
    gold: '#d4af37',
    border: '#2d2d4a',
  } as const;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: colors.background,
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
        {/* Top Priority Section */}
        <FlexWidget
          style={{
            flexGap: 8,
            marginBottom: 12,
          }}
        >
          <TextWidget
            text="TODAY'S FOCUS"
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1,
            }}
          />
          <TextWidget
            text={data.topPriority}
            maxLines={2}
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.text,
            }}
          />
        </FlexWidget>

        {/* Spacer */}
        <FlexWidget style={{ flex: 1 }} />

        {/* Rituals Progress & Streak Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            flexGap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Rituals Progress */}
          <FlexWidget
            style={{
              flex: 1,
              flexGap: 4,
            }}
          >
            <TextWidget
              text="RITUALS"
              style={{
                fontSize: 9,
                fontWeight: '500',
                color: '#9ca3af',
                letterSpacing: 0.5,
              }}
            />
            <TextWidget
              text={`${data.ritualsCompleted}/${data.ritualTotal}`}
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.gold,
              }}
            />
          </FlexWidget>

          {/* Streak */}
          <FlexWidget
            style={{
              flexGap: 4,
              alignItems: 'flex-end',
            }}
          >
            <TextWidget
              text="STREAK"
              style={{
                fontSize: 9,
                fontWeight: '500',
                color: '#9ca3af',
                letterSpacing: 0.5,
              }}
            />
            <FlexWidget
              style={{
                flexDirection: 'row',
                flexGap: 4,
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={data.streakCount.toString()}
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.gold,
                }}
              />
              <TextWidget
                text="🔥"
                style={{
                  fontSize: 14,
                }}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>

        {/* Branding Footer */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TextWidget
            text="CoachZeno"
            style={{
              fontSize: 9,
              fontWeight: '600',
              color: colors.gold,
            }}
          />
          <TextWidget
            text={new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            style={{
              fontSize: 8,
              fontWeight: '400',
              color: '#9ca3af',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
