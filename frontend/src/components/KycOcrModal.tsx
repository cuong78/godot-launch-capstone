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
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2 rounded-xl">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{t('kyc.title')}</h2>
              <p className="text-white/40 text-xs">{resolvedSubtitle}</p>
            </div>
          </div>
          {step !== 'submitting' && step !== 'processing' && (
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div>
                <p className="text-white/70 text-sm mb-4">
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
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
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
                    <label className="text-white/60 text-xs font-semibold block">
                      {docType === 'cccd'
                        ? t('kyc.frontLabelId')
                        : t('kyc.frontLabelPassport')} <span className="text-rose-500">*</span>
                    </label>
                    {!frontPreviewUrl ? (
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all h-40 justify-center text-center"
                      >
                        <Upload className="w-6 h-6 text-white/30" />
                        <span className="text-white/50 text-xs">{t('kyc.uploadFront')}</span>
                        <span className="text-white/30 text-[10px]">{t('kyc.supportedFormats')}</span>
                      </button>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-white/10 h-40 bg-black/30 flex items-center justify-center">
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
                      <label className="text-white/60 text-xs font-semibold block">
                        {t('kyc.backLabelId')} <span className="text-rose-500">*</span>
                      </label>
                      {!backPreviewUrl ? (
                        <button
                          type="button"
                          onClick={() => backInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all h-40 justify-center text-center"
                        >
                          <Upload className="w-6 h-6 text-white/30" />
                          <span className="text-white/50 text-xs">{t('kyc.uploadBack')}</span>
                          <span className="text-white/30 text-[10px]">{t('kyc.supportedFormats')}</span>
                        </button>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-white/10 h-40 bg-black/30 flex items-center justify-center">
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
              <p className="text-white/70 text-sm">{t('kyc.processing')}</p>
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
                  <label className="text-white/50 text-xs mb-1 block">{fieldLabels[field]}</label>
                  {field === 'address' ? (
                    <textarea
                      value={form[field] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400/60 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[field] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400/60"
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
                  className="flex-1 bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm py-2.5 rounded-xl transition-colors"
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
              <p className="text-white/70 text-sm">{t('kyc.submitting')}</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="bg-green-500/20 p-4 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-white font-semibold">{t('kyc.successTitle')}</p>
              <p className="text-white/50 text-sm text-center">
                {resolvedSuccessDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
