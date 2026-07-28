import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, AlertCircle, Loader2, X, FileText, Edit3 } from 'lucide-react';
import { kycApi, KycOcrResult, KycConfirmPayload } from '../api/kycApi';
import { useAuth } from '../hooks/useAuth';

type Step = 'upload' | 'processing' | 'review' | 'submitting' | 'success';
type DocType = 'cccd' | 'passport';

interface Props {
  onSuccess: (status: {
    fullName: string;
    idNumber: string;
    address: string | null;
    dateOfBirth: string | null;
    bankName: string;
    bankAccount: string;
    bankAccountHolder: string;
  }) => void;
  onClose: () => void;
  // Cho phép caller tùy chỉnh nội dung theo ngữ cảnh gọi (become-developer, ký hợp đồng...).
  // Mặc định giữ nguyên text gốc (luồng ký hợp đồng) để không đổi hành vi các nơi đã dùng
  // modal này từ trước.
  subtitle?: string;
  successDescription?: string;
}

export default function KycOcrModal({
  onSuccess,
  onClose,
  subtitle,
  successDescription,
}: Props) {
  const { t } = useTranslation(['shared']);
  const { loginWithToken } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [docType, setDocType] = useState<DocType>('cccd');
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string>('');
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<KycOcrResult | null>(null);
  const [form, setForm] = useState<KycConfirmPayload>({
    documentType: 'cccd',
    fullName: '',
    idNumber: '',
    dateOfBirth: '',
    address: '',
    bankName: '',
    bankAccount: '',
    bankAccountHolder: '',
  });
  const [error, setError] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const resolvedSubtitle = subtitle ?? t('kyc.defaultSubtitle');
  const resolvedSuccessDescription =
    successDescription ?? t('kyc.defaultSuccessDescription');
  const fieldLabels: Record<string, string> = {
    fullName: t('kyc.field.fullName'),
    idNumber: t('kyc.field.idNumber'),
    dateOfBirth: t('kyc.field.dateOfBirth'),
    address: t('kyc.field.address'),
    bankName: t('kyc.field.bankName'),
    bankAccount: t('kyc.field.bankAccount'),
    bankAccountHolder: t('kyc.field.bankAccountHolder'),
  };

  const handleFileChange = (side: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // strip data URI prefix for API
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (side === 'front') {
        setFrontPreviewUrl(result);
        setFrontBase64(base64);
      } else {
        setBackPreviewUrl(result);
        setBackBase64(base64);
      }
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleOcr = useCallback(async () => {
    if (!frontBase64) {
      setError(t('kyc.errorSelectFront'));
      return;
    }
    if (docType === 'cccd' && !backBase64) {
      setError(t('kyc.errorSelectBack'));
      return;
    }
    setStep('processing');
    setError(null);

    try {
      const res = await kycApi.ocr(frontBase64, docType);
      if (res.success && res.data) {
        setOcrResult(res.data);
        setForm((f) => ({
          ...f,
          documentType: docType,
          fullName: res.data.fullName ?? '',
          idNumber: res.data.idNumber ?? '',
          dateOfBirth: res.data.dateOfBirth ?? '',
          address: res.data.address ?? '',
        }));
        setStep('review');
      } else {
        setError(res.message || t('kyc.errorReadFailed'));
        setStep('upload');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t('kyc.errorConnection'));
      setStep('upload');
    }
  }, [frontBase64, backBase64, docType, t]);

  const handleConfirm = useCallback(async () => {
    if (!form.fullName.trim() || !form.idNumber.trim()) {
      setError(t('kyc.errorMissingRequired'));
      return;
    }
    setStep('submitting');
    setError(null);

    try {
      const res = await kycApi.confirm({
        ...form,
        frontImageBase64: frontBase64,
        backImageBase64: backBase64 || undefined
      });
      if (res.success) {
        // Nếu lần confirm này vừa nâng role lên developer (đủ 3 điều kiện become-developer),
        // backend trả kèm token mới — áp dụng ngay để refresh session, không cần đăng nhập lại.
        // Với luồng ký hợp đồng cũ, token luôn null (user đã là developer từ trước) nên đây là no-op.
        if (res.data?.token) {
          try {
            await loginWithToken(res.data.token);
          } catch (tokenErr) {
            console.error('Failed to apply refreshed session token', tokenErr);
          }
        }

        setStep('success');
        setTimeout(() => {
          onSuccess({
            fullName: form.fullName,
            idNumber: form.idNumber,
            address: form.address || null,
            dateOfBirth: form.dateOfBirth || null,
            bankName: form.bankName,
            bankAccount: form.bankAccount,
            bankAccountHolder: form.bankAccountHolder,
          });
        }, 1500);
      } else {
        setError(res.message || t('kyc.errorSaveFailed'));
        setStep('review');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t('kyc.errorConnection'));
      setStep('review');
    }
  }, [form, frontBase64, backBase64, onSuccess, t]);

  const resetUpload = () => {
    setFrontPreviewUrl(null);
    setFrontBase64('');
    setBackPreviewUrl(null);
    setBackBase64('');
    setStep('upload');
    setError(null);
    if (frontInputRef.current) frontInputRef.current.value = '';
    if (backInputRef.current) backInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="dark-depth-card w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/70 dark:bg-night-850">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2 rounded-xl">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{t('kyc.title')}</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">{resolvedSubtitle}</p>
            </div>
          </div>
          {step !== 'submitting' && step !== 'processing' && (
            <button onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-900 dark:text-white/40 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <p className="mb-4 text-sm text-slate-600 dark:text-white/70">
                  {t('kyc.uploadDescription')}
                </p>

                {/* Doc type selector */}
                <div className="flex gap-3 mb-4">
                  {(['cccd', 'passport'] as DocType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setDocType(type);
                        setBackPreviewUrl(null);
                        setBackBase64('');
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        docType === type
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:border-white/30'
                      }`}
                    >
                      {type === 'cccd' ? t('kyc.docTypeId') : t('kyc.docTypePassport')}
                    </button>
                  ))}
                </div>

                {/* Upload area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Side Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-white/60">
                      {docType === 'cccd'
                        ? t('kyc.frontLabelId')
                        : t('kyc.frontLabelPassport')} <span className="text-rose-500">*</span>
                    </label>
                    {!frontPreviewUrl ? (
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-all hover:border-amber-400/50 hover:bg-amber-400/5 dark:border-white/20"
                      >
                        <Upload className="h-6 w-6 text-slate-400 dark:text-white/30" />
                        <span className="text-xs text-slate-500 dark:text-white/50">{t('kyc.uploadFront')}</span>
                        <span className="text-[10px] text-slate-500 dark:text-white/40">{t('kyc.supportedFormats')}</span>
                      </button>
                    ) : (
                      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30">
                        <img src={frontPreviewUrl} alt="front-preview" className="max-w-full max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setFrontPreviewUrl(null);
                            setFrontBase64('');
                            if (frontInputRef.current) frontInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange('front')}
                      className="hidden"
                    />
                  </div>

                  {/* Back Side Upload (only for CCCD) */}
                  {docType === 'cccd' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-white/60">
                        {t('kyc.backLabelId')} <span className="text-rose-500">*</span>
                      </label>
                      {!backPreviewUrl ? (
                        <button
                          type="button"
                          onClick={() => backInputRef.current?.click()}
                          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-all hover:border-amber-400/50 hover:bg-amber-400/5 dark:border-white/20"
                        >
                          <Upload className="h-6 w-6 text-slate-400 dark:text-white/30" />
                          <span className="text-xs text-slate-500 dark:text-white/50">{t('kyc.uploadBack')}</span>
                          <span className="text-[10px] text-slate-500 dark:text-white/40">{t('kyc.supportedFormats')}</span>
                        </button>
                      ) : (
                        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30">
                          <img src={backPreviewUrl} alt="back-preview" className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => {
                              setBackPreviewUrl(null);
                              setBackBase64('');
                              if (backInputRef.current) backInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <input
                        ref={backInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileChange('back')}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleOcr}
                disabled={!frontBase64 || (docType === 'cccd' && !backBase64)}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors"
              >
                {t('kyc.readDocumentInfo')}
              </button>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm text-slate-600 dark:text-white/70">{t('kyc.processing')}</p>
            </div>
          )}

          {/* Step: Review / Edit */}
          {step === 'review' && ocrResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-400/10 rounded-xl px-4 py-3">
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>{t('kyc.reviewHint')}</span>
              </div>

              {(['fullName', 'idNumber', 'dateOfBirth', 'address'] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-white/50">{fieldLabels[field]}</label>
                  {field === 'address' ? (
                    <textarea
                      value={form[field] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400/60 focus:outline-none resize-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[field] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-amber-400/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  )}
                </div>
              ))}



              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={resetUpload}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
                >
                  {t('kyc.retry')}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  {t('kyc.confirm')}
                </button>
              </div>
            </div>
          )}

          {/* Step: Submitting */}
          {step === 'submitting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm text-slate-600 dark:text-white/70">{t('kyc.submitting')}</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="bg-green-500/20 p-4 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <p className="font-semibold text-slate-950 dark:text-white">{t('kyc.successTitle')}</p>
              <p className="text-center text-sm text-slate-500 dark:text-white/50">
                {resolvedSuccessDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
