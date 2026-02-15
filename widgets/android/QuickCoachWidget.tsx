import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { QuickCoachData } from './widget-storage';

/**
 * QuickCoachWidget - Android Medium Widget (4x2)
 *
 * Displays:
 * - Time-based greeting (Good Morning/Afternoon/Evening)
 * - Recommended coach with emoji and name
 * - Coaching prompt/nudge in a highlighted box
 * - 3 quick action buttons
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents, #e8e8e8 text
 */

interface WidgetColors {
  background: `#${string}`;
  text: `#${string}`;
  gold: `#${string}`;
  border: `#${string}`;
  promptBg: `#${string}`;
  buttonBg: `#${string}`;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function QuickCoachWidget({
  family,
  data,
}: {
  family: string;
  data: QuickCoachData;
}) {
  void family;
  const colors: WidgetColors = {
    background: '#1a1a2e',
    text: '#e8e8e8',
    gold: '#d4af37',
    border: '#2d2d4a',
    promptBg: '#2d2d4a',
    buttonBg: '#3a3a52',
  };

  const greeting = getTimeGreeting();

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
      >
        {/* Coach Header with Greeting */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 12,
            marginBottom: 12,
          }}
        >
          <TextWidget
            text={data.recommendedCoach.emoji}
            style={{
              fontSize: 24,
            }}
          />
          <FlexWidget style={{ flex: 1, flexGap: 2 }}>
            <TextWidget
              text={greeting}
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#9ca3af',
                letterSpacing: 0.5,
              }}
            />
            <TextWidget
              text={data.recommendedCoach.name}
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.text,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Coaching Prompt Box */}
        <FlexWidget
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: colors.promptBg,
            borderRadius: 8,
            flexGap: 8,
            marginBottom: 12,
            marginTop: 4,
          }}
        >
          <TextWidget
            text="TODAY'S NUDGE"
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.gold,
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={data.coachingPrompt}
            maxLines={3}
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.text,
            }}
          />
          <TextWidget
            text={`${data.suggestedAction} • ${data.sessionTime}`}
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: '#9ca3af',
            }}
          />
        </FlexWidget>

        {/* Spacer */}
        <FlexWidget style={{ flex: 1 }} />

        {/* Action Buttons Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            flexGap: 8,
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <ActionButton
            label="Chat"
            icon="💬"
            uri="coachgenie://sanctuary"
            colors={colors}
          />
          <ActionButton
            label="Oracle"
            icon="🔮"
            uri="coachgenie://oracle"
            colors={colors}
          />
          <ActionButton
            label="Rituals"
            icon="🌙"
            uri="coachgenie://rituals"
            colors={colors}
          />
        </FlexWidget>

        {/* Footer - Branding & Last Updated */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            text={`Updated ${new Date().getHours()}:${String(
              new Date().getMinutes()
            ).padStart(2, '0')}`}
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

/**
 * ActionButton Component
 * Reusable button component for quick actions
 */
function ActionButton({
  label,
  icon,
  uri,
  colors,
}: {
  label: string;
  icon: string;
  uri: string;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: colors.buttonBg,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexGap: 4,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
    >
      <TextWidget
        text={icon}
        style={{
          fontSize: 16,
        }}
      />
      <TextWidget
        text={label}
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: colors.text,
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  );
}
