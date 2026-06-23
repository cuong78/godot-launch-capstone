import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { 
  NotificationResponse, 
  ChatMessageResponse, 
  ConversationResponse,
  UserSummary
} from '../types';
import { tokenStorage } from '../utils/tokenStorage';

interface WebSocketContextType {
  notifications: NotificationResponse[];
  unreadNotificationsCount: number;
  chatMessages: ChatMessageResponse[];
  conversations: ConversationResponse[];
  activeRecipientId: string | null;
  setActiveRecipientId: (id: string | null) => void;
  activeRecipientDetails: UserSummary | null;
  setActiveRecipientDetails: (info: UserSummary | null) => void;
  sendChatMessage: (recipientId: string, content: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchChatHistory: (recipientId: string) => Promise<void>;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessageResponse[]>([]);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [activeRecipientDetails, setActiveRecipientDetails] = useState<UserSummary | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const stompClientRef = useRef<Client | null>(null);
  const activeRecipientIdRef = useRef<string | null>(null);

  // Sync ref with state so subscription callbacks can always read the latest activeRecipientId
  useEffect(() => {
    activeRecipientIdRef.current = activeRecipientId;
  }, [activeRecipientId]);

  // Load initial notifications & conversations when logged in
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      fetchConversations();
    } else {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      setChatMessages([]);
      setConversations([]);
      setActiveRecipientId(null);
      setActiveRecipientDetails(null);
    }
  }, [currentUser]);

  // Establish WebSocket connection when user is logged in
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
        // Suppress detailed frames logs to clean up browser console, uncomment if needed
        // console.log("[STOMP Debug] " + str);
      },
      onConnect: () => {
        setIsConnected(true);
        console.log("WebSocket connected via SockJS + STOMP Broker.");

        // Subscribe to user notifications
        client.subscribe('/user/queue/notifications', (message) => {
          const notification: NotificationResponse = JSON.parse(message.body);
          
          // If it is NOT a chat message or if it is from someone we are NOT currently chatting with
          if (notification.type !== 'CHAT_MESSAGE' || activeRecipientIdRef.current !== notification.sender.id) {
            fetchNotifications();
          } else {
            // Auto read chat notifications if we are in their chat room
            api.put(`/api/v1/chat/read/${notification.sender.id}`)
              .then(() => fetchNotifications())
              .catch((err) => console.error(err));
          }
        });

        // Subscribe to public community updates
        client.subscribe('/topic/community/updates', (message) => {
          try {
            const update = JSON.parse(message.body);
            window.dispatchEvent(new CustomEvent('community-post-update', { detail: update }));
          } catch (err) {
            console.error("Error parsing community update message:", err);
          }
        });

        // Subscribe to user chat messages
        client.subscribe('/user/queue/messages', (message) => {
          const chatMsg: ChatMessageResponse = JSON.parse(message.body);
          
          if (activeRecipientIdRef.current === chatMsg.sender.id) {
            setChatMessages((prev) => [...prev, chatMsg]);
            api.put(`/api/v1/chat/read/${chatMsg.sender.id}`).catch((err) => console.error(err));
          }
          
          fetchConversations();
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
        setNotifications(res.data.data);
      }
      const countRes = await api.get('/api/v1/notifications/unread-count');
      if (countRes.data.success) {
        setUnreadNotificationsCount(countRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/api/v1/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const fetchChatHistory = async (recipientId: string) => {
    try {
      const res = await api.get(`/api/v1/chat/history/${recipientId}`);
      if (res.data.success) {
        setChatMessages(res.data.data);
      }
      fetchConversations();
      fetchNotifications();
    } catch (err) {
      console.error("Failed to fetch chat history", err);
    }
  };

  const sendChatMessage = (recipientId: string, content: string) => {
    if (stompClientRef.current && stompClientRef.current.connected && currentUser) {
      stompClientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ recipientId, content })
      });

      // Optimistically append the message to the chat view logs
      const mySummary = {
        id: currentUser.id || '',
        fullName: currentUser.fullName || currentUser.username,
        avatarUrl: currentUser.avatarUrl
      };

      const tempMessage: ChatMessageResponse = {
        id: Math.random().toString(),
        sender: mySummary,
        recipient: { id: recipientId, fullName: '', avatarUrl: '' },
        content,
        isRead: true,
        createdAt: new Date().toISOString()
      };

      setChatMessages((prev) => [...prev, tempMessage]);
      
      // Update local inbox list
      setTimeout(() => {
        fetchConversations();
      }, 300);
    } else {
      console.warn("WebSocket not connected. Unable to send chat message.");
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
      chatMessages,
      conversations,
      activeRecipientId,
      setActiveRecipientId,
      activeRecipientDetails,
      setActiveRecipientDetails,
      sendChatMessage,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      fetchNotifications,
      fetchConversations,
      fetchChatHistory,
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
