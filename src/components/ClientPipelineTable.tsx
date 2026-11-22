import { useRef, useState } from 'react';
import { Download, Eye, Search, Trash2, Upload } from 'lucide-react';
import type { LeadRecord, LeadStatus, Market, OutcomeRewardType } from '../shared/types';
import { OUTCOME_REWARDS } from '../utils/pipelineLogic';

interface ClientPipelineTableProps {
  leads: LeadRecord[];
  approvedSinceLastBackup: number;
  onSelectLead: (lead: LeadRecord) => void;
  onOutcomeChange: (leadId: string, outcome: Exclude<OutcomeRewardType, null>) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (rawText: string) => void;
  onClearAll: () => void;
  onLoadSamples: () => void;
}

const STATUS_FILTERS: Array<{ value: 'ALL' | LeadStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'APPROVED_FOR_OUTREACH', label: 'Approved (75+)' },
  { value: 'NEEDS_REVIEW', label: 'Review (50–74)' },
  { value: 'PASS', label: 'Pass (<50)' },
];

function statusBadgeClasses(status: LeadStatus): string {
  switch (status) {
    case 'APPROVED_FOR_OUTREACH':
      return 'border-[#22C55E]/60 bg-[#22C55E]/10 text-[#22C55E]';
    case 'NEEDS_REVIEW':
      return 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#F59E0B]';
    case 'PASS':
      return 'border-[#343B48] bg-[#161A20] text-[#8B949E]';
  }
}

