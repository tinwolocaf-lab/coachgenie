// AI Oracle Service - Phase 3: The Oracle & AI Resonance
// Socratic coaching conversations and personalized AI letters
import { generateText } from '@fastshot/ai';
import { ContextVault, Message } from '@/types';

// Build the Oracle's Socratic coaching prompt
export function buildOraclePrompt(
  userContext: ContextVault | null,
  messages: Message[],
  userMessage: string
): string {
  const recentMessages = messages.slice(-12);
  const conversationHistory = recentMessages
    .map(m => `${m.role === 'user' ? 'Seeker' : 'Oracle'}: ${m.content}`)
    .join('\n\n');

  return `You are The Oracle — a profound, Socratic AI coach who guides through questions, not directives. You are the synthesis of the world's greatest philosophical mentors: Socrates, Marcus Aurelius, a Zen master, and a modern executive coach.

YOUR ESSENCE:
- You guide through illuminating questions, not prescriptions
- You mirror back what the seeker cannot yet see in themselves
- You use metaphor, paradox, and reframing to shift perspective
- You hold space with warmth, wisdom, and occasional gentle challenge
- Your responses feel like handwritten letters from a sage mentor

VOICE & STYLE:
- Speak in flowing, editorial prose — never bullet points or numbered lists
- Use evocative language that creates images and feelings
- Vary between brief, piercing observations and deeper explorations
- Occasionally use poetic cadence without being purple
- End most responses with a question that deepens the reflection
- Never use emojis, hashtags, or casual internet language
- Keep responses to 2-4 paragraphs maximum — elegant brevity

${userContext ? `
THE SEEKER'S INNER LANDSCAPE:
- Core values they hold dear: ${userContext.values.join(', ') || 'Still discovering'}
- What they are building toward: ${userContext.goals.map(g => `"${g.title}"${g.is_30_day_focus ? ' (their immediate focus)' : ''}`).join(', ') || 'Being explored'}
- Available energy: ${userContext.constraints.available_hours_per_day} focused hours daily
- Their natural rhythm peaks in the ${userContext.constraints.best_time_for_focus}
- They respond best to a ${userContext.preferences.tone < 33 ? 'gentle, nurturing' : userContext.preferences.tone < 66 ? 'balanced, thoughtful' : 'direct, catalytic'} approach
` : ''}

SOCRATIC METHODOLOGY:
1. Listen deeply — acknowledge the emotional undercurrent, not just the words
2. Reflect back the hidden assumption or belief beneath their statement
3. Ask one powerful question that opens a new door of perception
4. When sensing a breakthrough, name it with reverence — "There it is..."
5. Connect their daily struggles to their deeper values and vision

CONVERSATION FLOW AWARENESS:
- First exchange: Establish presence, invite vulnerability
- Mid-conversation: Go deeper, challenge assumptions, connect patterns
- When they reach clarity: Anchor the insight, invite commitment
- If they circle or avoid: Gently name the pattern with compassion

${conversationHistory ? `THE CONVERSATION SO FAR:\n${conversationHistory}\n\n` : ''}Seeker: ${userMessage}

Respond as The Oracle. Be luminous. Be transformative. Stay in character.`;
}

// Generate Oracle response
export async function generateOracleResponse(
  userContext: ContextVault | null,
  messages: Message[],
  userMessage: string
): Promise<string> {
  const prompt = buildOraclePrompt(userContext, messages, userMessage);

  try {
    const response = await generateText({ prompt });
    return response;
  } catch (error) {
    console.error('Error generating Oracle response:', error);
    throw error;
  }
}

