import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { ReflectionData } from './widget-storage';

/**
 * ReflectionWidget - Android Large Widget (4x4)
 *
 * Displays:
 * - Rotating reflection prompts (different each day)
 * - Time-of-day indicator (Morning/Afternoon/Evening)
 * - Coaching stats: streak count, sessions this week, mood trend
 * - Morning: shows intention prompt
 * - Evening: shows reflection prompt with yesterday's insight
 *
 * Dark theme: #1a1a2e background, #d4af37 gold accents, #e8e8e8 text
 */

interface WidgetColors {
  background: `#${string}`;
  text: `#${string}`;
  gold: `#${string}`;
  border: `#${string}`;
  insightBg: `#${string}`;
  statBg: `#${string}`;
}

const MORNING_PROMPTS = [
  'What would make today feel like a success?',
  'What are you most grateful for today?',
  'What one thing will move you forward?',
  'How can you lead with intention today?',
  'What growth opportunity awaits you?',
];

const EVENING_PROMPTS = [
  'How did today shape you?',
  'What did you learn about yourself?',
  'What are you most proud of today?',
  'How will you rest and recover?',
  'What will you carry forward?',
];

/**
 * Determine time of day and content type
 */
function getTimeContext(): {
  contentType: 'morning' | 'evening';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
} {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { contentType: 'morning', timeOfDay: 'morning' };
  } else if (hour >= 12 && hour < 18) {
    return { contentType: 'morning', timeOfDay: 'afternoon' };
  } else {
    return { contentType: 'evening', timeOfDay: 'evening' };
  }
}

/**
 * Get a prompt for the current day (deterministic based on date)
 */
function getPromptForDay(
  contentType: 'morning' | 'evening'
): string {
  const dayOfYear = Math.floor(
    (new Date().getTime() -
      new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000
  );

  const prompts =
    contentType === 'morning' ? MORNING_PROMPTS : EVENING_PROMPTS;
  return prompts[dayOfYear % prompts.length];
}

/**
 * Get mood trend emoji
 */
function getMoodEmoji(trend?: string): string {
  switch (trend) {
    case 'up':
      return '📈';
    case 'down':
      return '📉';
    default:
      return '→';
  }
}

/**
 * ReflectionWidget Component
 * Large (2x6) widget showing reflection prompts and stats
 */
export default function ReflectionWidget({
  family,
  data,
}: {
  family: string;
  data: ReflectionData;
}) {
  void family;
  const timeContext = getTimeContext();
  const prompt = getPromptForDay(timeContext.contentType);

  const widgetData: ReflectionData = {
    ...data,
    contentType: timeContext.contentType,
    timeOfDay: timeContext.timeOfDay,
    mainContent: data.mainContent || prompt,
  };

  const colors: WidgetColors = {
    background: '#1a1a2e',
    text: '#e8e8e8',
    gold: '#d4af37',
    border: '#2d2d4a',
    insightBg: '#3a3a52',
    statBg: '#2d2d4a',
  };

  const openUri =
    widgetData.contentType === 'morning'
      ? 'coachgenie://rituals/morning'
      : 'coachgenie://rituals/evening';

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
        clickActionData={{ uri: openUri }}
      >
        {/* Header: Time & Date */}
        <FlexWidget
          style={{
            flexGap: 4,
            marginBottom: 16,
          }}
        >
          <TextWidget
            text={widgetData.timeOfDay.toUpperCase()}
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: '#9ca3af',
              letterSpacing: 1,
            }}
          />
          <TextWidget
            text={new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.gold,
            }}
          />
        </FlexWidget>

        {/* Main Content: Reflection Prompt */}
        {widgetData.contentType === 'morning' ? (
          <MorningContent data={widgetData} colors={colors} />
        ) : (
          <EveningContent data={widgetData} colors={colors} />
        )}

        {/* Spacer */}
        <FlexWidget style={{ flex: 1 }} />

        {/* Stats Section */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            flexGap: 8,
            marginBottom: 12,
          }}
        >
          {/* Streak Stat */}
          <StatBox
            label="Streak"
            value={widgetData.streakCount?.toString() || '0'}
            icon="🔥"
            colors={colors}
          />

          {/* Sessions Stat */}
          <StatBox
            label="This Week"
            value={widgetData.sessionsThisWeek?.toString() || '0'}
            icon="📊"
            colors={colors}
          />

          {/* Mood Trend Stat */}
          <StatBox
            label="Mood"
            value={getMoodEmoji(widgetData.moodTrend)}
            icon=""
            colors={colors}
          />
        </FlexWidget>

        {/* Action Prompt Box */}
        <FlexWidget
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: colors.insightBg,
            borderRadius: 8,
            flexGap: 8,
            marginBottom: 8,
          }}
        >
          <TextWidget
            text={widgetData.actionPrompt || 'Begin your reflection'}
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.text,
            }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={
                widgetData.contentType === 'morning'
                  ? '✨ Begin'
                  : '🌙 Reflect'
              }
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.gold,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Branding Footer */}
        <FlexWidget
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="CoachZeno"
            style={{
              fontSize: 10,
              fontWeight: '500',
              color: '#6b7280',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/**
 * MorningContent Component
 * Displays morning intention prompt with inspirational framing
 */
function MorningContent({
  data,
  colors,
}: {
  data: ReflectionData;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget
      style={{
        flexGap: 12,
        marginBottom: 8,
      }}
    >
      {/* Intention Label */}
      <TextWidget
        text="MORNING INTENTION"
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: colors.gold,
          letterSpacing: 0.5,
        }}
      />

      {/* Main Prompt */}
      <TextWidget
        text={data.mainContent}
        maxLines={3}
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: colors.text,
        }}
      />

      {/* Subtitle */}
      {data.subtitle && (
        <TextWidget
          text={data.subtitle}
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: '#9ca3af',
          }}
        />
      )}
    </FlexWidget>
  );
}