export function ClientPipelineTable({
  leads,
  approvedSinceLastBackup,
  onSelectLead,
  onOutcomeChange,
  onExportCsv,
  onExportJson,
  onImportJson,
  onClearAll,
  onLoadSamples,
}: ClientPipelineTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [marketFilter, setMarketFilter] = useState<'ALL' | Market>('ALL');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLeads = leads.filter((lead) => {
    if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;
    if (marketFilter !== 'ALL' && lead.market !== marketFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const hay = `${lead.business_name} ${lead.domain} ${lead.niche} ${lead.gatekeeper_reason}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const approvedTotal = leads.filter((l) => l.status === 'APPROVED_FOR_OUTREACH').length;
  const remainingForBackup = Math.max(1, 5 - (approvedSinceLastBackup % 5));

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      onImportJson(text);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <section
      aria-label="Client Pipeline"
      className="border border-[#242830] bg-[#12151A] flex flex-col"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242830] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-[#ECEFF4]">Client Pipeline</h2>
          <span className="text-[#525A66]" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-xs text-[#8B949E]">
            {leads.length} TOTAL · {approvedTotal} APPROVED
          </span>
          <span className="text-[#525A66]" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[11px] text-[#8B949E]">
            AUTO-BACKUP IN {remainingForBackup} APPROVED
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 border border-[#242830] bg-[#0D0F12] px-3 py-1.5 text-xs font-medium text-[#C9D1D9] hover:border-[#3A414E] hover:text-[#ECEFF4] disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJson}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 border border-[#242830] bg-[#0D0F12] px-3 py-1.5 text-xs font-medium text-[#C9D1D9] hover:border-[#3A414E] hover:text-[#ECEFF4] disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
            aria-label="Import JSON pipeline backup file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-[#242830] bg-[#0D0F12] px-3 py-1.5 text-xs font-medium text-[#C9D1D9] hover:border-[#3A414E] hover:text-[#ECEFF4] cursor-pointer whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import JSON</span>
          </button>

          {leads.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              aria-label="Clear all pipeline leads"
              className="flex items-center gap-1.5 border border-[#242830] bg-[#0D0F12] px-2.5 py-1.5 text-xs font-medium text-[#8B949E] hover:border-[#EF4444]/60 hover:text-[#FCA5A5] cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242830] bg-[#0F1216] px-4 py-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E7681]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by business, domain, niche, or reason..."
            aria-label="Search client pipeline"
            className="w-full border border-[#242830] bg-[#0D0F12] pl-8 pr-3 py-1.5 text-xs text-[#ECEFF4] placeholder-[#525A66] focus:border-[#22C55E] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-[#242830] bg-[#0D0F12]">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2.5 py-1.5 text-xs font-medium border-r last:border-r-0 border-[#242830] whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#1D222B] text-[#ECEFF4]'
                      : 'text-[#8B949E] hover:text-[#ECEFF4]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center border border-[#242830] bg-[#0D0F12]">
            {(['ALL', 'UK', 'US'] as const).map((mkt) => {
              const active = marketFilter === mkt;
              return (
                <button
                  key={mkt}
                  type="button"
                  onClick={() => setMarketFilter(mkt)}
                  className={`px-2.5 py-1.5 font-mono text-[11px] border-r last:border-r-0 border-[#242830] whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#1D222B] text-[#ECEFF4]'
                      : 'text-[#8B949E] hover:text-[#ECEFF4]'
                  }`}
                >
                  {mkt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {importError && (
        <div
          role="alert"
          className="border-b border-[#EF4444]/50 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#FCA5A5]"
        >
          {importError}
        </div>
      )}

      {/* Table or Empty State */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#ECEFF4]">No leads in Client Pipeline</p>
          <p className="mt-1 max-w-md text-xs text-[#8B949E]">
            Run Autonomous Niche Scout, Single Prospect, or Batch Queue above to research and score prospects, or load the calibration sample set.
          </p>
          <button
            type="button"
            onClick={onLoadSamples}
            className="mt-4 border border-[#242830] bg-[#0D0F12] px-4 py-2 text-xs font-medium text-[#ECEFF4] hover:border-[#3A414E] cursor-pointer"
          >
            Load Calibration Samples
          </button>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="px-6 py-10 text-center text-xs text-[#8B949E]">
          No leads match your current filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#242830] bg-[#0F1216] font-mono text-[11px] text-[#8B949E] whitespace-nowrap">
                <th className="px-4 py-2.5 font-medium">BUSINESS / DOMAIN</th>
                <th className="px-3 py-2.5 font-medium">NICHE · MKT</th>
                <th className="px-3 py-2.5 font-medium text-right">P / N / W / R</th>
                <th className="px-3 py-2.5 font-medium text-right">SCORE</th>
                <th className="px-3 py-2.5 font-medium">STATUS</th>
                <th className="px-3 py-2.5 font-medium">GATEKEEPER REASON</th>
                <th className="px-3 py-2.5 font-medium">OUTCOME REWARD</th>
                <th className="px-4 py-2.5 font-medium text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242830]">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  data-testid={`pipeline-row-${lead.id}`}
                  className="hover:bg-[#161A20] transition-colors"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-[#ECEFF4]">{lead.business_name}</div>
                    <div className="font-mono text-[11px] text-[#8B949E] mt-0.5">{lead.domain}</div>
                  </td>

                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <span className="text-[#C9D1D9]">{lead.niche}</span>
                    <span className="text-[#525A66] mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-[11px] text-[#8B949E]">{lead.market}</span>
                  </td>

                  <td className="px-3 py-3 align-top text-right font-mono text-[11px] text-[#C9D1D9] whitespace-nowrap">
                    {lead.sub_scores.pain_signal}/{lead.sub_scores.niche_fit}/
                    {lead.sub_scores.web_booking_gap}/{lead.sub_scores.reachability}
                  </td>

                  <td className="px-3 py-3 align-top text-right font-mono text-sm font-semibold text-[#ECEFF4] whitespace-nowrap">
                    {lead.total_score}
                  </td>

                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <span
                      className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-medium ${statusBadgeClasses(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </td>

                  <td className="px-3 py-3 align-top max-w-xs text-[#C9D1D9] leading-relaxed">
                    {lead.gatekeeper_reason}
                  </td>

                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <select
                      aria-label={`Outcome reward for ${lead.business_name}`}
                      value={lead.outcome ?? ''}
                      onChange={(e) => {
                        const val = e.target.value as Exclude<OutcomeRewardType, null> | '';
                        if (val) {
                          onOutcomeChange(lead.id, val);
                        }
                      }}
                      className="border border-[#242830] bg-[#0D0F12] px-2 py-1 font-mono text-[11px] text-[#ECEFF4] focus:border-[#22C55E] focus:outline-none cursor-pointer"
                    >
                      <option value="">Set Outcome...</option>
                      {Object.entries(OUTCOME_REWARDS).map(([key, cfg]) => (
                        <option key={key} value={key}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      aria-label={`Inspect ${lead.business_name}`}
                      className="inline-flex items-center gap-1.5 border border-[#242830] bg-[#0D0F12] px-2.5 py-1 text-xs font-medium text-[#ECEFF4] hover:border-[#3A414E] cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#8B949E]" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
