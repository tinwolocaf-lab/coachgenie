// AI Archive Service - Synthesis & History Query Features
import { generateText } from '@fastshot/ai';
import {
  EnhancedSession,
  KeyInsight,
  Breakthrough,
  ContextVault,
} from '@/types';
import {
  MonthlySynthesis,
  ThemeItem,
  PatternItem,
  CoachContribution,
  QuerySource,
  getMonthlyData,
  saveMonthlySynthesis,
  saveHistoryQuery,
  searchAllContent,
} from '@/lib/supabase-archive';
import { getCoachById } from '@/data/coaches';

// ============ MONTHLY SYNTHESIS GENERATION ============

export async function generateMonthlySynthesis(
  userId: string,
  monthYear: string,
  userContext: ContextVault | null
): Promise<MonthlySynthesis | null> {
  try {
    // Fetch all data for the month
    const { sessions, insights, breakthroughs } = await getMonthlyData(userId, monthYear);

    if (sessions.length === 0 && insights.length === 0 && breakthroughs.length === 0) {
      return null; // No data to synthesize
    }

    // Build context for AI
    const sessionsContext = sessions.map(s => ({
      title: s.title,
      coachId: s.coach_id,
      summary: s.summary,
      breakthrough: s.breakthrough_summary,
      date: s.created_at,
    }));

    const insightsContext = insights.map(i => ({
      title: i.title,
      content: i.content,
      category: i.category,
      coach: i.coach_id,
    }));

    const breakthroughsContext = breakthroughs.map(b => ({
      title: b.title,
      summary: b.summary,
      takeaways: b.key_takeaways,
      date: b.date,
    }));

    // Calculate coach contributions
    const coachContributions: Record<string, CoachContribution> = {};
    sessions.forEach(s => {
      if (!coachContributions[s.coach_id]) {
        const coach = getCoachById(s.coach_id);
        coachContributions[s.coach_id] = {
          coachId: s.coach_id,
          coachName: coach?.name || s.coach_id,
          sessionCount: 0,
          insightCount: 0,
        };
      }
      coachContributions[s.coach_id].sessionCount++;
    });

    insights.forEach(i => {
      if (coachContributions[i.coach_id]) {
        coachContributions[i.coach_id].insightCount++;
      }
    });

    const [year, month] = monthYear.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });

    const prompt = `You are a master editor creating a monthly synthesis report for a premium coaching journal app. This is like a luxury magazine's "Year in Review" but for one month of personal growth.

USER CONTEXT:
${userContext ? `
- Core values: ${userContext.values.join(', ')}
- Current goals: ${userContext.goals.map(g => g.title).join(', ')}
` : 'User is on their personal growth journey.'}

DATA FOR ${monthName} ${year}:

COACHING SESSIONS (${sessions.length} total):
${JSON.stringify(sessionsContext, null, 2)}

KEY INSIGHTS (${insights.length} total):
${JSON.stringify(insightsContext, null, 2)}

BREAKTHROUGHS (${breakthroughs.length} total):
${JSON.stringify(breakthroughsContext, null, 2)}

Generate a synthesis report in this exact JSON format:
{
  "title": "An elegant, magazine-worthy title for this month (e.g., 'The Month of Clarity', 'Finding Your Edge')",
  "executive_summary": "A beautifully written 3-4 sentence editorial summary of the month's journey. Write it like a luxury magazine feature - sophisticated, insightful, and personal.",
  "key_themes": [
    {"name": "Theme name (1-3 words)", "frequency": <number of times this theme appeared>, "relatedInsights": ["Brief insight 1", "Brief insight 2"]},
    {"name": "Another theme", "frequency": <count>, "relatedInsights": ["insight"]}
  ],
  "growth_areas": [
    "Area where the user showed significant growth",
    "Another growth observation"
  ],
  "patterns_identified": [
    {"pattern": "Observed pattern name", "observation": "What you noticed", "recommendation": "Suggestion for next month"},
    {"pattern": "Another pattern", "observation": "...", "recommendation": "..."}
  ]
}

Focus on transformation and growth, not just activity. What shifted? What themes emerged? What breakthroughs were most significant?
Return ONLY valid JSON, no additional text.`;

    const response = await generateText({ prompt });

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Build and save the synthesis
    const synthesis: Omit<MonthlySynthesis, 'id' | 'created_at'> = {
      user_id: userId,
      month_year: monthYear,
      title: result.title || `${monthName} ${year} Synthesis`,
      executive_summary: result.executive_summary || 'A month of continued growth and discovery.',
      key_themes: result.key_themes || [],
      growth_areas: result.growth_areas || [],
      patterns_identified: result.patterns_identified || [],
      coach_contributions: coachContributions,
      breakthrough_count: breakthroughs.length,
      insight_count: insights.length,
      session_count: sessions.length,
    };

    const saved = await saveMonthlySynthesis(synthesis);
    return saved;
  } catch (error) {
    console.error('Error generating monthly synthesis:', error);
    return null;
  }
}