/**
 * EveningContent Component
 * Displays past insight flashback and evening reflection prompt
 */
function EveningContent({
  data,
  colors,
}: {
  data: ReflectionData;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget
      style={{
        flexGap: 12,
        marginBottom: 8,
      }}
    >
      {/* Yesterday's Insight */}
      {data.insight && (
        <FlexWidget
          style={{
            paddingHorizontal: 10,
            paddingVertical: 10,
            backgroundColor: colors.insightBg,
            borderRadius: 6,
            borderLeftWidth: 3,
            borderLeftColor: colors.gold,
            flexGap: 6,
          }}
        >
          <TextWidget
            text="YESTERDAY'S INSIGHT"
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: colors.gold,
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={`"${data.insight}"`}
            maxLines={2}
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: colors.text,
              fontStyle: 'italic',
            }}
          />
        </FlexWidget>
      )}

      {/* Evening Reflection Label */}
      <TextWidget
        text="EVENING REFLECTION"
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: colors.gold,
          letterSpacing: 0.5,
        }}
      />

      {/* Main Prompt */}
      <TextWidget
        text={data.mainContent}
        maxLines={2}
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: colors.text,
        }}
      />

      {/* Subtitle */}
      {data.subtitle && (
        <TextWidget
          text={data.subtitle}
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: '#9ca3af',
          }}
        />
      )}
    </FlexWidget>
  );
}

/**
 * StatBox Component
 * Displays a single stat with icon and label
 */
function StatBox({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: colors.statBg,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 4,
      }}
    >
      {icon && (
        <TextWidget
          text={icon}
          style={{
            fontSize: 14,
          }}
        />
      )}
      <TextWidget
        text={value}
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.gold,
        }}
      />
      <TextWidget
        text={label}
        style={{
          fontSize: 9,
          fontWeight: '500',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  );
}
