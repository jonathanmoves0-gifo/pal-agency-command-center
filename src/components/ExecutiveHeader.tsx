import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ApiHealthStatus, WorkspaceTab } from '../shared/types';

interface ExecutiveHeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  health: ApiHealthStatus | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
}

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'client_finder', label: 'Client Finder' },
  { id: 'website_builder', label: 'Website Preview Builder' },
  { id: 'agentic_blueprints', label: 'AI & Agentic Solution Blueprints' },
];

export function ExecutiveHeader({
  activeTab,
  onSelectTab,
  health,
  healthLoading,
  onRefreshHealth,
}: ExecutiveHeaderProps) {
  const [showHealthDetail, setShowHealthDetail] = useState(false);
  const popoverContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHealthDetail) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        popoverContainerRef.current &&
        !popoverContainerRef.current.contains(e.target as Node)
      ) {
        setShowHealthDetail(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHealthDetail(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHealthDetail]);

  const isConnected = Boolean(health?.gemini_configured || health?.openrouter_configured);

  return (
    <header className="relative z-30 border-b border-[#E2E8F0] bg-[#FFFFFF]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 sm:gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center shrink-0">
          <span className="text-base font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0">
            Pal Agency
          </span>
        </div>

        {/* Zone 2: Single-line Primary Workspace Navigation */}
        <nav
          role="tablist"
          aria-label="Agency workspaces"
          className="hidden md:flex items-center gap-6 overflow-x-auto"
        >
          {WORKSPACE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(tab.id)}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-[#1D4ED8]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <span>{tab.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-[#1D4ED8]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: AI Engine Readiness Control */}
        <div ref={popoverContainerRef} className="relative flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowHealthDetail((prev) => !prev)}
            aria-expanded={showHealthDetail}
            aria-label="Check AI Engine connection details"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isConnected ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
            )}
            <span>
              {health === null
                ? 'AI Engine: Checking'
                : isConnected
                  ? 'AI Engine: Ready'
                  : 'AI Engine: Setup Needed'}
            </span>
          </button>

          {showHealthDetail && (
            <div
              role="region"
              aria-label="AI Engine connection summary"
              className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-lg z-40"
            >
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
                <span className="text-xs font-semibold text-[#0F172A]">
                  AI Engine Routing Status
                </span>
                <button
                  type="button"
                  onClick={onRefreshHealth}
                  disabled={healthLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[11px] font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${healthLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#475569]">Primary Research &amp; Writing</span>
                  <span
                    className={`font-semibold ${
                      health?.gemini_configured ? 'text-[#065F46]' : 'text-[#92400E]'
                    }`}
                  >
                    {health?.gemini_configured ? 'Connected' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#475569]">Automatic Backup Routing</span>
                  <span
                    className={`font-semibold ${
                      health?.openrouter_configured ? 'text-[#065F46]' : 'text-[#475569]'
                    }`}
                  >
                    {health?.openrouter_configured ? 'Standby Ready' : 'Optional'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#475569]">Proposal &amp; Proof Dispatch</span>
                  <span className="font-semibold text-[#065F46]">
                    Copy-Ready (Zero Passwords)
                  </span>
                </div>
                <p className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] leading-relaxed">
                  {isConnected
                    ? 'Live business directory search, website contact scanning, custom Demo/Proof generation, and copy-ready Proposal Kits are ready to run.'
                    : 'Add a server AI key in project settings to enable live prospect scoring and custom proposal drafting.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compact Mobile Tab Strip */}
      <nav
        role="tablist"
        aria-label="Agency workspaces mobile"
        className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-[#F1F5F9] px-4 py-2"
      >
        {WORKSPACE_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={`mobile-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
