import type {
  CalibrationContext,
  LeadRecord,
  LeadStatus,
  Market,
  OutcomeRewardType,
  ProspectInput,
  RewardMemoryItem,
  SubScores,
} from '../shared/types';

export const OUTCOME_REWARDS: Record<Exclude<OutcomeRewardType, null>, { label: string; points: number }> = {
  BOOKED_DEMO: { label: '+25 Booked Demo', points: 25 },
  POSITIVE_REPLY: { label: '+10 Positive Reply', points: 10 },
  NO_REPLY: { label: '-2 No Reply', points: -2 },
  WRONG_FIT: { label: '-15 Wrong Fit', points: -15 },
};

export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  const firstBrace = candidate.indexOf('{');
  const firstBracket = candidate.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else {
    startIdx = firstBrace !== -1 ? firstBrace : firstBracket;
  }

  if (startIdx === -1) {
    return candidate;
  }

  const openChar = candidate[startIdx];
  const closeChar = openChar === '{' ? '}' : ']';
  const lastIdx = candidate.lastIndexOf(closeChar);

  if (lastIdx > startIdx) {
    return candidate.slice(startIdx, lastIdx + 1).trim();
  }

  return candidate.slice(startIdx).trim();
}

export function parseLlmJson<T>(raw: string): T {
  const cleaned = stripMarkdownFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Structured JSON parse failed: ${msg}`);
  }
}

export function clampSubScore(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(25, Math.round(num)));
}

export function clampSubScores(scores: Partial<SubScores> | undefined | null): SubScores {
  return {
    pain_signal: clampSubScore(scores?.pain_signal),
    niche_fit: clampSubScore(scores?.niche_fit),
    web_booking_gap: clampSubScore(scores?.web_booking_gap),
    reachability: clampSubScore(scores?.reachability),
  };
}

export function computeTotalScore(scores: SubScores): number {
  return scores.pain_signal + scores.niche_fit + scores.web_booking_gap + scores.reachability;
}

export function routeLeadStatus(totalScore: number): LeadStatus {
  if (totalScore >= 75) return 'APPROVED_FOR_OUTREACH';
  if (totalScore >= 50) return 'NEEDS_REVIEW';
  return 'PASS';
}

export function getCalibrationContext(memory: RewardMemoryItem[]): CalibrationContext {
  const winners = memory
    .filter((item) => item.reward_points > 0)
    .sort((a, b) => {
      if (b.reward_points !== a.reward_points) return b.reward_points - a.reward_points;
      return b.recorded_at.localeCompare(a.recorded_at);
    })
    .slice(0, 3);

  const penalized = memory
    .filter((item) => item.reward_points < 0)
    .sort((a, b) => {
      if (a.reward_points !== b.reward_points) return a.reward_points - b.reward_points;
      return b.recorded_at.localeCompare(a.recorded_at);
    })
    .slice(0, 2);

  return {
    top_winners: winners,
    top_penalized: penalized,
  };
}

export function upsertRewardMemory(
  memory: RewardMemoryItem[],
  lead: LeadRecord,
  outcome: Exclude<OutcomeRewardType, null>,
  nowIso = new Date().toISOString()
): RewardMemoryItem[] {
  const rewardPoints = OUTCOME_REWARDS[outcome].points;
  const coldEmailText = lead.outreach_pack
    ? `Subject: ${lead.outreach_pack.cold_email.subject}\n${lead.outreach_pack.cold_email.body}`
    : null;

  const entry: RewardMemoryItem = {
    lead_id: lead.id,
    business_name: lead.business_name,
    domain: lead.domain,
    niche: lead.niche,
    market: lead.market,
    total_score: lead.total_score,
    sub_scores: lead.sub_scores,
    bottleneck_diagnosis: lead.bottleneck_diagnosis,
    gatekeeper_reason: lead.gatekeeper_reason,
    outreach_cold_email: coldEmailText,
    outcome,
    reward_points: rewardPoints,
    recorded_at: nowIso,
  };

  const filtered = memory.filter((item) => item.lead_id !== lead.id);
  return [entry, ...filtered];
}

export function normalizeDomainKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .replace(/\/+$/, '');
}

export function normalizeNameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isDuplicateProspect(
  candidate: { business_name: string; domain: string },
  existingLeads: Array<{ business_name: string; domain: string }>
): boolean {
  const candDomain = normalizeDomainKey(candidate.domain);
  const candName = normalizeNameKey(candidate.business_name);
  return existingLeads.some((existing) => {
    const exDomain = normalizeDomainKey(existing.domain);
    const exName = normalizeNameKey(existing.business_name);
    if (candDomain && exDomain && candDomain === exDomain) return true;
    if (candName && exName && candName === exName) return true;
    return false;
  });
}

export function parseBatchLines(rawText: string): { items: ProspectInput[]; errors: string[] } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { items: [], errors: ['Paste at least 1 prospect line (Business Name | Domain | Niche | Market).'] };
  }

  if (lines.length > 10) {
    return { items: [], errors: [`Batch queue allows up to 10 lines (received ${lines.length}).`] };
  }

  const items: ProspectInput[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 4) {
      errors.push(`Line ${idx + 1}: expected "Business Name | Domain | Niche | Market".`);
      return;
    }

    const [business_name, domain, niche, rawMarket, ...notesRest] = parts;
    const marketUpper = rawMarket.toUpperCase();
    const market: Market | null = marketUpper === 'US' || marketUpper === 'UK' ? marketUpper : null;

    if (!business_name || !domain || !niche) {
      errors.push(`Line ${idx + 1}: Business Name, Domain, and Niche are required.`);
      return;
    }

    if (!market) {
      errors.push(`Line ${idx + 1}: Market must be "US" or "UK" (received "${rawMarket}").`);
      return;
    }

    items.push({
      business_name,
      domain,
      niche,
      market,
      discovery_notes: notesRest.join(' | ').trim(),
      intake_mode: 'batch',
    });
  });

  return { items, errors };
}

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function leadsToCsv(leads: LeadRecord[]): string {
  const headers = [
    'id',
    'business_name',
    'domain',
    'niche',
    'market',
    'intake_mode',
    'total_score',
    'pain_signal',
    'niche_fit',
    'web_booking_gap',
    'reachability',
    'status',
    'gatekeeper_reason',
    'bottleneck_diagnosis',
    'outcome',
    'reward_points',
    'cold_email_subject',
    'cold_email_body',
    'social_dm',
    'created_at',
  ];

  const rows = leads.map((lead) => [
    lead.id,
    lead.business_name,
    lead.domain,
    lead.niche,
    lead.market,
    lead.intake_mode,
    lead.total_score,
    lead.sub_scores.pain_signal,
    lead.sub_scores.niche_fit,
    lead.sub_scores.web_booking_gap,
    lead.sub_scores.reachability,
    lead.status,
    lead.gatekeeper_reason,
    lead.bottleneck_diagnosis,
    lead.outcome ?? '',
    lead.reward_points,
    lead.outreach_pack?.cold_email.subject ?? '',
    lead.outreach_pack?.cold_email.body ?? '',
    lead.outreach_pack?.social_dm ?? '',
    lead.created_at,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvField(cell)).join(','))
    .join('\n');
}

export function parseImportedJson(rawJson: string): {
  leads: LeadRecord[];
  rewardMemory: RewardMemoryItem[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid JSON file. Could not parse backup payload.');
  }

  if (Array.isArray(parsed)) {
    return {
      leads: parsed.filter(isValidLeadShape),
      rewardMemory: [],
    };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const rawLeads = Array.isArray(obj.leads) ? obj.leads : [];
    const rawMemory = Array.isArray(obj.rewardMemory)
      ? obj.rewardMemory
      : Array.isArray(obj.reward_memory)
        ? obj.reward_memory
        : [];
    return {
      leads: rawLeads.filter(isValidLeadShape),
      rewardMemory: rawMemory.filter(isValidRewardMemoryShape),
    };
  }

  throw new Error('JSON must be an array of leads or a { leads, rewardMemory } backup object.');
}

function isValidLeadShape(item: unknown): item is LeadRecord {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.business_name === 'string' &&
    typeof r.domain === 'string' &&
    typeof r.total_score === 'number' &&
    typeof r.status === 'string'
  );
}

function isValidRewardMemoryShape(item: unknown): item is RewardMemoryItem {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.lead_id === 'string' &&
    typeof r.business_name === 'string' &&
    typeof r.reward_points === 'number' &&
    typeof r.outcome === 'string'
  );
}

export function shouldTriggerAutoBackup(
  approvedCountAtLastBackup: number,
  currentApprovedCount: number
): boolean {
  return currentApprovedCount - approvedCountAtLastBackup >= 5;
}