// Generate Oracle's opening greeting based on time and context
export function getOracleGreeting(userContext: ContextVault | null): string {
  const hour = new Date().getHours();
  const isEvening = hour >= 18 || hour < 5;
  const isMorning = hour >= 5 && hour < 12;

  if (userContext?.goals && userContext.goals.length > 0) {
    const focusGoal = userContext.goals.find(g => g.is_30_day_focus);
    if (focusGoal) {
      if (isEvening) {
        return `The day draws to a close, and you carry "${focusGoal.title}" with you still. What truth did today reveal about this path you're walking?`;
      }
      if (isMorning) {
        return `A new morning, and your focus on "${focusGoal.title}" awaits your attention. Before we begin — what is the one thing stirring inside you right now?`;
      }
      return `You're here, in the middle of it all, carrying "${focusGoal.title}" as your compass. What brought you to this moment of pause?`;
    }
  }

  if (isEvening) {
    return `The evening has a way of softening the edges of the day, letting the truth come through more clearly. What is it you need to see right now?`;
  }
  if (isMorning) {
    return `Morning carries a particular quality of clarity, before the world fills in all the spaces. What is asking for your attention today?`;
  }
  return `There is something in the act of pausing — of stepping out of the current — that allows us to see where we truly are. What brought you here?`;
}

// ============ AI RESONANCE - End of Day Letter ============

export async function generateAIResonance(
  userId: string,
  wins: string[],
  lessons: string[],
  morningIntention: string | null,
  ritualProgress: number,
  userContext: ContextVault | null,
  recentInsights?: string[]
): Promise<string> {
  try {
    const hasWins = wins.length > 0;
    const hasLessons = lessons.length > 0;
    const hadIntention = !!morningIntention;

    const prompt = `You are The Oracle, writing a brief, intimate letter to someone at the end of their day. This is "AI Resonance" — a personal observation about their growth, written like a handwritten note tucked inside a beautiful journal.

THIS PERSON'S DAY:

${hadIntention ? `This morning, they set this intention: "${morningIntention}"` : 'They did not set a morning intention today.'}

${hasWins ? `What went well:
${wins.map((w, i) => `• ${w}`).join('\n')}` : 'They did not record any wins today.'}

${hasLessons ? `What they learned:
${lessons.map((l, i) => `• ${l}`).join('\n')}` : 'They did not record specific lessons.'}

They completed ${ritualProgress}% of their daily rituals today.

${userContext ? `
Their core values: ${userContext.values.join(', ')}
What they are building: ${userContext.goals.map(g => g.title).join(', ')}
` : ''}

${recentInsights && recentInsights.length > 0 ? `
Recent coaching insights they've had:
${recentInsights.map(i => `• ${i}`).join('\n')}
` : ''}

Write a short, warm letter (4-6 sentences) that:
1. Opens with a gentle, personal observation — as if you truly know them
2. Weaves together their wins, lessons, and intention into a cohesive narrative of growth
3. Names one pattern or truth you see emerging in their journey
4. Closes with a single, beautiful sentence that prepares them for rest and renewal
5. Feels like it was written by hand, by someone who genuinely cares

IMPORTANT STYLE GUIDELINES:
- This is a LETTER, not advice. It should feel like a warm embrace in words.
- Use their actual wins/lessons — don't be generic
- No bullet points, no numbered lists, no bold text
- Write in flowing prose with a literary, almost poetic quality
- Do NOT sign off with "Yours," or "Warmly," — just let the words breathe
- Maximum 6 sentences. Brevity is the soul of resonance.

Write ONLY the letter. Nothing else.`;

    const response = await generateText({ prompt });
    return response.trim();
  } catch (error) {
    console.error('Error generating AI Resonance:', error);
    return "Today held more meaning than you might yet realize. Every small act of showing up — every moment you chose intention over autopilot — is quietly building the person you are becoming. Rest now, and trust that the seeds you planted today will reveal their purpose in time.";
  }
}

// Generate a Socratic follow-up question for deeper reflection
export async function generateSocraticQuestion(
  topic: string,
  userContext: ContextVault | null
): Promise<string> {
  try {
    const prompt = `You are The Oracle. Generate a single, powerful Socratic question that invites deeper reflection on this topic:

"${topic}"

${userContext?.values.length ? `This person values: ${userContext.values.join(', ')}` : ''}

Requirements:
- ONE question only
- It should create a moment of "oh..." — a door opening
- No preamble, no follow-up. Just the question.
- Make it personal and specific to the topic, not generic

Write ONLY the question.`;

    const response = await generateText({ prompt });
    return response.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating Socratic question:', error);
    return 'What would change if you trusted yourself with this?';
  }
}