// ============ ASK YOUR HISTORY FEATURE ============

export async function askYourHistory(
  userId: string,
  query: string,
  userContext: ContextVault | null
): Promise<{
  answer: string;
  sources: QuerySource[];
} | null> {
  try {
    // Extract key terms from the query for search
    const searchTerms = extractSearchTerms(query);

    // Search all content
    const searchResults = await searchAllContent(userId, searchTerms);
    const { sessions, insights, breakthroughs } = searchResults;

    if (sessions.length === 0 && insights.length === 0 && breakthroughs.length === 0) {
      return {
        answer: "I couldn't find any relevant content in your history that matches this query. Try asking about a specific coach, topic, or time period you've discussed before.",
        sources: [],
      };
    }

    // Build context for AI
    const relevantContent = buildRelevantContext(sessions, insights, breakthroughs);

    const prompt = `You are a helpful assistant with access to the user's complete coaching history. They are asking a question about their past sessions and insights.

USER'S QUESTION: "${query}"

${userContext ? `
USER CONTEXT:
- Core values: ${userContext.values.join(', ')}
- Current goals: ${userContext.goals.map(g => g.title).join(', ')}
` : ''}

RELEVANT CONTENT FROM THEIR HISTORY:

${relevantContent.context}

Based on this history, answer the user's question. Be specific and cite relevant sessions or insights when possible. If the query asks about a specific coach's advice, focus on content from that coach.

Important:
- Be conversational and warm, like a thoughtful friend with a perfect memory
- Reference specific dates or sessions when relevant
- If the answer isn't clearly in the history, say so honestly
- Keep the response concise but complete (2-4 paragraphs max)

Respond naturally, as if you're having a conversation with them about their growth journey.`;

    const response = await generateText({ prompt });

    // Save the query and response
    await saveHistoryQuery(userId, query, response, relevantContent.sources);

    return {
      answer: response,
      sources: relevantContent.sources,
    };
  } catch (error) {
    console.error('Error in Ask Your History:', error);
    return null;
  }
}

// Helper: Extract search terms from natural language query
function extractSearchTerms(query: string): string {
  // Remove common words and extract key terms
  const stopWords = ['what', 'did', 'does', 'the', 'about', 'how', 'when', 'where', 'who', 'which', 'my', 'me', 'i', 'a', 'an', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'say', 'said', 'suggest', 'suggested', 'tell', 'told', 'ask', 'asked'];

  const words = query.toLowerCase()
    .replace(/[?.,!]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word));

  // Return the most significant terms (max 5)
  return words.slice(0, 5).join(' ');
}

// Helper: Build relevant context from search results
function buildRelevantContext(
  sessions: EnhancedSession[],
  insights: KeyInsight[],
  breakthroughs: Breakthrough[]
): { context: string; sources: QuerySource[] } {
  const sources: QuerySource[] = [];
  let context = '';

  if (sessions.length > 0) {
    context += 'COACHING SESSIONS:\n';
    sessions.slice(0, 10).forEach(s => {
      const coach = getCoachById(s.coach_id);
      const date = new Date(s.created_at).toLocaleDateString();
      context += `\n[${date}] Session with ${coach?.name || s.coach_id}: "${s.title}"\n`;
      if (s.summary) context += `Summary: ${s.summary}\n`;
      if (s.breakthrough_summary) context += `Breakthrough: ${s.breakthrough_summary}\n`;

      sources.push({
        type: 'session',
        id: s.id,
        title: s.title,
        date: s.created_at,
      });
    });
  }

  if (insights.length > 0) {
    context += '\n\nKEY INSIGHTS:\n';
    insights.slice(0, 15).forEach(i => {
      const coach = getCoachById(i.coach_id);
      const date = new Date(i.created_at).toLocaleDateString();
      context += `\n[${date}] "${i.title}" (from ${coach?.name || i.coach_id}):\n${i.content}\n`;

      sources.push({
        type: 'insight',
        id: i.id,
        title: i.title,
        date: i.created_at,
      });
    });
  }

  if (breakthroughs.length > 0) {
    context += '\n\nBREAKTHROUGHS:\n';
    breakthroughs.slice(0, 10).forEach(b => {
      const coach = getCoachById(b.coach_id);
      context += `\n[${b.date}] "${b.title}" (with ${coach?.name || b.coach_id}):\n${b.summary}\n`;
      if (b.key_takeaways && b.key_takeaways.length > 0) {
        context += `Key takeaways: ${b.key_takeaways.join(', ')}\n`;
      }

      sources.push({
        type: 'breakthrough',
        id: b.id,
        title: b.title,
        date: b.date,
      });
    });
  }

  return { context, sources };
}

