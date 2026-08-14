package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.chat.ChatMessageResponse;
import com.godotlaunch.backend.dto.chat.ChatRequest;
import com.godotlaunch.backend.dto.chat.ChatSessionResponse;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

import java.util.List;

public interface ChatService {
    ChatSessionResponse createSession(String userEmail, String title);
    List<ChatSessionResponse> getUserSessions(String userEmail);
    List<ChatMessageResponse> getSessionMessages(String userEmail, String sessionId);
    Flux<ServerSentEvent<String>> streamChat(String userEmail, ChatRequest request);
    void abortStream(String userEmail, String sessionId);
}
