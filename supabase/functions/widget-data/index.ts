import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

interface WidgetDataResponse {
  topPriority: string | null;
  ritualProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentStreak: number;
  coachingNudge: string;
  nextEvent: {
    title: string;
    startTime: string;
  } | null;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'GET' && request.method !== 'POST') {
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
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const hour = today.getHours();

    // 1. Get today's top priority from day_plans
    let topPriority: string | null = null;
    const { data: dayPlanData } = await userClient
      .from('day_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .single();

    if (dayPlanData?.id) {
      const { data: prioritiesData } = await userClient
        .from('priorities')
        .select('title')
        .eq('day_plan_id', dayPlanData.id)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (prioritiesData?.title) {
        topPriority = prioritiesData.title;
      }
    }

    // Fallback if no priority found
    if (!topPriority) {
      topPriority = 'Focus on your most important task today';
    }

    // 2. Get ritual progress (today's completions vs total rituals)
    const { data: ritualsData } = await userClient
      .from('rituals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    const totalRituals = ritualsData?.length || 0;

    let completedRituals = 0;
    if (totalRituals > 0) {
      const { data: completionsData } = await userClient
        .from('ritual_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('completed_date', todayStr);

      completedRituals = completionsData?.length || 0;
    }

    const ritualPercentage = totalRituals > 0 ? Math.round((completedRituals / totalRituals) * 100) : 0;

    // 3. Get current streak count
    let currentStreak = 0;
    const { data: streakData } = await userClient
      .from('ritual_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .order('current_streak', { ascending: false })
      .limit(1)
      .single();

    if (streakData?.current_streak) {
      currentStreak = streakData.current_streak;
    }

    // 4. Generate coaching nudge based on time of day
    let coachingNudge = 'Stay focused on your goals';
    if (hour < 12) {
      coachingNudge = 'Set your intention for today';
    } else if (hour < 17) {
      coachingNudge = 'Stay focused on your top priority';
    } else {
      coachingNudge = 'Time to reflect on your day';
    }

    // 5. Get next calendar event
    let nextEvent: { title: string; startTime: string } | null = null;
    const now = new Date();
    const { data: eventsData } = await userClient
      .from('integration_data')
      .select('title, starts_at')
      .eq('user_id', userId)
      .eq('data_type', 'calendar_event')
      .gt('starts_at', now.toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .single();

    if (eventsData?.title && eventsData?.starts_at) {
      const eventTime = new Date(eventsData.starts_at);
      const timeStr = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      nextEvent = {
        title: eventsData.title,
        startTime: timeStr,
      };
    }

    const response: WidgetDataResponse = {
      topPriority,
      ritualProgress: {
        completed: completedRituals,
        total: totalRituals,
        percentage: ritualPercentage,
      },
      currentStreak,
      coachingNudge,
      nextEvent,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in widget-data function:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch widget data',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
