import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
  Users
} from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/authApi';
import { loginWithGitHub } from '../api/authService';

interface SignInPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: User | null) => void;
}

const panelClassName = 'w-full max-w-xl rounded-[2rem] border border-amber-300/10 bg-[#241f15]/55 p-6 shadow-[0_0_40px_rgba(251,191,36,0.15)] backdrop-blur-2xl sm:p-8 lg:max-w-lg lg:p-10';
const labelClassName = 'mb-2 ml-1 block font-display text-sm font-semibold text-[#d3c5ac]';
const inputClassName = 'w-full rounded-2xl border border-[#4f4633] bg-[#201b11]/70 px-5 py-4 text-base text-[#ece1d1] outline-none transition placeholder:text-[#d3c5ac]/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60';
const socialButtonClassName = 'group flex items-center justify-center gap-3 rounded-2xl border border-[#4f4633] px-4 py-3.5 text-sm font-semibold text-[#ece1d1] transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60';

const featureItems = [
  { icon: ShieldCheck, title: 'AI Verification' },
  { icon: Sparkles, title: 'Publishing Wizard' },
  { icon: Store, title: 'Marketplace' },
  { icon: Users, title: 'Community' }
];

export const SignInPage: React.FC<SignInPageProps> = ({
  setCurrentScreen,
  setCurrentUser
}) => {
  const { signIn, loginWithGoogle, error: apiError, setError: clearApiError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oauthProvider, setOAuthProvider] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [viewMode, setViewMode] = useState<'signin' | 'forgot_email' | 'forgot_reset'>('signin');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const idToken = hashParams.get('id_token');
      if (idToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsOAuthLoading(true);
        setOAuthProvider('Google');
        clearApiError(null);
        setLocalError('');

        loginWithGoogle({ idToken })
          .then((user) => {
            setCurrentUser(user);
            setCurrentScreen('explore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          })
          .catch((err) => {
            setLocalError(err.message || 'Google authentication failed.');
          })
          .finally(() => {
            setIsOAuthLoading(false);
          });
      }
    }
  }, []);

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
    if (!password) {
      setLocalError('Password is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearApiError(null);
    setLocalError('');

    if (!validateFields()) return;

    setLoading(true);
    try {
      const user = await signIn({ email, password });
      setCurrentUser(user);
      setCurrentScreen('explore');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      // Error is stored in AuthContext and displayed.
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearApiError(null);
    setLocalError('');
    setResetSuccessMessage('');

    if (!forgotEmail) {
      setLocalError('Email Address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({ email: forgotEmail });
      if (response.success) {
        setResetSuccessMessage(response.message || 'OTP verification code sent to your email.');
        setTimeout(() => {
          setViewMode('forgot_reset');
          setLocalError('');
          setResetSuccessMessage('');
        }, 1500);
      } else {
        setLocalError(response.message || 'Failed to request password reset.');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearApiError(null);
    setLocalError('');
    setResetSuccessMessage('');

    if (!otpCode) {
      setLocalError('OTP Code is required.');
      return;
    }
    if (!newPassword) {
      setLocalError('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword({
        email: forgotEmail,
        otp: otpCode,
        newPassword,
        confirmPassword
      });
      if (response.success) {
        setResetSuccessMessage(response.message || 'Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          setViewMode('signin');
          setEmail(forgotEmail);
          setPassword('');
          setForgotEmail('');
          setOtpCode('');
          setNewPassword('');
          setConfirmPassword('');
          setResetSuccessMessage('');
          setLocalError('');
        }, 2000);
      } else {
        setLocalError(response.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || 'Failed to reset password.');
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
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
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
    setIsOAuthLoading(true);
    setOAuthProvider('GitHub');
    loginWithGitHub();
  };

  const displayError = localError || apiError;
  const isBusy = loading || isOAuthLoading;

  const renderStatusMessage = () => (
    <>
      {displayError && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
          {displayError}
        </div>
      )}

      {resetSuccessMessage && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
          {resetSuccessMessage}
        </div>
      )}
    </>
  );

  const renderOauthLoading = () => (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="rounded-full border border-amber-300/20 bg-amber-300/10 p-4">
        <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-xl font-bold text-[#ece1d1]">
          Authenticating with {oauthProvider}
        </p>
        <p className="text-sm text-[#d3c5ac]">
          Please wait while we complete your sign-in.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 animate-fade-in py-4 sm:py-8">
      <div className="grid items-center gap-8 lg:min-h-[72vh] lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:gap-12">
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-2xl space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
              Welcome to GodotLaunch
            </span>

            <div className="space-y-5">
              <h1 className="font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-6xl">
                Nơi Godot Developer <span className="text-amber-300">Xây Dựng</span>, Xuất Bản Và Kiếm Tiền
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-300">
                Nền tảng tối ưu để bán source code, asset và plugin cho cộng đồng Godot trên toàn thế giới.
              </p>
            </div>

            <div className="grid max-w-2xl grid-cols-2 gap-4 pt-2">
              {featureItems.map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/10 px-4 py-4 backdrop-blur-sm transition hover:border-amber-300/25 hover:bg-black/20"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                    <Icon size={20} />
                  </div>
                  <span className="font-display text-base font-semibold text-[#ece1d1]">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className={panelClassName}>
            {viewMode === 'signin' && (
              <>
                <div className="mb-8 text-center">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[#ece1d1] sm:text-4xl">
                    Đăng Nhập
                  </h2>
                  <p className="mt-3 text-sm text-[#d3c5ac] sm:text-base">
                    Tiếp tục hành trình phát triển của bạn.
                  </p>
                </div>

                {displayError && (
                  <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                    {displayError}
                  </div>
                )}

                {isOAuthLoading ? (
                  renderOauthLoading()
                ) : (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="signin-email" className={labelClassName}>
                          Email
                        </label>
                        <input
                          id="signin-email"
                          type="email"
                          placeholder="Nhập email của bạn"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isBusy}
                          className={inputClassName}
                          required
                        />
                      </div>

                      <div>
                        <div className="mb-2 ml-1 flex items-center justify-between gap-3">
                          <label htmlFor="signin-password" className="font-display text-sm font-semibold text-[#d3c5ac]">
                            Mật khẩu
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('forgot_email');
                              setLocalError('');
                              setResetSuccessMessage('');
                              setForgotEmail(email);
                            }}
                            className="text-sm font-medium text-amber-200 transition hover:text-amber-100 hover:underline"
                            disabled={isBusy}
                          >
                            Quên mật khẩu?
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            id="signin-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isBusy}
                            className={`${inputClassName} pr-14`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d3c5ac] transition hover:text-white"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            disabled={isBusy}
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <div className="ml-1 flex items-center">
                        <input
                          id="remember"
                          type="checkbox"
                          checked={keepSignedIn}
                          onChange={(e) => setKeepSignedIn(e.target.checked)}
                          disabled={isBusy}
                          className="h-5 w-5 rounded-md border-[#4f4633] bg-[#201b11] text-amber-300 focus:ring-amber-300/50"
                        />
                        <label htmlFor="remember" className="ml-3 text-sm text-[#d3c5ac]">
                          Ghi nhớ đăng nhập
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isBusy}
                        className="flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-bold text-[#402d00] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn size={18} />}
                        {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                      </button>
                    </form>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#241f15]/80 px-6 font-mono text-[11px] uppercase tracking-[0.3em] text-[#d3c5ac]">
                          Hoặc tiếp tục với
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isBusy}
                        className={socialButtonClassName}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#EA4335"
                            d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.5 5.5 0 0 1 8.5 13a5.5 5.5 0 0 1 5.49-5.514c2.25 0 4.3 1.157 5.507 3.014l3.18-3.18C20.468 4.965 16.7 3.5 14 3.5a9.5 9.5 0 0 0-9.5 9.5a9.5 9.5 0 0 0 9.5 9.5c5.688 0 9.5-4 9.5-9.5c0-.682-.07-1.32-.206-1.715z"
                          />
                        </svg>
                        <span>Google</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGitHubLogin}
                        disabled={isBusy}
                        className={socialButtonClassName}
                      >
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                          />
                        </svg>
                        <span>GitHub</span>
                      </button>
                    </div>

                    <div className="mt-8 text-center">
                      <p className="text-sm text-[#d3c5ac]">
                        Chưa có tài khoản?{' '}
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('signup')}
                          className="font-bold text-amber-200 transition hover:text-amber-100 hover:underline"
                          disabled={isBusy}
                        >
                          Tạo Tài Khoản
                        </button>
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {viewMode === 'forgot_email' && (
              <>
                <div className="mb-8 text-center">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[#ece1d1]">
                    Forgot Password
                  </h2>
                  <p className="mt-3 text-sm text-[#d3c5ac]">
                    Enter your email to receive a 6-digit OTP code.
                  </p>
                </div>

                <div className="space-y-4">
                  {renderStatusMessage()}

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="forgot-email" className={labelClassName}>
                        Email
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        placeholder="hero@pixel.land"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={loading}
                        className={inputClassName}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-bold text-[#402d00] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail size={18} />}
                      {loading ? 'Sending Code...' : 'Send Verification Code'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('signin');
                      setLocalError('');
                      setResetSuccessMessage('');
                    }}
                    className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#d3c5ac] transition hover:text-white"
                    disabled={loading}
                  >
                    <ArrowLeft size={16} />
                    Back to Sign In
                  </button>
                </div>
              </>
            )}

            {viewMode === 'forgot_reset' && (
              <>
                <div className="mb-8 text-center">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[#ece1d1]">
                    Reset Password
                  </h2>
                  <p className="mt-3 text-sm text-[#d3c5ac]">
                    Enter the OTP sent to <strong>{forgotEmail}</strong> and your new password.
                  </p>
                </div>

                <div className="space-y-4">
                  {renderStatusMessage()}

                  <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="otp-code" className={labelClassName}>
                        OTP Verification Code
                      </label>
                      <input
                        id="otp-code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        disabled={loading}
                        className={inputClassName}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="new-password" className={labelClassName}>
                        New Password
                      </label>
                      <input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={loading}
                        className={inputClassName}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className={labelClassName}>
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className={inputClassName}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-display text-lg font-bold text-[#402d00] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound size={18} />}
                      {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_email');
                      setLocalError('');
                      setResetSuccessMessage('');
                    }}
                    className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#d3c5ac] transition hover:text-white"
                    disabled={loading}
                  >
                    <ArrowLeft size={16} />
                    Back to Email Step
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
