// AI Rituals Service - Phase 5: The Practice
// AI-powered features for morning intentions, evening audits, and editorial nudges
import { generateText } from '@fastshot/ai';
import {
  DailyReflection,
  GrowthChapter,
  Ritual,
  RitualWithStatus,
  ContextVault,
  MORNING_PROMPTS,
  EVENING_PROMPTS,
} from '@/types';
import { getGrowthChapters, createNudge } from '@/lib/supabase-rituals';

// ============ MORNING INTENTION ============

export function getMorningPrompt(
  userContext: ContextVault | null,
  activeChapter: GrowthChapter | null
): string {
  // Prioritize chapter-aligned prompts
  if (activeChapter) {
    const chapterPrompts = [
      `As you work toward "${activeChapter.title}", what's the one thing that would move you forward today?`,
      `Thinking about your vision for "${activeChapter.title}", what intention will guide your actions today?`,
      `What small step toward "${activeChapter.title}" would make today meaningful?`,
    ];
    return chapterPrompts[Math.floor(Math.random() * chapterPrompts.length)];
  }

  // Fall back to value-aligned prompts
  if (userContext && userContext.values.length > 0) {
    const value = userContext.values[Math.floor(Math.random() * userContext.values.length)];
    return `As someone who values ${value}, what is the one thing that would make today a success?`;
  }

  // Default prompts
  return MORNING_PROMPTS[Math.floor(Math.random() * MORNING_PROMPTS.length)];
}

// ============ DAILY MUSE - AI Coaching Prompt ============

