-- ============================================================================
-- CoachGenie Operational Dashboard Queries
-- Target: Supabase PostgreSQL (run with service_role or admin privileges)
-- ============================================================================


-- ############################################################################
-- Section 1: Agent Runtime Health
-- ############################################################################

-- 1a. Run success/failure rates — last 24 hours and last 7 days
-- Expected columns: period, total_runs, completed, failed, aborted, success_rate
SELECT
  '24h' AS period,
  count(*)                                                  AS total_runs,
  count(*) FILTER (WHERE status = 'completed')              AS completed,
  count(*) FILTER (WHERE status = 'failed')                 AS failed,
  count(*) FILTER (WHERE status = 'aborted')                AS aborted,
  round(
    100.0 * count(*) FILTER (WHERE status = 'completed')
    / nullif(count(*), 0), 2
  )                                                         AS success_rate
FROM public.agent_runs
WHERE created_at >= now() - interval '24 hours'

UNION ALL

SELECT
  '7d' AS period,
  count(*),
  count(*) FILTER (WHERE status = 'completed'),
  count(*) FILTER (WHERE status = 'failed'),
  count(*) FILTER (WHERE status = 'aborted'),
  round(
    100.0 * count(*) FILTER (WHERE status = 'completed')
    / nullif(count(*), 0), 2
  )
FROM public.agent_runs
WHERE created_at >= now() - interval '7 days';


-- 1b. Mean and P95 latency by step name (last 7 days)
-- Expected columns: step_name, run_count, avg_latency_ms, p95_latency_ms
SELECT
  s.step_name,
  count(*)                                                  AS run_count,
  round(avg(s.latency_ms))                                  AS avg_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY s.latency_ms) AS p95_latency_ms
FROM public.agent_steps s
  JOIN public.agent_runs r ON r.id = s.run_id
WHERE r.created_at >= now() - interval '7 days'
  AND s.latency_ms IS NOT NULL
GROUP BY s.step_name
ORDER BY p95_latency_ms DESC;


-- 1c. Runs by trigger type breakdown (last 7 days)
-- Expected columns: trigger_type, run_count, pct
SELECT
  trigger_type,
  count(*)                                                  AS run_count,
  round(
    100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 2
  )                                                         AS pct
FROM public.agent_runs
WHERE created_at >= now() - interval '7 days'
GROUP BY trigger_type
ORDER BY run_count DESC;


-- 1d. Failed step analysis — most common failing steps (last 7 days)
-- Expected columns: step_name, fail_count, sample_error
SELECT
  s.step_name,
  count(*)                                                  AS fail_count,
  (array_agg(s.error ORDER BY s.created_at DESC))[1]        AS sample_error
FROM public.agent_steps s
  JOIN public.agent_runs r ON r.id = s.run_id
WHERE r.created_at >= now() - interval '7 days'
  AND s.status = 'failed'
GROUP BY s.step_name
ORDER BY fail_count DESC
LIMIT 20;


-- ############################################################################
-- Section 2: Safety Monitoring
-- ############################################################################

-- 2a. Safety incident counts by severity (24h, 7d, 30d)
-- Expected columns: severity, last_24h, last_7d, last_30d
SELECT
  severity,
  count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24h,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')   AS last_7d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days')  AS last_30d
FROM public.safety_incidents
WHERE created_at >= now() - interval '30 days'
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high'     THEN 2
    WHEN 'medium'   THEN 3
    WHEN 'low'      THEN 4
  END;


-- 2b. Incidents by category breakdown (last 30 days)
-- Expected columns: category, incident_count, pct
SELECT
  category,
  count(*)                                                  AS incident_count,
  round(
    100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 2
  )                                                         AS pct
FROM public.safety_incidents
WHERE created_at >= now() - interval '30 days'
GROUP BY category
ORDER BY incident_count DESC;


