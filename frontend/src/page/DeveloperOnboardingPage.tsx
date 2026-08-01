import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Github, ScanFace, FileText, Sparkles, Loader2, CreditCard, ClipboardCheck, ArrowLeft, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
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

interface DeveloperOnboardingPageProps {
  setCurrentScreen: (screen: ScreenType) => void;
}

const BANK_OPTIONS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MBBank",
  "ACB",
  "Sacombank",
  "VPBank",
  "TPBank",
  "OCB",
  "SHB",
  "HDBank"
];

export const DeveloperOnboardingPage: React.FC<DeveloperOnboardingPageProps> = ({ setCurrentScreen }) => {
  const { currentUser, updateUser } = useAuth();
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

  // Payout bank form
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

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
      const agreementOk =
        agreementStatusRes.status === 'fulfilled' && agreementStatusRes.value.success && agreementStatusRes.value.data
          ? agreementStatusRes.value.data.accepted
          : false;

      setGithubLinked(linked);
      setFaceVerified(faceOk);
      setKycVerified(kycOk);
      setAgreementAccepted(agreementOk);

      const hasBank = !!currentUser?.bankName && !!currentUser?.bankAccount;
      setPayoutSaved(hasBank);

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

  // Đồng bộ hóa thông tin ngân hàng từ user profile
  useEffect(() => {
    if (currentUser) {
      if (currentUser.bankName) setBankName(currentUser.bankName);
      if (currentUser.bankAccount) setBankAccount(currentUser.bankAccount);
      if (currentUser.bankAccountHolder) setBankAccountHolder(currentUser.bankAccountHolder);
      if (currentUser.bankName && currentUser.bankAccount) {
        setPayoutSaved(true);
      }
    }
  }, [currentUser]);

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

  const handleSavePayout = async () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountHolder.trim()) {
      setError(t('onboarding.errors.bankInfoRequired'));
      return;
    }
    setIsSavingPayout(true);
    setError(null);
    try {
      const res = await userApi.updateProfile({
        fullName: currentUser?.fullName || '',
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      });
      if (res.success && res.data) {
        setPayoutSaved(true);
        updateUser(res.data);
      } else {
        setError(res.message || t('onboarding.errors.savePayout'));
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('onboarding.errors.savePayoutFailed'),
      );
    } finally {
      setIsSavingPayout(false);
    }
  };

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.role === 'admin';
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
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500 dark:bg-night-950 dark:text-slate-400">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <p className="text-sm font-semibold tracking-wide">{t('onboarding.loadingStatus')}</p>
      </div>
    );
  }

  if (showLanding) {
    return <BecomeDeveloperLanding onGetStarted={() => { setHasStarted(true); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-10 text-slate-950 dark:bg-night-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in">
        
        {/* PROGRESS BAR (Giao diện giống FAB Unreal Engine) */}
        <div className="dark-depth-card relative mb-12 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.16)] dark:border-slate-700/60 dark:bg-night-850 dark:shadow-2xl">
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

        {/* CONTAINER NỘI DUNG CHÍNH */}
        <div className="dark-depth-card relative min-h-[420px] rounded-3xl border border-slate-200/80 bg-white/92 p-8 shadow-[0_22px_60px_rgba(148,163,184,0.18)] dark:border-slate-700/60 dark:bg-night-850 dark:shadow-3xl">
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

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/5 dark:bg-black/40">
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

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white/90 p-4 transition hover:bg-slate-50 dark:border-white/5 dark:bg-slate-900/30 dark:hover:bg-slate-900/50">
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
                    <div className="mx-auto max-w-md rounded-2xl border border-lime-900/50 bg-lime-950/15 p-6 flex flex-col items-center gap-3 animate-fade-in">
                      <CheckCircle2 className="w-12 h-12 text-lime-500" />
                      <div className="text-sm font-semibold text-lime-400">{t('onboarding.github.linkedTitle')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{t('onboarding.github.linkedDescription')}</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full border border-slate-200 bg-slate-100 p-6 dark:border-white/5 dark:bg-slate-900">
                          <Github className="w-16 h-16 text-slate-900 dark:text-white" />
                        </div>
                      </div>
                      <p className="px-4 text-xs text-slate-600 dark:text-slate-400">
                        {t('onboarding.github.permissionHint')}
                      </p>
                      <Button
                        variant="primary"
                        className="bg-white hover:bg-slate-200 text-black font-bold flex items-center justify-center gap-2 mx-auto"
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
                    <div className="mx-auto max-w-md rounded-2xl border border-lime-900/50 bg-lime-950/15 p-6 flex flex-col items-center gap-3 animate-fade-in">
                      <CheckCircle2 className="w-12 h-12 text-lime-500" />
                      <div className="text-sm font-semibold text-lime-400">{t('onboarding.face.verifiedTitle')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{t('onboarding.face.verifiedDescription')}</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full border border-slate-200 bg-slate-100 p-6 dark:border-white/5 dark:bg-slate-900">
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
                    <div className="mx-auto max-w-md rounded-2xl border border-lime-900/50 bg-lime-950/15 p-6 flex flex-col items-center gap-3 animate-fade-in">
                      <CheckCircle2 className="w-12 h-12 text-lime-500" />
                      <div className="text-sm font-semibold text-lime-400">{t('onboarding.kyc.verifiedTitle')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{t('onboarding.kyc.verifiedDescription')}</div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full border border-slate-200 bg-slate-100 p-6 dark:border-white/5 dark:bg-slate-900">
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

                  <div className="dark-depth-inset mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-6 dark:border-slate-700/55 dark:bg-night-950/70">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-white/50">{t('onboarding.payout.bankName')}</label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-amber-400/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      >
                        <option value="" disabled className="bg-white text-slate-400 dark:bg-night-950 dark:text-slate-400">{t('onboarding.payout.bankPlaceholder')}</option>
                        {BANK_OPTIONS.map((bank) => (
                          <option key={bank} value={bank} className="bg-white text-slate-900 dark:bg-night-950 dark:text-white">{bank}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-white/50">{t('onboarding.payout.bankAccount')}</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder={t('onboarding.payout.bankAccountPlaceholder')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-amber-400/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-white/50">{t('onboarding.payout.bankHolder')}</label>
                      <input
                        type="text"
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                        placeholder={t('onboarding.payout.bankHolderPlaceholder')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-amber-400/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>

                    {payoutSaved ? (
                      <div className="rounded-xl border border-lime-900/50 bg-lime-950/20 px-4 py-3 text-xs text-lime-400 font-semibold flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{t('onboarding.payout.saved')}</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleSavePayout}
                        disabled={isSavingPayout}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2"
                      >
                        {isSavingPayout ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {t('onboarding.payout.saving')}
                          </>
                        ) : (
                          <>
                            <CreditCard size={18} /> {t('onboarding.payout.action')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        {!allDone && (
          <div className="dark-depth-card mt-8 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_48px_rgba(148,163,184,0.14)] animate-fade-in dark:border-slate-700/60 dark:bg-night-850 dark:shadow-2xl">
            <button
              onClick={() => setCurrentScreen('explore')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <LogOut size={16} /> {t('onboarding.actions.exit')}
            </button>

            <div className="flex gap-3">
              <button
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <ArrowLeft size={16} /> {t('onboarding.actions.back')}
              </button>

              <button
                disabled={!isStepCompleted(activeStep) || activeStep === 5}
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-extrabold shadow-lg shadow-amber-500/10"
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
          onSuccess={() => {
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
