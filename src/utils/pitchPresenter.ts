import type { LeadRecord, LeadStatus, ServicePillar } from '../shared/types';

export type MarketTrack = 'LOCAL' | 'GLOBAL';
export type RecommendedServiceType =
  | 'Professional Website Design'
  | 'AI Business Automation'
  | 'Custom Agentic AI';

export interface ClientPitchPresentation {
  pillar: ServicePillar;
  service: RecommendedServiceType;
  serviceReason: string;
  sampleTitle: string;
  sampleSummary: string;
  sampleHighlights: string[];
  messageSubject: string;
  messageBody: string;
}

export interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  tagline: string;
  defaultIssue: string;
  recommendedService: RecommendedServiceType;
  recommendedPillar: ServicePillar;
  previewHeadline: string;
  previewSubheadline: string;
  previewCta: string;
  previewSections: string[];
  trustHighlights: string[];
}

export const SERVICE_PILLARS: Array<{
  id: ServicePillar;
  label: RecommendedServiceType;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'website_design',
    label: 'Professional Website Design',
    shortLabel: 'Website Design',
    description:
      'High-converting websites and focused service landing pages engineered to turn visitors into booked inquiries.',
  },
  {
    id: 'ai_automation',
    label: 'AI Business Automation',
    shortLabel: 'AI Automation',
    description:
      '24/7 AI receptionists, instant lead capture, automated SMS/email follow-ups, and calendar/CRM sync.',
  },
  {
    id: 'agentic_ai',
    label: 'Custom Agentic AI',
    shortLabel: 'Agentic AI',
    description:
      'Autonomous multi-step AI agents that research, qualify, route, and execute operational workflows end-to-end.',
  },
];

export const WEBSITE_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'clinics',
    name: 'Clinics & Healthcare',
    industry: 'Dental & Medical Clinics',
    tagline: 'Instant consultation slot booking and patient treatment pre-qualification.',
    defaultIssue: 'Static callback form with no live booking',
    recommendedService: 'AI Business Automation',
    recommendedPillar: 'ai_automation',
    previewHeadline: 'Book Your Consultation Online in Under 60 Seconds',
    previewSubheadline:
      'Pick your treatment, choose an open calendar slot immediately, and get instant SMS confirmation without phone tag.',
    previewCta: 'Choose Your Appointment Time',
    previewSections: [
      '2-Step Treatment & Slot Selector',
      'Verified Patient Outcome Reviews',
      'After-Hours AI Inquiry Recovery',
    ],
    trustHighlights: ['Same-week slot visibility', 'Automated SMS reminders', 'Mobile-first booking flow'],
  },
  {
    id: 'real-estate',
    name: 'Real Estate & Property',
    industry: 'Real Estate & Property Agencies',
    tagline: 'Fast mobile property galleries with instant private viewing requests.',
    defaultIssue: 'Slow mobile pages and unorganized inquiry routing',
    recommendedService: 'Professional Website Design',
    recommendedPillar: 'website_design',
    previewHeadline: 'Schedule Private Property Viewings Directly Online',
    previewSubheadline:
      'Clean mobile listing pages with neighborhood highlights, valuation capture, and instant agent calendar routing.',
    previewCta: 'Schedule Private Viewing',
    previewSections: [
      'Mobile-First Property & Floorplan Showcase',
      'Direct Viewing Time Selector',
      'Instant Seller Valuation Capture',
    ],
    trustHighlights: ['Zero-lag mobile gallery', 'Direct calendar routing', 'Qualified buyer pre-check'],
  },
  {
    id: 'b2b-services',
    name: 'B2B Services & Consulting',
    industry: 'B2B Advisory, Legal & Accounting Firms',
    tagline: 'Authority-led service pages paired with automated client intake triage.',
    defaultIssue: 'Generic contact page losing high-intent inquiries',
    recommendedService: 'Custom Agentic AI',
    recommendedPillar: 'agentic_ai',
    previewHeadline: 'Clear Project Scope & Qualified Discovery Calls — Automated',
    previewSubheadline:
      'Replace generic contact forms with an intelligent intake flow that qualifies fit, prepares briefs, and routes directly to partners.',
    previewCta: 'Start Quick Fit Assessment',
    previewSections: [
      'Service Clarity & Case Proof Strip',
      'Automated Intake & Fit Qualification Flow',
      'Partner Calendar & Brief Routing',
    ],
    trustHighlights: ['Pre-qualified discovery calls', 'Automated intake summary', 'Clear service architecture'],
  },
  {
    id: 'home-commercial',
    name: 'Home & Commercial Services',
    industry: 'HVAC, Architecture & Local Service Firms',
    tagline: 'High-trust local service landing pages with 60-second estimate capture.',
    defaultIssue: 'Outdated design and missed after-hours quote requests',
    recommendedService: 'Professional Website Design',
    recommendedPillar: 'website_design',
    previewHeadline: 'Request an Accurate Site Visit & Estimate in Minutes',
    previewSubheadline:
      'Dedicated service pages built for mobile visitors with instant quote intake, service-area verification, and SMS updates.',
    previewCta: 'Book Estimate Slot',
    previewSections: [
      'Dedicated Service & Coverage Verification',
      'Instant Estimate & Photo Intake Form',
      'Verified Local Client Review Strip',
    ],
    trustHighlights: ['Service-area auto check', 'Missed-call SMS recovery', 'High-contrast mobile layout'],
  },
];

