import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Camera, Loader2, ShieldCheck, X } from 'lucide-react';
import {
  faceVerifyApi,
  type FaceAction,
  type FaceCapture,
  type FaceChallenge,
} from '../api/faceVerifyApi';

interface FaceVerifyModalProps {
  onSuccess: () => void;
  onClose: () => void;
  description?: string;
  successMessage?: string;
}

type Step = 'intro' | 'camera' | 'submitting' | 'success';
type Guidance = 'loading' | 'noFace' | 'position' | 'hold' | 'move';

const REQUIRED_STABLE_FRAMES = 8;

function poseFromMatrix(data: number[]) {
  if (data.length < 11) return { pitch: 0, yaw: 0 };
  const radiansToDegrees = 180 / Math.PI;
  return {
    pitch: Math.atan2(data[9], data[10]) * radiansToDegrees,
    yaw: Math.atan2(-data[8], Math.hypot(data[9], data[10])) * radiansToDegrees,
  };
}

function formatFaceVerifyError(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/^LOOK_DOWN:\s*/i, 'Khi cúi đầu xuống: ')
    .replace(/^LOOK_UP:\s*/i, 'Khi ngẩng đầu lên: ')
    .replace(/^TURN_LEFT:\s*/i, 'Khi quay mặt sang trái: ')
    .replace(/^TURN_RIGHT:\s*/i, 'Khi quay mặt sang phải: ')
    .replace(/^CENTER:\s*/i, 'Khi nhìn thẳng: ');
}