export async function generateDailyMuse(
  intention: string,
  userContext: ContextVault | null,
  activeChapter: GrowthChapter | null
): Promise<string> {
  try {
    const prompt = `You are a world-class executive coach and philosopher. A person has just set their morning intention for today. Based on their intention, generate a single "Daily Muse" — one elegant, thought-provoking sentence that serves as a coaching nudge for the day.

THEIR MORNING INTENTION: "${intention}"

${activeChapter ? `Their current growth focus: "${activeChapter.title}"` : ''}
${userContext && userContext.values.length > 0 ? `Their core values: ${userContext.values.join(', ')}` : ''}

Requirements:
- ONE sentence only, maximum 20 words
- It should feel like a handwritten note from a wise mentor
- It should be deeply insightful, not generic or cliché
- It should connect to their specific intention
- Tone: warm yet provocative, like something you'd find written inside a Moleskine notebook
- Do NOT use quotation marks or attribute it to anyone
- Do NOT start with "Remember" or "Today"

Examples of great Daily Muse sentences:
- "The space between knowing and doing is where your real growth lives."
- "What you resist this morning is exactly what deserves your attention."
- "Mastery isn't about perfection — it's about returning to the work with fresh eyes."

Write ONLY the one-sentence Daily Muse, nothing else.`;

    const response = await generateText({ prompt });
    return response.trim().replace(/^["']|["']$/g, ''); // Remove any wrapping quotes
  } catch (error) {
    console.error('Error generating Daily Muse:', error);
    // Elegant fallback
    const fallbacks = [
      'The most powerful thing you can do today is begin.',
      'Your intention is the compass — trust where it points.',
      'What feels difficult today is building the person you need tomorrow.',
      'Clarity comes not from thinking more, but from doing the next right thing.',
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// ============ EVENING AUDIT AI ANALYSIS ============

export async function generateClosingThought(
  userId: string,
  wins: string[],
  lessons: string[],
  morningIntention: string | null,
  ritualProgress: number,
  userContext: ContextVault | null
): Promise<string> {
  try {
    const hasWins = wins.length > 0;
    const hasLessons = lessons.length > 0;
    const hadMorningIntention = !!morningIntention;

    const prompt = `You are a sophisticated, warm life coach providing a closing thought for someone's day. Think of this like the ending of a beautiful letter - personal, insightful, and gently encouraging.

TODAY'S EVENING REFLECTION:

${hadMorningIntention ? `Morning Intention: "${morningIntention}"` : 'No morning intention was set.'}

${hasWins ? `
Wins/Accomplishments:
${wins.map((w, i) => `${i + 1}. ${w}`).join('\n')}
` : 'No wins were logged.'}

${hasLessons ? `
Lessons/Learnings:
${lessons.map((l, i) => `${i + 1}. ${l}`).join('\n')}
` : 'No lessons were logged.'}

Ritual Completion: ${ritualProgress}% of daily rituals completed

${userContext ? `
User's Core Values: ${userContext.values.join(', ')}
Current Goals: ${userContext.goals.map(g => g.title).join(', ')}
` : ''}

Write a closing thought that:
1. Acknowledges the specific wins or lessons if any
2. Connects to their morning intention if they had one
3. Offers a gentle, elegant perspective on the day
4. Ends with something warm that sets them up for tomorrow
5. Is 2-3 sentences max, never preachy

Example tone: "Today you proved that showing up matters more than perfection. Your ${ritualProgress}% completion tells a story of consistency, not of missing targets. Rest well—tomorrow will have its own gifts."

Write ONLY the closing thought, nothing else.`;

    const response = await generateText({ prompt });
    return response.trim();
  } catch (error) {
    console.error('Error generating closing thought:', error);
    return "Every day carries its own lessons. Rest well, and trust that each step forward—no matter how small—is meaningful.";
  }
}

// ============ EDITORIAL NUDGES ============

export async function generateAlignmentNudge(
  userId: string,
  rituals: RitualWithStatus[],
  chapters: GrowthChapter[],
  userContext: ContextVault | null
): Promise<{ title: string; content: string } | null> {
  try {
    if (chapters.length === 0 || rituals.length === 0) return null;

    const primaryChapter = chapters.find(c => c.is_primary) || chapters[0];
    const linkedRituals = rituals.filter(r => r.linked_chapter_id === primaryChapter.id);
    const unlinkedRituals = rituals.filter(r => !r.linked_chapter_id);

    // Only nudge if there's something meaningful to say
    if (unlinkedRituals.length === 0 && linkedRituals.length > 0) {
      return null; // All rituals are aligned
    }

    const prompt = `You are a thoughtful coach providing a gentle "alignment nudge" - a notification checking if someone's daily habits support their bigger goals.

ACTIVE GROWTH CHAPTER: "${primaryChapter.title}"
Vision: ${primaryChapter.vision || 'Not specified'}

CURRENT DAILY RITUALS:
${rituals.map(r => `- ${r.title}${r.linked_chapter_id === primaryChapter.id ? ' (linked to chapter)' : ''}`).join('\n')}

${userContext ? `User's values: ${userContext.values.join(', ')}` : ''}

Write a brief, thoughtful nudge that:
1. Gently asks if their daily rituals are serving their bigger vision
2. Is NOT preachy or judgmental
3. Feels like a wise friend checking in
4. Is 2 sentences max

Return JSON: {"title": "Short title (3-5 words)", "content": "The gentle nudge message"}

Return ONLY valid JSON.`;

    const response = await generateText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating alignment nudge:', error);
    return null;
  }
}

export async function generateEncouragementNudge(
  userId: string,
  currentStreak: number,
  completionRate: number,
  trend: 'up' | 'down' | 'stable'
): Promise<{ title: string; content: string } | null> {
  try {
    const prompt = `You are a sophisticated coach providing gentle encouragement via a notification.

USER'S PROGRESS:
- Current streak: ${currentStreak} days
- Recent completion rate: ${completionRate}%
- Trend: ${trend === 'up' ? 'improving' : trend === 'down' ? 'declining slightly' : 'steady'}

Write an encouraging nudge that:
1. Celebrates consistency over perfection
2. Is warm but not over-the-top
3. Acknowledges their specific progress
4. Is 2 sentences max

${currentStreak >= 7 ? "Note: This is a significant streak worth celebrating." : ""}
${trend === 'down' ? "Note: Be extra gentle - they may be struggling." : ""}

Return JSON: {"title": "Short title (3-5 words)", "content": "The encouraging message"}

Return ONLY valid JSON.`;

    const response = await generateText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating encouragement nudge:', error);
    return null;
  }
}

export async function generateMilestoneNudge(
  milestoneName: string,
  chapterName: string,
  totalMilestones: number,
  completedMilestones: number
): Promise<{ title: string; content: string } | null> {
  try {
    const progress = Math.round((completedMilestones / totalMilestones) * 100);

    const prompt = `You are celebrating someone completing a milestone in their growth journey.

COMPLETED MILESTONE: "${milestoneName}"
GROWTH CHAPTER: "${chapterName}"
PROGRESS: ${completedMilestones}/${totalMilestones} milestones (${progress}%)

Write a celebration nudge that:
1. Celebrates this specific achievement
2. Acknowledges progress toward the bigger chapter
3. Is elegant and not cheesy
4. Is 2 sentences max

Return JSON: {"title": "Short celebratory title (3-5 words)", "content": "The celebration message"}

Return ONLY valid JSON.`;

    const response = await generateText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating milestone nudge:', error);
    return null;
  }
}

// ============ RITUAL SUGGESTION FROM INSIGHT ============

export async function suggestRitualFromInsight(
  insightTitle: string,
  insightContent: string,
  existingRituals: Ritual[]
): Promise<{ title: string; description: string } | null> {
  try {
    const prompt = `Based on this coaching insight, suggest a daily ritual/habit that would help put it into practice.

INSIGHT: "${insightTitle}"
${insightContent}

EXISTING RITUALS (avoid duplicates):
${existingRituals.map(r => `- ${r.title}`).join('\n') || 'None yet'}

Suggest ONE specific, actionable daily ritual that:
1. Directly stems from this insight
2. Is something that can be done in 5-15 minutes
3. Is specific enough to be actionable
4. Is different from existing rituals

Return JSON: {"title": "Short ritual name (2-5 words)", "description": "Brief description of what to do (1-2 sentences)"}

Return ONLY valid JSON.`;

    const response = await generateText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error suggesting ritual from insight:', error);
    return null;
  }
}

// ============ WEEKLY REFLECTION SYNTHESIS ============

export async function synthesizeWeeklyProgress(
  userId: string,
  reflections: DailyReflection[],
  ritualProgress: number[],
  userContext: ContextVault | null
): Promise<{
  summary: string;
  topWins: string[];
  topLessons: string[];
  suggestion: string;
} | null> {
  try {
    const allWins = reflections.flatMap(r => r.wins || []);
    const allLessons = reflections.flatMap(r => r.lessons || []);
    const avgProgress = ritualProgress.length > 0
      ? Math.round(ritualProgress.reduce((a, b) => a + b, 0) / ritualProgress.length)
      : 0;

    const prompt = `Synthesize a week's worth of daily reflections into a brief, elegant summary.

WEEKLY DATA:
- ${reflections.length} reflection entries
- Average ritual completion: ${avgProgress}%
- All wins logged: ${allWins.join('; ') || 'None recorded'}
- All lessons logged: ${allLessons.join('; ') || 'None recorded'}

${userContext ? `User's values: ${userContext.values.join(', ')}` : ''}

Create a synthesis with:
1. A 2-3 sentence elegant summary of the week
2. Top 3 wins (consolidated if similar)
3. Top 3 lessons (consolidated if similar)
4. One gentle suggestion for next week

Return JSON:
{
  "summary": "Elegant 2-3 sentence week summary",
  "topWins": ["Win 1", "Win 2", "Win 3"],
  "topLessons": ["Lesson 1", "Lesson 2", "Lesson 3"],
  "suggestion": "One gentle suggestion for next week"
}

Return ONLY valid JSON.`;

    const response = await generateText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error synthesizing weekly progress:', error);
    return null;
  }
}

// ============ CHAPTER VISION ENHANCEMENT ============

export async function enhanceChapterVision(
  title: string,
  initialVision: string,
  whyItMatters: string,
  userContext: ContextVault | null
): Promise<{
  enhancedVision: string;
  suggestedMilestones: string[];
  suggestedRituals: string[];
} | null> {
  try {
    const prompt = `Help someone clarify and expand their growth chapter vision.

GROWTH CHAPTER: "${title}"
Their Vision: ${initialVision || 'Not yet defined'}
Why It Matters: ${whyItMatters || 'Not yet defined'}

${userContext ? `
Their values: ${userContext.values.join(', ')}
Their goals: ${userContext.goals.map(g => g.title).join(', ')}
` : ''}

Create:
1. An enhanced, more vivid version of their vision (2-3 sentences)
2. 3-5 suggested milestones to achieve this chapter
3. 2-3 suggested daily rituals that would support this chapter

Return JSON:
{
  "enhancedVision": "The enhanced, vivid vision statement",
  "suggestedMilestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
  "suggestedRituals": ["Ritual 1", "Ritual 2"]
}

Return ONLY valid JSON.`;

    const response = await generateText({ prompt });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error enhancing chapter vision:', error);
    return null;
  }
}

// ============ AUTO-GENERATE NUDGES (Called periodically) ============

export async function maybeGenerateNudge(
  userId: string,
  rituals: RitualWithStatus[],
  currentStreak: number,
  completionRate: number,
  trend: 'up' | 'down' | 'stable',
  userContext: ContextVault | null
): Promise<void> {
  try {
    // Get chapters
    const chapters = await getGrowthChapters(userId, 'active');

    // Randomly decide which type of nudge to attempt (to avoid overwhelming)
    const random = Math.random();

    if (random < 0.4 && currentStreak >= 3) {
      // 40% chance: Encouragement nudge (if streak is going)
      const nudge = await generateEncouragementNudge(userId, currentStreak, completionRate, trend);
      if (nudge) {
        await createNudge(userId, {
          nudge_type: 'encouragement',
          title: nudge.title,
          content: nudge.content,
        });
      }
    } else if (random < 0.7 && chapters.length > 0) {
      // 30% chance: Alignment nudge
      const nudge = await generateAlignmentNudge(userId, rituals, chapters, userContext);
      if (nudge) {
        await createNudge(userId, {
          nudge_type: 'alignment',
          title: nudge.title,
          content: nudge.content,
          related_chapter_id: chapters[0].id,
        });
      }
    }
    // 30% chance: No nudge (gives user breathing room)
  } catch (error) {
    console.error('Error generating automatic nudge:', error);
  }
}
