import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApiHealthStatus,
  GraphNodeName,
  GroundingSource,
  IntakeMode,
  LeadRecord,
  Market,
  OutcomeRewardType,
  PipelineStreamEvent,
  RewardMemoryItem,
  WorkspaceTab,
} from './shared/types';
import {
  getCalibrationContext,
  leadsToCsv,
  OUTCOME_REWARDS,
  parseImportedJson,
  upsertRewardMemory,
} from './utils/pipelineLogic';
import {
  downloadTextFile,
  getApprovedBackupCursor,
  loadLeadsFromStorage,
  loadRewardMemoryFromStorage,
  maybeTriggerSilentBackup,
  saveLeadsToStorage,
  saveRewardMemoryToStorage,
  SEED_LEADS,
  SEED_REWARD_MEMORY,
  setApprovedBackupCursor,
} from './utils/storage';
import { streamSsePost } from './utils/sseClient';
import { TopNavBar } from './components/TopNavBar';
import { IntakeConsole } from './components/IntakeConsole';
import { GraphExecutionTrace, type GraphNodeState } from './components/GraphExecutionTrace';
import { ClientPipelineTable } from './components/ClientPipelineTable';
import { LeadInspectorDrawer } from './components/LeadInspectorDrawer';
import { UgcStudioView } from './components/UgcStudioView';
import { WebKitsView } from './components/WebKitsView';

