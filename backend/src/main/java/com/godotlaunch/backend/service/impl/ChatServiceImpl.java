package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.chat.ChatMessageResponse;
import com.godotlaunch.backend.dto.chat.ChatRequest;
import com.godotlaunch.backend.dto.chat.ChatSessionResponse;
import com.godotlaunch.backend.entity.ChatMessage;
import com.godotlaunch.backend.entity.ChatSession;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.repository.ChatMessageRepository;
import com.godotlaunch.backend.repository.ChatSessionRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.ChatService;
import com.godotlaunch.backend.service.chat.StreamSubscriptionRegistry;
import com.godotlaunch.backend.service.chat.memory.ChatMemoryManagerService;
import com.godotlaunch.backend.service.chat.orchestrator.*;
import com.godotlaunch.backend.service.chat.tool.PlagiarismReportFetchTool;
import com.godotlaunch.backend.service.chat.tool.SqlDatabaseQueryTool;
import com.godotlaunch.backend.service.rag.RagRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.Document;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ChatModel chatModel;
    private final StreamSubscriptionRegistry subscriptionRegistry;
    private final ObjectMapper objectMapper;
    private final RagRetrievalService ragRetrievalService;
    private final SqlDatabaseQueryTool sqlDatabaseQueryTool;
    private final PlagiarismReportFetchTool plagiarismReportFetchTool;
    private final IntentRouterService intentRouterService;
    private final SqlGeneratorService sqlGeneratorService;
    private final ChatMemoryManagerService memoryManagerService;
    private final com.godotlaunch.backend.service.chat.security.ChatGuardrailService chatGuardrailService;

    @Override
    @Transactional
    public ChatSessionResponse createSession(String userEmail, String title) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String sessionId = UUID.randomUUID().toString();
        String sessionTitle = (title != null && !title.trim().isEmpty()) ? title.trim() : "Hội thoại mới";

        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(user.getId().toString())
                .title(sessionTitle)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        chatSessionRepository.save(session);

        return mapToSessionResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getUserSessions(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return chatSessionRepository.findByUserIdOrderByUpdatedAtDesc(user.getId().toString())
                .stream()
                .map(this::mapToSessionResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getSessionMessages(String userEmail, String sessionId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ChatSession session = chatSessionRepository.findByIdAndUserId(sessionId, user.getId().toString())
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_SESSION_NOT_FOUND));

        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Flux<ServerSentEvent<String>> streamChat(String userEmail, ChatRequest request) {
        // Phase 5: Input Guardrail Check (Prompt Injection / Jailbreak)
        chatGuardrailService.validateInputPrompt(request.getMessage());

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String sessionId = request.getSessionId();
        ChatSession session;

        if (sessionId == null || sessionId.trim().isEmpty()) {
            String newTitle = request.getMessage().length() > 30 
                    ? request.getMessage().substring(0, 30) + "..." 
                    : request.getMessage();
            ChatSessionResponse newSession = createSession(userEmail, newTitle);
            sessionId = newSession.getId();
            session = chatSessionRepository.findById(sessionId).orElseThrow();
        } else {
            session = chatSessionRepository.findByIdAndUserId(sessionId, user.getId().toString())
                    .orElseThrow(() -> new AppException(ErrorCode.CHAT_SESSION_NOT_FOUND));
        }

        final String activeSessionId = sessionId;
        String userIdStr = user.getId().toString();
        String userRole = user.getRole() != null ? user.getRole().getName() : "customer";

        // Save User Message
        String userMsgId = UUID.randomUUID().toString();
        ChatMessage userMessage = ChatMessage.builder()
                .id(userMsgId)
                .sessionId(activeSessionId)
                .senderType("USER")
                .content(request.getMessage())
                .createdAt(Instant.now())
                .build();
        chatMessageRepository.save(userMessage);

        session.setUpdatedAt(Instant.now());
        chatSessionRepository.save(session);

        // Intent Router & Memory Context Retrieval
        IntentResult intentResult = intentRouterService.classifyIntent(request.getMessage(), userRole);
        String memoryContext = memoryManagerService.getFormattedMemoryContext(activeSessionId);

        List<String> citations = new ArrayList<>();
        StringBuilder contextBuffer = new StringBuilder();

        // Reasoning Status Stage
        Map<String, String> reasoningMap = new HashMap<>();
        reasoningMap.put("intent", intentResult.getIntentType().name());
        reasoningMap.put("reasoning", intentResult.getReasoning());

        // Process Intent Orchestration
        if (intentResult.getIntentType() == IntentType.KNOWLEDGE_RAG || intentResult.getIntentType() == IntentType.HYBRID) {
            reasoningMap.put("stage", "retrieving_rag_docs");
            reasoningMap.put("summary", "Đang tra cứu tài liệu quy trình hệ thống...");

            List<Document> ragDocs = ragRetrievalService.retrieveRelevantChunks(request.getMessage(), userRole, 3);
            for (Document doc : ragDocs) {
                String docId = (String) doc.getMetadata().get("document_id");
                if (docId != null && !citations.contains(docId)) {
                    citations.add(docId);
                }
                contextBuffer.append("--- [Tài liệu: ").append(docId).append("] ---\n").append(doc.getContent()).append("\n\n");
            }
        }

        if (intentResult.getIntentType() == IntentType.SQL_DATA_QUERY || intentResult.getIntentType() == IntentType.HYBRID) {
            reasoningMap.put("stage", "executing_sql_tool");
            reasoningMap.put("summary", "Đang truy vấn cơ sở dữ liệu hệ thống...");

            SqlPlanResult sqlPlan = sqlGeneratorService.generateSqlPlan(request.getMessage(), userRole);
            if (sqlPlan != null && sqlPlan.getGeneratedSql() != null) {
                String queryDataJson = sqlDatabaseQueryTool.executeQuery(sqlPlan.getGeneratedSql(), userIdStr, userRole);
                contextBuffer.append("--- [Dữ liệu cơ sở dữ liệu tra cứu] ---\n").append(queryDataJson).append("\n\n");
            }
        }

        if (intentResult.getIntentType() == IntentType.PLAGIARISM_REPORT) {
            reasoningMap.put("stage", "fetching_plagiarism_report");
            reasoningMap.put("summary", "Đang đọc báo cáo kiểm tra đạo văn code AST...");

            if (intentResult.getExtractedGameId() != null) {
                String reportJson = plagiarismReportFetchTool.fetchPlagiarismReport(intentResult.getExtractedGameId(), userIdStr, userRole);
                contextBuffer.append("--- [Báo cáo đạo văn code AST] ---\n").append(reportJson).append("\n\n");
            }
        }

        // Metadata Event
        Map<String, Object> metaMap = new HashMap<>();
        metaMap.put("messageId", userMsgId);
        metaMap.put("sessionId", activeSessionId);
        metaMap.put("citations", citations);

        ServerSentEvent<String> metaEvent = ServerSentEvent.<String>builder()
                .event("metadata")
                .data(toJson(metaMap))
                .build();

        ServerSentEvent<String> reasoningEvent = ServerSentEvent.<String>builder()
                .event("reasoning_status")
                .data(toJson(reasoningMap))
                .build();

        // Build Final Prompt
        StringBuilder finalPromptBuilder = new StringBuilder();
        finalPromptBuilder.append("Bạn là Trợ lý AI chính thức của nền tảng Godot Launch. Hãy trả lời người dùng bằng giọng văn tự nhiên, thân thiện, lịch sự và chuyên nghiệp.\n\n");
        finalPromptBuilder.append("QUY TẮC BẢO MẬT HẠ TẦNG & PHONG CÁCH PHẢN HỒI:\n");
        finalPromptBuilder.append("1. TUYỆT ĐỐI KHÔNG tiết lộ hay đề cập đến các thuật ngữ kỹ thuật hạ tầng hệ thống (như 'PostgreSQL', 'SQL', 'Database', 'Cơ sở dữ liệu', 'View', 'Table', 'Sandbox', 'PGVector', 'Gemini', 'API', 'Code'). Hãy trả lời hoàn toàn tự nhiên dưới danh nghĩa trợ lý của sàn Godot Launch.\n");
        finalPromptBuilder.append("2. Nếu thông tin tra cứu bên dưới rỗng hoặc không có dữ liệu, hãy trả lời tự nhiên rằng hệ thống hiện chưa ghi nhận dữ liệu hoặc chưa có sản phẩm/đơn hàng nào phù hợp.\n\n");
        
        if (!memoryContext.isEmpty()) {
            finalPromptBuilder.append(memoryContext).append("\n");
        }
        if (contextBuffer.length() > 0) {
            finalPromptBuilder.append("Context thông tin tra cứu từ Database/Tài liệu:\n").append(contextBuffer.toString()).append("\n");
        }
        finalPromptBuilder.append("Câu hỏi của người dùng: ").append(request.getMessage());

        StringBuilder fullResponseBuffer = new StringBuilder();
        long startTime = System.currentTimeMillis();

        Prompt prompt = new Prompt(finalPromptBuilder.toString());
        
        Flux<ServerSentEvent<String>> tokenFlux = chatModel.stream(prompt)
                .map(chunk -> {
                    String textToken = chunk.getResult() != null && chunk.getResult().getOutput() != null && chunk.getResult().getOutput().getContent() != null
                            ? chunk.getResult().getOutput().getContent()
                            : "";
                    String anonymizedToken = chatGuardrailService.anonymizePiiOutput(textToken);
                    fullResponseBuffer.append(anonymizedToken);

                    Map<String, String> deltaMap = Map.of("delta", anonymizedToken);
                    return ServerSentEvent.<String>builder()
                            .event("token")
                            .data(toJson(deltaMap))
                            .build();
                })
                .doOnComplete(() -> {
                    // Save Assistant Response
                    ChatMessage assistantMessage = ChatMessage.builder()
                            .id(UUID.randomUUID().toString())
                            .sessionId(activeSessionId)
                            .senderType("ASSISTANT")
                            .content(fullResponseBuffer.toString())
                            .citationsJson(toJson(citations))
                            .createdAt(Instant.now())
                            .build();
                    chatMessageRepository.save(assistantMessage);

                    subscriptionRegistry.unregister(activeSessionId);
                    log.info("Chat stream completed for session {}. Total length: {}", activeSessionId, fullResponseBuffer.length());

                    // Async Chat Memory Summary Worker
                    CompletableFuture.runAsync(() -> memoryManagerService.summarizeIfNeededAsync(activeSessionId));
                })
                .doOnError(throwable -> {
                    subscriptionRegistry.unregister(activeSessionId);
                    log.error("Error during chat stream for session {}: {}", activeSessionId, throwable.getMessage());
                });

        ServerSentEvent<String> doneEvent = ServerSentEvent.<String>builder()
                .event("done")
                .data(toJson(Map.of("finishReason", "stop", "latencyMs", System.currentTimeMillis() - startTime)))
                .build();

        return Flux.just(metaEvent, reasoningEvent)
                .concatWith(tokenFlux)
                .concatWith(Flux.just(doneEvent))
                .doOnSubscribe(subscription -> subscriptionRegistry.register(activeSessionId, subscription));
    }

    @Override
    public void abortStream(String userEmail, String sessionId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        chatSessionRepository.findByIdAndUserId(sessionId, user.getId().toString())
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_SESSION_NOT_FOUND));

        boolean aborted = subscriptionRegistry.abort(sessionId);
        log.info("Stream abort requested for session {}. Result: {}", sessionId, aborted);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private ChatSessionResponse mapToSessionResponse(ChatSession session) {
        return ChatSessionResponse.builder()
                .id(session.getId())
                .userId(session.getUserId())
                .title(session.getTitle())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private ChatMessageResponse mapToMessageResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .sessionId(message.getSessionId())
                .senderType(message.getSenderType())
                .content(message.getContent())
                .tokensCount(message.getTokensCount())
                .citationsJson(message.getCitationsJson())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
