export type WorkspaceTab = 'signal_hunter' | 'ugc_studio' | 'web_kits';
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

export interface ProspectInput {
  business_name: string;
  domain: string;
  niche: string;
  market: Market;
  discovery_notes: string;
  intake_mode: IntakeMode;
}

export interface LeadRecord {
  id: string;
  business_name: string;
  domain: string;
  niche: string;
  market: Market;
  discovery_notes: string;
  intake_mode: IntakeMode;
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
