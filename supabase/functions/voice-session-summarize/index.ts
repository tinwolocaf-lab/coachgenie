import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { storeMemory } from '../_shared/memory.ts';
import { isFeatureEnabled } from '../_shared/feature-flags.ts';

interface SummarizeBody {
  session_id: string;
}

/**
 * Voice Session Summarize - generates summaries from voice sessions
 * and auto-upserts key memories.
 *
 * Call this after a voice session ends to:
 *  1. Generate a structured summary of the conversation
 *  2. Extract key insights and commitments
 *  3. Store them as semantic memories for future retrieval
 */
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

  let body: SummarizeBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.session_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: session_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { userId, userClient } = auth;
  const serviceClient = createServiceClient();

  // Feature flag gate
  const summariesEnabled = await isFeatureEnabled(serviceClient, 'voice_session_summaries', { userId }).catch(() => true);
  if (!summariesEnabled) {
    return new Response(
      JSON.stringify({ error: 'Voice session summaries are not available yet.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Fetch session messages
    const { data: messages, error: msgError } = await userClient
      .from('session_messages')
      .select('role, content, created_at')
      .eq('session_id', body.session_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (msgError || !messages?.length) {
      return new Response(
        JSON.stringify({ error: 'No messages found for this session' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build transcript
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n')
      .slice(0, 8000);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate structured summary
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content:
              'You are a session summarizer for a coaching app. Analyze this coaching conversation and return ONLY valid JSON with:\n' +
              '- summary: string (2-3 sentence overview)\n' +
              '- key_insights: string[] (up to 5 key insights)\n' +
              '- commitments: string[] (any action items or commitments made)\n' +
              '- emotional_themes: string[] (dominant emotional themes)\n' +
              '- breakthrough_moment: string | null (if there was a significant breakthrough)\n' +
              'Be concise and factual. No markdown.',
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: 600,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('[voice-summarize] LLM error:', await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to generate summary' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? '';

    let parsed: {
      summary?: string;
      key_insights?: string[];
      commitments?: string[];
      emotional_themes?: string[];
      breakthrough_moment?: string | null;
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content };
    }

    // Store summary as a memory
    const summaryText = [
      parsed.summary ?? '',
      parsed.key_insights?.length ? `Key insights: ${parsed.key_insights.join('; ')}` : '',
      parsed.commitments?.length ? `Commitments: ${parsed.commitments.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (summaryText) {
      await storeMemory(serviceClient, {
        userId,
        memoryType: 'summary',
        sourceType: 'session_message',
        sourceId: body.session_id,
        content: summaryText,
        salienceScore: parsed.breakthrough_moment ? 0.9 : 0.7,
        metadata: {
          session_type: 'voice',
          emotional_themes: parsed.emotional_themes,
          has_breakthrough: !!parsed.breakthrough_moment,
        },
      });
    }

    // Store individual commitments as profile memories
    if (parsed.commitments?.length) {
      for (const commitment of parsed.commitments.slice(0, 3)) {
        await storeMemory(serviceClient, {
          userId,
          memoryType: 'profile',
          sourceType: 'session_message',
          sourceId: body.session_id,
          content: `Commitment: ${commitment}`,
          salienceScore: 0.8,
        });
      }
    }

    // Store breakthrough as high-salience memory
    if (parsed.breakthrough_moment) {
      await storeMemory(serviceClient, {
        userId,
        memoryType: 'semantic',
        sourceType: 'session_message',
        sourceId: body.session_id,
        content: `Breakthrough: ${parsed.breakthrough_moment}`,
        salienceScore: 0.95,
      });
    }

    return new Response(
      JSON.stringify({
        session_id: body.session_id,
        ...parsed,
        memories_stored: 1 + (parsed.commitments?.length ?? 0) + (parsed.breakthrough_moment ? 1 : 0),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[voice-summarize] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
