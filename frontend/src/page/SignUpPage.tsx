import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';

interface SignUpPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: User | null) => void;
}

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

  const validateFields = () => {
    if (!fullName) {
      setLocalError('Full Name is required.');
      return false;
    }
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
      await signUp({ email, password, confirmPassword, fullName });
      setSuccessMessage('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        setCurrentScreen('signin');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
    } catch (err: any) {
      // Error is caught by AuthContext and displayed
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    clearApiError(null);
    setLocalError('');
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1013498846927-91l3g37oee1vdf4qg1n980p7m687a718.apps.googleusercontent.com';
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
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23ct413eH4t1v1D';
    const redirectUri = window.location.origin + '/signin';
    const authUrl = `https://github.com/login/oauth/authorize` +
      `?client_id=${githubClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=read:user,user:email`;
    window.location.href = authUrl;
  };

  const displayError = localError || apiError;

  return (
    <div className="max-w-md mx-auto my-16 animate-fade-in relative z-10">
      <div className="bg-white/80 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 shadow-2xl rounded-2xl p-8 space-y-6">
        
        {/* Amber brand accent line */}
        <div className="w-12 h-1 bg-amber-400 rounded mx-auto" />

        <div className="text-center space-y-1.5">
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Join the Community</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Start your indie gaming adventure today.</p>
        </div>

        {displayError && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-xs text-center font-medium">
            {displayError}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-green-500 text-xs text-center font-medium animate-pulse">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Aria Vance"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="hello@indiedev.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="•••••••• (Min. 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />

          <Button 
            variant="primary" 
            size="md" 
            type="submit" 
            className="w-full justify-center mt-2 font-display"
            icon={<UserPlus size={16} />}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-mono tracking-wider">Or join with</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-studio disabled:opacity-50"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.5 5.5 0 0 1 8.5 13a5.5 5.5 0 0 1 5.49-5.514c2.25 0 4.3 1.157 5.507 3.014l3.18-3.18C20.468 4.965 16.7 3.5 14 3.5a9.5 9.5 0 0 0-9.5 9.5a9.5 9.5 0 0 0 9.5 9.5c5.688 0 9.5-4 9.5-9.5c0-.682-.07-1.32-.206-1.715z"
              />
            </svg>
            Google
          </button>
          
          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-studio disabled:opacity-50"
          >
            {/* GitHub SVG Icon */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          GitHub
          </button>
        </div>

        <div className="text-center pt-2 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already a member?{' '}
            <button
              type="button"
              onClick={() => { setCurrentScreen('signin'); }}
              className="text-amber-500 hover:underline font-bold"
              disabled={loading}
            >
              Sign In
            </button>
          </p>
          <div className="text-[10px] bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-405 dark:text-slate-500 leading-relaxed font-mono">
            💡 <span className="font-semibold text-amber-500">Testing Tip:</span> Register with email/username containing <code className="text-sky-500">"admin"</code> to automatically gain administrator permissions.
          </div>
        </div>

      </div>
    </div>
  );
};
