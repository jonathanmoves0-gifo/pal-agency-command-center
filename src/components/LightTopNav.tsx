import { KeyRound } from 'lucide-react';
import type { MarketTrack } from '../utils/pitchPresenter';

export type LightWorkspaceTab = 'find_pitch' | 'ai_video' | 'website_templates';

interface LightTopNavProps {
  activeMarket: MarketTrack;
  onSelectMarket: (market: MarketTrack) => void;
  activeTab: LightWorkspaceTab;
  onSelectTab: (tab: LightWorkspaceTab) => void;
  hasHfToken: boolean;
  onOpenSettings: () => void;
}

const WORKSPACE_TABS: Array<{ id: LightWorkspaceTab; label: string }> = [
  { id: 'find_pitch', label: 'Find & Pitch Leads' },
  { id: 'ai_video', label: 'AI Video & Content' },
  { id: 'website_templates', label: 'Website Templates' },
];

export function LightTopNav({
  activeMarket,
  onSelectMarket,
  activeTab,
  onSelectTab,
  hasHfToken,
  onOpenSettings,
}: LightTopNavProps) {
  return (
    <header className="border-b border-[#E2E8F0] bg-[#FFFFFF]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:flex-nowrap">
        {/* Left: Clean "Pal Agency" brand mark in Royal Blue and dark charcoal */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563EB] text-xs font-bold text-white"
          >
            P
          </div>
          <span className="text-lg font-bold tracking-tight whitespace-nowrap">
            <span className="text-[#2563EB]">Pal</span>{' '}
            <span className="text-[#0F172A]">Agency</span>
          </span>
        </div>

        {/* Center: Clear 2-button market switch */}
        <div
          role="group"
          aria-label="Market selector"
          className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 shrink-0"
        >
          <button
            type="button"
            aria-pressed={activeMarket === 'LOCAL'}
            onClick={() => onSelectMarket('LOCAL')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeMarket === 'LOCAL'
                ? 'bg-[#FFFFFF] text-[#2563EB] border border-[#E2E8F0]'
                : 'text-[#475569] hover:text-[#0F172A] border border-transparent'
            }`}
          >
            Local Market
          </button>
          <button
            type="button"
            aria-pressed={activeMarket === 'GLOBAL'}
            onClick={() => onSelectMarket('GLOBAL')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeMarket === 'GLOBAL'
                ? 'bg-[#FFFFFF] text-[#2563EB] border border-[#E2E8F0]'
                : 'text-[#475569] hover:text-[#0F172A] border border-transparent'
            }`}
          >
            Global Market
          </button>
        </div>

        {/* Right: 3 plain-English tabs + API Settings button */}
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Workspace navigation" className="flex flex-wrap items-center gap-1.5">
            {WORKSPACE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTab(tab.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#2563EB] text-[#FFFFFF]'
                      : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KeyRound
              className={`h-3.5 w-3.5 ${hasHfToken ? 'text-[#10B981]' : 'text-[#475569]'}`}
            />
            <span>API Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