export const QUICK_ISSUE_TAGS = [
  'Static callback form with no live booking',
  'Outdated design losing mobile visitors',
  'Manual lead qualification & slow follow-ups',
] as const;

export function getStorageKeyForTrack(track: MarketTrack): string {
  return track === 'LOCAL' ? 'pal_leads_africa_local_v1' : 'pal_leads_international_global_v1';
}

export function getPlainEnglishStatus(status: LeadStatus): {
  label: string;
  shortLabel: string;
  tone: 'emerald' | 'amber' | 'slate';
} {
  switch (status) {
    case 'APPROVED_FOR_OUTREACH':
      return {
        label: 'Ready to Contact',
        shortLabel: 'Ready',
        tone: 'emerald',
      };
    case 'NEEDS_REVIEW':
      return {
        label: 'Needs Quick Review',
        shortLabel: 'Review',
        tone: 'amber',
      };
    case 'PASS':
      return {
        label: 'Not a Fit',
        shortLabel: 'Not a Fit',
        tone: 'slate',
      };
  }
}

export function classifyPillarForLead(
  lead: Pick<
    LeadRecord,
    'discovery_notes' | 'bottleneck_diagnosis' | 'missed_capture_leaks' | 'ai_web_opportunities' | 'niche'
  >
): {
  pillar: ServicePillar;
  service: RecommendedServiceType;
  reason: string;
} {
  const combined = [
    lead.discovery_notes,
    lead.bottleneck_diagnosis,
    lead.niche,
    ...lead.missed_capture_leaks,
    ...lead.ai_web_opportunities,
  ]
    .join(' ')
    .toLowerCase();

  if (
    /(agentic|multi-step|autonomous|qualify|routing|crm|triage agent|research workflow|research|procurement|rfp|intake workflow|ops workflow)/i.test(
      combined
    )
  ) {
    return {
      pillar: 'agentic_ai',
      service: 'Custom Agentic AI',
      reason:
        'Deploys an autonomous multi-step AI workflow to research, qualify, and route inquiries directly into your team’s calendar and CRM.',
    };
  }

  if (
    /(book|booking|appointment|calendar|schedule|callback|after-hours|reception|whatsapp|sms|follow-up|followup|missed-call|chatbot)/i.test(
      combined
    )
  ) {
    return {
      pillar: 'ai_automation',
      service: 'AI Business Automation',
      reason:
        'Captures visitors 24/7 with an AI receptionist, automated SMS/email follow-up, and instant calendar slot booking.',
    };
  }

  return {
    pillar: 'website_design',
    service: 'Professional Website Design',
    reason:
      'Replaces slow or dated pages with a clean, high-converting landing experience engineered for mobile speed and clear inquiries.',
  };
}

export function recommendServiceForLead(
  lead: Pick<
    LeadRecord,
    'discovery_notes' | 'bottleneck_diagnosis' | 'missed_capture_leaks' | 'ai_web_opportunities' | 'niche'
  >
): {
  service: RecommendedServiceType;
  reason: string;
} {
  const result = classifyPillarForLead(lead);
  return {
    service: result.service,
    reason: result.reason,
  };
}

export function buildPitchPresentation(lead: LeadRecord): ClientPitchPresentation {
  const { pillar, service, reason } = classifyPillarForLead(lead);

  const sampleTitle =
    pillar === 'ai_automation'
      ? `24/7 AI Reception & Booking Workflow for ${lead.business_name}`
      : pillar === 'agentic_ai'
        ? `Custom Agentic Qualification System for ${lead.business_name}`
        : `High-Converting Website Preview for ${lead.business_name}`;

  const sampleSummary = lead.bottleneck_diagnosis;
  const sampleHighlights =
    lead.ai_web_opportunities.length > 0
      ? lead.ai_web_opportunities.slice(0, 3)
      : lead.missed_capture_leaks.slice(0, 3);

  const fallbackSubject = `Quick idea for ${lead.domain}`;
  const fallbackBody = [
    `Hi ${lead.business_name} team,`,
    '',
    `I took a look at ${lead.domain} earlier and noticed ${lead.missed_capture_leaks[0] || 'visitors still have to wait for a manual callback to get started'}.`,
    '',
    `I put together a quick tailored ${service.toLowerCase()} preview for ${lead.business_name} so you can see how new inquiries can be captured and qualified automatically — no pitch deck or obligation.`,
    '',
    `Would you like me to send the preview link over?`,
  ].join('\n');

  return {
    pillar,
    service,
    serviceReason: reason,
    sampleTitle,
    sampleSummary,
    sampleHighlights,
    messageSubject: lead.outreach_pack?.cold_email.subject || fallbackSubject,
    messageBody: lead.outreach_pack?.cold_email.body || fallbackBody,
  };
}

