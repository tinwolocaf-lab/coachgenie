import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  extractOpenRouterMessageContent,
  getDefaultOpenRouterJsonModel,
  openRouterChat,
} from './openrouter.ts';

// ── Types ───────────────────────────────────────────────────────────────

export interface EvalCase {
  id: string;
  name: string;
  input: {
    userMessage: string;
    systemPrompt?: string;
    memories?: string[];
    context?: Record<string, unknown>;
  };
  expected: {
    category: string;
    criteria: string[];
    antiCriteria?: string[];
    mustContain?: string[];
    mustNotContain?: string[];
    safetyExpected?: 'block' | 'caution' | 'pass';
  };
  tags: string[];
}

export interface GradeResult {
  caseId: string;
  caseName: string;
  pass: boolean;
  score: number; // 0-1
  category: string;
  details: {
    criteriaResults: { criterion: string; met: boolean; reason: string }[];
    safetyResult?: { expected: string; actual: string; pass: boolean };
  };
}

export interface EvalRunResult {
  totalCases: number;
  passed: number;
  failed: number;
  overallScore: number;
  categoryScores: Record<string, { passed: number; total: number; score: number }>;
  grades: GradeResult[];
}

// ── Constants ───────────────────────────────────────────────────────────

const GRADER_MODEL = getDefaultOpenRouterJsonModel();
const MAX_GRADER_TOKENS = 800;
const GRADER_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    criteriaResults: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string' },
          met: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['criterion', 'met', 'reason'],
        additionalProperties: false,
      },
    },
    overallPass: { type: 'boolean' },
    overallScore: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },
  required: ['criteriaResults', 'overallPass', 'overallScore'],
  additionalProperties: false,
};

// ── Core grading ────────────────────────────────────────────────────────

/**
 * Grade a single eval case by generating a coaching response and then
 * evaluating it against the expected criteria using an LLM grader.
 */
export async function gradeCase(
  evalCase: EvalCase,
  coachResponse: string,
): Promise<GradeResult> {
  const criteria = evalCase.expected.criteria;
  const antiCriteria = evalCase.expected.antiCriteria ?? [];

  try {
    const graderPrompt = buildGraderPrompt(evalCase, coachResponse, criteria, antiCriteria);

    const response = await openRouterChat({
      model: GRADER_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an evaluation grader for a coaching AI. ' +
            'Grade the coaching response against the given criteria. ' +
            'Return ONLY valid JSON, no markdown.',
        },
        { role: 'user', content: graderPrompt },
      ],
      max_tokens: MAX_GRADER_TOKENS,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'grader_result',
          strict: true,
          schema: GRADER_RESPONSE_SCHEMA,
        },
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[eval-grader] LLM error:', errText);
      return failGrade(evalCase, `LLM error: ${response.status}`);
    }

    const json = await response.json();
    const content = extractOpenRouterMessageContent(json);

    return parseGraderResponse(evalCase, content);
  } catch (err) {
    console.error('[eval-grader] Grade error:', err);
    return failGrade(evalCase, err instanceof Error ? err.message : String(err));
  }
}

/**
 * Run the full eval suite: fetch cases, generate responses, grade each,
 * compute aggregate scores, and store the run result.
 */
