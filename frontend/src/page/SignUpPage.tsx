import React, { useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  BadgeCheck,
  Coins,
  Loader2,
  Rocket,
  UserPlus,
  Check,
  Upload,
  Globe,
  Grid
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { loginWithGitHub } from '../api/authService';
import { authApi } from '../api/authApi';
import { PROFILE_AVATAR_YOU, DEV_AVATARS } from '../../assets/images';

interface SignUpPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: User | null) => void;
  darkMode: boolean;
}

const PRESET_AVATARS = [
  PROFILE_AVATAR_YOU,
  DEV_AVATARS.gdsage,
  DEV_AVATARS.vectorvixen,
  DEV_AVATARS.pixelwizard,
  DEV_AVATARS.codemistress,
  DEV_AVATARS.assetlord,
  DEV_AVATARS.jammer1,
  DEV_AVATARS.jammer2,
  DEV_AVATARS.jammer3,
];

const panelClassName = 'launch-auth-panel relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_58px_rgba(148,163,184,0.16)] backdrop-blur-2xl dark:border-night-700/60 dark:bg-night-850/88 dark:shadow-[0_28px_80px_rgba(0,0,0,0.42),0_0_42px_rgba(251,191,36,0.055),inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-8 lg:max-w-xl lg:p-10';
const labelClassName = 'ml-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300';
const inputClassName = 'launch-control w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-700/70 dark:bg-night-950/65 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-300/70';
const socialButtonClassName = 'flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 transition hover:bg-white hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-700/60 dark:bg-night-900/65 dark:hover:border-slate-600 dark:hover:bg-night-800';

