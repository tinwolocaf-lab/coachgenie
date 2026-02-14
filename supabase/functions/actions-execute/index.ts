import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  classifyActionRisk,
  createApprovalRequest,
  checkApproval,
  resolveApproval,
} from '../_shared/tool-policy.ts';

interface ExecuteBody {
  action: 'execute' | 'approve' | 'reject' | 'status';
  tool_name: string;
  action_summary?: string;
  payload?: Record<string, unknown>;
  approval_id?: string;
  run_id?: string;
}

/**
 * Approval-gated action execution endpoint.
 *
 * Supports:
 *  - execute: classify risk and either auto-execute, request approval, or block
 *  - approve: approve a pending approval request
 *  - reject: reject a pending approval request
 *  - status: check the status of an approval request
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

  let body: ExecuteBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.action || !body.tool_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: action, tool_name' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const serviceClient = createServiceClient();

  try {
    switch (body.action) {
      case 'execute':
        return await handleExecute(serviceClient, auth.userId, body);

      case 'approve':
        return await handleResolve(serviceClient, body.approval_id, 'approved');

      case 'reject':
        return await handleResolve(serviceClient, body.approval_id, 'rejected');

      case 'status':
        return await handleStatus(serviceClient, body.approval_id);

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${body.action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
  } catch (err) {
    console.error('[actions-execute] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Handlers ────────────────────────────────────────────────────────────

async function handleExecute(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  body: ExecuteBody,
): Promise<Response> {
  const risk = classifyActionRisk(body.tool_name, body.tool_name);

  if (risk === 'blocked') {
    return new Response(
      JSON.stringify({
        status: 'blocked',
        message: `Action "${body.tool_name}" is blocked by policy and cannot be executed.`,
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (risk === 'auto') {
    // Auto-approved: execute immediately
    const result = await executeAction(body.tool_name, body.payload ?? {});
    return new Response(
      JSON.stringify({ status: 'executed', result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Requires confirmation: create approval request
  const approvalId = await createApprovalRequest(serviceClient, {
    userId,
    runId: body.run_id,
    toolName: body.tool_name,
    actionSummary: body.action_summary ?? `Execute ${body.tool_name}`,
    payload: body.payload ?? {},
  });

  return new Response(
    JSON.stringify({
      status: 'pending_approval',
      approval_id: approvalId,
      message: `Action "${body.tool_name}" requires your approval before execution.`,
    }),
    { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleResolve(
  serviceClient: ReturnType<typeof createServiceClient>,
  approvalId: string | undefined,
  decision: 'approved' | 'rejected',
): Promise<Response> {
  if (!approvalId) {
    return new Response(
      JSON.stringify({ error: 'Missing approval_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  await resolveApproval(serviceClient, approvalId, decision);

  // If approved, execute the action
  if (decision === 'approved') {
    const { data: approval } = await serviceClient
      .from('approval_requests')
      .select('tool_name, payload')
      .eq('id', approvalId)
      .single();

    if (approval) {
      const result = await executeAction(
        approval.tool_name,
        (approval.payload as Record<string, unknown>) ?? {},
      );
      return new Response(
        JSON.stringify({ status: 'executed', approval_id: approvalId, result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  return new Response(
    JSON.stringify({ status: decision, approval_id: approvalId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function handleStatus(
  serviceClient: ReturnType<typeof createServiceClient>,
  approvalId: string | undefined,
): Promise<Response> {
  if (!approvalId) {
    return new Response(
      JSON.stringify({ error: 'Missing approval_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const result = await checkApproval(serviceClient, approvalId);

  return new Response(
    JSON.stringify({
      approval_id: approvalId,
      approved: result.approved,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ── Action executor ─────────────────────────────────────────────────────

/**
 * Execute a tool action. This is the actual side-effect dispatcher.
 * For now, actions are logged but not connected to external services.
 * Each tool will be wired as integrations are added.
 */
async function executeAction(
  toolName: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  console.log(`[actions-execute] Executing: ${toolName}`, JSON.stringify(payload));

  switch (toolName) {
    case 'read_calendar':
    case 'read_health':
    case 'read_tasks':
    case 'read_memories':
      return { status: 'ok', action: 'read', tool: toolName };

    case 'create_calendar_event':
      return { status: 'ok', action: 'created', tool: toolName, event: payload };

    case 'send_notification':
      return { status: 'ok', action: 'sent', tool: toolName };

    case 'create_reminder':
      return { status: 'ok', action: 'created', tool: toolName, reminder: payload };

    case 'update_goal':
      return { status: 'ok', action: 'updated', tool: toolName };

    case 'create_commitment':
      return { status: 'ok', action: 'created', tool: toolName, commitment: payload };

    case 'detect_patterns':
    case 'generate_prompt':
      return { status: 'ok', action: 'processed', tool: toolName };

    default:
      return { status: 'ok', action: 'dispatched', tool: toolName };
  }
}
