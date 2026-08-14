package com.godotlaunch.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.*;

@Slf4j
public class GeminiChatModel implements ChatModel {

    private final RestClient restClient;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String modelName;
    private final Double temperature;
    private final String rootBaseUrl;

    private static final List<String> FALLBACK_MODELS = List.of(
            "gemini-flash-lite-latest",
            "gemini-flash-latest",
            "gemini-pro-latest"
    );

    public GeminiChatModel(String baseUrl, String apiKey, String modelName, Double temperature, ObjectMapper objectMapper) {
        String cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.rootBaseUrl = cleanBaseUrl;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.modelName = StringUtils.hasText(modelName) ? modelName.trim() : "gemini-flash-lite-latest";
        this.temperature = temperature != null ? temperature : 0.2;
        this.objectMapper = objectMapper;

        RestClient.Builder restBuilder = RestClient.builder()
                .baseUrl(cleanBaseUrl)
                .defaultHeader("Content-Type", "application/json");

        WebClient.Builder webBuilder = WebClient.builder()
                .baseUrl(cleanBaseUrl)
                .defaultHeader("Content-Type", "application/json");

        if (StringUtils.hasText(this.apiKey)) {
            restBuilder.defaultHeader("x-goog-api-key", this.apiKey);
            restBuilder.defaultHeader("Authorization", "Bearer " + this.apiKey);
            webBuilder.defaultHeader("x-goog-api-key", this.apiKey);
            webBuilder.defaultHeader("Authorization", "Bearer " + this.apiKey);
        }

        this.restClient = restBuilder.build();
        this.webClient = webBuilder.build();
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        try {
            if (!StringUtils.hasText(apiKey)) {
                return new ChatResponse(List.of(new Generation(new AssistantMessage("Vui lòng cấu hình GEMINI_API_KEY trong file backend/.env để sử dụng AI Chatbot."))));
            }

            // Try OpenAI format first
            try {
                Map<String, Object> openAiBody = buildOpenAiRequestBody(prompt, false);
                String uri = "/chat/completions?key=" + apiKey;

                String responseStr = restClient.post()
                        .uri(uri)
                        .body(openAiBody)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseStr);
                if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
                    JsonNode choice = root.get("choices").get(0);
                    if (choice.has("message") && choice.get("message").has("content")) {
                        String text = choice.get("message").get("content").asText();
                        return new ChatResponse(List.of(new Generation(new AssistantMessage(text))));
                    }
                }
            } catch (Exception openAiEx) {
                log.warn("OpenAI compatibility call failed ({}), falling back to Native Gemini API...", openAiEx.getMessage());
            }

