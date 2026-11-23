import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, ExternalLink } from 'lucide-react';
import type {
  CalibrationContext,
  GraphNodeName,
  GroundingSource,
  PipelineStreamEvent,
} from '../shared/types';

export type NodeRuntimeStatus = 'IDLE' | 'RUNNING' | 'PACING' | 'DONE' | 'SKIPPED' | 'ERROR';

export interface GraphNodeState {
  status: NodeRuntimeStatus;
  provider?: string;
  summary?: string;
}

interface GraphExecutionTraceProps {
  isRunning: boolean;
  activeMode: 'scout' | 'single' | 'batch' | null;
  activeProspectLabel: string | null;
  liveStatusMessage: string | null;
  nodeStates: Record<GraphNodeName, GraphNodeState>;
  eventLog: PipelineStreamEvent[];
  latestSources: GroundingSource[];
  calibration: CalibrationContext;
  runError: string | null;
}

const PLAIN_STEPS: Array<{ id: GraphNodeName; stepNumber: string; label: string; description: string }> = [
  {
    id: 'scout_node',
    stepNumber: '1',
    label: 'Finding Real Businesses',
    description: 'Searches live business directories & public web listings for your niche and city.',
  },
  {
    id: 'planner_node',
    stepNumber: '2',
    label: 'Scanning Websites & Contact Pages',
    description: 'Extracts emails, phones, WhatsApp, mobile layout, SSL, and booking tool gaps.',
  },
  {
    id: 'qualifier_node',
    stepNumber: '3',
    label: 'Scoring Business Fit (0–100)',
    description: 'Calculates urgency, industry fit, booking opportunity, and contact reachability.',
  },
  {
    id: 'proof_builder_node',
    stepNumber: '4',
    label: 'Building Custom Proof & Demo',
    description: 'Automatically builds a tailored Website Redesign Preview or Interactive AI Proof Blueprint.',
  },
  {
    id: 'outreach_architect_node',
    stepNumber: '5',
    label: 'Writing Ready-to-Send Proposal Kit',
    description: 'Creates a copy-ready Email Proposal and WhatsApp Pitch referencing your custom Proof.',
  },
  {
    id: 'memory_logger_node',
    stepNumber: '6',
    label: 'Saving to Client Pipeline',
    description: 'Stores verified contact details, Proof/Demo asset, and Proposal Kit locally.',
  },
];

function statusLabelAndStyle(status: NodeRuntimeStatus): { label: string; classes: string } {
  switch (status) {
    case 'RUNNING':
      return {
        label: 'In Progress',
        classes: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
      };
    case 'PACING':
      return {
        label: 'Waiting Briefly',
        classes: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
      };
    case 'DONE':
      return {
        label: 'Complete',
        classes: 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]',
      };
    case 'SKIPPED':
      return {
        label: 'Skipped (<75)',
        classes: 'border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]',
      };
    case 'ERROR':
      return {
        label: 'Needs Attention',
        classes: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]',
      };
    default:
      return {
        label: 'Queued',
        classes: 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]',
      };
  }
}

