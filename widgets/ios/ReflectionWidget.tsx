import React from 'react';
import { Widget, Text, VStack, HStack, Spacer } from '@expo/widgets';

/**
 * ReflectionWidget - systemLarge (2x6) iOS Widget
 *
 * Displays:
 * - A past insight or breakthrough as a "flashback" quote (morning)
 * - Morning: shows the morning intention prompt
 * - Evening: prompts to complete evening audit
 * - Beautiful serif typography matching the app's editorial design
 *
 * Data is read from UserDefaults via App Group: group.com.coachgenie.app
 */

interface WidgetData {
  contentType: 'morning' | 'evening';
  mainContent: string;
  subtitle?: string;
  insight?: string;
  actionPrompt?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export default function ReflectionWidget() {
  // Determine time of day
  const hour = new Date().getHours();
  let contentType: 'morning' | 'evening' = 'morning';
  let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';

  if (hour >= 5 && hour < 12) {
    contentType = 'morning';
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
    contentType = 'morning';
  } else {
    contentType = 'evening';
    timeOfDay = 'evening';
  }

  // In a real implementation, this data would come from SharedStorage
  const defaultData: WidgetData = {
    contentType,
    timeOfDay,
    mainContent:
      contentType === 'morning'
        ? 'What would make today feel like a success?'
        : 'How did today shape you?',
    subtitle:
      contentType === 'morning'
        ? 'Set your intention'
        : 'Reflect on your journey',
    insight:
      contentType === 'morning'
        ? undefined
        : 'Yesterday: "Small steps compound into big changes"',
    actionPrompt:
      contentType === 'morning'
        ? 'Take 2 minutes to journal'
        : 'Complete your evening audit',
  };

  const widgetData = defaultData;
  const goldAccent = '#C9A84C';
  const darkText = '#1F2937';

  return (
    <Widget
      family="systemLarge"
      containerBackgroundColor="#FAFAF8"
      padding={20}
    >
      <VStack spacing={20} expandHeight expandWidth>
        {/* Time-based Header */}
        <HStack expandWidth>
          <VStack spacing={4}>
            <Text
              font={{ size: 12, weight: '500', family: 'system' }}
              color="#9CA3AF"
              numberOfLines={1}
            >
              {widgetData.timeOfDay.toUpperCase()}
            </Text>
            <Text
              font={{ size: 18, weight: '600', family: 'serif' }}
              color={goldAccent}
              numberOfLines={1}
            >
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </VStack>
          <Spacer />
        </HStack>

        {/* Main Content Section */}
        {widgetData.contentType === 'morning' ? (
          <MorningContent data={widgetData} goldAccent={goldAccent} darkText={darkText} />
        ) : (
          <EveningContent data={widgetData} goldAccent={goldAccent} darkText={darkText} />
        )}

        <Spacer />

        {/* Action Section */}
        <VStack spacing={12} expandWidth>
          <VStack
            spacing={12}
            paddingHorizontal={16}
            paddingVertical={16}
            backgroundColor="#FFFFFF"
            cornerRadius={12}
            borderColor="#E5E7EB"
            borderWidth={1}
          >
            <Text
              font={{ size: 14, weight: '600', family: 'serif' }}
              color={darkText}
              numberOfLines={2}
              lineHeight={1.5}
            >
              {widgetData.actionPrompt}
            </Text>
            <HStack spacing={8} alignItems="center">
              <Text
                font={{ size: 12, weight: '500' }}
                color={goldAccent}
                numberOfLines={1}
              >
                {widgetData.contentType === 'morning' ? '✨ Begin' : '🌙 Reflect'}
              </Text>
            </HStack>
          </VStack>

          {/* Tap Target */}
          <Widget.Activity
            uri={
              widgetData.contentType === 'morning'
                ? 'coachgenie://journal/morning'
                : 'coachgenie://audit'
            }
            description={widgetData.actionPrompt}
            isInteractive={true}
          />
        </VStack>

        {/* Branding Footer */}
        <HStack spacing={4} justifyContent="center" marginTop={8}>
          <Text
            font={{ size: 10, weight: '500' }}
            color="#D1D5DB"
            numberOfLines={1}
          >
            coachgenie
          </Text>
        </HStack>
      </VStack>
    </Widget>
  );
}

/**
 * MorningContent Component
 * Displays morning intention prompt with inspirational framing
 */
function MorningContent({
  data,
  goldAccent,
  darkText,
}: {
  data: WidgetData;
  goldAccent: string;
  darkText: string;
}) {
  return (
    <VStack spacing={16} expandWidth>
      {/* Intention Prompt */}
      <VStack spacing={8}>
        <Text
          font={{ size: 12, weight: '500', family: 'system' }}
          color={goldAccent}
          numberOfLines={1}
        >
          MORNING INTENTION
        </Text>
        <Text
          font={{ size: 32, weight: '700', family: 'serif' }}
          color={darkText}
          numberOfLines={3}
          lineHeight={1.3}
        >
          {data.mainContent}
        </Text>
      </VStack>

      {/* Subtitle */}
      <Text
        font={{ size: 14, weight: '500', family: 'system' }}
        color="#6B7280"
        numberOfLines={2}
        lineHeight={1.4}
      >
        {data.subtitle}
      </Text>
    </VStack>
  );
}

/**
 * EveningContent Component
 * Displays past insight flashback and evening reflection prompt
 */
function EveningContent({
  data,
  goldAccent,
  darkText,
}: {
  data: WidgetData;
  goldAccent: string;
  darkText: string;
}) {
  return (
    <VStack spacing={16} expandWidth>
      {/* Flashback Insight */}
      {data.insight && (
        <VStack
          spacing={8}
          paddingHorizontal={12}
          paddingVertical={12}
          backgroundColor="#FEF3E2"
          cornerRadius={8}
          borderLeftColor={goldAccent}
          borderLeftWidth={3}
        >
          <Text
            font={{ size: 11, weight: '600' }}
            color={goldAccent}
            numberOfLines={1}
          >
            YESTERDAY'S INSIGHT
          </Text>
          <Text
            font={{ size: 14, weight: '500', family: 'serif' }}
            color={darkText}
            numberOfLines={2}
            lineHeight={1.4}
          >
            "{data.insight}"
          </Text>
        </VStack>
      )}

      {/* Evening Reflection */}
      <VStack spacing={8}>
        <Text
          font={{ size: 12, weight: '500' }}
          color={goldAccent}
          numberOfLines={1}
        >
          EVENING REFLECTION
        </Text>
        <Text
          font={{ size: 28, weight: '700', family: 'serif' }}
          color={darkText}
          numberOfLines={2}
          lineHeight={1.3}
        >
          {data.mainContent}
        </Text>
      </VStack>

      {/* Subtitle */}
      <Text
        font={{ size: 14, weight: '500', family: 'system' }}
        color="#6B7280"
        numberOfLines={1}
      >
        {data.subtitle}
      </Text>
    </VStack>
  );
}
