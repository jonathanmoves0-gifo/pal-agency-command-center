import type { LeadRecord } from '../shared/types';

export type MarketTrack = 'LOCAL' | 'GLOBAL';
export type RecommendedServiceType = 'Website Upgrade' | 'AI Booking Assistant' | 'AI Video Ads';
export type VideoQualityModelId =
  | 'Lightricks/LTX-Video-0.9.8-13B-distilled'
  | 'Wan-AI/Wan2.2-TI2V-5B';

export const HF_TOKEN_STORAGE_KEY = 'pal_hf_token_v1';

export const VIDEO_QUALITY_OPTIONS: Array<{
  label: string;
  modelId: VideoQualityModelId;
}> = [
  {
    label: 'Fast Draft (LTX-Video)',
    modelId: 'Lightricks/LTX-Video-0.9.8-13B-distilled',
  },
  {
    label: 'High Detail (Wan 2.2)',
    modelId: 'Wan-AI/Wan2.2-TI2V-5B',
  },
];

export function isAllowedVideoModel(modelId: string): modelId is VideoQualityModelId {
  return VIDEO_QUALITY_OPTIONS.some((opt) => opt.modelId === modelId);
}

export interface ClientPitchPresentation {
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
  previewHeadline: string;
  previewSubheadline: string;
  previewCta: string;
  previewSections: string[];
}

export const WEBSITE_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'clinics',
    name: 'Clinics',
    industry: 'Dental & Medical Clinics',
    tagline: 'Instant consultation slot booking and patient treatment pre-qualification.',
    defaultIssue: 'No online booking',
    recommendedService: 'AI Booking Assistant',
    previewHeadline: 'Book Your Consultation in Under 60 Seconds',
    previewSubheadline:
      'Skip phone tag. Pick your treatment, choose an open time slot, and receive instant SMS confirmation.',
    previewCta: 'Check Open Appointments',
    previewSections: [
      '2-Tap Treatment & Slot Picker',
      'Verified Patient Review Strip',
      'After-Hours SMS Callback Recovery',
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    industry: 'Real Estate & Property Agencies',
    tagline: 'Fast mobile property galleries with instant private viewing requests.',
    defaultIssue: 'Hard to use on mobile',
    recommendedService: 'Website Upgrade',
    previewHeadline: 'Schedule Private Property Viewings Directly Online',
    previewSubheadline:
      'Mobile-first listing pages with neighborhood highlights, mortgage estimator, and one-click agent booking.',
    previewCta: 'Book a Viewing',
    previewSections: [
      'Fast Mobile Photo & Floorplan Viewer',
      'Direct Viewing Time Selector',
      'Instant Seller Valuation Capture Form',
    ],
  },
  {
    id: 'travel-safaris',
    name: 'Travel & Safaris',
    industry: 'Travel, Tours & Safari Operators',
    tagline: 'High-trust itinerary showcases with custom trip quote capture.',
    defaultIssue: 'Outdated design',
    recommendedService: 'Website Upgrade',
    previewHeadline: 'Custom Multi-Day Itineraries Built Around Your Dates',
    previewSubheadline:
      'Clear day-by-day route previews, transparent inclusions, and direct WhatsApp or email trip planning.',
    previewCta: 'Request Custom Itinerary',
    previewSections: [
      'Day-by-Day Route & Lodge Preview',
      'Instant Trip Inquiry & WhatsApp Handoff',
      'Guest Story & Verified Trip Reviews',
    ],
  },
  {
    id: 'local-shops',
    name: 'Local Shops',
    industry: 'Local Retail & Service Shops',
    tagline: 'Short-form product video hooks paired with easy local pickup or order links.',
    defaultIssue: 'Outdated design',
    recommendedService: 'AI Video Ads',
    previewHeadline: 'Shop Best-Sellers With Same-Day Local Pickup',
    previewSubheadline:
      'Clean mobile catalog built to convert social video traffic straight into store visits and local orders.',
    previewCta: 'Reserve In Store',
    previewSections: [
      'Featured Best-Sellers Mobile Grid',
      '1-Click Directions & Opening Hours',
      'WhatsApp & SMS Order Confirmation',
    ],
  },
];

