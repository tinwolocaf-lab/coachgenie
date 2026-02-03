// AI Coaching Service - Artifacts Generation
import { generateText } from '@fastshot/ai';
import { ContextVault, Coach, Message, SessionResult, DayPlan, Priority, TimeBlock } from '@/types';

// Generate session summary and artifacts from conversation
export async function generateSessionArtifacts(
  messages: Message[],
  coach: Coach,
  userContext: ContextVault | null
): Promise<SessionResult> {
  // Build conversation summary
  const conversationSummary = messages
    .slice(-20) // Last 20 messages for context
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  // Generate artifacts prompt
  const artifactsPrompt = `You are an AI assistant that analyzes coaching sessions and extracts actionable artifacts.

COACHING SESSION CONTEXT:
- Coach: ${coach.name}
- Coach Method: ${coach.method}
${userContext ? `
USER CONTEXT:
- Values: ${userContext.values.join(', ')}
- Goals: ${userContext.goals.map(g => g.title + (g.is_30_day_focus ? ' (30-day focus)' : '')).join(', ')}
- Available time: ${userContext.constraints.available_hours_per_day} hours/day
- Best focus time: ${userContext.constraints.best_time_for_focus}
` : ''}

CONVERSATION:
${conversationSummary}

Generate a JSON response with the following structure:
{
  "summary": "A 2-3 sentence executive summary of the session highlights and key insights",
  "next_actions": [
    {"id": "1", "title": "Specific actionable task from the session", "completed": false},
    {"id": "2", "title": "Another specific task", "completed": false},
    {"id": "3", "title": "Third task if applicable", "completed": false}
  ],
  "plan_updates": [
    {
      "date": "YYYY-MM-DD",
      "priorities": [
        {"id": "1", "title": "Priority 1 for this day", "completed": false, "order": 1},
        {"id": "2", "title": "Priority 2 for this day", "completed": false, "order": 2},
        {"id": "3", "title": "Priority 3 for this day", "completed": false, "order": 3}
      ],
      "time_blocks": [
        {"id": "1", "start_time": "09:00", "end_time": "11:00", "title": "Deep Work Block", "category": "focus"},
        {"id": "2", "start_time": "14:00", "end_time": "15:00", "title": "Meeting Prep", "category": "planning"}
      ]
    }
  ]
}

Generate plan_updates for the next 7 days starting from today (${new Date().toISOString().split('T')[0]}).
Ensure actions are specific, measurable, and directly derived from the conversation.
Return ONLY valid JSON, no additional text.`;

  try {
    const response = await generateText({ prompt: artifactsPrompt });

    // Parse the JSON response
    let artifacts: SessionResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        artifacts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse artifacts JSON:', parseError);
      // Return default artifacts on parse failure
      artifacts = getDefaultArtifacts();
    }

    return artifacts;
  } catch (error) {
    console.error('Error generating artifacts:', error);
    return getDefaultArtifacts();
  }
}

