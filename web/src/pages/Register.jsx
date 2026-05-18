import React, { useState } from 'react';
import { User, AtSign, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp!');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          fullName: fullName || username,
          email,
          password,
          confirmPassword,
          roleName: isDeveloper ? 'developer' : 'player',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại!');
      }

      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center relative px-margin-mobile min-h-screen pt-24 pb-12">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-[520px] rounded-lg border border-white/10 p-10 flex flex-col gap-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden z-10">
        {/* Decorative scanline effect */}
        <div className="absolute inset-0 scanline pointer-events-none opacity-20"></div>

        {/* Title Section */}
        <div className="relative z-20 space-y-2 text-center">
          <h1 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
            {t('register')}
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-[0.2em]">
            {t('registerDeveloperSubtitle')}
          </p>
        </div>

        {/* Registration Form */}
        <form className="relative z-20 flex flex-col gap-5" onSubmit={handleRegister}>
          
          {error && (
            <div className="p-3 bg-error-container/20 border border-error/50 text-error text-label-sm rounded-lg text-center font-mono uppercase tracking-wide">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-secondary-container/20 border border-secondary-container/50 text-secondary text-label-sm rounded-lg text-center font-mono uppercase tracking-wide">
              {success}
            </div>
          )}

          <div className="space-y-1.5 group">
            <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
              {t('username')}
            </label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              <User className="w-5 h-5 text-outline-variant mx-3 group-focus-within:text-primary-container transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('usernamePlaceholder')}
                autoComplete="off"
                disabled={loading}
                required
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 placeholder:text-outline-variant/40"
              />
            </div>
          </div>

          <div className="space-y-1.5 group">
            <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
              {t('fullName')}
            </label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              <User className="w-5 h-5 text-outline-variant mx-3 group-focus-within:text-primary-container transition-colors" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('fullNamePlaceholder')}
                autoComplete="off"
                disabled={loading}
                required
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 placeholder:text-outline-variant/40"
              />
            </div>
          </div>

          <div className="space-y-1.5 group">
            <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
              {t('email')}
            </label>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              <AtSign className="w-5 h-5 text-outline-variant mx-3 group-focus-within:text-primary-container transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                autoComplete="off"
                disabled={loading}
                required
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 placeholder:text-outline-variant/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 group">
              <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
                {t('password')}
              </label>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 pl-4 pr-10 placeholder:text-outline-variant/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-outline-variant hover:text-primary-container transition-colors focus:outline-none mr-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5 group">
              <label className="font-label-sm text-label-sm text-on-surface-variant/80 px-1">
                {t('confirm')}
              </label>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-0.5 transition-all duration-300 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface font-body-md py-3 pl-4 pr-10 placeholder:text-outline-variant/40"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-2 text-outline-variant hover:text-primary-container transition-colors focus:outline-none mr-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Developer Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-container/50 border border-outline-variant/20 rounded-lg mt-2">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-primary-fixed">
                {t('registerAsDeveloper')}
              </span>
              <span className="text-[10px] text-on-surface-variant/60 font-mono">
                {t('registerDeveloperSubtitle')}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isDeveloper}
                onChange={(e) => setIsDeveloper(e.target.checked)}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-container"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-4 bg-primary-container text-on-primary-fixed font-headline-md text-headline-md uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] active:scale-[0.98] transition-all relative overflow-hidden group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
            {loading ? 'Đang đăng ký...' : t('register')}
          </button>

          <p className="text-center font-label-sm text-label-sm text-on-surface-variant/50 mt-4">
            {t('alreadySynchronized')}{' '}
            <Link to="/login" className="text-secondary hover:text-primary-container transition-colors tracking-widest uppercase">
              {t('loginPortal')}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
