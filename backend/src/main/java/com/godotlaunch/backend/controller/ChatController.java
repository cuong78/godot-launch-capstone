package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.chat.ChatMessageResponse;
import com.godotlaunch.backend.dto.chat.ChatRequest;
import com.godotlaunch.backend.dto.chat.ChatSessionResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.security.JwtProvider;
import com.godotlaunch.backend.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import reactor.core.publisher.Flux;

import java.security.Principal;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "AI Chatbot API", description = "Endpoints for AI Real-time Streaming Chat, Session & Memory management")
public class ChatController {

    private final ChatService chatService;
    private final JwtProvider jwtProvider;

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${GEMINI_MODEL:gemini-1.5-flash}")
    private String geminiModel;

    @Value("${GEMINI_OPENAI_BASE_URL:https://generativelanguage.googleapis.com/v1beta/openai/}")
    private String geminiBaseUrl;

    @GetMapping("/test-gemini")
    @Operation(summary = "Diagnostic endpoint to test Google Gemini API connection", description = "Executes direct REST calls to Google Gemini API to test key & model validity.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testGemini() {
        Map<String, Object> result = new LinkedHashMap<>();
        String key = geminiApiKey != null ? geminiApiKey.trim() : "";
        String maskedKey = key.length() > 8 ? key.substring(0, 4) + "..." + key.substring(key.length() - 4) : "(empty)";

        result.put("keyProvided", StringUtils.hasText(key));
        result.put("keyMasked", maskedKey);
        result.put("keyLength", key.length());
        result.put("configuredModel", geminiModel);
        result.put("configuredBaseUrl", geminiBaseUrl);

        if (!StringUtils.hasText(key)) {
            result.put("status", "ERROR: GEMINI_API_KEY is empty in backend/.env");
            return ResponseEntity.ok(ApiResponse.success(result, "Chưa cấu hình GEMINI_API_KEY."));
        }

        RestClient client = RestClient.builder()
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("x-goog-api-key", key)
                .build();

        // Test 1: Native gemini-1.5-flash
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key;
            Map<String, Object> body = Map.of("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", "Hi")))));
            String res = client.post().uri(url).body(body).retrieve().body(String.class);
            result.put("test_native_gemini_1_5_flash", "SUCCESS: " + (res.length() > 100 ? res.substring(0, 100) + "..." : res));
        } catch (Exception e) {
            result.put("test_native_gemini_1_5_flash", "FAILED: " + e.getMessage());
        }

        // Test 2: Native gemini-1.5-pro
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + key;
            Map<String, Object> body = Map.of("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", "Hi")))));
            String res = client.post().uri(url).body(body).retrieve().body(String.class);
            result.put("test_native_gemini_1_5_pro", "SUCCESS: " + (res.length() > 100 ? res.substring(0, 100) + "..." : res));
        } catch (Exception e) {
            result.put("test_native_gemini_1_5_pro", "FAILED: " + e.getMessage());
        }

        // Test 3: OpenAI Compatibility Endpoint
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=" + key;
            Map<String, Object> body = Map.of("model", geminiModel, "messages", List.of(Map.of("role", "user", "content", "Hi")));
            String res = client.post().uri(url).body(body).retrieve().body(String.class);
            result.put("test_openai_compatibility", "SUCCESS: " + (res.length() > 100 ? res.substring(0, 100) + "..." : res));
        } catch (Exception e) {
            result.put("test_openai_compatibility", "FAILED: " + e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success(result, "Hoàn tất kiểm tra kết nối Gemini AI."));
    }

    @PostMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new chat session", description = "Creates an empty conversation session for the logged-in user.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ChatSessionResponse>> createSession(
            Principal principal,
            @RequestParam(required = false) String title) {
        ChatSessionResponse session = chatService.createSession(principal.getName(), title);
        return ResponseEntity.ok(ApiResponse.success(session, "Tạo phiên hội thoại thành công."));
    }

    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get user's chat sessions", description = "Retrieves all chat sessions of the logged-in user ordered by latest update.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<ChatSessionResponse>>> getUserSessions(Principal principal) {
        List<ChatSessionResponse> sessions = chatService.getUserSessions(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(sessions, "Lấy danh sách phiên hội thoại thành công."));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get chat history of a session", description = "Retrieves all message history for a specific chat session.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getSessionMessages(
            Principal principal,
            @PathVariable String sessionId) {
        List<ChatMessageResponse> messages = chatService.getSessionMessages(principal.getName(), sessionId);
        return ResponseEntity.ok(ApiResponse.success(messages, "Lấy lịch sử hội thoại thành công."));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Stream AI response via Server-Sent Events",
            description = "Sends a prompt and receives real-time SSE event tokens from Gemini LLM.",
            responses = {
                    @io.swagger.v3.oas.annotations.responses.ApiResponse(
                            responseCode = "200",
                            description = "SSE Stream of AI response tokens",
                            content = @io.swagger.v3.oas.annotations.media.Content(
                                    mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
                                    schema = @io.swagger.v3.oas.annotations.media.Schema(type = "string")
                            )
                    )
            }
    )
    @SecurityRequirement(name = "bearerAuth")
    public Flux<ServerSentEvent<String>> streamChat(
            Principal principal,
            HttpServletRequest servletRequest,
            @Valid @RequestBody ChatRequest request) {

        return Flux.defer(() -> {
            String userEmail = null;
            if (principal != null) {
                userEmail = principal.getName();
            }
            if (userEmail == null) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                    userEmail = auth.getName();
                }
            }
            if (userEmail == null) {
                String token = servletRequest.getHeader("Authorization");
                if (StringUtils.hasText(token) && token.startsWith("Bearer ")) {
                    token = token.substring(7);
                } else {
                    token = servletRequest.getParameter("token");
                    if (!StringUtils.hasText(token)) {
                        token = servletRequest.getParameter("access_token");
                    }
                }
                if (StringUtils.hasText(token) && jwtProvider.validateToken(token)) {
                    userEmail = jwtProvider.getUsernameFromToken(token);
                }
            }
            if (userEmail == null) {
                return Flux.just(ServerSentEvent.<String>builder()
                        .event("error")
                        .data("Xác thực không hợp lệ. Vui lòng đăng nhập lại.")
                        .build());
            }

            return chatService.streamChat(userEmail, request);
        }).onErrorResume(ex -> {
            log.error("Exception in SSE streamChat for prompt '{}': {}", request.getMessage(), ex.getMessage(), ex);
            String errorDetails = ex.getMessage() != null ? ex.getMessage() : "Lỗi hệ thống khi tạo phản hồi AI.";
            return Flux.just(ServerSentEvent.<String>builder()
                    .event("error")
                    .data(errorDetails)
                    .build());
        });
    }

    @PostMapping("/sessions/{sessionId}/abort")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Abort active streaming generation", description = "Cancels an ongoing LLM reactive streaming response for a session.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> abortStream(
            Principal principal,
            @PathVariable String sessionId) {
        chatService.abortStream(principal.getName(), sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã gửi yêu cầu dừng tạo câu trả lời."));
    }
}
