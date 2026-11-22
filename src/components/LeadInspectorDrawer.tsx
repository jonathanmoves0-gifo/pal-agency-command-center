import { useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import type { LeadRecord } from '../shared/types';

interface LeadInspectorDrawerProps {
  lead: LeadRecord | null;
  onClose: () => void;
}

export function LeadInspectorDrawer({ lead, onClose }: LeadInspectorDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!lead) return null;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const scoreBars: Array<{ key: keyof typeof lead.sub_scores; label: string }> = [
    { key: 'pain_signal', label: 'Pain Signal' },
    { key: 'niche_fit', label: 'Niche Fit' },
    { key: 'web_booking_gap', label: 'Web / Booking Gap' },
    { key: 'reachability', label: 'Reachability' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Lead inspector for ${lead.business_name}`}
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
    >
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#242830] bg-[#0D0F12] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#242830] bg-[#12151A] px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[#ECEFF4]">{lead.business_name}</h3>
              <span className="border border-[#242830] bg-[#0D0F12] px-2 py-0.5 font-mono text-[11px] text-[#ECEFF4]">
                {lead.total_score}/100 · {lead.status}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-[#8B949E]">
              {lead.domain} · {lead.niche} · {lead.market} · intake:{lead.intake_mode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lead inspector"
            className="flex h-8 w-8 items-center justify-center border border-[#242830] bg-[#0D0F12] text-[#8B949E] hover:text-[#ECEFF4] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sub-scores */}
          <section className="space-y-3">
            <h4 className="font-mono text-xs font-medium text-[#8B949E]">
              QUALIFIER SUB-SCORES (0–25 EACH)
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {scoreBars.map((item) => {
                const val = lead.sub_scores[item.key];
                const pct = Math.round((val / 25) * 100);
                return (
                  <div key={item.key} className="border border-[#242830] bg-[#12151A] p-3">
                    <div className="text-[11px] text-[#8B949E]">{item.label}</div>
                    <div className="mt-1 font-mono text-base font-semibold text-[#ECEFF4]">
                      {val}
                      <span className="text-xs text-[#6E7681]">/25</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-[#242830]">
                      <div className="h-full bg-[#22C55E]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="border border-[#242830] bg-[#12151A] px-3 py-2 text-xs text-[#C9D1D9]">
              <span className="font-mono text-[#8B949E] mr-2">GATEKEEPER:</span>
              {lead.gatekeeper_reason}
            </p>
          </section>

          {/* Diagnosis & Leaks */}
          <section className="space-y-3 border-t border-[#242830] pt-5">
            <h4 className="font-mono text-xs font-medium text-[#8B949E]">
              PLANNER BOTTLENECK DIAGNOSIS
            </h4>
            <p className="text-sm text-[#ECEFF4] leading-relaxed">{lead.bottleneck_diagnosis}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="border border-[#242830] bg-[#12151A] p-3.5">
                <div className="font-mono text-[11px] text-[#F59E0B] mb-2">
                  MISSED BOOKING / CAPTURE LEAKS
                </div>
                <ul className="space-y-1.5 text-xs text-[#C9D1D9] list-disc pl-4">
                  {lead.missed_capture_leaks.map((leak, idx) => (
                    <li key={idx}>{leak}</li>
                  ))}
                </ul>
              </div>

              <div className="border border-[#242830] bg-[#12151A] p-3.5">
                <div className="font-mono text-[11px] text-[#22C55E] mb-2">
                  HIGH-ROI AI / WEB OPPORTUNITIES
                </div>
                <ul className="space-y-1.5 text-xs text-[#C9D1D9] list-disc pl-4">
                  {lead.ai_web_opportunities.map((opp, idx) => (
                    <li key={idx}>{opp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Outreach Pack */}
          <section className="space-y-4 border-t border-[#242830] pt-5">
            <h4 className="font-mono text-xs font-medium text-[#8B949E]">
              OUTREACH ARCHITECT DELIVERABLES
            </h4>
            {!lead.outreach_pack ? (
              <div className="border border-[#242830] bg-[#12151A] p-4 text-xs text-[#8B949E]">
                Outreach generation is gated exclusively to <span className="font-mono text-[#ECEFF4]">APPROVED_FOR_OUTREACH</span> leads scoring 75–100.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cold Email */}
                <div className="border border-[#242830] bg-[#12151A] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-[#22C55E]">COLD EMAIL</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          'email',
                          `Subject: ${lead.outreach_pack!.cold_email.subject}\n\n${lead.outreach_pack!.cold_email.body}`
                        )
                      }
                      className="flex items-center gap-1 border border-[#242830] bg-[#0D0F12] px-2 py-1 text-[11px] text-[#C9D1D9] hover:text-[#ECEFF4] cursor-pointer"
                    >
                      {copiedKey === 'email' ? (
                        <Check className="h-3 w-3 text-[#22C55E]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-[#ECEFF4]">
                    Subject: {lead.outreach_pack.cold_email.subject}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#C9D1D9]">
                    {lead.outreach_pack.cold_email.body}
                  </pre>
                </div>

                {/* Social DM */}
                <div className="border border-[#242830] bg-[#12151A] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-[#38BDF8]">
                      LINKEDIN / INSTAGRAM DM
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText('dm', lead.outreach_pack!.social_dm)}
                      className="flex items-center gap-1 border border-[#242830] bg-[#0D0F12] px-2 py-1 text-[11px] text-[#C9D1D9] hover:text-[#ECEFF4] cursor-pointer"
                    >
                      {copiedKey === 'dm' ? (
                        <Check className="h-3 w-3 text-[#22C55E]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedKey === 'dm' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed text-[#C9D1D9]">
                    {lead.outreach_pack.social_dm}
                  </p>
                </div>

                {/* 3-Step Follow-up Sequence */}
                <div className="border border-[#242830] bg-[#12151A] p-4 space-y-3">
                  <span className="font-mono text-[11px] text-[#8B949E]">
                    3-STEP FOLLOW-UP SEQUENCE
                  </span>
                  <div className="space-y-2.5">
                    {lead.outreach_pack.follow_up_sequence.map((step) => (
                      <div
                        key={step.step}
                        className="border border-[#242830] bg-[#0D0F12] p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                          <span className="text-[#ECEFF4]">
                            STEP {step.step} · DAY +{step.day_offset} · {step.angle}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(`step-${step.step}`, step.message)}
                            className="text-[#8B949E] hover:text-[#ECEFF4] cursor-pointer"
                          >
                            {copiedKey === `step-${step.step}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs text-[#C9D1D9] leading-relaxed">{step.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Grounding & Model Trace */}
          <section className="space-y-2 border-t border-[#242830] pt-4 text-xs">
            {lead.grounding_sources.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] text-[#8B949E]">GROUNDING SOURCES</div>
                <div className="flex flex-wrap gap-2">
                  {lead.grounding_sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 border border-[#242830] bg-[#12151A] px-2.5 py-1 text-xs text-[#C9D1D9] hover:text-[#ECEFF4]"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="font-mono text-[11px] text-[#6E7681]">
              MODEL TRACE: {lead.model_trace.join(' -> ')}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
