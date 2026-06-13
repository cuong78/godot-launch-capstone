package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.ChatMessageRequest;
import com.godotlaunch.backend.dto.response.ChatMessageResponse;
import com.godotlaunch.backend.dto.response.ConversationResponse;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    ChatMessageResponse sendMessage(String senderEmail, ChatMessageRequest request);
    List<ChatMessageResponse> getChatHistory(String email, UUID recipientId);
    List<ConversationResponse> getConversations(String email);
    void markConversationAsRead(String email, UUID senderId);
}
