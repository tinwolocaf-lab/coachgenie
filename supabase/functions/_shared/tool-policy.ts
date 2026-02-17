import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionRisk = 'auto' | 'confirm' | 'blocked';

export interface ToolAction {
  toolName: string;
  actionSummary: string;
  payload: Record<string, unknown>;
  risk: ActionRisk;
}

export interface ApprovalResult {
  approved: boolean;
  approvalId?: string;
}

// ---------------------------------------------------------------------------
// Risk classification
// ---------------------------------------------------------------------------

const AUTO_ACTIONS = new Set([
  'read_calendar',
  'read_health',
  'read_tasks',
  'read_memories',
  'generate_prompt',
  'detect_patterns',
]);

const CONFIRM_ACTIONS = new Set([
  'create_calendar_event',
  'send_notification',
  'create_reminder',
  'update_goal',
  'share_insight',
  'create_commitment',
]);

const BLOCKED_ACTIONS = new Set([
  'delete_data',
  'send_email',
  'make_purchase',
  'modify_account',
  'access_contacts',
]);

/**
 * Determine the risk level of a given tool + action pair.
 * Falls back to 'confirm' for any unknown action.
 */
export function classifyActionRisk(toolName: string, action: string): ActionRisk {
  const key = action || toolName;

  if (BLOCKED_ACTIONS.has(key)) return 'blocked';
  if (AUTO_ACTIONS.has(key)) return 'auto';
  if (CONFIRM_ACTIONS.has(key)) return 'confirm';

  // Unknown actions default to requiring confirmation
  return 'confirm';
}

// ---------------------------------------------------------------------------
// Approval requests
// ---------------------------------------------------------------------------

/**
 * Create a pending approval request in the database.
 * Returns the id of the newly created row.
 */
export async function createApprovalRequest(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    runId?: string;
    toolName: string;
    actionSummary: string;
    payload: Record<string, unknown>;
    expiresInMinutes?: number;
  },
): Promise<string> {
  const expiresIn = opts.expiresInMinutes ?? 60;
  const expiresAt = new Date(Date.now() + expiresIn * 60_000).toISOString();

  const { data, error } = await serviceClient
    .from('approval_requests')
    .insert({
      user_id: opts.userId,
      run_id: opts.runId ?? null,
      tool_name: opts.toolName,
      action_summary: opts.actionSummary,
      payload: opts.payload,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create approval request: ${error?.message ?? 'unknown error'}`);
  }

  return data.id as string;
}

/**
 * Check whether an approval request has been approved.
 */
export async function checkApproval(
  serviceClient: SupabaseClient,
  userId: string,
  approvalId: string,
): Promise<ApprovalResult> {
  const { data, error } = await serviceClient
    .from('approval_requests')
    .select('id, status, expires_at')
    .eq('id', approvalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { approved: false };
  }

  // Treat expired requests as not approved
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { approved: false, approvalId: data.id };
  }

  return {
    approved: data.status === 'approved',
    approvalId: data.id,
  };
}

/**
 * Resolve (approve or reject) a pending approval request.
 */
export async function resolveApproval(
  serviceClient: SupabaseClient,
  userId: string,
  approvalId: string,
  decision: 'approved' | 'rejected',
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from('approval_requests')
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve approval request: ${error.message}`);
  }

  return !!data;
}
