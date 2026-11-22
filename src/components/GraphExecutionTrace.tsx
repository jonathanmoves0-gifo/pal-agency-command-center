import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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
  nodeStates: Record<GraphNodeName, GraphNodeState>;
  eventLog: PipelineStreamEvent[];
  latestSources: GroundingSource[];
  calibration: CalibrationContext;
  runError: string | null;
}

const ORDERED_NODES: Array<{ id: GraphNodeName; label: string; role: string }> = [
  { id: 'scout_node', label: 'scout_node', role: 'Search discovery (5 net-new)' },
  { id: 'planner_node', label: 'planner_node', role: 'Bottleneck & leak research' },
  { id: 'qualifier_node', label: 'qualifier_node', role: 'Self-calibrated 0–100 scoring' },
  { id: 'outreach_architect_node', label: 'outreach_architect_node', role: 'Conditional (75+ only)' },
  { id: 'memory_logger_node', label: 'memory_logger_node', role: 'localStorage record commit' },
];

function statusStyle(status: NodeRuntimeStatus): string {
  switch (status) {
    case 'RUNNING':
      return 'border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10';
    case 'PACING':
      return 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10';
    case 'DONE':
      return 'border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10';
    case 'SKIPPED':
      return 'border-[#343B48] text-[#8B949E] bg-[#161A20]';
    case 'ERROR':
      return 'border-[#EF4444] text-[#FCA5A5] bg-[#EF4444]/10';
    default:
      return 'border-[#242830] text-[#6E7681] bg-[#0D0F12]';
  }
}

