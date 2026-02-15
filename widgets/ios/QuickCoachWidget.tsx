import React from 'react';
import { Widget, Text, VStack, HStack, Spacer, Button } from '@expo/widgets';

/**
 * QuickCoachWidget - systemMedium (2x4) iOS Widget
 *
 * Displays:
 * - A daily AI coaching prompt/nudge
 * - Two quick action buttons: "Voice Session" and "Open Journal"
 * - Coach icon and name for the recommended coach (based on time of day)
 * - Tap targets that deep link into the app
 *
 * Data is read from UserDefaults via App Group: group.com.coachgenie.app
 */

interface WidgetData {
  coachingPrompt: string;
  recommendedCoach: {
    name: string;
    emoji: string;
  };
  suggestedAction: string;
  sessionTime: string;
}

export default function QuickCoachWidget() {
  // In a real implementation, this data would come from SharedStorage
  // For now, we define default values that will be replaced by actual data
  const defaultData: WidgetData = {
    coachingPrompt: 'What\'s one thing you can let go of today?',
    recommendedCoach: {
      name: 'Clarity Coach',
      emoji: '🧠',
    },
    suggestedAction: 'Take 5 minutes to reflect',
    sessionTime: '5 min',
  };

  const widgetData = defaultData;
  const goldAccent = '#C9A84C';

  return (
    <Widget
      family="systemMedium"
      containerBackgroundColor="#FFFFFF"
      padding={16}
    >
      <VStack spacing={12} expandHeight expandWidth>
        {/* Coach Header */}
        <HStack spacing={8} alignItems="center">
          <Text font={{ size: 20 }} numberOfLines={1}>
            {widgetData.recommendedCoach.emoji}
          </Text>
          <VStack spacing={2}>
            <Text
              font={{ size: 12, weight: '600' }}
              color="#6B7280"
              numberOfLines={1}
            >
              TODAY'S COACH
            </Text>
            <Text
              font={{ size: 14, weight: '700' }}
              color="#1F2937"
              numberOfLines={1}
            >
              {widgetData.recommendedCoach.name}
            </Text>
          </VStack>
          <Spacer />
        </HStack>

        {/* Coaching Prompt */}
        <VStack spacing={8} expandWidth paddingHorizontal={12} paddingVertical={12} backgroundColor="#FDF8F0" cornerRadius={8}>
          <Text
            font={{ size: 12, weight: '500' }}
            color={goldAccent}
            numberOfLines={1}
          >
            TODAY'S NUDGE
          </Text>
          <Text
            font={{ size: 16, weight: '600' }}
            color="#1F2937"
            numberOfLines={3}
            lineHeight={1.4}
          >
            {widgetData.coachingPrompt}
          </Text>
          <Text
            font={{ size: 12, weight: '500' }}
            color="#9CA3AF"
            numberOfLines={1}
          >
            {widgetData.suggestedAction} • {widgetData.sessionTime}
          </Text>
        </VStack>

        <Spacer />

        {/* Action Buttons */}
        <HStack spacing={12} expandWidth>
          {/* Voice Session Button */}
          <WidgetButton
            label="Voice Session"
            icon="🎙️"
            uri="coachgenie://voice-session"
            flex={1}
          />

          {/* Open Journal Button */}
          <WidgetButton
            label="Open Journal"
            icon="📔"
            uri="coachgenie://journal"
            flex={1}
          />
        </HStack>

        {/* Footer - Last Updated */}
        <Text
          font={{ size: 10, weight: '400' }}
          color="#D1D5DB"
          textAlignment="center"
          numberOfLines={1}
        >
          Updated {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}
        </Text>
      </VStack>
    </Widget>
  );
}

/**
 * WidgetButton Component
 * Reusable button component for widget quick actions
 */
function WidgetButton({
  label,
  icon,
  uri,
  flex = 1,
}: {
  label: string;
  icon: string;
  uri: string;
  flex?: number;
}) {
  return (
    <Widget.Activity
      uri={uri}
      description={label}
      isInteractive={true}
      flex={flex}
    >
      <VStack
        spacing={6}
        alignItems="center"
        justifyContent="center"
        expandWidth
        expandHeight
        paddingVertical={12}
        backgroundColor="#F3F4F6"
        cornerRadius={8}
      >
        <Text font={{ size: 16 }} numberOfLines={1}>
          {icon}
        </Text>
        <Text
          font={{ size: 12, weight: '600' }}
          color="#1F2937"
          textAlignment="center"
          numberOfLines={2}
        >
          {label}
        </Text>
      </VStack>
    </Widget.Activity>
  );
}
