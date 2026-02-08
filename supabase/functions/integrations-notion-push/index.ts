import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

interface PushBody {
  title: string;
  content: string;
  session_id?: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: PushBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const { title, content } = payload;
  if (!title || !content) {
    return new Response('Missing title or content', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;

  const { data: integration, error: fetchError } = await userClient
    .from('user_integrations')
    .select('id, access_token, metadata')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .eq('status', 'active')
    .maybeSingle();

  if (fetchError || !integration) {
    return new Response('Notion not connected', { status: 400, headers: corsHeaders });
  }

  try {
    // Split content into Notion blocks (paragraphs)
    const paragraphs = content.split('\n\n').filter(Boolean);
    const children = paragraphs.map((text) => ({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: text } }],
      },
    }));

    // Create a page in the user's workspace
    // If user has a preferred database, use it; otherwise create as a standalone page
    const targetDatabase = (integration.metadata as Record<string, unknown>)?.notion_database_id;

    const pagePayload = targetDatabase
      ? {
          parent: { database_id: targetDatabase as string },
          properties: {
            title: { title: [{ text: { content: title } }] },
          },
          children: children.slice(0, 100), // Notion limit
        }
      : {
          parent: { page_id: 'root' },
          properties: {
            title: { title: [{ text: { content: title } }] },
          },
          children: children.slice(0, 100),
        };

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pagePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Notion Push] API error:', errorText);

      // If database doesn't work, try creating without specific parent
      if (targetDatabase) {
        const fallbackPayload = {
          parent: { page_id: 'root' },
          properties: {
            title: { title: [{ text: { content: title } }] },
          },
          children: children.slice(0, 100),
        };

        const fallbackResponse = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${integration.access_token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fallbackPayload),
        });

        if (!fallbackResponse.ok) {
          return new Response('Failed to create Notion page', { status: 502, headers: corsHeaders });
        }

        const fallbackPage = await fallbackResponse.json();
        return new Response(JSON.stringify({ success: true, url: fallbackPage.url }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Failed to create Notion page', { status: 502, headers: corsHeaders });
    }

    const pageData = await response.json();

    return new Response(JSON.stringify({ success: true, url: pageData.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Notion Push] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
