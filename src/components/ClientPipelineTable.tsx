import { useState } from 'react';
import { Check } from 'lucide-react';
import type { LeadRecord, OutreachDecision } from '../shared/types';
import { formatPlainEnglishProblem } from '../utils/contactFormatters';

interface ClientPipelineTableProps {
  leads: LeadRecord[];
  selectedLeadId: string | null;
  onSelectLead: (lead: LeadRecord) => void;
  onSetOutreachDecision: (leadId: string, decision: OutreachDecision) => void;
}

export function ClientPipelineTable({
  leads,
  selectedLeadId,
  onSelectLead,
  onSetOutreachDecision,
}: ClientPipelineTableProps) {
  const [showSkipped, setShowSkipped] = useState(false);

  const activeLeads = leads.filter((l) => l.outreach_decision !== 'skipped');
  const skippedLeads = leads.filter((l) => l.outreach_decision === 'skipped');
  const visibleLeads = showSkipped ? leads : activeLeads;

  return (
    <section aria-label="Lead Queue" className="space-y-4">
      <div className="flex items-center justify-between gap-4 px-1">
        <h2 className="text-sm font-semibold text-[#0F172A]">Lead Queue</h2>
        <span className="text-xs text-[#64748B] tabular-nums">
          {activeLeads.length} {activeLeads.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-12 text-center space-y-1.5">
          <p className="text-sm font-semibold text-[#0F172A]">No leads yet</p>
          <p className="text-xs text-[#64748B]">
            Enter a niche and city above and click Find Leads to start.
          </p>
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-10 text-center space-y-2">
          <p className="text-sm font-medium text-[#0F172A]">All leads reviewed</p>
          <button
            type="button"
            onClick={() => setShowSkipped(true)}
            className="text-xs font-medium text-[#1D4ED8] hover:underline cursor-pointer"
          >
            Show {skippedLeads.length} skipped {skippedLeads.length === 1 ? 'lead' : 'leads'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleLeads.map((lead) => {
            const isSelected = lead.id === selectedLeadId;
            const isApproved = lead.outreach_decision === 'approved_to_outreach';
            const isSkipped = lead.outreach_decision === 'skipped';
            const problemSentence = formatPlainEnglishProblem(lead);
            const decisionMakerLine = lead.decision_maker_name
              ? `${lead.decision_maker_name}${lead.decision_maker_role ? ` · ${lead.decision_maker_role}` : ''}`
              : 'Verified decision maker';

            return (
              <article
                key={lead.id}
                data-testid={`pipeline-row-${lead.id}`}
                onClick={() => onSelectLead(lead)}
                className={`rounded-xl border p-5 flex flex-col gap-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-[#94A3B8] bg-[#F8FAFC]'
                    : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#CBD5E1]'
                } ${isSkipped ? 'opacity-65' : ''}`}
              >
                {/* 1. Business Name + Decision Maker */}
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#0F172A] truncate">
                    {lead.business_name}
                  </h3>
                  <p className="text-sm text-[#64748B] truncate">{decisionMakerLine}</p>
                </div>

                {/* 2. One Single Plain-English Problem */}
                <p className="text-sm text-[#334155] leading-relaxed">{problemSentence}</p>

                {/* 3. Clear Decision Action */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs font-medium text-[#64748B]">Outreach this lead?</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSetOutreachDecision(lead.id, 'approved_to_outreach');
                        onSelectLead(lead);
                      }}
                      aria-pressed={isApproved}
                      aria-label={`Yes, outreach ${lead.business_name}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
                    >
                      {isApproved && <Check className="h-3.5 w-3.5 shrink-0" />}
                      <span>Yes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSetOutreachDecision(lead.id, isSkipped ? 'pending' : 'skipped')
                      }
                      aria-pressed={isSkipped}
                      aria-label={`Skip ${lead.business_name}`}
                      className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-xs font-medium cursor-pointer whitespace-nowrap ${
                        isSkipped
                          ? 'border-[#CBD5E1] bg-[#E2E8F0] text-[#0F172A]'
                          : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <span>{isSkipped ? 'Skipped' : 'Skip'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {skippedLeads.length > 0 && visibleLeads.length > 0 && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowSkipped((prev) => !prev)}
            className="text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
          >
            {showSkipped
              ? 'Hide skipped leads'
              : `${skippedLeads.length} skipped · Show`}
          </button>
        </div>
      )}
    </section>
  );
}
