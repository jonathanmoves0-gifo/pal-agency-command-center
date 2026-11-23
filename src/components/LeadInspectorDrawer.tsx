import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from 'lucide-react';
import type { LeadRecord, LeadStatus, OutcomeRewardType } from '../shared/types';
import { copyTextWithFallback } from '../utils/clipboard';
import { getOutreachMessagesForLead } from '../utils/contactFormatters';
import { getPlainEnglishStatus } from '../utils/pitchPresenter';
import { buildLeadProofAsset } from '../utils/proofBuilder';

interface LeadInspectorDrawerProps {
  lead: LeadRecord | null;
  onClose: () => void;
  onOpenProofDemo: (lead: LeadRecord) => void;
  onToggleMarkedSent: (leadId: string) => void;
  onOutcomeChange: (leadId: string, outcome: Exclude<OutcomeRewardType, null>) => void;
  onOpenWebsiteBuilder: (lead: LeadRecord) => void;
  onOpenAgenticBlueprint: (lead: LeadRecord) => void;
}

function drawerStatusBadge(status: LeadStatus): string {
  switch (status) {
    case 'APPROVED_FOR_OUTREACH':
      return 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]';
    case 'NEEDS_REVIEW':
      return 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]';
    case 'PASS':
      return 'border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]';
  }
}

