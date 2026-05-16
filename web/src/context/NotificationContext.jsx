import React, { createContext, useState, useCallback } from "react";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New Game Release",
      message: "Neon Drifter is now available for purchase!",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: false,
      type: "info",
    },
    {
      id: 2,
      title: "Purchase Confirmation",
      message:
        'Your purchase of "Cyber Bloom" has been completed successfully.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      isRead: false,
      type: "success",
    },
    {
      id: 3,
      title: "Update Available",
      message: "Student Quest has released a new patch v1.2.1",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isRead: true,
      type: "info",
    },
    {
      id: 4,
      title: "Community Highlight",
      message: "Your post in the Void Protocol community got 500 reactions!",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isRead: true,
      type: "success",
    },
  ]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      isRead: false,
      type: "info",
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif,
      ),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true })),
    );
  }, []);

  const deleteNotification = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId),
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

  const value = {
    notifications,
    isNotificationOpen,
    setIsNotificationOpen,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    unreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
