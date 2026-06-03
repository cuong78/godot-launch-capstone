import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { User } from '../types';

interface SignUpPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: User | null) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  setCurrentScreen,
  setCurrentUser
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    // Simulate user sign up
    const isAdmin = email.toLowerCase().includes('admin') || username.toLowerCase().includes('admin');
    const mockUser: User = {
      username: username,
      email: email,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80`, // default premium avatar
      role: isAdmin ? 'admin' : 'user'
    };
    setCurrentUser(mockUser);
    setCurrentScreen('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOAuthLogin = (provider: string) => {
    const mockUser: User = {
      username: `${provider}User`,
      email: `${provider.toLowerCase()}@example.com`,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80`,
      role: 'user'
    };
    setCurrentUser(mockUser);
    setCurrentScreen('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-md mx-auto my-16 animate-fade-in relative z-10">
      <div className="bg-white/80 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 shadow-2xl rounded-2xl p-8 space-y-6">
        
        {/* Amber brand accent line */}
        <div className="w-12 h-1 bg-amber-400 rounded mx-auto" />

        <div className="text-center space-y-1.5">
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Join the Community</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Start your indie gaming adventure today.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            placeholder="PixelPioneer"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="hello@indiedev.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button 
            variant="primary" 
            size="md" 
            type="submit" 
            className="w-full justify-center mt-2 font-display"
            icon={<UserPlus size={16} />}
          >
            Create Account
          </Button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-mono tracking-wider">Or join with</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleOAuthLogin('Google')}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-studio"
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
            onClick={() => handleOAuthLogin('Discord')}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-studio"
          >
            {/* Discord SVG Icon */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65.78,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,72.56,0c.85.71,1.75,1.39,2.65,2a68.4,68.4,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.22-18.83C129.87,49.7,123.63,26.9,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
            </svg>
            Discord
          </button>
        </div>

        <div className="text-center pt-2 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already a member?{' '}
            <button
              onClick={() => { setCurrentScreen('signin'); }}
              className="text-amber-500 hover:underline font-bold"
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
