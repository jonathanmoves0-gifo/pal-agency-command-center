import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Trash2, X } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  savedToken: string;
  onSaveToken: (token: string) => void;
  onClose: () => void;
}

export function ApiSettingsModal({
  isOpen,
  savedToken,
  onSaveToken,
  onClose,
}: ApiSettingsModalProps) {
  const [tokenInput, setTokenInput] = useState(savedToken);
  const [showToken, setShowToken] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTokenInput(savedToken);
      setSavedNotice(false);
    }
  }, [isOpen, savedToken]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput.trim());
    setSavedNotice(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleClear = () => {
    setTokenInput('');
    onSaveToken('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="API Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F172A]">API Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close API Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="hf-token-input" className="block text-xs font-semibold text-[#475569]">
              Hugging Face Access Token
            </label>
            <div className="relative">
              <input
                id="hf-token-input"
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="hf_..."
                autoComplete="off"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] pl-3.5 pr-10 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#475569]">
              Saved locally in your browser only. Used by AI Video &amp; Content to generate playable MP4 clips through Hugging Face Inference Providers.
            </p>
          </div>

          {savedNotice && (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#047857]">
              <Check className="h-3.5 w-3.5" />
              <span>Hugging Face token saved.</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {savedToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Token</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8] cursor-pointer"
              >
                Save Token
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
