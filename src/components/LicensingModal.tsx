import { useState } from 'react';
import { X, Check, ShieldCheck, Zap, Award, Key, Sparkles, Download, ArrowRight } from 'lucide-react';
import {
  getCurrentLicenseSync,
  activateLicenseKey,
  deactivateLicense,
  generateCommercialLicenseCertificate,
  SUBSCRIPTION_PLANS,
} from '@/services/licenseService';

interface LicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onLicenseChanged?: () => void;
}

export function LicensingModal({ isOpen, onClose, onShowToast, onLicenseChanged }: LicensingModalProps) {
  const [license, setLicense] = useState(getCurrentLicenseSync());
  const [inputKey, setInputKey] = useState('');
  const [email, setEmail] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [producerName, setProducerName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [showCertGenerator, setShowCertGenerator] = useState(false);
  const [generatedCert, setGeneratedCert] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivating(true);
    try {
      const res = await activateLicenseKey(inputKey, email);
      if (res.success) {
        const updated = getCurrentLicenseSync();
        setLicense(updated);
        onShowToast(res.message);
        if (onLicenseChanged) onLicenseChanged();
      } else {
        onShowToast(res.message);
      }
    } catch {
      onShowToast('Error verifying license key');
    } finally {
      setIsActivating(false);
    }
  };

  const handleQuickDemoKey = async (key: string) => {
    setInputKey(key);
    setIsActivating(true);
    try {
      const res = await activateLicenseKey(key, 'producer@audiocopilot.ai');
      if (res.success) {
        const updated = getCurrentLicenseSync();
        setLicense(updated);
        onShowToast(res.message);
        if (onLicenseChanged) onLicenseChanged();
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleResetToFree = async () => {
    await deactivateLicense();
    setLicense(getCurrentLicenseSync());
    onShowToast('License deactivated. Continuing in Free Mode.');
    if (onLicenseChanged) onLicenseChanged();
  };

  const handleGenerateCertificate = () => {
    const cert = generateCommercialLicenseCertificate(producerName || 'Licensed Producer', songTitle || 'Suno Production Track');
    setGeneratedCert(cert);
  };

  const handleDownloadCertFile = () => {
    if (!generatedCert) return;
    const blob = new Blob([generatedCert], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Commercial_License_${(songTitle || 'Track').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Commercial License Certificate downloaded!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl glass bg-ink-950/95 rounded-2xl border border-neon-cyan/40 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-400 hover:text-ink-100 p-1.5 rounded-lg hover:bg-ink-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-ink-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan shadow-glow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-ink-50 flex items-center gap-1.5">
                <span>AudioCopilot Pro Activation &amp; Licensing</span>
              </h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${license.tier === 'studio' ? 'border-neon-amber text-neon-amber bg-neon-amber/10' : license.tier === 'pro' ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' : 'border-ink-700 text-ink-400'}`}>
                {license.tier.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-ink-400">
              Validate your Lemon Squeezy / Gumroad license key or continue in Free Mode.
            </p>
          </div>
        </div>

        <div className="bg-ink-900/80 rounded-xl p-4 border border-ink-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-ink-400 font-bold block">Current Active Plan</span>
            <p className="text-sm font-bold text-ink-100 flex items-center gap-2">
              <span>{SUBSCRIPTION_PLANS.find(p => p.id === license.tier)?.name}</span>
              {license.licenseKey && <span className="text-xs font-mono text-neon-cyan">({license.licenseKey})</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCertGenerator(o => !o)}
              className="btn btn-ghost !py-1.5 !px-3 !text-xs border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Commercial License Cert</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost !py-1.5 !px-3 !text-xs border border-ink-700 text-ink-300 hover:text-ink-100 flex items-center gap-1.5"
            >
              <span>Continue in Free Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {license.tier !== 'free' && (
              <button
                type="button"
                onClick={handleResetToFree}
                className="btn btn-ghost !py-1.5 !px-3 !text-xs text-ink-400 hover:text-rose-400"
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
        {/* Certificate Generator Drawer */}
        {showCertGenerator && (
          <div className="bg-ink-900/90 rounded-xl p-4 border border-neon-cyan/50 space-y-3 animate-slideIn">
            <h4 className="text-xs font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4" /> Commercial License Certificate Generator
            </h4>
            <p className="text-[11px] text-ink-400">
              Generate an official royalty-free commercial usage agreement for beat sales &amp; releases.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-ink-300 block mb-1">Producer Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera Productions"
                  value={producerName}
                  onChange={e => setProducerName(e.target.value)}
                  className="w-full bg-ink-950 border border-ink-700 rounded-lg px-3 py-1.5 text-xs text-ink-100 focus:border-neon-cyan outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-300 block mb-1">Track Title</label>
                <input
                  type="text"
                  placeholder="e.g. Synthwave Dreams"
                  value={songTitle}
                  onChange={e => setSongTitle(e.target.value)}
                  className="w-full bg-ink-950 border border-ink-700 rounded-lg px-3 py-1.5 text-xs text-ink-100 focus:border-neon-cyan outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleGenerateCertificate}
                className="btn btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Certificate</span>
              </button>
            </div>

            {generatedCert && (
              <div className="space-y-2 pt-2 border-t border-ink-800">
                <textarea
                  readOnly
                  value={generatedCert}
                  className="w-full h-32 bg-ink-950 font-mono text-[10px] text-ink-200 p-3 rounded-lg border border-ink-800 resize-none outline-none"
                />
                <button
                  type="button"
                  onClick={handleDownloadCertFile}
                  className="btn bg-neon-cyan text-ink-950 font-bold !py-1.5 !px-3 !text-xs flex items-center justify-center gap-1.5 w-full rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download License Certificate (.TXT)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plan Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUBSCRIPTION_PLANS.map(plan => {
            const isCurrent = license.tier === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-xl p-4 border flex flex-col justify-between space-y-4 transition ${plan.color} ${isCurrent ? 'ring-2 ring-neon-cyan shadow-glow' : 'hover:border-ink-600'}`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest">{plan.badge}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-cyan text-ink-950 uppercase">
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-ink-50">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-extrabold text-ink-50">{plan.priceMonthly}</span>
                      <span className="text-[10px] text-ink-400">/ {plan.priceYearly}</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 pt-2 border-t border-ink-800/60">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[10px] text-ink-300">
                        <Check className="w-3 h-3 text-neon-cyan shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleQuickDemoKey(plan.id === 'pro' ? 'PRO-SUNO-2026-X99' : 'STUDIO-FL-888')}
                    className="btn btn-primary !py-1.5 !text-xs w-full flex items-center justify-center gap-1 shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Activate {plan.name}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* License Key Form */}
        <div className="bg-ink-900/80 rounded-xl p-4 border border-ink-800 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-neon-cyan" />
            <h4 className="text-xs font-bold text-ink-100 uppercase tracking-wider">Activate License Key</h4>
          </div>

          <form onSubmit={handleActivateKey} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Enter License Key (e.g. PRO-SUNO-2026-X99 or STUDIO-FL-888)"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              className="sm:col-span-8 bg-ink-950 border border-ink-700 rounded-lg px-3 py-1.5 text-xs text-ink-100 font-mono focus:border-neon-cyan outline-none"
            />
            <button
              type="submit"
              className="sm:col-span-4 btn btn-primary !py-1.5 !text-xs flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Validate Key</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-ink-400 pt-1 border-t border-ink-800/50 flex-wrap gap-2">
            <span>Demo Keys:</span>
            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={() => handleQuickDemoKey('PRO-SUNO-2026-X99')}
                className="px-2 py-0.5 rounded bg-ink-800 hover:bg-neon-cyan/20 text-neon-cyan border border-ink-700 hover:border-neon-cyan transition"
              >
                PRO-SUNO-2026-X99
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoKey('STUDIO-FL-888')}
                className="px-2 py-0.5 rounded bg-ink-800 hover:bg-neon-amber/20 text-neon-amber border border-ink-700 hover:border-neon-amber transition"
              >
                STUDIO-FL-888
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}