export const QUICK_ISSUE_TAGS = [
  'No online booking',
  'Outdated design',
  'Hard to use on mobile',
] as const;

export function getStorageKeyForTrack(track: MarketTrack): string {
  return track === 'LOCAL' ? 'pal_leads_africa_local_v1' : 'pal_leads_international_global_v1';
}

export function recommendServiceForLead(lead: Pick<LeadRecord, 'discovery_notes' | 'bottleneck_diagnosis' | 'missed_capture_leaks' | 'ai_web_opportunities' | 'niche'>): {
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

  if (/(book|booking|appointment|calendar|schedule|callback|after-hours|reception|triage|whatsapp)/i.test(combined)) {
    return {
      service: 'AI Booking Assistant',
      reason:
        'Captures visitors who land outside office hours and lets them book an appointment immediately instead of leaving.',
    };
  }

  if (/(video|ugc|tiktok|instagram|reels|social|ad creative|awareness|shop|retail)/i.test(combined)) {
    return {
      service: 'AI Video Ads',
      reason:
        'Turns everyday customer questions and before-and-after results into short videos that bring ready-to-buy local leads.',
    };
  }

  return {
    service: 'Website Upgrade',
    reason:
      'Replaces slow, hard-to-navigate pages with a clear mobile-ready layout that turns more visitors into real enquiries.',
  };
}

export function buildPitchPresentation(lead: LeadRecord): ClientPitchPresentation {
  const { service, reason } = recommendServiceForLead(lead);

  const sampleTitle =
    service === 'AI Booking Assistant'
      ? `24/7 Instant Booking Preview for ${lead.business_name}`
      : service === 'AI Video Ads'
        ? `3-Scene Short Video Concept for ${lead.business_name}`
        : `Clean Mobile Homepage & Lead Form Mockup for ${lead.business_name}`;

  const sampleSummary = lead.bottleneck_diagnosis;
  const sampleHighlights =
    lead.ai_web_opportunities.length > 0
      ? lead.ai_web_opportunities.slice(0, 3)
      : lead.missed_capture_leaks.slice(0, 3);

  const fallbackSubject = `Quick idea for ${lead.domain}`;
  const fallbackBody = [
    `Hi ${lead.business_name} team,`,
    '',
    `I took a look at ${lead.domain} earlier and noticed ${lead.missed_capture_leaks[0] || 'visitors have to wait for a manual callback to get started'}.`,
    '',
    `I put together a quick free ${service.toLowerCase()} sample tailored for ${lead.business_name} so you can see how easy it is for new customers to book right away—no pitch deck or commitment.`,
    '',
    `Would you like me to send the preview link over?`,
  ].join('\n');

  return {
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
      discovery_notes: 'No online booking',
      intake_mode: 'single',
      bottleneck_diagnosis:
        'Visitors looking for dental checkups or whitening on mobile must call during daytime hours or wait for a manual form reply.',
      missed_capture_leaks: [
        'No online appointment picker on mobile pages',
        'Evening visitors cannot reserve a morning consultation slot',
      ],
      ai_web_opportunities: [
        'Instant 2-tap WhatsApp and calendar booking widget',
        'Automated appointment reminder message to reduce no-shows',
      ],
      grounding_sources: [],
      sub_scores: { pain_signal: 22, niche_fit: 23, web_booking_gap: 24, reachability: 20 },
      total_score: 89,
      status: 'APPROVED_FOR_OUTREACH',
      gatekeeper_reason: 'Strong local clinic fit with clear mobile booking gap.',
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
    discovery_notes: 'No online booking',
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
    gatekeeper_reason: 'Clear online booking gap on active ad traffic.',
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
