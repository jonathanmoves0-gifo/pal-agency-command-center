import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import crypto from 'crypto';
import type {
  CalibrationContext,
  GraphNodeName,
  GroundingSource,
  LeadRecord,
  LeadStatus,
  Market,
  OutreachPack,
  ProspectInput,
  SubScores,
} from '../src/shared/types';
import {
  clampSubScores,
  computeTotalScore,
  isDuplicateProspect,
  routeLeadStatus,
} from '../src/utils/pipelineLogic';
import { invokeStructuredLlm, NODE_PACING_MS, sleepWithAbort } from './llmClient';

export type NodeObserver = (event: {
  phase: 'node_started' | 'node_pacing' | 'node_completed';
  node: GraphNodeName;
  provider?: string;
  message: string;
  data?: Record<string, unknown>;
}) => void;

interface ScoutPayload {
  businesses: Array<{
    business_name: string;
    domain: string;
    discovery_notes: string;
  }>;
}

interface PlannerPayload {
  bottleneck_diagnosis: string;
  missed_capture_leaks: string[];
  ai_web_opportunities: string[];
}

interface QualifierPayload {
  pain_signal: number;
  niche_fit: number;
  web_booking_gap: number;
  reachability: number;
  gatekeeper_reason: string;
}

interface OutreachPayload {
  cold_email: {
    subject: string;
    body: string;
  };
  social_dm: string;
  follow_up_sequence: Array<{
    step: number;
    day_offset: number;
    angle: string;
    message: string;
  }>;
}

// ---------------------------------------------------------------------------
// 1. Autonomous Niche Scout Graph (scout_node -> END)
// ---------------------------------------------------------------------------