// Generate a complete 7-day plan
export async function generate7DayPlan(
  userContext: ContextVault | null,
  coach: Coach,
  existingPlan?: DayPlan[]
): Promise<DayPlan[]> {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  const existingPlanSummary = existingPlan?.length
    ? `\nEXISTING PLAN CONTEXT:\n${existingPlan.map(p =>
        `${p.date}: ${p.top_priorities.map(pr => pr.title).join(', ')}`
      ).join('\n')}`
    : '';

  const planPrompt = `You are a productivity coach creating a 7-day action plan.

${userContext ? `
USER CONTEXT:
- Core Values: ${userContext.values.join(', ')}
- Goals: ${userContext.goals.map(g => `${g.title}${g.is_30_day_focus ? ' (30-day focus)' : ''}`).join(', ')}
- Available time: ${userContext.constraints.available_hours_per_day} hours/day
- Energy level: ${userContext.constraints.energy_level}
- Best focus time: ${userContext.constraints.best_time_for_focus}
` : ''}

COACH APPROACH: ${coach.method}
${existingPlanSummary}

Create a 7-day plan for dates: ${dates.join(', ')}

Return ONLY a JSON array:
[
  {
    "date": "YYYY-MM-DD",
    "top_priorities": [
      {"id": "1", "title": "Specific priority", "completed": false, "order": 1},
      {"id": "2", "title": "Another priority", "completed": false, "order": 2},
      {"id": "3", "title": "Third priority", "completed": false, "order": 3}
    ],
    "time_blocks": [
      {"id": "1", "start_time": "09:00", "end_time": "11:00", "title": "Activity", "category": "focus"}
    ]
  }
]

Guidelines:
- Each day should have exactly 3 priorities
- Time blocks should align with user's best focus time (${userContext?.constraints.best_time_for_focus || 'morning'})
- Priorities should progress toward goals
- Be specific and actionable
- Return ONLY valid JSON array, no additional text.`;

  try {
    const response = await generateText({ prompt: planPrompt });

    // Parse the JSON response
    let planData: Array<{
      date: string;
      top_priorities: Priority[];
      time_blocks: TimeBlock[];
    }>;

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (parseError) {
      console.error('Failed to parse plan JSON:', parseError);
      return getDefault7DayPlan(dates);
    }

    // Transform to DayPlan format
    return planData.map(day => ({
      id: `plan-${day.date}-${Date.now()}`,
      user_id: userContext?.user_id || 'local-user',
      date: day.date,
      top_priorities: day.top_priorities,
      time_blocks: day.time_blocks || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error generating 7-day plan:', error);
    return getDefault7DayPlan(dates);
  }
}

// Default artifacts when generation fails
function getDefaultArtifacts(): SessionResult {
  return {
    summary: 'Session completed. Review the conversation for key insights and action items.',
    next_actions: [
      { id: '1', title: 'Review session notes and key takeaways', completed: false },
      { id: '2', title: 'Identify one small win to accomplish today', completed: false },
      { id: '3', title: 'Schedule next check-in with your coach', completed: false },
    ],
    plan_updates: [],
  };
}

// Default 7-day plan when generation fails
function getDefault7DayPlan(dates: string[]): DayPlan[] {
  return dates.map((date, index) => ({
    id: `plan-${date}-${Date.now()}`,
    user_id: 'local-user',
    date,
    top_priorities: [
      { id: '1', title: 'Define your top priority for the day', completed: false, order: 1 },
      { id: '2', title: 'Complete one focused work session', completed: false, order: 2 },
      { id: '3', title: 'Review progress and plan tomorrow', completed: false, order: 3 },
    ],
    time_blocks: index === 0 ? [
      { id: '1', start_time: '09:00', end_time: '11:00', title: 'Deep Work Block', category: 'focus' },
      { id: '2', start_time: '14:00', end_time: '15:00', title: 'Planning & Review', category: 'planning' },
    ] : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

// Build a comprehensive coaching prompt
export function buildCoachingPrompt(
  coach: Coach,
  userContext: ContextVault | null,
  conversationHistory: Message[],
  userMessage: string
): string {
  let systemPrompt = coach.system_prompt;

  // Add user context if available
  if (userContext) {
    systemPrompt += `

USER CONTEXT (Use this to personalize your responses):
- Core Values: ${userContext.values.join(', ') || 'Not specified'}
- Goals: ${userContext.goals.map(g => g.title + (g.is_30_day_focus ? ' (30-day focus)' : '')).join(', ') || 'Not specified'}
- Available focus time: ${userContext.constraints.available_hours_per_day} hours/day
- Energy level: ${userContext.constraints.energy_level}
- Best time for focus: ${userContext.constraints.best_time_for_focus}
- Preferred tone: ${userContext.preferences.tone < 33 ? 'gentle' : userContext.preferences.tone < 66 ? 'balanced' : 'direct'}
- Preferred approach: ${userContext.preferences.directness < 33 ? 'nurturing' : userContext.preferences.directness < 66 ? 'balanced' : 'challenging'}
- Response length: ${userContext.preferences.response_length}`;
  }

  // Add coaching guidelines
  systemPrompt += `

RESPONSE GUIDELINES:
1. Be concise but warm - respect the user's time
2. Ask clarifying questions when needed
3. Guide toward actionable next steps
4. Reference user context when relevant
5. End with a clear question or action when appropriate`;

  // Build conversation context
  const recentMessages = conversationHistory.slice(-8);
  const conversationContext = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  return `${systemPrompt}

RECENT CONVERSATION:
${conversationContext}

User: ${userMessage}

Respond as the coach. Be helpful, focused, and actionable.`;
}
