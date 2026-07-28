import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import { Camera, Loader2, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { faceVerifyApi } from '../api/faceVerifyApi';

interface FaceVerifyModalProps {
  onSuccess: () => void;
  onClose: () => void;
  // Cho phép caller tùy chỉnh nội dung theo ngữ cảnh gọi (become-developer, upload asset...).
  // Mặc định giữ nguyên text gốc (luồng đăng tải Marketplace) để không đổi hành vi các nơi
  // đã dùng modal này từ trước.
  description?: string;
  successMessage?: string;
}

type Step = 'intro' | 'camera' | 'preview' | 'submitting' | 'success';

export const FaceVerifyModal: React.FC<FaceVerifyModalProps> = ({
  onSuccess,
  onClose,
  description,
  successMessage,
}) => {
  const { t } = useTranslation(['shared']);
  const [step, setStep] = useState<Step>('intro');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [error, setError] = useState('');
  const webcamRef = useRef<Webcam>(null);
  const resolvedDescription = description ?? t('faceVerify.defaultDescription');
  const resolvedSuccessMessage =
    successMessage ?? t('faceVerify.defaultSuccessMessage');

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setStep('preview');
    }
  }, []);

  const handleSubmit = async () => {
    setStep('submitting');
    setError('');
    try {
      const base64 = capturedImage.split(',')[1] ?? capturedImage;
      const res = await faceVerifyApi.verify(base64);
      if (res.success) {
        setStep('success');
        setTimeout(onSuccess, 1500);
      } else {
        setError(res.message || t('faceVerify.errorDefault'));
        setStep('preview');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || t('faceVerify.errorDefault');
      setError(msg);
      setStep('preview');
    }
  };

  const handleRetake = () => {
    setCapturedImage('');
    setError('');
    setIsCameraReady(false);
    setStep('camera');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#17130a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-amber-400" size={20} />
            <span className="font-display font-bold text-[#ece1d1]">{t('faceVerify.title')}</span>
          </div>
          <button onClick={onClose} className="text-[#d3c5ac]/50 hover:text-[#ece1d1] transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Intro step */}
          {step === 'intro' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/20">
                <Camera className="text-amber-400" size={28} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#ece1d1]">{t('faceVerify.oneTimeTitle')}</h3>
                <p className="mt-2 text-sm text-[#d3c5ac]/70">
                  {resolvedDescription}
                </p>
              </div>
              <ul className="space-y-2 text-left text-xs text-[#d3c5ac]/70">
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> {t('faceVerify.checklist.once')}</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> {t('faceVerify.checklist.embedding')}</li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">✓</span> {t('faceVerify.checklist.lighting')}</li>
              </ul>
              <button
                onClick={() => setStep('camera')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-display font-bold text-[#6c4f00] transition hover:bg-amber-300 active:scale-[0.98]"
              >
                <Camera size={16} /> {t('faceVerify.startCapture')}
              </button>
            </div>
          )}

          {/* Camera step */}
          {step === 'camera' && (
            <div className="space-y-4">
              <p className="text-center text-xs text-[#d3c5ac]/70">{t('faceVerify.lookAtCamera')}</p>
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.9}
                  videoConstraints={{ facingMode: 'user', width: 480, height: 360 }}
                  onUserMedia={() => setIsCameraReady(true)}
                  onUserMediaError={() => setError(t('faceVerify.cameraAccessError'))}
                  className="w-full"
                />
                {/* Oval face guide overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-52 w-40 rounded-full border-2 border-dashed border-amber-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
              {error && <p className="text-center text-xs text-red-400">{error}</p>}
              <button
                onClick={capture}
                disabled={!isCameraReady}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-display font-bold text-[#6c4f00] transition hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCameraReady ? <><Camera size={16} /> {t('faceVerify.capturePhoto')}</> : <><Loader2 size={16} className="animate-spin" /> {t('faceVerify.connecting')}</>}
              </button>
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-center text-xs text-[#d3c5ac]/70">{t('faceVerify.reviewPhoto')}</p>
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full rounded-xl border border-white/10 object-cover"
              />
              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#d3c5ac] transition hover:bg-white/10"
                >
                  <RefreshCw size={14} /> {t('faceVerify.retake')}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-[#6c4f00] transition hover:bg-amber-300 active:scale-[0.98]"
                >
                  <ShieldCheck size={14} /> {t('faceVerify.confirm')}
                </button>
              </div>
            </div>
          )}

          {/* Submitting step */}
          {step === 'submitting' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <Loader2 className="animate-spin text-amber-400" size={36} />
              <p className="text-sm text-[#d3c5ac]">{t('faceVerify.verifying')}</p>
              <p className="text-xs text-[#d3c5ac]/50">{t('faceVerify.verifyingHint')}</p>
            </div>
          )}

          {/* Success step */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="text-emerald-400" size={32} />
              </div>
              <div>
                <p className="font-display font-bold text-emerald-300">{t('faceVerify.successTitle')}</p>
                <p className="mt-1 text-xs text-[#d3c5ac]/70">{resolvedSuccessMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