const ScoutState = Annotation.Root({
  niche: Annotation<string>,
  region: Annotation<string>,
  existingLeads: Annotation<Array<{ business_name: string; domain: string }>>,
  discoveredProspects: Annotation<ProspectInput[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  groundingSources: Annotation<GroundingSource[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  providerUsed: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
});

export function buildScoutGraph(observer?: NodeObserver, signal?: AbortSignal) {
  const scout_node = async (state: typeof ScoutState.State) => {
    observer?.({
      phase: 'node_started',
      node: 'scout_node',
      message: `Scouting 5 real ${state.niche} businesses in ${state.region} via Google Search grounding...`,
    });

    const marketGuess: Market = /\b(uk|london|manchester|birmingham|leeds|glasgow|bristol|edinburgh|britain|england|scotland|wales)\b/i.test(
      state.region
    )
      ? 'UK'
      : 'US';

    const existingList = state.existingLeads
      .slice(0, 40)
      .map((l) => `${l.business_name} (${l.domain})`)
      .join(', ');

    const systemInstruction = `You are Pal Agency's Autonomous Niche Scout.
Use live Google Search results to identify 8 real, currently operating local/regional businesses matching the target niche and city/region so that after skipping any existing leads, at least 5 unique businesses remain.
Return ONLY valid JSON matching this exact schema (no prose, no markdown):
{
  "businesses": [
    {
      "business_name": "Exact real business name",
      "domain": "example.co.uk or example.com",
      "discovery_notes": "Concrete observation from search about their website, booking flow, reviews, or ad/conversion friction"
    }
  ]
}`;

    const prompt = `Target Industry Niche: ${state.niche}
Target City / Region: ${state.region}
Already in localStorage pipeline (MUST SKIP these): ${existingList || 'None'}

Find real independent or multi-location businesses in ${state.region} within "${state.niche}" that likely have web booking, lead capture, or after-hours responsiveness gaps. Output JSON only.`;

    const result = await invokeStructuredLlm<ScoutPayload>({
      role: 'research',
      systemInstruction,
      prompt,
      useGrounding: true,
      signal,
    });

    const rawList = Array.isArray(result.data?.businesses) ? result.data.businesses : [];
    const filtered: ProspectInput[] = [];

    for (const item of rawList) {
      if (!item?.business_name || !item?.domain) continue;
      if (isDuplicateProspect({ business_name: item.business_name, domain: item.domain }, state.existingLeads)) {
        continue;
      }
      if (isDuplicateProspect({ business_name: item.business_name, domain: item.domain }, filtered)) {
        continue;
      }
      filtered.push({
        business_name: item.business_name.trim(),
        domain: item.domain.trim(),
        niche: state.niche.trim(),
        market: marketGuess,
        discovery_notes: item.discovery_notes?.trim() || `Scouted in ${state.region}`,
        intake_mode: 'scout',
      });
      if (filtered.length >= 5) break;
    }

    observer?.({
      phase: 'node_completed',
      node: 'scout_node',
      provider: result.provider,
      message: `Discovered ${filtered.length} net-new prospects in ${state.region}.`,
      data: {
        discovered_count: filtered.length,
        businesses: filtered.map((b) => ({ business_name: b.business_name, domain: b.domain })),
        grounding_sources: result.groundingSources,
      },
    });

    return {
      discoveredProspects: filtered,
      groundingSources: result.groundingSources,
      providerUsed: result.provider,
    };
  };

  return new StateGraph(ScoutState)
    .addNode('scout_node', scout_node)
    .addEdge(START, 'scout_node')
    .addEdge('scout_node', END)
    .compile();
}

// ---------------------------------------------------------------------------
// 2. Main Self-Calibrating Signal Hunter Graph
//    planner_node -> qualifier_node -> [APPROVED -> outreach_architect_node] -> memory_logger_node
// ---------------------------------------------------------------------------

const SignalHunterState = Annotation.Root({
  prospect: Annotation<ProspectInput>,
  calibration: Annotation<CalibrationContext>,
  bottleneck_diagnosis: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  missed_capture_leaks: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  ai_web_opportunities: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  grounding_sources: Annotation<GroundingSource[]>({
    reducer: (prev, next) => {
      const merged = [...prev, ...next];
      const seen = new Set<string>();
      return merged.filter((item) => {
        if (seen.has(item.uri)) return false;
        seen.add(item.uri);
        return true;
      });
    },
    default: () => [],
  }),
  sub_scores: Annotation<SubScores>({
    reducer: (_, next) => next,
    default: () => ({ pain_signal: 0, niche_fit: 0, web_booking_gap: 0, reachability: 0 }),
  }),
  total_score: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  status: Annotation<LeadStatus>({
    reducer: (_, next) => next,
    default: () => 'PASS',
  }),
  gatekeeper_reason: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  outreach_pack: Annotation<OutreachPack | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  model_trace: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  lead_record: Annotation<LeadRecord | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

export function buildSignalHunterGraph(observer?: NodeObserver, signal?: AbortSignal) {
  const planner_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    observer?.({
      phase: 'node_started',
      node: 'planner_node',
      message: `Researching ${p.business_name} (${p.domain}) for booking leaks & AI/web gaps...`,
    });

    const systemInstruction = `You are Pal Agency's Signal Planner.
Conduct live research on the business and diagnose concrete operational bottlenecks, missed booking or lead-capture leaks, and high-ROI AI or web kit opportunities.
Return ONLY valid JSON matching this schema (no markdown fences, no commentary):
{
  "bottleneck_diagnosis": "2-3 sentence specific diagnosis of the primary revenue or conversion bottleneck",
  "missed_capture_leaks": ["Specific leak 1", "Specific leak 2", "Specific leak 3"],
  "ai_web_opportunities": ["High-ROI AI or Web Kit opportunity 1", "High-ROI opportunity 2"]
}`;

    const prompt = `Business Name: ${p.business_name}
Website / Domain: ${p.domain}
Industry Niche: ${p.niche}
Market: ${p.market}
Discovery Notes: ${p.discovery_notes || 'None provided'}

Diagnose exact operational bottlenecks, missed booking/capture leaks, and high-ROI AI/web opportunities.`;

    const result = await invokeStructuredLlm<PlannerPayload>({
      role: 'research',
      systemInstruction,
      prompt,
      useGrounding: true,
      signal,
    });

    const diagnosis =
      result.data?.bottleneck_diagnosis?.trim() ||
      'Manual enquiry handling and unoptimized booking capture flow.';
    const leaks = Array.isArray(result.data?.missed_capture_leaks)
      ? result.data.missed_capture_leaks.slice(0, 4).map((x) => String(x))
      : ['Unstructured contact form without instant slot booking'];
    const opportunities = Array.isArray(result.data?.ai_web_opportunities)
      ? result.data.ai_web_opportunities.slice(0, 4).map((x) => String(x))
      : ['Automated booking triage widget + instant SMS/email follow-up'];

    observer?.({
      phase: 'node_completed',
      node: 'planner_node',
      provider: result.provider,
      message: `Diagnosis complete (${leaks.length} capture leaks identified).`,
      data: {
        bottleneck_diagnosis: diagnosis,
        missed_capture_leaks: leaks,
        ai_web_opportunities: opportunities,
        grounding_sources: result.groundingSources,
      },
    });

    observer?.({
      phase: 'node_pacing',
      node: 'planner_node',
      message: `Enforcing ${NODE_PACING_MS / 1000}s node pacing before qualifier_node...`,
    });
    await sleepWithAbort(NODE_PACING_MS, signal);

    return {
      bottleneck_diagnosis: diagnosis,
      missed_capture_leaks: leaks,
      ai_web_opportunities: opportunities,
      grounding_sources: result.groundingSources,
      model_trace: [`planner:${result.provider}`],
    };
  };

  const qualifier_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    observer?.({
      phase: 'node_started',
      node: 'qualifier_node',
      message: `Scoring ${p.business_name} against ${state.calibration.top_winners.length} winners & ${state.calibration.top_penalized.length} penalized calibration leads...`,
    });

    const winnersBlock =
      state.calibration.top_winners.length > 0
        ? state.calibration.top_winners
            .map(
              (w, idx) =>
                `Winner #${idx + 1} (${w.outcome}, +${w.reward_points} pts): ${w.business_name} [${w.niche}/${w.market}] Score ${w.total_score}/100 | Bottleneck: ${w.bottleneck_diagnosis} | Reason: ${w.gatekeeper_reason}`
            )
            .join('\n')
        : 'None recorded yet.';

    const penalizedBlock =
      state.calibration.top_penalized.length > 0
        ? state.calibration.top_penalized
            .map(
              (l, idx) =>
                `Penalized #${idx + 1} (${l.outcome}, ${l.reward_points} pts): ${l.business_name} [${l.niche}/${l.market}] Score ${l.total_score}/100 | Bottleneck: ${l.bottleneck_diagnosis} | Reason: ${l.gatekeeper_reason}`
            )
            .join('\n')
        : 'None recorded yet.';

    const systemInstruction = `You are Pal Agency's Self-Calibrating Lead Qualifier.
Score the prospect on four strict 0-25 dimensions (summing to 0-100):
- pain_signal (0-25): severity and revenue cost of the operational bottleneck
- niche_fit (0-25): alignment with high-LTV service clinics/local retainers in US/UK
- web_booking_gap (0-25): concrete website, booking widget, or speed-to-lead gap
- reachability (0-25): likelihood of reaching a founder/practice manager directly

Use the Reward Memory calibration context to reward patterns similar to past winners (+25/+10) and penalize patterns similar to past wrong fits/no-replies (-15/-2).
Return ONLY valid JSON:
{
  "pain_signal": 0,
  "niche_fit": 0,
  "web_booking_gap": 0,
  "reachability": 0,
  "gatekeeper_reason": "Single concise sentence explaining why this lead passed, needs review, or was approved."
}`;

    const prompt = `PROSPECT:
Business: ${p.business_name} (${p.domain})
Niche: ${p.niche} | Market: ${p.market}
Discovery Notes: ${p.discovery_notes || 'None'}
Planner Diagnosis: ${state.bottleneck_diagnosis}
Missed Capture Leaks: ${state.missed_capture_leaks.join('; ')}
AI/Web Opportunities: ${state.ai_web_opportunities.join('; ')}

CALIBRATION CONTEXT — TOP REWARDED WINNING LEADS:
${winnersBlock}

CALIBRATION CONTEXT — TOP PENALIZED LEADS:
${penalizedBlock}

Output raw JSON only.`;

    const result = await invokeStructuredLlm<QualifierPayload>({
      role: 'scoring',
      systemInstruction,
      prompt,
      useGrounding: false,
      signal,
    });

    const subScores = clampSubScores(result.data);
    const totalScore = computeTotalScore(subScores);
    const status = routeLeadStatus(totalScore);
    const gatekeeperReason =
      result.data?.gatekeeper_reason?.trim() ||
      `Scored ${totalScore}/100 across pain, niche fit, booking gap, and reachability.`;

    observer?.({
      phase: 'node_completed',
      node: 'qualifier_node',
      provider: result.provider,
      message: `Qualified ${totalScore}/100 -> ${status}`,
      data: {
        sub_scores: subScores,
        total_score: totalScore,
        status,
        gatekeeper_reason: gatekeeperReason,
      },
    });

    observer?.({
      phase: 'node_pacing',
      node: 'qualifier_node',
      message: `Enforcing ${NODE_PACING_MS / 1000}s node pacing before next step...`,
    });
    await sleepWithAbort(NODE_PACING_MS, signal);

    return {
      sub_scores: subScores,
      total_score: totalScore,
      status,
      gatekeeper_reason: gatekeeperReason,
      model_trace: [`qualifier:${result.provider}`],
    };
  };

  const outreach_architect_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    observer?.({
      phase: 'node_started',
      node: 'outreach_architect_node',
      message: `Drafting tailored outreach pack for ${p.business_name} (score ${state.total_score}/100)...`,
    });

    const winningExamples = state.calibration.top_winners
      .filter((w) => Boolean(w.outreach_cold_email))
      .map(
        (w, i) =>
          `Winning Outreach #${i + 1} (${w.outcome}, +${w.reward_points}):\n${w.outreach_cold_email}`
      )
      .join('\n---\n');

    const systemInstruction = `You are Pal Agency's Outreach Architect.
Write direct, peer-level, non-salesy outreach tailored strictly to the exact bottleneck discovered on the prospect's site/workflow. Avoid hype, exclamation marks, or generic agency fluff.
Return ONLY valid JSON matching this schema:
{
  "cold_email": {
    "subject": "Short plain-text subject line referencing the specific gap",
    "body": "Concise 80-120 word cold email naming the exact leak and offering a zero-pressure 5-min teardown"
  },
  "social_dm": "Short 2-3 sentence LinkedIn/Instagram DM",
  "follow_up_sequence": [
    { "step": 1, "day_offset": 3, "angle": "Evidence nudge", "message": "Short follow-up message" },
    { "step": 2, "day_offset": 7, "angle": "Micro-loom / mockup", "message": "Short follow-up message" },
    { "step": 3, "day_offset": 12, "angle": "Clean close-the-loop", "message": "Short follow-up message" }
  ]
}`;

    const prompt = `PROSPECT: ${p.business_name} (${p.domain}) | ${p.niche} | ${p.market}
BOTTLENECK: ${state.bottleneck_diagnosis}
MISSED CAPTURE LEAKS: ${state.missed_capture_leaks.join('; ')}
AI / WEB OPPORTUNITIES: ${state.ai_web_opportunities.join('; ')}
GATEKEEPER REASON: ${state.gatekeeper_reason}

HIGH-REWARD PAST OUTREACH EXAMPLES FOR TONE CALIBRATION:
${winningExamples || 'No prior winning email examples yet — keep tone razor-sharp, observational, and non-salesy.'}

Output raw JSON only.`;

    const result = await invokeStructuredLlm<OutreachPayload>({
      role: 'outreach',
      systemInstruction,
      prompt,
      useGrounding: false,
      signal,
    });

    const outreachPack: OutreachPack = {
      cold_email: {
        subject:
          result.data?.cold_email?.subject?.trim() ||
          `Booking capture gap on ${p.domain}`,
        body:
          result.data?.cold_email?.body?.trim() ||
          `Hi team at ${p.business_name},\n\nNoticed ${state.missed_capture_leaks[0] || 'a friction point in your enquiry flow'} on ${p.domain}. Happy to send over a 2-minute teardown showing how clinics in ${p.market} capture those missed bookings automatically.\n\nWorth sending over?`,
      },
      social_dm:
        result.data?.social_dm?.trim() ||
        `Hey ${p.business_name} team — quick note after checking ${p.domain}: spotted ${state.missed_capture_leaks[0] || 'an enquiry leak'} that usually costs 15-20% of paid leads. Want me to send the 2-min fix notes?`,
      follow_up_sequence:
        Array.isArray(result.data?.follow_up_sequence) &&
        result.data.follow_up_sequence.length > 0
          ? result.data.follow_up_sequence.slice(0, 3).map((step, idx) => ({
              step: typeof step.step === 'number' ? step.step : idx + 1,
              day_offset: typeof step.day_offset === 'number' ? step.day_offset : (idx + 1) * 4,
              angle: step.angle?.trim() || `Follow-up ${idx + 1}`,
              message: step.message?.trim() || 'Checking back briefly on the teardown note.',
            }))
          : [
              {
                step: 1,
                day_offset: 3,
                angle: 'Specific leak reminder',
                message: `Bumping this once — happy to share the exact ${p.domain} booking flow note if helpful.`,
              },
              {
                step: 2,
                day_offset: 7,
                angle: 'Interactive prototype',
                message: `Built a quick 60-second mock booking widget for ${p.business_name} — can send the link if you want to preview it.`,
              },
              {
                step: 3,
                day_offset: 12,
                angle: 'Close loop',
                message: `Closing the loop here so I don't clutter your inbox. Reach out anytime if conversion speed becomes a priority.`,
              },
            ],
    };

    observer?.({
      phase: 'node_completed',
      node: 'outreach_architect_node',
      provider: result.provider,
      message: 'Cold email, social DM, and 3-step follow-up sequence synthesized.',
      data: {
        outreach_pack: outreachPack,
      },
    });

    observer?.({
      phase: 'node_pacing',
      node: 'outreach_architect_node',
      message: `Enforcing ${NODE_PACING_MS / 1000}s node pacing before memory_logger_node...`,
    });
    await sleepWithAbort(NODE_PACING_MS, signal);

    return {
      outreach_pack: outreachPack,
      model_trace: [`outreach:${result.provider}`],
    };
  };

  const memory_logger_node = async (state: typeof SignalHunterState.State) => {
    observer?.({
      phase: 'node_started',
      node: 'memory_logger_node',
      message: `Packaging lead record for localStorage persistence (${state.status})...`,
    });

    const now = new Date().toISOString();
    const leadRecord: LeadRecord = {
      id: `lead_${crypto.randomUUID().slice(0, 8)}`,
      business_name: state.prospect.business_name,
      domain: state.prospect.domain,
      niche: state.prospect.niche,
      market: state.prospect.market,
      discovery_notes: state.prospect.discovery_notes,
      intake_mode: state.prospect.intake_mode,
      bottleneck_diagnosis: state.bottleneck_diagnosis,
      missed_capture_leaks: state.missed_capture_leaks,
      ai_web_opportunities: state.ai_web_opportunities,
      grounding_sources: state.grounding_sources,
      sub_scores: state.sub_scores,
      total_score: state.total_score,
      status: state.status,
      gatekeeper_reason: state.gatekeeper_reason,
      outreach_pack: state.outreach_pack,
      outcome: null,
      reward_points: 0,
      created_at: now,
      updated_at: now,
      model_trace: state.model_trace,
    };

    observer?.({
      phase: 'node_completed',
      node: 'memory_logger_node',
      message: `Logged ${leadRecord.business_name} (${leadRecord.total_score}/100 · ${leadRecord.status}).`,
      data: { lead_id: leadRecord.id, status: leadRecord.status },
    });

    return {
      lead_record: leadRecord,
    };
  };

  const routeAfterQualifier = (state: typeof SignalHunterState.State) => {
    if (state.status === 'APPROVED_FOR_OUTREACH') {
      return 'outreach_architect_node';
    }
    return 'memory_logger_node';
  };

  return new StateGraph(SignalHunterState)
    .addNode('planner_node', planner_node)
    .addNode('qualifier_node', qualifier_node)
    .addNode('outreach_architect_node', outreach_architect_node)
    .addNode('memory_logger_node', memory_logger_node)
    .addEdge(START, 'planner_node')
    .addEdge('planner_node', 'qualifier_node')
    .addConditionalEdges('qualifier_node', routeAfterQualifier, {
      outreach_architect_node: 'outreach_architect_node',
      memory_logger_node: 'memory_logger_node',
    })
    .addEdge('outreach_architect_node', 'memory_logger_node')
    .addEdge('memory_logger_node', END)
    .compile();
}
