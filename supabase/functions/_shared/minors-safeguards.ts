import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MinorsPolicy {
  isMinor: boolean;
  sessionCapReached: boolean;
  restrictedTopics: string[];
  safetyPreamble: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MINORS_KEYWORDS: string[] = [
  "i'm 10",
  "i'm 11",
  "i'm 12",
  "i'm 13",
  "i'm 14",
  "i'm 15",
  "i'm 16",
  "i'm 17",
  "im 10",
  "im 11",
  "im 12",
  "im 13",
  "im 14",
  "im 15",
  "im 16",
  "im 17",
  "i am 10",
  "i am 11",
  "i am 12",
  "i am 13",
  "i am 14",
  "i am 15",
  "i am 16",
  "i am 17",
  "i'm in high school",
  "im in high school",
  "i'm in middle school",
  "im in middle school",
  "i'm in junior high",
  "im in junior high",
  "my parents",
  "my mom and dad",
  "my guardian",
  "homework",
  "i'm underage",
  "im underage",
  "i'm a kid",
  "im a kid",
  "i'm a minor",
  "im a minor",
  "i'm a teenager",
  "im a teenager",
  "grade 6",
  "grade 7",
  "grade 8",
  "grade 9",
  "grade 10",
  "grade 11",
  "grade 12",
  "6th grade",
  "7th grade",
  "8th grade",
  "9th grade",
  "10th grade",
  "11th grade",
  "12th grade",
  "freshman year",
  "sophomore year",
  "junior year",
  "senior year",
  "my school",
  "my teacher",
  "i'm in elementary",
  "im in elementary",
  "years old and i",
  "year old and i",
  "not 18 yet",
  "under 18",
  "before i turn 18",
];

export const RESTRICTED_TOPICS_FOR_MINORS: string[] = [
  'substance_use',
  'dating_advice',
  'financial_decisions',
  'independent_medical',
  'leaving_home',
];

export const MINORS_SAFETY_PREAMBLE: string = `MINOR DETECTED — AGE-APPROPRIATE MODE ACTIVE.
You are now interacting with a user who may be under 18. You MUST follow these rules:

1. Keep all language, examples, and advice age-appropriate and suitable for younger users.
2. Do NOT provide advice or guidance on the following restricted topics: substance use, dating or romantic relationship advice, independent financial decisions, independent medical decisions, or leaving home.
3. If the user raises a restricted topic, gently redirect and encourage them to speak with a parent, guardian, teacher, or other trusted adult.
4. Encourage the user to involve their parents or guardians in important decisions.
5. Do NOT ask for or store any personally identifiable information (name, school, address, etc.).
6. If the user appears to be in distress or danger, provide crisis resources and strongly encourage them to reach out to a trusted adult immediately.
7. Maintain a supportive, encouraging, and positive tone at all times.`;

const MINORS_SESSION_CAP = 5;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Check if the provided text contains signals indicating the user may be a minor.
 * Case-insensitive keyword match against the MINORS_KEYWORDS list.
 */
export function detectMinorSignals(text: string): boolean {
  const lower = text.toLowerCase();
  return MINORS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Policy check
// ---------------------------------------------------------------------------

/**
 * Check the minors policy for a given user:
 * - Whether they have been flagged as a minor in `user_state_snapshots`
 * - Whether today's session count has reached the daily cap
 *
 * Returns a MinorsPolicy object with the appropriate flags and safety content.
 */
export async function checkMinorsPolicy(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<MinorsPolicy> {
  const defaultPolicy: MinorsPolicy = {
    isMinor: false,
    sessionCapReached: false,
    restrictedTopics: [],
    safetyPreamble: '',
  };

  try {
    // 1. Check if user is flagged as a minor in user_state_snapshots
    const { data: snapshot, error: snapshotError } = await serviceClient
      .from('user_state_snapshots')
      .select('state')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      console.error('[minors-safeguards] Error reading user_state_snapshots:', snapshotError.message);
      return defaultPolicy;
    }

    const state = snapshot?.state as Record<string, unknown> | null;
    const isMinor = state?.is_minor === true;

    if (!isMinor) {
      return defaultPolicy;
    }

    // 2. Count today's sessions for the flagged minor
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const { count, error: countError } = await serviceClient
      .from('coaching_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayIso);

    if (countError) {
      console.error('[minors-safeguards] Error counting sessions:', countError.message);
    }

    const sessionCount = count ?? 0;
    const sessionCapReached = sessionCount >= MINORS_SESSION_CAP;

    return {
      isMinor: true,
      sessionCapReached,
      restrictedTopics: RESTRICTED_TOPICS_FOR_MINORS,
      safetyPreamble: MINORS_SAFETY_PREAMBLE,
    };
  } catch (err) {
    console.error('[minors-safeguards] checkMinorsPolicy failed:', err);
    return defaultPolicy;
  }
}

// ---------------------------------------------------------------------------
// Flag user as minor
// ---------------------------------------------------------------------------

/**
 * Upsert a state snapshot marking the user as a minor.
 * Merges `is_minor: true` into the existing state object if one exists,
 * or creates a new snapshot row.
 */
export async function flagUserAsMinor(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    // Read existing snapshot to merge state
    const { data: existing } = await serviceClient
      .from('user_state_snapshots')
      .select('id, state')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingState = (existing?.state as Record<string, unknown>) ?? {};
    const mergedState = { ...existingState, is_minor: true };

    if (existing?.id) {
      // Update existing row
      const { error } = await serviceClient
        .from('user_state_snapshots')
        .update({ state: mergedState, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        console.error('[minors-safeguards] Error updating state snapshot:', error.message);
      }
    } else {
      // Insert new row
      const { error } = await serviceClient
        .from('user_state_snapshots')
        .insert({
          user_id: userId,
          state: mergedState,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[minors-safeguards] Error inserting state snapshot:', error.message);
      }
    }
  } catch (err) {
    console.error('[minors-safeguards] flagUserAsMinor failed:', err);
  }
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a string to append to the AI system prompt when a minor is detected.
 * Includes the safety preamble and a formatted restricted-topics list.
 * Returns an empty string when the user is not flagged as a minor.
 */
export function buildMinorsSystemPromptAddition(policy: MinorsPolicy): string {
  if (!policy.isMinor) {
    return '';
  }

  const topicList = policy.restrictedTopics
    .map((t) => `  - ${t.replace(/_/g, ' ')}`)
    .join('\n');

  const parts: string[] = [
    '\n\n--- MINORS SAFEGUARD ---',
    policy.safetyPreamble,
    `\nRestricted topics (do NOT advise on):\n${topicList}`,
  ];

  if (policy.sessionCapReached) {
    parts.push(
      '\nIMPORTANT: This user has reached their daily session cap. ' +
      'Gently let them know they have used all their sessions for today and encourage them to return tomorrow.',
    );
  }

  return parts.join('\n');
}