-- 2c. Unresolved incidents list (most recent first)
-- Expected columns: id, user_id, severity, category, detection_source, created_at, details
SELECT
  id,
  user_id,
  severity,
  category,
  detection_source,
  created_at,
  details
FROM public.safety_incidents
WHERE resolved = false
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high'     THEN 2
    WHEN 'medium'   THEN 3
    WHEN 'low'      THEN 4
  END,
  created_at DESC;


-- 2d. Risk-blocked response count (runs with safety incidents, last 7 days)
-- Expected columns: blocked_responses
SELECT
  count(DISTINCT run_id) AS blocked_responses
FROM public.safety_incidents
WHERE created_at >= now() - interval '7 days'
  AND run_id IS NOT NULL;


-- ############################################################################
-- Section 3: Memory Usage
-- ############################################################################

-- 3a. Total memories by type per user (top 20 by total count)
-- Expected columns: user_id, episodic, semantic, profile, summary, total
SELECT
  user_id,
  count(*) FILTER (WHERE memory_type = 'episodic')  AS episodic,
  count(*) FILTER (WHERE memory_type = 'semantic')   AS semantic,
  count(*) FILTER (WHERE memory_type = 'profile')    AS profile,
  count(*) FILTER (WHERE memory_type = 'summary')    AS summary,
  count(*)                                           AS total
FROM public.user_memories
GROUP BY user_id
ORDER BY total DESC
LIMIT 20;


-- 3b. Memory growth rate (daily new memories, last 7 days)
-- Expected columns: day, new_memories, cumulative
SELECT
  day,
  new_memories,
  sum(new_memories) OVER (ORDER BY day) AS cumulative
FROM (
  SELECT
    date_trunc('day', created_at)::date AS day,
    count(*)                            AS new_memories
  FROM public.user_memories
  WHERE created_at >= now() - interval '7 days'
  GROUP BY date_trunc('day', created_at)
) daily
ORDER BY day;


-- 3c. Memories pending compaction (episodic without TTL, older than 24 hours)
-- Expected columns: user_id, pending_count, oldest_created_at
SELECT
  user_id,
  count(*)                   AS pending_count,
  min(created_at)            AS oldest_created_at
FROM public.user_memories
WHERE memory_type = 'episodic'
  AND ttl_expires_at IS NULL
  AND created_at < now() - interval '24 hours'
GROUP BY user_id
ORDER BY pending_count DESC
LIMIT 30;


-- 3d. Average embedding dimension coverage
-- (percentage of memories that have a non-null embedding)
-- Expected columns: total_memories, with_embedding, without_embedding, embedding_coverage_pct
SELECT
  count(*)                                                         AS total_memories,
  count(*) FILTER (WHERE embedding IS NOT NULL)                    AS with_embedding,
  count(*) FILTER (WHERE embedding IS NULL)                        AS without_embedding,
  round(
    100.0 * count(*) FILTER (WHERE embedding IS NOT NULL)
    / nullif(count(*), 0), 2
  )                                                                AS embedding_coverage_pct
FROM public.user_memories;


-- ############################################################################
-- Section 4: Coaching Quality
-- ############################################################################

-- 4a. Intervention types distribution (last 7 days)
-- Expected columns: intervention_type, count, pct
SELECT
  intervention_type,
  count(*)                                                  AS count,
  round(
    100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 2
  )                                                         AS pct
FROM public.coaching_interventions
WHERE created_at >= now() - interval '7 days'
GROUP BY intervention_type
ORDER BY count DESC;


-- 4b. Top intervention types by average confidence (last 7 days, min 5 uses)
-- Expected columns: intervention_type, uses, avg_confidence, avg_effectiveness
SELECT
  ci.intervention_type,
  count(DISTINCT ci.id)                                     AS uses,
  round(avg(ci.confidence)::numeric, 3)                     AS avg_confidence,
  round(avg(ie.score)::numeric, 3)                          AS avg_effectiveness
