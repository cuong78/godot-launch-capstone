import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';
import { tokenStorage } from '../utils/tokenStorage';
import { Button } from '../components/Button';
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Upload, 
  Globe, 
  Grid, 
  Check, 
  Loader2, 
  Sparkles,
  Camera,
  AlertCircle
} from 'lucide-react';
import { PROFILE_AVATAR_YOU, DEV_AVATARS } from '../../assets/images';

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

interface ProfilePageProps {
  setCurrentScreen?: (screen: any) => void;
}

export function ProfilePage({ setCurrentScreen }: ProfilePageProps) {
  const { currentUser, updateUser } = useAuth();
  const { t } = useTranslation(['profile']);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [avatarTab, setAvatarTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [githubStatus, setGithubStatus] = useState<{ linked: boolean; githubUsername: string | null; githubLinkedAt: string | null } | null>(null);
  const [loadingGithubStatus, setLoadingGithubStatus] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [searchParams] = useState(new URLSearchParams(window.location.search));

  useEffect(() => {
    if (!currentUser) return;
    const fetchGithubStatus = async () => {
      setLoadingGithubStatus(true);
      try {
        const res = await userApi.getGitHubStatus();
        if (res.success && res.data) {
          setGithubStatus(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch GitHub status:", err);
      } finally {
        setLoadingGithubStatus(false);
      }
    };
    fetchGithubStatus();
  }, [currentUser]);

  useEffect(() => {
    const linked = searchParams.get("linked");
    if (linked === "true") {
      setStatusMessage({ type: 'success', text: t('messages.githubLinked') });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, t]);

  const handleLinkGitHub = async () => {
    try {
      const res = await authApi.prepareLink();
      if (res.success && res.data?.redirectUrl) {
        localStorage.setItem("github_link_pending", "true");
        window.location.href = res.data.redirectUrl;
      } else {
        setStatusMessage({ type: 'error', text: t('errors.initiateGithubLink') });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.message || t('errors.initiateGithubLink')
      });
    }
  };

  const handleUnlinkGitHub = async () => {
    if (!window.confirm(t('confirm.unlinkGithub'))) return;
    setIsUnlinking(true);
    setStatusMessage(null);
    try {
      const res = await userApi.unlinkGitHub();
      if (res.success && res.data) {
        tokenStorage.setToken(res.data.token);
        localStorage.setItem("accessToken", res.data.token);
        updateUser(res.data.user);
        setStatusMessage({ type: 'success', text: t('messages.githubUnlinked') });
        setGithubStatus({ linked: false, githubUsername: null, githubLinkedAt: null });
      } else {
        setStatusMessage({ type: 'error', text: res.message || t('errors.unlinkGithub') });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.message || t('errors.unlinkGithub')
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-bounce">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-white mb-2">{t('accessDenied.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">{t('accessDenied.description')}</p>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic client validation
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: t('errors.validImageFile') });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: t('errors.imageTooLarge') });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await authApi.uploadAvatar(file);
      if (res.success && res.data) {
        setAvatarUrl(res.data);
        setStatusMessage({ type: 'success', text: t('messages.avatarUploaded') });
      } else {
        setStatusMessage({ type: 'error', text: res.message || t('errors.uploadAvatar') });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.message || t('errors.uploadAvatar')
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (password && password !== confirmPassword) {
      setStatusMessage({ type: 'error', text: t('errors.passwordMismatch') });
      return;
    }

    if (password && password.length < 6) {
      setStatusMessage({ type: 'error', text: t('errors.passwordMinLength') });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        fullName,
        avatarUrl,
      };
      if (password) {
        payload.password = password;
      }

      const res = await userApi.updateProfile(payload);
      if (res.success && res.data) {
        updateUser(res.data);
        setStatusMessage({ type: 'success', text: t('messages.profileUpdated') });
        setIsEditing(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        setStatusMessage({ type: 'error', text: res.message || t('errors.updateProfile') });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.message || t('errors.updateProfile')
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Title block with gradient text and subtle spark elements */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-900 shadow-md">
          <Sparkles size={20} className="animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
            {t('header.title')}
          </h1>
          <p className="font-mono text-xs tracking-wider text-slate-500 dark:text-slate-400">{t('header.subtitle')}</p>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 mb-6 rounded-xl border flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-slide-up ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="text-sm font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Glassmorphic Wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Quick Info Card */}
        <div className="dark-depth-card group relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 text-center shadow-[0_20px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 md:col-span-1">
          {/* Accent decoration glow */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/20 transition-all duration-500" />
          
          <div className="relative mb-4 group">
            <img 
              referrerPolicy="no-referrer"
              src={avatarUrl} 
              alt={currentUser.fullName || currentUser.username} 
              className="w-32 h-32 rounded-full border-4 border-amber-400/80 shadow-2xl object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {isEditing && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                <Camera className="text-amber-400" size={24} />
              </div>
            )}
          </div>

          <h2 className="text-xl font-display font-bold text-slate-800 dark:text-white truncate w-full">
            {currentUser.fullName || t('sidebar.noNameSet')}
          </h2>
          <p className="mb-4 w-full truncate font-mono text-xs text-slate-500 dark:text-slate-400">
            {currentUser.email}
          </p>

          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-xs dark:border-slate-700/30 dark:bg-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><ShieldCheck size={14} /> {t('sidebar.nodeRole')}</span>
              <span className="font-bold text-amber-400 capitalize font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {currentUser.role || 'customer'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-xs dark:border-slate-700/30 dark:bg-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Mail size={14} /> {t('sidebar.accountStatus')}</span>
              <span className="font-bold text-emerald-400 capitalize font-mono bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                {currentUser.status || 'active'}
              </span>
            </div>
          </div>

          <div className="w-full mt-6">
            {!isEditing ? (
              <Button
                variant="outline"
                className="w-full border-amber-500/30 hover:border-amber-400 hover:bg-amber-400/10 text-amber-500 dark:text-amber-400 transition-all font-semibold"
                onClick={() => setIsEditing(true)}
              >
                {t('sidebar.editProfileSettings')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                onClick={() => {
                  setIsEditing(false);
                  setFullName(currentUser.fullName || '');
                  setAvatarUrl(currentUser.avatarUrl || '');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                {t('sidebar.cancelChanges')}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: View / Edit Form */}
        <div className="dark-depth-card rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 md:col-span-2 md:p-8">
          
          {!isEditing ? (
            /* View Profile details mode */
            <div className="space-y-6">
              <h3 className="text-lg font-display font-bold text-slate-800 dark:text-white border-b border-slate-200/80 dark:border-slate-700/30 pb-3 flex items-center gap-2">
                <UserIcon size={18} className="text-amber-400" /> {t('view.accountNodeData')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase text-slate-600 dark:text-slate-400">{t('view.fullDeveloperName')}</label>
                  <p className="text-base text-slate-800 dark:text-slate-200 font-semibold bg-slate-50/90 dark:bg-slate-800/25 border border-slate-200/80 dark:border-slate-700/20 rounded-xl px-4 py-3">
                    {currentUser.fullName || <span className="text-slate-500 italic">{t('view.notSpecified')}</span>}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase text-slate-600 dark:text-slate-400">{t('view.registeredEmailNode')}</label>
                  <p className="text-base text-slate-800 dark:text-slate-200 font-semibold bg-slate-50/90 dark:bg-slate-800/25 border border-slate-200/80 dark:border-slate-700/20 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Mail size={16} className="text-slate-400 shrink-0" />
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/30">
                <h3 className="text-lg font-display font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-400" /> {t('view.permissionsCredentials')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {t('view.rolePrefix')}{' '}
                  <span className="text-amber-400 font-bold font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">{currentUser.role || 'customer'}</span>{' '}
                  {t('view.roleSuffix')}{' '}
                  {currentUser.role === 'admin' 
                    ? t('view.roleAdmin')
                    : currentUser.role === 'developer' 
                    ? t('view.roleDeveloper')
                    : t('view.roleCustomer')}
                </p>

                {/* GitHub Linking / Developer Upgrade Section */}
                <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-700/30">
                  <h4 className="text-sm font-display font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <Globe size={16} className="text-amber-400" /> {t('github.title')}
                  </h4>
                  {githubStatus?.linked ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-left">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 mb-1">
                          {t('github.connected')}
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                          {t('github.linkedGithub')} <span className="text-slate-950 dark:text-white font-mono">@{githubStatus.githubUsername}</span>
                        </p>
                        {githubStatus.githubLinkedAt && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {t('github.linkedAt')} {new Date(githubStatus.githubLinkedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {currentUser.role === 'developer' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/10 text-rose-500 transition-all font-semibold"
                          onClick={handleUnlinkGitHub}
                          disabled={isUnlinking}
                        >
                          {isUnlinking ? t('github.unlinking') : t('github.unlink')}
                        </Button>
                      )}
                      {currentUser.role === 'customer' && setCurrentScreen && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setCurrentScreen('developer-onboarding');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {t('github.completeVerification')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/30 text-left">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {currentUser.role === 'customer' 
                          ? t('github.customerPrompt', { email: currentUser.email })
                          : t('github.notLinked')}
                      </p>
                      {currentUser.role === 'customer' && (
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={handleLinkGitHub}
                          disabled={loadingGithubStatus}
                        >
                          {t('github.linkAndBecomeDeveloper')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Edit profile details form */
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h3 className="text-lg font-display font-bold text-slate-800 dark:text-white border-b border-slate-200/80 dark:border-slate-700/30 pb-3 flex items-center gap-2">
                <UserIcon size={18} className="text-amber-400" /> {t('edit.title')}
              </h3>

              <div className="space-y-4">
                {/* Full name input */}
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase text-slate-600 dark:text-slate-400">{t('edit.fullDeveloperName')}</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('edit.enterYourName')}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Avatar Picker layout */}
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase text-slate-600 dark:text-slate-400">{t('edit.chooseAvatarImage')}</label>
                  
                  {/* Selector tab switch controls */}
                  <div className="mb-4 flex max-w-sm gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800/80 dark:bg-slate-850">
                    <button
                      type="button"
                      onClick={() => setAvatarTab('presets')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        avatarTab === 'presets' 
                          ? 'bg-amber-400 text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <Grid size={13} /> {t('edit.tabs.presets')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('upload')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        avatarTab === 'upload' 
                          ? 'bg-amber-400 text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {t('edit.tabs.localUpload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('url')}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        avatarTab === 'url' 
                          ? 'bg-amber-400 text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <Globe size={13} /> {t('edit.tabs.urlLink')}
                    </button>
                  </div>

                  {/* Tab contents */}
                  {avatarTab === 'presets' && (
                    <div className="grid max-w-md grid-cols-5 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-700/20 dark:bg-slate-800/20">
                      {PRESET_AVATARS.map((preset, index) => {
                        const isSelected = avatarUrl === preset;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setAvatarUrl(preset)}
                            className="relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 shrink-0"
                            style={{
                              borderColor: isSelected ? '#fbbf24' : 'transparent',
                              boxShadow: isSelected ? '0 0 10px rgba(251, 191, 36, 0.4)' : 'none'
                            }}
                          >
                            <img referrerPolicy="no-referrer" src={preset} alt={t('edit.presetAlt', { index: index + 1 })} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Check className="text-amber-400" size={14} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {avatarTab === 'upload' && (
                    <div className="relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700/60 p-6 text-center transition-colors hover:border-amber-400/50">
                      <input
                        type="file"
                        id="avatar-upload-file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                          {isUploading ? <Loader2 className="animate-spin text-amber-400" size={20} /> : <Upload size={20} />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {isUploading ? t('edit.uploadingToSecureStorage') : t('edit.clickOrDragDrop')}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">{t('edit.uploadHint')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {avatarTab === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder={t('edit.urlPlaceholder')}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-200 dark:placeholder:text-slate-500"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (customUrl) {
                            setAvatarUrl(customUrl);
                            setCustomUrl('');
                            setStatusMessage({ type: 'success', text: t('messages.avatarUrlSet') });
                          }
                        }}
                      >
                        {t('edit.apply')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Password modification fields */}
                <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/30 space-y-4">
                  <h4 className="text-sm font-display font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Lock size={15} className="text-amber-400" /> {t('edit.changePassword')}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block font-mono text-[11px] uppercase text-slate-600 dark:text-slate-400">{t('edit.newPassword')}</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('edit.newPasswordPlaceholder')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-200 dark:placeholder:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[11px] uppercase text-slate-600 dark:text-slate-400">{t('edit.confirmNewPassword')}</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('edit.confirmNewPasswordPlaceholder')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-200 dark:placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions submit block */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-700/30 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(currentUser.fullName || '');
                    setAvatarUrl(currentUser.avatarUrl || '');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={isSaving}
                >
                  {t('edit.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving || isUploading}
                  icon={isSaving ? <Loader2 className="animate-spin" size={14} /> : undefined}
                >
                  {isSaving ? t('edit.savingNodeData') : t('edit.saveSettings')}
                </Button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
