import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, AlertTriangle, History, ChevronDown } from 'lucide-react';
import { adminAgreementApi, AgreementVersionResponse, AgreementType } from '../../api/agreementApi';

export default function AdminAgreementPanel() {
  const { t } = useTranslation(['admin']);
  const [type, setType] = useState<AgreementType>('DEVELOPER_ONBOARDING');
  const [versions, setVersions] = useState<AgreementVersionResponse[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const load = async (currentType = type) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAgreementApi.listVersions(currentType);
      if (res.success && res.data) {
        setVersions(res.data);
        const active = res.data.find((v) => v.isActive);
        setContent(active?.content || '');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('agreementPanel.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(type); }, [type]);

  const handleSave = async () => {
    if (!content.trim()) {
      setError(t('agreementPanel.emptyError'));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await adminAgreementApi.createVersion(content.trim(), type);
      if (res.success) {
        setSuccess(true);
        await load(type);
      } else {
        setError(res.message || t('agreementPanel.saveError'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('agreementPanel.saveCatchError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  }

  const activeVersion = versions.find((v) => v.isActive);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative inline-block text-left mb-4 z-20">
        <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
            Loại Thỏa Thuận:
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-4 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer min-w-[320px] transition-all hover:bg-slate-100 dark:hover:bg-slate-850"
            >
              <span>{type === 'DEVELOPER_ONBOARDING' ? 'Thỏa thuận nhà phát triển (Developer Onboarding)' : 'Thỏa thuận người dùng cuối khi mua (Buyer EULA)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-450 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                <div className="absolute left-0 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-850 dark:bg-slate-900 z-20 py-1.5 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setType('DEVELOPER_ONBOARDING');
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${type === 'DEVELOPER_ONBOARDING' ? 'text-amber-500 bg-amber-500/5' : 'text-slate-700 dark:text-slate-350'}`}
                  >
                    Thỏa thuận nhà phát triển (Developer Onboarding)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('BUYER_EULA');
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${type === 'BUYER_EULA' ? 'text-amber-500 bg-amber-500/5' : 'text-slate-700 dark:text-slate-350'}`}
                  >
                    Thỏa thuận người dùng cuối khi mua (Buyer EULA)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
          <Check size={14} /> {t('agreementPanel.success')}
        </div>
      )}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-500 text-xs font-semibold flex items-center gap-1.5">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/70">
            {activeVersion
              ? t('agreementPanel.contentLabel', {
                  version: `(v${activeVersion.version})`,
                })
              : t('agreementPanel.contentLabelNoVersion')}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full resize-y rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-amber-400/60 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white"
          placeholder={t('agreementPanel.placeholder', {
            commissionRate: '{{commissionRate}}',
            revenueSharePercent: '{{revenueSharePercent}}',
          })}
        />
        <p className="mt-2 text-[11px] text-slate-500 dark:text-white/40">
          {t('agreementPanel.helper', {
            commissionRate: '{{commissionRate}}',
            revenueSharePercent: '{{revenueSharePercent}}',
          })}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {t('agreementPanel.save')}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/70">
          <History className="w-3.5 h-3.5" /> {t('agreementPanel.history')}
        </div>
        {versions.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-white/40">{t('agreementPanel.empty')}</p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">v{v.version}</span>
                  {v.isActive && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                      {t('agreementPanel.active')}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 dark:text-white/40">{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
