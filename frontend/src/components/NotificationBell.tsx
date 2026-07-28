import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, MessageSquare, Heart, Share2, CornerDownRight, ShieldAlert } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { NotificationResponse } from '../types';
import { PROFILE_AVATAR_YOU } from '../../assets/images';

interface NotificationBellProps {
  setCurrentScreen: (screen: any) => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedPost: (post: any) => void;
  setSelectedAuthor: (author: any) => void;
}

const resolveLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split('-')[0];
  if (normalized === 'en') return 'en-US';
  if (normalized === 'ja') return 'ja-JP';
  return 'vi-VN';
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  setCurrentScreen,
  setSelectedAssetId,
  setSelectedPost,
  setSelectedAuthor
}) => {
  const { t, i18n } = useTranslation(['common']);
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useWebSocket();

  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatNotificationTimestamp = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNotificationClick = async (notif: NotificationResponse) => {
    setIsOpen(false);
    
    // 1. Mark as read on backend
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    
    // 2. Perform redirect navigation
    if (notif.targetId) {
      setSelectedAssetId(notif.targetId);
      setCurrentScreen('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'COMMENT':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-400" />;
      case 'REACTION':
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />;
      case 'SHARE':
        return <Share2 className="w-3.5 h-3.5 text-amber-500" />;
      case 'CHAT_MESSAGE':
        return <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-xl border border-slate-700/30 bg-slate-800/40 p-2 text-slate-300 transition-all hover:bg-slate-800/60 hover:text-white active:scale-95"
        aria-label={t('notifications_open')}
        title={t('notifications_open')}
      >
        <Bell size={18} className={unreadNotificationsCount > 0 ? "animate-swing-slow" : ""} />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white font-mono shadow-md">
            {unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Popover list */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-[420px] overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/70 shadow-2xl z-50 flex flex-col animate-fade-in">
          
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between bg-slate-800/5">
            <span className="text-sm font-display font-bold text-slate-800 dark:text-white uppercase tracking-wide">{t('notifications_title')}</span>
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="flex items-center gap-1 text-xs font-semibold text-amber-500 transition-colors hover:text-amber-400"
              >
                <Check size={11} /> {t('notifications_mark_all_read')}
              </button>
            )}
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100/50 dark:divide-slate-800/30">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex gap-3 cursor-pointer transition-colors relative ${
                    notif.isRead 
                      ? 'hover:bg-slate-150/50 dark:hover:bg-slate-800/30 text-slate-500 dark:text-slate-400' 
                      : 'bg-amber-400/5 dark:bg-amber-400/5 hover:bg-amber-400/10 text-slate-850 dark:text-slate-200 font-medium'
                  }`}
                >
                  {/* Unread indicator left bar */}
                  {!notif.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                  )}
                  
                  {/* Sender Avatar */}
                  <div className="w-8.5 h-8.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/60 shrink-0">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={notif.sender.avatarUrl || PROFILE_AVATAR_YOU} 
                      alt={notif.sender.fullName} 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Message body */}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm leading-relaxed break-words">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="p-0.5 rounded bg-slate-800/20 dark:bg-slate-950/40 border border-slate-700/10 dark:border-slate-800/50 flex items-center justify-center shrink-0">
                        {getIcon(notif.type)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatNotificationTimestamp(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-450 dark:text-slate-500">
                <Bell size={24} className="stroke-[1.5]" />
                <p className="text-sm italic">{t('notifications_empty')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
