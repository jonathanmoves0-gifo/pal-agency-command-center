import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeadRecord, PipelineStreamEvent } from './shared/types';
import { streamSsePost } from './utils/sseClient';
import {
  buildSeedPitchForTrack,
  getStorageKeyForTrack,
  HF_TOKEN_STORAGE_KEY,
  type IndustryTemplate,
  type MarketTrack,
} from './utils/pitchPresenter';
import { LightTopNav, type LightWorkspaceTab } from './components/LightTopNav';
import { FindPitchLeadsView, type PitchProgress } from './components/FindPitchLeadsView';
import { AiVideoContentView } from './components/AiVideoContentView';
import { WebsiteTemplatesView } from './components/WebsiteTemplatesView';
import { ApiSettingsModal } from './components/ApiSettingsModal';

const IDLE_PROGRESS: PitchProgress = {
  step1: 'pending',
  step2: 'pending',
  step3: 'pending',
};

const COMPLETED_PROGRESS: PitchProgress = {
  step1: 'done',
  step2: 'done',
  step3: 'done',
};

function loadTrackLeads(track: MarketTrack): LeadRecord[] {
  const key = getStorageKeyForTrack(track);
  const raw = localStorage.getItem(key);
  if (raw === null) {
    const seed = [buildSeedPitchForTrack(track)];
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as LeadRecord[])
      : [buildSeedPitchForTrack(track)];
  } catch {
    return [buildSeedPitchForTrack(track)];
  }
}

export default function App() {
  const [activeMarket, setActiveMarket] = useState<MarketTrack>('LOCAL');
  const [activeTab, setActiveTab] = useState<LightWorkspaceTab>('find_pitch');

  const [hfToken, setHfToken] = useState<string>(
    () => localStorage.getItem(HF_TOKEN_STORAGE_KEY) || ''
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [leadsByTrack, setLeadsByTrack] = useState<Record<MarketTrack, LeadRecord[]>>(() => ({
    LOCAL: loadTrackLeads('LOCAL'),
    GLOBAL: loadTrackLeads('GLOBAL'),
  }));

  const [selectedLeadIdByTrack, setSelectedLeadIdByTrack] = useState<
    Record<MarketTrack, string | null>
  >(() => ({
    LOCAL: loadTrackLeads('LOCAL')[0]?.id ?? null,
    GLOBAL: loadTrackLeads('GLOBAL')[0]?.id ?? null,
  }));

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PitchProgress>(COMPLETED_PROGRESS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefillDraft, setPrefillDraft] = useState<{
    industry: string;
    issue: string;
    nonce: number;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const currentLeads = leadsByTrack[activeMarket];
  const currentLead =
    currentLeads.find((l) => l.id === selectedLeadIdByTrack[activeMarket]) ??
    currentLeads[0] ??
    null;

  useEffect(() => {
    setErrorMessage(null);
    if (!isRunning) {
      setProgress(currentLead ? COMPLETED_PROGRESS : IDLE_PROGRESS);
    }
  }, [activeMarket, currentLead, isRunning]);

  const handleSaveHfToken = (token: string) => {
    setHfToken(token);
    if (token) {
      localStorage.setItem(HF_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(HF_TOKEN_STORAGE_KEY);
    }
  };

  const saveLeadToMarket = useCallback((track: MarketTrack, newLead: LeadRecord) => {
    setLeadsByTrack((prev) => {
      const nextTrackLeads = [newLead, ...prev[track].filter((l) => l.id !== newLead.id)];
      localStorage.setItem(getStorageKeyForTrack(track), JSON.stringify(nextTrackLeads));
      return { ...prev, [track]: nextTrackLeads };
    });
    setSelectedLeadIdByTrack((prev) => ({ ...prev, [track]: newLead.id }));
  }, []);

  const handleStreamEvent = useCallback(
    (track: MarketTrack, evt: PipelineStreamEvent) => {
      if (evt.type === 'node_started') {
        if (evt.node === 'planner_node') {
          setProgress({ step1: 'active', step2: 'pending', step3: 'pending' });
        } else if (evt.node === 'qualifier_node') {
          setProgress({ step1: 'done', step2: 'active', step3: 'pending' });
        } else if (evt.node === 'outreach_architect_node' || evt.node === 'memory_logger_node') {
          setProgress({ step1: 'done', step2: 'done', step3: 'active' });
        }
      }

      if (evt.type === 'node_completed') {
        if (evt.node === 'planner_node') {
          setProgress({ step1: 'done', step2: 'active', step3: 'pending' });
        } else if (evt.node === 'qualifier_node') {
          setProgress({ step1: 'done', step2: 'done', step3: 'active' });
        } else if (evt.node === 'memory_logger_node') {
          setProgress(COMPLETED_PROGRESS);
        }
      }

      if (evt.type === 'lead_completed' && evt.lead) {
        saveLeadToMarket(track, evt.lead);
        setProgress(COMPLETED_PROGRESS);
      }

      if (evt.type === 'error' || evt.type === 'prospect_error') {
        setErrorMessage(
          evt.message || 'Could not finish building the client pitch. Please try again.'
        );
      }
    },
    [saveLeadToMarket]
  );

  const handleBuildPitch = async (input: {
    businessName: string;
    websiteLink: string;
    industry: string;
    mainIssue: string;
  }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const targetTrack = activeMarket;
    setIsRunning(true);
    setErrorMessage(null);
    setProgress({ step1: 'active', step2: 'pending', step3: 'pending' });

    try {
      await streamSsePost(
        '/api/pipeline/run',
        {
          business_name: input.businessName,
          domain: input.websiteLink,
          niche: input.industry,
          market: targetTrack === 'LOCAL' ? 'UK' : 'US',
          discovery_notes: input.mainIssue,
        },
        (evt) => handleStreamEvent(targetTrack, evt),
        controller.signal
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to reach the server. Please try again.'
        );
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancelRun = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setProgress(currentLead ? COMPLETED_PROGRESS : IDLE_PROGRESS);
  };

  const handleUseTemplateForClient = (template: IndustryTemplate) => {
    setPrefillDraft({
      industry: template.industry,
      issue: template.defaultIssue,
      nonce: Date.now(),
    });
    setActiveTab('find_pitch');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <LightTopNav
        activeMarket={activeMarket}
        onSelectMarket={(mkt) => {
          if (!isRunning) setActiveMarket(mkt);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasHfToken={Boolean(hfToken.trim())}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'find_pitch' && (
          <FindPitchLeadsView
            activeMarket={activeMarket}
            activeLead={currentLead}
            savedLeads={currentLeads}
            isRunning={isRunning}
            progress={progress}
            errorMessage={errorMessage}
            prefillDraft={prefillDraft}
            onBuildPitch={handleBuildPitch}
            onCancelRun={handleCancelRun}
            onSelectSavedLead={(lead) => {
              setSelectedLeadIdByTrack((prev) => ({ ...prev, [activeMarket]: lead.id }));
              setProgress(COMPLETED_PROGRESS);
            }}
          />
        )}

        {activeTab === 'ai_video' && (
          <AiVideoContentView
            activeMarket={activeMarket}
            hfToken={hfToken}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {activeTab === 'website_templates' && (
          <WebsiteTemplatesView onUseTemplateForClient={handleUseTemplateForClient} />
        )}
      </main>

      <ApiSettingsModal
        isOpen={isSettingsOpen}
        savedToken={hfToken}
        onSaveToken={handleSaveHfToken}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
