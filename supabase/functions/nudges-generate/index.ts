import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

interface NudgeTemplate {
  nudge_type: 'alignment' | 'encouragement' | 'reflection' | 'milestone';
  title: string;
  content: string;
  related_chapter_id?: string;
  related_ritual_id?: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;

  try {
    const nudges: NudgeTemplate[] = [];

    // 1. Check ritual streaks for encouragement/milestone nudges
    const { data: streaks } = await userClient
      .from('ritual_streaks')
      .select('ritual_id, current_streak, longest_streak')
      .eq('user_id', userId);

    if (streaks) {
      for (const streak of streaks) {
        // Milestone nudges at key streak numbers
        if ([7, 14, 21, 30, 50, 100].includes(streak.current_streak)) {
          const { data: ritual } = await userClient
            .from('rituals')
            .select('title')
            .eq('id', streak.ritual_id)
            .maybeSingle();

          nudges.push({
            nudge_type: 'milestone',
            title: `${streak.current_streak}-Day Streak!`,
            content: `You've completed "${ritual?.title || 'your ritual'}" for ${streak.current_streak} days straight. This consistency is building real change.`,
            related_ritual_id: streak.ritual_id,
          });
        }

        // Longest streak broken — encouragement
        if (streak.current_streak === 0 && streak.longest_streak > 3) {
          const { data: ritual } = await userClient
            .from('rituals')
            .select('title')
            .eq('id', streak.ritual_id)
            .maybeSingle();

          nudges.push({
            nudge_type: 'encouragement',
            title: 'A fresh start',
            content: `Your "${ritual?.title || 'ritual'}" streak paused — that's okay. Your previous ${streak.longest_streak}-day streak shows what you're capable of. Today is a new beginning.`,
            related_ritual_id: streak.ritual_id,
          });
        }
      }
    }

    // 2. Check upcoming calendar events for alignment nudges
    const now = new Date();
    const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: upcomingEvents } = await userClient
      .from('integration_data')
      .select('title, starts_at')
      .eq('user_id', userId)
      .eq('data_type', 'calendar_event')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', thirtyMinsLater.toISOString())
      .limit(1);

    if (upcomingEvents?.length) {
      const event = upcomingEvents[0];
      nudges.push({
        nudge_type: 'alignment',
        title: `Upcoming: ${event.title}`,
        content: `"${event.title}" starts soon. Take a moment to set your intention — what outcome would make this time well spent?`,
      });
    }

    // 3. Check for growth chapter progress — reflection nudges
    const { data: chapters } = await userClient
      .from('growth_chapters')
      .select('id, title, progress_percentage')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (chapters?.length) {
      const chapter = chapters[0];
      if (chapter.progress_percentage > 0 && chapter.progress_percentage < 100) {
        // Weekly reflection prompt
        const lastNudge = await userClient
          .from('editorial_nudges')
          .select('created_at')
          .eq('user_id', userId)
          .eq('related_chapter_id', chapter.id)
          .eq('nudge_type', 'reflection')
          .order('created_at', { ascending: false })
          .limit(1);

        const lastReflectionDate = lastNudge.data?.[0]?.created_at;
        const daysSinceReflection = lastReflectionDate
          ? (Date.now() - new Date(lastReflectionDate).getTime()) / (1000 * 60 * 60 * 24)
          : 999;

        if (daysSinceReflection >= 7) {
          nudges.push({
            nudge_type: 'reflection',
            title: `${chapter.title} — ${chapter.progress_percentage}%`,
            content: `You're ${chapter.progress_percentage}% through "${chapter.title}". What have you learned so far? What might you adjust going forward?`,
            related_chapter_id: chapter.id,
          });
        }
      }
    }

    // Insert nudges (limit to 3 per generation)
    const nudgesToInsert = nudges.slice(0, 3);
    let insertedCount = 0;

    for (const nudge of nudgesToInsert) {
      const { error } = await userClient.from('editorial_nudges').insert({
        user_id: userId,
        ...nudge,
        is_read: false,
      });
      if (!error) insertedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, generated: insertedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Nudge Generation] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
