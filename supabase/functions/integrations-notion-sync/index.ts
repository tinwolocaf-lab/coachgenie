import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

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

  const { data: integration, error: fetchError } = await userClient
    .from('user_integrations')
    .select('id, access_token')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .eq('status', 'active')
    .maybeSingle();

  if (fetchError || !integration) {
    return new Response('Notion not connected', { status: 400, headers: corsHeaders });
  }

  try {
    // Search for recently modified pages
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 20,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[Notion Sync] API error:', errorText);

      if (searchResponse.status === 401) {
        await userClient
          .from('user_integrations')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', integration.id);
      }
      return new Response('Notion API error', { status: 502, headers: corsHeaders });
    }

    const searchData = await searchResponse.json();
    const pages = searchData.results || [];

    let syncedCount = 0;
    for (const page of pages) {
      const pageId = page.id;
      if (!pageId) continue;

      // Extract title from page properties
      let title = 'Untitled';
      const titleProp = page.properties?.title || page.properties?.Name;
      if (titleProp?.title?.[0]?.plain_text) {
        title = titleProp.title[0].plain_text;
      }

      await userClient.from('integration_data').upsert(
        {
          user_id: userId,
          integration_id: integration.id,
          data_type: 'notion_page',
          external_id: pageId,
          title,
          content: {
            url: page.url,
            icon: page.icon?.emoji || null,
            last_edited: page.last_edited_time,
            created: page.created_time,
            parent_type: page.parent?.type || null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'integration_id,external_id' }
      );
      syncedCount++;
    }

    // Also search for tasks in databases
    const dbSearchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 5,
      }),
    });

    if (dbSearchResponse.ok) {
      const dbData = await dbSearchResponse.json();
      for (const db of dbData.results || []) {
        // Query each database for tasks/items
        try {
          const queryResponse = await fetch(`https://api.notion.com/v1/databases/${db.id}/query`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${integration.access_token}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page_size: 10 }),
          });

          if (queryResponse.ok) {
            const queryData = await queryResponse.json();
            for (const item of queryData.results || []) {
              let itemTitle = 'Untitled';
              for (const prop of Object.values(item.properties || {})) {
                const p = prop as { type: string; title?: { plain_text: string }[] };
                if (p.type === 'title' && p.title?.[0]?.plain_text) {
                  itemTitle = p.title[0].plain_text;
                  break;
                }
              }

              await userClient.from('integration_data').upsert(
                {
                  user_id: userId,
                  integration_id: integration.id,
                  data_type: 'task',
                  external_id: item.id,
                  title: itemTitle,
                  content: {
                    url: item.url,
                    database_name: db.title?.[0]?.plain_text || 'Untitled DB',
                    last_edited: item.last_edited_time,
                  },
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'integration_id,external_id' }
              );
              syncedCount++;
            }
          }
        } catch (e) {
          console.error(`[Notion Sync] Error querying database ${db.id}:`, e);
        }
      }
    }

    await userClient
      .from('user_integrations')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', integration.id);

    return new Response(JSON.stringify({ success: true, synced: syncedCount }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Notion Sync] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
