package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ChatMessageRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.ChatMessageResponse;
import com.godotlaunch.backend.dto.response.ConversationResponse;
import com.godotlaunch.backend.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Chat API", description = "Endpoints for direct messaging chat history and active conversations")
public class ChatController {

    private final ChatService chatService;

    @MessageMapping("/chat.send")
    public void receiveMessage(@Payload ChatMessageRequest request, Principal principal) {
        if (principal == null) {
            log.error("[WS Chat] Failed to send message: Principal is null (unauthenticated session).");
            return;
        }
        try {
            String senderEmail = principal.getName();
            log.info("[WS Chat] Received message from {} to recipient ID: {}, content length: {}", 
                    senderEmail, request.getRecipientId(), 
                    request.getContent() != null ? request.getContent().length() : 0);
            
            chatService.sendMessage(senderEmail, request);
        } catch (Exception e) {
            log.error("[WS Chat] Error processing chat.send: {}", e.getMessage(), e);
        }
    }

    @GetMapping("/api/v1/chat/history/{recipientId}")
    @Operation(summary = "Get chat history", description = "Retrieves message timeline with a specific counterparty user.")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getChatHistory(
            Principal principal,
            @PathVariable UUID recipientId) {
        String email = principal.getName();
        List<ChatMessageResponse> history = chatService.getChatHistory(email, recipientId);
        return ResponseEntity.ok(ApiResponse.success(history, "Chat history retrieved successfully."));
    }

    @GetMapping("/api/v1/chat/conversations")
    @Operation(summary = "Get conversation inbox", description = "Retrieves active chats list with last messages and unread counts.")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getConversations(Principal principal) {
        String email = principal.getName();
        List<ConversationResponse> conversations = chatService.getConversations(email);
        return ResponseEntity.ok(ApiResponse.success(conversations, "Conversations retrieved successfully."));
    }

    @PutMapping("/api/v1/chat/read/{senderId}")
    @Operation(summary = "Mark conversation messages as read", description = "Marks all unread messages from a specific sender as read.")
    public ResponseEntity<ApiResponse<Void>> markAsRead(Principal principal, @PathVariable UUID senderId) {
        String email = principal.getName();
        chatService.markConversationAsRead(email, senderId);
        return ResponseEntity.ok(ApiResponse.success(null, "Messages marked as read."));
    }
}
