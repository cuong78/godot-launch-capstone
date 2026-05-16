import React, { useContext } from "react";
import { X, Check, CheckCheck, Trash2 } from "lucide-react";
import { NotificationContext } from "../context/NotificationContext";

const formatTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTypeColor = (type) => {
  switch (type) {
    case "success":
      return "bg-surface-bright/30 border-primary-container/50 text-primary-container";
    case "error":
      return "bg-error/10 border-error/30 text-error";
    case "warning":
      return "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
    default:
      return "bg-surface-bright/20 border-surface-tint/30 text-surface-tint";
  }
};

export default function NotificationDropdown() {
  const {
    notifications,
    isNotificationOpen,
    setIsNotificationOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    unreadCount,
  } = useContext(NotificationContext);

  if (!isNotificationOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={() => setIsNotificationOpen(false)}
      />

      {/* Dropdown */}
      <div className="fixed right-0 top-20 md:right-6 md:top-20 w-full md:w-96 max-h-[600px] bg-surface-container border border-white/10 shadow-[0_0_25px_rgba(0,242,255,0.1)] z-50 flex flex-col rounded-lg md:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <h2 className="font-display-sm text-headline-sm uppercase tracking-widest text-surface-tint">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-error text-on-error text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsNotificationOpen(false)}
            className="text-on-surface-variant hover:text-surface-tint transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2 px-3 py-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-on-surface-variant/70 font-label-md">
                No notifications
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                  notification.isRead
                    ? "bg-surface-container-low border-white/5 hover:border-white/10"
                    : "bg-surface-container-lowest border-surface-tint/20 hover:border-surface-tint/40 shadow-[0_0_12px_rgba(0,242,255,0.1)]"
                }`}
                onClick={() =>
                  !notification.isRead && markAsRead(notification.id)
                }
              >
                <div className="flex gap-3">
                  {/* Type Badge */}
                  <div
                    className={`mt-1 px-2 py-1 rounded text-xs font-bold flex-shrink-0 border ${getTypeColor(
                      notification.type,
                    )}`}
                  >
                    {notification.type === "success" && "✓"}
                    {notification.type === "info" && "ℹ"}
                    {notification.type === "error" && "✕"}
                    {notification.type === "warning" && "⚠"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`font-label-md text-label-md ${
                          notification.isRead
                            ? "text-on-surface-variant"
                            : "text-on-surface font-semibold"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-surface-tint flex-shrink-0 mt-1.5"></span>
                      )}
                    </div>
                    <p
                      className={`text-label-sm leading-relaxed mt-1 ${
                        notification.isRead
                          ? "text-on-surface-variant/60"
                          : "text-on-surface-variant/80"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-label-xs text-on-surface-variant/50 mt-2">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-2 hover:bg-surface-container rounded transition-colors text-on-surface-variant hover:text-surface-tint"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-2 hover:bg-error/10 rounded transition-colors text-on-surface-variant hover:text-error"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3 flex gap-2 bg-surface-container-lowest">
            <button
              onClick={() => markAllAsRead()}
              className={`flex-1 px-3 py-2 rounded font-label-sm text-label-sm transition-colors ${
                unreadCount > 0
                  ? "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                  : "bg-surface-container/50 text-on-surface-variant/50 cursor-not-allowed"
              }`}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="w-4 h-4 inline mr-1" />
              Mark all read
            </button>
            <button
              onClick={() => clearAllNotifications()}
              className="flex-1 px-3 py-2 border border-error/30 text-error rounded font-label-sm text-label-sm hover:bg-error/10 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}
