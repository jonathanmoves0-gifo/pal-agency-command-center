import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import type { IntakeMode, Market } from '../shared/types';
import { parseBatchLines } from '../utils/pipelineLogic';

interface IntakeConsoleProps {
  isRunning: boolean;
  existingCount: number;
  onRunScout: (niche: string, region: string) => void;
  onRunSingle: (payload: {
    business_name: string;
    domain: string;
    niche: string;
    market: Market;
    discovery_notes: string;
  }) => void;
  onRunBatch: (batchText: string) => void;
  onAbort: () => void;
}

const MODE_TABS: Array<{ id: IntakeMode; label: string }> = [
  { id: 'scout', label: 'Autonomous Niche Scout' },
  { id: 'single', label: 'Single Prospect' },
  { id: 'batch', label: 'Batch Queue' },
];

export function IntakeConsole({
  isRunning,
  existingCount,
  onRunScout,
  onRunSingle,
  onRunBatch,
  onAbort,
}: IntakeConsoleProps) {
  const [mode, setMode] = useState<IntakeMode>('scout');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Mode 1: Autonomous Niche Scout
  const [scoutNiche, setScoutNiche] = useState('Dental Clinics');
  const [scoutRegion, setScoutRegion] = useState('London, UK');

  // Mode 2: Single Prospect
  const [businessName, setBusinessName] = useState('');
  const [domain, setDomain] = useState('');
  const [singleNiche, setSingleNiche] = useState('');
  const [market, setMarket] = useState<Market>('UK');
  const [discoveryNotes, setDiscoveryNotes] = useState('');

  // Mode 3: Batch Queue
  const [batchText, setBatchText] = useState(
    'Harley Dental Group | harleydentalgroup.co.uk | Dental Clinics | UK\nAustin Ortho Studio | austinorthostudio.com | Orthodontics | US'
  );

  const batchPreview = parseBatchLines(batchText);
  const nonEmptyLines = batchText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (mode === 'scout') {
      if (!scoutNiche.trim() || !scoutRegion.trim()) {
        setValidationError('Enter both an Industry Niche and Target City/Region.');
        return;
      }
      onRunScout(scoutNiche.trim(), scoutRegion.trim());
      return;
    }

    if (mode === 'single') {
      if (!businessName.trim() || !domain.trim() || !singleNiche.trim()) {
        setValidationError('Business Name, Website/Domain, and Niche are required.');
        return;
      }
      onRunSingle({
        business_name: businessName.trim(),
        domain: domain.trim(),
        niche: singleNiche.trim(),
        market,
        discovery_notes: discoveryNotes.trim(),
      });
      return;
    }

    if (batchPreview.errors.length > 0 || batchPreview.items.length === 0) {
      setValidationError(batchPreview.errors[0] || 'Enter valid batch lines.');
      return;
    }
    onRunBatch(batchText);
  };

  return (
    <section
      aria-label="Prospect intake console"
      className="border border-[#242830] bg-[#12151A] flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#242830] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[#ECEFF4]">Signal Intake</h2>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Select an intake vector to trigger the LangGraph pipeline
          </p>
        </div>
        <span className="font-mono text-[11px] text-[#8B949E] whitespace-nowrap shrink-0">
          DEDUP: {existingCount} CACHED
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-3 border-b border-[#242830] bg-[#0D0F12]">
        {MODE_TABS.map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setValidationError(null);
              }}
              className={`px-2 sm:px-3 py-2.5 text-xs font-medium text-center transition-colors border-r last:border-r-0 border-[#242830] whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#181C23] text-[#ECEFF4] border-b-2 border-b-[#22C55E]'
                  : 'text-[#8B949E] hover:text-[#ECEFF4]'
              }`}
            >
              {tab.id === 'scout' ? (
                <>
                  <span className="sm:hidden">Niche Scout</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </>
              ) : (
                tab.label
              )}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 flex-1">
        {mode === 'scout' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="scout-niche" className="text-xs font-medium text-[#C9D1D9]">
                Industry Niche
              </label>
              <input
                id="scout-niche"
                type="text"
                value={scoutNiche}
                onChange={(e) => setScoutNiche(e.target.value)}
                placeholder="e.g., Dental Clinics, MedSpas, HVAC"
                className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-sm text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="scout-region" className="text-xs font-medium text-[#C9D1D9]">
                Target City / Region
              </label>
              <input
                id="scout-region"
                type="text"
                value={scoutRegion}
                onChange={(e) => setScoutRegion(e.target.value)}
                placeholder="e.g., London, UK or Austin, TX"
                className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-sm text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <p className="border border-[#242830] bg-[#0D0F12] px-3 py-2 text-xs text-[#8B949E] leading-relaxed">
              Uses Google Search grounding in <span className="font-mono text-[#C9D1D9]">scout_node</span> to find 5 real businesses, skips any domain already in localStorage, and streams each lead through qualification.
            </p>
          </>
        )}

        {mode === 'single' && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="single-name" className="text-xs font-medium text-[#C9D1D9]">
                  Business Name
                </label>
                <input
                  id="single-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mayfair Smile Clinic"
                  className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-sm text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="single-domain" className="text-xs font-medium text-[#C9D1D9]">
                  Website / Domain
                </label>
                <input
                  id="single-domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="mayfairsmile.co.uk"
                  className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 font-mono text-xs text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="single-niche" className="text-xs font-medium text-[#C9D1D9]">
                  Niche
                </label>
                <input
                  id="single-niche"
                  type="text"
                  value={singleNiche}
                  onChange={(e) => setSingleNiche(e.target.value)}
                  placeholder="Cosmetic Dentistry"
                  className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-sm text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="single-market" className="text-xs font-medium text-[#C9D1D9]">
                  Market
                </label>
                <select
                  id="single-market"
                  value={market}
                  onChange={(e) => setMarket(e.target.value as Market)}
                  className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 font-mono text-xs text-[#ECEFF4] focus:border-[#22C55E] focus:outline-none"
                >
                  <option value="UK">UK</option>
                  <option value="US">US</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="single-notes" className="text-xs font-medium text-[#C9D1D9]">
                Discovery Notes
              </label>
              <textarea
                id="single-notes"
                rows={3}
                value={discoveryNotes}
                onChange={(e) => setDiscoveryNotes(e.target.value)}
                placeholder="Observed dead contact form, running Meta ads, no online slot booking..."
                className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-xs text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none resize-y"
              />
            </div>
          </>
        )}

        {mode === 'batch' && (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="batch-input" className="text-xs font-medium text-[#C9D1D9]">
                  Sequential Batch Lines (max 10)
                </label>
                <span className="font-mono text-[11px] text-[#8B949E]">
                  {nonEmptyLines}/10 LINES · 4s COOLDOWN
                </span>
              </div>
              <textarea
                id="batch-input"
                rows={6}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Business Name | Domain | Niche | Market"
                className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 font-mono text-xs leading-relaxed text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none resize-y"
              />
              <span className="text-[11px] text-[#8B949E]">
                Format: <span className="font-mono text-[#C9D1D9]">Business Name | Domain | Niche | US/UK</span>
              </span>
            </div>
          </>
        )}

        {validationError && (
          <div
            role="alert"
            className="border border-[#EF4444]/60 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#FCA5A5]"
          >
            {validationError}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          {!isRunning ? (
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 border border-[#22C55E] bg-[#22C55E] px-4 py-2 text-xs font-semibold text-[#0A0D0F] hover:bg-[#16A34A] hover:border-[#16A34A] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" />
              <span>
                {mode === 'scout'
                  ? 'Scout 5 Prospects'
                  : mode === 'single'
                    ? 'Run Signal Pipeline'
                    : `Run Batch (${batchPreview.items.length})`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onAbort}
              className="flex flex-1 items-center justify-center gap-2 border border-[#EF4444] bg-[#EF4444]/15 px-4 py-2 text-xs font-semibold text-[#FCA5A5] hover:bg-[#EF4444]/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Abort Active Run</span>
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