export function GraphExecutionTrace({
  isRunning,
  activeMode,
  activeProspectLabel,
  liveStatusMessage,
  nodeStates,
  eventLog,
  latestSources,
  calibration,
  runError,
}: GraphExecutionTraceProps) {
  const [showLearningDetail, setShowLearningDetail] = useState(false);

  const visibleSteps =
    activeMode === 'scout'
      ? PLAIN_STEPS
      : PLAIN_STEPS.filter((s) => s.id !== 'scout_node');

  return (
    <section
      aria-label="Live progress and scoring feedback"
      className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[#0F172A]">
            Live Research &amp; Outreach Progress
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            {activeProspectLabel || 'Tracks each step from live business lookup to verified contacts and personalized outreach.'}
          </p>
        </div>

        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
            isRunning
              ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
              : runError
                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
          }`}
        >
          {isRunning ? 'Running Analysis' : runError ? 'Needs Attention' : 'Ready'}
        </span>
      </div>

      {/* Clear Live Progress Status Bar */}
      {liveStatusMessage && (
        <div
          data-testid="live-progress-status-bar"
          className={`flex items-center gap-2.5 border-b px-5 py-2.5 text-xs font-medium ${
            isRunning
              ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
              : 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full shrink-0 ${
              isRunning ? 'bg-[#1D4ED8] animate-pulse' : 'bg-[#059669]'
            }`}
          />
          <span>{liveStatusMessage}</span>
        </div>
      )}

      {/* Step Cards */}
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 border-b border-[#E2E8F0]">
        {visibleSteps.map((step, index) => {
          const st = nodeStates[step.id] ?? { status: 'IDLE' as NodeRuntimeStatus };
          const badge = statusLabelAndStyle(st.status);
          const displayNum = activeMode === 'scout' ? step.stepNumber : String(index + 1);

          return (
            <div
              key={step.id}
              data-testid={`progress-step-${step.id}`}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {st.status === 'DONE' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
                  ) : st.status === 'RUNNING' || st.status === 'PACING' ? (
                    <Clock className="h-4 w-4 text-[#1D4ED8] shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-[#CBD5E1] shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-[#0F172A] leading-snug">
                    {displayNum}. {step.label}
                  </span>
                </div>

                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium shrink-0 whitespace-nowrap ${badge.classes}`}
                >
                  {badge.label}
                </span>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                {st.summary || step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {runError && (
        <div
          role="alert"
          className="border-b border-[#FECACA] bg-[#FEF2F2] px-5 py-3 text-xs font-medium text-[#991B1B]"
        >
          {runError}
        </div>
      )}

      {/* Learning From Past Results Bar */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
            <span className="font-semibold text-[#0F172A]">Learning From Past Outcomes</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#065F46] tabular-nums">
              {calibration.top_winners.length} winning examples active
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#92400E] tabular-nums">
              {calibration.top_penalized.length} skipped patterns avoided
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowLearningDetail((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] cursor-pointer"
          >
            <span>{showLearningDetail ? 'Hide examples' : 'View examples'}</span>
            {showLearningDetail ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {showLearningDetail && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#E2E8F0] pt-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-[#065F46] mb-1.5">
                Proven Winning Clients
              </div>
              {calibration.top_winners.length === 0 ? (
                <p className="text-xs text-[#475569]">
                  Mark a lead as Booked Meeting or Positive Reply in the pipeline table to teach the finder what works best.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {calibration.top_winners.map((item) => (
                    <li
                      key={item.lead_id}
                      className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0F172A] truncate">
                          {item.business_name}
                        </span>
                        <span className="font-semibold text-[#065F46] tabular-nums shrink-0">
                          +{item.reward_points} · {item.total_score}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2">
                        {item.gatekeeper_reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-[#92400E] mb-1.5">
                Patterns Marked Not a Fit
              </div>
              {calibration.top_penalized.length === 0 ? (
                <p className="text-xs text-[#475569]">
                  Mark poor fits in the pipeline table so similar businesses are automatically filtered out.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {calibration.top_penalized.map((item) => (
                    <li
                      key={item.lead_id}
                      className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0F172A] truncate">
                          {item.business_name}
                        </span>
                        <span className="font-semibold text-[#92400E] tabular-nums shrink-0">
                          {item.reward_points} · {item.total_score}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-2">
                        {item.gatekeeper_reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Updates + Websites Checked */}
      <div className="grid grid-cols-1 divide-y divide-[#E2E8F0] lg:grid-cols-3 lg:divide-x lg:divide-y-0 flex-1">
        <div className="p-4 lg:col-span-2 flex flex-col">
          <div className="text-xs font-semibold text-[#0F172A] mb-2">
            Recent Activity ({eventLog.length})
          </div>
          <div
            data-testid="live-activity-log"
            className="h-36 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs space-y-1.5"
          >
            {eventLog.length === 0 ? (
              <div className="text-[#475569]">
                Enter an industry niche and city in Step 1 above and click Find Leads to watch live business lookup, verification, and outreach drafting updates here.
              </div>
            ) : (
              eventLog.map((evt, idx) => (
                <div key={`${evt.timestamp}-${idx}`} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-[11px] text-[#64748B] tabular-nums shrink-0">
                    {evt.timestamp.slice(11, 19)}
                  </span>
                  <span
                    className={`break-words ${
                      evt.type === 'error' || evt.type === 'prospect_error'
                        ? 'font-medium text-[#991B1B]'
                        : evt.type === 'lead_completed' || evt.type === 'run_completed'
                          ? 'font-medium text-[#065F46]'
                          : 'text-[#0F172A]'
                    }`}
                  >
                    {evt.message || evt.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 flex flex-col">
          <div className="text-xs font-semibold text-[#0F172A] mb-2">
            Websites &amp; Sources Checked
          </div>
          <div className="h-36 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
            {latestSources.length === 0 ? (
              <p className="text-xs text-[#475569]">
                Verified business pages and search references discovered during research appear here.
              </p>
            ) : (
              latestSources.map((src) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs text-[#1D4ED8] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]"
                >
                  <span className="truncate">{src.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
