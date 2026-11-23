import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import crypto from 'crypto';
import type {
  CalibrationContext,
  DecisionMakerMatch,
  GraphNodeName,
  GroundingSource,
  LeadProofAsset,
  LeadRecord,
  LeadStatus,
  OutreachPack,
  ProspectInput,
  SubScores,
  WebsiteAuditSummary,
} from '../src/shared/types';
import {
  deriveDetectedProblems,
  isFakeOrPlaceholderBusiness,
} from '../src/utils/contactFormatters';
import {
  clampSubScores,
  computeTotalScore,
  routeLeadStatus,
} from '../src/utils/pipelineLogic';
import { buildLeadProofAsset } from '../src/utils/proofBuilder';
import { invokeStructuredLlm, NODE_PACING_MS, sleepWithAbort } from './llmClient';
import {
  type AuditedBusinessData,
  auditBusinessWebsite,
  discoverAndVerifyQualifiedProspects,
  type VerifiedProspectCandidate,
} from './webCrawler';

export type NodeObserver = (event: {
  phase: 'node_started' | 'node_pacing' | 'node_completed';
  node: GraphNodeName;
  provider?: string;
  message: string;
  data?: Record<string, unknown>;
}) => void;

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
  qualifiedProspects: Annotation<VerifiedProspectCandidate[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  rawFoundCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  filteredOutCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  missingPhoneCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  missingDecisionMakerCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
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
      message: `Searching live web sources for ${state.niche} in ${state.region} and verifying WhatsApp numbers + decision makers...`,
    });

    const discovery = await discoverAndVerifyQualifiedProspects({
      niche: state.niche,
      region: state.region,
      existingLeads: state.existingLeads,
      signal,
    });

    const providerLabel = `OpenStreetMap (${discovery.overpassCount}) + DuckDuckGo (${discovery.searchCount})`;
    const qualifiedCount = discovery.qualified.length;
    const summaryMsg =
      discovery.rawFoundCount > 0
        ? `Found ${discovery.rawFoundCount} businesses → Kept ${qualifiedCount} with verified WhatsApp + Decision Maker (${discovery.filteredOutCount} filtered out)`
        : `No live directory or search listings matched "${state.niche}" in "${state.region}" right now.`;

    observer?.({
      phase: 'node_completed',
      node: 'scout_node',
      provider: providerLabel,
      message: summaryMsg,
      data: {
        discovered_count: qualifiedCount,
        raw_found_count: discovery.rawFoundCount,
        qualified_count: qualifiedCount,
        filtered_out_count: discovery.filteredOutCount,
        missing_phone_count: discovery.missingPhoneCount,
        missing_decision_maker_count: discovery.missingDecisionMakerCount,
        businesses: discovery.qualified.map((q) => ({
          business_name: q.prospect.business_name,
          domain: q.prospect.domain,
          decision_maker_name: q.crawlData.decisionMakers[0]?.name,
        })),
        grounding_sources: discovery.sources,
      },
    });

    return {
      qualifiedProspects: discovery.qualified,
      rawFoundCount: discovery.rawFoundCount,
      filteredOutCount: discovery.filteredOutCount,
      missingPhoneCount: discovery.missingPhoneCount,
      missingDecisionMakerCount: discovery.missingDecisionMakerCount,
      groundingSources: discovery.sources,
      providerUsed: providerLabel,
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
//    planner_node -> qualifier_node -> proof_builder_node -> outreach_architect_node -> memory_logger_node
// ---------------------------------------------------------------------------

const SignalHunterState = Annotation.Root({
  prospect: Annotation<ProspectInput>,
  calibration: Annotation<CalibrationContext>,
  pre_audited_data: Annotation<AuditedBusinessData | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
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
  address: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  contact_emails: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  contact_phones: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  whatsapp_numbers: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  has_direct_whatsapp_link: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  decision_makers: Annotation<DecisionMakerMatch[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  detected_problems: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  website_audit: Annotation<WebsiteAuditSummary | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  proof_asset: Annotation<LeadProofAsset | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
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

function formatWebsiteAuditForPrompt(opts: {
  audit: WebsiteAuditSummary;
  emails: string[];
  phones: string[];
  whatsappNumbers: string[];
  decisionMaker?: DecisionMakerMatch;
  address?: string;
}): string {
  const { audit, emails, phones, whatsappNumbers, decisionMaker, address } = opts;
  return [
    `Website Reachable: ${audit.reachable ? 'Yes' : `No (${audit.error_note || 'unreachable'})`}`,
    `HTTPS / SSL: ${audit.has_ssl ? 'Yes' : 'No'}`,
    `Mobile Viewport Tag: ${audit.has_mobile_viewport ? 'Present' : 'Missing'}`,
    `Online Booking Tool Detected: ${audit.has_booking_tool ? (audit.booking_tools_found.length ? audit.booking_tools_found.join(', ') : 'Inline booking copy/form') : 'None detected'}`,
    `Live Chat / Instant Widget Detected: ${audit.has_live_chat ? audit.chat_tools_found.join(', ') : 'None detected'}`,
    `Actionable CTA Buttons/Links Found: ${audit.cta_count}`,
    `Verified Decision Maker: ${decisionMaker ? `${decisionMaker.name} (${decisionMaker.role}) [${decisionMaker.source}]` : 'None found'}`,
    `Extracted Emails: ${emails.length ? emails.join(', ') : 'None found on homepage or /contact'}`,
    `Extracted Phones: ${phones.length ? phones.join(', ') : 'None found'}`,
    `WhatsApp Numbers: ${whatsappNumbers.length ? whatsappNumbers.join(', ') : 'None detected'}`,
    address ? `Street Address: ${address}` : '',
    audit.page_title ? `Homepage Title: ${audit.page_title}` : '',
    audit.homepage_excerpt ? `Homepage Text Excerpt:\n${audit.homepage_excerpt.slice(0, 900)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildSignalHunterGraph(observer?: NodeObserver, signal?: AbortSignal) {
  const planner_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    if (isFakeOrPlaceholderBusiness(p.business_name, p.domain || `${p.business_name}.com`)) {
      throw new Error(`Filtered out placeholder or test business (${p.business_name}).`);
    }

    observer?.({
      phase: 'node_started',
      node: 'planner_node',
      message: state.pre_audited_data
        ? `Analyzing verified audit & gaps for ${p.business_name}...`
        : `Scanning ${p.domain} (/contact, /about, /team) for verified WhatsApp & decision maker...`,
    });

    const crawlResult =
      state.pre_audited_data ??
      (await auditBusinessWebsite({
        domain: p.domain,
        businessName: p.business_name,
        market: p.market,
        regionHint: [p.address, p.discovery_notes].filter(Boolean).join(' '),
        preFoundEmails: p.pre_found_emails,
        preFoundPhones: p.pre_found_phones,
        preFoundWhatsApp: p.pre_found_whatsapp,
        preFoundDecisionMaker: p.pre_found_decision_maker,
        preFoundDirectWhatsApp: p.has_direct_whatsapp_link,
        signal,
      }));

    // Mandatory 2-Part Qualification Gate: Verified WhatsApp/Phone AND Verified Decision Maker
    const hasVerifiedPhone =
      crawlResult.whatsappNumbers.length > 0 || crawlResult.phones.length > 0;
    const primaryDm = crawlResult.decisionMakers[0];

    if (!hasVerifiedPhone) {
      throw new Error(
        `Filtered out ${p.business_name}: no verified real phone or WhatsApp number found.`
      );
    }
    if (!primaryDm) {
      throw new Error(
        `Filtered out ${p.business_name}: no verified decision maker (Founder, Owner, CEO, Director) found on website or search.`
      );
    }

    const liveAuditBlock = formatWebsiteAuditForPrompt({
      audit: crawlResult.audit,
      emails: crawlResult.emails,
      phones: crawlResult.phones,
      whatsappNumbers: crawlResult.whatsappNumbers,
      decisionMaker: primaryDm,
      address: p.address,
    });

    const systemInstruction = `You are Pal Agency's Business Systems & Conversion Analyst.
Evaluate the business strictly across our three core B2B capabilities: (1) Professional Website Design & High-Converting Landing Pages, (2) AI Business Automation (24/7 AI receptionists, instant lead capture, automated follow-ups, CRM sync), and (3) Custom Agentic AI Systems (autonomous multi-step AI research, qualification, and routing workflows). Never suggest UGC or creator video services.
Base your diagnosis strictly on the Live Website Audit & Contact Scan facts provided below (e.g., missing booking widget, missing live chat, missing mobile viewport, unreachable/outdated site, manual phone/email only).
Return ONLY valid JSON matching this schema (no markdown fences, no commentary):
{
  "bottleneck_diagnosis": "2-3 sentence specific diagnosis citing real observations from the scanned website or directory listing",
  "missed_capture_leaks": ["Specific conversion or response leak 1", "Specific leak 2", "Specific leak 3"],
  "ai_web_opportunities": ["High-ROI Website Design, AI Automation, or Agentic AI solution 1", "High-ROI solution 2"]
}`;

    const prompt = `Business Name: ${p.business_name}
Website / Domain: ${p.domain || 'None listed'}
Industry: ${p.niche}
Market: ${p.market}
Decision Maker: ${primaryDm.name} (${primaryDm.role})
Discovery Notes: ${p.discovery_notes || 'None provided'}

LIVE WEBSITE AUDIT & CONTACT CRAWL:
${liveAuditBlock}

Diagnose exact website conversion gaps, missed inquiry leaks, and high-ROI Website Design, AI Business Automation, or Custom Agentic AI opportunities.`;

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
      : ['Automated booking triage widget + instant SMS/WhatsApp follow-up'];

    const detectedProblems = deriveDetectedProblems(crawlResult.audit, leaks);
    const combinedSources = [...crawlResult.sources, ...result.groundingSources];

    observer?.({
      phase: 'node_completed',
      node: 'planner_node',
      provider: result.provider,
      message: `Verified ${primaryDm.name} (${primaryDm.role}) & WhatsApp/phone; detected ${detectedProblems.join(', ')}.`,
      data: {
        bottleneck_diagnosis: diagnosis,
        missed_capture_leaks: leaks,
        ai_web_opportunities: opportunities,
        detected_problems: detectedProblems,
        decision_maker: primaryDm,
        grounding_sources: combinedSources,
        contact_emails: crawlResult.emails,
        contact_phones: crawlResult.phones,
        whatsapp_numbers: crawlResult.whatsappNumbers,
      },
    });

    observer?.({
      phase: 'node_pacing',
      node: 'planner_node',
      message: `Preparing scoring analysis...`,
    });
    await sleepWithAbort(NODE_PACING_MS, signal);

    return {
      bottleneck_diagnosis: diagnosis,
      missed_capture_leaks: leaks,
      ai_web_opportunities: opportunities,
      detected_problems: detectedProblems,
      grounding_sources: combinedSources,
      address: p.address,
      contact_emails: crawlResult.emails,
      contact_phones: crawlResult.phones,
      whatsapp_numbers: crawlResult.whatsappNumbers,
      has_direct_whatsapp_link: crawlResult.hasDirectWhatsAppLink,
      decision_makers: crawlResult.decisionMakers,
      website_audit: crawlResult.audit,
      model_trace: [`planner:${result.provider}`],
    };
  };

  const qualifier_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    const primaryDm = state.decision_makers[0];
    observer?.({
      phase: 'node_started',
      node: 'qualifier_node',
      message: `Scoring business fit (0–100) for ${p.business_name}...`,
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

    const auditFacts = state.website_audit
      ? `Website Reachable: ${state.website_audit.reachable ? 'Yes' : 'No'} | SSL: ${state.website_audit.has_ssl ? 'Yes' : 'No'} | Mobile Viewport: ${state.website_audit.has_mobile_viewport ? 'Yes' : 'No'} | Booking Tool: ${state.website_audit.has_booking_tool ? 'Yes' : 'Missing'} | Live Chat: ${state.website_audit.has_live_chat ? 'Yes' : 'Missing'} | Decision Maker: ${primaryDm ? `${primaryDm.name} (${primaryDm.role})` : 'Verified'} | Emails Found: ${state.contact_emails.length} | Phones/WhatsApp Found: ${state.contact_phones.length + state.whatsapp_numbers.length}`
      : 'No live scan data';

    const systemInstruction = `You are Pal Agency's Business Fit Qualifier.
Score the prospect on four strict 0-25 dimensions (summing to 0-100):
- pain_signal (0-25): severity and revenue cost of their website, manual intake, or workflow bottleneck
- niche_fit (0-25): alignment with high-LTV businesses suited for Website Design, AI Business Automation, or Custom Agentic AI Systems
- web_booking_gap (0-25): concrete landing page conversion gap, booking friction, or slow speed-to-lead gap from the scanned website
- reachability (0-25): direct contactability based on discovered verified phone/WhatsApp, email, and decision-maker access

Use the Reward Memory calibration context to reward patterns similar to past winners (+25/+10) and penalize patterns similar to past non-fits/no-replies (-15/-2). Never mention UGC or video retainers.
Return ONLY valid JSON:
{
  "pain_signal": 0,
  "niche_fit": 0,
  "web_booking_gap": 0,
  "reachability": 0,
  "gatekeeper_reason": "Single concise plain-English sentence explaining why this business fits or does not fit our Website Design, AI Automation, or Agentic AI pillars."
}`;

    const prompt = `PROSPECT:
Business: ${p.business_name} (${p.domain})
Niche: ${p.niche} | Market: ${p.market}
Decision Maker: ${primaryDm ? `${primaryDm.name} — ${primaryDm.role}` : 'Verified'}
Detected Website Problems: ${state.detected_problems.join(', ') || 'See audit'}
Discovery Notes: ${p.discovery_notes || 'None'}
Live Crawl Summary: ${auditFacts}
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
      `Scored ${totalScore}/100 across pain, niche fit, booking gap, and verified reachability.`;

    observer?.({
      phase: 'node_completed',
      node: 'qualifier_node',
      provider: result.provider,
      message: `Scored ${totalScore}/100 (${status === 'APPROVED_FOR_OUTREACH' ? 'Strong Fit' : status === 'NEEDS_REVIEW' ? 'Worth Reviewing' : 'Low Fit'}).`,
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
      message: `Preparing custom Proof & Demo...`,
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

  const proof_builder_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    const primaryDm = state.decision_makers[0];
    observer?.({
      phase: 'node_started',
      node: 'proof_builder_node',
      message: `Building custom Proof & Demo for ${p.business_name}...`,
    });

    const proofAsset = buildLeadProofAsset({
      id: p.domain.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'lead',
      business_name: p.business_name,
      domain: p.domain,
      niche: p.niche,
      market: p.market,
      address: state.address,
      decision_maker_name: primaryDm?.name,
      decision_maker_role: primaryDm?.role,
      discovery_notes: p.discovery_notes,
      bottleneck_diagnosis: state.bottleneck_diagnosis,
      missed_capture_leaks: state.missed_capture_leaks,
      ai_web_opportunities: state.ai_web_opportunities,
      website_audit: state.website_audit,
      contact_phones: state.whatsapp_numbers.length ? state.whatsapp_numbers : state.contact_phones,
      contact_emails: state.contact_emails,
    });

    observer?.({
      phase: 'node_completed',
      node: 'proof_builder_node',
      provider: proofAsset.pillar_label,
      message:
        proofAsset.pillar === 'website_design'
          ? `Built tailored Website Redesign Preview for ${p.business_name}.`
          : `Built interactive ${proofAsset.pillar_label} Proof Blueprint for ${p.business_name}.`,
      data: {
        proof_title: proofAsset.title,
        pillar: proofAsset.pillar,
        pillar_label: proofAsset.pillar_label,
      },
    });

    await sleepWithAbort(300, signal);

    return {
      proof_asset: proofAsset,
      model_trace: [`proof:${proofAsset.pillar}`],
    };
  };

  const outreach_architect_node = async (state: typeof SignalHunterState.State) => {
    const p = state.prospect;
    const proof = state.proof_asset;
    const primaryDm = state.decision_makers[0];
    const dmName = primaryDm?.name || '';
    const dmRole = primaryDm?.role || '';
    const pillarLabel = proof?.pillar_label || 'AI Business Automation';
    const problemsSummary = state.detected_problems.join(', ') || state.missed_capture_leaks[0] || 'online inquiry friction';

    observer?.({
      phase: 'node_started',
      node: 'outreach_architect_node',
      message: `Writing personalized Email Proposal & WhatsApp Pitch for ${dmName || p.business_name}...`,
    });

    const winningExamples = state.calibration.top_winners
      .filter((w) => Boolean(w.outreach_cold_email))
      .map(
        (w, i) =>
          `Winning Outreach #${i + 1} (${w.outcome}, +${w.reward_points}):\n${w.outreach_cold_email}`
      )
      .join('\n---\n');

    const systemInstruction = `You are Pal Agency's B2B Proposal & Outreach Writer.
Write a direct, peer-level, human Proposal Kit addressed personally to ${dmName ? `${dmName} (${dmRole})` : p.business_name}, tailored strictly to their real website audit findings (${problemsSummary}), the recommended agency pillar (${pillarLabel}), and the custom Proof/Demo we already built for this exact business. Avoid hype, exclamation marks, spam words, or upfront pricing quotes. Never mention UGC, video scripts, or content creators.
Return ONLY valid JSON matching this schema:
{
  "cold_email": {
    "subject": "Specific, curiosity-driven subject line explicitly mentioning ${p.business_name} (no spam words)",
    "body": "Clean 110-150 word Email Proposal addressed to ${dmName || p.business_name} containing: (1) a specific observation from their live website audit, (2) the exact recommended solution mapped to ${pillarLabel}, and (3) a clear 'Attached Proof / Demo Built for ${p.business_name}' section inviting them to review the custom preview with zero upfront pricing pressure."
  },
  "social_dm": "Crisp 3-4 sentence conversational WhatsApp pitch addressed to ${dmName || p.business_name} mentioning ${p.business_name}'s specific gap and offering to send over the custom demo/proof we already built for them.",
  "follow_up_sequence": [
    { "step": 1, "day_offset": 3, "angle": "Audit observation reminder", "message": "Short 2-sentence follow-up message" },
    { "step": 2, "day_offset": 7, "angle": "Custom Proof / Demo nudge", "message": "Short 2-sentence follow-up offering the custom preview built for ${p.business_name}" },
    { "step": 3, "day_offset": 12, "angle": "Clean close-the-loop", "message": "Short polite closing message" }
  ]
}`;

    const prompt = `PROSPECT: ${p.business_name} (${p.domain}) | ${p.niche} | ${p.market}
DECISION MAKER: ${dmName ? `${dmName} (${dmRole})` : 'Not named'}
RECOMMENDED AGENCY PILLAR: ${pillarLabel}
DETECTED PROBLEMS: ${problemsSummary}
AUTO-BUILT PROOF / DEMO ASSET: ${proof?.title || `Custom Demo for ${p.business_name}`} — ${proof?.summary || ''}
WEBSITE AUDIT OBSERVATIONS: ${state.bottleneck_diagnosis}
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

    const proofTitle = proof?.title || `Custom ${pillarLabel} Proof for ${p.business_name}`;
    const topLeak = state.missed_capture_leaks[0] || `a friction point (${problemsSummary})`;
    const greeting = dmName ? `Hi ${dmName}` : `Hi team at ${p.business_name}`;

    const outreachPack: OutreachPack = {
      cold_email: {
        subject:
          result.data?.cold_email?.subject?.trim() ||
          `Built a quick ${pillarLabel.toLowerCase()} proof for ${p.business_name}`,
        body:
          result.data?.cold_email?.body?.trim() ||
          `${greeting},\n\nI checked ${p.domain || p.business_name} earlier and noticed ${topLeak} (${problemsSummary}).\n\nFor ${p.niche} teams, our ${pillarLabel} solution removes that manual bottleneck so new inquiries convert automatically around the clock.\n\nAttached Proof / Demo Built for ${p.business_name}:\nI already put together a working ${proofTitle} tailored specifically to ${p.business_name} — happy to send the preview link over with zero upfront pricing pressure.\n\nWorth taking a quick look?`,
      },
      social_dm:
        result.data?.social_dm?.trim() ||
        `${greeting} — I checked ${p.domain || p.business_name} earlier and spotted ${topLeak}. Rather than pitching cold, I already built a tailored ${proofTitle} specifically for ${p.business_name}. Want me to drop the quick preview here so you can check it out?`,
      follow_up_sequence:
        Array.isArray(result.data?.follow_up_sequence) &&
        result.data.follow_up_sequence.length > 0
          ? result.data.follow_up_sequence.slice(0, 3).map((step, idx) => ({
              step: typeof step.step === 'number' ? step.step : idx + 1,
              day_offset: typeof step.day_offset === 'number' ? step.day_offset : (idx + 1) * 4,
              angle: step.angle?.trim() || `Follow-up ${idx + 1}`,
              message: step.message?.trim() || 'Checking back briefly on the custom preview note.',
            }))
          : [
              {
                step: 1,
                day_offset: 3,
                angle: 'Specific leak reminder',
                message: `Bumping this once — happy to share the exact ${p.domain || p.business_name} audit note if helpful.`,
              },
              {
                step: 2,
                day_offset: 7,
                angle: 'Custom Proof / Demo',
                message: `Still have the ${proofTitle} ready for you to click through whenever you have 60 seconds.`,
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
      message: `Email Proposal & WhatsApp Pitch personalized for ${dmName || p.business_name}.`,
      data: {
        outreach_pack: outreachPack,
      },
    });

    observer?.({
      phase: 'node_pacing',
      node: 'outreach_architect_node',
      message: `Saving verified lead, Proof asset, and Proposal Kit...`,
    });
    await sleepWithAbort(NODE_PACING_MS, signal);

    return {
      outreach_pack: outreachPack,
      model_trace: [`outreach:${result.provider}`],
    };
  };

  const memory_logger_node = async (state: typeof SignalHunterState.State) => {
    const primaryDm = state.decision_makers[0];
    observer?.({
      phase: 'node_started',
      node: 'memory_logger_node',
      message: `Saving ${state.prospect.business_name} (${primaryDm?.name || 'Verified Lead'}) to Decision Queue...`,
    });

    const now = new Date().toISOString();
    const leadId = `lead_${crypto.randomUUID().slice(0, 8)}`;
    const leadRecord: LeadRecord = {
      id: leadId,
      business_name: state.prospect.business_name,
      domain: state.prospect.domain,
      niche: state.prospect.niche,
      market: state.prospect.market,
      discovery_notes: state.prospect.discovery_notes,
      intake_mode: state.prospect.intake_mode,
      address: state.address,
      contact_emails: state.contact_emails,
      contact_phones: state.contact_phones,
      whatsapp_numbers: state.whatsapp_numbers,
      has_direct_whatsapp_link: state.has_direct_whatsapp_link,
      decision_maker_name: primaryDm?.name,
      decision_maker_role: primaryDm?.role,
      decision_maker_source: primaryDm?.source,
      detected_problems: state.detected_problems,
      outreach_decision: 'pending',
      website_audit: state.website_audit,
      proof_asset: state.proof_asset
        ? { ...state.proof_asset, id: `proof_${leadId}` }
        : undefined,
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
      message: `Saved ${leadRecord.business_name} (${leadRecord.total_score}/100) to Decision Queue.`,
      data: { lead_id: leadRecord.id, status: leadRecord.status },
    });

    return {
      lead_record: leadRecord,
    };
  };

  return new StateGraph(SignalHunterState)
    .addNode('planner_node', planner_node)
    .addNode('qualifier_node', qualifier_node)
    .addNode('proof_builder_node', proof_builder_node)
    .addNode('outreach_architect_node', outreach_architect_node)
    .addNode('memory_logger_node', memory_logger_node)
    .addEdge(START, 'planner_node')
    .addEdge('planner_node', 'qualifier_node')
    .addEdge('qualifier_node', 'proof_builder_node')
    .addEdge('proof_builder_node', 'outreach_architect_node')
    .addEdge('outreach_architect_node', 'memory_logger_node')
    .addEdge('memory_logger_node', END)
    .compile();
}