export const SignUpPage: React.FC<SignUpPageProps> = ({
  setCurrentScreen,
  setCurrentUser,
  darkMode,
}) => {
  const { t } = useTranslation(['auth']);
  const { signUp, error: apiError, setError: clearApiError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(PROFILE_AVATAR_YOU);
  const [avatarTab, setAvatarTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [otp, setOtp] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
  const isLocalDevRecaptchaBypass = !recaptchaSiteKey && (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  useEffect(() => {
    if (isLocalDevRecaptchaBypass) {
      setRecaptchaToken('local-dev-bypass');
      return;
    }

    if (!recaptchaSiteKey) {
      setRecaptchaToken(null);
    }
  }, [isLocalDevRecaptchaBypass, recaptchaSiteKey]);
  const featureItems = [
    {
      icon: BadgeCheck,
      title: t('auth:features.aiVerification'),
      description: t('auth:signup.featureDescriptions.aiVerification')
    },
    {
      icon: Rocket,
      title: t('auth:features.publishingWizard'),
      description: t('auth:signup.featureDescriptions.publishingWizard')
    },
    {
      icon: Coins,
      title: t('auth:features.fairRevenue'),
      description: t('auth:signup.featureDescriptions.fairRevenue')
    }
  ];
  const signupHeroTemplate = t('auth:signup.heroTitle', { highlight: '__HIGHLIGHT__' });
  const [signupHeroBefore, signupHeroAfter] = signupHeroTemplate.split('__HIGHLIGHT__');

  const handleSendOtp = async () => {
    clearApiError(null);
    setLocalError('');
    setSuccessMessage('');

    if (!email) {
      setLocalError(t('auth:validation.emailRequired'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError(t('auth:validation.invalidEmail'));
      return;
    }

    setOtpLoading(true);
    try {
      const res = await authApi.requestSignupOtp(email);
      if (res.success) {
        setIsEmailSent(true);
        setSuccessMessage(t('auth:messages.otpSent'));
      } else {
        setLocalError(res.message || t('auth:validation.otpSendFailed'));
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || t('auth:validation.otpSendFailed'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    clearApiError(null);
    setLocalError('');
    setSuccessMessage('');

    if (!otp) {
      setLocalError(t('auth:validation.otpRequired'));
      return;
    }

    setOtpLoading(true);
    try {
      const res = await authApi.verifySignupOtp(email, otp);
      if (res.success) {
        setIsEmailVerified(true);
        setSuccessMessage(t('auth:messages.otpVerifySuccess'));
      } else {
        setLocalError(res.message || t('auth:validation.otpInvalidOrExpired'));
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || t('auth:validation.otpInvalidOrExpired'));
    } finally {
      setOtpLoading(false);
    }
  };

  const validateFields = () => {
    if (!email) {
      setLocalError(t('auth:validation.emailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError(t('auth:validation.invalidEmail'));
      return false;
    }
    if (!isEmailVerified) {
      setLocalError(t('auth:validation.verifyOtpFirst'));
      return false;
    }
    if (!otp) {
      setLocalError(t('auth:validation.otpRequired'));
      return false;
    }
    if (!fullName) {
      setLocalError(t('auth:validation.fullNameRequired'));
      return false;
    }
    if (!password) {
      setLocalError(t('auth:validation.passwordRequired'));
      return false;
    }
    if (password.length < 6) {
      setLocalError(t('auth:validation.passwordMin'));
      return false;
    }
    if (!confirmPassword) {
      setLocalError(t('auth:validation.confirmPasswordRequired'));
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError(t('auth:validation.passwordMismatch'));
      return false;
    }
    if (!recaptchaToken) {
      setLocalError(t('auth:validation.recaptchaRequired'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearApiError(null);
    setLocalError('');
    setSuccessMessage('');

    if (!validateFields()) return;

    setLoading(true);
    try {
      await signUp({ email, password, confirmPassword, fullName, avatarUrl, otp, recaptchaToken: recaptchaToken! });
      setSuccessMessage(t('auth:messages.signupSuccess'));
      localStorage.setItem("signup_email", email);
      setTimeout(() => {
        setCurrentScreen('signin');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
    } catch (err: any) {
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    clearApiError(null);
    setLocalError('');
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setLocalError(t('auth:messages.googleConfigMissing'));
      return;
    }
    const redirectUri = window.location.origin + '/signin';
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=openid%20email%20profile` +
      `&nonce=godotlaunch_${Date.now()}`;
    window.location.href = authUrl;
  };

  const handleGitHubLogin = () => {
    clearApiError(null);
    setLocalError('');
    loginWithGitHub();
  };

  const displayError = localError || apiError;

  return (
    <div className="relative z-10 animate-fade-in py-4 sm:py-8">
      <div className="grid items-start gap-8 lg:min-h-[72vh] lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-12">
        <section className="hidden rounded-[2rem] border border-white/70 bg-white/65 p-8 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur-[3px] dark:border-night-700/50 dark:bg-night-950/68 dark:shadow-[0_28px_78px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.025)] lg:flex lg:flex-col lg:space-y-10">
          <div>
            <span className="mb-6 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-100/85 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">
              {t('auth:signup.memberBadge')}
            </span>
            <h1 className="mb-6 font-display text-5xl font-extrabold leading-tight text-slate-950 dark:text-white">
              {signupHeroBefore}
              <span className="text-amber-500 dark:text-amber-300">{t('auth:signup.heroHighlight')}</span>
              {signupHeroAfter}
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              {t('auth:signup.heroSubtitle')}
            </p>
          </div>

          <div className="grid gap-6">
            {featureItems.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="launch-raised launch-interactive flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/75 p-4 backdrop-blur-sm dark:border-night-700/45 dark:bg-night-850/75 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-500 dark:bg-amber-300/20 dark:text-amber-300">
                  <Icon size={22} />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {title}
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-8 border-t border-slate-200 pt-8 dark:border-white/10">
            <div>
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-300">10K+</div>
              <div className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">
                {t('auth:signup.stats.devs')}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-300">500K+</div>
              <div className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">
                {t('auth:signup.stats.assets')}
              </div>
            </div>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className={panelClassName}>
            <div className="absolute -right-24 -top-24 h-48 w-48 bg-amber-300/10 blur-[80px]" />

            <div className="relative z-10 mb-8 text-center">
              <h2 className="mb-2 font-display text-3xl font-extrabold text-slate-950 dark:text-slate-100 sm:text-4xl">
                {t('auth:signup.title')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                {t('auth:signup.subtitle')}
              </p>
            </div>

            {displayError && (
              <div className="relative z-10 mb-5 rounded-2xl border border-red-400/20 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-200">
                {displayError}
              </div>
            )}

            {successMessage && (
              <div className="relative z-10 mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {successMessage}
              </div>
            )}

            {!isEmailVerified ? (
              <div className="relative z-10 space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className={labelClassName}>
                    {t('auth:signup.emailLabel')}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isEmailSent || otpLoading}
                    className={inputClassName}
                    required
                  />
                </div>

                {isEmailSent && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label htmlFor="signup-otp" className={labelClassName}>
                      {t('auth:signup.otpLabel')}
                    </label>
                    <input
                      id="signup-otp"
                      type="text"
                      maxLength={6}
                      placeholder={t('auth:signup.otpPlaceholder')}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      disabled={otpLoading}
                      className="w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.5em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-night-700/70 dark:bg-night-950/65 dark:text-slate-100 dark:placeholder:text-slate-500"
                      required
                    />
                    <div className="flex justify-between items-center px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEmailSent(false)}
                        className="text-xs text-slate-500 transition hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400"
                        disabled={otpLoading}
                      >
                        {t('auth:signup.changeEmail')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs text-slate-500 transition hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400"
                        disabled={otpLoading}
                      >
                        {t('auth:signup.resendOtp')}
                      </button>
                    </div>
                  </div>
                )}

                {!isEmailSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-extrabold text-[#6c4f00] shadow-[0_0_20px_rgba(251,191,36,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(251,191,36,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otpLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket size={18} />}
                    {otpLoading ? t('auth:signup.sendingOtp') : t('auth:signup.sendOtp')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-extrabold text-[#6c4f00] shadow-[0_0_20px_rgba(251,191,36,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(251,191,36,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otpLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check size={18} />}
                    {otpLoading ? t('auth:signup.verifyingOtp') : t('auth:signup.verifyOtp')}
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative z-10 space-y-5 animate-fade-in">
                {/* Verified Email Indicator */}
                <div className="space-y-1.5">
                  <label className={labelClassName}>{t('auth:signup.verifiedEmail')}</label>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                    <span className="font-medium text-emerald-700 dark:text-emerald-200">{email}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                      <Check size={12} /> {t('auth:signup.verified')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-fullname" className={labelClassName}>
                    {t('auth:signup.fullNameLabel')}
                  </label>
                  <input
                    id="signup-fullname"
                    type="text"
                    placeholder={t('auth:signup.fullNamePlaceholder')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className={inputClassName}
                    required
                  />
                </div>

                {/* Avatar Selector Block */}
                <div className="space-y-2">
                  <label className={labelClassName}>{t('auth:signup.avatar.label')}</label>
                  
                  {/* Preview and Selection Info */}
                  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-night-700/55 dark:bg-night-900/70">
                    <img 
                      referrerPolicy="no-referrer"
                      src={avatarUrl} 
                      alt="Selected Avatar" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shrink-0"
                      onError={(event) => {
                        const fallbackUrl = PROFILE_AVATAR_YOU;
                        if (event.currentTarget.src !== fallbackUrl) {
                          event.currentTarget.src = fallbackUrl;
                        }
                        if (avatarUrl !== fallbackUrl) {
                          setAvatarUrl(fallbackUrl);
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{t('auth:signup.avatar.previewTitle')}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('auth:signup.avatar.previewHint')}</p>
                    </div>
                  </div>

                  {/* Tab Switch Controls */}
                  <div className="flex max-w-sm gap-1.5 rounded-lg border border-slate-200 bg-slate-100/90 p-1 dark:border-night-700/55 dark:bg-night-950/78">
                    <button
                      type="button"
                      onClick={() => setAvatarTab('presets')}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        avatarTab === 'presets' 
                          ? 'bg-amber-400 text-slate-900 font-bold' 
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                      }`}
                    >
                      <Grid size={11} /> {t('auth:signup.avatar.presets')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('upload')}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        avatarTab === 'upload' 
                          ? 'bg-amber-400 text-slate-900 font-bold' 
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                      }`}
                    >
                      {isUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} {t('auth:signup.avatar.upload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('url')}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        avatarTab === 'url' 
                          ? 'bg-amber-400 text-slate-900 font-bold' 
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                      }`}
                    >
                      <Globe size={11} /> {t('auth:signup.avatar.url')}
                    </button>
                  </div>

                  {/* Presets Grid */}
                  {avatarTab === 'presets' && (
                    <div className="grid max-w-md grid-cols-5 gap-2 rounded-xl border border-slate-200 bg-white/70 p-2 dark:border-night-700/45 dark:bg-night-950/55">
                      {PRESET_AVATARS.map((preset, index) => {
                        const isSelected = avatarUrl === preset;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setAvatarUrl(preset)}
                            className="relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 shrink-0"
                            style={{
                              borderColor: isSelected ? '#fbbf24' : 'transparent'
                            }}
                          >
                            <img
                              referrerPolicy="no-referrer"
                              src={preset}
                              alt={`Preset ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                if (event.currentTarget.src !== PROFILE_AVATAR_YOU) {
                                  event.currentTarget.src = PROFILE_AVATAR_YOU;
                                }
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Check className="text-amber-400" size={11} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Upload File */}
                  {avatarTab === 'upload' && (
                    <div className="relative rounded-xl border border-dashed border-slate-300 p-4 text-center transition-colors hover:border-amber-400/50 dark:border-white/20">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            setLocalError(t('auth:validation.invalidImageFile'));
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setLocalError(t('auth:validation.imageTooLarge'));
                            return;
                          }
                          setIsUploading(true);
                          setLocalError('');
                          try {
                            const res = await authApi.uploadAvatar(file);
                            if (res.success && res.data) {
                              setAvatarUrl(res.data);
                            } else {
                              setLocalError(res.message || t('auth:messages.uploadAvatarFailed'));
                            }
                          } catch (err: any) {
                            setLocalError(err.response?.data?.message || err.message || t('auth:messages.uploadAvatarFailed'));
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="mb-1 text-slate-500 dark:text-slate-400" size={14} />
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {isUploading ? t('auth:signup.avatar.uploading') : t('auth:signup.avatar.uploadPrompt')}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">{t('auth:signup.avatar.uploadHint')}</p>
                      </div>
                    </div>
                  )}

                  {/* Image URL Link */}
                  {avatarTab === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder={t('auth:signup.avatar.pasteLinkPlaceholder')}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-night-700/70 dark:bg-night-950/65 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customUrl) {
                            setAvatarUrl(customUrl);
                            setCustomUrl('');
                          }
                        }}
                        className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-slate-900 shrink-0"
                      >
                        {t('auth:signup.avatar.apply')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="signup-password" className={labelClassName}>
                      {t('auth:signup.passwordLabel')}
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className={inputClassName}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="signup-confirm-password" className={labelClassName}>
                      {t('auth:signup.confirmLabel')}
                    </label>
                    <input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className={inputClassName}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 py-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-300 dark:border-white/10 dark:bg-white/5 dark:text-amber-300"
                  />
                  <label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('auth:signup.termsPrefix')}{' '}
                    <span className="text-amber-300 hover:underline">{t('auth:signup.termsOfUse')}</span> {t('auth:signup.and')}{' '}
                    <span className="text-amber-300 hover:underline">{t('auth:signup.privacy')}</span>.
                  </label>
                </div>

                <div className="flex justify-center">
                  {recaptchaSiteKey ? (
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={recaptchaSiteKey}
                      onChange={(token) => setRecaptchaToken(token)}
                      onExpired={() => setRecaptchaToken(null)}
                      theme={darkMode ? 'dark' : 'light'}
                    />
                  ) : isLocalDevRecaptchaBypass ? null : (
                    <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {t('auth:signup.missingRecaptcha')}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !recaptchaToken}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-extrabold text-[#6c4f00] shadow-[0_0_20px_rgba(251,191,36,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(251,191,36,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus size={18} />}
                  {loading ? t('auth:signup.submitting') : t('auth:signup.submit')}
                </button>
              </form>
            )}

            <div className="relative z-10 mb-6 mt-8 flex items-center gap-4">
              <div className="h-px flex-grow bg-slate-200 dark:bg-white/10" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {t('auth:signup.orSignupWith')}
              </span>
              <div className="h-px flex-grow bg-slate-200 dark:bg-white/10" />
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={loading}
                className={socialButtonClassName}
              >
                <svg className="h-5 w-5 fill-current text-slate-700 dark:text-white/80" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  />
                </svg>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">GitHub</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={socialButtonClassName}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.5 5.5 0 0 1 8.5 13a5.5 5.5 0 0 1 5.49-5.514c2.25 0 4.3 1.157 5.507 3.014l3.18-3.18C20.468 4.965 16.7 3.5 14 3.5a9.5 9.5 0 0 0-9.5 9.5a9.5 9.5 0 0 0 9.5 9.5c5.688 0 9.5-4 9.5-9.5c0-.682-.07-1.32-.206-1.715z"
                  />
                </svg>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Google</span>
              </button>
            </div>

            <div className="relative z-10 mt-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t('auth:signup.hasAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('signin');
                  }}
                  className="font-bold text-amber-300 hover:underline"
                  disabled={loading}
                >
                  {t('auth:signup.signIn')}
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