FROM public.coaching_interventions ci
  LEFT JOIN public.intervention_effectiveness ie
    ON ie.intervention_id = ci.id
WHERE ci.created_at >= now() - interval '7 days'
GROUP BY ci.intervention_type
HAVING count(DISTINCT ci.id) >= 5
ORDER BY avg_confidence DESC;


-- 4c. Active behavior commitments by status
-- Expected columns: status, commitment_count, avg_progress
SELECT
  status,
  count(*)                       AS commitment_count,
  round(avg(progress)::numeric, 1) AS avg_progress
FROM public.behavior_commitments
GROUP BY status
ORDER BY
  CASE status
    WHEN 'active'    THEN 1
    WHEN 'completed' THEN 2
    WHEN 'expired'   THEN 3
    WHEN 'abandoned' THEN 4
  END;


-- 4d. Commitment completion rate (all time)
-- Expected columns: total_commitments, completed, abandoned, expired, active, completion_rate
SELECT
  count(*)                                                          AS total_commitments,
  count(*) FILTER (WHERE status = 'completed')                      AS completed,
  count(*) FILTER (WHERE status = 'abandoned')                      AS abandoned,
  count(*) FILTER (WHERE status = 'expired')                        AS expired,
  count(*) FILTER (WHERE status = 'active')                         AS active,
  round(
    100.0 * count(*) FILTER (WHERE status = 'completed')
    / nullif(
        count(*) FILTER (WHERE status IN ('completed', 'abandoned', 'expired')),
        0
      ), 2
  )                                                                 AS completion_rate
FROM public.behavior_commitments;


-- ############################################################################
-- Section 5: Engagement Metrics
-- ############################################################################

-- 5a. Daily active users — unique users with sessions per day (last 30 days)
-- Expected columns: day, unique_users, total_sessions
SELECT
  date_trunc('day', created_at)::date AS day,
  count(DISTINCT user_id)             AS unique_users,
  count(*)                            AS total_sessions
FROM public.coaching_sessions
WHERE created_at >= now() - interval '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY day;


-- 5b. Average session messages per day (last 30 days)
-- Expected columns: day, total_messages, avg_messages_per_session
SELECT
  date_trunc('day', sm.created_at)::date       AS day,
  count(*)                                     AS total_messages,
  round(
    count(*)::numeric
    / nullif(count(DISTINCT sm.session_id), 0), 1
  )                                            AS avg_messages_per_session
FROM public.session_messages sm
WHERE sm.created_at >= now() - interval '30 days'
GROUP BY date_trunc('day', sm.created_at)
ORDER BY day;


-- 5c. Nudge delivery and read rates (last 30 days)
-- Expected columns: nudge_type, delivered, read, read_rate
SELECT
  nudge_type,
  count(*)                                                  AS delivered,
  count(*) FILTER (WHERE is_read = true)                    AS read,
  round(
    100.0 * count(*) FILTER (WHERE is_read = true)
    / nullif(count(*), 0), 2
  )                                                         AS read_rate
FROM public.editorial_nudges
WHERE created_at >= now() - interval '30 days'
GROUP BY nudge_type
ORDER BY delivered DESC;


-- 5d. Council session usage (last 30 days)
-- Expected columns: status, council_count, avg_tokens, avg_latency_ms
SELECT
  status,
  count(*)                            AS council_count,
  round(avg(total_tokens))            AS avg_tokens,
  round(avg(latency_ms))              AS avg_latency_ms
FROM public.council_sessions
WHERE created_at >= now() - interval '30 days'
GROUP BY status
ORDER BY council_count DESC;


-- ############################################################################
-- Section 6: Billing & Cost
-- ############################################################################

