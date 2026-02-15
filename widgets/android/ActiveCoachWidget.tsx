import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { ActiveCoachData } from './widget-storage';

/**
 * ActiveCoachWidget - Android Widget (3×2)
 *
 * Displays:
 * - Active coach emoji and name
 * - Last session topic
 * - Session count
 * - One-tap to resume/start coaching session
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents
 */

const COLORS = {
  background: '#1a1a2e',
  text: '#e8e8e8',
  gold: '#d4af37',
  border: '#2d2d4a',
  buttonBg: '#3a3a52',
} as const;

export default function ActiveCoachWidget({
  family,
  data,
}: {
  family: string;
  data: ActiveCoachData;
}) {
  void family;

  const chatUri = data.coachId && data.coachId !== 'default'
    ? `coachgenie://chat/${data.coachId}`
    : 'coachgenie://sanctuary';

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
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: chatUri }}
      >
        {/* Coach Header */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 10,
            marginBottom: 8,
          }}
        >
          {/* Coach Avatar */}
          <FlexWidget
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: COLORS.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={data.coachEmoji}
              style={{ fontSize: 22 }}
            />
          </FlexWidget>

          {/* Coach Info */}
          <FlexWidget style={{ flex: 1, flexGap: 2 }}>
            <TextWidget
              text="ACTIVE COACH"
              style={{
                fontSize: 9,
                fontWeight: '600',
                color: '#9ca3af',
                letterSpacing: 1,
              }}
            />
            <TextWidget
              text={data.coachName}
              maxLines={1}
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: COLORS.text,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Last Session Topic */}
        {data.lastSessionTopic && (
          <FlexWidget
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: COLORS.border,
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <TextWidget
              text={data.lastSessionTopic}
              maxLines={2}
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: COLORS.text,
              }}
            />
          </FlexWidget>
        )}

        {/* Spacer */}
        <FlexWidget style={{ flex: 1 }} />

        {/* Bottom Row: Stats + CTA */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <FlexWidget style={{ flexGap: 2 }}>
            <TextWidget
              text={data.sessionCount > 0 ? `${data.sessionCount} sessions` : 'No sessions yet'}
              style={{
                fontSize: 10,
                fontWeight: '500',
                color: '#9ca3af',
              }}
            />
            <TextWidget
              text="CoachZeno"
              style={{
                fontSize: 8,
                fontWeight: '600',
                color: COLORS.gold,
              }}
            />
          </FlexWidget>

          {/* Chat Button */}
          <FlexWidget
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: COLORS.gold,
              borderRadius: 16,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: chatUri }}
          >
            <TextWidget
              text="💬 Chat"
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#1a1a2e',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
