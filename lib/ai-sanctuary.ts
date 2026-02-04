// AI Sanctuary Service - Enhanced Coach Personalities
import { generateText } from '@fastshot/ai';
import { Coach, ContextVault, EnhancedMessage, Breakthrough, KeyInsight } from '@/types';

// Distinct personality templates for each coach
const COACH_PERSONALITIES: Record<string, {
  tone: string;
  vocabulary: string[];
  openingPhrases: string[];
  signatureExpressions: string[];
}> = {
  'coach-daily-clarity': {
    tone: 'warm and grounding, like a morning cup of tea',
    vocabulary: ['clarity', 'intention', 'momentum', 'focus', 'present', 'simplify'],
    openingPhrases: [
      'Let\'s bring some clarity to this...',
      'I sense there\'s something underneath this...',
      'Take a breath. What feels most pressing right now?',
    ],
    signatureExpressions: [
      'What would make today feel complete?',
      'Let\'s distill this down to one thing.',
      'Where is your attention being pulled?',
    ],
  },
  'coach-deep-work': {
    tone: 'methodical and strategic, respecting cognitive resources',
    vocabulary: ['deep work', 'shallow tasks', 'cognitive bandwidth', 'flow state', 'distraction-free', 'high-value output'],
    openingPhrases: [
      'Let\'s be strategic about your attention...',
      'Time is your most valuable asset here...',
      'Consider the opportunity cost of distraction...',
    ],
    signatureExpressions: [
      'What would Cal Newport say about this?',
      'Is this deep work or shallow work?',
      'How can we protect this cognitive space?',
    ],
  },
  'coach-systems-builder': {
    tone: 'practical and engineering-minded, focused on elegant simplicity',
    vocabulary: ['system', 'friction', 'automation', 'habit stack', 'environment design', 'SOP'],
    openingPhrases: [
      'Let\'s design a system for this...',
      'Where\'s the friction point here?',
      'How can we make this automatic?',
    ],
    signatureExpressions: [
      'Don\'t rely on willpower—rely on systems.',
      'What\'s the smallest change that creates the biggest impact?',
      'Let\'s eliminate this decision entirely.',
    ],
  },
  'coach-strategic-thinking': {
    tone: 'expansive and philosophical, connecting dots to larger vision',
    vocabulary: ['leverage', 'alignment', 'compound', 'strategic', 'big picture', 'long-term'],
    openingPhrases: [
      'Let\'s zoom out for a moment...',
      'How does this connect to your larger vision?',
      'Consider the 10-year impact of this choice...',
    ],
    signatureExpressions: [
      'Is this moving the needle or just motion?',
      'What would your future self thank you for?',
      'Where\'s the highest leverage here?',
    ],
  },
  'coach-mindset': {
    tone: 'compassionate yet challenging, balancing warmth with growth',
    vocabulary: ['reframe', 'belief', 'possibility', 'growth', 'self-compassion', 'evidence'],
    openingPhrases: [
      'I hear something deeper in what you\'re saying...',
      'Let\'s examine that belief together...',
      'What if we looked at this differently?',
    ],
    signatureExpressions: [
      'What evidence supports that thought?',
      'How would you advise a friend in this situation?',
      'Where did you first learn to think this way?',
    ],
  },
};

// Build enhanced prompt with distinct personality
export function buildEnhancedCoachPrompt(
  coach: Coach,
  userContext: ContextVault | null,
  messages: EnhancedMessage[],
  userMessage: string
): string {
  const personality = COACH_PERSONALITIES[coach.id] || {
    tone: 'warm and professional',
    vocabulary: ['growth', 'progress', 'reflection'],
    openingPhrases: ['Let me help you with that...'],
    signatureExpressions: ['What matters most to you here?'],
  };

  const systemPrompt = `You are ${coach.name}, an elite personal coach with a distinct personality and methodology.

CORE IDENTITY:
${coach.system_prompt}

YOUR UNIQUE VOICE:
- Tone: ${personality.tone}
- Key vocabulary you naturally use: ${personality.vocabulary.join(', ')}
- You often begin responses with phrases like: "${personality.openingPhrases.join('" or "')}"
- Your signature expressions include: "${personality.signatureExpressions.join('" and "')}"

COACHING METHODOLOGY:
${coach.method}

${userContext ? `
INTIMATE KNOWLEDGE OF THIS USER:
- Their core values: ${userContext.values.join(', ') || 'Still discovering'}
- Current goals: ${userContext.goals.map(g => `"${g.title}"${g.is_30_day_focus ? ' (their 30-day focus)' : ''}`).join(', ') || 'Being explored'}
- They have ${userContext.constraints.available_hours_per_day} hours daily for focused work
- Energy level: ${userContext.constraints.energy_level}
- They do their best work in the ${userContext.constraints.best_time_for_focus}
- They prefer a ${userContext.preferences.tone < 33 ? 'gentle, nurturing' : userContext.preferences.tone < 66 ? 'balanced' : 'direct, challenging'} approach
- Response preference: ${userContext.preferences.response_length}
` : ''}

RESPONSE PRINCIPLES:
1. Be present and attentive—this is an intimate mentorship session
2. Use your signature vocabulary and expressions naturally
3. Ask powerful questions that create "aha moments"
4. Guide toward actionable insights, not just conversation
5. When you sense a breakthrough moment, mark it with "💡 INSIGHT:"
6. Keep responses focused but meaningful—respect their time
7. Reference their values and goals when relevant
8. End with a question or clear next step when appropriate

Remember: You are not just answering questions. You are holding space for transformation.`;

  // Build conversation context (last 10 messages for better context)
  const recentMessages = messages.slice(-10);
  const conversationHistory = recentMessages
    .map(m => `${m.role === 'user' ? 'User' : coach.name}: ${m.content}`)
    .join('\n\n');

  return `${systemPrompt}

${conversationHistory ? `CONVERSATION SO FAR:\n${conversationHistory}\n\n` : ''}User: ${userMessage}

Respond as ${coach.name}. Stay in character. Be transformative.`;
}

