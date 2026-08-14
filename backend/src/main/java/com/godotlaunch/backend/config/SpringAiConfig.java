package com.godotlaunch.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class SpringAiConfig {

    @Bean
    public ChatModel chatModel(
            @Value("${GEMINI_OPENAI_BASE_URL:https://generativelanguage.googleapis.com/v1beta/openai/}") String baseUrl,
            @Value("${GEMINI_API_KEY:}") String apiKey,
            @Value("${GEMINI_MODEL:gemini-flash-lite-latest}") String modelName,
            @Value("${GEMINI_TEMPERATURE:0.2}") Double temperature,
            ObjectMapper objectMapper) {
        return new GeminiChatModel(baseUrl, apiKey, modelName, temperature, objectMapper);
    }

    @Bean
    public EmbeddingModel embeddingModel(
            @Value("${GEMINI_OPENAI_BASE_URL:https://generativelanguage.googleapis.com/v1beta/openai/}") String baseUrl,
            @Value("${GEMINI_API_KEY:}") String apiKey,
            ObjectMapper objectMapper) {
        return new GeminiEmbeddingModel(baseUrl, apiKey, objectMapper);
    }

    @Bean
    public VectorStore vectorStore(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {
        return new PgVectorStore(jdbcTemplate, embeddingModel);
    }
}