export function GraphExecutionTrace({
  isRunning,
  activeMode,
  activeProspectLabel,
  nodeStates,
  eventLog,
  latestSources,
  calibration,
  runError,
}: GraphExecutionTraceProps) {
  const [showCalibrationDetail, setShowCalibrationDetail] = useState(false);

  const visibleNodes =
    activeMode === 'scout'
      ? ORDERED_NODES
      : ORDERED_NODES.filter((n) => n.id !== 'scout_node');

  return (
    <section
      aria-label="LangGraph execution trace and reward calibration"
      className="border border-[#242830] bg-[#12151A] flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242830] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[#ECEFF4]">
            LangGraph StateGraph Stream
          </h2>
          <p className="text-xs text-[#8B949E] mt-0.5">
            {activeProspectLabel
              ? activeProspectLabel
              : 'Live Server-Sent Events node execution & calibration context'}
          </p>
        </div>

        <span
          className={`border px-2 py-1 font-mono text-[11px] whitespace-nowrap ${
            isRunning
              ? 'border-[#22C55E]/60 bg-[#22C55E]/10 text-[#22C55E]'
              : runError
                ? 'border-[#EF4444]/60 bg-[#EF4444]/10 text-[#FCA5A5]'
                : 'border-[#242830] bg-[#0D0F12] text-[#8B949E]'
          }`}
        >
          {isRunning ? 'SSE STREAMING' : runError ? 'RUN HALTED' : 'GRAPH STANDBY'}
        </span>
      </div>

      {/* Node Graph Rail */}
      <div className="grid grid-cols-1 gap-px bg-[#242830] border-b border-[#242830] sm:grid-cols-2">
        {visibleNodes.map((node) => {
          const st = nodeStates[node.id] ?? { status: 'IDLE' as NodeRuntimeStatus };
          return (
            <div
              key={node.id}
              data-testid={`graph-node-${node.id}`}
              className="bg-[#12151A] p-3 flex flex-col justify-between gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-[#ECEFF4] whitespace-nowrap">
                  {node.label}
                </span>
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[10px] shrink-0 whitespace-nowrap ${statusStyle(
                    st.status
                  )}`}
                >
                  {st.status}
                </span>
              </div>
              <p className="text-[11px] text-[#8B949E] leading-snug">
                {st.summary || node.role}
              </p>
              {st.provider && (
                <span className="font-mono text-[10px] text-[#6E7681] truncate">
                  {st.provider}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {runError && (
        <div
          role="alert"
          className="border-b border-[#EF4444]/50 bg-[#EF4444]/10 px-4 py-2.5 text-xs text-[#FCA5A5]"
        >
          {runError}
        </div>
      )}

      {/* Calibration Memory Bar */}
      <div className="border-b border-[#242830] bg-[#0F1216] px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-[#C9D1D9]">Reward Memory Calibration</span>
            <span className="text-[#6E7681]" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-[#22C55E]">
              {calibration.top_winners.length}/3 WINNERS ARMED
            </span>
            <span className="text-[#6E7681]" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-[#F59E0B]">
              {calibration.top_penalized.length}/2 PENALIZED ARMED
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCalibrationDetail((v) => !v)}
            className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-[#ECEFF4] cursor-pointer"
          >
            <span>{showCalibrationDetail ? 'Hide context' : 'Inspect calibration'}</span>
            {showCalibrationDetail ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {showCalibrationDetail && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#242830] pt-3 md:grid-cols-2">
            <div>
              <div className="font-mono text-[11px] text-[#22C55E] mb-1.5">
                TOP REWARDED WINNERS (INJECTED INTO QUALIFIER & OUTREACH)
              </div>
              {calibration.top_winners.length === 0 ? (
                <p className="text-xs text-[#6E7681]">
                  Mark a lead as +25 Booked Demo or +10 Positive Reply to train future runs.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {calibration.top_winners.map((item) => (
                    <li
                      key={item.lead_id}
                      className="border border-[#242830] bg-[#12151A] px-2.5 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#ECEFF4] truncate">
                          {item.business_name}
                        </span>
                        <span className="font-mono text-[11px] text-[#22C55E] shrink-0">
                          +{item.reward_points} · {item.total_score}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B949E] mt-0.5 line-clamp-2">
                        {item.gatekeeper_reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="font-mono text-[11px] text-[#F59E0B] mb-1.5">
                TOP PENALIZED LEADS (NEGATIVE GUARDRAILS)
              </div>
              {calibration.top_penalized.length === 0 ? (
                <p className="text-xs text-[#6E7681]">
                  Mark mismatches as -15 Wrong Fit or -2 No Reply to calibrate gatekeeper rejections.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {calibration.top_penalized.map((item) => (
                    <li
                      key={item.lead_id}
                      className="border border-[#242830] bg-[#12151A] px-2.5 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#ECEFF4] truncate">
                          {item.business_name}
                        </span>
                        <span className="font-mono text-[11px] text-[#FCA5A5] shrink-0">
                          {item.reward_points} · {item.total_score}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B949E] mt-0.5 line-clamp-2">
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

      {/* Live SSE Log + Grounding Sources */}
      <div className="grid grid-cols-1 divide-y divide-[#242830] lg:grid-cols-3 lg:divide-x lg:divide-y-0 flex-1">
        <div className="p-3 lg:col-span-2 flex flex-col">
          <div className="font-mono text-[11px] text-[#8B949E] mb-2">
            STREAM LOG ({eventLog.length} EVENTS)
          </div>
          <div
            data-testid="sse-event-log"
            className="h-44 overflow-y-auto border border-[#242830] bg-[#0D0F12] p-2.5 font-mono text-[11px] space-y-1.5"
          >
            {eventLog.length === 0 ? (
              <div className="text-[#6E7681]">
                Awaiting intake submission. SSE node progress, 3.5s pacing intervals, and conditional routing decisions stream here in real time.
              </div>
            ) : (
              eventLog.map((evt, idx) => (
                <div key={`${evt.timestamp}-${idx}`} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[#525A66] shrink-0">
                    {evt.timestamp.slice(11, 19)}
                  </span>
                  <span
                    className={`shrink-0 ${
                      evt.type === 'error' || evt.type === 'prospect_error'
                        ? 'text-[#FCA5A5]'
                        : evt.type === 'lead_completed' || evt.type === 'run_completed'
                          ? 'text-[#22C55E]'
                          : evt.type === 'node_pacing'
                            ? 'text-[#F59E0B]'
                            : 'text-[#38BDF8]'
                    }`}
                  >
                    [{evt.node || evt.type}]
                  </span>
                  <span className="text-[#C9D1D9] break-words">
                    {evt.message || evt.type}
                    {evt.provider ? ` · ${evt.provider}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 flex flex-col">
          <div className="font-mono text-[11px] text-[#8B949E] mb-2">
            SEARCH GROUNDING SOURCES
          </div>
          <div className="h-44 overflow-y-auto border border-[#242830] bg-[#0D0F12] p-2.5 space-y-1.5">
            {latestSources.length === 0 ? (
              <p className="text-xs text-[#6E7681]">
                Live Google Search URLs from <span className="font-mono">scout_node</span> and <span className="font-mono">planner_node</span> appear here during grounded runs.
              </p>
            ) : (
              latestSources.map((src) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 border border-[#242830] bg-[#12151A] px-2 py-1.5 text-xs text-[#C9D1D9] hover:border-[#3A414E] hover:text-[#ECEFF4]"
                >
                  <span className="truncate">{src.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[#8B949E]" />
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
