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
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { loginWithGitHub } from '../api/authService';
import { authApi } from '../api/authApi';
import { PROFILE_AVATAR_YOU, DEV_AVATARS } from '../../assets/images';

interface SignUpPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: User | null) => void;
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

const panelClassName = 'relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#17130a]/70 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 lg:max-w-xl lg:p-10';
const labelClassName = 'ml-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-[#d3c5ac]';
const inputClassName = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#ece1d1] outline-none transition placeholder:text-[#d3c5ac]/30 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60';
const socialButtonClassName = 'flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60';

const featureItems = [
  {
    icon: BadgeCheck,
    title: 'AI Verification',
    description: 'Hệ thống xác thực mã nguồn tự động đảm bảo chất lượng tuyệt đối.'
  },
  {
    icon: Rocket,
    title: 'Publishing Wizard',
    description: 'Quy trình xuất bản 3 bước đơn giản giúp sản phẩm của bạn sớm lên kệ.'
  },
  {
    icon: Coins,
    title: 'Doanh Thu Công Bằng',
    description: 'Tỷ lệ chia sẻ doanh thu tốt nhất thị trường cho nhà phát triển.'
  }
];

export const SignUpPage: React.FC<SignUpPageProps> = ({
  setCurrentScreen,
  setCurrentUser
}) => {
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

  const handleSendOtp = async () => {
    clearApiError(null);
    setLocalError('');
    setSuccessMessage('');

    if (!email) {
      setLocalError('Email Address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await authApi.requestSignupOtp(email);
      if (res.success) {
        setIsEmailSent(true);
        setSuccessMessage('Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.');
      } else {
        setLocalError(res.message || 'Gửi mã OTP thất bại.');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || 'Gửi mã OTP thất bại.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    clearApiError(null);
    setLocalError('');
    setSuccessMessage('');

    if (!otp) {
      setLocalError('Mã OTP không được để trống.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await authApi.verifySignupOtp(email, otp);
      if (res.success) {
        setIsEmailVerified(true);
        setSuccessMessage('Xác thực OTP thành công! Vui lòng điền nốt thông tin đăng ký.');
      } else {
        setLocalError(res.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setOtpLoading(false);
    }
  };

  const validateFields = () => {
    if (!email) {
      setLocalError('Email Address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address.');
      return false;
    }
    if (!isEmailVerified) {
      setLocalError('Vui lòng xác thực mã OTP trước.');
      return false;
    }
    if (!otp) {
      setLocalError('OTP verification code is required.');
      return false;
    }
    if (!fullName) {
      setLocalError('Full Name is required.');
      return false;
    }
    if (!password) {
      setLocalError('Password is required.');
      return false;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return false;
    }
    if (!confirmPassword) {
      setLocalError('Please confirm your password.');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return false;
    }
    if (!recaptchaToken) {
      setLocalError('Vui lòng xác nhận reCAPTCHA.');
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
      setSuccessMessage('Account created successfully! Redirecting to sign in...');
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
      setLocalError('Google Client ID is not configured. Please check your .env file.');
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
        <section className="hidden lg:flex lg:flex-col lg:space-y-10 lg:py-8">
          <div>
            <span className="mb-6 inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
              ĐẶC QUYỀN THÀNH VIÊN
            </span>
            <h1 className="mb-6 font-display text-5xl font-extrabold leading-tight text-white">
              Xây Dựng <span className="text-amber-300">Di Sản</span> Godot Của Bạn.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-slate-300">
              Tham gia hệ sinh thái lớn nhất dành cho nhà phát triển Godot. Nơi tài năng gặp gỡ cơ hội.
            </p>
          </div>

          <div className="grid gap-6">
            {featureItems.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-300/20 text-amber-300">
                  <Icon size={22} />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#ece1d1]">
                    {title}
                  </h4>
                  <p className="mt-1 text-sm text-[#d3c5ac]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-8 border-t border-white/10 pt-8">
            <div>
              <div className="text-2xl font-bold text-amber-300">10K+</div>
              <div className="font-mono text-xs uppercase text-[#d3c5ac]">
                Devs
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-300">500K+</div>
              <div className="font-mono text-xs uppercase text-[#d3c5ac]">
                Assets
              </div>
            </div>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className={panelClassName}>
            <div className="absolute -right-24 -top-24 h-48 w-48 bg-amber-300/10 blur-[80px]" />

            <div className="relative z-10 mb-8 text-center">
              <h2 className="mb-2 font-display text-3xl font-extrabold text-[#ece1d1] sm:text-4xl">
                Tạo Tài Khoản
              </h2>
              <p className="text-sm text-[#d3c5ac]/80 sm:text-base">
                Tham gia GodotLaunch chỉ trong vài phút.
              </p>
            </div>

            {displayError && (
              <div className="relative z-10 mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                {displayError}
              </div>
            )}

            {successMessage && (
              <div className="relative z-10 mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
                {successMessage}
              </div>
            )}

            {!isEmailVerified ? (
              <div className="relative z-10 space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className={labelClassName}>
                    Email Đăng Ký
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
                      Mã Xác Thực OTP
                    </label>
                    <input
                      id="signup-otp"
                      type="text"
                      maxLength={6}
                      placeholder="Nhập mã 6 chữ số"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      disabled={otpLoading}
                      className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#ece1d1] outline-none transition placeholder:text-[#d3c5ac]/30 placeholder:tracking-normal focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      required
                    />
                    <div className="flex justify-between items-center px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEmailSent(false)}
                        className="text-xs text-[#d3c5ac]/70 hover:text-amber-400 transition"
                        disabled={otpLoading}
                      >
                        Thay đổi Email
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs text-[#d3c5ac]/70 hover:text-amber-400 transition"
                        disabled={otpLoading}
                      >
                        Gửi lại mã OTP
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
                    {otpLoading ? 'Đang gửi OTP...' : 'Nhận Mã OTP'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-extrabold text-[#6c4f00] shadow-[0_0_20px_rgba(251,191,36,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(251,191,36,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {otpLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check size={18} />}
                    {otpLoading ? 'Đang xác thực...' : 'Xác Thực OTP'}
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative z-10 space-y-5 animate-fade-in">
                {/* Verified Email Indicator */}
                <div className="space-y-1.5">
                  <label className={labelClassName}>Email Đã Xác Thực</label>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-[#ece1d1]">
                    <span className="font-medium text-emerald-200">{email}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                      <Check size={12} /> Verified
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-fullname" className={labelClassName}>
                    Họ Và Tên
                  </label>
                  <input
                    id="signup-fullname"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className={inputClassName}
                    required
                  />
                </div>

                {/* Avatar Selector Block */}
                <div className="space-y-2">
                  <label className={labelClassName}>Chọn Ảnh Đại Diện (Avatar)</label>
                  
                  {/* Preview and Selection Info */}
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3">
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
                      <p className="text-xs font-semibold text-[#ece1d1] truncate">Avatar Preview</p>
                      <p className="text-[10px] text-[#d3c5ac]/70">Chọn từ kho ảnh có sẵn, tải lên, hoặc dán link ảnh.</p>
                    </div>
                  </div>

                  {/* Tab Switch Controls */}
                  <div className="flex gap-1.5 bg-black/45 p-1 rounded-lg border border-white/5 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setAvatarTab('presets')}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        avatarTab === 'presets' 
                          ? 'bg-amber-400 text-slate-900 font-bold' 
                          : 'text-[#d3c5ac] hover:text-[#ece1d1]'
                      }`}
                    >
                      <Grid size={11} /> Có Sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('upload')}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        avatarTab === 'upload' 
                          ? 'bg-amber-400 text-slate-900 font-bold' 
                          : 'text-[#d3c5ac] hover:text-[#ece1d1]'
                      }`}
                    >
                      {isUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} Tải Lên
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('url')}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        avatarTab === 'url' 
                          ? 'bg-amber-400 text-slate-900 font-bold' 
                          : 'text-[#d3c5ac] hover:text-[#ece1d1]'
                      }`}
                    >
                      <Globe size={11} /> Link Ảnh
                    </button>
                  </div>

                  {/* Presets Grid */}
                  {avatarTab === 'presets' && (
                    <div className="grid grid-cols-5 gap-2 max-w-md p-2 bg-black/20 border border-white/5 rounded-xl">
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
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
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
                    <div className="border border-dashed border-white/20 rounded-xl p-4 text-center hover:border-amber-400/50 transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            setLocalError('Hãy chọn một file ảnh hợp lệ.');
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setLocalError('Dung lượng ảnh tối đa là 5MB.');
                            return;
                          }
                          setIsUploading(true);
                          setLocalError('');
                          try {
                            const res = await authApi.uploadAvatar(file);
                            if (res.success && res.data) {
                              setAvatarUrl(res.data);
                            } else {
                              setLocalError(res.message || 'Tải ảnh lên thất bại.');
                            }
                          } catch (err: any) {
                            setLocalError(err.response?.data?.message || err.message || 'Tải ảnh lên thất bại.');
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="text-[#d3c5ac] mb-1" size={14} />
                        <p className="text-[11px] text-[#d3c5ac]">
                          {isUploading ? 'Đang tải lên...' : 'Chọn file ảnh từ thiết bị'}
                        </p>
                        <p className="text-[9px] text-[#d3c5ac]/50">PNG, JPG tối đa 5MB</p>
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
                        placeholder="Dán link ảnh tại đây..."
                        className="flex-1 rounded-xl border border-white/10 bg-[#17130a] px-3 py-2 text-xs text-[#ece1d1] outline-none"
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
                        Áp Dụng
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="signup-password" className={labelClassName}>
                      Mật Khẩu
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
                      Xác Nhận
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
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-white/10 bg-white/5 text-amber-300 focus:ring-amber-300"
                  />
                  <label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-[#d3c5ac]">
                    Tôi đồng ý với{' '}
                    <span className="text-amber-300 hover:underline">Điều Khoản</span> và{' '}
                    <span className="text-amber-300 hover:underline">Bảo Mật</span>.
                  </label>
                </div>

                <div className="flex justify-center">
                  {recaptchaSiteKey ? (
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={recaptchaSiteKey}
                      onChange={(token) => setRecaptchaToken(token)}
                      onExpired={() => setRecaptchaToken(null)}
                      theme="dark"
                    />
                  ) : isLocalDevRecaptchaBypass ? null : (
                    <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      Thiếu `VITE_RECAPTCHA_SITE_KEY` nên không thể hoàn tất đăng ký.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !recaptchaToken}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-extrabold text-[#6c4f00] shadow-[0_0_20px_rgba(251,191,36,0.15)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(251,191,36,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus size={18} />}
                  {loading ? 'Creating Account...' : 'Tạo Tài Khoản'}
                </button>
              </form>
            )}

            <div className="relative z-10 mb-6 mt-8 flex items-center gap-4">
              <div className="h-px flex-grow bg-white/10" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d3c5ac]/50">
                Hoặc Đăng Ký Qua
              </span>
              <div className="h-px flex-grow bg-white/10" />
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={loading}
                className={socialButtonClassName}
              >
                <svg className="h-5 w-5 fill-current text-white/80" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  />
                </svg>
                <span className="text-sm font-semibold text-[#ece1d1]">GitHub</span>
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
                <span className="text-sm font-semibold text-[#ece1d1]">Google</span>
              </button>
            </div>

            <div className="relative z-10 mt-8 text-center">
              <p className="text-sm text-[#d3c5ac]">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('signin');
                  }}
                  className="font-bold text-amber-300 hover:underline"
                  disabled={loading}
                >
                  Đăng Nhập
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
