import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Mail,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import { copyTextWithFallback } from '../utils/clipboard';
import {
  buildWhatsAppUrl,
  getOutreachMessagesForLead,
} from '../utils/contactFormatters';
import { buildLeadProofAsset } from '../utils/proofBuilder';

interface OutreachReadyPanelProps {
  lead: LeadRecord | null;
  onClose: () => void;
  onOpenProofDemo: (lead: LeadRecord) => void;
  onToggleMarkedSent: (leadId: string) => void;
}

type OutreachTab = 'whatsapp' | 'email' | 'proof';

export function OutreachReadyPanel({
  lead,
  onClose,
  onOpenProofDemo,
  onToggleMarkedSent,
}: OutreachReadyPanelProps) {
  const [activeTab, setActiveTab] = useState<OutreachTab>('whatsapp');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!lead) return null;

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyTextWithFallback(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  const proof = lead.proof_asset || buildLeadProofAsset(lead);
  const outreach = getOutreachMessagesForLead(lead);
  const primaryPhone = lead.whatsapp_numbers?.[0] || lead.contact_phones?.[0] || '';
  const primaryEmail = lead.contact_emails?.[0] || '';
  const whatsappUrl = buildWhatsAppUrl(
    primaryPhone,
    outreach.whatsappMessage,
    lead.market,
    lead.address || lead.discovery_notes
  );
  const isMarkedSent = Boolean(lead.outreach_activity?.marked_sent_at);

  const decisionMakerLine = lead.decision_maker_name
    ? `${lead.decision_maker_name}${lead.decision_maker_role ? ` · ${lead.decision_maker_role}` : ''}`
    : 'Verified decision maker';

  return (
    <aside
      aria-label={`Focused outreach panel for ${lead.business_name}`}
      data-testid="outreach-ready-panel"
      className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] flex flex-col"
    >
      {/* Header + Contact Details */}
      <div className="border-b border-[#E2E8F0] p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg font-bold text-[#0F172A] truncate">
              {lead.business_name}
            </h2>
            <p className="text-sm text-[#64748B] truncate">{decisionMakerLine}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close outreach panel"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contact Details: 1-Click Copy WhatsApp Number + 1-Click Copy Email */}
        <div className="flex flex-wrap items-center gap-2.5">
          {primaryPhone && (
            <button
              type="button"
              onClick={() => handleCopy(`wa-num-${lead.id}`, primaryPhone)}
              aria-label={`Copy WhatsApp Number ${primaryPhone}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer tabular-nums"
            >
              {copiedKey === `wa-num-${lead.id}` ? (
                <Check className="h-3.5 w-3.5 text-[#0F172A] shrink-0" />
              ) : (
                <Phone className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
              )}
              <span>
                {copiedKey === `wa-num-${lead.id}`
                  ? 'Copied Number'
                  : `Copy WhatsApp · ${primaryPhone}`}
              </span>
            </button>
          )}

          {primaryEmail && (
            <button
              type="button"
              onClick={() => handleCopy(`email-addr-${lead.id}`, primaryEmail)}
              aria-label={`Copy Email ${primaryEmail}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer max-w-full"
            >
              {copiedKey === `email-addr-${lead.id}` ? (
                <Check className="h-3.5 w-3.5 text-[#0F172A] shrink-0" />
              ) : (
                <Mail className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
              )}
              <span className="truncate">
                {copiedKey === `email-addr-${lead.id}`
                  ? 'Copied Email'
                  : `Copy Email · ${primaryEmail}`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Clean Tabs */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-2.5">
        <div
          role="tablist"
          aria-label="Outreach assets"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'whatsapp'}
            onClick={() => setActiveTab('whatsapp')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]'
                : 'border border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            WhatsApp Message
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'email'}
            onClick={() => setActiveTab('email')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === 'email'
                ? 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]'
                : 'border border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Email Proposal
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'proof'}
            onClick={() => setActiveTab('proof')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === 'proof'
                ? 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0]'
                : 'border border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Proof / Demo
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-5 space-y-4 flex-1">
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm leading-relaxed text-[#0F172A]">
              {outreach.whatsappMessage}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleCopy(`wa-pitch-${lead.id}`, outreach.whatsappMessage)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                {copiedKey === `wa-pitch-${lead.id}` ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[#64748B]" />
                )}
                <span>
                  {copiedKey === `wa-pitch-${lead.id}`
                    ? 'Copied WhatsApp Pitch'
                    : 'Copy WhatsApp Pitch'}
                </span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] whitespace-nowrap"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#64748B]" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="h-3 w-3 text-[#64748B]" />
              </a>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
              <div className="border-b border-[#E2E8F0] pb-2.5">
                <div className="text-[11px] font-medium text-[#64748B]">Subject</div>
                <div className="mt-0.5 text-sm font-semibold text-[#0F172A]">
                  {outreach.subject}
                </div>
              </div>

              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#0F172A]">
                {outreach.body}
              </pre>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(`email-body-${lead.id}`, outreach.formattedEmail)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
            >
              {copiedKey === `email-body-${lead.id}` ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[#64748B]" />
              )}
              <span>
                {copiedKey === `email-body-${lead.id}`
                  ? 'Copied Email Proposal'
                  : 'Copy Email Proposal'}
              </span>
            </button>
          </div>
        )}

        {activeTab === 'proof' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
              <div className="text-xs font-medium text-[#64748B]">{proof.pillar_label}</div>
              <h3 className="text-sm font-semibold text-[#0F172A]">{proof.title}</h3>
              <p className="text-sm text-[#475569] leading-relaxed">{proof.summary}</p>
            </div>

            <button
              type="button"
              onClick={() => onOpenProofDemo(lead)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5 text-[#64748B]" />
              <span>View Live Demo</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action: Single Mark as Sent Button */}
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 rounded-b-xl">
        <button
          type="button"
          onClick={() => onToggleMarkedSent(lead.id)}
          aria-pressed={isMarkedSent}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold cursor-pointer ${
            isMarkedSent
              ? 'border-[#CBD5E1] bg-[#E2E8F0] text-[#0F172A]'
              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          {isMarkedSent && <Check className="h-4 w-4" />}
          <span>{isMarkedSent ? 'Marked as Sent' : 'Mark as Sent'}</span>
        </button>
      </div>
    </aside>
  );
}
