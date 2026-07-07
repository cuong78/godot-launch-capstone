import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface GitHubCallbackPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: any) => void;
}

export const GitHubCallbackPage: React.FC<GitHubCallbackPageProps> = ({
  setCurrentScreen,
  setCurrentUser
}) => {
  const { loginWithToken } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkFlow, setIsLinkFlow] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const tokenParam = urlParams.get('token');
      const linkPending = localStorage.getItem("github_link_pending") === "true";
      setIsLinkFlow(linkPending);

      // Clear the query params from the URL bar immediately for security
      window.history.replaceState({}, document.title, window.location.pathname);

      if (errorParam) {
        localStorage.removeItem("github_link_pending");
        switch (errorParam) {
          case 'GL-4070':
            setErrorMsg('GitHub primary email does not match your registered email. Please use a GitHub account with matching email.');
            break;
          case 'GL-4071':
            setErrorMsg('This GitHub account is already linked to another user account.');
            break;
          case 'GL-4072':
            setErrorMsg('GitHub linking session not found or expired. Please try again from your profile.');
            break;
          case 'access_denied':
            setErrorMsg('GitHub login/linking cancelled by user.');
            break;
          default:
            setErrorMsg('GitHub authentication failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!tokenParam) {
        localStorage.removeItem("github_link_pending");
        setErrorMsg('GitHub login failed. No token returned.');
        setLoading(false);
        return;
      }

      try {
        const user = await loginWithToken(tokenParam);
        setCurrentUser(user);
        
        if (linkPending) {
          localStorage.removeItem("github_link_pending");
          localStorage.setItem("github_link_success", "true");
          setCurrentScreen('developer-onboarding');
        } else {
          setCurrentScreen('dashboard');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'GitHub login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [loginWithToken, setCurrentScreen, setCurrentUser]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-[2rem] border border-amber-300/10 bg-[#241f15]/55 p-8 shadow-[0_0_40px_rgba(251,191,36,0.15)] backdrop-blur-2xl text-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full border border-amber-300/20 bg-amber-300/10 p-4">
              <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#ece1d1]">
              Authenticating with GitHub
            </h2>
            <p className="text-sm text-[#d3c5ac]">
              Please wait while we establish your secure session...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center gap-6 py-6">
            <div className="rounded-full border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#ece1d1]">
              {isLinkFlow ? 'Linking Failed' : 'Login Failed'}
            </h2>
            <p className="text-sm text-red-200">
              {errorMsg}
            </p>
            <button
              onClick={() => setCurrentScreen(isLinkFlow ? 'profile' : 'signin')}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 font-display text-base font-bold text-[#402d00] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              {isLinkFlow ? 'Back to Profile' : 'Back to Sign In'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
