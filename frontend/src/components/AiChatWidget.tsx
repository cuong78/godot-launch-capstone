import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAccessToken } from '../api/authService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reasoningStatus?: string;
  intent?: string;
  isStreaming?: boolean;
}

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentReasoning, setCurrentReasoning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentUser } = useAuth();
  const token = getAccessToken();

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentReasoning]);

  // Handle auto-expand input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputPrompt]);

  const handleClearHistory = () => {
    setMessages([]);
    setSessionId(null);
    setCurrentReasoning(null);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt.trim();
    if (!promptToSend || isSending) return;

    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `bot-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      content: promptToSend,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsSending(true);
    setCurrentReasoning('Đang phân tích câu hỏi...');

    // Prepare assistant placeholder message
    const botMsg: ChatMessage = {
      id: botMessageId,
      sender: 'assistant',
      content: '',
      timestamp,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, botMsg]);

    if (!currentUser || !token) {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  content:
                    '🔒 **Vui lòng đăng nhập tài khoản** để trò chuyện với Trợ lý AI và trải nghiệm đầy đủ các tính năng của Godot Launch!',
                  isStreaming: false,
                }
              : msg
          )
        );
        setIsSending(false);
        setCurrentReasoning(null);
      }, 500);
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiBaseUrl}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          prompt: promptToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const chunk of lines) {
            const eventMatch = chunk.match(/^event:\s*(.+)$/m);
            const dataMatch = chunk.match(/^data:\s*(.+)$/m);

            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1].trim();
              const rawData = dataMatch[1].trim();

              try {
                const parsedData = JSON.parse(rawData);

                if (eventType === 'metadata') {
                  if (parsedData.sessionId) {
                    setSessionId(parsedData.sessionId);
                  }
                } else if (eventType === 'reasoning_status') {
                  if (parsedData.summary) {
                    setCurrentReasoning(parsedData.summary);
                  }
                } else if (eventType === 'token') {
                  if (parsedData.delta) {
                    accumulatedContent += parsedData.delta;
                    setCurrentReasoning(null); // Hide reasoning badge once streaming starts
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === botMessageId
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                  }
                } else if (eventType === 'done') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMessageId
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.warn('Failed to parse SSE JSON:', e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error in chat stream:', error);
      const isAuthError = !token || error.message?.includes('401') || error.message?.includes('403');
      const fallbackMsg = isAuthError
        ? '🔒 **Vui lòng đăng nhập tài khoản** để sử dụng tính năng Trợ lý AI!'
        : '⚠️ Rất tiếc, đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau giây lát!';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: msg.content || fallbackMsg,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsSending(false);
      setCurrentReasoning(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const promptSuggestions = [
    { text: 'Hướng dẫn quy trình đăng bán game & rút tiền', icon: '📖' },
    { text: 'Tựa game nào bán chạy nhất trên hệ thống?', icon: '📈' },
    { text: 'Số dư ví và lịch sử giao dịch của tôi', icon: '💳' },
    { text: 'Quy định kiểm tra đạo văn code AST', icon: '🛡️' },
  ];

  // Định dạng hiển thị tin nhắn, loại bỏ ký hiệu Markdown thô (###, ***, **) thành thẻ HTML sạch đẹp
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    const lines = content.split('\n');

    return (
      <div className="space-y-1 font-sans text-xs sm:text-sm leading-relaxed">
        {lines.map((line, lineIdx) => {
          // Đường phân cách (***, ---, ___)
          if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
            return <hr key={lineIdx} className="my-2 border-slate-700/60" />;
          }

          // Tiêu đề: ###, ##, #
          let processedLine = line;
          let isHeader = false;
          if (/^#{1,6}\s+/.test(processedLine)) {
            isHeader = true;
            processedLine = processedLine.replace(/^#{1,6}\s+/, '');
          }

          // Gạch đầu dòng (* hoặc -)
          let isBullet = false;
          if (/^[\*\-]\s+/.test(processedLine)) {
            isBullet = true;
            processedLine = processedLine.replace(/^[\*\-]\s+/, '');
          }

          // Phân tích chữ in đậm **text**
          const parts = processedLine.split(/(\*\*.*?\*\*)/g);

          const renderedParts = parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
              const boldText = part.slice(2, -2);
              return (
                <strong key={partIdx} className="font-bold text-white">
                  {boldText}
                </strong>
              );
            }
            return part;
          });

          if (isHeader) {
            return (
              <div key={lineIdx} className="font-bold text-indigo-300 text-sm mt-2 mb-1">
                {renderedParts}
              </div>
            );
          }

          if (isBullet) {
            return (
              <div key={lineIdx} className="flex items-start gap-1.5 ml-2 my-0.5">
                <span className="text-indigo-400 font-bold select-none">•</span>
                <div>{renderedParts}</div>
              </div>
            );
          }

          if (line.trim() === '') {
            return <div key={lineIdx} className="h-1.5" />;
          }

          return <div key={lineIdx}>{renderedParts}</div>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Robot Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            isOpen
              ? 'bg-slate-800 text-white border-2 border-indigo-500/50 shadow-indigo-500/20'
              : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white border border-white/20 shadow-purple-500/30'
          }`}
          title="Mở Trợ lý AI Chatbot"
        >
          {/* Animated Glowing Ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-sm opacity-60 group-hover:opacity-100 transition duration-300 animate-pulse" />

          {isOpen ? (
            <svg
              className="relative w-7 h-7 transition-transform duration-300 transform rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Cute Animated Robot SVG Icon */}
              <svg className="w-8 h-8 text-white drop-shadow-md transform group-hover:rotate-6 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {/* Robot Head */}
                <rect x="5" y="6" width="14" height="12" rx="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-indigo-900/40" />
                {/* Robot Antenna */}
                <path d="M12 2v4" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="2" r="1.5" className="fill-pink-400 stroke-none animate-ping" />
                <circle cx="12" cy="2" r="1.5" className="fill-pink-400 stroke-none" />
                {/* Robot Eyes */}
                <circle cx="9" cy="11" r="1.5" className="fill-cyan-300 stroke-none" />
                <circle cx="15" cy="11" r="1.5" className="fill-cyan-300 stroke-none" />
                {/* Robot Mouth / Smile Line */}
                <path d="M9 14.5c1.5 1 4.5 1 6 0" strokeWidth="1.8" strokeLinecap="round" />
                {/* Robot Ears */}
                <rect x="2" y="9" width="3" height="6" rx="1" strokeWidth="1.5" />
                <rect x="19" y="9" width="3" height="6" rx="1" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* Main Chatbot Modal Overlay */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[620px] max-h-[82vh] bg-slate-950/95 border border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Top Header Bar */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
                  {/* Robot Header Icon */}
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="5" y="6" width="14" height="12" rx="3" strokeWidth="2" />
                    <path d="M12 2v4" strokeWidth="2" />
                    <circle cx="9" cy="11" r="1.5" className="fill-cyan-300" />
                    <circle cx="15" cy="11" r="1.5" className="fill-cyan-300" />
                    <path d="M9 14.5c1.5 1 4.5 1 6 0" strokeWidth="1.8" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base tracking-wide">Godot Launch AI</h3>
                </div>
                <p className="text-xs text-indigo-200/70 font-medium">Hỏi đáp quy trình, số dư & dữ liệu hệ thống</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                title="Tạo cuộc hội thoại mới"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                title="Đóng chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent">
            {/* Welcome Banner when empty */}
            {messages.length === 0 && (
              <div className="py-6 px-4 bg-gradient-to-b from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl text-center space-y-3 my-auto">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-white text-sm">Xin chào {currentUser?.fullName || 'bạn'}! 👋</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  Tôi là trợ lý AI thông minh của sàn **Godot Launch**. Tôi có thể hỗ trợ bạn giải đáp quy trình, tra cứu doanh thu ví, hay thống kê sản phẩm!
                </p>

                <div className="pt-2 flex flex-col gap-2 text-left">
                  <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider px-1">Gợi ý câu hỏi:</p>
                  {promptSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.text)}
                      className="text-xs py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/40 text-slate-200 hover:text-white transition text-left flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.text}</span>
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Bubble List */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot Avatar */}
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-indigo-500/20 border border-white/10">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="5" y="6" width="14" height="12" rx="3" strokeWidth="2" />
                      <path d="M12 2v4" strokeWidth="2" />
                      <circle cx="9" cy="11" r="1.5" className="fill-cyan-300" />
                      <circle cx="15" cy="11" r="1.5" className="fill-cyan-300" />
                    </svg>
                  </div>
                )}

                {/* Message Box */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-lg shadow-indigo-500/20 font-medium'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-none shadow-md'
                  }`}
                >
                  <div>
                    {renderFormattedContent(msg.content)}
                    {msg.isStreaming && !msg.content && (
                      <span className="inline-flex items-center gap-1 text-indigo-400 italic text-xs mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                        Đang soạn phản hồi...
                      </span>
                    )}
                  </div>

                  <div className={`mt-1.5 text-[10px] ${msg.sender === 'user' ? 'text-indigo-200/70 text-right' : 'text-slate-500 text-left'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0 mt-1">
                    {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            ))}

            {/* Dynamic Reasoning Status Indicator Badge */}
            {currentReasoning && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs animate-pulse">
                <svg className="w-4 h-4 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{currentReasoning}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Textarea Input Area */}
          <div className="p-3 bg-slate-900/90 border-t border-indigo-500/20">
            <div className="relative flex items-center bg-slate-950 border border-slate-800 focus-within:border-indigo-500/60 rounded-2xl transition duration-200 shadow-inner px-3 py-2">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi cho AI (VD: Hướng dẫn rút tiền)..."
                disabled={isSending}
                rows={1}
                className="w-full bg-transparent text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none resize-none scrollbar-none py-1 pr-10"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || isSending}
                className={`absolute right-2 p-2 rounded-xl text-white transition-all duration-200 ${
                  inputPrompt.trim() && !isSending
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/30 scale-100'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed scale-95'
                }`}
                title="Gửi câu hỏi"
              >
                {isSending ? (
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>Bấm <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px]">Enter</kbd> để gửi</span>
              <span>Godot Launch Security Shield 🔒</span>
            </div>
          </div>

        </div>
      )}
    </>
  );
};
