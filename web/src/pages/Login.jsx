import React, { useState } from 'react';
import { User, Lock, Check, Code, Cloud } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center relative px-margin-mobile min-h-screen pt-24">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Login Frame */}
      <div className="relative w-full max-w-md p-8 md:p-10 rounded-lg bg-surface-container-lowest/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10">
        <div className="absolute inset-0 scanline opacity-30 pointer-events-none rounded-lg"></div>
        <div className="space-y-8 relative z-20">
          <header className="text-center space-y-2">
            <h1 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
              LOGIN
            </h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-[0.2em]">
              Authorized Access Only
            </p>
          </header>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="group">
                <div className="relative flex items-center">
                  <User className="absolute left-4 w-5 h-5 text-primary-container/70 group-focus-within:text-primary-container transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary-container focus:ring-1 focus:ring-primary-container py-4 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/40 rounded-lg transition-all outline-none shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
              <div className="group">
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-5 h-5 text-primary-container/70 group-focus-within:text-primary-container transition-colors" />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary-container focus:ring-1 focus:ring-primary-container py-4 pl-12 pr-4 text-on-surface font-body-md placeholder:text-on-surface-variant/40 rounded-lg transition-all outline-none shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-4 h-4 border border-outline-variant rounded bg-transparent checked:bg-primary-container checked:border-primary-container transition-all cursor-pointer"
                  />
                  <Check className="absolute pointer-events-none w-3 h-3 text-on-primary hidden peer-checked:block" strokeWidth={3} />
                </div>
                <span className="group-hover:text-primary-container transition-colors uppercase">
                  Remember Me
                </span>
              </label>
              <a href="#" className="hover:text-primary-container transition-colors uppercase tracking-wider">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-primary-container text-on-primary-fixed font-headline-md text-headline-md uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] active:scale-[0.98] transition-all relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
              LOGIN
            </button>
          </form>

            <div className="flex justify-center gap-6">
              <button
                type="button"
                title="Sign in with GitHub"
                className="p-3 bg-surface-container-high/40 border border-outline-variant/30 rounded-lg hover:border-secondary transition-all group cursor-pointer flex items-center justify-center"
              >
                <Code className="w-5 h-5 text-on-surface-variant group-hover:text-secondary transition-colors" />
              </button>
              <button
                type="button"
                title="Sign in with Cloud"
                className="p-3 bg-surface-container-high/40 border border-outline-variant/30 rounded-lg hover:border-secondary transition-all group cursor-pointer flex items-center justify-center"
              >
                <Cloud className="w-5 h-5 text-on-surface-variant group-hover:text-secondary transition-colors" />
              </button>
            </div>
            <p className="text-center font-label-sm text-label-sm text-on-surface-variant/50 mt-6">
              NO IDENTITY CORE FOUND?{' '}
              <Link to="/register" className="text-secondary hover:text-primary-container transition-colors tracking-widest uppercase">
                REGISTER
              </Link>
            </p>
          </div>
        </div>
    </main>
  );
}
