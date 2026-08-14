package com.godotlaunch.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.web.client.RestClient;

import java.util.*;

@Slf4j
public class GeminiEmbeddingModel implements EmbeddingModel {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiEmbeddingModel(String baseUrl, String apiKey, ObjectMapper objectMapper) {
        String cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(cleanBaseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
        try {
            List<String> inputs = request.getInstructions();
            Map<String, Object> body = new HashMap<>();
            body.put("model", "text-embedding-004");
            body.put("input", inputs);

            String responseStr = restClient.post()
                    .uri("/embeddings")
            		.body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseStr);
            List<Embedding> embeddingList = new ArrayList<>();

            if (root.has("data") && root.get("data").isArray()) {
                for (JsonNode item : root.get("data")) {
                    int index = item.has("index") ? item.get("index").asInt() : 0;
                    if (item.has("embedding") && item.get("embedding").isArray()) {
                        JsonNode arr = item.get("embedding");
                        float[] floatArray = new float[arr.size()];
                        for (int i = 0; i < arr.size(); i++) {
                            floatArray[i] = (float) arr.get(i).asDouble();
                        }
                        embeddingList.add(new Embedding(floatArray, index));
                    }
                }
            }

            return new EmbeddingResponse(embeddingList);
        } catch (Exception e) {
            log.error("Lỗi khi tính vector embeddings qua Gemini API: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi Gemini Embedding API: " + e.getMessage(), e);
        }
    }

    @Override
    public float[] embed(Document document) {
        EmbeddingResponse response = call(new EmbeddingRequest(List.of(document.getContent()), null));
        if (response.getResults() != null && !response.getResults().isEmpty()) {
            return response.getResults().get(0).getOutput();
        }
        return new float[768];
    }

    @Override
    public int dimensions() {
        return 768;
    }
}
