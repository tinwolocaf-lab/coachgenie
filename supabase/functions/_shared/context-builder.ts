import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface ContextSection {
  label: string;
  content: string;
}

export async function buildEnrichedSystemPrompt(
  userId: string,
  basePrompt: string,
  userClient: SupabaseClient
): Promise<string> {
  const sections: ContextSection[] = [];

  // 1. Context Vault (values, goals, constraints)
  try {
    const { data: vault } = await userClient
      .from('context_vaults')
      .select('values, goals, constraints, preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (vault) {
      const parts: string[] = [];
      if (vault.values?.length) {
        parts.push(`Core Values: ${vault.values.join(', ')}`);
      }
      if (vault.goals?.length) {
        const goalTexts = vault.goals
          .map((g: { title: string; description?: string; is_30_day_focus?: boolean }) => {
            const focus = g.is_30_day_focus ? ' [30-DAY FOCUS]' : '';
            return `- ${g.title}${g.description ? `: ${g.description}` : ''}${focus}`;
          })
          .join('\n');
        parts.push(`Goals:\n${goalTexts}`);
      }
      if (vault.constraints) {
        const c = vault.constraints;
        parts.push(
          `Constraints: ${c.available_hours_per_day}h/day available, energy: ${c.energy_level}, best focus time: ${c.best_time_for_focus}`
        );
      }
      if (parts.length) {
        sections.push({ label: 'USER CONTEXT', content: parts.join('\n\n') });
      }
    }
  } catch (e) {
    console.error('[ContextBuilder] Error fetching vault:', e);
  }

  // 2. Calendar events (next 24h)
  try {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await userClient
      .from('integration_data')
      .select('title, content, starts_at, ends_at')
      .eq('user_id', userId)
      .eq('data_type', 'calendar_event')
      .gte('starts_at', now)
      .lte('starts_at', tomorrow)
      .order('starts_at', { ascending: true })
      .limit(10);

    if (events?.length) {
      const eventTexts = events
        .map((e) => {
          const start = new Date(e.starts_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          const end = e.ends_at
            ? new Date(e.ends_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })
            : '';
          return `- ${start}${end ? ` - ${end}` : ''}: ${e.title || 'Untitled'}`;
        })
        .join('\n');
      sections.push({
        label: 'UPCOMING CALENDAR (next 24h)',
        content: eventTexts,
      });
    }
  } catch (e) {
    console.error('[ContextBuilder] Error fetching calendar:', e);
  }

  // 3. Tasks (from Todoist/Linear)
  try {
    const { data: tasks } = await userClient
      .from('integration_data')
      .select('title, content')
      .eq('user_id', userId)
      .eq('data_type', 'task')
      .limit(8);

    if (tasks?.length) {
      const taskTexts = tasks.map((t) => `- ${t.title || 'Untitled'}`).join('\n');
      sections.push({ label: 'ACTIVE TASKS', content: taskTexts });
    }
  } catch (e) {
    console.error('[ContextBuilder] Error fetching tasks:', e);
  }

  // 4. GitHub activity
  try {
    const { data: ghData } = await userClient
      .from('integration_data')
      .select('title, content')
      .eq('user_id', userId)
      .eq('data_type', 'github_activity')
      .order('created_at', { ascending: false })
      .limit(1);

    if (ghData?.length && ghData[0].content) {
      const activity = ghData[0].content as Record<string, unknown>;
      const parts: string[] = [];
      if (activity.commits_this_week) parts.push(`Commits this week: ${activity.commits_this_week}`);
      if (activity.active_repos) parts.push(`Active repos: ${(activity.active_repos as string[]).join(', ')}`);
      if (activity.peak_hours) parts.push(`Peak coding hours: ${activity.peak_hours}`);
      if (parts.length) {
        sections.push({ label: 'DEVELOPER ACTIVITY', content: parts.join('\n') });
      }
    }
  } catch (e) {
    console.error('[ContextBuilder] Error fetching GitHub:', e);
  }

  // 5. Notion pages
  try {
    const { data: notionPages } = await userClient
      .from('integration_data')
      .select('title')
      .eq('user_id', userId)
      .eq('data_type', 'notion_page')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (notionPages?.length) {
      const pageTexts = notionPages.map((p) => `- ${p.title || 'Untitled'}`).join('\n');
      sections.push({ label: 'RECENT NOTION PAGES', content: pageTexts });
    }
  } catch (e) {
    console.error('[ContextBuilder] Error fetching Notion:', e);
  }

  // Build enriched prompt
  if (sections.length === 0) {
    return basePrompt;
  }

  const contextBlock = sections
    .map((s) => `=== ${s.label} ===\n${s.content}`)
    .join('\n\n');

  return `${basePrompt}\n\n--- PERSONALIZATION CONTEXT ---\nUse the following context to personalize your coaching. Reference specific events, tasks, or patterns when relevant, but don't force it.\n\n${contextBlock}`;
}
