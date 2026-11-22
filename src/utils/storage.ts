import type { LeadRecord, RewardMemoryItem } from '../shared/types';
import { shouldTriggerAutoBackup } from './pipelineLogic';

export const LEADS_STORAGE_KEY = 'pal_agency_leads_v1';
export const REWARD_MEMORY_STORAGE_KEY = 'reward_memory';
export const APPROVED_BACKUP_CURSOR_KEY = 'pal_approved_backup_cursor_v1';

export const SEED_LEADS: LeadRecord[] = [
  {
    id: 'lead_seed_cavendish',
    business_name: 'Cavendish Dental Studio',
    domain: 'cavendishdental.co.uk',
    niche: 'Dental Clinics',
    market: 'UK',
    discovery_notes: 'Running Google Ads for Invisalign; website relies on callback request form with no live slot picker.',
    intake_mode: 'single',
    bottleneck_diagnosis:
      'High-intent Invisalign and cosmetic traffic lands on a static enquiry form requiring manual receptionist callbacks, causing high after-hours drop-off.',
    missed_capture_leaks: [
      'No 24/7 live hygiene or consultation slot booking on landing pages',
      'Zero automated SMS speed-to-lead reply when reception is closed',
      'Paid search clicks route to generic homepage instead of treatment capture funnel',
    ],
    ai_web_opportunities: [
      'Deploy instant cosmetic consultation triage + live calendar widget',
      'Implement 60-second missed-call SMS recovery workflow',
    ],
    grounding_sources: [
      { title: 'Cavendish Dental Studio — Treatments', uri: 'https://cavendishdental.co.uk' },
    ],
    sub_scores: {
      pain_signal: 23,
      niche_fit: 24,
      web_booking_gap: 24,
      reachability: 20,
    },
    total_score: 91,
    status: 'APPROVED_FOR_OUTREACH',
    gatekeeper_reason:
      'Active cosmetic ad spend paired with manual callback-only booking creates immediate recoverable revenue.',
    outreach_pack: {
      cold_email: {
        subject: 'Invisalign enquiry leak on cavendishdental.co.uk',
        body: 'Hi Dr. Patel,\n\nI clicked through your cosmetic consultation page on cavendishdental.co.uk this morning. You are driving strong high-intent traffic, but new patients still have to submit a static callback form instead of locking in a consultation slot immediately.\n\nFor UK clinics running Invisalign ads, that callback lag typically drops booked consults by 20-30% after 6pm.\n\nI put together a 2-minute breakdown showing how an instant triage + calendar layer plugs straight into your current site. Worth sending the link over?',
      },
      social_dm:
        'Hi Dr. Patel — noticed cavendishdental.co.uk uses a manual callback form on your Invisalign landing flow. Put together a 90-sec note on capturing after-hours bookings automatically. Mind if I send it?',
      follow_up_sequence: [
        {
          step: 1,
          day_offset: 3,
          angle: 'After-hours booking benchmark',
          message:
            'Quick follow-up — most London cosmetic practices see 38% of form fills happen between 6pm and 9am. Happy to share the instant-slot flow we mocked up for Cavendish.',
        },
        {
          step: 2,
          day_offset: 7,
          angle: 'Interactive Web Kit preview',
          message:
            'Built a lightweight booking-triage prototype tailored to cavendishdental.co.uk so you can click through the patient flow directly. Shall I drop the preview URL here?',
        },
        {
          step: 3,
          day_offset: 12,
          angle: 'Clean close-the-loop',
          message:
            'Closing the loop for now so I do not crowd your inbox. If increasing consult conversion from existing ad spend moves up the priority list, just reply anytime.',
        },
      ],
    },
    outcome: 'BOOKED_DEMO',
    reward_points: 25,
    created_at: '2026-11-20T11:20:00.000Z',
    updated_at: '2026-11-21T09:15:00.000Z',
    model_trace: ['planner:gemini-3.8-flash (grounded)', 'qualifier:gemini-3.5-flash-lite', 'outreach:gemini-3.8-flash'],
  },
  {
    id: 'lead_seed_austin_medspa',
    business_name: 'Barton Creek Aesthetics',
    domain: 'bartoncreekaesthetics.com',
    niche: 'MedSpa',
    market: 'US',
    discovery_notes: 'Strong Instagram presence; link-in-bio goes to generic Linktree without direct package booking.',
    intake_mode: 'scout',
    bottleneck_diagnosis:
      'Instagram traffic routes through multi-hop Linktree menus before reaching a slow mobile contact form, losing impulse consult bookings.',
    missed_capture_leaks: [
      'Multi-click social bio funnel with no direct treatment deposit capture',
      'No FAQ pre-qualification assistant for pricing objections',
    ],
    ai_web_opportunities: [
      'Social-to-booking rapid Web Kit with deposit checkout',
      'Short-form UGC proof clips paired with treatment landing page',
    ],
    grounding_sources: [],
    sub_scores: {
      pain_signal: 18,
      niche_fit: 19,
      web_booking_gap: 17,
      reachability: 14,
    },
    total_score: 68,
    status: 'NEEDS_REVIEW',
    gatekeeper_reason:
      'Clear social funnel friction, though existing front-desk responsiveness may already cover phone leads.',
    outreach_pack: null,
    outcome: null,
    reward_points: 0,
    created_at: '2026-11-21T14:05:00.000Z',
    updated_at: '2026-11-21T14:05:00.000Z',
    model_trace: ['planner:gemini-3.8-flash (grounded)', 'qualifier:gemini-3.5-flash-lite'],
  },
  {
    id: 'lead_seed_thames_joinery',
    business_name: 'Thames Commercial Fitouts Ltd',
    domain: 'thamescommercialfitouts.co.uk',
    niche: 'B2B Construction Tenders',
    market: 'UK',
    discovery_notes: 'Enterprise commercial tender contractor; procurement runs via RFP portals.',
    intake_mode: 'batch',
    bottleneck_diagnosis:
      'Long-cycle commercial RFP procurement does not depend on instant self-serve web booking widgets.',
    missed_capture_leaks: ['Dated case study PDF downloads'],
    ai_web_opportunities: ['Case study repository refresh'],
    grounding_sources: [],
    sub_scores: {
      pain_signal: 9,
      niche_fit: 7,
      web_booking_gap: 8,
      reachability: 11,
    },
    total_score: 35,
    status: 'PASS',
    gatekeeper_reason:
      'Enterprise tender-driven contractor; poor match for rapid booking and consumer UGC retainers.',
    outreach_pack: null,
    outcome: 'WRONG_FIT',
    reward_points: -15,
    created_at: '2026-11-19T16:40:00.000Z',
    updated_at: '2026-11-20T08:30:00.000Z',
    model_trace: ['planner:gemini-2.5-flash-lite (ungrounded)', 'qualifier:gemini-3.5-flash-lite'],
  },
];

