import { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, X, FileText, Edit3 } from 'lucide-react';
import { kycApi, KycOcrResult, KycConfirmPayload } from '../api/kycApi';

type Step = 'upload' | 'processing' | 'review' | 'submitting' | 'success';
type DocType = 'cccd' | 'passport';

interface Props {
  onSuccess: (status: { fullName: string; idNumber: string; address: string | null; dateOfBirth: string | null }) => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Họ và tên',
  idNumber: 'Số CCCD / Hộ chiếu',
  dateOfBirth: 'Ngày sinh (DD/MM/YYYY)',
  address: 'Địa chỉ thường trú',
};

export default function KycOcrModal({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [docType, setDocType] = useState<DocType>('cccd');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<KycOcrResult | null>(null);
  const [form, setForm] = useState<KycConfirmPayload>({
    documentType: 'cccd',
    fullName: '',
    idNumber: '',
    dateOfBirth: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreviewUrl(result);
      // strip data URI prefix for API
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setImageBase64(base64);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleOcr = useCallback(async () => {
    if (!imageBase64) {
      setError('Vui lòng chọn ảnh giấy tờ.');
      return;
    }
    setStep('processing');
    setError(null);

    try {
      const res = await kycApi.ocr(imageBase64, docType);
      if (res.success && res.data) {
        setOcrResult(res.data);
        setForm({
          documentType: docType,
          fullName: res.data.fullName ?? '',
          idNumber: res.data.idNumber ?? '',
          dateOfBirth: res.data.dateOfBirth ?? '',
          address: res.data.address ?? '',
        });
        setStep('review');
      } else {
        setError(res.message || 'Không thể đọc thông tin. Vui lòng thử lại với ảnh rõ hơn.');
        setStep('upload');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setStep('upload');
    }
  }, [imageBase64, docType]);

  const handleConfirm = useCallback(async () => {
    if (!form.fullName.trim() || !form.idNumber.trim()) {
      setError('Họ tên và số giấy tờ không được để trống.');
      return;
    }
    setStep('submitting');
    setError(null);

    try {
      const res = await kycApi.confirm(form);
      if (res.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess({
            fullName: form.fullName,
            idNumber: form.idNumber,
            address: form.address || null,
            dateOfBirth: form.dateOfBirth || null,
          });
        }, 1500);
      } else {
        setError(res.message || 'Lưu thông tin thất bại.');
        setStep('review');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setStep('review');
    }
  }, [form, onSuccess]);

  const resetUpload = () => {
    setPreviewUrl(null);
    setImageBase64('');
    setStep('upload');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              <h2 className="text-white font-semibold text-sm">Xác minh danh tính (KYC)</h2>
              <p className="text-white/40 text-xs">Yêu cầu trước khi ký hợp đồng lần đầu</p>
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
                  Chụp ảnh hoặc tải lên ảnh CCCD/Hộ chiếu. Hệ thống sẽ tự động đọc thông tin để điền vào hợp đồng.
                </p>

                {/* Doc type selector */}
                <div className="flex gap-3 mb-4">
                  {(['cccd', 'passport'] as DocType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        docType === t
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      {t === 'cccd' ? 'CCCD' : 'Hộ chiếu'}
                    </button>
                  ))}
                </div>

                {/* Upload area */}
                {!previewUrl ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all"
                  >
                    <Upload className="w-8 h-8 text-white/30" />
                    <span className="text-white/50 text-sm">Nhấn để chọn ảnh</span>
                    <span className="text-white/30 text-xs">PNG, JPG, JPEG</span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img src={previewUrl} alt="preview" className="w-full object-contain max-h-52" />
                    <button
                      onClick={resetUpload}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1 hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleOcr}
                disabled={!imageBase64}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors"
              >
                Đọc thông tin giấy tờ
              </button>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-white/70 text-sm">Đang nhận dạng ký tự...</p>
            </div>
          )}

          {/* Step: Review / Edit */}
          {step === 'review' && ocrResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-400/10 rounded-xl px-4 py-3">
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>Kiểm tra và chỉnh sửa thông tin nếu cần, rồi bấm Xác nhận.</span>
              </div>

              {(['fullName', 'idNumber', 'dateOfBirth', 'address'] as const).map((field) => (
                <div key={field}>
                  <label className="text-white/50 text-xs mb-1 block">{FIELD_LABELS[field]}</label>
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
                  Thử lại
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          )}

          {/* Step: Submitting */}
          {step === 'submitting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-white/70 text-sm">Đang lưu thông tin KYC...</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="bg-green-500/20 p-4 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-white font-semibold">Xác minh danh tính thành công</p>
              <p className="text-white/50 text-sm text-center">
                Thông tin đã được lưu. Đang điền vào hợp đồng...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