// ============ AUTO-THEME DETECTION ============

export async function detectInsightThemes(
  insights: KeyInsight[]
): Promise<ThemeItem[]> {
  if (insights.length < 3) return [];

  try {
    const insightSummaries = insights.slice(0, 50).map(i => ({
      title: i.title,
      content: i.content.substring(0, 200),
      category: i.category,
    }));

    const prompt = `Analyze these insights from a coaching app and identify the 3-5 most prominent themes.

INSIGHTS:
${JSON.stringify(insightSummaries, null, 2)}

Return a JSON array of themes:
[
  {"name": "Theme name (1-3 words, e.g., 'Leadership Growth', 'Mindset Shift')", "frequency": <estimated count of related insights>, "relatedInsights": ["Brief quote or title 1", "Brief quote 2"]},
  ...
]

Focus on meaningful personal growth themes like: Leadership, Mindset, Focus, Systems, Relationships, Career, Health, Creativity, etc.
Return ONLY valid JSON array.`;

    const response = await generateText({ prompt });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const themes = JSON.parse(jsonMatch[0]) as ThemeItem[];
    return themes;
  } catch (error) {
    console.error('Error detecting themes:', error);
    return [];
  }
}

// ============ INSIGHT CATEGORIZATION ============

export async function categorizeInsight(
  insightContent: string
): Promise<'mindset' | 'strategy' | 'productivity' | 'systems' | 'general'> {
  try {
    const prompt = `Categorize this coaching insight into ONE of these categories:
- mindset: beliefs, self-talk, perspective shifts, emotional patterns
- strategy: long-term planning, big picture thinking, career/life direction
- productivity: time management, focus, getting things done, habits
- systems: processes, automation, routines, environment design
- general: anything that doesn't clearly fit the above

INSIGHT: "${insightContent}"

Return ONLY one word: mindset, strategy, productivity, systems, or general`;

    const response = await generateText({ prompt });
    const category = response.trim().toLowerCase();

    if (['mindset', 'strategy', 'productivity', 'systems'].includes(category)) {
      return category as 'mindset' | 'strategy' | 'productivity' | 'systems';
    }
    return 'general';
  } catch (error) {
    console.error('Error categorizing insight:', error);
    return 'general';
  }
}

// ============ FLASHBACK CONTEXT GENERATION ============

export async function generateFlashbackContext(
  insight: KeyInsight,
  currentContext: ContextVault | null
): Promise<string> {
  try {
    const timePeriod = getTimePeriodDescription(new Date(insight.created_at));

    const prompt = `Create a brief, elegant reflection connecting a past insight to the present moment.

PAST INSIGHT (from ${timePeriod}):
"${insight.title}"
${insight.content}

${currentContext ? `
USER'S CURRENT GOALS: ${currentContext.goals.map(g => g.title).join(', ')}
` : ''}

Write a warm, 1-2 sentence reflection that:
1. Acknowledges the time that has passed
2. Notes how this insight might still be relevant today
3. Has an elegant, editorial tone

Example: "A year ago, you discovered the power of single-tasking. As you pursue [current goal], this wisdom feels more relevant than ever."

Keep it under 50 words. Be warm and personal.`;

    const response = await generateText({ prompt });
    return response.trim();
  } catch (error) {
    console.error('Error generating flashback context:', error);
    return '';
  }
}

function getTimePeriodDescription(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 35 && diffDays >= 25) {
    return 'one month ago';
  } else if (diffDays >= 360 && diffDays <= 370) {
    return 'one year ago';
  } else if (diffDays < 25) {
    return `${diffDays} days ago`;
  } else if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    return `${months} months ago`;
  } else {
    const years = Math.round(diffDays / 365);
    return `${years} years ago`;
  }
}
