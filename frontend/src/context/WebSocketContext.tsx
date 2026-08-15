import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import api from '../api/axios';
import { NotificationResponse } from '../types';
import { tokenStorage } from '../utils/tokenStorage';

interface WebSocketContextType {
  notifications: NotificationResponse[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const stompClientRef = useRef<Client | null>(null);
  const processedNotifIdsRef = useRef<Set<string>>(new Set());

  // Load initial notifications when logged in
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      processedNotifIdsRef.current.clear();
    }
  }, [currentUser]);

  // Establish WebSocket connection when user is logged in.
  useEffect(() => {
    if (!currentUser) {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = tokenStorage.getToken();
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const socket = new SockJS(`${baseURL}/ws`);

    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // Suppress detailed frames logs to clean up browser console
      },
      onConnect: () => {
        setIsConnected(true);
        console.log("WebSocket connected via SockJS + STOMP Broker.");
        fetchNotifications();

        const handleIncomingNotification = (notif: NotificationResponse) => {
          if (notif && notif.id) {
            if (processedNotifIdsRef.current.has(notif.id)) {
              return;
            }
            processedNotifIdsRef.current.add(notif.id);

            setNotifications((prev) => {
              const exists = prev.some((n) => n.id === notif.id);
              if (exists) return prev;
              return [notif, ...prev];
            });

            setUnreadNotificationsCount((count) => count + 1);
            if (notif.message) {
              showToast(notif.message, 'info');
            }

            if (notif.type === 'NEW_REVIEW' || notif.type === 'REVIEW_REMOVED' || notif.type === 'REPLY_COMMENT') {
              window.dispatchEvent(
                new CustomEvent('godotlaunch:review-updated', {
                  detail: { productId: notif.targetId },
                })
              );
            }
          } else {
            fetchNotifications();
          }
        };

        // Subscribe to user notifications
        client.subscribe('/user/queue/notifications', (message) => {
          try {
            const notif = JSON.parse(message.body) as NotificationResponse;
            handleIncomingNotification(notif);
          } catch (err) {
            fetchNotifications();
          }
        });

        // Subscribe to admin topic if current user is admin
        if (currentUser?.role === 'admin') {
          client.subscribe('/topic/admin/notifications', (message) => {
            try {
              const notif = JSON.parse(message.body) as NotificationResponse;
              handleIncomingNotification(notif);
            } catch (err) {
              fetchNotifications();
            }
          });
        }

        // Subscribe to public community updates
        client.subscribe('/topic/community/updates', (message) => {
          try {
            const update = JSON.parse(message.body);
            window.dispatchEvent(new CustomEvent('community-post-update', { detail: update }));
          } catch (err) {
            console.error("Error parsing community update message:", err);
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log("WebSocket disconnected.");
      },
      onStompError: (frame) => {
        console.error("STOMP Broker Error: " + frame.headers['message']);
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
        setIsConnected(false);
      }
    };
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/v1/notifications');
      if (res.data.success) {
        const list: NotificationResponse[] = res.data.data;
        setNotifications(list);
        list.forEach((n) => {
          if (n.id) processedNotifIdsRef.current.add(n.id);
        });
      }
      const countRes = await api.get('/api/v1/notifications/unread-count');
      if (countRes.data.success) {
        setUnreadNotificationsCount(countRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const res = await api.put(`/api/v1/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const res = await api.put('/api/v1/notifications/read-all');
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadNotificationsCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  return (
    <WebSocketContext.Provider value={{
      notifications,
      unreadNotificationsCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      fetchNotifications,
      isConnected
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