export const FaceVerifyModal: React.FC<FaceVerifyModalProps> = ({
  onSuccess, onClose, description, successMessage,
}) => {
  const { t } = useTranslation(['shared']);
  const webcamRef = useRef<Webcam>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const stableFramesRef = useRef(0);
  const captureLockRef = useRef(false);

  const [step, setStep] = useState<Step>('intro');
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [challenge, setChallenge] = useState<FaceChallenge | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captures, setCaptures] = useState<FaceCapture[]>([]);
  const [needsCenterReset, setNeedsCenterReset] = useState(false);
  const [guidance, setGuidance] = useState<Guidance>('loading');
  const [error, setError] = useState('');

  const resolvedDescription = description ?? t('faceVerify.defaultDescription');
  const resolvedSuccessMessage = successMessage ?? t('faceVerify.defaultSuccessMessage');
  const action = challenge?.actions[currentIndex];

  const loadChallenge = useCallback(async () => {
    const response = await faceVerifyApi.createChallenge();
    if (!response.data) throw new Error(response.message || t('faceVerify.errorDefault'));
    setChallenge(response.data);
    setCurrentIndex(0);
    setCaptures([]);
    setNeedsCenterReset(false);
    stableFramesRef.current = 0;
    captureLockRef.current = false;
  }, [t]);

  const start = async () => {
    setError('');
    setStep('camera');
    try {
      await loadChallenge();
    } catch (err: any) {
      setError(formatFaceVerifyError(err.response?.data?.message || err.message || t('faceVerify.errorDefault')));
    }
  };

  useEffect(() => {
    if (step !== 'camera' || landmarkerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) landmarker.close();
        else {
          landmarkerRef.current = landmarker;
          setModelReady(true);
        }
      } catch {
        setError(t('faceVerify.modelError'));
      }
    })();
    return () => { cancelled = true; };
  }, [step, t]);

  const submit = useCallback(async (completedCaptures: FaceCapture[], activeChallenge: FaceChallenge) => {
    setStep('submitting');
    setError('');
    try {
      const response = await faceVerifyApi.verify(activeChallenge.challengeId, completedCaptures);
      if (!response.success) throw new Error(response.message || t('faceVerify.errorDefault'));
      setStep('success');
      window.setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setError(formatFaceVerifyError(err.response?.data?.message || err.message || t('faceVerify.errorDefault')));
      setStep('camera');
      try {
        await loadChallenge();
      } catch {
        // The original error remains visible; the retry button below can request another challenge.
      }
    }
  }, [loadChallenge, onSuccess, t]);

  const acceptFrame = useCallback((activeAction: FaceAction) => {
    if (captureLockRef.current || !challenge) return;
    const image = webcamRef.current?.getScreenshot();
    if (!image) return;
    captureLockRef.current = true;
    const nextCaptures = [...captures, {
      action: activeAction, imageBase64: image, capturedAt: Date.now(),
    }];
    setCaptures(nextCaptures);
    stableFramesRef.current = 0;

    if (currentIndex === challenge.actions.length - 1) {
      void submit(nextCaptures, challenge);
      return;
    }
    setCurrentIndex(index => index + 1);
    setNeedsCenterReset(true);
    window.setTimeout(() => { captureLockRef.current = false; }, 450);
  }, [captures, challenge, currentIndex, submit]);

  useEffect(() => {
    if (step !== 'camera' || !cameraReady || !modelReady || !challenge || !action) return;
    const analyze = () => {
      const video = webcamRef.current?.video;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(analyze);
        return;
      }
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.faceLandmarks[0];
        const matrix = result.facialTransformationMatrixes[0];
        if (!landmarks || !matrix) {
          stableFramesRef.current = 0;
          setGuidance('noFace');
        } else {
          const xs = landmarks.map(point => point.x);
          const ys = landmarks.map(point => point.y);
          const width = Math.max(...xs) - Math.min(...xs);
          const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
          const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
          const positioned = width > 0.24 && width < 0.62
            && Math.abs(centerX - 0.5) < 0.12 && Math.abs(centerY - 0.5) < 0.16;
          const { pitch, yaw } = poseFromMatrix(matrix.data);
          const centered = Math.abs(yaw) < 10 && Math.abs(pitch) < 10;
          let matched = false;
          if (positioned) {
            if (needsCenterReset) matched = centered;
            else if (action === 'CENTER') matched = centered;
            // MediaPipe analyzes the unmirrored video frame while Webcam is
            // displayed as a mirror, so UI left/right use the opposite yaw sign.
            else if (action === 'TURN_LEFT') matched = yaw < -15;
            else if (action === 'TURN_RIGHT') matched = yaw > 15;
            else if (action === 'LOOK_UP') matched = pitch > 10;
            else if (action === 'LOOK_DOWN') matched = pitch < -10;
          }

          if (!positioned) {
            stableFramesRef.current = 0;
            setGuidance('position');
          } else if (!matched) {
            stableFramesRef.current = 0;
            setGuidance(needsCenterReset ? 'hold' : 'move');
          } else {
            stableFramesRef.current += 1;
            setGuidance('hold');
            if (stableFramesRef.current >= REQUIRED_STABLE_FRAMES) {
              if (needsCenterReset) {
                stableFramesRef.current = 0;
                setNeedsCenterReset(false);
              } else {
                acceptFrame(action);
              }
            }
          }
        }
      } catch {
        stableFramesRef.current = 0;
      }
      animationRef.current = requestAnimationFrame(analyze);
    };
    animationRef.current = requestAnimationFrame(analyze);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [acceptFrame, action, cameraReady, challenge, modelReady, needsCenterReset, step]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    landmarkerRef.current?.close();
  }, []);

  const instructionKey = needsCenterReset
    ? 'faceVerify.actions.CENTER'
    : `faceVerify.actions.${action ?? 'CENTER'}`;
  const borderColor = guidance === 'hold' ? 'border-emerald-400' : 'border-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="dark-depth-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/70 dark:bg-night-850">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2"><ShieldCheck className="text-amber-400" size={20} /><span className="font-display font-bold">{t('faceVerify.title')}</span></div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6">
          {step === 'intro' && <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10"><Camera className="text-amber-400" size={28} /></div>
            <div><h3 className="font-display text-lg font-bold">{t('faceVerify.oneTimeTitle')}</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{resolvedDescription}</p></div>
            <ul className="space-y-2 text-left text-xs text-slate-600 dark:text-slate-300">
              <li>✓ {t('faceVerify.checklist.once')}</li><li>✓ {t('faceVerify.checklist.embedding')}</li><li>✓ {t('faceVerify.checklist.liveness')}</li>
            </ul>
            <button onClick={start} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-display font-bold text-[#6c4f00]"><Camera size={16} />{t('faceVerify.startCapture')}</button>
          </div>}

          {step === 'camera' && <div className="space-y-4">
            <div className="text-center"><p className="text-sm font-semibold text-amber-500">{t(instructionKey)}</p><p className="text-xs text-slate-500">{challenge ? `${Math.min(currentIndex + 1, 5)} / 5` : t('faceVerify.loadingChallenge')}</p></div>
            <div className="relative overflow-hidden rounded-xl bg-slate-900">
              <Webcam ref={webcamRef} audio={false} mirrored screenshotFormat="image/jpeg" screenshotQuality={0.9}
                videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                onUserMedia={() => setCameraReady(true)} onUserMediaError={() => setError(t('faceVerify.cameraAccessError'))} className="w-full" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className={`h-56 w-44 rounded-[50%] border-4 ${borderColor} transition-colors shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]`} />
              </div>
              {(!cameraReady || !modelReady || !challenge) && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-amber-400" /></div>}
            </div>
            <div className="flex gap-1">{[0, 1, 2, 3, 4].map(index => <div key={index} className={`h-1.5 flex-1 rounded ${index < captures.length ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'}`} />)}</div>
            <p className="text-center text-xs text-slate-500">{t(`faceVerify.guidance.${guidance}`)}</p>
            {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-500">{error}</div>}
            {!challenge && error && <button onClick={() => void loadChallenge()} className="w-full rounded-xl bg-amber-400 px-4 py-2 font-bold text-[#6c4f00]">{t('faceVerify.retry')}</button>}
          </div>}

          {step === 'submitting' && <div className="flex flex-col items-center gap-4 py-8 text-center"><Loader2 className="animate-spin text-amber-400" size={36} /><p className="text-sm">{t('faceVerify.verifying')}</p><p className="text-xs text-slate-500">{t('faceVerify.verifyingHint')}</p></div>}
          {step === 'success' && <div className="flex flex-col items-center gap-4 py-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10"><ShieldCheck className="text-emerald-400" size={32} /></div><div><p className="font-display font-bold text-emerald-500">{t('faceVerify.successTitle')}</p><p className="mt-1 text-xs text-slate-500">{resolvedSuccessMessage}</p></div></div>}
        </div>
      </div>
    </div>
  );
};
