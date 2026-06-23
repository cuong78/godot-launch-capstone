import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Search, Loader2, User, AlertCircle, Circle } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../hooks/useAuth';
import { PROFILE_AVATAR_YOU } from '../../assets/images';
import api from '../api/axios';
import { UserSummary } from '../types';

export function ChatScreen() {
  const { currentUser } = useAuth();
  const {
    conversations,
    chatMessages,
    activeRecipientId,
    setActiveRecipientId,
    activeRecipientDetails,
    setActiveRecipientDetails,
    sendChatMessage,
    fetchChatHistory,
    fetchConversations,
    isConnected
  } = useWebSocket();

  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Global User Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await api.get(`/api/v1/users/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.data.success) {
          const mappedUsers = res.data.data.map((u: any) => ({
            id: u.id,
            fullName: u.fullName,
            avatarUrl: u.avatarUrl
          }));
          setSearchResults(mappedUsers);
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Fetch history when active recipient changes
  useEffect(() => {
    if (activeRecipientId) {
      setIsLoadingHistory(true);
      fetchChatHistory(activeRecipientId)
        .catch((err) => console.error("Error loading chat history:", err))
        .finally(() => setIsLoadingHistory(false));

      // If the activeRecipientId doesn't match the selected search recipient, clear it
      if (activeRecipientDetails && activeRecipientDetails.id !== activeRecipientId) {
        setActiveRecipientDetails(null);
      }
    } else {
      setActiveRecipientDetails(null);
    }
  }, [activeRecipientId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoadingHistory]);

  // Find active conversation recipient info
  const activeConversation = conversations.find(
    (c) => c.recipient.id === activeRecipientId
  );

  const activeRecipientInfo = activeConversation?.recipient || activeRecipientDetails || (activeRecipientId ? {
    id: activeRecipientId,
    fullName: 'Direct Chat',
    avatarUrl: undefined
  } : null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeRecipientId) return;

    sendChatMessage(activeRecipientId, messageText.trim());
    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex h-[680px] transition-all duration-300">
        
        {/* SIDEBAR: Conversations List */}
        <div className="w-80 border-r border-slate-200/50 dark:border-slate-800/60 flex flex-col h-full bg-slate-50/30 dark:bg-slate-950/20">
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/60 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-amber-500" />
                Direct Messages
              </h2>
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-1.5 bg-slate-800/10 dark:bg-slate-950/40 px-2 py-0.5 rounded-full border border-slate-700/10 dark:border-slate-800/50">
                <Circle 
                  size={8} 
                  className={`${isConnected ? 'text-emerald-500 fill-emerald-500 animate-pulse' : 'text-rose-500 fill-rose-500'}`} 
                />
                <span className="text-[9px] font-mono text-slate-400">
                  {isConnected ? 'online' : 'offline'}
                </span>
              </div>
            </div>

            {/* Global User Search Bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search users to chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-4 py-1.5 bg-slate-100/50 dark:bg-slate-950/60 border border-transparent dark:border-slate-800/50 rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-xs text-slate-800 dark:text-slate-200 transition-all placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 text-[10px] font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Conversations Items Grid */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-800/10">
            {searchQuery.trim().length > 0 ? (
              isSearching ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                  <Loader2 className="animate-spin text-amber-500" size={20} />
                  <span className="text-xs font-mono">Searching users...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const isActive = user.id === activeRecipientId;
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setActiveRecipientDetails(user);
                        setActiveRecipientId(user.id);
                        setSearchQuery('');
                      }}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 relative group ${
                        isActive 
                          ? 'bg-amber-400/10 dark:bg-amber-400/5 border-l-4 border-amber-400 text-slate-900 dark:text-white' 
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {/* Active Line indicator hover */}
                      {!isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-0 bg-amber-400 group-hover:w-1 transition-all" />
                      )}

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60 shrink-0">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={user.avatarUrl || PROFILE_AVATAR_YOU} 
                          alt={user.fullName} 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Meta info */}
                      <div className="flex-grow min-w-0">
                        <h3 className="text-xs font-bold truncate">
                          {user.fullName}
                        </h3>
                        <p className="text-[10px] text-amber-500 font-mono">
                          Click to start chat
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 px-4">
                  <User size={20} className="stroke-[1.5] text-slate-400/80" />
                  <p className="text-xs italic leading-relaxed">No users found matching "{searchQuery}"</p>
                </div>
              )
            ) : (
              conversations.length > 0 ? (
                conversations.map((conv) => {
                  const isActive = conv.recipient.id === activeRecipientId;
                  return (
                    <div
                      key={conv.recipient.id}
                      onClick={() => setActiveRecipientId(conv.recipient.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 relative group ${
                        isActive 
                          ? 'bg-amber-400/10 dark:bg-amber-400/5 border-l-4 border-amber-400 text-slate-900 dark:text-white' 
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {/* Active Line indicator hover */}
                      {!isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-0 bg-amber-400 group-hover:w-1 transition-all" />
                      )}

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60 shrink-0 relative">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={conv.recipient.avatarUrl || PROFILE_AVATAR_YOU} 
                          alt={conv.recipient.fullName} 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Meta info info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="text-xs font-bold truncate pr-2">
                            {conv.recipient.fullName}
                          </h3>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {conv.lastActiveAt ? new Date(conv.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 truncate pr-2">
                          {conv.lastMessage}
                        </p>
                      </div>

                      {/* Unread Counter Badge */}
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white shadow-md">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 px-4">
                  <MessageSquare size={20} className="stroke-[1.5] text-slate-400/80" />
                  <p className="text-xs italic leading-relaxed">No active chat channels. Search for a user above to start chatting!</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* MAIN VIEWPORT: Messages Log */}
        <div className="flex-1 flex flex-col h-full bg-transparent">
          {activeRecipientInfo ? (
            <>
              {/* Right Header */}
              <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between bg-slate-55/10 dark:bg-slate-950/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60 shrink-0">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={activeRecipientInfo.avatarUrl || PROFILE_AVATAR_YOU} 
                      alt={activeRecipientInfo.fullName} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-850 dark:text-white leading-tight">
                      {activeRecipientInfo.fullName}
                    </h3>
                    <span className="text-[9px] text-amber-500 font-mono uppercase tracking-wider block mt-0.5">
                      Direct Channel
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Messages Body logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/10 dark:bg-slate-900/10 relative">
                {isLoadingHistory ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px] z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-amber-500" size={24} />
                      <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Loading History...</span>
                    </div>
                  </div>
                ) : null}

                {chatMessages.length > 0 ? (
                  chatMessages.map((msg, index) => {
                    const isMyMsg = msg.sender.id === currentUser?.id;
                    return (
                      <div key={msg.id || index} className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`flex gap-2.5 max-w-[75%] ${isMyMsg ? 'flex-row-reverse' : ''}`}>
                          
                          {/* Avatar icon */}
                          {!isMyMsg && (
                            <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-800/60 shrink-0 mt-0.5">
                              <img 
                                referrerPolicy="no-referrer" 
                                src={msg.sender.avatarUrl || PROFILE_AVATAR_YOU} 
                                alt={msg.sender.fullName} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div>
                            {/* Message Bubble */}
                            <div className={`p-3 text-xs leading-relaxed shadow-sm ${
                              isMyMsg 
                                ? 'bg-amber-400 text-slate-950 rounded-2xl rounded-tr-none border border-amber-500/20' 
                                : 'bg-white dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none border border-slate-200/50 dark:border-slate-800/60'
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            
                            {/* Date time timestamp tag */}
                            <span className={`text-[8px] text-slate-400/80 font-mono block mt-1.5 ${isMyMsg ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-24 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2.5">
                    <MessageSquare size={28} className="stroke-[1.2] text-amber-500/40" />
                    <p className="text-xs font-semibold">Beginning of Direct Chat channel.</p>
                    <p className="text-[10px] italic">Your communications are securely dispatched over private channels.</p>
                  </div>
                )}
                
                {/* Dummy div to scroll to */}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar Footer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/50 dark:border-slate-800/60 bg-slate-55/15 dark:bg-slate-950/15 shrink-0 flex gap-2.5 items-end">
                <div className="flex-1 relative bg-slate-100/50 dark:bg-slate-950/60 border border-slate-200/30 dark:border-slate-850 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/10 focus-within:border-amber-400 transition-all">
                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={isConnected ? "Write a message... (Enter to send, Shift+Enter for new line)" : "WebSocket disconnected. Reconnecting..."}
                    disabled={!isConnected}
                    className="w-full pl-3 pr-3 py-3 bg-transparent outline-none border-none text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 resize-none font-sans max-h-24 scrollbar-none"
                    style={{ height: 'auto' }}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={!isConnected || !messageText.trim()}
                  className={`p-3.5 rounded-xl flex items-center justify-center transition-all shadow-md shrink-0 border ${
                    messageText.trim() && isConnected
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-500/20 active:scale-95 cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800/40 text-slate-400 dark:text-slate-650 border-transparent cursor-not-allowed'
                  }`}
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shadow-lg">
                <MessageSquare className="text-amber-500 stroke-[1.5]" size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                  Private Channels Active
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 max-w-sm leading-relaxed">
                  Select an existing dialogue channel from the left sidebar panel or navigate to any creator's community profile page to start a new real-time conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