export function LeadInspectorDrawer({
  lead,
  onClose,
  onOpenProofDemo,
  onToggleMarkedSent,
  onOutcomeChange,
  onOpenWebsiteBuilder,
  onOpenAgenticBlueprint,
}: LeadInspectorDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [proposalTab, setProposalTab] = useState<'email' | 'whatsapp'>('email');

  if (!lead) return null;

  const statusInfo = getPlainEnglishStatus(lead.status);
  const proof = lead.proof_asset || buildLeadProofAsset(lead);
  const primaryEmail = lead.contact_emails?.[0] ?? '';
  const primaryPhone = lead.whatsapp_numbers?.[0] || lead.contact_phones?.[0] || '';
  const hasRealWebsite = Boolean(lead.domain && !lead.domain.endsWith('.placeholder.local'));
  const websiteHref = hasRealWebsite
    ? /^https?:\/\//i.test(lead.domain)
      ? lead.domain
      : `https://${lead.domain}`
    : '';
  const outreachMessages = getOutreachMessagesForLead(lead);
  const isMarkedSent = Boolean(lead.outreach_activity?.marked_sent_at);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyTextWithFallback(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  const scoreBars: Array<{ key: keyof typeof lead.sub_scores; label: string }> = [
    { key: 'pain_signal', label: 'Urgent Business Need' },
    { key: 'niche_fit', label: 'Ideal Industry Match' },
    { key: 'web_booking_gap', label: 'Website or Booking Opportunity' },
    { key: 'reachability', label: 'Easy to Contact' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ready-to-Send Proposal Kit for ${lead.business_name}`}
      className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/40"
    >
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#E2E8F0] bg-[#FFFFFF] flex flex-col">
        {/* Sticky Drawer Header */}
        <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#FFFFFF] px-6 py-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">{lead.business_name}</h3>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${drawerStatusBadge(
                    lead.status
                  )}`}
                >
                  {lead.total_score}/100 · {statusInfo.label}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleMarkedSent(lead.id)}
                  aria-pressed={isMarkedSent}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold cursor-pointer ${
                    isMarkedSent
                      ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:text-[#1D4ED8]'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isMarkedSent ? 'Sent' : 'Mark as Sent'}</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-[#475569]">
                {lead.niche} · {lead.market} · Recommended: {proof.pillar_label}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close proposal kit drawer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* One-Click Contact Copy Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {primaryEmail ? (
              <button
                type="button"
                onClick={() => handleCopy('pill-email', primaryEmail)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#0F172A] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] cursor-pointer"
              >
                {copiedKey === 'pill-email' ? (
                  <Check className="h-3.5 w-3.5 text-[#059669]" />
                ) : (
                  <Mail className="h-3.5 w-3.5 text-[#475569]" />
                )}
                <span>{copiedKey === 'pill-email' ? 'Copied Email' : primaryEmail}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs text-[#64748B]">
                <Mail className="h-3.5 w-3.5" />
                <span>No email on site</span>
              </span>
            )}

            {primaryPhone ? (
              <button
                type="button"
                onClick={() => handleCopy('pill-phone', primaryPhone)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#0F172A] hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#065F46] cursor-pointer tabular-nums"
              >
                {copiedKey === 'pill-phone' ? (
                  <Check className="h-3.5 w-3.5 text-[#059669]" />
                ) : (
                  <Phone className="h-3.5 w-3.5 text-[#059669]" />
                )}
                <span>{copiedKey === 'pill-phone' ? 'Copied Phone' : primaryPhone}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs text-[#64748B]">
                <Phone className="h-3.5 w-3.5" />
                <span>No phone on site</span>
              </span>
            )}

            {hasRealWebsite && (
              <div className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleCopy('pill-site', websiteHref)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1D4ED8] hover:bg-[#EFF6FF] cursor-pointer"
                >
                  {copiedKey === 'pill-site' ? (
                    <Check className="h-3.5 w-3.5 text-[#059669]" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedKey === 'pill-site' ? 'Copied URL' : lead.domain}</span>
                </button>
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${lead.business_name}`}
                  className="border-l border-[#E2E8F0] px-2 py-1 text-[#64748B] hover:bg-[#FFFFFF] hover:text-[#1D4ED8]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Auto-Built Custom Proof / Demo Card */}
          <section className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/60 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D4ED8]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Auto-Built Proof / Demo Asset ({proof.pillar_label})</span>
                </div>
                <h4 className="mt-1 text-sm font-bold text-[#0F172A]">{proof.title}</h4>
                <p className="mt-0.5 text-xs text-[#475569] leading-relaxed">{proof.summary}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenProofDemo(lead)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View Proof / Demo</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy('proof-summary', proof.proof_summary_text)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer"
              >
                {copiedKey === 'proof-summary' ? (
                  <Check className="h-3.5 w-3.5 text-[#059669]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[#475569]" />
                )}
                <span>
                  {copiedKey === 'proof-summary'
                    ? 'Copied Proof Summary'
                    : 'Copy Demo / Proof Summary'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  proof.website_preview ? onOpenWebsiteBuilder(lead) : onOpenAgenticBlueprint(lead)
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-medium text-[#1D4ED8] hover:bg-[#F8FAFC] cursor-pointer"
              >
                <span>
                  {proof.website_preview ? 'Edit in Website Builder' : 'Edit in AI Blueprints'}
                </span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </section>

          {/* Ready-to-Send Proposal Kit (2 Tabs) */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#0F172A]">
                Ready-to-Send Proposal Kit
              </h4>

              <div
                role="tablist"
                aria-label="Proposal Kit channels"
                className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={proposalTab === 'email'}
                  onClick={() => setProposalTab('email')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                    proposalTab === 'email'
                      ? 'bg-[#FFFFFF] text-[#1D4ED8] shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Full Email Proposal</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={proposalTab === 'whatsapp'}
                  onClick={() => setProposalTab('whatsapp')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                    proposalTab === 'whatsapp'
                      ? 'bg-[#FFFFFF] text-[#065F46] shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp Pitch</span>
                </button>
              </div>
            </div>

            {proposalTab === 'email' ? (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-[#64748B]">Subject Line</div>
                    <div className="mt-0.5 text-xs font-bold text-[#0F172A]">
                      {outreachMessages.subject}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy('copy-subject', outreachMessages.subject)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] cursor-pointer"
                    >
                      {copiedKey === 'copy-subject' ? (
                        <Check className="h-3.5 w-3.5 text-[#059669]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-[#475569]" />
                      )}
                      <span>{copiedKey === 'copy-subject' ? 'Copied' : 'Copy Subject'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy('copy-email-proposal', outreachMessages.formattedEmail)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer"
                    >
                      {copiedKey === 'copy-email-proposal' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {copiedKey === 'copy-email-proposal' ? 'Copied Proposal' : 'Copy Email Proposal'}
                      </span>
                    </button>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#0F172A] bg-[#FFFFFF] rounded-lg border border-[#E2E8F0] p-3.5">
                  {outreachMessages.body}
                </pre>
              </div>
            ) : (
              <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5]/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#065F46]">
                    Crisp 3–4 Sentence WhatsApp / Direct Message Pitch
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('copy-wa-pitch', outreachMessages.whatsappMessage)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#047857] cursor-pointer"
                  >
                    {copiedKey === 'copy-wa-pitch' ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {copiedKey === 'copy-wa-pitch' ? 'Copied WhatsApp Pitch' : 'Copy WhatsApp Pitch'}
                    </span>
                  </button>
                </div>

                <p className="rounded-lg border border-[#A7F3D0] bg-[#FFFFFF] p-3.5 text-xs leading-relaxed text-[#0F172A]">
                  {outreachMessages.whatsappMessage}
                </p>
              </div>
            )}

            {/* Quick Reward Memory Outcome Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
              <span className="text-xs font-semibold text-[#0F172A]">
                Log Response to Train Client Finder:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { outcome: 'POSITIVE_REPLY', label: '+10 Replied' },
                    { outcome: 'BOOKED_DEMO', label: '+25 Call Booked' },
                    { outcome: 'WRONG_FIT', label: '-15 Not Interested' },
                  ] as const
                ).map((item) => {
                  const active = lead.outcome === item.outcome;
                  return (
                    <button
                      key={item.outcome}
                      type="button"
                      onClick={() => onOutcomeChange(lead.id, item.outcome)}
                      aria-pressed={active}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                        active
                          ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                          : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3-Step Follow-up Sequence */}
            {lead.outreach_pack && lead.outreach_pack.follow_up_sequence.length > 0 && (
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
                <span className="text-xs font-semibold text-[#0F172A]">
                  Optional Follow-Up Nudges
                </span>
                <div className="space-y-2">
                  {lead.outreach_pack.follow_up_sequence.map((step) => (
                    <div
                      key={step.step}
                      className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#0F172A] tabular-nums">
                          Follow-Up {step.step} · Day +{step.day_offset} · {step.angle}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`step-${step.step}`, step.message)}
                          className="font-semibold text-[#1D4ED8] hover:text-[#1E40AF] cursor-pointer"
                        >
                          {copiedKey === `step-${step.step}` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-[#475569] leading-relaxed">{step.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Live Website Audit & Gap Analysis */}
          <section className="space-y-3 border-t border-[#E2E8F0] pt-5">
            <h4 className="text-xs font-semibold text-[#0F172A]">
              Live Website Audit &amp; Gap Analysis
            </h4>
            {lead.address && (
              <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                <MapPin className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                <span>{lead.address}</span>
              </div>
            )}
            <p className="text-xs text-[#0F172A] leading-relaxed">{lead.bottleneck_diagnosis}</p>

            {lead.website_audit && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-[11px] sm:grid-cols-3">
                <div>
                  <span className="text-[#64748B]">Site Status: </span>
                  <span className={lead.website_audit.reachable ? 'font-semibold text-[#065F46]' : 'font-semibold text-[#92400E]'}>
                    {lead.website_audit.reachable ? 'Live' : 'Unreachable'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">HTTPS SSL: </span>
                  <span className={lead.website_audit.has_ssl ? 'font-semibold text-[#065F46]' : 'font-semibold text-[#92400E]'}>
                    {lead.website_audit.has_ssl ? 'Active' : 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Mobile Tag: </span>
                  <span className={lead.website_audit.has_mobile_viewport ? 'font-semibold text-[#065F46]' : 'font-semibold text-[#92400E]'}>
                    {lead.website_audit.has_mobile_viewport ? 'Present' : 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Booking Tool: </span>
                  <span className={lead.website_audit.has_booking_tool ? 'font-semibold text-[#065F46]' : 'font-semibold text-[#92400E]'}>
                    {lead.website_audit.has_booking_tool
                      ? lead.website_audit.booking_tools_found[0] || 'Detected'
                      : 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Live Chat: </span>
                  <span className={lead.website_audit.has_live_chat ? 'font-semibold text-[#065F46]' : 'font-semibold text-[#92400E]'}>
                    {lead.website_audit.has_live_chat
                      ? lead.website_audit.chat_tools_found[0] || 'Detected'
                      : 'None Found'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">CTAs Found: </span>
                  <span className="font-semibold text-[#0F172A] tabular-nums">
                    {lead.website_audit.cta_count}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4">
                <div className="text-xs font-semibold text-[#92400E] mb-2">
                  Where Leads Are Slipping Away
                </div>
                <ul className="space-y-1.5 text-xs text-[#78350F] list-disc pl-4 leading-relaxed">
                  {lead.missed_capture_leaks.map((leak, idx) => (
                    <li key={idx}>{leak}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-4">
                <div className="text-xs font-semibold text-[#065F46] mb-2">
                  Recommended Agency Solutions
                </div>
                <ul className="space-y-1.5 text-xs text-[#065F46] list-disc pl-4 leading-relaxed">
                  {lead.ai_web_opportunities.map((opp, idx) => (
                    <li key={idx}>{opp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Plain-English Score Breakdown */}
          <section className="space-y-3 border-t border-[#E2E8F0] pt-5">
            <h4 className="text-xs font-semibold text-[#0F172A]">
              Business Fit Breakdown (0–25 Each)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scoreBars.map((item) => {
                const val = lead.sub_scores[item.key];
                const pct = Math.round((val / 25) * 100);
                return (
                  <div key={item.key} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#475569]">{item.label}</span>
                      <span className="font-bold text-[#0F172A] tabular-nums">
                        {val}/25
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-[#1D4ED8]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs text-[#475569] leading-relaxed">
              <span className="font-semibold text-[#0F172A] mr-1.5">Why this score:</span>
              {lead.gatekeeper_reason}
            </p>
          </section>

          {/* Grounding Sources */}
          {lead.grounding_sources.length > 0 && (
            <section className="space-y-2 border-t border-[#E2E8F0] pt-4 text-xs">
              <div className="font-semibold text-[#0F172A]">Websites &amp; Sources Checked</div>
              <div className="flex flex-wrap gap-2">
                {lead.grounding_sources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs text-[#1D4ED8] hover:bg-[#EFF6FF]"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
