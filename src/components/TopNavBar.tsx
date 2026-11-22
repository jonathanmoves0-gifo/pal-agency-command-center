import { RefreshCw } from 'lucide-react';
import type { ApiHealthStatus, WorkspaceTab } from '../shared/types';

interface TopNavBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  health: ApiHealthStatus | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
}

const TABS: Array<{ id: WorkspaceTab; label: string; phaseTag?: string }> = [
  { id: 'signal_hunter', label: 'Signal Hunter' },
  { id: 'ugc_studio', label: 'UGC Studio', phaseTag: 'P4' },
  { id: 'web_kits', label: 'Web Kits', phaseTag: 'P4' },
];

export function TopNavBar({
  activeTab,
  onSelectTab,
  health,
  healthLoading,
  onRefreshHealth,
}: TopNavBarProps) {
  const geminiReady = Boolean(health?.gemini_configured);
  const openRouterReady = Boolean(health?.openrouter_configured);

  return (
    <header className="border-b border-[#242830] bg-[#0D0F12]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <div className="flex items-center shrink-0">
          <span className="text-[15px] font-semibold tracking-tight text-[#ECEFF4] whitespace-nowrap">
            Pal Agency Command Center
          </span>
        </div>

        {/* Zone 2: Workspace Tabs */}
        <nav aria-label="Primary workspaces" className="flex items-center gap-1 border border-[#242830] bg-[#12151A] p-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#22C55E] ${
                  isActive
                    ? 'bg-[#1D222B] text-[#ECEFF4] border border-[#343B48]'
                    : 'text-[#8B949E] hover:text-[#ECEFF4] border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {tab.phaseTag && (
                  <span className="font-mono text-[10px] text-[#6E7681]">{tab.phaseTag}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Live API / Quota Readiness Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            data-testid="api-quota-badge"
            className="flex items-center gap-2.5 border border-[#242830] bg-[#12151A] px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap"
            title={
              health
                ? `Primary: ${health.primary_research_model} · Scoring: ${health.scoring_model} · OpenRouter: ${health.openrouter_fallback_models.join(', ')}`
                : 'Checking server API readiness'
            }
          >
            <span className={geminiReady ? 'text-[#22C55E]' : 'text-[#F59E0B]'}>
              GEMINI: {geminiReady ? 'READY' : 'KEY NEEDED'}
            </span>
            <span className="text-[#343B48]" aria-hidden="true">
              |
            </span>
            <span className={openRouterReady ? 'text-[#38BDF8]' : 'text-[#8B949E]'}>
              OPENROUTER: {openRouterReady ? 'FALLBACK ARMED' : 'STANDBY'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefreshHealth}
            aria-label="Refresh API quota status"
            className="flex h-8 w-8 items-center justify-center border border-[#242830] bg-[#12151A] text-[#8B949E] hover:border-[#3A414E] hover:text-[#ECEFF4] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
