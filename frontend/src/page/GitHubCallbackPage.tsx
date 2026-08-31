import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { redirectToRolePortal, resolvePostLoginScreen } from '../utils/authRedirect';

interface GitHubCallbackPageProps {
  setCurrentScreen: (screen: any) => void;
  setCurrentUser: (user: any) => void;
}

export const GitHubCallbackPage: React.FC<GitHubCallbackPageProps> = ({
  setCurrentScreen,
  setCurrentUser
}) => {
  const { loginWithToken } = useAuth();
  const { t } = useTranslation(['auth']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkFlow, setIsLinkFlow] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorParam = urlParams.get('error');
      const tokenParam = urlParams.get('token') || hashParams.get('token');
      const linkPending = localStorage.getItem("github_link_pending") === "true";
      setIsLinkFlow(linkPending);

      // Clear the query params from the URL bar immediately for security
      window.history.replaceState({}, document.title, window.location.pathname);

      if (errorParam) {
        localStorage.removeItem("github_link_pending");
        switch (errorParam) {
          case 'GL-4070':
            setErrorMsg(t('githubCallback.errors.emailMismatch'));
            break;
          case 'GL-4071':
            setErrorMsg(t('githubCallback.errors.accountAlreadyLinked'));
            break;
          case 'GL-4072':
            setErrorMsg(t('githubCallback.errors.sessionExpired'));
            break;
          case 'GL-5020':
          case 'GL-5021':
            setErrorMsg(t('githubCallback.errors.githubUnavailable'));
            break;
          case 'access_denied':
            setErrorMsg(t('githubCallback.errors.accessDenied'));
            break;
          default:
            setErrorMsg(t('githubCallback.errors.authFailed'));
        }
        setLoading(false);
        return;
      }

      if (!tokenParam) {
        localStorage.removeItem("github_link_pending");
        setErrorMsg(t('githubCallback.errors.noSession'));
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
          if (redirectToRolePortal(user)) return;
          setCurrentScreen(resolvePostLoginScreen(user));
        }
      } catch (err: any) {
        setErrorMsg(err.message || t('githubCallback.errors.loginFailed'));
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [loginWithToken, setCurrentScreen, setCurrentUser, t]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="dark-depth-card w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 text-center shadow-[0_18px_48px_rgba(148,163,184,0.16)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-night-850/90 dark:shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full border border-amber-300/30 bg-amber-100 p-4 dark:border-amber-300/20 dark:bg-amber-300/10">
              <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
              {t('githubCallback.loadingTitle')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('githubCallback.loadingSubtitle')}
            </p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center gap-6 py-6">
            <div className="rounded-full border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
              {isLinkFlow ? t('githubCallback.linkingFailed') : t('githubCallback.loginFailed')}
            </h2>
            <p className="text-sm text-red-700 dark:text-red-200">
              {errorMsg}
            </p>
            <button
              onClick={() => setCurrentScreen(isLinkFlow ? 'profile' : 'signin')}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 font-display text-base font-bold text-[#402d00] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              {isLinkFlow ? t('githubCallback.backToProfile') : t('githubCallback.backToSignIn')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
