package com.godotlaunch.backend.config;

import com.godotlaunch.backend.dto.response.CodeEmbeddingResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class CodeEmbeddingClient {

    @Value("${app.face-service.url:http://localhost:8001}")
    private String serviceUrl;

    private final RestTemplate restTemplate;

    public CodeEmbeddingClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(5 * 60_000);
        this.restTemplate = new RestTemplate(factory);
    }

    public CodeEmbeddingResult createEmbedding(UUID snapshotId, String bundleUrl, String bundleHash) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("snapshotId", snapshotId.toString());
        body.put("bundleUrl", bundleUrl);
        body.put("bundleHash", bundleHash);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            return restTemplate.postForObject(
                    serviceUrl + "/ai/code-embedding",
                    new HttpEntity<>(body, headers),
                    CodeEmbeddingResult.class);
        } catch (Exception e) {
            log.error("Không tạo được code embedding cho snapshot {}: {}", snapshotId, e.getMessage());
            throw new IllegalStateException("AI service could not create code embedding", e);
        }
    }
}