            // Native Gemini API Fallback
            return callNativeGemini(prompt, modelName, 0);

        } catch (Exception e) {
            log.error("Lỗi khi gọi Gemini AI non-streaming: {}", e.getMessage(), e);
            String msg = e.getMessage() != null ? e.getMessage() : "";
            throw new RuntimeException(msg, e);
        }
    }

    private ChatResponse callNativeGemini(Prompt prompt, String targetModel, int fallbackIndex) {
        try {
            String nativeBaseUrl = rootBaseUrl.contains("/openai") 
                    ? rootBaseUrl.substring(0, rootBaseUrl.indexOf("/openai")) 
                    : rootBaseUrl;

            RestClient nativeClient = RestClient.builder()
                    .baseUrl(nativeBaseUrl)
                    .defaultHeader("Content-Type", "application/json")
                    .defaultHeader("x-goog-api-key", apiKey)
                    .build();

            Map<String, Object> nativeBody = buildNativeGeminiRequestBody(prompt);
            String uri = "/models/" + targetModel + ":generateContent?key=" + apiKey;

            String responseStr = nativeClient.post()
                    .uri(uri)
                    .body(nativeBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseStr);
            String textContent = extractTextFromNativeResponse(root);
            return new ChatResponse(List.of(new Generation(new AssistantMessage(textContent))));

        } catch (Exception e) {
            String errMsg = e.getMessage() != null ? e.getMessage() : "";
            if ((errMsg.contains("404") || errMsg.contains("429") || errMsg.contains("RESOURCE_EXHAUSTED")) && fallbackIndex < FALLBACK_MODELS.size() - 1) {
                String nextModel = FALLBACK_MODELS.get(fallbackIndex + 1);
                log.warn("Native Gemini model {} returned error ({}), auto-failover to {}...", targetModel, errMsg, nextModel);
                return callNativeGemini(prompt, nextModel, fallbackIndex + 1);
            }
            log.error("Lỗi Native Gemini API call: {}", errMsg, e);
            throw new RuntimeException("Lỗi Native Gemini API: " + errMsg, e);
        }
    }

    @Override
    public Flux<ChatResponse> stream(Prompt prompt) {
        try {
            if (!StringUtils.hasText(apiKey)) {
                return Flux.just(new ChatResponse(List.of(new Generation(new AssistantMessage("Vui lòng cấu hình GEMINI_API_KEY trong file backend/.env để sử dụng AI Chatbot.")))));
            }

            // Try OpenAI stream first
            String uri = "/chat/completions?key=" + apiKey;
            Map<String, Object> openAiBody = buildOpenAiRequestBody(prompt, true);

            return webClient.post()
                    .uri(uri)
                    .bodyValue(openAiBody)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .filter(line -> line != null && !line.trim().isEmpty())
                    .map(line -> {
                        String cleanLine = line.trim();
                        if (cleanLine.startsWith("data: ")) {
                            cleanLine = cleanLine.substring(6).trim();
                        }
                        if ("[DONE]".equalsIgnoreCase(cleanLine)) {
                            return new ChatResponse(List.of(new Generation(new AssistantMessage(""))));
                        }
                        try {
                            JsonNode root = objectMapper.readTree(cleanLine);
                            String deltaText = "";
                            if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
                                JsonNode choice = root.get("choices").get(0);
                                if (choice.has("delta") && choice.get("delta").has("content")) {
                                    deltaText = choice.get("delta").get("content").asText();
                                }
                            }
                            return new ChatResponse(List.of(new Generation(new AssistantMessage(deltaText))));
                        } catch (Exception parseException) {
                            return new ChatResponse(List.of(new Generation(new AssistantMessage(""))));
                        }
                    })
                    .onErrorResume(openAiEx -> {
                        log.warn("OpenAI stream failed ({}), falling back to Native Gemini SSE stream...", openAiEx.getMessage());
                        return streamNativeGemini(prompt, modelName, 0);
                    });

        } catch (Exception e) {
            log.error("Lỗi khi stream Gemini AI: {}", e.getMessage(), e);
            return streamNativeGemini(prompt, modelName, 0);
        }
    }

    private Flux<ChatResponse> streamNativeGemini(Prompt prompt, String targetModel, int fallbackIndex) {
        try {
            String nativeBaseUrl = rootBaseUrl.contains("/openai") 
                    ? rootBaseUrl.substring(0, rootBaseUrl.indexOf("/openai")) 
                    : rootBaseUrl;

            WebClient nativeWebClient = WebClient.builder()
                    .baseUrl(nativeBaseUrl)
                    .defaultHeader("Content-Type", "application/json")
                    .defaultHeader("x-goog-api-key", apiKey)
                    .build();

            Map<String, Object> nativeBody = buildNativeGeminiRequestBody(prompt);
            String uri = "/models/" + targetModel + ":streamGenerateContent?key=" + apiKey + "&alt=sse";

            return nativeWebClient.post()
                    .uri(uri)
                    .bodyValue(nativeBody)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .filter(line -> line != null && !line.trim().isEmpty())
                    .map(line -> {
                        String cleanLine = line.trim();
                        if (cleanLine.startsWith("data: ")) {
                            cleanLine = cleanLine.substring(6).trim();
                        }
                        try {
                            JsonNode root = objectMapper.readTree(cleanLine);
                            String deltaText = extractTextFromNativeResponse(root);
                            return new ChatResponse(List.of(new Generation(new AssistantMessage(deltaText))));
                        } catch (Exception parseException) {
                            return new ChatResponse(List.of(new Generation(new AssistantMessage(""))));
                        }
                    })
                    .onErrorResume(nativeEx -> {
                        String errMsg = nativeEx.getMessage() != null ? nativeEx.getMessage() : "";
                        if ((errMsg.contains("404") || errMsg.contains("429") || errMsg.contains("RESOURCE_EXHAUSTED")) && fallbackIndex < FALLBACK_MODELS.size() - 1) {
                            String nextModel = FALLBACK_MODELS.get(fallbackIndex + 1);
                            log.warn("Native Gemini stream model {} returned error ({}), auto-failover to {}...", targetModel, errMsg, nextModel);
                            return streamNativeGemini(prompt, nextModel, fallbackIndex + 1);
                        }
                        log.error("Lỗi Native Gemini SSE Stream: {}", errMsg, nativeEx);
                        return Flux.just(new ChatResponse(List.of(new Generation(new AssistantMessage("⚠️ Giới hạn hệ thống AI: " + errMsg)))));
                    });

        } catch (Exception e) {
            log.error("Lỗi khởi tạo Native Gemini Stream: {}", e.getMessage(), e);
            return Flux.just(new ChatResponse(List.of(new Generation(new AssistantMessage(" [Lỗi khởi tạo Stream: " + e.getMessage() + "]")))));
        }
    }

    @Override
    public ChatOptions getDefaultOptions() {
        return null;
    }

    private Map<String, Object> buildOpenAiRequestBody(Prompt prompt, boolean isStream) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        requestBody.put("temperature", temperature);
        requestBody.put("stream", isStream);

        List<Map<String, String>> messagesList = new ArrayList<>();
        for (Message msg : prompt.getInstructions()) {
            Map<String, String> msgMap = new HashMap<>();
            String role = "user";
            switch (msg.getMessageType()) {
                case SYSTEM:
                    role = "system";
                    break;
                case ASSISTANT:
                    role = "assistant";
                    break;
                case USER:
                default:
                    role = "user";
                    break;
            }
            msgMap.put("role", role);
            msgMap.put("content", msg.getContent());
            messagesList.add(msgMap);
        }

        requestBody.put("messages", messagesList);
        return requestBody;
    }

    private Map<String, Object> buildNativeGeminiRequestBody(Prompt prompt) {
        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> systemInstruction = null;

        for (Message msg : prompt.getInstructions()) {
            String role = "user";
            switch (msg.getMessageType()) {
                case SYSTEM:
                    systemInstruction = Map.of("parts", List.of(Map.of("text", msg.getContent())));
                    continue;
                case ASSISTANT:
                    role = "model";
                    break;
                case USER:
                default:
                    role = "user";
                    break;
            }

            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", msg.getContent()))
            ));
        }

        requestBody.put("contents", contents);
        if (systemInstruction != null) {
            requestBody.put("systemInstruction", systemInstruction);
        }
        requestBody.put("generationConfig", Map.of("temperature", temperature));
        return requestBody;
    }

    private String extractTextFromNativeResponse(JsonNode root) {
        if (root.has("candidates") && root.get("candidates").isArray() && root.get("candidates").size() > 0) {
            JsonNode candidate = root.get("candidates").get(0);
            if (candidate.has("content") && candidate.get("content").has("parts")) {
                JsonNode parts = candidate.get("content").get("parts");
                if (parts.isArray() && parts.size() > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode part : parts) {
                        if (part.has("text")) {
                            sb.append(part.get("text").asText());
                        }
                    }
                    return sb.toString();
                }
            }
        }
        return "";
    }
}
