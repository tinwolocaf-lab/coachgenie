import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { TodayPlanData } from './widget-storage';

/**
 * TodayPlanWidget - Android Widget (4×4)
 *
 * Displays:
 * - Today's date and plan header
 * - Priority list with completion status
 * - Optional time blocks per priority
 * - Progress summary and focus time
 * - Tap opens the plan screen
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
  urgentBg: '#3a2020',
} as const;

export default function TodayPlanWidget({
  family,
  data,
}: {
  family: string;
  data: TodayPlanData;
}) {
  void family;
  const priorities = data.priorities || [];
  const allDone = data.completedCount === data.totalCount && data.totalCount > 0;

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
        clickActionData={{ uri: 'coachgenie://plan' }}
      >
        {/* Header */}
        <FlexWidget
          style={{
            flexGap: 4,
            marginBottom: 12,
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text="TODAY'S PLAN"
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.gold,
                letterSpacing: 1,
              }}
            />
            <TextWidget
              text={allDone ? '🎉' : '📋'}
              style={{ fontSize: 16 }}
            />
          </FlexWidget>
          <TextWidget
            text={new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.text,
            }}
          />
        </FlexWidget>

        {/* Priority List */}
        <FlexWidget
          style={{
            flex: 1,
            flexGap: 6,
          }}
        >
          {priorities.slice(0, 5).map((priority, index) => (
            <FlexWidget
              key={priority.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: priority.completed ? COLORS.completedBg : COLORS.itemBg,
                borderRadius: 8,
                flexGap: 10,
              }}
              clickAction="TOGGLE_PRIORITY"
              clickActionData={{ priorityId: priority.id }}
            >
              {/* Priority number or checkmark */}
              <FlexWidget
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: priority.completed ? '#22c55e' : COLORS.gold,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <TextWidget
                  text={priority.completed ? '✓' : `${index + 1}`}
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#1a1a2e',
                    textAlign: 'center',
                  }}
                />
              </FlexWidget>

              {/* Priority text & time */}
              <FlexWidget style={{ flex: 1, flexGap: 2 }}>
                <TextWidget
                  text={priority.text}
                  maxLines={1}
                  style={{
                    fontSize: 13,
                    fontWeight: priority.completed ? '400' : '600',
                    color: priority.completed ? '#6b7280' : COLORS.text,
                  }}
                />
                {priority.timeBlock && (
                  <TextWidget
                    text={priority.timeBlock}
                    style={{
                      fontSize: 10,
                      fontWeight: '500',
                      color: '#9ca3af',
                    }}
                  />
                )}
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>

        {/* Summary Row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <FlexWidget style={{ flexGap: 2 }}>
            <TextWidget
              text={allDone ? 'All done for today!' : `${data.completedCount}/${data.totalCount} completed`}
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: allDone ? '#22c55e' : COLORS.text,
              }}
            />
            {data.focusTime !== '0h' && (
              <TextWidget
                text={`Focus time: ${data.focusTime}`}
                style={{
                  fontSize: 10,
                  fontWeight: '400',
                  color: '#9ca3af',
                }}
              />
            )}
          </FlexWidget>
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