-- 6a. Token usage by model (last 7 days, debit events only)
-- Expected columns: model_id, total_events, total_input_tokens, total_output_tokens, total_usd_cost
SELECT
  model_id,
  count(*)                                                         AS total_events,
  sum((usage_units->>'input_tokens')::bigint)                      AS total_input_tokens,
  sum((usage_units->>'output_tokens')::bigint)                     AS total_output_tokens,
  round(sum(usd_cost)::numeric, 4)                                 AS total_usd_cost
FROM public.credit_ledger
WHERE created_at >= now() - interval '7 days'
  AND event_type = 'debit'
  AND model_id IS NOT NULL
GROUP BY model_id
ORDER BY total_usd_cost DESC;


-- 6b. Cost per user per day — top 20 spenders (last 7 days)
-- Expected columns: user_id, total_usd_cost, avg_daily_usd, total_debits
SELECT
  user_id,
  round(sum(usd_cost)::numeric, 4)                                AS total_usd_cost,
  round(
    (sum(usd_cost) / nullif(
      extract(epoch FROM (now() - min(created_at))) / 86400.0, 0
    ))::numeric, 4
  )                                                                AS avg_daily_usd,
  count(*)                                                         AS total_debits
FROM public.credit_ledger
WHERE created_at >= now() - interval '7 days'
  AND event_type = 'debit'
GROUP BY user_id
ORDER BY total_usd_cost DESC
LIMIT 20;


-- 6c. Credit account balances distribution
-- Expected columns: tier, total_accounts, avg_balance_mcredits, min_balance, max_balance, zero_balance_count
SELECT
  tier,
  count(*)                                                         AS total_accounts,
  round(avg(balance_mcredits))                                     AS avg_balance_mcredits,
  min(balance_mcredits)                                            AS min_balance,
  max(balance_mcredits)                                            AS max_balance,
  count(*) FILTER (WHERE balance_mcredits = 0)                     AS zero_balance_count
FROM public.credit_accounts
GROUP BY tier
ORDER BY
  CASE tier
    WHEN 'free'      THEN 1
    WHEN 'sovereign' THEN 2
    WHEN 'oracle'    THEN 3
  END;


-- ############################################################################
-- Section 7: Feature Flag Status
-- ############################################################################

-- 7a. Current flag states and rollout percentages
-- Expected columns: name, enabled, rollout_percentage, allowed_tiers, allowed_user_count, updated_at
SELECT
  name,
  enabled,
  rollout_percentage,
  allowed_tiers,
  coalesce(array_length(allowed_user_ids, 1), 0) AS allowed_user_count,
  updated_at
FROM public.feature_flags
ORDER BY name;


-- ############################################################################
-- Section 8: Eval Quality Gates
-- ############################################################################

-- 8a. Latest eval run scores
-- Expected columns: id, model_id, commit_sha, score, metrics, created_at
SELECT
  id,
  model_id,
  commit_sha,
  score,
  metrics,
  created_at
FROM public.coach_eval_runs
ORDER BY created_at DESC
LIMIT 1;


-- 8b. Score trend over last 5 runs
-- Expected columns: run_number, id, model_id, score, created_at
SELECT
  row_number() OVER (ORDER BY created_at DESC) AS run_number,
  id,
  model_id,
  score,
  created_at
FROM public.coach_eval_runs
ORDER BY created_at DESC
LIMIT 5;


-- 8c. Cases below threshold (active cases whose latest run scored below 0.7)
-- Joins eval cases with the most recent eval run metrics to surface weak spots
-- Expected columns: case_id, case_name, tags, latest_run_score, latest_run_at
SELECT
  ec.id        AS case_id,
  ec.name      AS case_name,
  ec.tags,
  er.score     AS latest_run_score,
  er.created_at AS latest_run_at
FROM public.coach_eval_cases ec
CROSS JOIN LATERAL (
  SELECT score, created_at
  FROM public.coach_eval_runs
  ORDER BY created_at DESC
  LIMIT 1
) er
WHERE ec.active = true
  AND er.score IS NOT NULL
  AND er.score < 70.0
ORDER BY er.score ASC;