export const SEED_REWARD_MEMORY: RewardMemoryItem[] = [
  {
    lead_id: SEED_LEADS[0].id,
    business_name: SEED_LEADS[0].business_name,
    domain: SEED_LEADS[0].domain,
    niche: SEED_LEADS[0].niche,
    market: SEED_LEADS[0].market,
    total_score: SEED_LEADS[0].total_score,
    sub_scores: SEED_LEADS[0].sub_scores,
    bottleneck_diagnosis: SEED_LEADS[0].bottleneck_diagnosis,
    gatekeeper_reason: SEED_LEADS[0].gatekeeper_reason,
    outreach_cold_email: SEED_LEADS[0].outreach_pack
      ? `Subject: ${SEED_LEADS[0].outreach_pack.cold_email.subject}\n${SEED_LEADS[0].outreach_pack.cold_email.body}`
      : null,
    outcome: 'BOOKED_DEMO',
    reward_points: 25,
    recorded_at: '2026-11-21T09:15:00.000Z',
  },
  {
    lead_id: SEED_LEADS[2].id,
    business_name: SEED_LEADS[2].business_name,
    domain: SEED_LEADS[2].domain,
    niche: SEED_LEADS[2].niche,
    market: SEED_LEADS[2].market,
    total_score: SEED_LEADS[2].total_score,
    sub_scores: SEED_LEADS[2].sub_scores,
    bottleneck_diagnosis: SEED_LEADS[2].bottleneck_diagnosis,
    gatekeeper_reason: SEED_LEADS[2].gatekeeper_reason,
    outreach_cold_email: null,
    outcome: 'WRONG_FIT',
    reward_points: -15,
    recorded_at: '2026-11-20T08:30:00.000Z',
  },
];

export function loadLeadsFromStorage(): LeadRecord[] {
  const raw = localStorage.getItem(LEADS_STORAGE_KEY);
  if (raw === null) {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(SEED_LEADS));
    if (localStorage.getItem(REWARD_MEMORY_STORAGE_KEY) === null) {
      localStorage.setItem(REWARD_MEMORY_STORAGE_KEY, JSON.stringify(SEED_REWARD_MEMORY));
    }
    const seedApproved = SEED_LEADS.filter((l) => l.status === 'APPROVED_FOR_OUTREACH').length;
    localStorage.setItem(APPROVED_BACKUP_CURSOR_KEY, String(seedApproved));
    return SEED_LEADS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LeadRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLeadsToStorage(leads: LeadRecord[]): void {
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
}

export function loadRewardMemoryFromStorage(): RewardMemoryItem[] {
  const raw = localStorage.getItem(REWARD_MEMORY_STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RewardMemoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveRewardMemoryToStorage(memory: RewardMemoryItem[]): void {
  localStorage.setItem(REWARD_MEMORY_STORAGE_KEY, JSON.stringify(memory));
}

export function getApprovedBackupCursor(): number {
  const raw = localStorage.getItem(APPROVED_BACKUP_CURSOR_KEY);
  const num = raw ? Number(raw) : 0;
  return Number.isFinite(num) ? num : 0;
}

export function setApprovedBackupCursor(count: number): void {
  localStorage.setItem(APPROVED_BACKUP_CURSOR_KEY, String(count));
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function maybeTriggerSilentBackup(
  leads: LeadRecord[],
  rewardMemory: RewardMemoryItem[]
): boolean {
  const approvedCount = leads.filter((l) => l.status === 'APPROVED_FOR_OUTREACH').length;
  const cursor = getApprovedBackupCursor();
  if (approvedCount < cursor) {
    setApprovedBackupCursor(approvedCount);
    return false;
  }
  if (shouldTriggerAutoBackup(cursor, approvedCount)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const payload = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        reason: 'auto_backup_5_approved_milestone',
        approved_count: approvedCount,
        leads,
        reward_memory: rewardMemory,
      },
      null,
      2
    );
    downloadTextFile(`pal-agency-auto-backup-${stamp}.json`, payload, 'application/json');
    setApprovedBackupCursor(approvedCount);
    return true;
  }
  return false;
}
