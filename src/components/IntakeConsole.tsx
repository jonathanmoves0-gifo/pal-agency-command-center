import { useState } from 'react';
import { Search, Square } from 'lucide-react';

export interface LiveFilterStats {
  rawFoundCount: number;
  qualifiedCount: number;
  filteredOutCount: number;
  missingPhoneCount: number;
  missingDecisionMakerCount: number;
}

interface IntakeConsoleProps {
  isRunning: boolean;
  existingCount: number;
  liveStatusMessage: string | null;
  filterStats: LiveFilterStats | null;
  runError: string | null;
  onRunScout: (niche: string, region: string) => void;
  onAbort: () => void;
}

export function IntakeConsole({
  isRunning,
  existingCount,
  liveStatusMessage,
  filterStats,
  runError,
  onRunScout,
  onAbort,
}: IntakeConsoleProps) {
  const [niche, setNiche] = useState('Dental Clinics');
  const [city, setCity] = useState('Kampala, Uganda');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!niche.trim() || !city.trim()) {
      setValidationError('Enter both a niche and a city to find leads.');
      return;
    }

    onRunScout(niche.trim(), city.trim());
  };

  let statusLine = '';
  if (validationError) {
    statusLine = validationError;
  } else if (runError) {
    statusLine = runError;
  } else if (isRunning) {
    statusLine = liveStatusMessage || `Searching for ${niche.trim()} in ${city.trim()}...`;
  } else if (filterStats) {
    statusLine = `Found ${filterStats.qualifiedCount} qualified ${
      filterStats.qualifiedCount === 1 ? 'lead' : 'leads'
    }`;
  } else if (liveStatusMessage) {
    statusLine = liveStatusMessage;
  } else if (existingCount > 0) {
    statusLine = `Showing ${existingCount} qualified ${existingCount === 1 ? 'lead' : 'leads'}`;
  } else {
    statusLine = 'Enter a niche and city to find verified leads.';
  }

  return (
    <section
      aria-label="Find Leads"
      className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 space-y-3"
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end"
      >
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <label htmlFor="scout-niche" className="text-xs font-medium text-[#475569]">
            Niche
          </label>
          <input
            id="scout-niche"
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g., Dental Clinics, MedSpas, Law Firms"
            className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none"
          />
        </div>

        <div className="md:col-span-5 flex flex-col gap-1.5">
          <label htmlFor="scout-city" className="text-xs font-medium text-[#475569]">
            City
          </label>
          <input
            id="scout-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Kampala, Uganda or London, UK"
            className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          {!isRunning ? (
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span>Find Leads</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onAbort}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5 shrink-0" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </form>

      <p
        data-testid="search-status-line"
        role={validationError || runError ? 'alert' : 'status'}
        className={`text-xs ${
          validationError || runError ? 'font-medium text-[#991B1B]' : 'text-[#64748B]'
        }`}
      >
        {statusLine}
      </p>
    </section>
  );
}
