import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Download, PenTool, CheckCircle, Clock, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';
import { ContractResponse, User } from '../types';
import { SignaturePad } from './SignaturePad';
import { Button } from './Button';
import { Input } from './Input';
import KycOcrModal from './KycOcrModal';
import { kycApi } from '../api/kycApi';

const resolveLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split('-')[0];

  if (normalized === 'en') return 'en-US';
  if (normalized === 'ja') return 'ja-JP';
  return 'vi-VN';
};

interface ContractViewerModalProps {
  contract: ContractResponse;
  currentUser: User | null;
  onClose: () => void;
  // If provided, the modal will allow signing
  mode?: 'view' | 'sign-developer';
  onSignSuccess?: () => void;
  // Callbacks for API integration inside the modal
  onSignDeveloper?: (signatureBase64: string, rep: string, addr: string, tax: string) => Promise<{ success: boolean; message?: string }>;
  onRejectDeveloper?: (rejectionReason: string) => Promise<{ success: boolean; message?: string }>;
}

export const ContractViewerModal: React.FC<ContractViewerModalProps> = ({
  contract,
  currentUser,
  onClose,
  mode = 'view',
  onSignSuccess,
  onSignDeveloper,
  onRejectDeveloper
}) => {
  const { t, i18n } = useTranslation(['shared']);
  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language);
  // Developer signing states
  const [sellerRepresentative, setSellerRepresentative] = useState(contract.sellerRepresentative || currentUser?.fullName || '');
  const [sellerAddress, setSellerAddress] = useState(contract.sellerAddress || '');
  const [sellerTaxCode, setSellerTaxCode] = useState(contract.sellerTaxCode || '');
  const [devSignature, setDevSignature] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectType, setRejectType] = useState<'cancel' | 'negotiate'>('negotiate');

  // KYC gate: check on mount when developer needs to sign
  const [showKycModal, setShowKycModal] = useState(false);

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsed);
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const formatCurrencyValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return t('contract.document.toBeAgreed');
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(numericValue);
    }

    return String(value);
  };

  const getContractTypeLabel = (variant: 'short' | 'long') => {
    if (contract.contractType === 'co_publishing') {
      return variant === 'short'
        ? t('contract.type.coPublishingShort')
        : t('contract.type.coPublishingLong');
    }

    return variant === 'short'
      ? t('contract.type.fullAcquisitionShort')
      : t('contract.type.fullAcquisitionLong');
  };

  const buyerRepresentative =
    contract.buyerRepresentative || t('contract.platform.defaultRepresentative');
  const buyerPosition =
    contract.buyerPosition || t('contract.platform.defaultPosition');
  const sellerAddressDisplay =
    sellerAddress || contract.sellerAddress || t('contract.document.notUpdated');

  useEffect(() => {
    if (mode !== 'sign-developer' || contract.signedAtSeller) return;
    kycApi.getStatus().then((res) => {
      if (res.success && res.data) {
        if (!res.data.kycVerified) {
          setShowKycModal(true);
        } else {
          // Auto-fill from stored KYC if fields are empty
          if (!sellerRepresentative && res.data.fullName) setSellerRepresentative(res.data.fullName);
          if (!sellerAddress && res.data.address) setSellerAddress(res.data.address);
        }
      }
    }).catch(() => {
      // KYC check failed — allow signing anyway (fail-open)
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stepper helper
  const getStepStatus = (step: 1 | 2) => {
    if (step === 1) {
      return contract.signedAtBuyer ? 'completed' : 'active';
    }
    if (step === 2) {
      if (contract.signedAtSeller) return 'completed';
      return contract.signedAtBuyer ? 'active' : 'upcoming';
    }
    return 'upcoming';
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSignDeveloper || !devSignature) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onSignDeveloper(devSignature, sellerRepresentative, sellerAddress, sellerTaxCode);
      if (res.success) {
        if (onSignSuccess) onSignSuccess();
      } else {
        setErrorMsg(res.message || t('contract.errorSign'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('contract.errorServer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevReject = async () => {
    if (!onRejectDeveloper) return;
    if (!rejectionReasonInput.trim()) {
      alert(t('contract.errorRejectReasonRequired'));
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formattedReason = rejectType === 'cancel'
        ? `[HỦY HỢP ĐỒNG] ${rejectionReasonInput.trim()}`
        : `[THƯƠNG LƯỢNG] ${rejectionReasonInput.trim()}`;
      const res = await onRejectDeveloper(formattedReason);
      if (res.success) {
        if (onSignSuccess) onSignSuccess();
      } else {
        setErrorMsg(res.message || t('contract.errorReject'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('contract.errorServer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (showKycModal) {
    return createPortal(
      <KycOcrModal
        onSuccess={({ fullName, address }) => {
          if (fullName) setSellerRepresentative(fullName);
          if (address) setSellerAddress(address);
          setShowKycModal(false);
        }}
        onClose={onClose}
      />,
      document.body
    );
  }

  return createPortal(
    <div className="contract-modal-overlay fixed inset-0 z-[99999] flex justify-center items-start bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="contract-modal-box bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 shadow-2xl w-full max-w-5xl my-8 flex flex-col relative animate-fade-in backdrop-blur-md relative overflow-hidden">
        
        {/* Ambient background glows */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        {/* Header toolbar */}
        <div className="contract-header-toolbar flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-500 dark:text-sky-400 text-[9px] font-mono tracking-widest uppercase font-bold shadow-[0_0_10px_rgba(14,165,233,0.1)]">
                {t('contract.systemBadge')}
              </span>
              {(() => {
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'signed':
                      return { text: t('contract.status.signed'), colorClass: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' };
                    case 'cancelled':
                      return { text: t('contract.status.cancelled'), colorClass: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]' };
                    case 'expired':
                      return { text: t('contract.status.expired'), colorClass: 'bg-slate-500/10 text-slate-550 border-slate-500/20 dark:border-slate-800' };
                    case 'pending':
                    default:
                      return { text: t('contract.status.pending'), colorClass: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.12)] animate-pulse' };
                  }
                };
                const statusInfo = getStatusInfo(contract.status);
                return (
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono border ${statusInfo.colorClass}`}>
                    {statusInfo.text}
                  </span>
                );
              })()}
            </div>
            <h2 className="font-display font-bold text-lg text-slate-850 dark:text-white mt-1.5">
              {t('contract.headerTitle')} {contract.gameTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('contract.codeLabel')} GL-{contract.id?.substring(0, 8).toUpperCase()}/HĐPH • {t('contract.createdLabel')} {formatDate(contract.createdAt)}
            </p>
          </div>
          <button 
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={onClose}
            aria-label={t('contract.closeModal')}
            title={t('contract.closeModal')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress bar */}
        <div className="contract-stepper-bar grid grid-cols-2 gap-5 mb-8 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 relative z-10">
          {[
            {
              step: 1,
              title: t('contract.step.adminTitle'),
              desc: contract.signedAtBuyer
                ? t('contract.step.adminSignedAt', {
                    date: formatDate(contract.signedAtBuyer),
                  })
                : t('contract.step.adminPending'),
              icon: <PenTool size={16} />,
            },
            {
              step: 2,
              title: t('contract.step.devTitle'),
              desc: contract.signedAtSeller
                ? t('contract.step.devSignedAt', {
                    date: formatDate(contract.signedAtSeller),
                  })
                : t('contract.step.devPending'),
              icon: <ShieldCheck size={16} />,
            }
          ].map((item) => {
            const status = getStepStatus(item.step as 1 | 2);
            return (
              <div 
                key={item.step} 
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-studio ${
                  status === 'completed' 
                    ? 'border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03] shadow-[0_4px_15px_rgba(16,185,129,0.02)]' 
                    : status === 'active' 
                    ? 'border-amber-500/30 bg-amber-500/[0.02] dark:bg-amber-500/[0.04] shadow-[0_0_15px_rgba(245,158,11,0.08)]' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 transition-studio ${
                  status === 'completed' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : status === 'active' 
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.35)] font-bold' 
                    : 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500'
                }`}>
                  {status === 'completed' ? <CheckCircle size={16} /> : item.icon}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight font-medium">{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Split Panels */}
        <div className="contract-split-panels grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: A4 Document Viewer */}
          <div className="contract-left-panel lg:col-span-7 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                {t('contract.previewLabel')}
              </span>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850/80 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-studio shadow-sm cursor-pointer"
                title={t('contract.downloadPdfTitle')}
              >
                <Download size={14} /> {t('contract.downloadPdf')}
              </button>
            </div>
            
            {/* The Document Box (simulated A4 paper sheet) */}
            <div 
              id="contract-print-area"
              className="p-8 bg-[#fcfbf9] dark:bg-slate-900/40 border border-slate-300 dark:border-amber-500/25 rounded-2xl max-h-[70vh] overflow-y-auto leading-relaxed space-y-5 shadow-md dark:shadow-[0_0_20px_rgba(245,158,11,0.02)] select-text dark:backdrop-blur-md text-slate-900 dark:text-white"
              style={{ fontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif", fontSize: '13px' }}
            >
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4 text-xs">
                <div className="text-center w-[48%] font-bold text-slate-900 dark:text-slate-100">
                  {t('contract.document.platformCompany')}
                  <div className="mt-1 font-mono font-normal">{t('contract.document.numberLabel')} GL-{contract.id?.substring(0, 8).toUpperCase()}/HĐPH</div>
                </div>
                <div className="text-center w-[48%] font-bold text-slate-900 dark:text-slate-100">
                  {t('contract.document.nationTitle')}
                  <span className="text-[11px] block font-semibold mt-0.5">{t('contract.document.nationMotto')}</span>
                  <div className="w-24 h-[1px] bg-slate-900 dark:bg-slate-300 mx-auto mt-1"></div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2 text-slate-900 dark:text-white">
                <div className="text-base font-bold uppercase tracking-wide">{t('contract.document.mainTitle')}</div>
              </div>

              {/* Preamble */}
              <p className="indent-8 text-justify text-slate-800 dark:text-slate-200">
                {t('contract.document.preamble')}
              </p>

              {/* Section 1: Parties */}
              <div className="space-y-3">
                <div className="font-bold border-b border-slate-200 dark:border-slate-800 pb-0.5 uppercase tracking-wide text-slate-900 dark:text-white">
                  {t('contract.document.section1Title')}
                </div>
                
                <div className="space-y-4 text-slate-800 dark:text-slate-200">
                  <div>
                    <p className="font-bold mb-1">{t('contract.document.partyATitle')}</p>
                    <table className="w-full text-left border-none border-collapse text-xs">
                      <tbody>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800/40">
                          <td className="w-1/3 py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.companyNameLabel')}</td>
                          <td className="py-1">{t('contract.document.platformCompany')}</td>
                        </tr>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800/40">
                          <td className="py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.representativeLabel')}</td>
                          <td className="py-1 font-bold">{buyerRepresentative}</td>
                        </tr>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800/40">
                          <td className="py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.positionLabel')}</td>
                          <td className="py-1">{buyerPosition}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.contactEmailLabel')}</td>
                          <td className="py-1">admin@godotlaunch.com</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="font-bold mb-1">{t('contract.document.partyBTitle')}</p>
                    <table className="w-full text-left border-none border-collapse text-xs">
                      <tbody>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800/40">
                          <td className="w-1/3 py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.fullNameLabel')}</td>
                          <td className="py-1 font-bold">{sellerRepresentative || contract.sellerRepresentative || contract.sellerName}</td>
                        </tr>
                        <tr className="border-b border-slate-200/50 dark:border-slate-800/40">
                          <td className="py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.addressLabel')}</td>
                          <td className="py-1">{sellerAddressDisplay}</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-semibold text-slate-500 dark:text-slate-400">{t('contract.document.accountEmailLabel')}</td>
                          <td className="py-1">{contract.sellerEmail || contract.sellerName}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 2: Subject */}
              <div className="space-y-1.5 text-slate-800 dark:text-slate-200">
                <div className="font-bold border-b border-slate-200 dark:border-slate-800 pb-0.5 uppercase tracking-wide text-slate-900 dark:text-white">
                  {t('contract.document.section2Title')}
                </div>
                <p className="text-justify">
                  {t('contract.document.section2BodyPrefix', { title: contract.gameTitle })}{' '}
                  <span className="font-bold uppercase ml-1">
                    {getContractTypeLabel('long')}
                  </span>.
                </p>
              </div>

              {/* Section 3: Financial */}
              <div className="space-y-2">
                <div className="font-bold border-b border-slate-200 dark:border-slate-800 pb-0.5 uppercase tracking-wide text-slate-900 dark:text-white">
                  {t('contract.document.section3Title')}
                </div>
                {contract.contractType === 'co_publishing' ? (
                  <div className="text-slate-805 dark:text-slate-200 text-justify text-xs space-y-2 leading-relaxed">
                    <p>
                      {t('contract.document.section3CoPublishingIntro')}
                    </p>
                    <ul className="list-disc pl-5 font-bold space-y-0.5">
                      <li>{t('contract.document.section3CoPublishingSellerShare', { percent: contract.revenueSplit ?? 0 })}</li>
                      <li>{t('contract.document.section3CoPublishingBuyerShare', { percent: 100 - (contract.revenueSplit || 0) })}</li>
                    </ul>
                    <p>
                      {t('contract.document.section3CoPublishingPayout')}
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-805 dark:text-slate-200 text-justify text-xs space-y-2 leading-relaxed">
                    <p>
                      {t('contract.document.section3FullAcquisitionTransfer')}
                    </p>
                    <p>
                      {t('contract.document.section3FullAcquisitionPayment', {
                        amount: formatCurrencyValue(contract.lumpSumAmount),
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 4: IP & Confidentiality */}
              <div className="space-y-2">
                <div className="font-bold border-b border-slate-200 dark:border-slate-800 pb-0.5 uppercase tracking-wide text-slate-900 dark:text-white">
                  {t('contract.document.section4Title')}
                </div>
                <div className="text-slate-805 dark:text-slate-200 text-justify text-xs space-y-2 leading-relaxed">
                  <p>
                    <strong>{t('contract.document.section4OwnershipLabel')}</strong> {t('contract.document.section4OwnershipBody')}
                  </p>
                  <p>
                    <strong>{t('contract.document.section4ConfidentialityLabel')}</strong> {t('contract.document.section4ConfidentialityBody')}
                  </p>
                  <p>
                    <strong>{t('contract.document.section4NoResaleLabel')}</strong>
                    <br />- {t('contract.document.section4NoResaleCoPublishing')}
                    <br />- {t('contract.document.section4NoResaleFullAcquisition')}
                  </p>
                  <p>
                    <strong>{t('contract.document.section4OriginalityLabel')}</strong> {t('contract.document.section4OriginalityBody')}
                  </p>
                  <p>
                    <strong>{t('contract.document.section4ViolationLabel')}</strong> {t('contract.document.section4ViolationIntro')}
                    <br />1. {t('contract.document.section4ViolationItem1')}
                    <br />2. {t('contract.document.section4ViolationItem2')}
                  </p>
                </div>
              </div>

              {/* Section 5: Validity & Dispute Resolution */}
              <div className="space-y-2">
                <div className="font-bold border-b border-slate-200 dark:border-slate-800 pb-0.5 uppercase tracking-wide text-slate-900 dark:text-white">
                  {t('contract.document.section5Title')}
                </div>
                <div className="text-slate-850 dark:text-slate-200 text-justify text-xs space-y-2 leading-relaxed">
                  <p>
                    <strong>{t('contract.document.section5ValidityLabel')}</strong> {t('contract.document.section5ValidityBody')}
                  </p>
                  <p>
                    <strong>{t('contract.document.section5DisputeLabel')}</strong> {contract.disputeResolutionClause || t('contract.document.section5DisputeFallback')}
                  </p>
                </div>
              </div>

              {/* Section 6: Additional */}
              {contract.additionalTerms && (
                <div className="space-y-1.5">
                  <div className="font-bold border-b border-slate-200 dark:border-slate-800 pb-0.5 uppercase tracking-wide text-slate-900 dark:text-white">
                    {t('contract.document.section6Title')}
                  </div>
                  <p className="italic text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded border border-slate-200 dark:border-amber-500/10 text-justify">
                    {contract.additionalTerms}
                  </p>
                </div>
              )}

              {/* Signature area */}
              <div className="grid grid-cols-2 gap-5 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
                
                {/* Bên B Signature */}
                <div className="text-center p-4 border border-dashed border-slate-350 dark:border-amber-500/15 rounded bg-slate-50/30 dark:bg-slate-900/20 flex flex-col items-center justify-between min-h-[150px]">
                  <span className="font-bold text-[10px] block text-slate-500 uppercase tracking-wider">{t('contract.signature.partyB')}</span>
                  {contract.sellerSignatureBase64 ? (
                    <div className="my-2 flex flex-col items-center">
                      <img 
                        src={contract.sellerSignatureBase64} 
                        alt={t('contract.signature.altSeller')}
                        className="max-h-16 w-auto object-contain brightness-95 dark:brightness-105"
                      />
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1.5">
                        {t('contract.signature.signedElectronically')}
                      </span>
                    </div>
                  ) : devSignature ? (
                    <div className="my-2 flex flex-col items-center opacity-70">
                      <img 
                        src={devSignature} 
                        alt={t('contract.signature.altPending')}
                        className="max-h-12 w-auto object-contain"
                      />
                      <span className="text-[9px] text-amber-500 font-bold italic">{t('contract.signature.pendingSubmission')}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium italic my-5">{t('contract.signature.waitingPartyB')}</span>
                  )}
                  <div>
                    <span className="block font-bold text-slate-805 dark:text-slate-200">
                      {contract.sellerRepresentative || (mode === 'sign-developer' ? sellerRepresentative : '') || contract.sellerName}
                    </span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {contract.signedAtSeller ? t('contract.signature.signedAt', { date: formatDateTime(contract.signedAtSeller) }) : ''}
                    </span>
                  </div>
                </div>

                {/* Bên A Signature */}
                <div className="text-center p-4 border border-dashed border-slate-350 dark:border-amber-500/15 rounded bg-slate-50/30 dark:bg-slate-900/20 flex flex-col items-center justify-between min-h-[150px]">
                  <span className="font-bold text-[10px] block text-slate-505 uppercase tracking-wider">{t('contract.signature.partyA')}</span>
                  {contract.buyerSignatureBase64 ? (
                    <div className="my-2 flex flex-col items-center">
                      <img
                        src={contract.buyerSignatureBase64}
                        alt={t('contract.signature.altBuyer')}
                        className="max-h-16 w-auto object-contain brightness-95 dark:brightness-105"
                      />
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-1.5">
                        {t('contract.signature.signedElectronically')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium italic my-5">{t('contract.signature.waitingPartyA')}</span>
                  )}
                  <div>
                    <span className="block font-bold text-slate-805 dark:text-slate-200">
                      {buyerRepresentative}
                    </span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-505 mt-0.5">
                      {contract.signedAtBuyer ? t('contract.signature.signedAt', { date: formatDateTime(contract.signedAtBuyer) }) : ''}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Right Panel: Actions & Signing Flow */}
          <div className="contract-right-panel lg:col-span-5 space-y-5">
            
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 rounded-2xl space-y-5 shadow-sm relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="text-xs font-bold text-slate-550 dark:text-slate-450 uppercase tracking-widest font-mono flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/50 relative z-10">
                <Clock size={15} className="text-amber-500" /> {t('contract.audit.title')}
              </h3>

              <div className="space-y-4 text-xs leading-normal relative z-10">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                  <span className="text-slate-450 dark:text-slate-500 font-medium">{t('contract.audit.projectLabel')}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{contract.gameTitle}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                  <span className="text-slate-450 dark:text-slate-500 font-medium">{t('contract.audit.typeLabel')}</span>
                  <span className="font-bold text-sky-500 dark:text-sky-400">
                    {getContractTypeLabel('short')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                  <span className="text-slate-450 dark:text-slate-500 font-medium">{t('contract.audit.financialLabel')}</span>
                  <span className="font-bold text-amber-500 dark:text-amber-400 font-mono tracking-wide text-sm">
                    {contract.contractType === 'co_publishing' 
                      ? t('contract.audit.financialRevenue', { percent: contract.revenueSplit ?? 0 })
                      : t('contract.audit.financialAmount', { amount: formatCurrencyValue(contract.lumpSumAmount) })}
                  </span>
                </div>
              </div>

              {/* Download actions for signed contract */}
              {contract.status === 'signed' && (
                <div className="pt-2 relative z-10">
                  {contract.pdfUrl ? (
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-studio shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      <Download size={14} /> {t('contract.audit.downloadOfficialPdf')}
                    </a>
                  ) : (
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-studio shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      <Download size={14} /> {t('contract.downloadPdf')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ERROR DISPLAY */}
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{t('contract.errorPrefix')} {errorMsg}</span>
              </div>
            )}

            {/* MODE: SIGN DEVELOPER */}
            {mode === 'sign-developer' && !contract.signedAtSeller && (
              isRejecting ? (
                <div className="space-y-4 animate-fade-in bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-xs">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase font-mono block flex items-center gap-1.5">
                      <AlertTriangle size={14} className="shrink-0" /> {t('contract.responseMethodTitle')}
                    </span>
                    <p className="text-slate-500 dark:text-slate-455 leading-normal">
                      {t('contract.responseMethodDescription')}
                    </p>
                  </div>

                  <div className="flex gap-4 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850">
                    <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <input 
                        type="radio" 
                        name="rejectType" 
                        value="negotiate" 
                        checked={rejectType === 'negotiate'} 
                        onChange={() => setRejectType('negotiate')} 
                        className="text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{t('contract.response.renegotiate')}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">{t('contract.response.renegotiateHint')}</span>
                      </div>
                    </label>

                    <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <input 
                        type="radio" 
                        name="rejectType" 
                        value="cancel" 
                        checked={rejectType === 'cancel'} 
                        onChange={() => setRejectType('cancel')} 
                        className="text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{t('contract.response.cancel')}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">{t('contract.response.cancelHint')}</span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      {rejectType === 'negotiate'
                        ? t('contract.response.negotiateLabel')
                        : t('contract.response.cancelLabel')}
                    </label>
                    <textarea
                      className="w-full h-32 px-3.5 py-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 border-slate-250 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500"
                      placeholder={rejectType === 'negotiate'
                        ? t('contract.response.negotiatePlaceholder')
                        : t('contract.response.cancelPlaceholder')}
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="flex-1 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850/80 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-studio shadow-sm cursor-pointer text-center"
                    >
                      {t('contract.back')}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !rejectionReasonInput.trim()}
                      onClick={handleDevReject}
                      className={`flex-1 py-2.5 px-4 text-white font-bold rounded-xl text-xs transition-studio cursor-pointer text-center flex items-center justify-center gap-1 shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
                        rejectType === 'negotiate' 
                          ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' 
                          : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      }`}
                    >
                      <XCircle size={14} /> {isSubmitting ? t('contract.sending') : rejectType === 'negotiate' ? t('contract.sendRequest') : t('contract.confirmCancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleDevSubmit} className="space-y-5">
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl space-y-2 text-xs">
                    <span className="text-xs font-bold text-sky-500 dark:text-sky-400 uppercase font-mono block">
                      {t('contract.signingInfoTitle')}
                    </span>
                    <p className="text-slate-500 dark:text-slate-450 leading-normal">
                      {t('contract.signingInfoDescription')}
                    </p>
                  </div>

                  <Input
                    label={t('contract.partyBRepresentative')}
                    value={sellerRepresentative}
                    onChange={(e) => setSellerRepresentative(e.target.value)}
                    required
                    className="bg-slate-50/30 dark:bg-slate-900/20"
                  />

                  <Input
                    label={t('contract.partyBAddress')}
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    required
                    className="bg-slate-50/30 dark:bg-slate-900/20"
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                      {t('contract.drawSignature')}
                    </label>
                    <SignaturePad
                      onChange={setDevSignature}
                      placeholder={t('contract.signaturePlaceholder')}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-450 font-bold border border-rose-500/25 rounded-xl text-xs transition-studio cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                      title={t('contract.rejectTooltip')}
                    >
                      <XCircle size={14} /> {t('contract.rejectTitle')}
                    </button>
                    <Button
                      variant="primary"
                      size="md"
                      type="submit"
                      className="flex-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-studio"
                      disabled={!devSignature || isSubmitting}
                      icon={<PenTool size={14} />}
                    >
                      {isSubmitting ? t('contract.sending') : t('contract.completeSignature')}
                    </Button>
                  </div>
                </form>
              )
            )}

            {/* MODE: VIEW ONLY */}
            {mode === 'view' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-555 dark:text-slate-400 leading-normal bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-xl">
                  {t('contract.viewDescription')}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-studio shadow-sm cursor-pointer text-center"
                >
                  {t('contract.closeWindow')}
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
