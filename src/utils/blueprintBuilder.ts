import type { LeadRecord } from '../shared/types';

export type SolutionFocus = 'ai_automation' | 'agentic_ai';

export interface BlueprintChannelOption {
  id: string;
  label: string;
  description: string;
}

export interface WorkflowStep {
  stepNumber: number;
  stage: 'Trigger' | 'AI Intelligence' | 'System Action' | 'Client Result';
  title: string;
  detail: string;
}

export interface AgenticSolutionBlueprint {
  businessName: string;
  domain: string;
  niche: string;
  focus: SolutionFocus;
  focusTitle: string;
  executiveSummary: string;
  channels: string[];
  workflowSteps: WorkflowStep[];
  operationalOutcomes: string[];
  softCloseSubject: string;
  softCloseMessage: string;
}

export const BLUEPRINT_CHANNELS: BlueprintChannelOption[] = [
  {
    id: 'web_chat_triage',
    label: '24/7 Website Reception & Triage',
    description: 'Answers visitor questions and qualifies service intent immediately on landing pages.',
  },
  {
    id: 'calendar_booking',
    label: 'Instant Calendar Slot Booking',
    description: 'Presents real open consultation times instead of passive callback forms.',
  },
  {
    id: 'missed_call_sms',
    label: '60-Second Missed-Call Recovery',
    description: 'Follows up missed inbound inquiries via SMS or WhatsApp automatically.',
  },
  {
    id: 'crm_routing',
    label: 'CRM Qualification & Routing Agent',
    description: 'Enriches company context, scores urgency, and alerts the right owner with a summary.',
  },
];

export function buildAgenticSolutionBlueprint(opts: {
  lead: LeadRecord | null;
  customBusinessName: string;
  customDomain: string;
  customNiche: string;
  customBottleneck: string;
  focus: SolutionFocus;
  selectedChannelIds: string[];
}): AgenticSolutionBlueprint {
  const businessName =
    opts.lead?.business_name || opts.customBusinessName.trim() || 'Target Client Business';
  const domain = opts.lead?.domain || opts.customDomain.trim() || 'clientbusiness.com';
  const niche = opts.lead?.niche || opts.customNiche.trim() || 'Service Business';
  const primaryLeak =
    opts.lead?.missed_capture_leaks[0] ||
    opts.customBottleneck.trim() ||
    'Manual callback forms creating slow response times for high-intent visitors';

  const activeChannels = BLUEPRINT_CHANNELS.filter((c) =>
    opts.selectedChannelIds.includes(c.id)
  ).map((c) => c.label);

  const resolvedChannels =
    activeChannels.length > 0 ? activeChannels : ['24/7 Website Reception & Triage', 'Instant Calendar Slot Booking'];

  if (opts.focus === 'agentic_ai') {
    return {
      businessName,
      domain,
      niche,
      focus: 'agentic_ai',
      focusTitle: 'Custom Agentic AI Workflow System',
      executiveSummary: `Autonomous multi-step qualification and routing system designed for ${businessName} (${niche}) to resolve: ${primaryLeak}.`,
      channels: resolvedChannels,
      workflowSteps: [
        {
          stepNumber: 1,
          stage: 'Trigger',
          title: 'Inbound Prospect Signal Captured',
          detail: `Visitor submits an inquiry, requests a quote, or messages ${domain} across web chat, form, or email.`,
        },
        {
          stepNumber: 2,
          stage: 'AI Intelligence',
          title: 'Multi-Step Research & Intent Scoring',
          detail: `An autonomous qualification agent verifies service scope, checks urgency against ${businessName}'s ideal client criteria, and flags high-value requests.`,
        },
        {
          stepNumber: 3,
          stage: 'System Action',
          title: 'CRM Brief Creation & Direct Calendar Handoff',
          detail: `Qualified prospects receive tailored slot availability immediately while your team gets a structured 4-line decision brief inside CRM/Slack.`,
        },
        {
          stepNumber: 4,
          stage: 'Client Result',
          title: 'Zero Manual Triage & Faster Response',
          detail: `Decision-makers spend time only on pre-qualified opportunities instead of chasing incomplete form fills.`,
        },
      ],
      operationalOutcomes: [
        'Autonomous multi-step inquiry research and scope verification before human review',
        'Clean CRM and calendar synchronization eliminating manual copy-paste admin',
        'Consistent 24/7 qualification coverage across peak and after-hours traffic',
      ],
      softCloseSubject: `Quick AI workflow blueprint for ${domain}`,
      softCloseMessage: [
        `Hi ${businessName} team,`,
        '',
        `I reviewed ${domain} earlier and spotted ${primaryLeak.toLowerCase()}.`,
        '',
        `I mapped out a lightweight custom AI qualification workflow tailored to ${businessName} that handles initial inquiry checks, summarizes client fit, and routes qualified requests directly to your calendar.`,
        '',
        `Worth sending over the 1-page visual blueprint so you can see how it fits your current setup?`,
      ].join('\n'),
    };
  }

  return {
    businessName,
    domain,
    niche,
    focus: 'ai_automation',
    focusTitle: 'AI Business Automation System',
    executiveSummary: `Always-on 24/7 inquiry capture and automated follow-up architecture for ${businessName} (${niche}) built to eliminate: ${primaryLeak}.`,
    channels: resolvedChannels,
    workflowSteps: [
      {
        stepNumber: 1,
        stage: 'Trigger',
        title: 'After-Hours Visit or Missed Call',
        detail: `A prospective client lands on ${domain} or calls outside desk hours and needs immediate answers or scheduling.`,
      },
      {
        stepNumber: 2,
        stage: 'AI Intelligence',
        title: 'Instant Conversational Triage',
        detail: `The AI receptionist greets the visitor, answers common ${niche.toLowerCase()} service questions accurately, and captures contact details.`,
      },
      {
        stepNumber: 3,
        stage: 'System Action',
        title: 'Live Slot Booking & SMS Confirmation',
        detail: `Booked consultations sync straight to your live calendar while automated SMS and email reminders keep no-shows low.`,
      },
      {
        stepNumber: 4,
        stage: 'Client Result',
        title: 'Recovered Inquiries Around the Clock',
        detail: `High-intent visitors lock in a consultation immediately instead of moving on to a competitor.`,
      },
    ],
    operationalOutcomes: [
      '24/7 instant response coverage for evenings, weekends, and busy reception hours',
      'Automated appointment confirmation and pre-visit reminders built in',
      'Direct handoff to your front desk or calendar with complete inquiry notes',
    ],
    softCloseSubject: `24/7 booking automation preview for ${domain}`,
    softCloseMessage: [
      `Hi ${businessName} team,`,
      '',
      `I checked ${domain} earlier and noticed ${primaryLeak.toLowerCase()}.`,
      '',
      `I put together a quick visual blueprint showing how a 24/7 AI receptionist and instant booking automation can capture those inquiries automatically without adding work for your front desk.`,
      '',
      `Open to taking a quick look at the preview link?`,
    ].join('\n'),
  };
}