const INITIAL_NODE_STATES: Record<GraphNodeName, GraphNodeState> = {
  scout_node: { status: 'IDLE' },
  planner_node: { status: 'IDLE' },
  qualifier_node: { status: 'IDLE' },
  outreach_architect_node: { status: 'IDLE' },
  memory_logger_node: { status: 'IDLE' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('signal_hunter');
  const [health, setHealth] = useState<ApiHealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [leads, setLeads] = useState<LeadRecord[]>(() => loadLeadsFromStorage());
  const [rewardMemory, setRewardMemory] = useState<RewardMemoryItem[]>(() =>
    loadRewardMemoryFromStorage()
  );
  const [inspectedLead, setInspectedLead] = useState<LeadRecord | null>(null);

  // Live SSE run state
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState<IntakeMode | null>(null);
  const [activeProspectLabel, setActiveProspectLabel] = useState<string | null>(null);
  const [nodeStates, setNodeStates] = useState<Record<GraphNodeName, GraphNodeState>>(
    INITIAL_NODE_STATES
  );
  const [eventLog, setEventLog] = useState<PipelineStreamEvent[]>([]);
  const [latestSources, setLatestSources] = useState<GroundingSource[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = (await res.json()) as ApiHealthStatus;
        setHealth(data);
      }
    } catch {
      // ignore transient poll error
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const calibration = useMemo(() => getCalibrationContext(rewardMemory), [rewardMemory]);

  const commitLeads = useCallback(
    (updater: (prev: LeadRecord[]) => LeadRecord[], nextMemory?: RewardMemoryItem[]) => {
      setLeads((prev) => {
        const updated = updater(prev);
        saveLeadsToStorage(updated);
        const memToUse = nextMemory ?? rewardMemory;
        const triggered = maybeTriggerSilentBackup(updated, memToUse);
        if (triggered) {
          setBackupNotice('Automatic silent .json backup downloaded (5 new approved leads reached).');
          setTimeout(() => setBackupNotice(null), 5000);
        }
        return updated;
      });
    },
    [rewardMemory]
  );

  const handleStreamEvent = useCallback(
    (evt: PipelineStreamEvent) => {
      setEventLog((prev) => [...prev.slice(-80), evt]);

      if (evt.type === 'prospect_started') {
        setActiveProspectLabel(
          `Prospect ${evt.prospect_index}/${evt.prospect_total}: ${evt.business_name} (${evt.domain})`
        );
        setNodeStates((prev) => ({
          ...INITIAL_NODE_STATES,
          scout_node: prev.scout_node.status === 'DONE' ? prev.scout_node : { status: 'IDLE' },
        }));
      }

      if (evt.type === 'node_started' && evt.node) {
        setNodeStates((prev) => ({
          ...prev,
          [evt.node!]: { status: 'RUNNING', summary: evt.message },
        }));
      }

      if (evt.type === 'node_pacing' && evt.node) {
        setNodeStates((prev) => ({
          ...prev,
          [evt.node!]: { ...prev[evt.node!], status: 'PACING', summary: evt.message },
        }));
      }

      if (evt.type === 'node_completed' && evt.node) {
        const data = evt.data ?? {};
        if (Array.isArray(data.grounding_sources)) {
          setLatestSources(data.grounding_sources as GroundingSource[]);
        }
        setNodeStates((prev) => {
          const next = {
            ...prev,
            [evt.node!]: {
              status: 'DONE' as const,
              provider: evt.provider,
              summary: evt.message,
            },
          };
          if (evt.node === 'qualifier_node' && data.status !== 'APPROVED_FOR_OUTREACH') {
            next.outreach_architect_node = {
              status: 'SKIPPED',
              summary: `Skipped (${data.status})`,
            };
          }
          return next;
        });
      }

      if (evt.type === 'lead_completed' && evt.lead) {
        const newLead = evt.lead;
        commitLeads((prev) => [newLead, ...prev]);
      }

      if (evt.type === 'error' || evt.type === 'prospect_error') {
        setRunError(evt.message || 'Pipeline step failed.');
      }
    },
    [commitLeads]
  );

  const executePipelineStream = async (
    mode: IntakeMode,
    url: string,
    payload: Record<string, unknown>
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setActiveMode(mode);
    setActiveProspectLabel(null);
    setNodeStates(INITIAL_NODE_STATES);
    setEventLog([]);
    setLatestSources([]);
    setRunError(null);

    try {
      await streamSsePost(
        url,
        {
          ...payload,
          calibration,
        },
        handleStreamEvent,
        controller.signal
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setRunError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunScout = (niche: string, region: string) => {
    executePipelineStream('scout', '/api/pipeline/scout', {
      niche,
      region,
      existingLeads: leads.map((l) => ({
        business_name: l.business_name,
        domain: l.domain,
      })),
    });
  };

  const handleRunSingle = (payload: {
    business_name: string;
    domain: string;
    niche: string;
    market: Market;
    discovery_notes: string;
  }) => {
    executePipelineStream('single', '/api/pipeline/run', payload);
  };

  const handleRunBatch = (batchText: string) => {
    executePipelineStream('batch', '/api/pipeline/batch', {
      batch_text: batchText,
    });
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setRunError('Pipeline run aborted by operator.');
  };

  const handleOutcomeChange = (leadId: string, outcome: Exclude<OutcomeRewardType, null>) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;
    const rewardPoints = OUTCOME_REWARDS[outcome].points;
    const updatedLead: LeadRecord = {
      ...target,
      outcome,
      reward_points: rewardPoints,
      updated_at: new Date().toISOString(),
    };
    const nextMemory = upsertRewardMemory(rewardMemory, updatedLead, outcome);
    setRewardMemory(nextMemory);
    saveRewardMemoryToStorage(nextMemory);

    commitLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)), nextMemory);
    if (inspectedLead?.id === leadId) {
      setInspectedLead(updatedLead);
    }
  };

  const handleExportCsv = () => {
    const csv = leadsToCsv(leads);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`pal-agency-pipeline-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleExportJson = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const payload = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        leads,
        reward_memory: rewardMemory,
      },
      null,
      2
    );
    downloadTextFile(`pal-agency-pipeline-${stamp}.json`, payload, 'application/json');
  };

  const handleImportJson = (rawText: string) => {
    const parsed = parseImportedJson(rawText);
    const mergedLeadsMap = new Map<string, LeadRecord>();
    for (const item of [...parsed.leads, ...leads]) {
      mergedLeadsMap.set(item.id, item);
    }
    const mergedLeads = Array.from(mergedLeadsMap.values());

    const mergedMemMap = new Map<string, RewardMemoryItem>();
    for (const mem of [...parsed.rewardMemory, ...rewardMemory]) {
      mergedMemMap.set(mem.lead_id, mem);
    }
    const mergedMem = Array.from(mergedMemMap.values());

    setRewardMemory(mergedMem);
    saveRewardMemoryToStorage(mergedMem);
    commitLeads(() => mergedLeads, mergedMem);
  };

  const handleClearAll = () => {
    setLeads([]);
    saveLeadsToStorage([]);
    setRewardMemory([]);
    saveRewardMemoryToStorage([]);
    setApprovedBackupCursor(0);
    setInspectedLead(null);
  };

  const handleLoadSamples = () => {
    setRewardMemory(SEED_REWARD_MEMORY);
    saveRewardMemoryToStorage(SEED_REWARD_MEMORY);
    const seedApproved = SEED_LEADS.filter((l) => l.status === 'APPROVED_FOR_OUTREACH').length;
    setApprovedBackupCursor(seedApproved);
    setLeads(SEED_LEADS);
    saveLeadsToStorage(SEED_LEADS);
  };

  const approvedCount = leads.filter((l) => l.status === 'APPROVED_FOR_OUTREACH').length;
  const approvedSinceLastBackup = Math.max(0, approvedCount - getApprovedBackupCursor());

  return (
    <div className="min-h-screen bg-[#0D0F12] text-[#ECEFF4] flex flex-col">
      <TopNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={fetchHealth}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 space-y-6">
        {backupNotice && (
          <div
            role="status"
            className="border border-[#22C55E]/60 bg-[#22C55E]/10 px-4 py-2.5 font-mono text-xs text-[#22C55E]"
          >
            {backupNotice}
          </div>
        )}

        {activeTab === 'signal_hunter' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-5 flex flex-col">
                <IntakeConsole
                  isRunning={isRunning}
                  existingCount={leads.length}
                  onRunScout={handleRunScout}
                  onRunSingle={handleRunSingle}
                  onRunBatch={handleRunBatch}
                  onAbort={handleAbort}
                />
              </div>

              <div className="lg:col-span-7 flex flex-col">
                <GraphExecutionTrace
                  isRunning={isRunning}
                  activeMode={activeMode}
                  activeProspectLabel={activeProspectLabel}
                  nodeStates={nodeStates}
                  eventLog={eventLog}
                  latestSources={latestSources}
                  calibration={calibration}
                  runError={runError}
                />
              </div>
            </div>

            <ClientPipelineTable
              leads={leads}
              approvedSinceLastBackup={approvedSinceLastBackup}
              onSelectLead={setInspectedLead}
              onOutcomeChange={handleOutcomeChange}
              onExportCsv={handleExportCsv}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onClearAll={handleClearAll}
              onLoadSamples={handleLoadSamples}
            />
          </>
        )}

        {activeTab === 'ugc_studio' && <UgcStudioView leads={leads} />}

        {activeTab === 'web_kits' && <WebKitsView leads={leads} />}
      </main>

      <LeadInspectorDrawer lead={inspectedLead} onClose={() => setInspectedLead(null)} />
    </div>
  );
}
