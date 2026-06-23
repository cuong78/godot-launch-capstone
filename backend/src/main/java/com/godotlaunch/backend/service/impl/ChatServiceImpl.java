package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.ChatMessageRequest;
import com.godotlaunch.backend.dto.response.ChatMessageResponse;
import com.godotlaunch.backend.dto.response.ConversationResponse;
import com.godotlaunch.backend.dto.response.UserSummary;
import com.godotlaunch.backend.entity.ChatMessage;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.ChatMessageRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.ChatService;
import com.godotlaunch.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(String senderEmail, ChatMessageRequest request) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Sender not found with email: " + senderEmail));

        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with ID: " + request.getRecipientId()));

        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(request.getContent());
        message.setRead(false);
        message.setCreatedAt(Instant.now());

        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageResponse response = mapToResponse(saved);

        // 1. Push real-time chat message via WebSocket
        try {
            simpMessagingTemplate.convertAndSendToUser(
                    recipient.getEmail(), 
                    "/queue/messages", 
                    response
            );
            log.info("ChatMessage pushed over WS from {} to {}", senderEmail, recipient.getEmail());
        } catch (Exception e) {
            log.error("Failed to push chat message over WS: {}", e.getMessage());
        }

        // 2. Generate an in-app notification of type CHAT_MESSAGE
        try {
            notificationService.createAndSendNotification(
                    recipient,
                    sender,
                    NotificationType.CHAT_MESSAGE,
                    sender.getFullName() + " sent you a message: " + request.getContent(),
                    sender.getId().toString()
            );
        } catch (Exception e) {
            log.error("Failed to create chat notification: {}", e.getMessage());
        }

        auditLogService.publishAuto(
                AuditAction.chat_message_sent,
                AuditTarget.chat_message,
                saved.getId(),
                null,
                null,
                "Chat message sent from " + sender.getFullName() + " to " + recipient.getFullName()
        );

        return response;
    }

    @Override
    @Transactional
    public List<ChatMessageResponse> getChatHistory(String email, UUID recipientId) {
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Mark incoming messages from recipient as read
        markConversationAsRead(email, recipientId);

        return chatMessageRepository.findChatHistory(currentUser.getId(), recipientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        List<ChatMessage> allMessages = chatMessageRepository.findAllBySenderIdOrRecipientIdOrderByCreatedAtDesc(user.getId());

        Map<UUID, ChatMessage> latestMessagePerCounterparty = new LinkedHashMap<>();
        Map<UUID, Long> unreadCounts = new HashMap<>();

        for (ChatMessage msg : allMessages) {
            User counterparty = msg.getSender().getId().equals(user.getId()) ? msg.getRecipient() : msg.getSender();
            UUID cpId = counterparty.getId();

            if (!latestMessagePerCounterparty.containsKey(cpId)) {
                latestMessagePerCounterparty.put(cpId, msg);
            }

            if (msg.getRecipient().getId().equals(user.getId()) && !msg.isRead()) {
                unreadCounts.put(cpId, unreadCounts.getOrDefault(cpId, 0L) + 1);
            }
        }

        List<ConversationResponse> conversations = new ArrayList<>();
        for (Map.Entry<UUID, ChatMessage> entry : latestMessagePerCounterparty.entrySet()) {
            UUID cpId = entry.getKey();
            ChatMessage msg = entry.getValue();
            User counterparty = msg.getSender().getId().equals(user.getId()) ? msg.getRecipient() : msg.getSender();

            UserSummary cpSummary = UserSummary.builder()
                    .id(counterparty.getId())
                    .fullName(counterparty.getFullName())
                    .avatarUrl(counterparty.getAvatarUrl())
                    .build();

            conversations.add(ConversationResponse.builder()
                    .recipient(cpSummary)
                    .lastMessage(msg.getContent())
                    .unreadCount(unreadCounts.getOrDefault(cpId, 0L))
                    .lastActiveAt(msg.getCreatedAt())
                    .build());
        }

        return conversations;
    }

    @Override
    @Transactional
    public void markConversationAsRead(String email, UUID senderId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        List<ChatMessage> unreadMessages = chatMessageRepository.findChatHistory(senderId, user.getId())
                .stream()
                .filter(m -> m.getRecipient().getId().equals(user.getId()) && !m.isRead())
                .collect(Collectors.toList());

        if (!unreadMessages.isEmpty()) {
            for (ChatMessage m : unreadMessages) {
                m.setRead(true);
            }
            chatMessageRepository.saveAll(unreadMessages);
        }
    }

    private ChatMessageResponse mapToResponse(ChatMessage message) {
        UserSummary senderSummary = UserSummary.builder()
                .id(message.getSender().getId())
                .fullName(message.getSender().getFullName())
                .avatarUrl(message.getSender().getAvatarUrl())
                .build();

        UserSummary recipientSummary = UserSummary.builder()
                .id(message.getRecipient().getId())
                .fullName(message.getRecipient().getFullName())
                .avatarUrl(message.getRecipient().getAvatarUrl())
                .build();

        return ChatMessageResponse.builder()
                .id(message.getId())
                .sender(senderSummary)
                .recipient(recipientSummary)
                .content(message.getContent())
                .isRead(message.isRead())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