export function buildSeedPitchForTrack(track: MarketTrack): LeadRecord {
  if (track === 'LOCAL') {
    return {
      id: 'sample_local_nairobi_dental',
      business_name: 'Kilimani Care Dental',
      domain: 'kilimanicaredental.co.ke',
      niche: 'Dental Clinic',
      market: 'UK',
      discovery_notes: 'Static callback form with no live booking',
      intake_mode: 'single',
      bottleneck_diagnosis:
        'Visitors looking for dental checkups or cosmetic care on mobile must call during daytime hours or wait for a manual form reply.',
      missed_capture_leaks: [
        'No online appointment picker on mobile pages',
        'Evening visitors cannot reserve a morning consultation slot',
      ],
      ai_web_opportunities: [
        'Instant 2-tap WhatsApp and calendar booking workflow',
        'Automated appointment reminder message to reduce no-shows',
      ],
      grounding_sources: [],
      sub_scores: { pain_signal: 22, niche_fit: 23, web_booking_gap: 24, reachability: 20 },
      total_score: 89,
      status: 'APPROVED_FOR_OUTREACH',
      gatekeeper_reason: 'Strong local clinic fit with clear mobile booking and AI reception gap.',
      outreach_pack: {
        cold_email: {
          subject: 'Quick booking preview for kilimanicaredental.co.ke',
          body:
            'Hi Kilimani Care Dental team,\n\nI checked kilimanicaredental.co.ke on my phone earlier and noticed patients still have to wait for a callback instead of picking an appointment time right on the page.\n\nI mocked up a quick, free online booking sample tailored to your clinic so patients can lock in a checkup slot in under 60 seconds.\n\nWould you like me to send the preview link over?',
        },
        social_dm:
          'Hi Kilimani Care team — put together a quick free booking page preview for your clinic so patients can pick a time online in 60 seconds. Worth sending the link?',
        follow_up_sequence: [],
      },
      outcome: null,
      reward_points: 0,
      created_at: '2026-11-22T06:00:00.000Z',
      updated_at: '2026-11-22T06:00:00.000Z',
      model_trace: [],
    };
  }

  return {
    id: 'sample_global_cavendish',
    business_name: 'Cavendish Dental Studio',
    domain: 'cavendishdental.co.uk',
    niche: 'Dental Clinics',
    market: 'UK',
    discovery_notes: 'Static callback form with no live booking',
    intake_mode: 'single',
    bottleneck_diagnosis:
      'High-intent visitors land on a static enquiry form that asks them to wait for a phone callback instead of choosing a consultation time immediately.',
    missed_capture_leaks: [
      'No instant consultation slot picker on treatment pages',
      'After-hours visitors leave without booking an appointment',
    ],
    ai_web_opportunities: [
      '24/7 instant consultation booking assistant',
      'Automated SMS confirmation right after booking',
    ],
    grounding_sources: [],
    sub_scores: { pain_signal: 23, niche_fit: 24, web_booking_gap: 24, reachability: 20 },
    total_score: 91,
    status: 'APPROVED_FOR_OUTREACH',
    gatekeeper_reason: 'Clear online booking gap on active search traffic.',
    outreach_pack: {
      cold_email: {
        subject: 'Quick booking idea for cavendishdental.co.uk',
        body:
          'Hi Cavendish Dental team,\n\nI clicked through cavendishdental.co.uk earlier and noticed new patients still have to fill out a static callback form rather than picking an open consultation time right away.\n\nI put together a quick free sample showing how a 60-second online booking assistant fits straight onto your existing site.\n\nWould you like me to send the preview link over?',
      },
      social_dm:
        'Hi Cavendish team — mocked up a quick free booking sample for cavendishdental.co.uk so patients can choose a slot online after hours. Open to taking a look?',
      follow_up_sequence: [],
    },
    outcome: null,
    reward_points: 0,
    created_at: '2026-11-22T06:00:00.000Z',
    updated_at: '2026-11-22T06:00:00.000Z',
    model_trace: [],
  };
}
