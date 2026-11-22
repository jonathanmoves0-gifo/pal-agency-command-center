import { useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { WEBSITE_TEMPLATES, type IndustryTemplate } from '../utils/pitchPresenter';

interface WebsiteTemplatesViewProps {
  onUseTemplateForClient: (template: IndustryTemplate) => void;
}

export function WebsiteTemplatesView({ onUseTemplateForClient }: WebsiteTemplatesViewProps) {
  const [previewTemplate, setPreviewTemplate] = useState<IndustryTemplate | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-5">
        <h1 className="text-base font-bold text-[#0F172A]">Website Templates</h1>
        <p className="mt-1 text-sm text-[#475569]">
          Pick a ready-made industry layout to preview with a client or use directly in your next pitch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {WEBSITE_TEMPLATES.map((template) => (
          <article
            key={template.id}
            className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-[#0F172A]">{template.name}</h2>
                <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#475569]">
                  {template.recommendedService}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#475569]">{template.tagline}</p>

              <ul className="space-y-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#0F172A]">
                {template.previewSections.map((sec) => (
                  <li key={sec} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                    <span>{sec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Eye className="h-3.5 w-3.5 text-[#475569]" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => onUseTemplateForClient(template)}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap"
              >
                Use for Client
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${previewTemplate.name} template preview`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
        >
          <div className="w-full max-w-xl rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <div>
                <span className="text-xs font-semibold text-[#2563EB]">Template Preview</span>
                <h3 className="text-base font-bold text-[#0F172A]">{previewTemplate.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close template preview"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 bg-[#F8FAFC]">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 text-center space-y-3">
                <h4 className="text-lg font-bold text-[#0F172A]">
                  {previewTemplate.previewHeadline}
                </h4>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {previewTemplate.previewSubheadline}
                </p>
                <div className="pt-1">
                  <span className="inline-block rounded-lg bg-[#2563EB] px-5 py-2.5 text-xs font-semibold text-white">
                    {previewTemplate.previewCta}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {previewTemplate.previewSections.map((sec) => (
                  <div
                    key={sec}
                    className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3 text-xs font-medium text-[#0F172A]"
                  >
                    {sec}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] bg-[#FFFFFF] px-6 py-4">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = previewTemplate;
                  setPreviewTemplate(null);
                  onUseTemplateForClient(chosen);
                }}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8] cursor-pointer"
              >
                Use for Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