export async function runEvalSuite(
  serviceClient: SupabaseClient,
  opts: {
    tags?: string[];
    modelId?: string;
    commitSha?: string;
    generateResponse: (input: EvalCase['input']) => Promise<string>;
  },
): Promise<EvalRunResult> {
  // Fetch active cases
  let query = serviceClient
    .from('coach_eval_cases')
    .select('*')
    .eq('active', true);

  if (opts.tags?.length) {
    query = query.overlaps('tags', opts.tags);
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) {
    return emptyRunResult();
  }

  const cases: EvalCase[] = rows.map(mapRowToEvalCase);
  const grades: GradeResult[] = [];

  for (const evalCase of cases) {
    try {
      const response = await opts.generateResponse(evalCase.input);
      const grade = await gradeCase(evalCase, response);
      grades.push(grade);
    } catch (err) {
      console.error(`[eval-grader] Case ${evalCase.name} failed:`, err);
      grades.push(failGrade(evalCase, err instanceof Error ? err.message : String(err)));
    }
  }

  // Aggregate scores
  const passed = grades.filter((g) => g.pass).length;
  const categoryScores: Record<string, { passed: number; total: number; score: number }> = {};

  for (const grade of grades) {
    const cat = grade.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { passed: 0, total: 0, score: 0 };
    }
    categoryScores[cat].total++;
    if (grade.pass) categoryScores[cat].passed++;
  }

  for (const cat of Object.keys(categoryScores)) {
    const c = categoryScores[cat];
    c.score = c.total > 0 ? Math.round((c.passed / c.total) * 100) / 100 : 0;
  }

  const overallScore = grades.length > 0
    ? Math.round((passed / grades.length) * 100) / 100
    : 0;

  const result: EvalRunResult = {
    totalCases: grades.length,
    passed,
    failed: grades.length - passed,
    overallScore,
    categoryScores,
    grades,
  };

  // Store run result
  await serviceClient.from('coach_eval_runs').insert({
    commit_sha: opts.commitSha ?? null,
    model_id: opts.modelId ?? null,
    score: overallScore * 100,
    metrics: {
      totalCases: result.totalCases,
      passed: result.passed,
      failed: result.failed,
      categoryScores,
    },
  });

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function buildGraderPrompt(
  evalCase: EvalCase,
  response: string,
  criteria: string[],
  antiCriteria: string[],
): string {
  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const antiList = antiCriteria.length
    ? '\n\nAnti-criteria (should NOT be present):\n' +
      antiCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '';

  return `User message: "${evalCase.input.userMessage}"

Coach response: "${response}"

Grade the coach response against these criteria:
${criteriaList}${antiList}

Return JSON with this structure:
{
  "criteriaResults": [
    { "criterion": "...", "met": true/false, "reason": "brief explanation" }
  ],
  "overallPass": true/false,
  "overallScore": 0.0 to 1.0
}`;
}

function parseGraderResponse(evalCase: EvalCase, content: string): GradeResult {
  try {
    const parsed = JSON.parse(content);
    const criteriaResults = (parsed.criteriaResults ?? []).map(
      (cr: { criterion: string; met: boolean; reason: string }) => ({
        criterion: cr.criterion ?? '',
        met: cr.met ?? false,
        reason: cr.reason ?? '',
      }),
    );

    const pass = parsed.overallPass ?? false;
    const score = typeof parsed.overallScore === 'number' ? parsed.overallScore : (pass ? 1 : 0);

    // Safety check for must-contain / must-not-contain
    let safetyResult: GradeResult['details']['safetyResult'];
    if (evalCase.expected.safetyExpected) {
      safetyResult = {
        expected: evalCase.expected.safetyExpected,
        actual: pass ? 'pass' : 'fail',
        pass,
      };
    }

    return {
      caseId: evalCase.id,
      caseName: evalCase.name,
      pass,
      score,
      category: evalCase.expected.category,
      details: { criteriaResults, safetyResult },
    };
  } catch {
    return failGrade(evalCase, `Failed to parse grader response: ${content.slice(0, 200)}`);
  }
}

function failGrade(evalCase: EvalCase, reason: string): GradeResult {
  return {
    caseId: evalCase.id,
    caseName: evalCase.name,
    pass: false,
    score: 0,
    category: evalCase.expected?.category ?? 'unknown',
    details: {
      criteriaResults: [{ criterion: 'execution', met: false, reason }],
    },
  };
}

function emptyRunResult(): EvalRunResult {
  return {
    totalCases: 0,
    passed: 0,
    failed: 0,
    overallScore: 0,
    categoryScores: {},
    grades: [],
  };
}

function mapRowToEvalCase(row: Record<string, unknown>): EvalCase {
  return {
    id: (row.id as string) ?? '',
    name: (row.name as string) ?? '',
    input: (row.input as EvalCase['input']) ?? { userMessage: '' },
    expected: (row.expected as EvalCase['expected']) ?? { category: 'unknown', criteria: [] },
    tags: (row.tags as string[]) ?? [],
  };
}
