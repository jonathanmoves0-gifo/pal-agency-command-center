import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApiHealthStatus,
  LeadRecord,
  OutreachDecision,
  PipelineStreamEvent,
  RewardMemoryItem,
  WorkspaceTab,
} from './shared/types';
import { getCalibrationContext } from './utils/pipelineLogic';
import { streamSsePost } from './utils/sseClient';
import {
  ensureLeadProofAsset,
  loadLeadsFromStorage,
  loadRewardMemoryFromStorage,
  maybeTriggerSilentBackup,
  saveLeadsToStorage,
} from './utils/storage';
import { ExecutiveHeader } from './components/ExecutiveHeader';
import { IntakeConsole, type LiveFilterStats } from './components/IntakeConsole';
import { ClientPipelineTable } from './components/ClientPipelineTable';
import { OutreachReadyPanel } from './components/OutreachReadyPanel';
import { LiveDemoModal } from './components/LiveDemoModal';
import { WebsitePreviewBuilderView } from './components/WebsitePreviewBuilderView';
import { AgenticBlueprintsView } from './components/AgenticBlueprintsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('client_finder');

  // Health & API readiness
  const [health, setHealth] = useState<ApiHealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Persistent client pipeline & reward memory state
  const [leads, setLeads] = useState<LeadRecord[]>(() => loadLeadsFromStorage());
  const [rewardMemory] = useState<RewardMemoryItem[]>(() => loadRewardMemoryFromStorage());

  // Focused Action Panel opens ONLY when user clicks "Yes" or selects a lead
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [demoModalLeadId, setDemoModalLeadId] = useState<string | null>(null);
  const [builderLeadId, setBuilderLeadId] = useState<string | null>(null);
  const [blueprintLeadId, setBlueprintLeadId] = useState<string | null>(null);

  // Streaming pipeline runtime state
  const [isRunning, setIsRunning] = useState(false);
  const [liveStatusMessage, setLiveStatusMessage] = useState<string | null>(null);
  const [filterStats, setFilterStats] = useState<LiveFilterStats | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const calibration = useMemo(() => getCalibrationContext(rewardMemory), [rewardMemory]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => l.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  const demoModalLead = useMemo(
    () => leads.find((l) => l.id === demoModalLeadId) ?? null,
    [leads, demoModalLeadId]
  );

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = (await res.json()) as ApiHealthStatus;
        setHealth(data);
      }
    } catch {
      // keep previous health state
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  const commitLeadRecord = useCallback(
    (incomingLead: LeadRecord) => {
      const newLead = ensureLeadProofAsset(incomingLead);
      setLeads((prev) => {
        const next = [newLead, ...prev.filter((l) => l.id !== newLead.id)];
        saveLeadsToStorage(next);
        maybeTriggerSilentBackup(next, rewardMemory);
        return next;
      });
    },
    [rewardMemory]
  );

  const handleStreamEvent = useCallback(
    (evt: PipelineStreamEvent) => {
      if (
        (evt.type === 'scout_completed' ||
          (evt.type === 'node_completed' && evt.node === 'scout_node')) &&
        evt.data &&
        typeof evt.data.raw_found_count === 'number'
      ) {
        const qualifiedCount = Number(evt.data.qualified_count ?? 0);
        setFilterStats({
          rawFoundCount: Number(evt.data.raw_found_count ?? 0),
          qualifiedCount,
          filteredOutCount: Number(evt.data.filtered_out_count ?? 0),
          missingPhoneCount: Number(evt.data.missing_phone_count ?? 0),
          missingDecisionMakerCount: Number(evt.data.missing_decision_maker_count ?? 0),
        });
        setLiveStatusMessage(
          `Found ${qualifiedCount} qualified ${qualifiedCount === 1 ? 'lead' : 'leads'}`
        );
      } else if (evt.type === 'run_completed' && evt.message) {
        setLiveStatusMessage(evt.message);
      }

      if (evt.type === 'lead_completed' && evt.lead) {
        commitLeadRecord(evt.lead);
      }

      if (evt.type === 'error' || evt.type === 'prospect_error') {
        setRunError(evt.message || 'Could not complete lead search.');
      }
    },
    [commitLeadRecord]
  );

  const handleRunScout = async (niche: string, region: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setFilterStats(null);
    setRunError(null);
    setLiveStatusMessage(`Searching for ${niche} in ${region}...`);

    try {
      await streamSsePost(
        '/api/pipeline/scout',
        {
          niche,
          region,
          existingLeads: leads.map((l) => ({
            business_name: l.business_name,
            domain: l.domain,
          })),
          calibration,
        },
        handleStreamEvent,
        controller.signal
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        const msg = err instanceof Error ? err.message : String(err);
        setRunError(msg);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setLiveStatusMessage('Search stopped.');
  };

  const handleSetOutreachDecision = (leadId: string, decision: OutreachDecision) => {
    const nowIso = new Date().toISOString();
    setLeads((prev) => {
      const next = prev.map((l) =>
        l.id === leadId ? { ...l, outreach_decision: decision, updated_at: nowIso } : l
      );
      saveLeadsToStorage(next);
      return next;
    });
    if (decision === 'approved_to_outreach') {
      setSelectedLeadId(leadId);
    } else if (decision === 'skipped' && selectedLeadId === leadId) {
      setSelectedLeadId(null);
    }
  };

  const handleToggleMarkedSent = (leadId: string) => {
    const nowIso = new Date().toISOString();
    setLeads((prev) => {
      const next = prev.map((l) => {
        if (l.id !== leadId) return l;
        const currentlySent = Boolean(l.outreach_activity?.marked_sent_at);
        return {
          ...l,
          outreach_activity: {
            ...l.outreach_activity,
            marked_sent_at: currentlySent ? undefined : nowIso,
            email_mode: 'manual' as const,
          },
          updated_at: nowIso,
        };
      });
      saveLeadsToStorage(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <ExecutiveHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={() => void fetchHealth()}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 space-y-6">
        {activeTab === 'client_finder' && (
          <>
            {/* Top Zone — Simple Search Bar */}
            <IntakeConsole
              isRunning={isRunning}
              existingCount={leads.length}
              liveStatusMessage={liveStatusMessage}
              filterStats={filterStats}
              runError={runError}
              onRunScout={(n, r) => void handleRunScout(n, r)}
              onAbort={handleAbort}
            />

            {/* Left/Main Zone (Quiet Lead Queue) + Right Zone (Focused Action Panel) */}
            {selectedLead ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                <div className="lg:col-span-6">
                  <ClientPipelineTable
                    leads={leads}
                    selectedLeadId={selectedLead.id}
                    onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                    onSetOutreachDecision={handleSetOutreachDecision}
                  />
                </div>

                <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0F172A]/30 p-3 sm:items-center lg:static lg:inset-auto lg:z-auto lg:block lg:col-span-6 lg:bg-transparent lg:p-0 lg:sticky lg:top-6">
                  <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto lg:max-w-none lg:max-h-none lg:overflow-visible">
                    <OutreachReadyPanel
                      lead={selectedLead}
                      onClose={() => setSelectedLeadId(null)}
                      onOpenProofDemo={(lead) => setDemoModalLeadId(lead.id)}
                      onToggleMarkedSent={handleToggleMarkedSent}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <ClientPipelineTable
                  leads={leads}
                  selectedLeadId={null}
                  onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                  onSetOutreachDecision={handleSetOutreachDecision}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'website_builder' && (
          <WebsitePreviewBuilderView leads={leads} initialLeadId={builderLeadId} />
        )}

        {activeTab === 'agentic_blueprints' && (
          <AgenticBlueprintsView leads={leads} initialLeadId={blueprintLeadId} />
        )}
      </main>

      <LiveDemoModal
        lead={demoModalLead}
        onClose={() => setDemoModalLeadId(null)}
        onOpenWebsiteBuilder={(lead) => {
          setBuilderLeadId(lead.id);
          setDemoModalLeadId(null);
          setActiveTab('website_builder');
        }}
        onOpenAgenticBlueprint={(lead) => {
          setBlueprintLeadId(lead.id);
          setDemoModalLeadId(null);
          setActiveTab('agentic_blueprints');
        }}
      />
    </div>
  );
}
