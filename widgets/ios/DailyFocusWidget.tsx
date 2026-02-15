import React from 'react';
import { Widget, Text, VStack, HStack, Spacer } from '@expo/widgets';

/**
 * DailyFocusWidget - systemSmall (2x2) iOS Widget
 *
 * Displays:
 * - Today's top priority text
 * - Ritual progress (e.g., "3/5 rituals")
 * - Current streak count with flame emoji
 * - Tap target to open the app
 *
 * Data is read from UserDefaults via App Group: group.com.coachgenie.app
 */

interface WidgetData {
  topPriority: string;
  ritualsCompleted: number;
  ritualTotal: number;
  streakCount: number;
  lastUpdated: string;
}

export default function DailyFocusWidget() {
  // In a real implementation, this data would come from SharedStorage
  // For now, we define default values that will be replaced by actual data
  const defaultData: WidgetData = {
    topPriority: 'Focus on deep work',
    ritualsCompleted: 3,
    ritualTotal: 5,
    streakCount: 12,
    lastUpdated: new Date().toISOString(),
  };

  // Read data from UserDefaults (would be implemented via expo-widgets bridge)
  const widgetData = defaultData;

  const goldAccent = '#C9A84C';

  return (
    <Widget
      family="systemSmall"
      containerBackgroundColor="#FFFFFF"
      padding={16}
    >
      <VStack spacing={8} expandHeight>
        {/* Top Priority Section */}
        <VStack spacing={4}>
          <Text
            font={{ size: 12, weight: '600' }}
            color="#6B7280"
            numberOfLines={1}
          >
            TODAY'S FOCUS
          </Text>
          <Text
            font={{ size: 14, weight: '700' }}
            color="#1F2937"
            numberOfLines={2}
          >
            {widgetData.topPriority}
          </Text>
        </VStack>

        <Spacer />

        {/* Rituals Progress & Streak Row */}
        <HStack spacing={12} expandWidth>
          {/* Rituals Progress */}
          <VStack spacing={4} expandWidth>
            <Text
              font={{ size: 10, weight: '500' }}
              color="#9CA3AF"
              numberOfLines={1}
            >
              RITUALS
            </Text>
            <Text
              font={{ size: 16, weight: '700' }}
              color={goldAccent}
              numberOfLines={1}
            >
              {widgetData.ritualsCompleted}/{widgetData.ritualTotal}
            </Text>
          </VStack>

          {/* Streak */}
          <VStack spacing={4} alignItems="flex-end">
            <Text
              font={{ size: 10, weight: '500' }}
              color="#9CA3AF"
              numberOfLines={1}
            >
              STREAK
            </Text>
            <HStack spacing={4}>
              <Text
                font={{ size: 16, weight: '700' }}
                color={goldAccent}
                numberOfLines={1}
              >
                {widgetData.streakCount}
              </Text>
              <Text font={{ size: 14 }} numberOfLines={1}>
                🔥
              </Text>
            </HStack>
          </VStack>
        </HStack>

        {/* Branding Footer */}
        <HStack spacing={4} marginTop={8} paddingTop={8} borderTopColor="#E5E7EB" borderTopWidth={1}>
          <Text
            font={{ size: 10, weight: '600' }}
            color={goldAccent}
            numberOfLines={1}
          >
            coachgenie
          </Text>
          <Spacer />
          <Text
            font={{ size: 9, weight: '400' }}
            color="#D1D5DB"
            numberOfLines={1}
          >
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </HStack>
      </VStack>

      {/* Tap Target - Opens App */}
      <WidgetActivityButton
        uri="coachgenie://dashboard"
        description="Open Coachgenie Dashboard"
      />
    </Widget>
  );
}

/**
 * WidgetActivityButton Component
 * Provides tap target for the widget to deep link into the app
 */
function WidgetActivityButton({
  uri,
  description,
}: {
  uri: string;
  description: string;
}) {
  return (
    <Widget.Activity
      uri={uri}
      description={description}
      isInteractive={true}
    />
  );
}