// Generate AI response with streaming simulation
export async function generateCoachResponse(
  coach: Coach,
  userContext: ContextVault | null,
  messages: EnhancedMessage[],
  userMessage: string
): Promise<string> {
  const prompt = buildEnhancedCoachPrompt(coach, userContext, messages, userMessage);

  try {
    const response = await generateText({ prompt });
    return response;
  } catch (error) {
    console.error('Error generating coach response:', error);
    throw error;
  }
}

// Detect if a message contains an insight
export function detectInsightInMessage(message: string): { hasInsight: boolean; insightContent?: string } {
  // Check for explicit insight markers
  const insightPatterns = [
    /💡\s*INSIGHT:\s*(.+?)(?=\n|$)/i,
    /\*\*INSIGHT\*\*:\s*(.+?)(?=\n|$)/i,
    /Key insight:\s*(.+?)(?=\n|$)/i,
  ];

  for (const pattern of insightPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { hasInsight: true, insightContent: match[1].trim() };
    }
  }

  // Check for implicit insight language
  const implicitInsightPhrases = [
    'the real question is',
    'what I\'m hearing is',
    'underneath this',
    'the breakthrough here',
    'this is significant',
    'notice how',
    'the pattern I see',
  ];

  const lowerMessage = message.toLowerCase();
  for (const phrase of implicitInsightPhrases) {
    if (lowerMessage.includes(phrase)) {
      // Extract the sentence containing the phrase
      const sentences = message.split(/[.!?]+/);
      const insightSentence = sentences.find(s =>
        s.toLowerCase().includes(phrase)
      );
      if (insightSentence) {
        return { hasInsight: true, insightContent: insightSentence.trim() };
      }
    }
  }

  return { hasInsight: false };
}

// Generate session breakthrough summary
export async function generateBreakthroughSummary(
  coach: Coach,
  messages: EnhancedMessage[],
  userContext: ContextVault | null
): Promise<{
  title: string;
  summary: string;
  keyTakeaways: string[];
  actionItems: { id: string; title: string; completed: boolean }[];
} | null> {
  if (messages.length < 4) {
    return null; // Not enough conversation for a breakthrough
  }

  const conversationSummary = messages
    .map(m => `${m.role === 'user' ? 'User' : coach.name}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are analyzing a coaching session to create a "Today's Breakthrough" summary.

COACH: ${coach.name}
METHODOLOGY: ${coach.method}

${userContext ? `
USER CONTEXT:
- Values: ${userContext.values.join(', ')}
- Goals: ${userContext.goals.map(g => g.title).join(', ')}
` : ''}

FULL CONVERSATION:
${conversationSummary}

Generate a breakthrough summary in this exact JSON format:
{
  "title": "A compelling 3-6 word title for today's breakthrough (e.g., 'Embracing Imperfect Action', 'The Power of One Thing')",
  "summary": "An editorial-style 2-3 sentence summary of the key transformation or realization from this session. Write it like a luxury magazine feature—elegant, insightful, memorable.",
  "keyTakeaways": [
    "First key insight or realization (1 sentence)",
    "Second key insight (1 sentence)",
    "Third key insight if applicable (1 sentence)"
  ],
  "actionItems": [
    {"id": "1", "title": "Specific, actionable next step", "completed": false},
    {"id": "2", "title": "Another specific action", "completed": false}
  ]
}

Focus on transformation, not just information. What shifted? What did they see differently?
Return ONLY valid JSON, no additional text.`;

  try {
    const response = await generateText({ prompt });

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Ensure action items have proper IDs
    result.actionItems = (result.actionItems || []).map((item: { title: string; completed?: boolean }, index: number) => ({
      id: `action-${Date.now()}-${index}`,
      title: item.title,
      completed: item.completed || false,
    }));

    return result;
  } catch (error) {
    console.error('Error generating breakthrough summary:', error);
    return {
      title: 'Session Reflection',
      summary: 'A meaningful conversation exploring your goals and potential. The insights from this session will continue to unfold.',
      keyTakeaways: ['Every conversation plants seeds for growth.'],
      actionItems: [
        { id: `action-${Date.now()}`, title: 'Reflect on today\'s conversation', completed: false },
      ],
    };
  }
}

// Generate insight title from content
export async function generateInsightTitle(insightContent: string): Promise<string> {
  const prompt = `Create a short, memorable title (3-5 words) for this insight:

"${insightContent}"

Return ONLY the title, nothing else. Make it elegant and meaningful, like a chapter heading in a luxury self-help book.`;

  try {
    const response = await generateText({ prompt });
    return response.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    return 'Key Insight';
  }
}

// Expand on a specific point for "Reflect Further" feature
export async function expandOnPoint(
  coach: Coach,
  pointContent: string,
  conversationContext: EnhancedMessage[]
): Promise<string> {
  const personality = COACH_PERSONALITIES[coach.id];

  const prompt = `You are ${coach.name}. The user wants to explore this point more deeply:

"${pointContent}"

${personality ? `Remember your voice: ${personality.tone}` : ''}

Recent conversation context:
${conversationContext.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Provide a deeper exploration of this point. Be thoughtful, ask powerful follow-up questions, and help them see new dimensions. Keep it to 2-3 paragraphs max.`;

  try {
    const response = await generateText({ prompt });
    return response;
  } catch (error) {
    console.error('Error expanding point:', error);
    throw error;
  }
}
