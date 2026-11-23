import type { LeadRecord, RewardMemoryItem } from '../shared/types';
import {
  deriveDetectedProblems,
  isDummyPhoneDigits,
  isFakeOrPlaceholderBusiness,
} from './contactFormatters';
import { shouldTriggerAutoBackup } from './pipelineLogic';
import { buildLeadProofAsset } from './proofBuilder';

export const LEADS_STORAGE_KEY = 'pal_agency_leads_v1';
export const REWARD_MEMORY_STORAGE_KEY = 'reward_memory';
export const APPROVED_BACKUP_CURSOR_KEY = 'pal_approved_backup_cursor_v1';

const LEGACY_SEED_IDS = new Set([
  'lead_seed_cavendish',
  'lead_seed_austin_medspa',
  'lead_seed_thames_joinery',
]);

export function ensureLeadProofAsset(lead: LeadRecord): LeadRecord {
  const detectedProblems =
    lead.detected_problems && lead.detected_problems.length > 0
      ? lead.detected_problems
      : deriveDetectedProblems(lead.website_audit, lead.missed_capture_leaks);
  const outreachDecision = lead.outreach_decision ?? 'pending';

  return {
    ...lead,
    detected_problems: detectedProblems,
    outreach_decision: outreachDecision,
    proof_asset: lead.proof_asset ?? buildLeadProofAsset(lead),
  };
}

function isLegacyFakeOrDummyLead(lead: LeadRecord): boolean {
  if (LEGACY_SEED_IDS.has(lead.id)) return true;
  if (isFakeOrPlaceholderBusiness(lead.business_name, lead.domain || `${lead.business_name}.com`)) {
    return true;
  }
  const allPhones = [...(lead.whatsapp_numbers ?? []), ...(lead.contact_phones ?? [])];
  if (
    allPhones.length > 0 &&
    allPhones.every((p) => isDummyPhoneDigits(p.replace(/\D/g, '')))
  ) {
    return true;
  }
  return false;
}

export function loadLeadsFromStorage(): LeadRecord[] {
  const raw = localStorage.getItem(LEADS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as LeadRecord[])
      .filter((item) => item && typeof item === 'object' && !isLegacyFakeOrDummyLead(item))
      .map(ensureLeadProofAsset);
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
