import React, { useEffect, useState } from 'react';
import { CheckCircle2, Github, ScanFace, FileText, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { FaceVerifyModal } from '../components/FaceVerifyModal';
import KycOcrModal from '../components/KycOcrModal';
import { BecomeDeveloperLanding } from '../components/BecomeDeveloperLanding';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';
import { faceVerifyApi } from '../api/faceVerifyApi';
import { kycApi } from '../api/kycApi';
import { useAuth } from '../hooks/useAuth';
import { ScreenType } from '../types';

interface DeveloperOnboardingPageProps {
  setCurrentScreen: (screen: ScreenType) => void;
}

export const DeveloperOnboardingPage: React.FC<DeveloperOnboardingPageProps> = ({ setCurrentScreen }) => {
  const { currentUser } = useAuth();
  const [githubLinked, setGithubLinked] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  // Trang chào mừng (Fab-style) hiện mặc định; bỏ qua thẳng vào 3 bước nếu
  // user đã có tiến độ từ trước (không bắt xem lại landing mỗi lần quay lại).
  const [hasStarted, setHasStarted] = useState(false);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    setError(null);
    try {
      // allSettled: face-verify/kyc status đòi GitHub đã link ở backend, nên
      // với user hoàn toàn mới (chưa link) 2 request đó sẽ reject — đây là
      // trạng thái bình thường (chưa hoàn thành bước), không phải lỗi thật.
      const [githubRes, faceRes, kycRes] = await Promise.allSettled([
        userApi.getGitHubStatus(),
        faceVerifyApi.getStatus(),
        kycApi.getStatus(),
      ]);
      const linked =
        githubRes.status === 'fulfilled' && githubRes.value.success && githubRes.value.data
          ? githubRes.value.data.linked
          : false;
      const faceOk =
        faceRes.status === 'fulfilled' && faceRes.value.success && faceRes.value.data
          ? faceRes.value.data.faceVerified
          : false;
      const kycOk =
        kycRes.status === 'fulfilled' && kycRes.value.success && kycRes.value.data
          ? kycRes.value.data.kycVerified
          : false;
      setGithubLinked(linked);
      setFaceVerified(faceOk);
      setKycVerified(kycOk);
      if (linked || faceOk || kycOk) setHasStarted(true);

      // Chỉ hiện lỗi thật nếu chính request lấy trạng thái GitHub thất bại
      // (đây là request duy nhất không phụ thuộc điều kiện đã link trước đó).
      if (githubRes.status === 'rejected') {
        const err = githubRes.reason;
        setError(err?.response?.data?.message || err?.message || 'Không thể tải trạng thái xác minh.');
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLinkGitHub = async () => {
    setIsLinkingGithub(true);
    setError(null);
    try {
      const res = await authApi.prepareLink();
      if (res.success && res.data?.redirectUrl) {
        localStorage.setItem('github_link_pending', 'true');
        window.location.href = res.data.redirectUrl;
      } else {
        setError(res.message || 'Không thể bắt đầu liên kết GitHub.');
        setIsLinkingGithub(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể bắt đầu liên kết GitHub.');
      setIsLinkingGithub(false);
    }
  };

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.role === 'admin';
  const allDone = githubLinked && faceVerified && kycVerified;

  const steps = [
    {
      key: 'github',
      label: 'Liên kết GitHub',
      description: 'Kết nối tài khoản GitHub để nộp source code game.',
      done: githubLinked,
      icon: <Github size={18} />,
      action: (
        <Button variant="primary" size="sm" onClick={handleLinkGitHub} disabled={isLinkingGithub}>
          {isLinkingGithub ? 'Đang chuyển hướng...' : 'Liên kết GitHub'}
        </Button>
      ),
    },
    {
      key: 'face',
      label: 'Xác thực khuôn mặt',
      description: 'Quét khuôn mặt một lần duy nhất để chống spam tài khoản.',
      done: faceVerified,
      icon: <ScanFace size={18} />,
      action: (
        <Button variant="primary" size="sm" onClick={() => setShowFaceModal(true)} disabled={!githubLinked}>
          Bắt đầu xác thực
        </Button>
      ),
    },
    {
      key: 'kyc',
      label: 'Xác minh giấy tờ (KYC)',
      description: 'Upload CCCD/Hộ chiếu để xác định danh tính pháp lý.',
      done: kycVerified,
      icon: <FileText size={18} />,
      action: (
        <Button variant="primary" size="sm" onClick={() => setShowKycModal(true)} disabled={!githubLinked || !faceVerified}>
          Bắt đầu xác minh
        </Button>
      ),
    },
  ];

  const showLanding = !isLoadingStatus && !hasStarted && !allDone && !isDeveloper;

  return (
    <div
      className={
        showLanding
          ? 'animate-fade-in'
          : 'mx-auto max-w-2xl space-y-6 px-4 py-8 animate-fade-in sm:px-6 lg:px-8'
      }
    >
      {!showLanding && (
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Trở thành Developer</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Hoàn tất cả 3 bước dưới đây để được công nhận là Developer và có thể đăng tải game/asset lên GodotLaunch.
          </p>
        </div>
      )}

      {error && (
        <div className={showLanding ? 'px-4 sm:px-6 lg:px-8 mb-4' : ''}>
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        </div>
      )}

      {isLoadingStatus ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Đang tải trạng thái...
        </div>
      ) : showLanding ? (
        <BecomeDeveloperLanding onGetStarted={() => setHasStarted(true)} />
      ) : allDone || isDeveloper ? (
        <div className="rounded-3xl border border-emerald-300/70 bg-emerald-50 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Sparkles size={28} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
            Chúc mừng, bạn đã là Developer!
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Bạn có thể bắt đầu đăng tải game/asset lên Marketplace ngay bây giờ.
          </p>
          <Button variant="primary" size="md" className="mt-5" onClick={() => setCurrentScreen('dashboard')}>
            Về Dashboard
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.key}
              className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    step.done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {step.done ? <CheckCircle2 size={20} /> : step.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{step.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
                </div>
              </div>
              {step.done ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={14} /> Hoàn tất
                </span>
              ) : (
                step.action
              )}
            </div>
          ))}
        </div>
      )}

      {showFaceModal && (
        <FaceVerifyModal
          onSuccess={() => {
            setShowFaceModal(false);
            loadStatus();
          }}
          onClose={() => setShowFaceModal(false)}
          description="Đây là bước bắt buộc để trở thành Developer trên GodotLaunch, giúp đảm bảo mỗi người chỉ có một tài khoản developer."
          successMessage="Tiếp tục sang bước xác minh giấy tờ (KYC)..."
        />
      )}

      {showKycModal && (
        <KycOcrModal
          onSuccess={() => {
            setShowKycModal(false);
            loadStatus();
          }}
          onClose={() => setShowKycModal(false)}
          subtitle="Bước cuối cùng để trở thành Developer trên GodotLaunch"
          successDescription="Thông tin đã được lưu. Bạn sắp trở thành Developer..."
        />
      )}
    </div>
  );
};
