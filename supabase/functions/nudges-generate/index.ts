import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface NudgeTemplate {
  nudge_type: 'alignment' | 'encouragement' | 'reflection' | 'milestone' | 'anti_dependence';
  title: string;
  content: string;
  related_chapter_id?: string;
  related_ritual_id?: string;
}

// ── Anti-spam policy constants ──────────────────────────────────────────
const MAX_NUDGES_PER_DAY = 5;
const MIN_NUDGE_INTERVAL_MINUTES = 60;
const HIGH_USAGE_SESSIONS_PER_DAY = 5;
const NUDGE_COOLDOWN_AFTER_DISMISS_HOURS = 4;

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
  const serviceClient = createServiceClient();

  try {
    // ── Anti-spam: Check recent nudge frequency ─────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayNudges } = await userClient
      .from('editorial_nudges')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });

    const nudgesTodayCount = todayNudges?.length ?? 0;

    // Hard cap: no more than MAX_NUDGES_PER_DAY
    if (nudgesTodayCount >= MAX_NUDGES_PER_DAY) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: 0,
          reason: 'daily_nudge_limit_reached',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cooldown: minimum interval between nudges
    if (todayNudges?.length) {
      const lastNudgeTime = new Date(todayNudges[0].created_at).getTime();
      const minutesSinceLast = (Date.now() - lastNudgeTime) / (1000 * 60);
      if (minutesSinceLast < MIN_NUDGE_INTERVAL_MINUTES) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: 0,
            reason: 'nudge_cooldown_active',
            next_eligible_minutes: Math.ceil(MIN_NUDGE_INTERVAL_MINUTES - minutesSinceLast),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Anti-dependence: Check usage intensity ──────────────────────────
    const { data: todaySessions } = await userClient
      .from('coaching_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString());

    const sessionsToday = todaySessions?.length ?? 0;
    const isHighUsage = sessionsToday >= HIGH_USAGE_SESSIONS_PER_DAY;

    // Check latest state snapshot for risk flags
    const { data: latestSnapshot } = await serviceClient
      .from('user_state_snapshots')
      .select('state')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const riskFlags: string[] = (latestSnapshot?.state as Record<string, unknown>)?.risk_flags as string[] ?? [];
    const hasHighUsageFlag = riskFlags.includes('high_usage_frequency');

    const nudges: NudgeTemplate[] = [];

    // ── Anti-dependence nudge (takes priority if triggered) ─────────────
    if (isHighUsage || hasHighUsageFlag) {
      nudges.push({
        nudge_type: 'anti_dependence',
        title: 'Time for the real world',
        content:
          'You\'ve had a great coaching session today. Now take what you\'ve learned and put it into action offline. ' +
          'Go for a walk, call a friend, or tackle that task you\'ve been thinking about. ' +
          'Your best growth happens out there.',
      });
    }

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

    // ── Apply budget: remaining slots for today ─────────────────────────
    const remainingSlots = MAX_NUDGES_PER_DAY - nudgesTodayCount;
    const nudgesToInsert = nudges.slice(0, Math.min(3, remainingSlots));
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
      JSON.stringify({
        success: true,
        generated: insertedCount,
        daily_budget_remaining: remainingSlots - insertedCount,
        anti_dependence_triggered: isHighUsage || hasHighUsageFlag,
      }),
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
