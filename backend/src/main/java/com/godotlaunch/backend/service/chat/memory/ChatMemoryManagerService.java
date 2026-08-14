package com.godotlaunch.backend.service.chat.memory;

import com.godotlaunch.backend.entity.ChatMessage;
import com.godotlaunch.backend.entity.ChatSummary;
import com.godotlaunch.backend.repository.ChatMessageRepository;
import com.godotlaunch.backend.repository.ChatSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMemoryManagerService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatSummaryRepository chatSummaryRepository;
    private final ChatModel chatModel;

    @Transactional(readOnly = true)
    public String getFormattedMemoryContext(String sessionId) {
        StringBuilder memoryBuilder = new StringBuilder();

        // 1. Nạp Tóm tắt dài hạn (Tier 2) nếu có
        Optional<ChatSummary> summaryOpt = chatSummaryRepository.findBySessionId(sessionId);
        if (summaryOpt.isPresent() && !summaryOpt.get().getSummaryText().trim().isEmpty()) {
            memoryBuilder.append("--- [TÓM TẮT HỘI THOẠI TRƯỚC ĐÓ] ---\n");
            memoryBuilder.append(summaryOpt.get().getSummaryText()).append("\n\n");
        }

        // 2. Nạp Cửa sổ trượt 10 tin nhắn gần nhất (Tier 1)
        List<ChatMessage> recentMessages = chatMessageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId, PageRequest.of(0, 10));
        Collections.reverse(recentMessages);

        if (!recentMessages.isEmpty()) {
            memoryBuilder.append("--- [LỊCH SỬ NHẮN TIN GẦN ĐÂY] ---\n");
            for (ChatMessage msg : recentMessages) {
                memoryBuilder.append(msg.getSenderType()).append(": ").append(msg.getContent()).append("\n");
            }
            memoryBuilder.append("\n");
        }

        return memoryBuilder.toString();
    }

    @Transactional
    public void summarizeIfNeededAsync(String sessionId) {
        List<ChatMessage> allMessages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);

        // Chỉ tóm tắt nếu cuộc hội thoại dài hơn 15 tin nhắn
        if (allMessages.size() < 15) {
            return;
        }

        try {
            // Lấy 10 tin nhắn cũ nhất chưa được tóm tắt
            List<ChatMessage> messagesToSummarize = allMessages.subList(0, allMessages.size() - 5);
            StringBuilder textToSummarize = new StringBuilder();
            for (ChatMessage msg : messagesToSummarize) {
                textToSummarize.append(msg.getSenderType()).append(": ").append(msg.getContent()).append("\n");
            }

            String prompt = """
                    Hãy tóm tắt ngắn gọn các ý chính của cuộc hội thoại dưới đây thành 1 đoạn văn 3-5 câu:
                    
                    %s
                    """.formatted(textToSummarize.toString());

            String newSummaryText = chatModel.call(prompt);
            String lastMsgId = messagesToSummarize.get(messagesToSummarize.size() - 1).getId();

            ChatSummary summary = chatSummaryRepository.findBySessionId(sessionId)
                    .orElse(ChatSummary.builder()
                            .sessionId(sessionId)
                            .updatedAt(Instant.now())
                            .build());

            summary.setSummaryText(newSummaryText);
            summary.setLastSummarizedMessageId(lastMsgId);
            summary.setUpdatedAt(Instant.now());

            chatSummaryRepository.save(summary);
            log.info("Tóm tắt bộ nhớ hội thoại thành công cho session {}. Message count summarized: {}", sessionId, messagesToSummarize.size());

        } catch (Exception e) {
            log.warn("Tạm thời bỏ qua tóm tắt ngầm bộ nhớ hội thoại cho session {} (Rate Limit / Quota Exceeded): {}", sessionId, e.getMessage());
        }
    }
}
