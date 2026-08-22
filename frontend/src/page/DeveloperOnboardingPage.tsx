import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Github, ScanFace, FileText, Sparkles, Loader2, ArrowLeft, ArrowRight, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { FaceVerifyModal } from '../components/FaceVerifyModal';
import KycOcrModal from '../components/KycOcrModal';
import { BecomeDeveloperLanding } from '../components/BecomeDeveloperLanding';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';
import { faceVerifyApi } from '../api/faceVerifyApi';
import { kycApi } from '../api/kycApi';
import { agreementApi } from '../api/agreementApi';
import { useAuth } from '../hooks/useAuth';
import { ScreenType } from '../types';
import { BANK_OPTIONS } from '../utils/bankOptions';
import { CustomSelect } from '../components/CustomSelect';

interface DeveloperOnboardingPageProps {
  setCurrentScreen: (screen: ScreenType) => void;
}

export const DeveloperOnboardingPage: React.FC<DeveloperOnboardingPageProps> = ({ setCurrentScreen }) => {
  const { loginWithToken } = useAuth();
  const { t } = useTranslation(['developer']);
  
  // Trạng thái các bước xác minh
  const [githubLinked, setGithubLinked] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);

  // Nội dung thỏa thuận tải từ DB
  const [agreementContent, setAgreementContent] = useState('');
  const [isLoadingAgreement, setIsLoadingAgreement] = useState(true);
  const [isAcceptingAgreement, setIsAcceptingAgreement] = useState(false);

  // Trạng thái chung
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [hasInitialNavigated, setHasInitialNavigated] = useState(false);

  // Modals & Forms
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Payout bank form
  const [kycFullName, setKycFullName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  // Tra cứu tên chủ tài khoản thật từ ngân hàng (VietQR) khi user gõ xong
  // ngân hàng + STK — best-effort, không chặn nếu tra cứu thất bại.
  const [isLookingUpAccount, setIsLookingUpAccount] = useState(false);
  const [lookupAccountName, setLookupAccountName] = useState<string | null>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);

  // Bước OTP xác nhận ngân hàng: sau khi validate + gửi OTP thành công,
  // chờ user nhập mã 6 số nhận qua email trước khi thật sự lưu.
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    setError(null);
    try {
      const [githubRes, faceRes, kycRes, agreementStatusRes] = await Promise.allSettled([
        userApi.getGitHubStatus(),
        faceVerifyApi.getStatus(),
        kycApi.getStatus(),
        agreementApi.getAcceptanceStatus(),
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
      const kycBank =
        kycRes.status === 'fulfilled' && kycRes.value.success
          ? kycRes.value.data
          : null;
      const agreementOk =
        agreementStatusRes.status === 'fulfilled' && agreementStatusRes.value.success && agreementStatusRes.value.data
          ? agreementStatusRes.value.data.accepted
          : false;

      setGithubLinked(linked);
      setFaceVerified(faceOk);
      setKycVerified(kycOk);
      setAgreementAccepted(agreementOk);

      const hasBank = !!kycBank?.bankName && !!kycBank?.bankAccount && !!kycBank?.bankAccountHolder;
      setPayoutSaved(hasBank);
      setKycFullName(kycBank?.fullName ?? '');
      setBankName(kycBank?.bankName ?? '');
      setBankAccount(kycBank?.bankAccount ?? '');
      setBankAccountHolder(kycBank?.bankAccountHolder ?? '');

      if (linked || faceOk || kycOk || hasBank || agreementOk) {
        setHasStarted(true);
      }

      if (githubRes.status === 'rejected') {
        const err = githubRes.reason;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t('onboarding.errors.loadStatus'),
        );
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadAgreementContent = async () => {
    setIsLoadingAgreement(true);
    try {
      const res = await agreementApi.getActive();
      if (res.success && res.data) {
        setAgreementContent(res.data.content);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t('onboarding.errors.loadAgreement'),
      );
    } finally {
      setIsLoadingAgreement(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadAgreementContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptAgreement = async () => {
    setIsAcceptingAgreement(true);
    setError(null);
    try {
      const res = await agreementApi.accept();
      if (res.success && res.data?.accepted) {
        setAgreementAccepted(true);
      } else {
        setError(res.message || t('onboarding.errors.acceptAgreement'));
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t('onboarding.errors.acceptAgreementFailed'),
      );
    } finally {
      setIsAcceptingAgreement(false);
    }
  };

  // Điều hướng thông minh đến bước chưa hoàn thành (Chỉ chạy 1 lần khi load status xong)
  useEffect(() => {
    if (!isLoadingStatus && hasStarted && !hasInitialNavigated) {
      if (!agreementAccepted) {
        setActiveStep(1);
      } else if (!githubLinked) {
        setActiveStep(2);
      } else if (!faceVerified) {
        setActiveStep(3);
      } else if (!kycVerified) {
        setActiveStep(4);
      } else if (!payoutSaved) {
        setActiveStep(5);
      }
      setHasInitialNavigated(true);
    }
  }, [isLoadingStatus, hasStarted, agreementAccepted, githubLinked, faceVerified, kycVerified, payoutSaved, hasInitialNavigated]);

  const handleLinkGitHub = async () => {
    setIsLinkingGithub(true);
    setError(null);
    try {
      const res = await authApi.prepareLink();
      if (res.success && res.data?.redirectUrl) {
        localStorage.setItem('github_link_pending', 'true');
        window.location.href = res.data.redirectUrl;
      } else {
        setError(res.message || t('onboarding.errors.startGithubLink'));
        setIsLinkingGithub(false);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('onboarding.errors.startGithubLink'),
      );
      setIsLinkingGithub(false);
    }
  };

  const normalizeNameForCompare = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  // Tự động tra cứu tên chủ tài khoản thật (VietQR) khi user gõ xong ngân
  // hàng + STK hợp lệ — debounce 600ms để không gọi API mỗi phím gõ. Chỉ
  // chạy khi chưa lưu (payoutSaved=false) và chưa đang ở bước nhập OTP.
  useEffect(() => {
    if (payoutSaved || otpSent) return;
    const normalizedAccount = bankAccount.trim();
    if (!bankName || !/^\d{6,19}$/.test(normalizedAccount)) {
      setLookupAccountName(null);
      setLookupAttempted(false);
      return;
    }

    let cancelled = false;
    setIsLookingUpAccount(true);
    setLookupAttempted(false);
    const timer = setTimeout(async () => {
      try {
        const res = await kycApi.lookupBankAccount(bankName, normalizedAccount);
        if (cancelled) return;
        const accountName = res.success ? res.data?.accountName ?? null : null;
        setLookupAccountName(accountName);
        // Tự điền tên nếu tra cứu được VÀ user chưa tự gõ tên nào khác —
        // không ghi đè nếu họ đang sửa tay dở.
        if (accountName && !bankAccountHolder.trim()) {
          setBankAccountHolder(accountName.toUpperCase());
        }
      } catch {
        if (!cancelled) setLookupAccountName(null);
      } finally {
        if (!cancelled) {
          setIsLookingUpAccount(false);
          setLookupAttempted(true);
        }
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankName, bankAccount, payoutSaved, otpSent]);

  const handleRequestPayoutOtp = async () => {
    const normalizedBankName = bankName.trim();
    const normalizedBankAccount = bankAccount.trim();
    const normalizedHolder = bankAccountHolder.trim();

    setPayoutError(null);
    if (!normalizedBankName || !normalizedBankAccount || !normalizedHolder) {
      setPayoutError(t('onboarding.payout.errors.required'));
      return;
    }
    if (!/^\d{6,30}$/.test(normalizedBankAccount)) {
      setPayoutError(t('onboarding.payout.errors.invalidAccount'));
      return;
    }
    if (!kycFullName) {
      setPayoutError(t('onboarding.payout.errors.missingKycName'));
      return;
    }
    if (normalizeNameForCompare(kycFullName) !== normalizeNameForCompare(normalizedHolder)) {
      setPayoutError(t('onboarding.payout.errors.holderMismatch'));
      return;
    }

    setIsSavingPayout(true);
    try {
      const res = await kycApi.requestBankOtp({
        bankName: normalizedBankName,
        bankAccount: normalizedBankAccount,
        bankAccountHolder: normalizedHolder,
      });
      if (!res.success) {
        setPayoutError(res.message || t('onboarding.payout.errors.saveFailed'));
        return;
      }

      // Chốt lại giá trị đã validate — dùng đúng chúng ở bước confirm OTP,
      // tránh user sửa form giữa lúc đang chờ nhập mã.
      setBankName(normalizedBankName);
      setBankAccount(normalizedBankAccount);
      setBankAccountHolder(normalizedHolder);
      setOtpCode('');
      setOtpSent(true);
    } catch (err: any) {
      setPayoutError(
        err?.response?.data?.message ||
          err?.message ||
          t('onboarding.payout.errors.saveFailed'),
      );
    } finally {
      setIsSavingPayout(false);
    }
  };

  const handleConfirmPayoutOtp = async () => {
    setPayoutError(null);
    const normalizedOtp = otpCode.trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      setPayoutError(t('onboarding.payout.errors.invalidOtp'));
      return;
    }

    setIsConfirmingOtp(true);
    try {
      const res = await kycApi.confirmBankOtp({
        bankName,
        bankAccount,
        bankAccountHolder,
        otp: normalizedOtp,
      });
      if (!res.success || !res.data) {
        setPayoutError(res.message || t('onboarding.payout.errors.saveFailed'));
        return;
      }

      setBankName(res.data.bankName ?? bankName);
      setBankAccount(res.data.bankAccount ?? bankAccount);
      setBankAccountHolder(res.data.bankAccountHolder ?? bankAccountHolder);
      setPayoutSaved(true);
      setOtpSent(false);
      setOtpCode('');

      if (res.data.token) {
        try {
          await loginWithToken(res.data.token);
        } catch (tokenErr) {
          console.error('Failed to apply refreshed developer session token', tokenErr);
        }
      }
    } catch (err: any) {
      setPayoutError(
        err?.response?.data?.message ||
          err?.message ||
          t('onboarding.payout.errors.saveFailed'),
      );
    } finally {
      setIsConfirmingOtp(false);
    }
  };

  const handleChangePayoutBankInfo = () => {
    // Quay lại chỉnh form (STK/tên ngân hàng nhập sai) — hủy OTP đang chờ,
    // yêu cầu bấm gửi lại mã sau khi sửa xong.
    setOtpSent(false);
    setOtpCode('');
    setPayoutError(null);
  };

  const allDone = githubLinked && faceVerified && kycVerified && payoutSaved;

  const showLanding = !isLoadingStatus && !hasStarted && !allDone;

  // Cấu hình các bước để render progress bar
  const stepConfigs = [
    { id: 1, name: 'Agreement', done: agreementAccepted, label: t('onboarding.steps.agreement') },
    { id: 2, name: 'GitHub', done: githubLinked, label: t('onboarding.steps.github') },
    { id: 3, name: 'FaceID', done: faceVerified, label: t('onboarding.steps.faceId') },
    { id: 4, name: 'KYC', done: kycVerified, label: t('onboarding.steps.kyc') },
    { id: 5, name: 'Payout', done: payoutSaved, label: t('onboarding.steps.payout') },
  ];

  // Kiểm tra điều kiện có thể click "Next"
  const isStepCompleted = (step: number) => {
    switch (step) {
      case 1: return agreementAccepted;
      case 2: return githubLinked;
      case 3: return faceVerified;
      case 4: return kycVerified;
      case 5: return payoutSaved;
      default: return false;
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="developer-onboarding-canvas flex h-[70vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <p className="text-sm font-semibold tracking-wide">{t('onboarding.loadingStatus')}</p>
      </div>
    );
  }

  if (showLanding) {
    return <BecomeDeveloperLanding onGetStarted={() => { setHasStarted(true); }} />;
  }

  return (
    <div className="developer-onboarding-canvas min-h-screen px-4 py-8 text-slate-950 dark:text-white sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in">
        
        {/* PROGRESS BAR (Giao diện giống FAB Unreal Engine) */}
        <div className="developer-onboarding-surface relative mb-8 overflow-x-auto rounded-[22px] border p-5 sm:mb-10 sm:p-6">
          <div className="flex min-w-[620px] items-center justify-between sm:min-w-0">
          {stepConfigs.map((step, idx) => {
            const isCompleted = step.done;
            const isActive = activeStep === step.id;
            const isPrevCompleted = idx === 0 || stepConfigs[idx - 1].done;

            return (
              <React.Fragment key={step.id}>
                {/* Dây nối */}
                {idx > 0 && (
                  <div className="relative mx-2 h-0.5 flex-1 bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                        isCompleted || (isActive && isPrevCompleted) ? 'bg-lime-500 w-full' : 'bg-slate-800 w-0'
                      }`}
                    />
                  </div>
                )}
                
                {/* Nút giai đoạn */}
                <div
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => {
                    if (step.id <= activeStep || stepConfigs[step.id - 2]?.done) {
                      setActiveStep(step.id);
                    }
                  }}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-lime-500 text-[#0c0c0e]'
                        : isActive
                        ? 'bg-amber-500 text-[#0c0c0e] ring-4 ring-amber-500/20'
                        : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : step.id}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold tracking-wider uppercase transition-all duration-300 ${
                      isCompleted
                        ? 'text-lime-500'
                        : isActive
                        ? 'text-amber-500'
                        : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
          </div>
        </div>

        {/* CONTAINER NỘI DUNG CHÍNH */}
        <div className="developer-onboarding-surface relative min-h-[420px] rounded-[24px] border p-5 sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-300/50 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
              {error}
            </div>
          )}

          {allDone ? (
            /* HOÀN TẤT THÀNH CÔNG */
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime-500/10 text-lime-500">
                <Sparkles size={40} />
              </div>
              <h2 className="mt-6 font-display text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {t('onboarding.complete.title')}
              </h2>
              <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400">
                {t('onboarding.complete.description')}
              </p>
              <Button variant="primary" size="lg" className="mt-8 bg-lime-500 hover:bg-lime-400 text-black font-bold" onClick={() => setCurrentScreen('dashboard')}>
                {t('onboarding.complete.cta')}
              </Button>
            </div>
          ) : (
            /* NỘI DUNG CHI TIẾT TỪNG BƯỚC */
            <div className="animate-fade-in">
              {/* STEP 1: AGREEMENT */}
              {activeStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t('onboarding.stepLabel', { step: 1 })}</span>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t('onboarding.agreement.title')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('onboarding.agreement.description')}</p>
                  </div>

                  <div className="developer-onboarding-inset rounded-2xl border p-4">
                    {isLoadingAgreement ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 size={16} className="animate-spin" /> {t('onboarding.agreement.loading')}
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto pr-2 text-xs leading-relaxed text-slate-600 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent dark:text-slate-400 dark:scrollbar-thumb-slate-800">
                        {agreementContent.split('\n\n').map((para, i) => (
                          <p key={i} className="mb-3">{para}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="developer-onboarding-inset flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition hover:border-amber-400/45 dark:hover:border-amber-400/25">
                    <input
                      type="checkbox"
                      checked={agreementAccepted}
                      disabled={isAcceptingAgreement || isLoadingAgreement}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleAcceptAgreement();
                        } else {
                          setAgreementAccepted(false);
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {t('onboarding.agreement.checkbox')}
                      {isAcceptingAgreement && (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                          <Loader2 size={12} className="animate-spin" /> {t('onboarding.agreement.saving')}
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* STEP 2: LINK GITHUB */}
              {activeStep === 2 && (
                <div className="space-y-6 text-center py-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t('onboarding.stepLabel', { step: 2 })}</span>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t('onboarding.github.title')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('onboarding.github.description')}</p>
                  </div>

                  {githubLinked ? (
                    <div className="mx-auto flex max-w-md animate-fade-in flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('onboarding.github.linkedTitle')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{t('onboarding.github.linkedDescription')}</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="developer-onboarding-inset rounded-full border p-6">
                          <Github className="w-16 h-16 text-slate-900 dark:text-white" />
                        </div>
                      </div>
                      <p className="px-4 text-xs text-slate-600 dark:text-slate-400">
                        {t('onboarding.github.permissionHint')}
                      </p>
                      <Button
                        variant="outline"
                        className="mx-auto flex items-center justify-center gap-2 border-slate-300 bg-white/75 font-bold text-slate-900 hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/65 dark:text-white dark:hover:bg-slate-800"
                        onClick={handleLinkGitHub}
                        disabled={isLinkingGithub}
                      >
                        {isLinkingGithub ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {t('onboarding.github.redirecting')}
                          </>
                        ) : (
                          <>
                            <Github size={18} /> {t('onboarding.github.action')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: FACEID */}
              {activeStep === 3 && (
                <div className="space-y-6 text-center py-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t('onboarding.stepLabel', { step: 3 })}</span>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t('onboarding.face.title')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('onboarding.face.description')}</p>
                  </div>

                  {faceVerified ? (
                    <div className="mx-auto flex max-w-md animate-fade-in flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('onboarding.face.verifiedTitle')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{t('onboarding.face.verifiedDescription')}</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="developer-onboarding-inset rounded-full border p-6">
                          <ScanFace className="w-16 h-16 text-amber-500" />
                        </div>
                      </div>
                      <p className="px-4 text-xs text-slate-600 dark:text-slate-400">
                        {t('onboarding.face.hint')}
                      </p>
                      <Button
                        variant="primary"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 mx-auto"
                        onClick={() => setShowFaceModal(true)}
                      >
                        <ScanFace size={18} /> {t('onboarding.face.action')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: KYC */}
              {activeStep === 4 && (
                <div className="space-y-6 text-center py-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t('onboarding.stepLabel', { step: 4 })}</span>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t('onboarding.kyc.title')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('onboarding.kyc.description')}</p>
                  </div>

                  {kycVerified ? (
                    <div className="mx-auto flex max-w-md animate-fade-in flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('onboarding.kyc.verifiedTitle')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{t('onboarding.kyc.verifiedDescription')}</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="developer-onboarding-inset rounded-full border p-6">
                          <FileText className="w-16 h-16 text-amber-500" />
                        </div>
                      </div>
                      <p className="px-4 text-xs text-slate-600 dark:text-slate-400">
                        {t('onboarding.kyc.hint')}
                      </p>
                      <Button
                        variant="primary"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 mx-auto"
                        onClick={() => setShowKycModal(true)}
                      >
                        <FileText size={18} /> {t('onboarding.kyc.action')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: PAYOUT SETUP */}
              {activeStep === 5 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t('onboarding.stepLabel', { step: 5 })}</span>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t('onboarding.payout.title')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('onboarding.payout.description')}</p>
                  </div>

                  <div className="developer-onboarding-inset mx-auto max-w-xl space-y-4 rounded-2xl border p-5 sm:p-6">
                    {payoutSaved ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4 dark:border-slate-700/70 dark:bg-slate-900/55">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                              {t('onboarding.payout.bankName')}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{bankName}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4 dark:border-slate-700/70 dark:bg-slate-900/55">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                              {t('onboarding.payout.bankAccount')}
                            </div>
                            <div className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">{bankAccount}</div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200/90 bg-white/80 p-4 dark:border-slate-700/70 dark:bg-slate-900/55">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                            {t('onboarding.payout.bankHolder')}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{bankAccountHolder}</div>
                        </div>
                        <div className="flex animate-fade-in items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{t('onboarding.payout.saved')}</span>
                        </div>
                      </>
                    ) : otpSent ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">
                          {t('onboarding.payout.otp.hint', { bankName, bankAccount })}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('onboarding.payout.otp.codeLabel')} <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={otpCode}
                            onChange={(event) => {
                              setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                              setPayoutError(null);
                            }}
                            placeholder={t('onboarding.payout.otp.codePlaceholder')}
                            maxLength={6}
                            disabled={isConfirmingOtp}
                            className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-center text-lg font-mono font-bold tracking-[0.5em] text-slate-900 outline-none transition placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:font-normal focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-600"
                          />
                        </div>

                        {payoutError && (
                          <div className="flex items-start gap-2 rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{payoutError}</span>
                          </div>
                        )}

                        <Button
                          variant="primary"
                          className="w-full bg-amber-500 font-bold text-black hover:bg-amber-400"
                          onClick={handleConfirmPayoutOtp}
                          disabled={isConfirmingOtp}
                        >
                          {isConfirmingOtp ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('onboarding.payout.otp.confirming')}
                            </span>
                          ) : t('onboarding.payout.otp.confirm')}
                        </Button>

                        <div className="flex items-center justify-between gap-3 text-xs">
                          <button
                            type="button"
                            onClick={handleChangePayoutBankInfo}
                            disabled={isConfirmingOtp}
                            className="font-semibold text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700 disabled:opacity-60 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            {t('onboarding.payout.otp.changeInfo')}
                          </button>
                          <button
                            type="button"
                            onClick={handleRequestPayoutOtp}
                            disabled={isSavingPayout || isConfirmingOtp}
                            className="font-semibold text-amber-600 underline decoration-dotted underline-offset-2 hover:text-amber-500 disabled:opacity-60 dark:text-amber-400"
                          >
                            {isSavingPayout ? t('onboarding.payout.otp.resending') : t('onboarding.payout.otp.resend')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                          {t('onboarding.payout.hint', { name: kycFullName })}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('onboarding.payout.bankName')} <span className="text-rose-500">*</span>
                          </label>
                          <CustomSelect
                            value={bankName}
                            onChange={(val) => {
                              setBankName(val);
                              setPayoutError(null);
                            }}
                            options={[...BANK_OPTIONS]}
                            placeholder={t('onboarding.payout.bankPlaceholder')}
                            disabled={isSavingPayout}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('onboarding.payout.bankAccount')} <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={bankAccount}
                            onChange={(event) => {
                              setBankAccount(event.target.value);
                              setPayoutError(null);
                            }}
                            placeholder={t('onboarding.payout.bankAccountPlaceholder')}
                            maxLength={30}
                            disabled={isSavingPayout}
                            className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-600"
                          />
                          {isLookingUpAccount && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('onboarding.payout.lookup.checking')}
                            </div>
                          )}
                          {!isLookingUpAccount && lookupAttempted && lookupAccountName && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('onboarding.payout.lookup.found', { name: lookupAccountName })}
                            </div>
                          )}
                          {!isLookingUpAccount && lookupAttempted && !lookupAccountName && (
                            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                              {t('onboarding.payout.lookup.notFound')}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('onboarding.payout.bankHolder')} <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={bankAccountHolder}
                            onChange={(event) => {
                              setBankAccountHolder(event.target.value.toUpperCase());
                              setPayoutError(null);
                            }}
                            placeholder={t('onboarding.payout.bankHolderPlaceholder')}
                            maxLength={200}
                            disabled={isSavingPayout}
                            className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-600"
                          />
                        </div>

                        {payoutError && (
                          <div className="flex items-start gap-2 rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{payoutError}</span>
                          </div>
                        )}

                        <Button
                          variant="primary"
                          className="w-full bg-amber-500 font-bold text-black hover:bg-amber-400"
                          onClick={handleRequestPayoutOtp}
                          disabled={isSavingPayout}
                        >
                          {isSavingPayout ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('onboarding.payout.saving')}
                            </span>
                          ) : t('onboarding.payout.otp.sendCode')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        {!allDone && (
          <div className="developer-onboarding-surface mt-6 flex animate-fade-in flex-col gap-4 rounded-[22px] border p-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <button
              onClick={() => setCurrentScreen('explore')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white sm:w-auto"
            >
              <LogOut size={16} /> {t('onboarding.actions.exit')}
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white sm:flex-none"
              >
                <ArrowLeft size={16} /> {t('onboarding.actions.back')}
              </button>

              <button
                disabled={!isStepCompleted(activeStep) || activeStep === 5}
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-amber-500/10 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-30 sm:flex-none"
              >
                {t('onboarding.actions.continue')} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showFaceModal && (
        <FaceVerifyModal
          onSuccess={() => {
            setShowFaceModal(false);
            loadStatus();
            setActiveStep(4);
          }}
          onClose={() => setShowFaceModal(false)}
          description={t('onboarding.faceModalDescription')}
          successMessage={t('onboarding.faceModalSuccess')}
        />
      )}

      {showKycModal && (
        <KycOcrModal
          onSuccess={(status) => {
            setKycFullName(status.fullName);
            setPayoutError(null);
            setShowKycModal(false);
            loadStatus();
            setActiveStep(5);
          }}
          onClose={() => setShowKycModal(false)}
          subtitle={t('onboarding.kycModalSubtitle')}
          successDescription={t('onboarding.kycModalSuccess')}
        />
      )}
    </div>
  );
};
