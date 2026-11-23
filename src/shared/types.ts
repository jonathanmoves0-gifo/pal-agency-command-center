export type WorkspaceTab = 'client_finder' | 'website_builder' | 'agentic_blueprints';
export type ServicePillar = 'website_design' | 'ai_automation' | 'agentic_ai';
export type IntakeMode = 'scout' | 'single' | 'batch';
export type Market = 'US' | 'UK';
export type LeadStatus = 'APPROVED_FOR_OUTREACH' | 'NEEDS_REVIEW' | 'PASS';
export type OutcomeRewardType = 'BOOKED_DEMO' | 'POSITIVE_REPLY' | 'NO_REPLY' | 'WRONG_FIT' | null;

export interface SubScores {
  pain_signal: number;
  niche_fit: number;
  web_booking_gap: number;
  reachability: number;
}

export interface FollowUpStep {
  step: number;
  day_offset: number;
  angle: string;
  message: string;
}

export interface OutreachPack {
  cold_email: {
    subject: string;
    body: string;
  };
  social_dm: string;
  follow_up_sequence: FollowUpStep[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface WebsiteAuditSummary {
  reachable: boolean;
  has_ssl: boolean;
  has_mobile_viewport: boolean;
  has_booking_tool: boolean;
  booking_tools_found: string[];
  has_live_chat: boolean;
  chat_tools_found: string[];
  cta_count: number;
  page_title: string;
  homepage_excerpt: string;
  checked_urls: string[];
  audited_at: string;
  error_note?: string;
}

export interface OutreachActivity {
  marked_sent_at?: string;
  email_sent_at?: string;
  email_mode?: 'gmail' | 'mailto' | 'manual';
  email_recipient?: string;
  whatsapp_opened_at?: string;
  whatsapp_recipient?: string;
}

export interface LeadWebsitePreviewProof {
  color_tone_name: string;
  primary_color: string;
  accent_color: string;
  city_label: string;
  services: string[];
  hero_subheadline: string;
  cta_label: string;
  html_document: string;
}

export interface LeadAiBlueprintProof {
  architecture_type: 'AI Business Automation' | 'Custom Agentic AI Systems';
  roi_metrics: Array<{ label: string; value: string; note: string }>;
  workflow_steps: Array<{ step: number; stage: string; title: string; detail: string }>;
  simulation_greeting: string;
  simulation_prompts: Array<{
    user_message: string;
    agent_reply: string;
    system_action: string;
  }>;
}

export interface LeadProofAsset {
  id: string;
  pillar: ServicePillar;
  pillar_label: 'Professional Website Design' | 'AI Business Automation' | 'Custom Agentic AI Systems';
  title: string;
  headline: string;
  summary: string;
  generated_at: string;
  flaws_addressed: string[];
  highlights: string[];
  proof_summary_text: string;
  website_preview?: LeadWebsitePreviewProof;
  ai_blueprint?: LeadAiBlueprintProof;
}

export type OutreachDecision = 'pending' | 'approved_to_outreach' | 'skipped';

export interface DecisionMakerMatch {
  name: string;
  role: string;
  source: string;
}

export interface ProspectInput {
  business_name: string;
  domain: string;
  niche: string;
  market: Market;
  discovery_notes: string;
  intake_mode: IntakeMode;
  address?: string;
  pre_found_phones?: string[];
  pre_found_emails?: string[];
  pre_found_whatsapp?: string[];
  pre_found_decision_maker?: DecisionMakerMatch | null;
  has_direct_whatsapp_link?: boolean;
}

export interface LeadRecord {
  id: string;
  business_name: string;
  domain: string;
  niche: string;
  market: Market;
  discovery_notes: string;
  intake_mode: IntakeMode;
  address?: string;
  contact_emails?: string[];
  contact_phones?: string[];
  whatsapp_numbers?: string[];
  has_direct_whatsapp_link?: boolean;
  decision_maker_name?: string;
  decision_maker_role?: string;
  decision_maker_source?: string;
  detected_problems?: string[];
  outreach_decision?: OutreachDecision;
  website_audit?: WebsiteAuditSummary;
  outreach_activity?: OutreachActivity;
  proof_asset?: LeadProofAsset;
  bottleneck_diagnosis: string;
  missed_capture_leaks: string[];
  ai_web_opportunities: string[];
  grounding_sources: GroundingSource[];
  sub_scores: SubScores;
  total_score: number;
  status: LeadStatus;
  gatekeeper_reason: string;
  outreach_pack: OutreachPack | null;
  outcome: OutcomeRewardType;
  reward_points: number;
  created_at: string;
  updated_at: string;
  model_trace: string[];
}

export interface RewardMemoryItem {
  lead_id: string;
  business_name: string;
  domain: string;
  niche: string;
  market: Market;
  total_score: number;
  sub_scores: SubScores;
  bottleneck_diagnosis: string;
  gatekeeper_reason: string;
  outreach_cold_email: string | null;
  outcome: Exclude<OutcomeRewardType, null>;
  reward_points: number;
  recorded_at: string;
}

export interface CalibrationContext {
  top_winners: RewardMemoryItem[];
  top_penalized: RewardMemoryItem[];
}

export interface ApiHealthStatus {
  gemini_configured: boolean;
  openrouter_configured: boolean;
  primary_research_model: string;
  research_fallback_model: string;
  scoring_model: string;
  openrouter_fallback_models: string[];
  node_pacing_ms: number;
  batch_cooldown_ms: number;
}

export type GraphNodeName =
  | 'scout_node'
  | 'planner_node'
  | 'qualifier_node'
  | 'proof_builder_node'
  | 'outreach_architect_node'
  | 'memory_logger_node';

export interface PipelineStreamEvent {
  type:
    | 'run_started'
    | 'scout_completed'
    | 'prospect_started'
    | 'node_started'
    | 'node_pacing'
    | 'node_completed'
    | 'lead_completed'
    | 'prospect_error'
    | 'run_completed'
    | 'error';
  node?: GraphNodeName;
  prospect_index?: number;
  prospect_total?: number;
  business_name?: string;
  domain?: string;
  provider?: string;
  message?: string;
  data?: Record<string, unknown>;
  lead?: LeadRecord;
  timestamp: string;
}
